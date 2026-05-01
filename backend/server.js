import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { stripDollarKeys } from './middleware/stripDollarKeys.js';

// Load environment variables first so Cloudinary config is available everywhere.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local'), override: true });

// ── Fail-fast env validation ──────────────────────────────────────────────────
const assertRequiredEnv = () => {
  const missing = [];

  const required = [
    'MONGODB_URI',
    'JWT_SECRET',
    'ESEWA_SECRET_KEY',
    'ESEWA_MERCHANT_CODE',
    'KHALTI_SECRET_KEY',
    'KHALTI_GATEWAY_URL',
    'SMTP_USER',
    'SMTP_PASSWORD',
    'GOOGLE_CLIENT_ID',
  ];

  for (const key of required) {
    if (!process.env[key]) missing.push(key);
  }

  // Cloudinary: accept either the combined URL or all three discrete vars
  const hasCloudinaryUrl = !!process.env.CLOUDINARY_URL;
  const hasCloudinaryParts =
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;

  if (!hasCloudinaryUrl && !hasCloudinaryParts) {
    missing.push('CLOUDINARY_URL (or CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET)');
  }

  if (missing.length > 0) {
    logger.error({ missing }, 'Missing required environment variables — copy .env.example to .env and fill in the values');
    process.exit(1);
  }
};

assertRequiredEnv();

// Import routes
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import vendorRoutes from './routes/vendors.js';
import catalogRoutes from './routes/catalog.js';
import apiClientRoutes from './routes/apiClients.js';
import outletsRoutes from './routes/outlets.js';
import paymentRoutes from './routes/payment.js';
import heroSlidesRoutes from './routes/heroSlides.js';
import reviewRoutes from './routes/reviews.js';
import deliverySettingsRoutes from './routes/deliverySettings.js';
import uploadsRoutes from './routes/uploads.js';
import webhooksRoutes from './routes/webhooks.js';
import { startPaymentReconciliationCron } from './jobs/reconcilePayments.js';
import { apiVersionMiddleware, restfulCorsMiddleware } from './utils/restful.js';
import { authenticate, optionalAuth, requireAdmin } from './middleware/auth.js';
import { requestId as requestIdMiddleware } from './middleware/requestId.js';
import logger from './utils/logger.js';
import pinoHttp from 'pino-http';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// DOMPurify instance backed by jsdom — used by the /api/docs renderer.
const { window: _domWindow } = new JSDOM('');
const purify = DOMPurify(_domWindow);

// Create Express app
const app = express();

// Trust the first proxy hop so req.ip reflects the real client IP.
// Must be set before any rate limiter is registered.
app.set('trust proxy', 1);

// Attach a unique request ID to every request and echo it as a response header.
app.use(requestIdMiddleware);

// HTTP request logging via pino.
app.use(pinoHttp({
  logger,
  // Enrich pino-http log records with req.id so every log line is correlated.
  genReqId: (req) => req.id,
  customLogLevel: (_req, res) => (res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
}));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: [
        "'self'",
        'https://a.khalti.com',
        'https://khalti.com',
        'https://rc-epay.esewa.com.np',
        'https://esewa.com.np'
      ],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
    }
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
  hsts: { maxAge: 15552000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Rate limiting - more lenient in development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 1000 requests in dev, 100 in production
  skip: (req) => {
    // Skip rate limiting for localhost in development
    if (process.env.NODE_ENV !== 'production') {
      const ip = req.ip || req.connection.remoteAddress;
      return ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1';
    }
    return false;
  }
});
app.use('/api/', limiter);

// CORS
const defaultCorsOrigins = ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'];
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || defaultCorsOrigins.join(','))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};
app.use(cors(corsOptions));

app.use((err, _req, res, next) => {
  if (err?.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'Origin is not allowed by CORS policy',
    });
  }
  return next(err);
});

// Orders can contain larger item payloads than the default parser cap.
app.use('/api/orders', express.json({ limit: '2mb' }), stripDollarKeys);

// Default body-size cap for all other JSON/urlencoded endpoints.
app.use(express.json({ limit: '256kb' }));
app.use(stripDollarKeys);
app.use(express.urlencoded({ extended: true, limit: '256kb' }));

// Compression
app.use(compression());

// RESTful middleware
app.use(apiVersionMiddleware);
app.use(restfulCorsMiddleware);

// Add API version to response header (X-Powered-By intentionally omitted to avoid fingerprinting).
app.use((_req, res, next) => {
  res.header('X-API-Version', '1.0.0');
  next();
});

