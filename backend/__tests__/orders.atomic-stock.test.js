/**
 * Concurrency test for POST /api/orders
 *
 * Acceptance criteria:
 *  - Two parallel checkouts for a product with stock=1 must produce exactly
 *    one success and one conflict.
 */

process.env.JWT_SECRET = 'test-jwt-secret-order-race';

jest.mock('../models/User.js');
jest.mock('../models/Order.js');
jest.mock('../models/Product.js');
jest.mock('../models/DeliverySettings.js');
jest.mock('../utils/taxCalculator.js', () => ({
  calculateTaxForItems: jest.fn().mockResolvedValue({ tax: 0, taxDisplay: 0 }),
}));

import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import DeliverySettings from '../models/DeliverySettings.js';
import ordersRouter from '../routes/orders.js';

const app = express();
app.use(express.json());
app.use('/api/orders', ordersRouter);

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

describe('POST /api/orders atomic stock decrement', () => {
  const userId = new mongoose.Types.ObjectId();
  const productId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(mongoose, 'startSession').mockImplementation(async () => buildMockSession());

    const activeUser = {
      _id: userId,
      role: 'user',
      status: 'active',
    };

    User.findById = jest.fn(() => {
      const query = Promise.resolve(activeUser);
      query.select = jest.fn().mockResolvedValue(activeUser);
      return query;
    });

    DeliverySettings.calculateShipping = jest.fn().mockResolvedValue(0);

    Order.mockImplementation(function mockOrder(data) {
      Object.assign(this, data);
      this._id = new mongoose.Types.ObjectId();
      this.save = jest.fn().mockResolvedValue(this);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows only one success when two checkouts race for the last unit', async () => {
    let sharedStock = 1;

    Product.findById = jest.fn().mockReturnValue({
      session: jest.fn().mockResolvedValue({
        _id: productId,
        name: 'Race Sneaker',
        status: 'active',
        stock: sharedStock,
        price: 100,
        vendor: userId,
        variants: [],
      }),
    });

    Product.findOneAndUpdate = jest.fn(async (filter, update) => {
      const minRequired = filter?.stock?.$gte ?? 0;
      if (sharedStock >= minRequired) {
        sharedStock += update.$inc.stock;
        return { _id: productId, stock: sharedStock };
      }
      return null;
    });

    const payload = {
      items: [{ product: String(productId), quantity: 1 }],
      paymentMethod: 'cash_on_delivery',
      shippingAddress: {
        fullName: 'Test User',
        phone: '9800000000',
        province: 'Bagmati',
        city: 'Kathmandu',
        area: 'Baneshwor',
        streetAddress: 'Street 1',
        country: 'Nepal',
      },
    };

    const [resA, resB] = await Promise.all([
      request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${makeToken(userId)}`)
        .send(payload),
      request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${makeToken(userId)}`)
        .send(payload),
    ]);

    const statusCodes = [resA.status, resB.status].sort((a, b) => a - b);

    expect(statusCodes).toEqual([201, 409]);
    expect(sharedStock).toBe(0);
    expect(Order).toHaveBeenCalledTimes(1);
  });
});
