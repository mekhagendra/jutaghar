const domain = process.env.EXPO_PUBLIC_DOMAIN || 'dev.jutaghar.com';
const spkiPin = process.env.SPKI_PIN || '';

// Derive the Google Sign-In iOS URL scheme from the full client ID.
// e.g. "624...mu.apps.googleusercontent.com" → "com.googleusercontent.apps.624...mu"
const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
const googleIosUrlScheme = googleClientId
  ? `com.googleusercontent.apps.${googleClientId.replace('.apps.googleusercontent.com', '')}`
  : 'com.googleusercontent.apps.PLACEHOLDER';

/** @type {import('@expo/config').ExpoConfig} */
module.exports = {
  expo: {
    name: 'JutaGhar',
    slug: 'JutaGhar',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'jutaghar',
    userInterfaceStyle: 'automatic',

    ios: {
      bundleIdentifier: 'com.metabyte.jutaghar',
      buildNumber: '1',
      supportsTablet: true,
      infoPlist: {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: false,
          NSPinnedDomains: {
            [domain]: {
              NSIncludesSubdomains: true,
              NSPinnedCAIdentities: [{ 'SPKI-SHA256-BASE64': spkiPin }],
            },
          },
        },
      },
    },

    android: {
      package: 'com.metabyte.jutaghar',
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      permissions: [],
    },

    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/logo.png',
    },

    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
        },
      ],
      [
        '@react-native-google-signin/google-signin',
        {
          scopes: ['profile', 'email'],
          iosUrlScheme: googleIosUrlScheme,
        },
      ],
      [
        './plugins/withAndroidNetworkSecurityConfig',
        {
          domains: [domain],
          spkiPins: [spkiPin],
        },
      ],
    ],

    experiments: {
      typedRoutes: true,
    },

    extra: {
      router: {},
      sslPinning: {
        certs: ['jutaghar_prod'],
      },
      playIntegrity: {
        cloudProjectNumber: '',
      },
      deviceAttestation: {
        backendVerificationEnabled: false,
      },
      eas: {
        projectId: 'ca87cb65-b94d-4ba8-b548-58c58343ed2f',
      },
    },
  },
};