// Connect to MongoDB Atlas with retry logic
const connectWithRetry = async (maxRetries = 10, delay = 3000) => {
  let attempts = 0;
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    logger.fatal('MONGODB_URI is not defined in environment variables');
    process.exit(1);
  }

  while (attempts < maxRetries) {
    try {
      await mongoose.connect(uri);
      logger.info({ db: mongoose.connection.name }, 'MongoDB Atlas connected');
      return;
    } catch (err) {
      attempts += 1;
      logger.error({ err, attempt: attempts }, 'MongoDB connection error');
      if (attempts >= maxRetries) {
        logger.fatal('Exceeded maximum MongoDB connection attempts — exiting');
        process.exit(1);
      }
      logger.info({ delayMs: delay }, 'Retrying MongoDB connection');
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/clients', apiClientRoutes);
app.use('/api/outlets', outletsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/hero-slides', heroSlidesRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/delivery-settings', deliverySettingsRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/webhooks', webhooksRoutes);

// Safe JSON catalog returned when the HTML docs are gated.
const JSON_CATALOG = {
  message: 'API Documentation',
  version: '1.0.0',
  endpoints: {
    auth: '/api/auth',
    products: '/api/products',
    orders: '/api/orders',
    vendors: '/api/vendors',
    catalog: '/api/catalog',
    admin: '/api/admin',
    apiClients: '/api/clients',
  },
};

// API Documentation endpoint
// In production the HTML view is restricted to admin/manager users;
// all other callers receive the safe JSON catalog.
app.get('/api/docs', optionalAuth, (req, res) => {
  try {
    const isProd = process.env.NODE_ENV === 'production';
    const isAdmin = req.user && ['admin', 'manager'].includes(req.user.role);

    // Gate: production + non-admin → JSON catalog only.
    if (isProd && !isAdmin) {
      return res.json(JSON_CATALOG);
    }

    const docsPath = path.join(__dirname, 'API_DOCUMENTATION.md');
    if (!fs.existsSync(docsPath)) {
      return res.json(JSON_CATALOG);
    }

    const docs = fs.readFileSync(docsPath, 'utf8');

    // If client accepts HTML, send a sanitized rendered version.
    if (req.accepts('html')) {
      const renderedMarkdown = marked.parse(docs);
      const safeHtml = purify.sanitize(renderedMarkdown);

      const htmlDocs = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>JutaGhar API Documentation</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1, h2, h3 { color: #333; }
    h1 { border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
    h2 { margin-top: 30px; color: #4CAF50; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: 'Monaco', 'Courier New', monospace; }
    pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 5px; overflow-x: auto; }
    pre code { background: none; color: #f8f8f2; padding: 0; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .endpoint { background: #e8f5e9; padding: 10px; border-left: 4px solid #4CAF50; margin: 15px 0; }
    .method { display: inline-block; padding: 4px 8px; border-radius: 3px; font-weight: bold; margin-right: 10px; }
    .method.get { background: #2196F3; color: white; }
    .method.post { background: #4CAF50; color: white; }
    .method.put { background: #FF9800; color: white; }
    .method.patch { background: #9C27B0; color: white; }
    .method.delete { background: #f44336; color: white; }
  </style>
</head>
<body>
  <div class="container">
    <div id="content">${safeHtml}</div>
  </div>
</body>
</html>`;
      return res.send(htmlDocs);
    }

    // Non-HTML accept → raw markdown.
    res.type('text/markdown').send(docs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load documentation' });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to JutaGhar E-commerce API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      health: '/health',
      docs: '/api/docs',
      auth: '/api/auth',
      products: '/api/products',
      orders: '/api/orders',
      vendors: '/api/vendors',
      catalog: '/api/catalog',
      admin: '/api/admin',
      apiClients: '/api/clients'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Global error handler.
// - Always logs the full error + stack server-side (correlated by requestId).
// - In production, returns a generic message so internal details are never leaked.
// - In development, includes the stack for easier debugging.
app.use((err, req, res, _next) => {
  logger.error({ err, requestId: req.id }, 'Unhandled request error');

  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  res.status(status).json({
    success: false,
    message: isProd ? 'Something went wrong' : (err.message || 'Internal Server Error'),
    requestId: req.id,
    ...((!isProd) && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server after DB connection
const PORT = process.env.PORT || 8000;

const startServer = async () => {
  await connectWithRetry();

  // Migrate legacy orders.gatewayTransactionId unique sparse index to a partial unique index.
  // The old index treats null as a real value and can block inserting multiple unpaid orders.
  const ordersCollection = mongoose.connection.collection('orders');
  const indexName = 'gatewayTransactionId_1';
  try {
    const indexes = await ordersCollection.indexes();
    const oldGatewayIndex = indexes.find((idx) => idx.name === indexName);

    if (oldGatewayIndex?.unique && oldGatewayIndex?.sparse) {
      await ordersCollection.dropIndex(indexName);
    }

    const hasPartialGatewayIndex = indexes.some(
      (idx) => idx.name === indexName && idx.partialFilterExpression
    );

    if (!hasPartialGatewayIndex) {
      await ordersCollection.createIndex(
        { gatewayTransactionId: 1 },
        {
          name: indexName,
          unique: true,
          partialFilterExpression: {
            gatewayTransactionId: { $type: 'string' },
          },
        }
      );
    }
  } catch (indexError) {
    logger.warn({ err: indexError }, 'Orders gatewayTransactionId index migration skipped');
  }

  if (process.env.NODE_ENV !== 'test') {
    startPaymentReconciliationCron();
  }
  app.listen(PORT, () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, 'Server running');
  });
};

startServer();

export default app;
