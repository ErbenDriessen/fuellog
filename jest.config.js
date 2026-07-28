module.exports = {
  preset: 'jest-expo',
  // Don't scan linked git worktrees (e.g. .claude/worktrees/*) — they are full
  // repo copies whose test files would otherwise run a second time.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/.claude/'],
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
  // React Native render tests (jest-expo) can take >5s to mount on a cold run;
  // give them headroom so cold full runs don't fail on the default 5s timeout.
  testTimeout: 20000,
  moduleNameMapper: {
    // Icons pull in the native font/asset chain; stub them in unit tests.
    '^@expo/vector-icons$': '<rootDir>/jest/vectorIconsMock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|expo-router|expo-sqlite))',
  ],
};
