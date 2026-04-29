import crypto from 'crypto';
import axios from 'axios';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';
import DeliverySettings from '../models/DeliverySettings.js';
import { calculateTaxForItems } from '../utils/taxCalculator.js';
import logger from '../utils/logger.js';
import { writeAudit } from '../utils/audit.js';
import { generateOrderNumber } from '../utils/orderNumber.js';

// eSewa configuration — validated lazily so the server can start without payment keys in dev
const getEsewaSecretKey = () => {
  if (!process.env.ESEWA_SECRET_KEY) throw new Error('ESEWA_SECRET_KEY environment variable is required but not set');
  return process.env.ESEWA_SECRET_KEY;
};
const getEsewaMerchantCode = () => {
  if (!process.env.ESEWA_MERCHANT_CODE) throw new Error('ESEWA_MERCHANT_CODE environment variable is required but not set');
  return process.env.ESEWA_MERCHANT_CODE;
};
const getKhaltiWebhookSecret = () => process.env.KHALTI_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET || '';
const ESEWA_STATUS_CHECK_URL = process.env.ESEWA_STATUS_CHECK_URL || 'https://rc.esewa.com.np/api/epay/transaction/status/';

const KHALTI_TERMINAL_SUCCESS = new Set(['Completed']);
const KHALTI_TERMINAL_FAILED = new Set(['Expired', 'User canceled', 'Cancelled', 'Failed']);
const ESEWA_TERMINAL_SUCCESS = new Set(['COMPLETE']);
const ESEWA_TERMINAL_FAILED = new Set(['CANCELED', 'CANCELLED', 'FAILED', 'NOT_FOUND', 'EXPIRED', 'FULL_REFUND', 'REFUNDED']);

const normalizeGatewayStatus = (value) => String(value || '').trim();
class StockConflictError extends Error {
  constructor(productName) {
    super(`Insufficient stock for ${productName}`);
    this.name = 'StockConflictError';
    this.statusCode = 409;
  }
}

const toCurrencyString = (amount) => Number(amount || 0).toFixed(2);

