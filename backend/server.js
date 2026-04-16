import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables FIRST so UPLOAD_DIR is available everywhere
dotenv.config();

/**
 * JutaGhar E-commerce API Server
 * 
 * FILE UPLOAD STRATEGY:
 * - Physical files saved to UPLOAD_DIR (file system)
 * - Only metadata (paths, sizes, types) stored in MongoDB
 * - Files served via /uploads/* static endpoint
 */

// File upload configuration
// Files are saved to UPLOAD_DIR, only metadata stored in database
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`✅ Created upload directory: ${uploadDir}`);
} else {
  console.log(`✅ Upload directory ready: ${uploadDir}`);
}

// Export uploadDir for use in routes
export { uploadDir };

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
import path from 'path';
import { fileURLToPath } from 'url';
import { apiVersionMiddleware, restfulCorsMiddleware } from './utils/restful.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(mongoSanitize());

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
const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'];
    if (allowedOrigins.includes(origin) || origin.includes('10.0.2.2') || origin.includes('localhost')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};
app.use(cors(corsOptions));

// Body parser with increased limit for image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Compression
app.use(compression());

// Serve uploaded files as static content
// Files are physically stored in uploadDir, database only stores file paths
app.use('/uploads', express.static(uploadDir, {
  maxAge: '1d', // Cache for 1 day
  etag: true
}));
console.log(`✅ Static file serving enabled: /uploads -> ${uploadDir}`);

// RESTful middleware
app.use(apiVersionMiddleware);
app.use(restfulCorsMiddleware);

// Add API version to response header
app.use((req, res, next) => {
  res.header('X-API-Version', '1.0.0');
  res.header('X-Powered-By', 'JutaGhar API');
  next();
});

// Connect to MongoDB Atlas with retry logic
const connectWithRetry = async (maxRetries = 10, delay = 3000) => {
  let attempts = 0;
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('MONGODB_URI is not defined in environment variables');
    process.exit(1);
  }
  
  while (attempts < maxRetries) {
    try {
      await mongoose.connect(uri);
      console.log('MongoDB Atlas Connected');
      console.log(`Database: ${mongoose.connection.name}`);
      return;
    } catch (err) {
      attempts += 1;
      console.error(`MongoDB Connection Error (attempt ${attempts}):`, err.message || err);
      if (attempts >= maxRetries) {
        console.error('Exceeded maximum MongoDB connection attempts. Exiting.');
        process.exit(1);
      }
      console.log(`Retrying MongoDB connection in ${delay}ms...`);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((res) => setTimeout(res, delay));
    }
  }
};

// Routes
// NOTE: File uploads should save physical files to uploadDir
// and store only file metadata (path, size, type) in database
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

// API Documentation endpoint
app.get('/api/docs', (req, res) => {
  try {
    const docsPath = path.join(__dirname, 'API_DOCUMENTATION.md');
    if (fs.existsSync(docsPath)) {
      const docs = fs.readFileSync(docsPath, 'utf8');
      
      // If client accepts HTML, send formatted version
      if (req.accepts('html')) {
        const htmlDocs = `
          <!DOCTYPE html>
          <html>
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
              .container {
                background: white;
                padding: 40px;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              }
              h1, h2, h3 { color: #333; }
              h1 { border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
              h2 { margin-top: 30px; color: #4CAF50; }
              code { 
                background: #f4f4f4; 
                padding: 2px 6px; 
                border-radius: 3px;
                font-family: 'Monaco', 'Courier New', monospace;
              }
              pre { 
                background: #2d2d2d; 
                color: #f8f8f2;
                padding: 15px; 
                border-radius: 5px; 
                overflow-x: auto;
              }
              pre code {
                background: none;
                color: #f8f8f2;
                padding: 0;
              }
              table { 
                border-collapse: collapse; 
                width: 100%; 
                margin: 20px 0;
              }
              th, td { 
                border: 1px solid #ddd; 
                padding: 12px; 
                text-align: left; 
              }
              th { 
                background-color: #4CAF50; 
                color: white;
              }
              tr:nth-child(even) { background-color: #f9f9f9; }
              .endpoint { 
                background: #e8f5e9; 
                padding: 10px; 
                border-left: 4px solid #4CAF50; 
                margin: 15px 0;
              }
              .method {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 3px;
                font-weight: bold;
                margin-right: 10px;
              }
              .method.get { background: #2196F3; color: white; }
              .method.post { background: #4CAF50; color: white; }
              .method.put { background: #FF9800; color: white; }
              .method.patch { background: #9C27B0; color: white; }
              .method.delete { background: #f44336; color: white; }
            </style>
          </head>
          <body>
            <div class="container">
              <div id="content">${docs.replace(/\n/g, '<br>')}</div>
            </div>
          </body>
          </html>
        `;
        return res.send(htmlDocs);
      }
      
      // Otherwise send markdown
      res.type('text/markdown').send(docs);
    } else {
      res.json({
        message: 'API Documentation',
        version: '1.0.0',
        endpoints: {
          auth: '/api/auth',
          products: '/api/products',
          orders: '/api/orders',
          vendors: '/api/vendors',
          catalog: '/api/catalog',
          admin: '/api/admin',
          apiClients: '/api/clients'
        }
      });
    }
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
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
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer();

export default app;
