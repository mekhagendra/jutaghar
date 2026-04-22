process.env.ESEWA_SECRET_KEY = 'test-esewa-secret';
process.env.ESEWA_MERCHANT_CODE = 'EPAYTEST';
process.env.KHALTI_GATEWAY_URL = 'https://dev.khalti.com/api/v2';
process.env.KHALTI_SECRET_KEY = 'test-khalti-key';

jest.mock('../models/Product.js');
jest.mock('../models/Order.js');
jest.mock('../models/DeliverySettings.js');
jest.mock('../utils/taxCalculator.js', () => ({
  calculateTaxForItems: jest.fn().mockResolvedValue({ tax: 0, taxDisplay: 0 }),
}));
jest.mock('../utils/audit.js', () => ({
  writeAudit: jest.fn().mockResolvedValue(undefined),
}));

import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import DeliverySettings from '../models/DeliverySettings.js';
import { writeAudit } from '../utils/audit.js';
import { initiateOrder } from '../controllers/paymentController.js';

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

function buildSession() {
  return {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    abortTransaction: jest.fn().mockResolvedValue(undefined),
    endSession: jest.fn(),
  };
}

describe('paymentController audit writes', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(mongoose, 'startSession').mockResolvedValue(buildSession());

    Product.findById = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        session: jest.fn().mockResolvedValue({
          _id: new mongoose.Types.ObjectId(),
          status: 'active',
          stock: 3,
          price: 100,
          vendor: new mongoose.Types.ObjectId(),
          variants: [],
        }),
      }),
    });

    DeliverySettings.calculateShipping = jest.fn().mockResolvedValue(0);

    Order.mockImplementation(function MockOrder(data) {
      Object.assign(this, data);
      this._id = new mongoose.Types.ObjectId();
      this.save = jest.fn().mockResolvedValue(this);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('writes audit log when order is initiated', async () => {
    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      body: {
        items: [{ product: new mongoose.Types.ObjectId(), quantity: 1 }],
        paymentMethod: 'khalti',
        shippingAddress: {
          fullName: 'Test User',
          phone: '9800000000',
          city: 'Kathmandu',
        },
      },
      headers: { 'user-agent': 'jest' },
      ip: '127.0.0.1',
    };
    const res = createRes();

    await initiateOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PAYMENT_ORDER_INITIATED',
        target: 'order',
      })
    );
  });
});
