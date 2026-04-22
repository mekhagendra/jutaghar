/**
 * Unit tests for public payment webhooks:
 *  - POST /api/webhooks/khalti
 *  - POST /api/webhooks/esewa
 */

process.env.ESEWA_SECRET_KEY = 'test-esewa-secret';
process.env.ESEWA_MERCHANT_CODE = 'EPAYTEST';
process.env.KHALTI_SECRET_KEY = 'test-khalti-key';
process.env.KHALTI_GATEWAY_URL = 'https://dev.khalti.com/api/v2';
process.env.KHALTI_WEBHOOK_SECRET = 'test-khalti-webhook-secret';

jest.mock('../models/Order.js');
jest.mock('../models/Product.js');
jest.mock('../models/DeliverySettings.js');
jest.mock('../utils/taxCalculator.js', () => ({
  calculateTaxForItems: jest.fn().mockResolvedValue({ tax: 0, taxDisplay: 0 }),
}));
jest.mock('axios');

import request from 'supertest';
import express from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import axios from 'axios';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import webhooksRouter from '../routes/webhooks.js';

const app = express();
app.use(express.json());
app.use('/api/webhooks', webhooksRouter);

function buildMockSession() {
  return {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    abortTransaction: jest.fn().mockResolvedValue(undefined),
    endSession: jest.fn(),
  };
}

describe('Payment webhooks', () => {
  const orderId = new mongoose.Types.ObjectId();
  const productId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(mongoose, 'startSession').mockResolvedValue(buildMockSession());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects khalti webhook when shared secret header is missing', async () => {
    const res = await request(app)
      .post('/api/webhooks/khalti')
      .send({ pidx: 'pidx-1', purchase_order_id: String(orderId) });

    expect(res.status).toBe(401);
  });

  it('settles khalti webhook and remains idempotent on repeated callback', async () => {
    Product.findById = jest.fn().mockReturnValue({
      session: jest.fn().mockResolvedValue({ _id: productId, name: 'Webhook Shoe', variants: [] }),
    });
    Product.findOneAndUpdate = jest.fn().mockResolvedValue({ _id: productId, stock: 8, sales: 2 });

    const pendingOrder = {
      _id: orderId,
      orderNumber: 'JG-TEST-1',
      paymentStatus: 'pending',
      status: 'pending',
      total: 500,
      items: [{ product: productId, quantity: 2, variant: null }],
      save: jest.fn().mockImplementation(async () => pendingOrder),
    };

    Order.findById = jest.fn().mockResolvedValue(pendingOrder);
    axios.post = jest.fn().mockResolvedValue({ data: { status: 'Completed', transaction_id: 'txn-1' } });

    const first = await request(app)
      .post('/api/webhooks/khalti')
      .set('x-webhook-secret', process.env.KHALTI_WEBHOOK_SECRET)
      .send({ pidx: 'pidx-1', purchase_order_id: String(orderId), transaction_id: 'txn-1' });

    expect(first.status).toBe(200);
    expect(pendingOrder.paymentStatus).toBe('paid');
    expect(Product.findOneAndUpdate).toHaveBeenCalledTimes(1);

    // Repeat callback after order has already moved to paid state.
    const second = await request(app)
      .post('/api/webhooks/khalti')
      .set('x-webhook-secret', process.env.KHALTI_WEBHOOK_SECRET)
      .send({ pidx: 'pidx-1', purchase_order_id: String(orderId), transaction_id: 'txn-1' });

    expect(second.status).toBe(200);
    expect(second.body.message).toMatch(/already/i);
    expect(Product.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  it('settles esewa webhook when signature is valid', async () => {
    Product.findById = jest.fn().mockReturnValue({
      session: jest.fn().mockResolvedValue({ _id: productId, name: 'Webhook Shoe', variants: [] }),
    });
    Product.findOneAndUpdate = jest.fn().mockResolvedValue({ _id: productId, stock: 4, sales: 1 });

    const pendingOrder = {
      _id: orderId,
      orderNumber: 'JG-TEST-2',
      paymentStatus: 'pending',
      status: 'pending',
      total: 300,
      items: [{ product: productId, quantity: 1, variant: null }],
      save: jest.fn().mockImplementation(async () => pendingOrder),
    };

    Order.findById = jest.fn().mockResolvedValue(pendingOrder);
    axios.get = jest.fn().mockResolvedValue({ data: { status: 'COMPLETE', transaction_code: 'esewa-txn-1' } });

    const payload = {
      transaction_uuid: String(orderId),
      total_amount: '300.00',
      status: 'COMPLETE',
      signed_field_names: 'transaction_uuid,total_amount,status',
    };

    const message = `transaction_uuid=${payload.transaction_uuid},total_amount=${payload.total_amount},status=${payload.status}`;
    payload.signature = crypto
      .createHmac('sha256', process.env.ESEWA_SECRET_KEY)
      .update(message)
      .digest('base64');

    const res = await request(app)
      .post('/api/webhooks/esewa')
      .send(payload);

    expect(res.status).toBe(200);
    expect(pendingOrder.paymentStatus).toBe('paid');
    expect(Product.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });
});
