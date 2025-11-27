const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

describe('AuthUtils Module', () => {
  let originalWindow;
  let originalFetch;

  beforeEach(() => {
    // Store original window properties (handle undefined gracefully)
    originalWindow = {
      AppState: global.window ? global.window.AppState : undefined,
      __USER__: global.window ? global.window.__USER__ : undefined
    };
    originalFetch = global.fetch;

    // Ensure global.window exists
    if (!global.window) {
      global.window = {};
    }

    // Reset window properties
    global.window.AppState = { userRole: null };
    global.window.__USER__ = null;
  });

  afterEach(() => {
    // Restore original window properties
    if (global.window) {
      global.window.AppState = originalWindow.AppState;
      global.window.__USER__ = originalWindow.__USER__;
    }
    global.fetch = originalFetch;
  });

  // Load module after setup
  const loadModule = () => {
    jest.resetModules();
    require('../../../js/utils/authUtils.js');
  };

  describe('getUserRole', () => {
    test('should return role from window.__USER__', async () => {
      global.window.__USER__ = { role: 'master' };
      loadModule();
      
      const role = await global.window.getUserRole();
      expect(role).toBe('master');
    });

    test('should return role from AppState', async () => {
      global.window.AppState = { userRole: 'client' };
      loadModule();
      
      const role = await global.window.getUserRole();
      expect(role).toBe('client');
    });

    test('should prefer __USER__ over AppState', async () => {
      global.window.__USER__ = { role: 'master' };
      global.window.AppState = { userRole: 'client' };
      loadModule();
      
      const role = await global.window.getUserRole();
      expect(role).toBe('master');
    });

    test('should fetch from /api/me when no local data', async () => {
      global.window.__USER__ = null;
      global.window.AppState = { userRole: null };
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ role: 'admin' })
      });
      
      loadModule();
      
      const role = await global.window.getUserRole();
      expect(role).toBe('admin');
      expect(global.fetch).toHaveBeenCalledWith('/api/me', expect.any(Object));
    });

    test('should return null when /api/me returns 401', async () => {
      global.window.__USER__ = null;
      global.window.AppState = { userRole: null };
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401
      });
      
      loadModule();
      
      const role = await global.window.getUserRole();
      expect(role).toBe(null);
    });

    test('should return null on network error', async () => {
      global.window.__USER__ = null;
      global.window.AppState = { userRole: null };
      
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      loadModule();
      
      const role = await global.window.getUserRole();
      expect(role).toBe(null);
    });
  });

  describe('clearCachedRole', () => {
    test('should clear cached role', async () => {
      global.window.__USER__ = null;
      global.window.AppState = { userRole: null };
      
      // First fetch returns 'master'
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ role: 'master' })
      });
      
      loadModule();
      
      // Get role (should fetch)
      let role = await global.window.getUserRole();
      expect(role).toBe('master');
      
      // Clear cache
      global.window.AuthUtils.clearCachedRole();
      
      // Change mock to return 'client'
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ role: 'client' })
      });
      
      // Get role again (should fetch again)
      role = await global.window.getUserRole();
      expect(role).toBe('client');
    });
  });

  describe('isAuthenticated', () => {
    test('should return true when user has role', async () => {
      global.window.__USER__ = { role: 'client' };
      loadModule();
      
      const isAuth = await global.window.AuthUtils.isAuthenticated();
      expect(isAuth).toBe(true);
    });

    test('should return false when no role', async () => {
      global.window.__USER__ = null;
      global.window.AppState = { userRole: null };
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401
      });
      
      loadModule();
      
      const isAuth = await global.window.AuthUtils.isAuthenticated();
      expect(isAuth).toBe(false);
    });
  });

  describe('isMasterUser', () => {
    test('should return true for master role', async () => {
      global.window.__USER__ = { role: 'master' };
      loadModule();
      
      const isMaster = await global.window.AuthUtils.isMasterUser();
      expect(isMaster).toBe(true);
    });

    test('should return false for client role', async () => {
      global.window.__USER__ = { role: 'client' };
      loadModule();
      
      const isMaster = await global.window.AuthUtils.isMasterUser();
      expect(isMaster).toBe(false);
    });

    test('should return false for admin role', async () => {
      global.window.__USER__ = { role: 'admin' };
      loadModule();
      
      const isMaster = await global.window.AuthUtils.isMasterUser();
      expect(isMaster).toBe(false);
    });
  });

  describe('hasAdminPrivileges', () => {
    test('should return true for master role', async () => {
      global.window.__USER__ = { role: 'master' };
      loadModule();
      
      const hasPrivileges = await global.window.AuthUtils.hasAdminPrivileges();
      expect(hasPrivileges).toBe(true);
    });

    test('should return true for admin role', async () => {
      global.window.__USER__ = { role: 'admin' };
      loadModule();
      
      const hasPrivileges = await global.window.AuthUtils.hasAdminPrivileges();
      expect(hasPrivileges).toBe(true);
    });

    test('should return false for client role', async () => {
      global.window.__USER__ = { role: 'client' };
      loadModule();
      
      const hasPrivileges = await global.window.AuthUtils.hasAdminPrivileges();
      expect(hasPrivileges).toBe(false);
    });
  });

  describe('isClientUser', () => {
    test('should return true for client role', async () => {
      global.window.__USER__ = { role: 'client' };
      loadModule();
      
      const isClient = await global.window.AuthUtils.isClientUser();
      expect(isClient).toBe(true);
    });

    test('should return false for master role', async () => {
      global.window.__USER__ = { role: 'master' };
      loadModule();
      
      const isClient = await global.window.AuthUtils.isClientUser();
      expect(isClient).toBe(false);
    });
  });
});
