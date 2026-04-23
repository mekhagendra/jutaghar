# JutaGhar

A mobile app for property/shoe marketplace built with Expo and React Native. Supports role-based login with dedicated dashboards for users and sellers.

## Getting Started

```bash
npm install
npx expo start
```

Native run commands:

```bash
npm run android
npm run ios
```

Scan the QR code with Expo Go (Android) or Camera (iOS), or press `w` for web.

## Backend API Configuration

Set the backend base URL in `.env`:

```bash
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000
```

Use the correct host for your runtime:

- Android Emulator (Android Studio): `http://10.0.2.2:8000`
- iOS Simulator: `http://localhost:8000`
- Physical device: `http://<your-computer-lan-ip>:8000`

After changing `.env`, restart Expo (`npx expo start -c`) so the new env value is picked up.

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
android/                 # Android native project (Gradle, Manifest, resources)
ios/                     # iOS native project (Xcode project, Podfile, plist)
app/                     # Expo Router route screens
assets/                  # Fonts and images
src/
├── api/                 # API client and base URL configuration
│   └── index.ts
├── features/
│   ├── auth/            # Authentication state and feature logic
│   │   └── authStore.ts
│   ├── catalog/         # Product discovery and wishlist domain
│   │   ├── components/
│   │   └── wishlistStore.ts
│   ├── checkout/        # Cart and checkout state logic
│   │   └── cartStore.ts
│   └── profile/         # Profile feature module (incremental migration)
└── shared/              # Cross-feature modules and reusable primitives
    ├── types.ts
    ├── theme.ts
    └── components/
        ├── Header.tsx
        ├── Footer.tsx
        └── Navbar.tsx

    Notes:
    - `app/` stays at root because Expo Router requires route files there.
    - Screen implementations are organized under `src/screens/` for cleaner scaling.
```

Import convention:
- Use `@/features/...` for feature-owned state, logic, and UI
- Use `@/shared/...` for cross-feature API, types, theme, and common components

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

# Production IPA (App Store)
npx eas-cli build --platform ios --profile production
```

EAS project ID: `ca87cb65-b94d-4ba8-b548-58c58343ed2f`
Android package: `com.metabyte.jutaghar`

## Customization

Replace demo auth in `src/screens/auth/LoginScreen.tsx` with real API calls. Styles are in `StyleSheet` objects at the bottom of each component file.
