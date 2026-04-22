process.env.ESEWA_SECRET_KEY = 'test-esewa-secret';
process.env.ESEWA_MERCHANT_CODE = 'EPAYTEST';

jest.mock('../models/Order.js');
jest.mock('../controllers/paymentController.js', () => ({
  lookupEsewaTransaction: jest.fn(),
  lookupKhaltiTransaction: jest.fn(),
  settleOrderFromGatewayResult: jest.fn(),
}));
jest.mock('../utils/notificationQueue.js', () => ({
  enqueueNotification: jest.fn().mockResolvedValue({ ok: true }),
}));

import mongoose from 'mongoose';
import Order from '../models/Order.js';
import {
  lookupEsewaTransaction,
  lookupKhaltiTransaction,
  settleOrderFromGatewayResult,
} from '../controllers/paymentController.js';
import { enqueueNotification } from '../utils/notificationQueue.js';
import { reconcilePendingPayments } from '../jobs/reconcilePayments.js';

describe('reconcilePendingPayments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves backlog of 3 pending orders and stays idempotent on rerun', async () => {
    const esewaOrderId = new mongoose.Types.ObjectId();
    const khaltiPaidOrderId = new mongoose.Types.ObjectId();
    const khaltiFailedOrderId = new mongoose.Types.ObjectId();

    const backlogOrders = [
      {
        _id: esewaOrderId,
        orderNumber: 'JG-ESEWA-1',
        paymentMethod: 'esewa',
        paymentStatus: 'pending',
        status: 'pending',
        total: 100,
      },
      {
        _id: khaltiPaidOrderId,
        orderNumber: 'JG-KHALTI-1',
        paymentMethod: 'khalti',
        paymentStatus: 'pending',
        status: 'pending',
        total: 200,
        gatewayPidx: 'pidx-paid',
      },
      {
        _id: khaltiFailedOrderId,
        orderNumber: 'JG-KHALTI-2',
        paymentMethod: 'khalti',
        paymentStatus: 'pending',
        status: 'pending',
        total: 300,
        gatewayPidx: 'pidx-failed',
      },
    ];

    Order.find = jest.fn().mockResolvedValue(backlogOrders);

    lookupEsewaTransaction.mockResolvedValue({ status: 'COMPLETE', transaction_code: 'esewa-txn' });
    lookupKhaltiTransaction.mockImplementation(async (pidx) => {
      if (pidx === 'pidx-paid') {
        return { status: 'Completed', transaction_id: 'k-txn-1' };
      }
      return { status: 'Expired', transaction_id: 'k-txn-2' };
    });

    settleOrderFromGatewayResult.mockImplementation(async ({ order, isPaid }) => {
      if (order.paymentStatus !== 'pending') {
        return {
          idempotent: true,
          paymentStatus: order.paymentStatus,
          orderStatus: order.status,
          changed: false,
        };
      }

      order.paymentStatus = isPaid ? 'paid' : 'failed';
      order.status = isPaid ? 'processing' : 'cancelled';
      return {
        idempotent: false,
        paymentStatus: order.paymentStatus,
        orderStatus: order.status,
        changed: true,
      };
    });

    const firstRun = await reconcilePendingPayments({ now: new Date('2026-04-22T12:00:00.000Z') });

    expect(firstRun.scanned).toBe(3);
    expect(firstRun.resolved).toBe(3);
    expect(firstRun.notificationsEnqueued).toBe(3);
    expect(enqueueNotification).toHaveBeenCalledTimes(3);

    const secondRun = await reconcilePendingPayments({ now: new Date('2026-04-22T12:10:00.000Z') });

    expect(secondRun.scanned).toBe(3);
    expect(secondRun.resolved).toBe(0);
    expect(secondRun.notificationsEnqueued).toBe(0);
    expect(enqueueNotification).toHaveBeenCalledTimes(3);
  });
});
