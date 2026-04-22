/**
 * Integration tests for POST /api/payment/khalti/verify
 *
 * Acceptance criteria:
 *  1. No Bearer token        → 401
 *  2. Token for wrong user   → 403
 *  3. Same pidx twice        → 200 both times, stock decremented only once
 */

// Env must be set before any module is imported
process.env.JWT_SECRET = 'test-jwt-secret-for-payment-tests';
process.env.KHALTI_GATEWAY_URL = 'https://dev.khalti.com/api/v2';
process.env.KHALTI_SECRET_KEY = 'test-khalti-key';
process.env.ESEWA_SECRET_KEY = 'test-esewa-secret';
process.env.ESEWA_MERCHANT_CODE = 'EPAYTEST';

// Hoist mocks (babel-jest ensures these run before imports)
jest.mock('../models/User.js');
jest.mock('../models/Order.js');
jest.mock('../models/Product.js');
jest.mock('../models/DeliverySettings.js');
jest.mock('../utils/taxCalculator.js', () => ({
  calculateTaxForItems: jest.fn().mockResolvedValue({ tax: 0, taxDisplay: 0 })
}));
jest.mock('axios');

import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import paymentRouter from '../routes/payment.js';

// ── App fixture ────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use('/api/payment', paymentRouter);

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeToken(userId, role = 'user') {
  return jwt.sign({ id: String(userId), role }, process.env.JWT_SECRET);
}

function buildMockSession() {
  return {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    abortTransaction: jest.fn().mockResolvedValue(undefined),
    endSession: jest.fn(),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('POST /api/payment/khalti/verify', () => {
  const userId    = new mongoose.Types.ObjectId();
  const otherUserId = new mongoose.Types.ObjectId();
  const orderId   = new mongoose.Types.ObjectId();
  const productId = new mongoose.Types.ObjectId();

  const mockUser = {
    _id: userId,
    role: 'user',
    status: 'active',
  };

  // Khalti lookup always returns a completed payment of 500 NPR (50000 paisa)
  const khaltiLookupResponse = {
    data: { status: 'Completed', total_amount: 50000 },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // authenticate middleware: User.findById(id).select(...)
    User.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });

    axios.post = jest.fn().mockResolvedValue(khaltiLookupResponse);

    jest.spyOn(mongoose, 'startSession').mockResolvedValue(buildMockSession());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── Case 1: No auth token ──────────────────────────────────────────────────
  it('returns 401 when no Bearer token is provided', async () => {
    const res = await request(app)
      .post('/api/payment/khalti/verify')
      .send({ pidx: 'test-pidx', purchase_order_id: String(orderId) });

    expect(res.status).toBe(401);
  });

  // ── Case 2: Valid token but wrong user (order belongs to someone else) ─────
  it('returns 403 when order belongs to a different user', async () => {
    // Order is owned by otherUserId, not userId
    const order = {
      _id: orderId,
      user: { equals: () => false },   // never matches the caller
      paymentStatus: 'pending',
      total: 500,
      items: [],
      save: jest.fn().mockResolvedValue(undefined),
    };
    Order.findById = jest.fn().mockResolvedValue(order);

    const res = await request(app)
      .post('/api/payment/khalti/verify')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .send({ pidx: 'test-pidx', purchase_order_id: String(orderId) });

    expect(res.status).toBe(403);
  });

  // ── Case 3: Idempotency — same pidx twice ──────────────────────────────────
  it('returns 200 on both calls and decrements stock only once', async () => {
    const mockProduct = {
      _id: productId,
      stock: 10,
      sales: 0,
      variants: [],
      save: jest.fn().mockResolvedValue(undefined),
    };
    Product.findById = jest.fn().mockReturnValue({
      session: jest.fn().mockResolvedValue(mockProduct),
    });

    // ── First call: order is still pending ────────────────────────────────
    const pendingOrder = {
      _id: orderId,
      user: { equals: (id) => String(id) === String(userId) },
      paymentStatus: 'pending',
      total: 500,
      items: [{ product: productId, quantity: 2, variant: null }],
      save: jest.fn().mockResolvedValue(undefined),
    };
    Order.findById = jest.fn().mockResolvedValue(pendingOrder);

    const firstRes = await request(app)
      .post('/api/payment/khalti/verify')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .send({ pidx: 'test-pidx', purchase_order_id: String(orderId), transaction_id: 'txn-001' });

    expect(firstRes.status).toBe(200);
    // Stock must have been decremented exactly once
    expect(mockProduct.save).toHaveBeenCalledTimes(1);

    // Reset counters for the second call
    mockProduct.save.mockClear();
    mongoose.startSession.mockClear();

    // ── Second call: order is now paid (idempotency guard) ────────────────
    const paidOrder = {
      _id: orderId,
      user: { equals: (id) => String(id) === String(userId) },
      paymentStatus: 'paid',
      total: 500,
      items: [{ product: productId, quantity: 2, variant: null }],
      save: jest.fn().mockResolvedValue(undefined),
    };
    Order.findById = jest.fn().mockResolvedValue(paidOrder);

    const secondRes = await request(app)
      .post('/api/payment/khalti/verify')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .send({ pidx: 'test-pidx', purchase_order_id: String(orderId), transaction_id: 'txn-001' });

    expect(secondRes.status).toBe(200);
    // Stock must NOT have been touched again
    expect(mockProduct.save).not.toHaveBeenCalled();
    // mongoose.startSession must not have been called for the idempotent path
    expect(mongoose.startSession).not.toHaveBeenCalled();
  });
});
