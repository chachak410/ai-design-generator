/**
 * HomeRedirect Component
 * 
 * Handles role-based homepage redirect logic:
 * - master → /templates/create (template-creation-page)
 * - client → /templates (template-page)
 * - unauthenticated → /login (auth-container)
 * 
 * This component can be used with client-side routing or as a standalone redirect handler.
 * 
 * Dependencies:
 * - js/utils/authUtils.js (getUserRole)
 * - js/config/navConfig.js (getDefaultPageForRole)
 * 
 * Usage:
 *   // On page load or route change to '/':
 *   HomeRedirect.redirect();
 *   
 *   // Or for hash-based routing:
 *   HomeRedirect.handleHashRoute();
 */

(function() {
  'use strict';

  /**
   * Route mappings for role-based redirects
   * Maps roles to their default page/route
   */
  var ROLE_ROUTES = {
    master: {
      page: 'template-creation-page',
      hash: '#/templates/create',
      path: '/templates/create'
    },
    admin: {
      page: 'template-page',
      hash: '#/templates',
      path: '/templates'
    },
    client: {
      page: 'template-page',
      hash: '#/templates',
      path: '/templates'
    },
    default: {
      page: null, // Will show auth-container
      hash: '#/login',
      path: '/login'
    }
  };

  var HomeRedirect = {
    /**
     * Get the redirect configuration for a role
     * @param {string|null} role - The user's role
     * @returns {Object} Route configuration
     */
    getRouteForRole: function(role) {
      return ROLE_ROUTES[role] || ROLE_ROUTES.default;
    },

    /**
     * Perform the redirect based on user role
     * This is the main method to call for handling root route
     * @returns {Promise<void>}
     */
    redirect: async function() {
      try {
        var role = await this.getRole();
        var route = this.getRouteForRole(role);
        
        console.log('[HomeRedirect] Redirecting role:', role, 'to:', route.page || 'login');
        
        if (!role) {
          // Unauthenticated - show login
          this.showLogin();
          return;
        }

        // Show the appropriate page
        this.showPage(route.page);
      } catch (err) {
        console.error('[HomeRedirect] Error during redirect:', err);
        // On error, show login as fallback
        this.showLogin();
      }
    },

    /**
     * Get the current user's role
     * @returns {Promise<string|null>}
     */
    getRole: async function() {
      // Try getUserRole from authUtils
      if (typeof window.getUserRole === 'function') {
        return await window.getUserRole();
      }
      // Fallback to AppState
      if (window.AppState && window.AppState.userRole) {
        return window.AppState.userRole;
      }
      // Check window.__USER__
      if (window.__USER__ && window.__USER__.role) {
        return window.__USER__.role;
      }
      return null;
    },

    /**
     * Show a specific page (for single-page app navigation)
     * @param {string} pageId - The page element ID to show
     */
    showPage: function(pageId) {
      // Use existing UI.showPage if available
      if (window.UI && typeof window.UI.showPage === 'function') {
        window.UI.showMainApp();
        window.UI.showPage(pageId);
        return;
      }

      // Use global showPage if available
      if (typeof window.showPage === 'function') {
        // First ensure main app is visible
        var authContainer = document.getElementById('auth-container');
        var mainApp = document.getElementById('main-app');
        if (authContainer) authContainer.style.display = 'none';
        if (mainApp) mainApp.style.display = 'block';
        
        window.showPage(pageId);
        return;
      }

      // Manual page show as fallback
      console.log('[HomeRedirect] Manual page show:', pageId);
      var authContainer = document.getElementById('auth-container');
      var mainApp = document.getElementById('main-app');
      if (authContainer) authContainer.style.display = 'none';
      if (mainApp) mainApp.style.display = 'block';

      // Hide all pages, show target
      // Use multiple selectors to cover all page types in the codebase
      var pages = document.querySelectorAll('#main-app .controls, #main-app .page-section, #main-app .page');
      pages.forEach(function(page) {
        page.style.display = 'none';
      });

      var target = document.getElementById(pageId);
      if (target) {
        target.style.display = 'block';
      }
    },

    /**
     * Show the login page
     */
    showLogin: function() {
      // Use existing UI.showAuth if available
      if (window.UI && typeof window.UI.showAuth === 'function') {
        window.UI.showAuth();
        window.UI.showLogin();
        return;
      }

      // Manual show as fallback
      var authContainer = document.getElementById('auth-container');
      var mainApp = document.getElementById('main-app');
      if (authContainer) authContainer.style.display = 'block';
      if (mainApp) mainApp.style.display = 'none';
    },

    /**
     * Handle hash-based routing for the root route
     * Call this if your app uses hash routing (e.g., #/, #/templates)
     */
    handleHashRoute: async function() {
      var hash = window.location.hash;
      
      // Only handle root route or empty hash
      if (hash === '' || hash === '#' || hash === '#/' || hash === '#/home') {
        await this.redirect();
      }
    },

    /**
     * Initialize hash route listener
     * This will automatically redirect when hash changes to root
     */
    initHashRouter: function() {
      var self = this;
      
      // Handle initial load
      this.handleHashRoute();
      
      // Listen for hash changes
      window.addEventListener('hashchange', function() {
        self.handleHashRoute();
      });
    },

    /**
     * Get the URL path for a role's default page
     * Useful for generating redirect URLs
     * @param {string|null} role - The user's role
     * @returns {string} The URL path
     */
    getPathForRole: function(role) {
      var route = this.getRouteForRole(role);
      return route.path;
    },

    /**
     * Perform a full page redirect (for server-side routing)
     * @param {string|null} role - The user's role
     */
    navigateTo: function(role) {
      var path = this.getPathForRole(role);
      if (window.location.pathname !== path) {
        window.location.href = path;
      }
    }
  };

  // Export to global scope (browser)
  if (typeof window !== 'undefined') {
    window.HomeRedirect = HomeRedirect;
  }

  // Export for CommonJS (Node.js/tests)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = HomeRedirect;
  }
})();
