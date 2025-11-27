module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    'js/**/*.js',
    '!js/lib/**',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  verbose: true
};