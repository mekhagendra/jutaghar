// Google OAuth client IDs.
// - EXPO_PUBLIC_GOOGLE_CLIENT_ID: Web client ID (used by backend to verify the idToken).
// - EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: iOS client ID (required by Google Sign-In SDK on iOS).
//   Create one in Google Cloud Console → Credentials → "iOS" type for bundle id
//   `com.metabyte.jutaghar`. Its reversed client ID is the URL scheme used below.
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
const googleIosUrlScheme = googleIosClientId
  ? `com.googleusercontent.apps.${googleIosClientId.replace('.apps.googleusercontent.com', '')}`
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
      usesAppleSignIn: true,
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
      'expo-apple-authentication',
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
    ],

    experiments: {
      typedRoutes: true,
    },

    extra: {
      router: {},
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
