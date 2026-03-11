import { validationResult } from 'express-validator';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import DeliverySettings from '../models/DeliverySettings.js';
import { calculateTaxForItems } from '../utils/taxCalculator.js';

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

    const { items, paymentMethod, shippingAddress, notes } = req.body;

    // Get user to determine order type
    const user = await User.findById(req.user._id);
    
    // Determine order type: B2B if user is a seller buying from manufacturers/importers
    // B2C for regular customers or sellers selling to customers
    let orderType = 'B2C';
    let isBuyerSeller = user.role === 'seller';

    // Validate and process items
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.product)
        .populate('vendor', 'role')
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

      if (item.variant) {
        // Find the specific variant
        selectedVariant = product.variants.find(v =>
          (!item.variant.color || v.color === item.variant.color) &&
          (!item.variant.size || v.size === item.variant.size) &&
          (!item.variant.sku || v.sku === item.variant.sku)
        );

        if (!selectedVariant) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Selected variant for ${product.name} is not available`
          });
        }

        availableStock = selectedVariant.quantity;

        if (availableStock < item.quantity) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.name} (${item.variant.color || ''} ${item.variant.size || ''}). Available: ${availableStock}`
          });
        }

        // Deduct from variant quantity
        selectedVariant.quantity -= item.quantity;
      } else {
        // No variant selected - check total product stock
        if (product.stock < item.quantity) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.name}`
          });
        }
      }

      // Check wholesale product access
      if (product.isWholesaleOnly) {
        // Only sellers can purchase wholesale products
        if (req.user.role !== 'seller') {
          await session.abortTransaction();
          return res.status(403).json({
            success: false,
            message: `Product ${product.name} is only available for wholesale purchase by registered sellers`
          });
        }

        // Check minimum wholesale quantity
        if (item.quantity < product.minWholesaleQuantity) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Minimum wholesale quantity for ${product.name} is ${product.minWholesaleQuantity} units`
          });
        }
      }

      // Use wholesale price for sellers, retail price for others
      let itemPrice = selectedVariant?.price || product.price;
      if (isBuyerSeller && product.wholesalePrice) {
        itemPrice = product.wholesalePrice;
        // This is a B2B order (seller buying from manufacturer/importer)
        if (product.vendor.role === 'manufacturer' || 
            product.vendor.role === 'importer') {
          orderType = 'B2B';
        }
      }

      const itemTotal = itemPrice * item.quantity;
      subtotal += itemTotal;

      const orderItem = {
        product: product._id,
        quantity: item.quantity,
        price: itemPrice,
        vendor: product.vendor._id || product.vendor
      };

      // Add variant info if present
      if (item.variant) {
        orderItem.variant = {
          color: item.variant.color,
          size: item.variant.size,
          sku: item.variant.sku
        };
      }

      orderItems.push(orderItem);

      // Update stock - will be recalculated from variants in pre-save hook
      product.sales += item.quantity;
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
      orderType,
      items: orderItems,
      subtotal,
      tax: taxDisplay,
      shippingCost,
      total,
      paymentMethod,
      shippingAddress,
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
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    session.endSession();
  }
};

// Get user's orders
export const getUserOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = { user: req.user._id };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('items.product', 'name images')
        .sort('-createdAt')
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get order by ID
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
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
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Cancel order
export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

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
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Public order tracking by order number (no auth required)
export const trackOrder = async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const order = await Order.findOne({ orderNumber: orderNumber.toUpperCase().trim() })
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
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get vendor's orders
export const getVendorOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = { 'items.vendor': req.user._id };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('user', 'fullName email phone')
        .populate('items.product', 'name images')
        .sort('-createdAt')
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update order status (vendor/admin)
export const updateOrderStatus = async (req, res) => {
  try {
    const { status, trackingNumber } = req.body;
    const order = await Order.findById(req.params.id);

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
      order.status = status;
      if (status === 'shipped') order.shippedAt = new Date();
      if (status === 'delivered') order.deliveredAt = new Date();
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
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
