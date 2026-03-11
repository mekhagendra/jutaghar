import crypto from 'crypto';
import axios from 'axios';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';
import DeliverySettings from '../models/DeliverySettings.js';

// eSewa configuration
const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';
const ESEWA_MERCHANT_CODE = process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST';

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

      const itemPrice = selectedVariant?.price || product.price;
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

    // Calculate totals
    const tax = subtotal * 0.1;
    const shippingCost = await DeliverySettings.calculateShipping(subtotal);
    const total = subtotal + tax + shippingCost;

    // Generate order number
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const orderNumber = `JG${year}${month}${day}${random}`;

    // Create pending order
    const order = new Order({
      orderNumber,
      user: req.user._id,
      orderType: 'B2C',
      items: orderItems,
      subtotal,
      tax,
      shippingCost,
      total,
      paymentMethod,
      paymentStatus: paymentMethod === 'cash_on_delivery' ? 'pending' : 'pending',
      shippingAddress,
      notes
    });

    await order.save({ session });
    await session.commitTransaction();

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
      message: error.message
    });
  } finally {
    session.endSession();
  }
};

// Generate eSewa signature
export const generateEsewaSignature = async (req, res) => {
  try {
    const { transaction_uuid, total_amount, product_code } = req.body;

    if (!transaction_uuid || !total_amount || !product_code) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Generate signature using HMAC-SHA256
    const message = `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;
    const signature = crypto
      .createHmac('sha256', ESEWA_SECRET_KEY)
      .update(message)
      .digest('base64');

    res.json({
      success: true,
      data: {
        signature,
        signed_field_names: 'total_amount,transaction_uuid,product_code'
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
      const message = `transaction_code=${transaction_code},status=${status},total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${ESEWA_MERCHANT_CODE},signed_field_names=${signed_field_names}`;
      const expectedSignature = crypto
        .createHmac('sha256', ESEWA_SECRET_KEY)
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

    // Verify amount matches
    if (parseFloat(total_amount) !== order.total) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount mismatch'
      });
    }

    // Update order status
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      order.paymentStatus = 'paid';
      order.status = 'processing';
      await order.save({ session });

      // Update product stock
      for (const item of order.items) {
        const product = await Product.findById(item.product).session(session);
        
        if (item.variant) {
          const variant = product.variants.find(v =>
            v.color === item.variant.color &&
            v.size === item.variant.size
          );
          if (variant) {
            variant.quantity -= item.quantity;
          }
        }
        
        product.stock -= item.quantity;
        product.sales += item.quantity;
        await product.save({ session });
      }

      await session.commitTransaction();

      res.json({
        success: true,
        message: 'Payment verified successfully',
        data: { orderId: order._id, orderNumber: order.orderNumber }
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
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
    const verifyResponse = await axios.post(
      `${process.env.KHALTI_GATEWAY_URL}/epayment/lookup/`,
      { pidx },
      {
        headers: {
          'Authorization': `Key ${process.env.KHALTI_SECRET_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );

    const paymentData = verifyResponse.data;

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

    // Verify amount (Khalti sends in paisa, convert to rupees)
    const paidAmount = paymentData.total_amount / 100;
    if (paidAmount !== order.total) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount mismatch'
      });
    }

    // Update order status
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      order.paymentStatus = 'paid';
      order.status = 'processing';
      await order.save({ session });

      // Update product stock
      for (const item of order.items) {
        const product = await Product.findById(item.product).session(session);
        
        if (item.variant) {
          const variant = product.variants.find(v =>
            v.color === item.variant.color &&
            v.size === item.variant.size
          );
          if (variant) {
            variant.quantity -= item.quantity;
          }
        }
        
        product.stock -= item.quantity;
        product.sales += item.quantity;
        await product.save({ session });
      }

      await session.commitTransaction();

      res.json({
        success: true,
        message: 'Payment verified successfully',
        data: { orderId: order._id, orderNumber: order.orderNumber }
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Initiate Khalti payment
export const initiateKhaltiPayment = async (req, res) => {
  try {
    const { return_url, website_url, amount, purchase_order_id, purchase_order_name } = req.body;

    if (!return_url || !amount || !purchase_order_id || !purchase_order_name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment data'
      });
    }

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

    res.json(response.data);
  } catch (error) {
    console.error('Khalti initiation error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.detail || error.message || 'Failed to initiate Khalti payment'
    });
  }
};

