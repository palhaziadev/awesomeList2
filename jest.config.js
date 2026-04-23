module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/__tests__', '<rootDir>/__mocks__'],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|@rn-primitives/.*|lucide-react-native)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    'react-native-reanimated': '<rootDir>/__mocks__/react-native-reanimated.js',
    'react-native-svg': '<rootDir>/__mocks__/react-native-svg.js',
  },
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'services/**/*.{ts,tsx}',
    'context/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
};
