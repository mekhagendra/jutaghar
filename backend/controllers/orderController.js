import { validationResult } from 'express-validator';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import DeliverySettings from '../models/DeliverySettings.js';
import { calculateTaxForItems } from '../utils/taxCalculator.js';
import { asNumber, asObjectId, asString, stripOperators } from '../utils/sanitizeInput.js';

const errorStatus = (error) => error?.statusCode || 500;

// Create order
export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const sanitizedBody = stripOperators({ ...req.body });
    const paymentMethod = sanitizedBody.paymentMethod ? asString(sanitizedBody.paymentMethod) : undefined;
    const notes = sanitizedBody.notes ? asString(sanitizedBody.notes) : undefined;
    const shippingAddress = stripOperators({ ...(sanitizedBody.shippingAddress || {}) });
    const rawItems = Array.isArray(sanitizedBody.items) ? sanitizedBody.items : [];
    const items = rawItems.map((item) => stripOperators({ ...item }));

    // Get user
    const user = await User.findById(req.user._id);

    // Validate and process items
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(asObjectId(item.product))
        .session(session);
      
      if (!product) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: `Product ${item.product} not found`
        });
      }

      if (product.status !== 'active') {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Product ${product.name} is not available`
        });
      }

      // Handle variant-based inventory
      let availableStock = product.stock;
      let selectedVariant = null;

      const quantity = Math.max(1, asNumber(item.quantity, 1));

      if (item.variant && typeof item.variant === 'object') {
        const variant = stripOperators({ ...item.variant });
        const variantColor = variant.color ? asString(variant.color) : '';
        const variantSize = variant.size ? asString(variant.size) : '';
        const variantSku = variant.sku ? asString(variant.sku) : '';
        // Find the specific variant
        selectedVariant = product.variants.find(v =>
          (!variantColor || v.color === variantColor) &&
          (!variantSize || v.size === variantSize) &&
          (!variantSku || v.sku === variantSku)
        );

        if (!selectedVariant) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Selected variant for ${product.name} is not available`
          });
        }

        availableStock = selectedVariant.quantity;

        if (availableStock < quantity) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.name} (${variantColor || ''} ${variantSize || ''}). Available: ${availableStock}`
          });
        }

        // Deduct from variant quantity
        selectedVariant.quantity -= quantity;
      } else {
        // No variant selected - check total product stock
        if (product.stock < quantity) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.name}`
          });
        }
      }

      // Determine price
      let itemPrice = selectedVariant?.price || product.price;

      const itemTotal = itemPrice * quantity;
      subtotal += itemTotal;

      const orderItem = {
        product: product._id,
        quantity,
        price: itemPrice,
        vendor: product.vendor._id || product.vendor
      };

      // Add variant info if present
      if (item.variant && typeof item.variant === 'object') {
        const variant = stripOperators({ ...item.variant });
        orderItem.variant = {
          color: variant.color ? asString(variant.color) : undefined,
          size: variant.size ? asString(variant.size) : undefined,
          sku: variant.sku ? asString(variant.sku) : undefined
        };
      }

      orderItems.push(orderItem);

      // Update stock - will be recalculated from variants in pre-save hook
      product.sales += quantity;
      await product.save({ session });
    }

    // Calculate totals using vendor-dynamic tax settings
    const { tax, taxDisplay } = await calculateTaxForItems(orderItems);
    const shippingCost = await DeliverySettings.calculateShipping(subtotal);
    const total = subtotal + tax + shippingCost;

    // Generate order number
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const orderNumber = `JG${year}${month}${day}${random}`;

    // Create order
    const order = new Order({
      orderNumber,
      user: req.user._id,
      items: orderItems,
      subtotal,
      tax: taxDisplay,
      shippingCost,
      total,
      paymentMethod,
      shippingAddress: {
        fullName: shippingAddress.fullName ? asString(shippingAddress.fullName) : undefined,
        phone: shippingAddress.phone ? asString(shippingAddress.phone) : undefined,
        province: shippingAddress.province ? asString(shippingAddress.province) : undefined,
        city: shippingAddress.city ? asString(shippingAddress.city) : undefined,
        area: shippingAddress.area ? asString(shippingAddress.area) : undefined,
        streetAddress: shippingAddress.streetAddress ? asString(shippingAddress.streetAddress) : undefined,
        landmark: shippingAddress.landmark ? asString(shippingAddress.landmark) : undefined,
        country: shippingAddress.country ? asString(shippingAddress.country) : undefined,
      },
      notes
    });

    await order.save({ session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(errorStatus(error)).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  } finally {
    session.endSession();
  }
};

