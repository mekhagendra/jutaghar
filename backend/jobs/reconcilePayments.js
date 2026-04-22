import cron from 'node-cron';
import Order from '../models/Order.js';
import {
  lookupEsewaTransaction,
  lookupKhaltiTransaction,
  settleOrderFromGatewayResult,
} from '../controllers/paymentController.js';
import { enqueueNotification } from '../utils/notificationQueue.js';

const KHALTI_TERMINAL_SUCCESS = new Set(['Completed']);
const KHALTI_TERMINAL_FAILED = new Set(['Expired', 'User canceled', 'Cancelled', 'Failed']);
const ESEWA_TERMINAL_SUCCESS = new Set(['COMPLETE']);
const ESEWA_TERMINAL_FAILED = new Set(['CANCELED', 'CANCELLED', 'FAILED', 'NOT_FOUND', 'EXPIRED', 'FULL_REFUND', 'REFUNDED']);

const normalizeGatewayStatus = (value) => String(value || '').trim();

export const reconcilePendingPayments = async ({ now = new Date() } = {}) => {
  const cutoff = new Date(now.getTime() - 15 * 60 * 1000);

  const pendingOrders = await Order.find({
    paymentStatus: 'pending',
    status: 'pending',
    paymentMethod: { $in: ['esewa', 'khalti'] },
    createdAt: { $lte: cutoff },
  });

  const summary = {
    scanned: pendingOrders.length,
    resolved: 0,
    notificationsEnqueued: 0,
    skipped: 0,
    errors: 0,
  };

  for (const order of pendingOrders) {
    try {
      let gatewayStatus = '';
      let gatewayTransactionId = null;
      let settled = null;

      if (order.paymentMethod === 'khalti') {
        if (!order.gatewayPidx) {
          summary.skipped += 1;
          continue;
        }

        const lookup = await lookupKhaltiTransaction(order.gatewayPidx);
        gatewayStatus = normalizeGatewayStatus(lookup?.status);
        gatewayTransactionId = lookup?.transaction_id || null;

        if (KHALTI_TERMINAL_SUCCESS.has(gatewayStatus)) {
          settled = await settleOrderFromGatewayResult({
            order,
            isPaid: true,
            gatewayTransactionId,
            gatewayPidx: order.gatewayPidx,
          });
        } else if (KHALTI_TERMINAL_FAILED.has(gatewayStatus)) {
          settled = await settleOrderFromGatewayResult({
            order,
            isPaid: false,
            failureCode: gatewayStatus,
            gatewayPidx: order.gatewayPidx,
          });
        }
      }

      if (order.paymentMethod === 'esewa') {
        const lookup = await lookupEsewaTransaction({
          transaction_uuid: String(order._id),
          total_amount: order.total,
        });
        gatewayStatus = normalizeGatewayStatus(lookup?.status).toUpperCase();
        gatewayTransactionId = lookup?.transaction_code || null;

        if (ESEWA_TERMINAL_SUCCESS.has(gatewayStatus)) {
          settled = await settleOrderFromGatewayResult({
            order,
            isPaid: true,
            gatewayTransactionId,
          });
        } else if (ESEWA_TERMINAL_FAILED.has(gatewayStatus)) {
          settled = await settleOrderFromGatewayResult({
            order,
            isPaid: false,
            failureCode: gatewayStatus,
          });
        }
      }

      if (!settled) {
        summary.skipped += 1;
        continue;
      }

      if (!settled.idempotent) {
        summary.resolved += 1;
        await enqueueNotification({
          type: 'payment.reconciled',
          orderId: String(order._id),
          orderNumber: order.orderNumber,
          paymentMethod: order.paymentMethod,
          paymentStatus: settled.paymentStatus,
          orderStatus: settled.orderStatus,
          gatewayStatus,
        });
        summary.notificationsEnqueued += 1;
      }
    } catch (error) {
      summary.errors += 1;
      console.error(`[payment-reconcile] failed for order ${order._id}:`, error.message);
    }
  }

  return summary;
};

export const startPaymentReconciliationCron = () => {
  const shouldRun = process.env.DISABLE_PAYMENT_RECONCILE_CRON !== 'true';
  if (!shouldRun) {
    console.log('[payment-reconcile] cron disabled by DISABLE_PAYMENT_RECONCILE_CRON=true');
    return null;
  }

  const task = cron.schedule('*/10 * * * *', async () => {
    const summary = await reconcilePendingPayments();
    console.log('[payment-reconcile] run summary', summary);
  });

  console.log('[payment-reconcile] cron started (every 10 minutes)');
  return task;
};
