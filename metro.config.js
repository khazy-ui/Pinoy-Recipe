// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Firebase JS SDK v10/v11 ships a "exports" field in package.json that
// Metro's newer resolver can misread, pointing "firebase/auth" at the
// non-React-Native build. That build never registers the RN Auth
// component, which is exactly why initializeAuth() throws:
//   [Error: Component auth has not been registered yet]
// Disabling package-exports resolution forces Metro back to the
// "main"/"react-native" fields in firebase's package.json, which are
// correct for Expo/React Native.
config.resolver.unstable_enablePackageExports = false;

// NativeWind v4 needs to wrap the Metro config so it can process
// `className` props (via global.css + tailwind.config.js) into real
// React Native styles. Without this, className is just an inert prop
// that React Native silently ignores.
module.exports = withNativeWind(config, { input: './global.css' });