// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// NativeWind v4 needs to wrap the Metro config so it can process
// `className` props (via global.css + tailwind.config.js) into real
// React Native styles. Without this, className is just an inert prop
// that React Native silently ignores.
module.exports = withNativeWind(config, { input: './global.css' });