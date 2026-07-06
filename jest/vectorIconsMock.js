// Jest mock for @expo/vector-icons.
//
// The real package pulls in the native font/asset loader chain (expo-font ->
// expo-asset -> ...), which isn't available in the jsdom/node test environment
// and isn't relevant to what our component tests assert. Any icon set accessed
// off this module (Ionicons, MaterialIcons, ...) resolves to a no-op component
// so screens that render icons can still be unit-tested.
const React = require('react');

module.exports = new Proxy(
  {},
  {
    get: (_target, prop) => {
      if (prop === '__esModule') return true;
      const Icon = () => null;
      Icon.displayName = `MockIcon(${String(prop)})`;
      return Icon;
    },
  },
);
