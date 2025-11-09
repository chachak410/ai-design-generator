const { setup } = require('jest-environment-node');

// Global test setup
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

global.sessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock fetch
global.fetch = jest.fn();

module.exports = async () => {
    // Global setup logic here
    await setup();
};

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});