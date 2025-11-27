// Global test setup for Jest with jsdom

// Mock localStorage if not available
if (typeof global.localStorage === 'undefined') {
  const localStorageMock = {
    store: {},
    getItem: jest.fn(function(key) {
      return this.store[key] || null;
    }),
    setItem: jest.fn(function(key, value) {
      this.store[key] = value;
    }),
    removeItem: jest.fn(function(key) {
      delete this.store[key];
    }),
    clear: jest.fn(function() {
      this.store = {};
    }),
  };
  global.localStorage = localStorageMock;
}

// Mock sessionStorage if not available
if (typeof global.sessionStorage === 'undefined') {
  const sessionStorageMock = {
    store: {},
    getItem: jest.fn(function(key) {
      return this.store[key] || null;
    }),
    setItem: jest.fn(function(key, value) {
      this.store[key] = value;
    }),
    removeItem: jest.fn(function(key) {
      delete this.store[key];
    }),
    clear: jest.fn(function() {
      this.store = {};
    }),
  };
  global.sessionStorage = sessionStorageMock;
}

// Mock fetch if not available
if (typeof global.fetch === 'undefined') {
  global.fetch = jest.fn();
}

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  if (global.localStorage && global.localStorage.store) {
    global.localStorage.store = {};
  }
  if (global.sessionStorage && global.sessionStorage.store) {
    global.sessionStorage.store = {};
  }
});