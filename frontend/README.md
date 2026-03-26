# JutaGhar Frontend

React + TypeScript + Vite frontend for the JutaGhar multi-vendor e-commerce platform.

## Tech Stack

| Technology | Purpose |
|---|---|
| React 18 | UI library |
| TypeScript | Type safety |
| Vite | Build tool with HMR |
| React Router v6 | Client-side routing |
| Zustand | State management |
| TanStack Query | Server state & caching |
| Tailwind CSS | Styling |
| Axios | HTTP client |
| React Hook Form + Zod | Form handling & validation |
| Lucide React | Icons |

## Prerequisites

- Node.js v16+
- Backend API running (see [backend README](../backend/README.md))

## Getting Started

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5174`.

### Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:8000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

> In development, Vite proxies `/api/*` requests to `http://localhost:8000` automatically (configured in `vite.config.ts`). `VITE_API_URL` is used in production builds.

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── Banner.tsx
│   ├── BrandSlider.tsx
│   ├── Carousel.tsx
│   ├── Featured.tsx
│   ├── Footer.tsx
│   ├── Navbar.tsx
│   ├── NewArrival.tsx
│   ├── ProductCard.tsx
│   ├── ProductForm.tsx
│   ├── ProductSlider.tsx
│   ├── bannerPremium.tsx
│   ├── bannerPromotion.tsx
│   ├── bannerSports.tsx
│   ├── bestSeller.tsx
│   ├── brands.tsx
│   ├── category.tsx
│   ├── hero.tsx
│   ├── sale.tsx
│   └── why.tsx
├── layouts/              # Layout wrappers
│   ├── MainLayout.tsx
│   └── dashboard.tsx
├── pages/                # Route-level pages
│   ├── Home.tsx
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Products.tsx
│   ├── ProductDetail.tsx
│   ├── Cart.tsx
│   ├── Checkout.tsx
│   ├── Outlets.tsx
│   ├── sale.tsx
│   ├── AboutUs.tsx
│   ├── Contact.tsx
│   ├── PrivacyPolicy.tsx
│   ├── ReturnPolicy.tsx
│   ├── ShippingInfo.tsx
│   ├── admin/            # Admin dashboard
│   │   ├── Dashboard.tsx
│   │   ├── DeliverySettings.tsx
│   │   ├── ManageBrands.tsx
│   │   ├── ManageCategories.tsx
│   │   ├── ManageHeroSlides.tsx
│   │   ├── ManageProducts.tsx
│   │   └── ManageUsers.tsx
│   ├── payment/          # Payment callbacks
│   │   ├── EsewaSuccess.tsx
│   │   ├── EsewaFailure.tsx
│   │   └── KhaltiCallback.tsx
│   ├── user/             # Customer dashboard
│   │   ├── Dashboard.tsx
│   │   ├── OrderDetail.tsx
│   │   ├── Orders.tsx
│   │   ├── Profile.tsx
│   │   └── Wishlist.tsx
│   └── vendor/           # Vendor dashboard
│       ├── Dashboard.tsx
│       ├── EditProduct.tsx
│       ├── ManageInventory.tsx
│       ├── ManageProducts.tsx
│       ├── NewProduct.tsx
│       ├── Orders.tsx
│       └── TaxSettings.tsx
├── stores/               # Zustand stores
│   ├── authStore.ts
│   ├── cartStore.ts
│   └── wishlistStore.ts
├── lib/                  # Utilities
│   ├── api.ts
│   ├── paymentGateway.ts
│   └── utils.ts
├── types/                # TypeScript types
│   ├── index.ts
│   └── product.ts
├── assets/               # Static assets
├── App.tsx               # Root component & routing
├── main.tsx              # Entry point
└── index.css             # Global styles & Tailwind
```

## Features

- **Auth** — JWT login, Google OAuth, role-based access (Admin / Vendor / User), protected routes
- **Shopping** — Product search & filtering, brand/category navigation, variants (size, color), cart with persistence, wishlist
- **Checkout** — eSewa and Khalti payment integration, delivery settings
- **Admin Dashboard** — Manage users, vendors, products, categories, brands, hero slides, delivery settings
- **Vendor Dashboard** — Product CRUD, inventory tracking, order management, tax settings
- **User Dashboard** — Order history, order details, profile, wishlist
- **UI** — Responsive design, Tailwind CSS, toast notifications, lazy-loaded routes

## Scripts

```bash
npm run dev       # Start dev server
npm run build     # Production build (outputs to dist/)
npm run preview   # Preview production build
npm run lint      # Run ESLint
npx tsc --noEmit  # Type-check without emitting
```

## Troubleshooting

| Problem | Solution |
|---|---|
| `ERR_CONNECTION_REFUSED` | Ensure backend is running: `curl http://localhost:8000/health` |
| 401 errors | Clear localStorage and re-login |
| `npm install` fails | Try `npm install --legacy-peer-deps` |
| Port in use | `lsof -ti:5174 \| xargs kill -9` |
| Env vars undefined | Prefix with `VITE_`, restart dev server |
| Proxy not working | Use relative paths (`/api/*`), check `vite.config.ts` |

## Deployment

```bash
npm run build  # Outputs to dist/
```

Set `VITE_API_URL` to your production API URL before building.

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

A complete multi-vendor e-commerce platform specifically designed for footwear retail with:
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
