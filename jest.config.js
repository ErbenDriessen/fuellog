module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    // Icons pull in the native font/asset chain; stub them in unit tests.
    '^@expo/vector-icons$': '<rootDir>/jest/vectorIconsMock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|expo-router|expo-sqlite))',
  ],
};
