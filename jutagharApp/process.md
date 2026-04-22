# JutaGhar — Google Play Store Deployment Guide

> Last updated: 15 April 2026

## Prerequisites

- Google Play Developer account ($25 one-time fee) — [Sign up here](https://play.google.com/console/signup)
- Production `.aab` file from EAS Build
- App icon (512x512 PNG), feature graphic (1024x500 PNG), and at least 2 screenshots

---

## Step 1: Build the Production AAB

```bash
npx eas-cli build --platform android --profile production
```

Once the build finishes, download the `.aab` file from the EAS dashboard:
https://expo.dev/accounts/metabyte/projects/JutaGhar/builds

---

## Step 2: Create App in Google Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Click **"Create app"**
3. Fill in:
   - **App name**: JutaGhar
   - **Default language**: English (United States)
   - **App or game**: App
   - **Free or paid**: Free (or Paid)
4. Accept the declarations and click **"Create app"**

---

## Step 3: Complete the App Dashboard Checklist

Google Play Console shows a setup checklist. Complete each section:

### 3.1 — App access
- Select **"All or some functionality is restricted"** (app requires login)
- Provide demo credentials (create test accounts via the backend admin panel):
  - User: `demo@jutaghar.com` / `demo1234`
  - Seller: `seller@jutaghar.com` / `seller1234` (must have role `outlet`)

### 3.2 — Ads
- Select whether your app contains ads

### 3.3 — Content rating
- Fill out the IARC questionnaire
- Submit to get your content rating

### 3.4 — Target audience
- Select the target age group (e.g., 18+)

### 3.5 — News app
- Select "No"

### 3.6 — Data safety
- Declare data collected:
  - **Account info**: email, name, phone number (for registration)
  - **Purchase history**: order data (for checkout)
  - **App activity**: product browsing, search queries
- Data is sent to `dev.jutaghar.com` backend (encrypted in transit)

### 3.7 — Government apps
- Select "No"

---

## Step 4: Set Up Store Listing

Go to **Grow > Store listing > Main store listing**:

1. **Short description** (80 chars max):
   ```
   Shop shoes and footwear online — JutaGhar, your one-stop footwear store.
   ```

2. **Full description** (4000 chars max):
   ```
   JutaGhar is your go-to online footwear marketplace. Browse a wide selection
   of shoes, sneakers, boots, and sandals from multiple vendors. Find the
   perfect pair with variant selection (color, size), detailed product pages,
   and a smooth checkout experience.

   Features:
   • Browse products with hero banners, category filters, and search
   • Detailed product pages with image galleries and variant selection
   • Shopping cart with quantity controls and order summary
   • Separate seller dashboard for vendors to manage products and orders
   • Dual login — User and Seller flows with role-based access
   • Shared authentication with the JutaGhar web store
   • Clean, modern design optimized for all Android screen sizes
   ```

3. **Screenshots**: Upload at least 2 phone screenshots (16:9 or 9:16)
4. **App icon**: 512x512 PNG (high-res)
5. **Feature graphic**: 1024x500 PNG
6. **Category**: Shopping
7. **Contact details**: Add email (required), website, phone

---

## Step 5: Upload the AAB

1. Go to **Release > Production** (left sidebar)
2. Click **"Create new release"**
3. **App signing**: Accept Google Play App Signing (first time only)
4. **Upload**: Drag and drop (or browse) your `.aab` file
5. **Release name**: `1.0.0` (auto-filled from AAB)
6. **Release notes**: Paste the following:
   ```
   JutaGhar v1.0.0

   • Browse footwear with hero banners, categories, and search
   • Product detail pages with color/size variant selection
   • Shopping cart with quantity controls
   • Seller dashboard with real-time product and order stats
   • JWT authentication shared with the web store
   • Optimized for all Android devices
   ```
7. Click **"Review release"**

---

## Step 6: Review and Roll Out

1. Review any warnings or errors on the review page
2. Fix any issues (missing screenshots, incomplete sections, etc.)
3. Click **"Start rollout to Production"**
4. Confirm the rollout

---

## Step 7: Wait for Review

- Google reviews new apps, typically within **1–3 days** (can take up to 7 days for first submission)
- You'll get an email when the app is approved or if changes are needed
- Track status in **Release > Production > Releases** tab

---

## Optional: Testing Tracks (Before Production)

If you want to test with a small group before going live:

### Internal testing (up to 100 testers)
1. Go to **Release > Testing > Internal testing**
2. Create a release and upload the `.aab`
3. Add testers by email
4. Share the opt-in link with testers

### Closed testing (invited testers)
1. Go to **Release > Testing > Closed testing**
2. Same process, larger group allowed

### Open testing (anyone can join)
1. Go to **Release > Testing > Open testing**
2. App appears on Play Store with "Early Access" badge

---

## Useful Commands

```bash
# Start dev server
npx expo start

# Build production AAB
npx eas-cli build --platform android --profile production

# Build preview APK (for direct install / testing)
npx eas-cli build --platform android --profile preview

# Check build status
npx eas-cli build:list --platform android --limit 1

# Submit directly to Play Store via EAS
npx eas-cli submit --platform android

# Type-check
npx tsc --noEmit
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Version code already used" | EAS auto-increments; just rebuild |
| "Missing screenshots" | Upload at least 2 phone screenshots |
| "App rejected — login required" | Add demo credentials in App Access section (Step 3.1) |
| "Target API level too low" | Update Expo SDK and rebuild |
| "Deceptive behavior" | Ensure app description matches actual functionality |
| Build fails with dependency error | Run `npx expo install --fix` to align native module versions |
