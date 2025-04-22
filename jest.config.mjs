// ES Module version of Jest config
export default {
  preset: 'ts-jest/presets/js-with-ts-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.test.mts'],
  moduleNameMapper: {
    '@shared/(.*)': '<rootDir>/shared/$1',
    '@/(.*)': '<rootDir>/client/src/$1'
  },
  extensionsToTreatAsEsm: ['.ts', '.mts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },
};