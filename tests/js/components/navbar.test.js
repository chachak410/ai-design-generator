const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

describe('Navbar Component', () => {
  let originalWindow;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <div class="nav-links">
        <a href="#" id="client-templates-link">Templates</a>
        <a href="#" id="client-account-link">Account</a>
        <a href="#" id="client-records-link">Past Records</a>
        <a href="#" id="create-account-link" style="display: none;">Create Account</a>
        <a href="#" id="master-nav-link" style="display: none;">Client Management</a>
        <a href="#" id="master-template-link" style="display: none;">Template Creation</a>
        <a href="#" id="master-support-link" style="display: none;">Support Responses</a>
        <a href="#" id="logout-btn">Logout</a>
      </div>
    `;

    // Store original window properties
    originalWindow = {
      AppState: global.window.AppState,
      __USER__: global.window.__USER__,
      getUserRole: global.window.getUserRole,
      getNavItemsForRole: global.window.getNavItemsForRole
    };

    // Reset window properties
    global.window.AppState = { userRole: null };
    global.window.__USER__ = null;
    global.window.getUserRole = null;
  });

  afterEach(() => {
    // Restore original window properties
    global.window.AppState = originalWindow.AppState;
    global.window.__USER__ = originalWindow.__USER__;
    global.window.getUserRole = originalWindow.getUserRole;
    global.window.getNavItemsForRole = originalWindow.getNavItemsForRole;
  });

  // Load modules after DOM setup
  const loadModules = () => {
    // Clear module cache
    jest.resetModules();
    
    // Load navConfig first
    require('../../../js/config/navConfig.js');
    
    // Load Navbar
    require('../../../js/components/Navbar.js');
  };

  describe('getDefaultNavItems', () => {
    test('should return master items for master role', () => {
      loadModules();
      const Navbar = global.window.Navbar;
      
      const items = Navbar.getDefaultNavItems('master');
      const itemIds = items.map(item => item.id);
      
      expect(itemIds).toContain('master-template-link');
      expect(itemIds).toContain('master-nav-link');
      expect(itemIds).toContain('master-support-link');
      expect(itemIds).toContain('logout-btn');
      expect(itemIds).not.toContain('client-templates-link');
    });

    test('should return client items for client role', () => {
      loadModules();
      const Navbar = global.window.Navbar;
      
      const items = Navbar.getDefaultNavItems('client');
      const itemIds = items.map(item => item.id);
      
      expect(itemIds).toContain('client-templates-link');
      expect(itemIds).toContain('client-account-link');
      expect(itemIds).toContain('client-records-link');
      expect(itemIds).toContain('logout-btn');
      expect(itemIds).not.toContain('master-template-link');
    });

    test('should return admin items for admin role', () => {
      loadModules();
      const Navbar = global.window.Navbar;
      
      const items = Navbar.getDefaultNavItems('admin');
      const itemIds = items.map(item => item.id);
      
      // Admin should have both client and master links
      expect(itemIds).toContain('client-templates-link');
      expect(itemIds).toContain('client-account-link');
      expect(itemIds).toContain('master-template-link');
      expect(itemIds).toContain('master-nav-link');
      expect(itemIds).toContain('logout-btn');
    });

    test('should return login link for unauthenticated users', () => {
      loadModules();
      const Navbar = global.window.Navbar;
      
      const items = Navbar.getDefaultNavItems(null);
      const itemIds = items.map(item => item.id);
      
      expect(itemIds).toContain('login-link');
      expect(itemIds).not.toContain('logout-btn');
    });
  });

  describe('updateVisibility', () => {
    test('should show only master links for master role', () => {
      loadModules();
      const Navbar = global.window.Navbar;
      
      Navbar.updateVisibility('master');
      
      // Master links should be visible
      expect(document.getElementById('master-template-link').style.display).toBe('inline-block');
      expect(document.getElementById('master-nav-link').style.display).toBe('inline-block');
      expect(document.getElementById('master-support-link').style.display).toBe('inline-block');
      expect(document.getElementById('logout-btn').style.display).toBe('inline-block');
      
      // Client links should be hidden
      expect(document.getElementById('client-templates-link').style.display).toBe('none');
      expect(document.getElementById('client-account-link').style.display).toBe('none');
      expect(document.getElementById('client-records-link').style.display).toBe('none');
    });

    test('should show only client links for client role', () => {
      loadModules();
      const Navbar = global.window.Navbar;
      
      Navbar.updateVisibility('client');
      
      // Client links should be visible
      expect(document.getElementById('client-templates-link').style.display).toBe('inline-block');
      expect(document.getElementById('client-account-link').style.display).toBe('inline-block');
      expect(document.getElementById('client-records-link').style.display).toBe('inline-block');
      expect(document.getElementById('logout-btn').style.display).toBe('inline-block');
      
      // Master links should be hidden
      expect(document.getElementById('master-template-link').style.display).toBe('none');
      expect(document.getElementById('master-nav-link').style.display).toBe('none');
      expect(document.getElementById('master-support-link').style.display).toBe('none');
    });

    test('should show both client and master links for admin role', () => {
      loadModules();
      const Navbar = global.window.Navbar;
      
      Navbar.updateVisibility('admin');
      
      // Both client and master links should be visible for admin
      expect(document.getElementById('client-templates-link').style.display).toBe('inline-block');
      expect(document.getElementById('client-account-link').style.display).toBe('inline-block');
      expect(document.getElementById('client-records-link').style.display).toBe('inline-block');
      expect(document.getElementById('master-template-link').style.display).toBe('inline-block');
      expect(document.getElementById('master-nav-link').style.display).toBe('inline-block');
      expect(document.getElementById('master-support-link').style.display).toBe('inline-block');
      expect(document.getElementById('logout-btn').style.display).toBe('inline-block');
    });
  });

  describe('getRole', () => {
    test('should return role from window.__USER__', async () => {
      loadModules();
      const Navbar = global.window.Navbar;
      
      global.window.__USER__ = { role: 'master' };
      
      const role = await Navbar.getRole();
      expect(role).toBe('master');
    });

    test('should return role from AppState', async () => {
      loadModules();
      const Navbar = global.window.Navbar;
      
      global.window.AppState = { userRole: 'client' };
      
      const role = await Navbar.getRole();
      expect(role).toBe('client');
    });

    test('should return null when no user info available', async () => {
      loadModules();
      const Navbar = global.window.Navbar;
      
      global.window.__USER__ = null;
      global.window.AppState = { userRole: null };
      
      const role = await Navbar.getRole();
      expect(role).toBe(null);
    });

    test('should prefer window.__USER__ over AppState', async () => {
      loadModules();
      const Navbar = global.window.Navbar;
      
      global.window.__USER__ = { role: 'master' };
      global.window.AppState = { userRole: 'client' };
      
      // Mock getUserRole to prioritize __USER__
      global.window.getUserRole = async () => {
        if (global.window.__USER__ && global.window.__USER__.role) {
          return global.window.__USER__.role;
        }
        return global.window.AppState.userRole;
      };
      
      const role = await Navbar.getRole();
      expect(role).toBe('master');
    });
  });

  describe('NAV_CONFIG integration', () => {
    test('should load NAV_CONFIG with expected roles', () => {
      loadModules();
      const NAV_CONFIG = global.window.NAV_CONFIG;
      
      expect(NAV_CONFIG).toBeDefined();
      expect(NAV_CONFIG.master).toBeDefined();
      expect(NAV_CONFIG.client).toBeDefined();
      expect(NAV_CONFIG.admin).toBeDefined();
      expect(NAV_CONFIG.default).toBeDefined();
    });

    test('getNavItemsForRole should return correct items', () => {
      loadModules();
      const getNavItemsForRole = global.window.getNavItemsForRole;
      
      const masterItems = getNavItemsForRole('master');
      expect(masterItems.some(item => item.id === 'master-template-link')).toBe(true);
      
      const clientItems = getNavItemsForRole('client');
      expect(clientItems.some(item => item.id === 'client-templates-link')).toBe(true);
      
      const defaultItems = getNavItemsForRole(null);
      expect(defaultItems.some(item => item.id === 'login-link')).toBe(true);
    });
  });
});