// Get user's orders
export const getUserOrders = async (req, res) => {
  try {
    const safeQuery = stripOperators({ ...req.query });
    const page = Math.max(1, asNumber(safeQuery.page, 1));
    const limit = Math.min(100, Math.max(1, asNumber(safeQuery.limit, 10)));
    const status = safeQuery.status ? asString(safeQuery.status) : '';

    const query = { user: req.user._id };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('items.product', 'name images')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit),
      Order.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

// Get order by ID
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(asObjectId(req.params.id))
      .populate('items.product', 'name images price')
      .populate('items.vendor', 'businessName fullName');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check authorization
    const isOwner = order.user.toString() === req.user._id.toString();
    const isVendor = order.items.some(item => item.vendor._id.toString() === req.user._id.toString());
    const isAdmin = ['admin', 'manager'].includes(req.user.role);

    if (!isOwner && !isVendor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(errorStatus(error)).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

// Cancel order
export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(asObjectId(req.params.id));

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check ownership
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this order'
      });
    }

    // Only pending or processing orders can be cancelled
    if (!['pending', 'processing'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled'
      });
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    await order.save();

    // Restore product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity, sales: -item.quantity }
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(errorStatus(error)).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

// Public order tracking by order number (no auth required)
export const trackOrder = async (req, res) => {
  try {
    const orderNumber = asString(req.params.orderNumber || '').toUpperCase().trim();

    const order = await Order.findOne({ orderNumber })
      .select('orderNumber status paymentStatus paymentMethod createdAt shippedAt deliveredAt cancelledAt trackingNumber items shippingAddress')
      .populate('items.product', 'name images');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found. Please check the order number and try again.'
      });
    }

    // Return safe public info only
    const safeOrder = {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      cancelledAt: order.cancelledAt,
      trackingNumber: order.trackingNumber,
      itemCount: order.items.length,
      // Only city/country for privacy
      shippingCity: order.shippingAddress?.city || null,
      shippingCountry: order.shippingAddress?.country || null,
    };

    res.json({ success: true, data: safeOrder });
  } catch (error) {
    res.status(errorStatus(error)).json({ success: false, message: 'Internal error', requestId: req.id });
  }
};

// Get vendor's orders
export const getVendorOrders = async (req, res) => {
  try {
    const safeQuery = stripOperators({ ...req.query });
    const page = Math.max(1, asNumber(safeQuery.page, 1));
    const limit = Math.min(100, Math.max(1, asNumber(safeQuery.limit, 10)));
    const status = safeQuery.status ? asString(safeQuery.status) : '';

    const query = { 'items.vendor': req.user._id };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('user', 'fullName email phone')
        .populate('items.product', 'name images')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit),
      Order.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

// Update order status (vendor/admin)
export const updateOrderStatus = async (req, res) => {
  try {
    const sanitizedBody = stripOperators({ ...req.body });
    const status = sanitizedBody.status ? asString(sanitizedBody.status) : '';
    const trackingNumber = sanitizedBody.trackingNumber ? asString(sanitizedBody.trackingNumber) : '';
    const cancelReason = sanitizedBody.cancelReason ? asString(sanitizedBody.cancelReason) : '';
    const order = await Order.findById(asObjectId(req.params.id));

    const ACTIVE_VENDOR_STAGES = ['pending', 'processing', 'shipped', 'delivered', 'returned'];

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check authorization
    const isVendor = order.items.some(item => item.vendor.toString() === req.user._id.toString());
    const isAdmin = ['admin', 'manager'].includes(req.user.role);

    if (!isVendor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this order'
      });
    }

    if (status) {
      if (status === 'cancelled') {
        if (order.status === 'cancelled') {
          return res.status(400).json({
            success: false,
            message: 'Order is already cancelled'
          });
        }

        if (order.status === 'refunded') {
          return res.status(400).json({
            success: false,
            message: 'Refunded orders cannot be cancelled'
          });
        }

        if (!String(cancelReason || '').trim()) {
          return res.status(400).json({
            success: false,
            message: 'Cancel reason is required to cancel an order'
          });
        }

        order.status = 'cancelled';
        order.cancelledAt = new Date();
        order.cancelReason = cancelReason.trim();

        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: item.quantity, sales: -item.quantity }
          });
        }
      } else {
        if (!ACTIVE_VENDOR_STAGES.includes(status)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid target status for vendor update'
          });
        }

        if (['cancelled', 'refunded'].includes(order.status)) {
          return res.status(400).json({
            success: false,
            message: 'Cancelled/refunded orders cannot be moved to another stage'
          });
        }

        order.status = status;
        order.cancelledAt = undefined;
        order.cancelReason = undefined;

        if (status === 'shipped' && !order.shippedAt) order.shippedAt = new Date();
        if (status === 'delivered' && !order.deliveredAt) order.deliveredAt = new Date();
        if (status === 'returned' && !order.returnedAt) order.returnedAt = new Date();

        // Keep timeline fields consistent when moving backward.
        if (status === 'pending' || status === 'processing') {
          order.shippedAt = undefined;
          order.deliveredAt = undefined;
          order.returnedAt = undefined;
        } else if (status === 'shipped') {
          order.deliveredAt = undefined;
          order.returnedAt = undefined;
        } else if (status === 'delivered') {
          order.returnedAt = undefined;
        }
      }
    }

    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
    }

    await order.save();

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(errorStatus(error)).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};
