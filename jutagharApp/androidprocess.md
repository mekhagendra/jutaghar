# JutaGhar — Mobile Store Deployment Guide (Android + iOS)

> Last updated: 22 April 2026

## Prerequisites

- Google Play Developer account ($25 one-time fee) — [Sign up here](https://play.google.com/console/signup)
- Apple Developer Program membership ($99/year) — [Enroll here](https://developer.apple.com/programs/)
- Production Android `.aab` and iOS `.ipa` from EAS Build
- App icon (1024x1024 PNG) and platform screenshots

Configured app IDs:
- Android package: `com.metabyte.jutaghar`
- iOS bundle identifier: `com.metabyte.jutaghar`

## Mobile Transport Security Notes

- `android.usesCleartextTraffic` is explicitly set to `false` in `app.json`.
- Expo defaults are restrictive on modern SDKs, but this project keeps the setting explicit for auditability.
- Android production domains are pinned via a Network Security Config plugin (`plugins/withAndroidNetworkSecurityConfig.js`) using SPKI SHA-256 pins.
- iOS ATS is explicitly configured with a pinned domain for `jutaghar.com`.

---

## Step 1: Build Production Binaries

```bash
# Android AAB
npx eas-cli build --platform android --profile production

# iOS IPA
npx eas-cli build --platform ios --profile production
```

Artifacts are available in the EAS dashboard:
https://expo.dev/accounts/metabyte/projects/JutaGhar/builds

---

## Android Release (Google Play)

### A1: Create App in Play Console
1. Go to [Google Play Console](https://play.google.com/console)
2. Click **Create app**
3. Set app metadata (name, language, app type, pricing)

### A2: Complete Required Declarations
1. App access: provide demo login credentials
2. Ads declaration
3. Content rating questionnaire
4. Target audience
5. Data safety form

### A3: Store Listing
1. Add short and full description
2. Upload screenshots, icon, and feature graphic
3. Set category to Shopping and add contact details

### A4: Upload and Rollout
1. Release > Production > Create new release
2. Upload `.aab`
3. Add release notes and review
4. Start rollout to production

---

## iOS Release (App Store Connect)

### I1: Create App in App Store Connect
1. Open [App Store Connect](https://appstoreconnect.apple.com)
2. Go to **My Apps > + > New App**
3. Fill in:
   - Name: JutaGhar
   - Primary language: English (U.S.)
   - Bundle ID: `com.metabyte.jutaghar`
   - SKU: `JUTAGHAR_IOS_1`

### I2: Submit iOS Build
```bash
# Build iOS IPA
npx eas-cli build --platform ios --profile production

# Submit latest iOS build to App Store Connect
npx eas-cli submit --platform ios
```

### I3: Complete Store Metadata
1. Description, keywords, support URL
2. App Privacy declarations
3. Required iPhone screenshots
4. Review contact info and demo credentials for login flows

### I4: Submit for Apple Review
1. Create app version (e.g. `1.0.0`)
2. Attach uploaded build
3. Complete export compliance and content rights forms
4. Submit for review

---

## Useful Commands

```bash
# Start dev server
npx expo start

# Run directly on iOS simulator (macOS)
npx expo start --ios

# Build production Android
npx eas-cli build --platform android --profile production

# Build production iOS
npx eas-cli build --platform ios --profile production

# Submit to Google Play
npx eas-cli submit --platform android

# Submit to App Store Connect
npx eas-cli submit --platform ios

# Check recent builds
npx eas-cli build:list --limit 5

# Type-check
npx tsc --noEmit
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| iOS build fails due to signing | Verify Apple team access and certificates in EAS |
| Bundle identifier already in use | Use a unique iOS bundle identifier |
| Android version code already used | Rebuild with auto increment enabled |
| Build fails with dependency mismatch | Run `npx expo install --fix` and rebuild |
| `pod --version` crashes with Ruby/ActiveSupport `Logger` NameError | Reinstall CocoaPods with a modern Ruby toolchain (`brew install ruby cocoapods`, then ensure new Ruby in PATH and run `pod --version`) |
