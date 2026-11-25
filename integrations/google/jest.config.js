/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        // Transpile only. Type-checking every suite against the full
        // googleapis typings ran Jest workers out of heap; `tsc --noEmit`
        // (tsconfig.json covers src/**, tests included) is the type check.
        tsconfig: './tsconfig.jest.json',
      },
    ],
  },
  testTimeout: 30000,
}