const safeStringEquals = (a, b) => {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

const getEsewaSignedMessage = (payload, signedFieldNames) => {
  const fields = String(signedFieldNames || '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

  return fields
    .map((field) => `${field}=${payload?.[field] ?? ''}`)
    .join(',');
};

export const isOrderAlreadyPaid = (order) => order?.paymentStatus === 'paid';

export const lookupKhaltiTransaction = async (pidx) => {
  const response = await axios.post(
    `${process.env.KHALTI_GATEWAY_URL}/epayment/lookup/`,
    { pidx },
    {
      headers: {
        Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

export const lookupEsewaTransaction = async ({ transaction_uuid, total_amount }) => {
  const response = await axios.get(ESEWA_STATUS_CHECK_URL, {
    params: {
      product_code: getEsewaMerchantCode(),
      total_amount: toCurrencyString(total_amount),
      transaction_uuid,
    },
  });
  return response.data;
};

export const settleOrderFromGatewayResult = async ({
  order,
  isPaid,
  failureCode,
  gatewayTransactionId,
  gatewayPidx,
}) => {
  if (isOrderAlreadyPaid(order)) {
    return {
      idempotent: true,
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
      changed: false,
    };
  }

  if (isPaid) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      order.paymentStatus = 'paid';
      order.status = 'processing';
      if (gatewayTransactionId) order.gatewayTransactionId = gatewayTransactionId;
      if (gatewayPidx) order.gatewayPidx = gatewayPidx;
      await order.save({ session });

      for (const item of order.items) {
        const product = await Product.findById(item.product).session(session);
        if (!product) {
          throw new Error('Product not found while settling paid order');
        }

        let updatedProduct = null;

        if (item.variant && typeof item.variant === 'object') {
          const variantMatch = { quantity: { $gte: item.quantity } };
          if (item.variant.color) variantMatch.color = item.variant.color;
          if (item.variant.size) variantMatch.size = item.variant.size;

          updatedProduct = await Product.findOneAndUpdate(
            {
              _id: item.product,
              variants: { $elemMatch: variantMatch }
            },
            {
              $inc: {
                'variants.$.quantity': -item.quantity,
                stock: -item.quantity,
                sales: item.quantity
              }
            },
            { session, new: true }
          );
        } else {
          updatedProduct = await Product.findOneAndUpdate(
            { _id: item.product, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity, sales: item.quantity } },
            { session, new: true }
          );
        }

        if (!updatedProduct) {
          throw new StockConflictError(product.name || 'product');
        }
      }

      await session.commitTransaction();

      return {
        idempotent: false,
        paymentStatus: order.paymentStatus,
        orderStatus: order.status,
        changed: true,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  if (order.paymentStatus === 'failed' || order.status === 'cancelled') {
    return {
      idempotent: true,
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
      changed: false,
    };
  }

  order.paymentStatus = 'failed';
  if (order.status === 'pending') {
    order.status = 'cancelled';
    order.cancelledAt = new Date();
  }
  if (!order.cancelReason && failureCode) {
    order.cancelReason = `Gateway reported ${failureCode}`;
  }
  if (gatewayTransactionId) order.gatewayTransactionId = gatewayTransactionId;
  if (gatewayPidx) order.gatewayPidx = gatewayPidx;
  await order.save();

  return {
    idempotent: false,
    paymentStatus: order.paymentStatus,
    orderStatus: order.status,
    changed: true,
  };
};

const parseEsewaWebhookPayload = (body) => {
  if (typeof body?.data === 'string') {
    try {
      return JSON.parse(Buffer.from(body.data, 'base64').toString());
    } catch {
      return null;
    }
  }
  return body;
};

// Initiate order (create pending order before payment)
export const initiateOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items, paymentMethod, shippingAddress, notes } = req.body;

    // Validate and process items
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.product)
        .populate('vendor', 'role')
        .session(session);
      
      if (!product || product.status !== 'active') {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Product not available`
        });
      }

      // Check stock
      let availableStock = product.stock;
      let selectedVariant = null;

      if (item.variant) {
        selectedVariant = product.variants.find(v =>
          (!item.variant.color || v.color === item.variant.color) &&
          (!item.variant.size || v.size === item.variant.size)
        );

        if (!selectedVariant) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Selected variant not available`
          });
        }

        availableStock = selectedVariant.quantity;
      }

      if (availableStock < item.quantity) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock`
        });
      }

      const itemPrice = product.price;
      const itemTotal = itemPrice * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: itemPrice,
        vendor: product.vendor._id || product.vendor,
        variant: item.variant ? {
          color: item.variant.color,
          size: item.variant.size,
          sku: item.variant.sku
        } : undefined
      });
    }

    // Calculate totals using vendor-dynamic tax settings
    const { tax, taxDisplay } = await calculateTaxForItems(orderItems);
    const shippingCost = await DeliverySettings.calculateShipping(subtotal);
    const total = subtotal + tax + shippingCost;

    const orderNumber = generateOrderNumber();

    // Create pending order
    const order = new Order({
      orderNumber,
      user: req.user._id,
      items: orderItems,
      subtotal,
      tax: taxDisplay, // store the display tax amount (inclusive component or exclusive addition)
      shippingCost,
      total,
      paymentMethod,
      paymentStatus: paymentMethod === 'cash_on_delivery' ? 'pending' : 'pending',
      shippingAddress,
      notes
    });

    await order.save({ session });
    await session.commitTransaction();

    await writeAudit({
      req,
      action: 'PAYMENT_ORDER_INITIATED',
      target: 'order',
      targetId: order._id,
      metadata: {
        paymentMethod: order.paymentMethod,
        total: order.total,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        order,
        paymentData: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          amount: order.subtotal,
          taxAmount: order.tax,
          shippingCost: order.shippingCost,
          total: order.total
        }
      }
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  } finally {
    session.endSession();
  }
};

// Generate eSewa signature
export const generateEsewaSignature = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'orderId is required'
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!order.user.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to order' });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(409).json({ success: false, message: 'Order is already paid' });
    }

    // Use server-authoritative values — never trust client-supplied amounts
    const total_amount = order.total.toFixed(2);
    const transaction_uuid = String(order._id);
    const product_code = getEsewaMerchantCode();

    const message = `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;
    const signature = crypto
      .createHmac('sha256', getEsewaSecretKey())
      .update(message)
      .digest('base64');

    res.json({
      success: true,
      data: {
        signature,
        signed_field_names: 'total_amount,transaction_uuid,product_code',
        total_amount,
        transaction_uuid,
        product_code
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate signature'
    });
  }
};

