/**
 * Unit tests for server-authoritative payment initiation:
 *  - generateEsewaSignature
 *  - initiateKhaltiPayment
 *
 * Acceptance criteria:
 *  - Client-supplied amounts are ignored; server uses order.total.
 *  - 404 when order is not found.
 *  - 403 when order belongs to a different user.
 *  - 409 when order is already paid.
 *  - Happy-path returns correct signature / redirects to Khalti.
 */

// These must be set before any module is imported so the controller picks them up.
// The controller now throws at import time if ESEWA_SECRET_KEY or ESEWA_MERCHANT_CODE
// are absent, so both must be present here.
// NOTE: jest.setup.env.cjs sets sensible defaults; the assignments below are
// kept for explicitness and can be removed once .env.test is in place.
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.ESEWA_MERCHANT_CODE = 'EPAYTEST';
process.env.KHALTI_GATEWAY_URL = 'https://dev.khalti.com/api/v2';
process.env.KHALTI_SECRET_KEY = 'test-khalti-key';

jest.mock('../models/Order.js');
jest.mock('../models/User.js');
jest.mock('axios');

import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import axios from 'axios';
import User from '../models/User.js';
import Order from '../models/Order.js';
import paymentRouter from '../routes/payment.js';

// ── App fixture ────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use('/api/payment', paymentRouter);

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeToken(userId) {
  return jwt.sign({ id: String(userId), role: 'user' }, process.env.JWT_SECRET);
}

const userId = new mongoose.Types.ObjectId();
const otherUserId = new mongoose.Types.ObjectId();
const orderId = new mongoose.Types.ObjectId();

const mockUser = { _id: userId, role: 'user', status: 'active' };

function pendingOrder(overrides = {}) {
  return {
    _id: orderId,
    user: { equals: (id) => String(id) === String(userId) },
    paymentStatus: 'pending',
    total: 500,
    orderNumber: 'JG20260422001',
    items: [],
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ── Test suites ───────────────────────────────────────────────────────────────

describe('POST /api/payment/esewa/signature', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });
  });

  it('returns 400 when orderId is missing', async () => {
    const res = await request(app)
      .post('/api/payment/esewa/signature')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 when order does not exist', async () => {
    Order.findById = jest.fn().mockResolvedValue(null);
    const res = await request(app)
      .post('/api/payment/esewa/signature')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .send({ orderId: String(orderId) });
    expect(res.status).toBe(404);
  });

  it('returns 403 when order belongs to another user', async () => {
    Order.findById = jest.fn().mockResolvedValue(
      pendingOrder({ user: { equals: () => false } })
    );
    const res = await request(app)
      .post('/api/payment/esewa/signature')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .send({ orderId: String(orderId) });
    expect(res.status).toBe(403);
  });

  it('returns 409 when order is already paid', async () => {
    Order.findById = jest.fn().mockResolvedValue(
      pendingOrder({ paymentStatus: 'paid' })
    );
    const res = await request(app)
      .post('/api/payment/esewa/signature')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .send({ orderId: String(orderId) });
    expect(res.status).toBe(409);
  });

  it('returns signature built from order.total (ignores client-supplied amounts)', async () => {
    Order.findById = jest.fn().mockResolvedValue(pendingOrder());

    const res = await request(app)
      .post('/api/payment/esewa/signature')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      // A tampered client sends a much lower total — server must ignore it
      .send({ orderId: String(orderId), total_amount: '1.00' });

    expect(res.status).toBe(200);
    const { total_amount, transaction_uuid, product_code, signature } = res.body.data;

    // total_amount must come from order.total (500), NOT client value (1.00)
    expect(total_amount).toBe('500.00');
    expect(transaction_uuid).toBe(String(orderId));
    expect(product_code).toBe('EPAYTEST');

    // Verify HMAC is correct — use the same key the controller was loaded with
    const expectedKey = process.env.ESEWA_SECRET_KEY;
    const expected = crypto
      .createHmac('sha256', expectedKey)
      .update(`total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`)
      .digest('base64');
    expect(signature).toBe(expected);
  });
});

describe('POST /api/payment/khalti/initiate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });
  });

  it('returns 400 when orderId is missing', async () => {
    const res = await request(app)
      .post('/api/payment/khalti/initiate')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .send({ return_url: 'https://example.com', website_url: 'https://example.com' });
    expect(res.status).toBe(400);
  });

  it('returns 404 when order does not exist', async () => {
    Order.findById = jest.fn().mockResolvedValue(null);
    const res = await request(app)
      .post('/api/payment/khalti/initiate')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .send({ orderId: String(orderId), return_url: 'https://example.com', website_url: 'https://example.com' });
    expect(res.status).toBe(404);
  });

  it('returns 403 when order belongs to another user', async () => {
    Order.findById = jest.fn().mockResolvedValue(
      pendingOrder({ user: { equals: () => false } })
    );
    const res = await request(app)
      .post('/api/payment/khalti/initiate')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .send({ orderId: String(orderId), return_url: 'https://example.com', website_url: 'https://example.com' });
    expect(res.status).toBe(403);
  });

  it('returns 409 when order is already paid', async () => {
    Order.findById = jest.fn().mockResolvedValue(
      pendingOrder({ paymentStatus: 'paid' })
    );
    const res = await request(app)
      .post('/api/payment/khalti/initiate')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .send({ orderId: String(orderId), return_url: 'https://example.com', website_url: 'https://example.com' });
    expect(res.status).toBe(409);
  });

  it('forwards server-authoritative amount to Khalti (ignores client-supplied amount)', async () => {
    Order.findById = jest.fn().mockResolvedValue(pendingOrder()); // order.total = 500
    axios.post = jest.fn().mockResolvedValue({ data: { payment_url: 'https://khalti.com/pay/xyz' } });

    const res = await request(app)
      .post('/api/payment/khalti/initiate')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      // Tampered: client sends amount=1 paisa — must be ignored
      .send({ orderId: String(orderId), return_url: 'https://example.com', website_url: 'https://example.com', amount: 1 });

    expect(res.status).toBe(200);
    expect(res.body.payment_url).toBe('https://khalti.com/pay/xyz');

    // amount forwarded to Khalti must be 500 * 100 = 50000 paisa
    const [, khaltiBody] = axios.post.mock.calls[0];
    expect(khaltiBody.amount).toBe(50000);
    expect(khaltiBody.purchase_order_id).toBe(String(orderId));
    expect(khaltiBody.purchase_order_name).toBe('JG20260422001');
  });
});
