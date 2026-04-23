# iOS App Store Deployment Guide (Expo + EAS)

This guide covers end-to-end deployment of the JutaGhar iOS app to the Apple App Store using EAS Build and EAS Submit.

Project-specific values already configured:
- App name: `JutaGhar`
- Bundle ID: `com.metabyte.jutaghar`
- EAS project ID: `ca87cb65-b94d-4ba8-b548-58c58343ed2f`
- Production profile: `production` in `eas.json`

---

## 1) Prerequisites

You need all of the following before first release:

1. Apple Developer Program membership (paid, active).
2. App Store Connect access with permissions to create apps and submit builds.
3. Expo account with access to this EAS project.
4. Local tools:
	 - Node.js LTS
	 - npm
	 - EAS CLI (`npm i -g eas-cli` or use `npx eas`)

Recommended checks:

```bash
node -v
npm -v
npx eas --version
```

---

## 2) One-Time App Store Connect Setup

### 2.1 Create app record in App Store Connect

1. Open App Store Connect -> Apps -> + -> New App.
2. Platform: iOS.
3. Name: `JutaGhar` (or your preferred display name).
4. Bundle ID: `com.metabyte.jutaghar` (must exactly match `app.json`).
5. SKU: any unique internal identifier (for example `jutaghar-ios-001`).

### 2.2 Fill mandatory app metadata (before release)

In App Store Connect, prepare:
- App description
- Keywords
- Support URL
- Marketing URL (optional but recommended)
- Privacy Policy URL (required)
- App category
- Age rating questionnaire
- App Privacy (data collection form)

### 2.3 Legal/compliance items

Complete agreements and tax/banking sections in App Store Connect. Apple can block release if these are incomplete.

---

## 3) Project Release Readiness Checklist

Before building production:

1. Confirm iOS bundle identifier in `app.json`:

```json
"ios": {
	"bundleIdentifier": "com.metabyte.jutaghar"
}
```

2. Confirm release profile in `eas.json`:

```json
"build": {
	"production": {
		"autoIncrement": true
	}
}
```

3. Run quality checks:

```bash
npm ci
npm run check:release
npx expo-doctor
```

4. Verify production credentials and config:
- Real production API endpoints.
- Valid certificate pin values in `NSPinnedDomains` and plugin config.
- Real Google iOS URL scheme (replace placeholder if still present).
- Correct app icon and splash assets.

---

## 4) Apple Credentials and EAS Setup

Run login once if needed:

```bash
npx eas login
```

Then, from `jutagharApp` directory:

```bash
npx eas build:configure
```

EAS will help create/manage:
- iOS Distribution Certificate
- App Store provisioning profile

You can inspect or rotate credentials anytime:

```bash
npx eas credentials
```

---

## 5) Build Production iOS Binary

From `jutagharApp`:

```bash
npx eas build -p ios --profile production
```

Notes:
- This creates an App Store-signed `.ipa` in Expo cloud.
- `autoIncrement: true` increases iOS build number automatically per production build.
- Track build status in terminal output or Expo dashboard.

Optional local command already used in this repo:

```bash
eas build -p ios
```

For production consistency, prefer explicit profile:

```bash
eas build -p ios --profile production
```

---

## 6) Submit Build to App Store Connect

### Option A: Direct submit with EAS (recommended)

```bash
npx eas submit -p ios --profile production
```

If you just finished a build, you can submit that build directly when prompted.

### Option B: Submit a specific build ID

```bash
npx eas submit -p ios --latest
```

or choose from dashboard and use prompted details.

---

## 7) TestFlight Validation

After submit:

1. Wait for Apple processing in App Store Connect (can take 10-60+ minutes).
2. Open TestFlight tab.
3. Add internal testers first.
4. Perform smoke tests:
	 - Login and MFA flow
	 - Account tab behavior
	 - Checkout and orders
	 - Seller/Customer role flows
	 - Network and SSL pinning behavior

For external testing, complete Beta App Review questionnaire and submit for beta review.

---

## 8) App Store Release

When TestFlight quality is approved:

1. Go to App Store Connect -> App -> App Store tab.
2. Create a new app version (for example `1.0.1`).
3. Attach the processed build.
4. Fill version-specific metadata:
	 - What's New text
	 - Screenshots for required iPhone sizes
	 - Promotional text (optional)
5. Complete compliance/export questions.
6. Submit for Review.

Release strategy options:
- Manual release after approval.
- Automatic release after approval.
- Scheduled release date.

---

## 9) Versioning Rules (Important)

Apple requires:
- `version` (marketing version) can stay same across TestFlight builds, but must increase for each App Store release.
- `ios.buildNumber` must increase for every uploaded build of the same version.

In this project:
- `version` is in `app.json` (`expo.version`).
- Build number auto-increments with production profile via EAS remote version source.

Before each store release:
1. Increase `expo.version` in `app.json`.
2. Run a new production build.
3. Submit and release.

---

## 10) Common Failure Points and Fixes

### ITMS-90725: SDK version issue (iOS 26 SDK requirement)
- Apple now requires uploads to be built with iOS 26 SDK (Xcode 26+) starting April 28, 2026.
- Your current warning means the uploaded binary was built with an older SDK image.

Fix path for next upload:
1. Update local tooling first:

```bash
npm i -g eas-cli
npx eas --version
```

2. Upgrade the app to a current Expo SDK that supports Xcode 26 build images.

```bash
npx expo upgrade
```

3. Reinstall dependencies and validate:

```bash
rm -rf node_modules package-lock.json
npm install
npx expo-doctor
```

4. Bump app version for new store submission:
- Increase `expo.version` in `app.json` (for example from `1.0.0` to `1.0.1`).
- Keep using `autoIncrement: true` so iOS build number increases automatically.

5. Build and submit again:

```bash
npx eas build -p ios --profile production
npx eas submit -p ios --profile production
```

Notes:
- If EAS prompts for an outdated iOS image, select the newest available managed image in EAS that includes Xcode 26+.
- This warning does not block existing successful processing, but future uploads can be blocked after Apple enforcement date.

### Build rejected due to signing/certificates
- Run `npx eas credentials` and regenerate iOS distribution cert/profile.

### App Store Connect says bundle ID mismatch
- Ensure `app.json` bundle identifier exactly matches App Store Connect app record.

### Build stuck in processing too long
- Wait, then retry submit with a fresh build if needed.

### Missing compliance information
- Complete App Privacy, Export Compliance, and age rating fields.

### Missing icons/screenshots
- Add required screenshot dimensions and complete App Store metadata.

---

## 11) Recommended Release Command Sequence

From `jutagharApp`:

```bash
npm ci
npm run check:release
npx expo-doctor
npx eas build -p ios --profile production
npx eas submit -p ios --profile production
```

Then finish release in App Store Connect.

---

## 12) Release Day Checklist

Use this quick checklist each time:

1. Code frozen and tested.
2. `expo.version` bumped (for App Store release).
3. Production config verified (API, keys, pinning).
4. Build created with `production` profile.
5. Build submitted and processed.
6. TestFlight smoke test passed.
7. Metadata/screenshots/privacy updated.
8. Submitted to review.
9. Post-release monitoring plan ready.

---

## 13) Optional CI/CD Automation (Later)

After manual process is stable, automate with:
- GitHub Actions + `eas build --non-interactive`
- `eas submit --non-interactive`
- Environment-separated EAS secrets

Keep first releases manual until the workflow is fully validated.

