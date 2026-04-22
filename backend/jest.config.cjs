/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  moduleNameMapper: {
    '^otplib$': '<rootDir>/__mocks__/otplib.js',
    '^qrcode$': '<rootDir>/__mocks__/qrcode.js'
  },
  testMatch: ['**/__tests__/**/*.test.js'],
  clearMocks: true,
  // Runs before any module is imported — satisfies module-level env guards
  setupFiles: ['./jest.setup.env.cjs']
};
