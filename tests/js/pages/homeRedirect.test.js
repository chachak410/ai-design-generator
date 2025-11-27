const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

describe('HomeRedirect Component', () => {
  let originalWindow;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <div id="auth-container" style="display: none;"></div>
      <div id="main-app" style="display: none;">
        <div id="template-page" class="controls" style="display: none;"></div>
        <div id="template-creation-page" class="page" style="display: none;"></div>
        <div id="account-page" class="controls" style="display: none;"></div>
      </div>
    `;

    // Store original window properties
    originalWindow = {
      AppState: global.window.AppState,
      __USER__: global.window.__USER__,
      getUserRole: global.window.getUserRole,
      UI: global.window.UI,
      showPage: global.window.showPage
    };

    // Reset window properties
    global.window.AppState = { userRole: null };
    global.window.__USER__ = null;
    global.window.getUserRole = null;
    global.window.UI = null;
    global.window.showPage = null;
  });

  afterEach(() => {
    // Restore original window properties
    global.window.AppState = originalWindow.AppState;
    global.window.__USER__ = originalWindow.__USER__;
    global.window.getUserRole = originalWindow.getUserRole;
    global.window.UI = originalWindow.UI;
    global.window.showPage = originalWindow.showPage;
  });

  // Load module after DOM setup
  const loadModule = () => {
    jest.resetModules();
    require('../../../js/pages/HomeRedirect.js');
  };

  describe('getRouteForRole', () => {
    test('should return template-creation-page for master', () => {
      loadModule();
      const HomeRedirect = global.window.HomeRedirect;
      
      const route = HomeRedirect.getRouteForRole('master');
      expect(route.page).toBe('template-creation-page');
      expect(route.path).toBe('/templates/create');
    });

    test('should return template-page for client', () => {
      loadModule();
      const HomeRedirect = global.window.HomeRedirect;
      
      const route = HomeRedirect.getRouteForRole('client');
      expect(route.page).toBe('template-page');
      expect(route.path).toBe('/templates');
    });

    test('should return template-page for admin', () => {
      loadModule();
      const HomeRedirect = global.window.HomeRedirect;
      
      const route = HomeRedirect.getRouteForRole('admin');
      expect(route.page).toBe('template-page');
      expect(route.path).toBe('/templates');
    });

    test('should return null page for unauthenticated', () => {
      loadModule();
      const HomeRedirect = global.window.HomeRedirect;
      
      const route = HomeRedirect.getRouteForRole(null);
      expect(route.page).toBe(null);
      expect(route.path).toBe('/login');
    });
  });

  describe('getPathForRole', () => {
    test('should return correct paths for each role', () => {
      loadModule();
      const HomeRedirect = global.window.HomeRedirect;
      
      expect(HomeRedirect.getPathForRole('master')).toBe('/templates/create');
      expect(HomeRedirect.getPathForRole('client')).toBe('/templates');
      expect(HomeRedirect.getPathForRole('admin')).toBe('/templates');
      expect(HomeRedirect.getPathForRole(null)).toBe('/login');
    });
  });

  describe('getRole', () => {
    test('should return role from window.__USER__', async () => {
      loadModule();
      const HomeRedirect = global.window.HomeRedirect;
      
      global.window.__USER__ = { role: 'master' };
      
      const role = await HomeRedirect.getRole();
      expect(role).toBe('master');
    });

    test('should return role from AppState', async () => {
      loadModule();
      const HomeRedirect = global.window.HomeRedirect;
      
      global.window.AppState = { userRole: 'client' };
      
      const role = await HomeRedirect.getRole();
      expect(role).toBe('client');
    });

    test('should use getUserRole function if available', async () => {
      loadModule();
      const HomeRedirect = global.window.HomeRedirect;
      
      global.window.getUserRole = jest.fn().mockResolvedValue('admin');
      
      const role = await HomeRedirect.getRole();
      expect(role).toBe('admin');
      expect(global.window.getUserRole).toHaveBeenCalled();
    });
  });

  describe('showLogin', () => {
    test('should show auth-container and hide main-app', () => {
      loadModule();
      const HomeRedirect = global.window.HomeRedirect;
      
      HomeRedirect.showLogin();
      
      expect(document.getElementById('auth-container').style.display).toBe('block');
      expect(document.getElementById('main-app').style.display).toBe('none');
    });

    test('should use UI.showAuth if available', () => {
      loadModule();
      const HomeRedirect = global.window.HomeRedirect;
      
      const mockShowAuth = jest.fn();
      const mockShowLogin = jest.fn();
      global.window.UI = {
        showAuth: mockShowAuth,
        showLogin: mockShowLogin
      };
      
      HomeRedirect.showLogin();
      
      expect(mockShowAuth).toHaveBeenCalled();
      expect(mockShowLogin).toHaveBeenCalled();
    });
  });

  describe('showPage', () => {
    test('should show specified page and hide auth-container', () => {
      loadModule();
      const HomeRedirect = global.window.HomeRedirect;
      
      HomeRedirect.showPage('template-page');
      
      expect(document.getElementById('auth-container').style.display).toBe('none');
      expect(document.getElementById('main-app').style.display).toBe('block');
      expect(document.getElementById('template-page').style.display).toBe('block');
    });

    test('should use UI.showPage if available', () => {
      loadModule();
      const HomeRedirect = global.window.HomeRedirect;
      
      const mockShowPage = jest.fn();
      const mockShowMainApp = jest.fn();
      global.window.UI = {
        showPage: mockShowPage,
        showMainApp: mockShowMainApp
      };
      
      HomeRedirect.showPage('template-page');
      
      expect(mockShowMainApp).toHaveBeenCalled();
      expect(mockShowPage).toHaveBeenCalledWith('template-page');
    });
  });

  describe('redirect', () => {
    test('should redirect master to template-creation-page', async () => {
      loadModule();
      const HomeRedirect = global.window.HomeRedirect;
      
      global.window.__USER__ = { role: 'master' };
      
      await HomeRedirect.redirect();
      
      expect(document.getElementById('main-app').style.display).toBe('block');
      expect(document.getElementById('template-creation-page').style.display).toBe('block');
    });

    test('should redirect client to template-page', async () => {
      loadModule();
      const HomeRedirect = global.window.HomeRedirect;
      
      global.window.__USER__ = { role: 'client' };
      
      await HomeRedirect.redirect();
      
      expect(document.getElementById('main-app').style.display).toBe('block');
      expect(document.getElementById('template-page').style.display).toBe('block');
    });

    test('should show login for unauthenticated users', async () => {
      loadModule();
      const HomeRedirect = global.window.HomeRedirect;
      
      global.window.__USER__ = null;
      global.window.AppState = { userRole: null };
      
      await HomeRedirect.redirect();
      
      expect(document.getElementById('auth-container').style.display).toBe('block');
      expect(document.getElementById('main-app').style.display).toBe('none');
    });
  });
});
