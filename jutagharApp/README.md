# JutaGhar

A mobile app for property/shoe marketplace built with Expo and React Native. Supports role-based login with dedicated dashboards for users and sellers.

## Getting Started

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go (Android) or Camera (iOS), or press `w` for web.

## Demo Credentials

| Role   | Fields                                                  |
|--------|---------------------------------------------------------|
| User   | Username: `admin`, Password: `password`                 |
| Seller | Business: `seller`, Email: `seller@jutaghar.com`, Password: `seller123` |

## Navigation Flow

```
App Start → Login Screen
               ├── User role  → User Home
               └── Seller role → Seller Home
```

- Role is auto-detected after login
- Logged-in users can navigate to login and back without losing session
- Logout with confirmation dialog

## Project Structure

```
app/
├── _layout.tsx          # Root layout with LogoHeader
├── index.tsx            # Main routing and state management
├── login.tsx            # Unified login screen (auto-detects user/seller role)
├── home.tsx             # User home dashboard
├── seller-home.tsx      # Seller home dashboard
└── user-registration.tsx

components/
└── LogoHeader.tsx       # Reusable branded header

assets/images/
├── icon.png             # App icon (used in header)
├── adaptive-icon.png    # Android adaptive icon
├── splash-icon.png      # Splash screen icon
└── favicon.png          # Web favicon
```

## Design System

- **User theme:** Blue (`#3498db`)
- **Seller theme:** Orange (`#e67e22`)
- **Back to Homepage:** Green (`#27ae60`)
- Logo header is shown on home screens, hidden on login screens

## Building for Production

```bash
# Preview APK (internal testing)
npx eas-cli build --platform android --profile preview

# Production AAB (Google Play Store)
npx eas-cli build --platform android --profile production
```

EAS project ID: `ca87cb65-b94d-4ba8-b548-58c58343ed2f`
Android package: `com.metabyte.jutaghar`

## Customization

Replace demo auth in `app/login.tsx` with real API calls. Styles are in `StyleSheet` objects at the bottom of each component file.
