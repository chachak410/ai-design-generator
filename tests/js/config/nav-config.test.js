/**
 * Tests for NAV_CONFIG centralized navigation configuration
 */
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

describe('NAV_CONFIG', () => {
  let NAV_CONFIG;
  let NavConfig;

  beforeEach(() => {
    // Mock window object
    global.window = {
      NAV_CONFIG: null,
      NavConfig: null,
      UI: null,
      showPage: jest.fn(),
      handleLogout: jest.fn(),
      SupportResponse: { init: jest.fn() },
      TemplateCreation: { init: jest.fn() }
    };

    // Load the nav-config module by executing the IIFE
    // Using Function constructor as a safer alternative to eval for module loading in tests
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, '../../../js/config/nav-config.js');
    const configCode = fs.readFileSync(configPath, 'utf8');
    new Function(configCode)();

    NAV_CONFIG = global.window.NAV_CONFIG;
    NavConfig = global.window.NavConfig;
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete global.window;
  });

  describe('NAV_CONFIG structure', () => {
    test('should have master role configuration', () => {
      expect(NAV_CONFIG).toHaveProperty('master');
      expect(Array.isArray(NAV_CONFIG.master)).toBe(true);
    });

    test('should have client role configuration', () => {
      expect(NAV_CONFIG).toHaveProperty('client');
      expect(Array.isArray(NAV_CONFIG.client)).toBe(true);
    });

    test('should have admin role configuration', () => {
      expect(NAV_CONFIG).toHaveProperty('admin');
      expect(Array.isArray(NAV_CONFIG.admin)).toBe(true);
    });

    test('should have default role configuration', () => {
      expect(NAV_CONFIG).toHaveProperty('default');
      expect(Array.isArray(NAV_CONFIG.default)).toBe(true);
    });
  });

  describe('Master role navigation items', () => {
    test('should have Template Creation nav item', () => {
      const templateItem = NAV_CONFIG.master.find(item => item.id === 'master-template-link');
      expect(templateItem).toBeDefined();
      expect(templateItem.label).toBe('templateCreation');
      expect(templateItem.page).toBe('template-creation-page');
    });

    test('should have Client Management nav item', () => {
      const clientMgmtItem = NAV_CONFIG.master.find(item => item.id === 'master-nav-link');
      expect(clientMgmtItem).toBeDefined();
      expect(clientMgmtItem.label).toBe('clientManagement');
      expect(clientMgmtItem.page).toBe('client-management-section');
    });

    test('should have Support Response nav item', () => {
      const supportItem = NAV_CONFIG.master.find(item => item.id === 'master-support-link');
      expect(supportItem).toBeDefined();
      expect(supportItem.label).toBe('supportResponses');
      expect(supportItem.page).toBe('support-response-page');
    });

    test('should have Logout nav item', () => {
      const logoutItem = NAV_CONFIG.master.find(item => item.id === 'logout-btn');
      expect(logoutItem).toBeDefined();
      expect(logoutItem.label).toBe('logout');
      expect(logoutItem.isLogout).toBe(true);
    });

    test('should have exactly 4 items for master role', () => {
      expect(NAV_CONFIG.master.length).toBe(4);
    });
  });

  describe('Client role navigation items', () => {
    test('should have Templates nav item', () => {
      const templatesItem = NAV_CONFIG.client.find(item => item.id === 'client-templates-link');
      expect(templatesItem).toBeDefined();
      expect(templatesItem.label).toBe('templates');
      expect(templatesItem.page).toBe('template-page');
    });

    test('should have Account nav item', () => {
      const accountItem = NAV_CONFIG.client.find(item => item.id === 'client-account-link');
      expect(accountItem).toBeDefined();
      expect(accountItem.label).toBe('account');
      expect(accountItem.page).toBe('account-page');
    });

    test('should have Past Records nav item', () => {
      const recordsItem = NAV_CONFIG.client.find(item => item.id === 'client-records-link');
      expect(recordsItem).toBeDefined();
      expect(recordsItem.label).toBe('pastRecords');
      expect(recordsItem.page).toBe('records-page');
    });

    test('should have Logout nav item', () => {
      const logoutItem = NAV_CONFIG.client.find(item => item.id === 'logout-btn');
      expect(logoutItem).toBeDefined();
      expect(logoutItem.label).toBe('logout');
      expect(logoutItem.isLogout).toBe(true);
    });

    test('should have exactly 4 items for client role', () => {
      expect(NAV_CONFIG.client.length).toBe(4);
    });
  });

  describe('Admin role navigation items', () => {
    test('should have both client and admin nav items', () => {
      // Admin should have client links
      const templatesItem = NAV_CONFIG.admin.find(item => item.id === 'client-templates-link');
      expect(templatesItem).toBeDefined();
      
      // Admin should also have admin links
      const clientMgmtItem = NAV_CONFIG.admin.find(item => item.id === 'master-nav-link');
      expect(clientMgmtItem).toBeDefined();
    });

    test('should have Logout nav item', () => {
      const logoutItem = NAV_CONFIG.admin.find(item => item.id === 'logout-btn');
      expect(logoutItem).toBeDefined();
      expect(logoutItem.label).toBe('logout');
    });

    test('should have more items than master or client alone', () => {
      // Admin has both client (3) + admin (3) + logout (1) = 7 items
      expect(NAV_CONFIG.admin.length).toBe(7);
    });
  });

  describe('NavConfig.getNavItemsForRole', () => {
    test('should return master items for master role', () => {
      const items = NavConfig.getNavItemsForRole('master');
      expect(items).toEqual(NAV_CONFIG.master);
    });

    test('should return client items for client role', () => {
      const items = NavConfig.getNavItemsForRole('client');
      expect(items).toEqual(NAV_CONFIG.client);
    });

    test('should return admin items for admin role', () => {
      const items = NavConfig.getNavItemsForRole('admin');
      expect(items).toEqual(NAV_CONFIG.admin);
    });

    test('should return default items for unknown role', () => {
      const items = NavConfig.getNavItemsForRole('unknown');
      expect(items).toEqual(NAV_CONFIG.default);
    });

    test('should return default items for null role', () => {
      const items = NavConfig.getNavItemsForRole(null);
      expect(items).toEqual(NAV_CONFIG.default);
    });

    test('should be case insensitive', () => {
      const items = NavConfig.getNavItemsForRole('MASTER');
      expect(items).toEqual(NAV_CONFIG.master);
    });
  });

  describe('NavConfig.getDefaultPageForRole', () => {
    test('should return template-creation-page for master role', () => {
      const page = NavConfig.getDefaultPageForRole('master');
      expect(page).toBe('template-creation-page');
    });

    test('should return template-page for client role', () => {
      const page = NavConfig.getDefaultPageForRole('client');
      expect(page).toBe('template-page');
    });

    test('should return template-page for admin role', () => {
      const page = NavConfig.getDefaultPageForRole('admin');
      expect(page).toBe('template-page');
    });

    test('should return template-page for unknown role', () => {
      const page = NavConfig.getDefaultPageForRole('unknown');
      expect(page).toBe('template-page');
    });

    test('should return template-page for null role', () => {
      const page = NavConfig.getDefaultPageForRole(null);
      expect(page).toBe('template-page');
    });
  });

  describe('NavConfig.canAccessPage', () => {
    test('master should be able to access template-creation-page', () => {
      expect(NavConfig.canAccessPage('master', 'template-creation-page')).toBe(true);
    });

    test('master should be able to access client-management-section', () => {
      expect(NavConfig.canAccessPage('master', 'client-management-section')).toBe(true);
    });

    test('master should be able to access support-response-page', () => {
      expect(NavConfig.canAccessPage('master', 'support-response-page')).toBe(true);
    });

    test('client should be able to access template-page', () => {
      expect(NavConfig.canAccessPage('client', 'template-page')).toBe(true);
    });

    test('client should be able to access account-page', () => {
      expect(NavConfig.canAccessPage('client', 'account-page')).toBe(true);
    });

    test('client should be able to access records-page', () => {
      expect(NavConfig.canAccessPage('client', 'records-page')).toBe(true);
    });

    test('client should NOT be able to access template-creation-page', () => {
      expect(NavConfig.canAccessPage('client', 'template-creation-page')).toBe(false);
    });

    test('client should NOT be able to access client-management-section', () => {
      expect(NavConfig.canAccessPage('client', 'client-management-section')).toBe(false);
    });

    test('all users should be able to access payment-page (universal page)', () => {
      expect(NavConfig.canAccessPage('client', 'payment-page')).toBe(true);
      expect(NavConfig.canAccessPage('master', 'payment-page')).toBe(true);
    });

    test('should return false for null role', () => {
      expect(NavConfig.canAccessPage(null, 'template-page')).toBe(false);
    });
  });

  describe('Logout item consistency', () => {
    test('all roles should have logout as the last item', () => {
      const roles = ['master', 'client', 'admin', 'default'];
      
      roles.forEach(role => {
        const items = NAV_CONFIG[role];
        const lastItem = items[items.length - 1];
        expect(lastItem.id).toBe('logout-btn');
        expect(lastItem.isLogout).toBe(true);
      });
    });
  });
});

describe('Role-based redirect', () => {
  let NavConfig;

  beforeEach(() => {
    // Load the nav-config module
    global.window = {
      NAV_CONFIG: null,
      NavConfig: null,
      UI: null,
      showPage: jest.fn(),
      handleLogout: jest.fn(),
      SupportResponse: { init: jest.fn() },
      TemplateCreation: { init: jest.fn() }
    };

    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, '../../../js/config/nav-config.js');
    const configCode = fs.readFileSync(configPath, 'utf8');
    // Using Function constructor as a safer alternative to eval for module loading in tests
    new Function(configCode)();
    NavConfig = global.window.NavConfig;
  });

  afterEach(() => {
    delete global.window;
  });

  test('master users should be redirected to template-creation-page', () => {
    expect(NavConfig.getDefaultPageForRole('master')).toBe('template-creation-page');
  });

  test('client users should be redirected to template-page', () => {
    expect(NavConfig.getDefaultPageForRole('client')).toBe('template-page');
  });

  test('unauthenticated users should fallback to template-page', () => {
    expect(NavConfig.getDefaultPageForRole(null)).toBe('template-page');
    expect(NavConfig.getDefaultPageForRole(undefined)).toBe('template-page');
  });
});