// Verify eSewa payment
export const verifyEsewaPayment = async (req, res) => {
  try {
    const { data } = req.query;
    
    if (!data) {
      return res.status(400).json({
        success: false,
        message: 'Payment data missing'
      });
    }

    // Decode base64 data
    const decodedData = JSON.parse(Buffer.from(data, 'base64').toString());
    const { transaction_uuid, transaction_code, total_amount, status, signed_field_names, signature } = decodedData;

    if (status !== 'COMPLETE') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed'
      });
    }

    // Verify signature from eSewa
    if (signature) {
      const message = `transaction_code=${transaction_code},status=${status},total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${getEsewaMerchantCode()},signed_field_names=${signed_field_names}`;
      const expectedSignature = crypto
        .createHmac('sha256', getEsewaSecretKey())
        .update(message)
        .digest('base64');

      if (signature !== expectedSignature) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment signature'
        });
      }
    }

    // Find order by transaction_uuid (which is the order ID)
    const order = await Order.findById(transaction_uuid).populate('user', '_id');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify the user making the request owns the order
    if (req.user && order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to order'
      });
    }

    // Idempotency guard — already paid, return success without re-decrementing stock
    if (isOrderAlreadyPaid(order)) {
      return res.json({
        success: true,
        message: 'Payment already verified',
        data: { orderId: order._id, orderNumber: order.orderNumber }
      });
    }

    // Verify amount matches
    if (parseFloat(total_amount) !== order.total) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount mismatch'
      });
    }

    const result = await settleOrderFromGatewayResult({
      order,
      isPaid: true,
      gatewayTransactionId: transaction_code,
    });

    await writeAudit({
      req,
      actor: req.user ? String(req.user._id) : 'system',
      action: 'PAYMENT_ESEWA_VERIFIED',
      target: 'order',
      targetId: order._id,
      metadata: {
        idempotent: result.idempotent,
        orderStatus: result.orderStatus,
        paymentStatus: result.paymentStatus,
        gatewayTransactionId: transaction_code,
      },
    });

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: { orderId: order._id, orderNumber: order.orderNumber }
    });
  } catch (error) {
    if (error?.statusCode === 409) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

// Verify Khalti payment
export const verifyKhaltiPayment = async (req, res) => {
  try {
    const { pidx, purchase_order_id, transaction_id, amount } = req.body;

    if (!pidx || !purchase_order_id) {
      return res.status(400).json({
        success: false,
        message: 'Payment data missing'
      });
    }

    // Verify payment with Khalti
    const paymentData = await lookupKhaltiTransaction(pidx);

    if (paymentData.status !== 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed'
      });
    }

    // Find order
    const order = await Order.findById(purchase_order_id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Ownership check — caller must own the order
    if (!order.user.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to order'
      });
    }

    // Idempotency guard — already paid, return success without re-decrementing stock
    if (isOrderAlreadyPaid(order)) {
      return res.json({
        success: true,
        message: 'Payment already verified',
        data: { orderId: order._id, orderNumber: order.orderNumber }
      });
    }

    // Verify amount (Khalti sends in paisa, convert to rupees)
    const paidAmount = paymentData.total_amount / 100;
    if (paidAmount !== order.total) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount mismatch'
      });
    }

    const result = await settleOrderFromGatewayResult({
      order,
      isPaid: true,
      gatewayTransactionId: transaction_id || paymentData.transaction_id || null,
      gatewayPidx: pidx,
    });

    await writeAudit({
      req,
      action: 'PAYMENT_KHALTI_VERIFIED',
      target: 'order',
      targetId: order._id,
      metadata: {
        idempotent: result.idempotent,
        orderStatus: result.orderStatus,
        paymentStatus: result.paymentStatus,
        gatewayTransactionId: transaction_id || paymentData.transaction_id || null,
        pidx,
      },
    });

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: { orderId: order._id, orderNumber: order.orderNumber }
    });
  } catch (error) {
    if (error?.statusCode === 409) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

// Initiate Khalti payment
export const initiateKhaltiPayment = async (req, res) => {
  try {
    const { orderId, return_url, website_url } = req.body;

    if (!orderId || !return_url || !website_url) {
      return res.status(400).json({
        success: false,
        message: 'orderId, return_url and website_url are required'
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!order.user.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to order' });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(409).json({ success: false, message: 'Order is already paid' });
    }

    // Use server-authoritative amount and order reference
    const amount = Math.round(order.total * 100); // Khalti uses paisa
    const purchase_order_id = String(order._id);
    const purchase_order_name = order.orderNumber;

    // Initiate payment with Khalti
    const response = await axios.post(
      `${process.env.KHALTI_GATEWAY_URL}/epayment/initiate/`,
      {
        return_url,
        website_url,
        amount,
        purchase_order_id,
        purchase_order_name
      },
      {
        headers: {
          'Authorization': `Key ${process.env.KHALTI_SECRET_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (response?.data?.pidx) {
      order.gatewayPidx = response.data.pidx;
      await order.save();
    }

    res.json(response.data);
  } catch (error) {
    logger.error({ err: error, responseData: error.response?.data }, 'Khalti initiation error');
    res.status(500).json({
      success: false,
      message: 'Failed to initiate payment',
      requestId: req.id,
    });
  }
};

export const handleKhaltiWebhook = async (req, res) => {
  try {
    const providedSecret = req.get('x-webhook-secret') || req.get('x-khalti-webhook-secret');
    const expectedSecret = getKhaltiWebhookSecret();
    if (!expectedSecret || !safeStringEquals(providedSecret, expectedSecret)) {
      return res.status(401).json({ success: false, message: 'Invalid webhook secret' });
    }

    const { pidx, purchase_order_id, transaction_id } = req.body || {};
    if (!pidx || !purchase_order_id) {
      return res.status(400).json({ success: false, message: 'pidx and purchase_order_id are required' });
    }

    const order = await Order.findById(purchase_order_id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const paymentData = await lookupKhaltiTransaction(pidx);
    const gatewayStatus = normalizeGatewayStatus(paymentData?.status);

    if (KHALTI_TERMINAL_SUCCESS.has(gatewayStatus)) {
      const result = await settleOrderFromGatewayResult({
        order,
        isPaid: true,
        gatewayTransactionId: transaction_id || paymentData?.transaction_id || null,
        gatewayPidx: pidx,
      });
      return res.json({
        success: true,
        message: result.idempotent ? 'Payment already settled' : 'Payment settled from webhook',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          paymentStatus: result.paymentStatus,
          orderStatus: result.orderStatus,
        },
      });
    }

    if (KHALTI_TERMINAL_FAILED.has(gatewayStatus)) {
      const result = await settleOrderFromGatewayResult({
        order,
        isPaid: false,
        failureCode: gatewayStatus,
        gatewayPidx: pidx,
      });
      return res.json({
        success: true,
        message: result.idempotent ? 'Order already in terminal state' : 'Failed payment reconciled from webhook',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          paymentStatus: result.paymentStatus,
          orderStatus: result.orderStatus,
        },
      });
    }

    return res.status(202).json({
      success: true,
      message: 'Gateway status is not terminal yet',
      data: { orderId: order._id, status: gatewayStatus || 'UNKNOWN' },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};

export const handleEsewaWebhook = async (req, res) => {
  try {
    const payload = parseEsewaWebhookPayload(req.body);
    if (!payload) {
      return res.status(400).json({ success: false, message: 'Invalid webhook payload' });
    }

    const { transaction_uuid, signed_field_names, signature } = payload;
    if (!transaction_uuid || !signed_field_names || !signature) {
      return res.status(400).json({ success: false, message: 'transaction_uuid, signed_field_names and signature are required' });
    }

    const message = getEsewaSignedMessage(payload, signed_field_names);
    const expectedSignature = crypto
      .createHmac('sha256', getEsewaSecretKey())
      .update(message)
      .digest('base64');

    if (!safeStringEquals(signature, expectedSignature)) {
      return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
    }

    const order = await Order.findById(transaction_uuid);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const gatewayData = await lookupEsewaTransaction({
      transaction_uuid: String(order._id),
      total_amount: order.total,
    });
    const gatewayStatus = normalizeGatewayStatus(gatewayData?.status).toUpperCase();

    if (ESEWA_TERMINAL_SUCCESS.has(gatewayStatus)) {
      const result = await settleOrderFromGatewayResult({
        order,
        isPaid: true,
        gatewayTransactionId: gatewayData?.transaction_code || payload?.transaction_code || null,
      });

      return res.json({
        success: true,
        message: result.idempotent ? 'Payment already settled' : 'Payment settled from webhook',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          paymentStatus: result.paymentStatus,
          orderStatus: result.orderStatus,
        },
      });
    }

    if (ESEWA_TERMINAL_FAILED.has(gatewayStatus)) {
      const result = await settleOrderFromGatewayResult({
        order,
        isPaid: false,
        failureCode: gatewayStatus,
      });

      return res.json({
        success: true,
        message: result.idempotent ? 'Order already in terminal state' : 'Failed payment reconciled from webhook',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          paymentStatus: result.paymentStatus,
          orderStatus: result.orderStatus,
        },
      });
    }

    return res.status(202).json({
      success: true,
      message: 'Gateway status is not terminal yet',
      data: { orderId: order._id, status: gatewayStatus || 'UNKNOWN' },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};

// Estimate tax for cart items (used on checkout page preview)
export const estimateTax = async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'items array required' });
    }

    const resolvedItems = [];
    for (const item of items) {
      const product = await Product.findById(item.product)
        .populate('vendor', '_id')
        .select('price vendor variants');
      if (!product) continue;

      // If a variant-specific price is present use it
      let price = product.price;
      if (item.variant) {
        const v = product.variants?.find(
          (pv) =>
            (!item.variant.color || pv.color === item.variant.color) &&
            (!item.variant.size || pv.size === item.variant.size)
        );
        if (v?.price) price = v.price;
      }

      resolvedItems.push({
        price,
        quantity: item.quantity || 1,
        vendor: product.vendor?._id || product.vendor,
      });
    }

    const { tax, taxDisplay, breakdown } = await calculateTaxForItems(resolvedItems);

    res.json({
      success: true,
      data: {
        tax,                                              // exclusive add-on (to add to order total)
        taxDisplay,                                       // visual amount shown on invoice
        breakdown: breakdown.filter((b) => b.amount > 0), // only non-zero entries
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};

