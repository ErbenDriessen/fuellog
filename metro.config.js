// Metro configuration for FuelLog.
//
// expo-router builds the app's routes from a `require.context` over the whole
// `app/` directory. That context would otherwise pull our colocated *.test.tsx
// files into the runtime bundle — and they import @testing-library/react-native,
// which requires Node-only modules ("console"/"util") that don't exist in the
// on-device JS runtime, crashing the bundle. Excluding test/spec files from
// Metro keeps them out of the app bundle. Jest is unaffected (it uses
// jest.config.js, not Metro), so the tests still run.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const testFiles = /.*\.(test|spec)\.[jt]sx?$/;
const existing = config.resolver.blockList;
config.resolver.blockList = existing
  ? Array.isArray(existing)
    ? [...existing, testFiles]
    : [existing, testFiles]
  : [testFiles];

module.exports = config;
