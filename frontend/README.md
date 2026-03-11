# JutaGhar Frontend - React + TypeScript + Vite

Modern, responsive React + TypeScript frontend for the JutaGhar multi-vendor e-commerce platform.

---

## 📋 Table of Contents

1. [Tech Stack](#tech-stack)
2. [Prerequisites](#prerequisites)
3. [Getting Started](#getting-started)
4. [Backend API Connection](#backend-api-connection)
5. [Environment Configuration](#environment-configuration)
6. [Development](#development)
7. [Project Structure](#project-structure)
8. [Features](#features)
9. [Available Scripts](#available-scripts)
10. [Troubleshooting](#troubleshooting)

---

## 🚀 Tech Stack

- **React 18** - UI library with hooks and concurrent features
- **TypeScript** - Type-safe JavaScript superset
- **Vite 5** - Lightning-fast build tool with HMR
- **React Router v6** - Client-side routing
- **Zustand** - Lightweight state management
- **TanStack Query (React Query)** - Server state management and caching
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - Promise-based HTTP client
- **React Hook Form** - Performant form handling
- **Zod** - TypeScript-first schema validation
- **Lucide React** - Beautiful & consistent icons
- **React Hot Toast** - Toast notifications

---

## 📦 Prerequisites

Before you begin, ensure you have installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn** - Package manager (comes with Node.js)
- **Backend API** running - See [Backend Setup](#backend-api-connection)

---

## 🏁 Getting Started

### 1. Install Dependencies

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# If you encounter dependency resolution errors:
npm install --legacy-peer-deps

# Or force installation:
npm install --force
```

### 2. Configure Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
# API Configuration
VITE_API_URL=http://localhost:8000/api

# Optional: Enable/Disable Features
VITE_ENABLE_ANALYTICS=false
VITE_DEBUG_MODE=true
```

### 3. Start Development Server

```bash
npm run dev
```

The application will open at `http://localhost:5174`

---

## 🔌 Backend API Connection

### Setting Up the Backend

The frontend requires the backend API to be running. Follow these steps:

#### 1. Navigate to Backend Directory

```bash
cd ../backend
```

#### 2. Install Backend Dependencies

```bash
npm install
```

#### 3. Configure Backend Environment

Create `.env` file in `backend/` directory:

```env
PORT=8000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRE=30d
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```

#### 4. Initialize Database

```bash
# Create admin user
node createAdmin.js

# Optional: Seed catalog data
node seedCatalog.js
```

#### 5. Start Backend Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

Backend API will be available at `http://localhost:8000`

#### 6. Verify Backend Connection

Test the API health endpoint:

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "success",
  "message": "API is running"
}
```

---

## ⚙️ Environment Configuration

### Development vs Production

The frontend uses **Vite proxy** in development and **direct API calls** in production:

#### Development Mode (Vite Proxy)
```typescript
// vite.config.ts automatically proxies /api requests
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
      secure: false,
    },
  },
}
```

In development, API calls to `/api/*` are automatically proxied to `http://localhost:8000/api/*`

#### Production Mode
```env
# .env
VITE_API_URL=https://your-production-api.com/api
```

The app uses `VITE_API_URL` environment variable for production builds.

### API Configuration Files

The API client is configured in [src/lib/api.ts](src/lib/api.ts):

```typescript
// Automatic environment detection
const API_URL = import.meta.env.MODE === 'development' 
  ? '' // Use Vite proxy in development
  : (import.meta.env.VITE_API_URL || 'http://localhost:8000');

// Axios instance with interceptors for auth
export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});
```

**Features:**
- ✅ Automatic JWT token injection
- ✅ Token refresh on 401 errors
- ✅ Request/Response interceptors
- ✅ Environment-aware configuration

---

## 🛠️ Development

### Running Both Frontend & Backend

**Option 1: Separate Terminals**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**Option 2: Use Process Manager (e.g., concurrently)**
```bash
# From root directory
npm install -g concurrently
concurrently "cd backend && npm run dev" "cd frontend && npm run dev"
```

### Hot Module Replacement (HMR)

Vite provides instant HMR. Changes to React components update immediately without full page reload.

### Development Tools

- **React DevTools** - [Chrome](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi) | [Firefox](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)
- **TanStack Query DevTools** - Built-in, accessible via floating button in dev mode

---

## 📁 Project Structure

```
src/
├── components/          # Reusable React components
│   ├── layouts/        # Layout wrappers
│   │   ├── DashboardLayout.tsx
│   │   └── MainLayout.tsx
│   ├── Banner.tsx
│   ├── BrandSlider.tsx
│   ├── Carousel.tsx
│   ├── Featured.tsx
│   ├── Footer.tsx
│   ├── Header.tsx
│   ├── Navbar.tsx
│   ├── NewArrival.tsx
│   ├── ProductCard.tsx
│   ├── ProductForm.tsx
│   ├── ProductSlider.tsx
│   ├── Sale.tsx
│   └── Trending.tsx
├── pages/              # Route-level components
│   ├── Home.tsx
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Products.tsx
│   ├── ProductDetail.tsx
│   ├── Cart.tsx
│   ├── Checkout.tsx
│   ├── admin/          # Admin dashboard pages
│   │   ├── Dashboard.tsx
│   │   ├── ManageBrands.tsx
│   │   ├── ManageCategories.tsx
│   │   ├── ManageProducts.tsx
│   │   ├── ManageUsers.tsx
│   │   └── ManageVendors.tsx
│   ├── user/           # Customer dashboard pages
│   │   └── Dashboard.tsx
│   └── vendor/         # Vendor dashboard pages
│       ├── Dashboard.tsx
│       ├── EditProduct.tsx
│       ├── ManageInventory.tsx
│       ├── ManageProducts.tsx
│       └── NewProduct.tsx
├── stores/             # Zustand state management
│   ├── authStore.ts    # Authentication state
│   └── cartStore.ts    # Shopping cart state
├── lib/                # Utility libraries
│   ├── api.ts          # Axios instance & interceptors
│   └── utils.ts        # Helper functions
├── types/              # TypeScript type definitions
│   ├── index.ts        # General types
│   └── product.ts      # Product-related types
├── assets/             # Static assets (images, fonts)
├── App.tsx             # Root component with routing
├── main.tsx            # Application entry point
└── index.css           # Global styles & Tailwind imports
```

---

## ✨ Features

### Authentication & Authorization
- 🔐 JWT-based authentication
- 🔄 Automatic token refresh
- 👤 Role-based access control (Admin, Vendor, User)
- 🚪 Protected routes

### Shopping Experience
- 🛒 Shopping cart with persistence
- 🔍 Product search & filtering
- 🏷️ Category and brand navigation
- 📦 Product variants (size, color)
- ⭐ Featured & trending products

### Dashboards
- 👨‍💼 **Admin Dashboard** - User, vendor, product, category, brand management
- 🏪 **Vendor Dashboard** - Product & inventory management
- 👤 **User Dashboard** - Order history & account settings

### UI/UX
- 📱 Fully responsive design
- 🎨 Modern Tailwind CSS styling
- ⚡ Fast page transitions
- 🔔 Toast notifications
- ♿ Accessible components

---

## 📜 Available Scripts

### Development
```bash
npm run dev          # Start dev server (localhost:5174)
```

### Build & Preview
```bash
npm run build        # Build for production (outputs to dist/)
npm run preview      # Preview production build locally
```

### Code Quality
```bash
npm run lint         # Run ESLint
```

### Type Checking
```bash
npx tsc --noEmit     # Check TypeScript types without emitting files
```

### Type Checking
```bash
npx tsc --noEmit     # Check TypeScript types without emitting files
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. **Backend Connection Refused**

**Problem:** `ERR_CONNECTION_REFUSED` when calling API

**Solutions:**
```bash
# Verify backend is running
curl http://localhost:8000/health

# Check backend port in .env matches vite.config.ts proxy
# Backend .env: PORT=8000
# Frontend vite.config.ts: target: 'http://localhost:8000'

# Verify CORS configuration in backend .env
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```

#### 2. **401 Unauthorized Errors**

**Problem:** Getting 401 errors on authenticated requests

**Solutions:**
- Check if JWT token is stored in localStorage
- Verify token hasn't expired (default: 30 days)
- Clear localStorage and login again:
  ```javascript
  // In browser console
  localStorage.clear()
  ```

#### 3. **Dependency Installation Errors**

**Problem:** `npm install` fails with peer dependency conflicts

**Solutions:**
```bash
# Use legacy peer deps
npm install --legacy-peer-deps

# Or force install
npm install --force

# Clear cache if issues persist
npm cache clean --force
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

#### 4. **Port Already in Use**

**Problem:** `Port 5174 is already in use`

**Solutions:**
```bash
# Find and kill process on port 5174 (macOS/Linux)
lsof -ti:5174 | xargs kill -9

# Or change port in vite.config.ts
server: {
  port: 5175, // Use different port
}
```

#### 5. **Environment Variables Not Loading**

**Problem:** `import.meta.env.VITE_API_URL` is undefined

**Solutions:**
- Ensure `.env` file is in frontend root directory
- All env vars must start with `VITE_` prefix
- Restart dev server after changing `.env`:
  ```bash
  # Stop server (Ctrl+C) and restart
  npm run dev
  ```

#### 6. **Vite Proxy Not Working**

**Problem:** API calls are not being proxied

**Solutions:**
- Verify proxy configuration in `vite.config.ts`
- Ensure API calls use relative path `/api/*` not full URL
- Check backend is running on correct port
- Restart Vite dev server

#### 7. **Module Not Found Errors**

**Problem:** TypeScript can't find modules or types

**Solutions:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check path aliases in tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## 🔗 API Endpoints Reference

### Base URL
- **Development:** `http://localhost:8000/api`
- **Production:** Set via `VITE_API_URL` environment variable

### Main Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | User login |
| POST | `/auth/refresh` | Refresh JWT token |
| GET | `/products` | List all products |
| GET | `/products/:id` | Get product details |
| POST | `/products` | Create product (Vendor/Admin) |
| PUT | `/products/:id` | Update product (Vendor/Admin) |
| DELETE | `/products/:id` | Delete product (Vendor/Admin) |
| GET | `/catalog/categories` | Get all categories |
| GET | `/catalog/brands` | Get all brands |
| POST | `/orders` | Create order |
| GET | `/orders/my-orders` | Get user orders |
| GET | `/admin/users` | List users (Admin) |
| GET | `/admin/stats` | Dashboard stats (Admin) |
| GET | `/vendors/products` | Vendor products |

For complete API documentation, see [Backend README](../backend/README.md)

---

## 🚀 Deployment

### Build for Production

```bash
# Create optimized production build
npm run build

# Output directory: dist/
```

### Environment Variables for Production

```env
# Production API URL
VITE_API_URL=https://api.yourdomain.com/api

# Optional production flags
VITE_ENABLE_ANALYTICS=true
VITE_DEBUG_MODE=false
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Project Settings > Environment Variables > Add VITE_API_URL
```

### Deploy to Netlify

```bash
# Build command
npm run build

# Publish directory
dist

# Environment variables
# Site Settings > Build & Deploy > Environment > Add VITE_API_URL
```

### Deploy to AWS S3 + CloudFront

```bash
# Build project
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

---

## 📚 Additional Resources

### Documentation
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Documentation](https://vitejs.dev/)
- [React Router v6](https://reactrouter.com/)
- [Zustand Documentation](https://docs.pmnd.rs/zustand/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Backend Repository
- See [Backend README](../backend/README.md) for API documentation
- Backend source: [../backend](../backend/)

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -m 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit pull request

---

## 📄 License

This project is licensed under the ISC License.

---

## 👨‍💻 Development Team

JutaGhar Development Team

---

## 🆘 Support

For issues and questions:
- Open an issue on GitHub
- Contact development team
- Check [Troubleshooting](#troubleshooting) section

---

**Made with ❤️ using React + TypeScript + Vite**

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🐛 Troubleshooting

### npm install fails

If you see `ERESOLVE` dependency errors:

```bash
# Clean install with legacy peer deps
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### npm cache permission errors

If you see `EACCES` errors:

```bash
# Fix npm cache permissions (macOS/Linux)
sudo chown -R $(whoami) ~/.npm
```

Then retry installation.

### API connection issues

1. Ensure backend is running on http://localhost:8000
2. Check `VITE_API_URL` in `.env` file
3. Verify proxy settings in `vite.config.ts`

## License

ISC


# JutaGhar Frontend - Comprehensive Footwear E-commerce Platform

Modern, responsive React + TypeScript frontend for JutaGhar footwear marketplace with advanced features and reusable components.

## 🎯 Overview

A complete multi-vendor B2B/B2C e-commerce platform specifically designed for footwear retail with:
- **8 Homepage Sections** (Hero, Promotion, New Arrivals, Banners, Best Sellers, Featured, Brands, Categories)
- **Advanced Product Attributes** (Variants, Materials, Performance features, Kids-specific attributes)
- **Faceted Search & Filtering** (Gender, Size, Color, Brand, Price, Material, etc.)
- **Responsive Design** (Mobile-first approach with Tailwind CSS)
- **Role-Based Dashboards** (Admin, Vendor, Customer)

---

## 🏗️ Architecture

### Tech Stack
- **React 18** - UI Library
- **TypeScript** - Type Safety
- **Vite** - Build Tool & Dev Server
- **React Router v6** - Client-side Routing
- **Zustand** - State Management
- **TanStack Query** - Server State & Caching
- **Tailwind CSS** - Utility-first Styling
- **Axios** - HTTP Client
- **React Hook Form + Zod** - Form Validation
- **Lucide React** - Icon Library

### Project Structure
```
src/
├── components/          # Reusable UI Components
│   ├── Navbar.tsx       # Enhanced navigation with dropdowns
│   ├── ProductCard.tsx  # Product display card
│   ├── Carousel.tsx     # Hero carousel slider
│   ├── Banner.tsx       # Promotional banners
│   ├── ProductSlider.tsx # Product carousel
│   ├── BrandSlider.tsx  # Brand logo slider
│   ├── Header.tsx       # Original header (deprecated)
│   ├── Footer.tsx       # Site footer
│   └── layouts/
│       └── MainLayout.tsx # Main page layout
├── pages/               # Route Pages
│   ├── Home.tsx         # Homepage with 8 sections
│   ├── Products.tsx     # Product listing with filters
│   ├── ProductDetail.tsx # Single product view
│   ├── Cart.tsx         # Shopping cart
│   ├── Checkout.tsx     # Order checkout
│   ├── Login.tsx        # User authentication
│   ├── Register.tsx     # User registration
│   ├── admin/           # Admin dashboard
│   ├── vendor/          # Vendor dashboard
│   └── user/            # Customer dashboard
├── stores/              # Zustand State Stores
│   ├── authStore.ts     # Authentication state
│   └── cartStore.ts     # Shopping cart state
├── types/               # TypeScript Definitions
│   ├── product.ts       # Comprehensive product types
│   └── index.ts         # General types
├── lib/                 # Utilities
│   ├── api.ts           # Axios instance with interceptors
│   └── utils.ts         # Helper functions
├── App.tsx              # Root component with routing
├── main.tsx             # Application entry point
└── index.css            # Global styles

```

---

## 📱 Homepage Sections

### 1. Enhanced Navbar
- **Desktop**: Horizontal menu with dropdown support
- **Mobile**: Hamburger menu with expandable sections
- **Navigation Items**:
  - Men (Casual, Formal, Sports, Sandals, Boots)
  - Women (Casual, Formal, Heels, Flats, Sandals, Boots)
  - Kids (Boys, Girls, Infant, School)
  - Brands
  - Category
  - New Arrival
  - Best Seller
  - Outlets
- **Features**:
  - Search bar with instant navigation
  - Shopping cart with item count badge
  - User menu with dropdown
  - Responsive design

### 2. Hero Carousel (Row 1)
- Admin-configurable banner slides
- Auto-play with 5s interval
- Each slide supports:
  - Title & Subtitle
  - CTA Button
  - Link to Product/Category/External URL
- Smooth transitions with indicators
- Pause on hover

### 3. Promotion Banner (Row 2)
- Gradient background
- Two CTA buttons:
  - "Start Shopping" → Products page
  - "Become Vendor" → Registration
- Responsive layout

### 4. New Arrivals Section (Row 3)
- Fetches from `/api/products?sort=new&limit=12`
- Horizontal scrollable slider
- 4 products per view on desktop
- "View All" link
- Skeleton loaders

### 5. Banner Slot 1 (Row 4)
- Full-width promotional banner
- Customizable height (350px)
- Image with text overlay
- Clickable link support

### 6. Best Sellers Section (Row 5)
- Fetches from `/api/products?tag=best-seller&limit=12`
- Product slider with navigation arrows
- Shows popular products
- Responsive grid

### 7. Banner Slot 2 (Row 6)
- Second promotional banner
- Sports collection example
- Text positioned right
- Hover scale effect

### 8. Featured Products (Row 7)
- Fetches from `/api/products?tag=featured&limit=8`
- Handpicked products
- 4 items visible at a time
- Auto-scroll option

### 9. Popular Brands (Row 8)
- 9 brand logos per row on large screens
- Horizontal scrollable
- Grayscale effect with color on hover
- Clickable to brand pages

### 10. Category Highlights
- 8 category tiles with images
- Men's, Women's, Kids', Sports, Casual, Formal, Sandals, Boots
- Hover zoom effect
- Background overlay with gradient

### 11. Features Section
- Wide Selection
- Multi-Vendor Platform
- Best Prices
- Icon-based layout

---

## 🎨 UI Components

### ProductCard
**Features:**
- Image with lazy loading
- Skeleton loader
- Discount badges (New, Featured, Best Seller, Limited Stock, Sale)
- Hover effects (scale, quick actions)
- Heart icon (wishlist)
- Quick add to cart
- Color swatches
- Size availability
- Rating stars
- Out of stock overlay

**Props:**
```typescript
interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}
```

### Carousel
**Features:**
- Auto-play with configurable interval
- Navigation arrows
- Dot indicators
- Pause on hover
- Smooth transitions
- Link support (internal/external)
- Text overlay with CTA

**Props:**
```typescript
interface CarouselProps {
  slides: CarouselSlide[];
  autoPlay?: boolean;
  interval?: number;
  showIndicators?: boolean;
  showControls?: boolean;
  height?: string;
}
```

### Banner
**Features:**
- Lazy loading images
- Clickable links
- Text overlay options
- Customizable text position (left/center/right)
- Hover scale effect
- Skeleton loader

**Props:**
```typescript
interface BannerProps {
  image: string;
  title?: string;
  subtitle?: string;
  link?: string;
  linkType?: 'product' | 'category' | 'external';
  buttonText?: string;
  height?: string;
  overlay?: boolean;
  textPosition?: 'left' | 'center' | 'right';
}
```

### ProductSlider
**Features:**
- Horizontal scrolling
- Navigation arrows
- Configurable items per view
- "View All" link
- Responsive design
- Smooth scroll

**Props:**
```typescript
interface ProductSliderProps {
  products: Product[];
  title?: string;
  subtitle?: string;
  itemsPerView?: number;
  showViewAll?: boolean;
  viewAllLink?: string;
}
```

### BrandSlider
**Features:**
- Horizontal scrolling
- 9 logos per row (desktop)
- Auto-scroll option
- Grayscale to color effect
- Navigation arrows

**Props:**
```typescript
interface BrandSliderProps {
  brands: Brand[];
  itemsPerView?: number;
  autoScroll?: boolean;
  scrollInterval?: number;
}
```

---

## 🛍️ Product Attributes

### Core Attributes
- Product Name, Category, Gender, Product Type
- Brand, SKU, Slug (SEO-friendly URL)
- Base Price, Campaign Price, Currency
- Short/Long Description
- Images (Hero, Gallery, Sole View, Lifestyle, Size Chart)
- Status (Active, Out of Stock, Discontinued)
- Badges (New, Featured, Best Seller, Limited Stock, Sale)
- Tags, Rating, Review Count, Sales Count

### Product Variants
Each product supports multiple variants:
- Size (with Size System: EU/US/UK/Kids)
- Width (Narrow, Medium, Wide, Extra-Wide)
- Color (with Hex code)
- Stock quantity
- Individual pricing
- SKU, Barcode, GTIN
- Weight & Dimensions

### Physical Attributes
- **Toe Shape**: Round, Pointed, Square, Almond, Open
- **Heel Type**: Flat, Block, Stiletto, Wedge, Platform, Kitten, Cone
- **Heel Height**: In centimeters
- **Closure Type**: Lace, Slip-on, Velcro, Buckle, Zipper, Elastic

### Material Details
- Upper Material
- Lining Material
- Sole Material
- Insole Material

### Performance Features
- **Cushioning**: Minimal, Moderate, Maximum
- **Arch Support**: Low, Medium, High
- **Waterproof**: Boolean
- **Breathability**: Low, Medium, High
- **Slip Resistant**: Boolean
- **Safety Toe**: Boolean
- **Reflective**: Boolean

### Activity & Terrain
- **Activity Type**: Running, Walking, Hiking, Sports, Casual, Formal, Work
- **Terrain**: Road, Trail, Indoor, All-terrain

### Kids-Specific Attributes
- **Age Group**: Infant, Toddler, Little Kid, Big Kid, Teen
- **Size Type**: Infant, Toddler, Youth
- **Safety Features**: Array of features
- **School Approved**: Boolean
- **Growth Room**: Boolean
- **Easy Fastening**: Boolean

### SEO Metadata
- Meta Title
- Meta Description
- Slug for friendly URLs

---

## 🔍 Filtering Capabilities

The platform supports comprehensive faceted search:

### Available Filters
- **Gender**: Men, Women, Kids, Unisex
- **Category**: Casual, Formal, Sports, Outdoor, Sandals, Boots, etc.
- **Brand**: Multiple brand selection
- **Price Range**: Min/Max slider
- **Size**: Multi-select sizes
- **Color**: Color swatches
- **Materials**: Upper/Sole materials
- **Closure Type**: Lace, Slip-on, Velcro, etc.
- **Heel Height Range**: Min/Max slider
- **Activity Type**: Running, Hiking, Casual, etc.
- **Width**: Narrow, Medium, Wide, Extra-Wide
- **Waterproof**: Boolean toggle
- **In Stock Only**: Boolean toggle

### Search & Sort
- **Search**: Text search across product names
- **Sort Options**:
  - New Arrivals
  - Price: Low to High
  - Price: High to Low
  - Most Popular
  - Top Rated

---

## 🎯 Key Features

### Mobile-First Design
- Responsive breakpoints (sm, md, lg, xl)
- Touch-friendly navigation
- Mobile-optimized images
- Collapsible menus

### Performance Optimization
- **Lazy Loading**: Images load on viewport
- **Skeleton Loaders**: Better perceived performance
- **Code Splitting**: Route-based lazy loading
- **Image Optimization**: WebP support, multiple sizes
- **Caching**: TanStack Query caching strategy

### SEO Optimization
- Semantic HTML
- Meta tags support
- Friendly URLs (slugs)
- Alt text for images
- Structured data ready

### Accessibility
- Keyboard navigation
- ARIA labels
- Focus indicators
- Screen reader support
- Color contrast ratios

---

## 🚀 Getting Started

### Installation
```bash
cd webApp/frontend
npm install
```

### Environment Variables
Create `.env` file:
```env
VITE_API_URL=http://localhost:8000/api
```

### Development
```bash
npm run dev
```
Access at: http://localhost:5173

### Build
```bash
npm run build
```

### Preview Production
```bash
npm run preview
```

---

## 📡 API Integration

### Endpoints Used

**Products:**
- `GET /api/products` - List products with filters
- `GET /api/products/:id` - Get product details
- `GET /api/products?sort=new` - New arrivals
- `GET /api/products?tag=best-seller` - Best sellers
- `GET /api/products?tag=featured` - Featured products

**Authentication:**
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user

**Cart & Orders:**
- `POST /api/orders` - Create order
- `GET /api/orders` - User orders

---

## 🎨 Tailwind Configuration

### Custom Colors
```javascript
primary: {
  50: '#f0f9ff',
  100: '#e0f2fe',
  // ... up to 900
}
```

### Custom Components
- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`
- `.input` - Form inputs
- `.card` - Card containers
- `.badge` - Status badges

---

## 📦 State Management

### Auth Store (Zustand)
```typescript
{
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (email, password) => Promise<void>;
  register: (data) => Promise<void>;
  logout: () => void;
  updateUser: (user) => void;
}
```

### Cart Store (Zustand)
```typescript
{
  items: CartItem[];
  addItem: (item) => void;
  removeItem: (productId) => void;
  updateQuantity: (productId, quantity) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}
```

Both stores persist to `localStorage`.

---

## 🔐 Authentication Flow

1. User logs in via `/login`
2. JWT tokens stored in Zustand + localStorage
3. Axios interceptor adds token to requests
4. Auto token refresh on 401 responses
5. Redirect to login if refresh fails

---

## 🛣️ Routing

```typescript
/ → Home (Public)
/products → Product Listing (Public)
/products/:slug → Product Detail (Public)
/login → Login (Public)
/register → Registration (Public)
/cart → Shopping Cart (Protected)
/checkout → Checkout (Protected)
/dashboard → User Dashboard (Protected: User)
/vendor/dashboard → Vendor Dashboard (Protected: Vendor)
/admin/dashboard → Admin Dashboard (Protected: Admin/Manager)
```

---

## 🐛 Error Handling

- API error boundaries
- Fallback UI for failed loads
- Toast notifications (future)
- Form validation errors
- Network error handling

---

## 🚧 Future Enhancements

1. **Product Comparison**: Side-by-side comparison
2. **Wishlist**: Save favorite products
3. **Reviews & Ratings**: User-generated content
4. **Size Guide**: Interactive size charts
5. **360° Product View**: Product rotation
6. **AR Try-On**: Virtual shoe fitting
7. **Live Chat**: Customer support
8. **Social Sharing**: Share products
9. **Recently Viewed**: Product history
10. **Personalized Recommendations**: AI-based suggestions

---

## 📝 Component Usage Examples

### Using ProductCard
```tsx
import ProductCard from '@/components/ProductCard';

<ProductCard 
  product={productData} 
  onAddToCart={(product) => console.log('Added', product)}
/>
```

### Using Carousel
```tsx
import Carousel from '@/components/Carousel';

const slides = [
  {
    id: '1',
    image: '/banner1.jpg',
    title: 'Summer Sale',
    link: '/products?tag=sale',
    linkType: 'category'
  }
];

<Carousel slides={slides} autoPlay interval={5000} />
```

### Using ProductSlider
```tsx
import ProductSlider from '@/components/ProductSlider';

<ProductSlider
  products={products}
  title="New Arrivals"
  itemsPerView={4}
  showViewAll
  viewAllLink="/products?sort=new"
/>
```

---

## 📄 License

ISC

---

## 👥 Credits

Built for **JutaGhar** - Nepal's Premier Footwear E-commerce Platform

**Stack**: React 18 + TypeScript + Vite + Tailwind CSS + Zustand + TanStack Query
