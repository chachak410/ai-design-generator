/**
 * Navbar Component
 * 
 * A role-based navigation component that reads the user's role and renders
 * navigation items according to NAV_CONFIG.
 * 
 * This component can be used in two ways:
 * 1. Call Navbar.render() to replace existing nav-links with role-based items
 * 2. Call Navbar.updateVisibility() to show/hide existing nav links based on role
 * 
 * Dependencies:
 * - js/config/navConfig.js (NAV_CONFIG, getNavItemsForRole)
 * - js/utils/authUtils.js (getUserRole)
 * 
 * Usage:
 *   // After DOM is ready and user is authenticated:
 *   await Navbar.init();
 */

(function() {
  'use strict';

  var Navbar = {
    /**
     * Container selector for the navbar
     */
    containerSelector: '.nav-links',

    /**
     * Initialize the navbar component
     * This will get the user role and update nav visibility accordingly
     */
    init: async function() {
      try {
        var role = await this.getRole();
        this.updateVisibility(role);
        console.log('[Navbar] Initialized for role:', role || 'unauthenticated');
      } catch (err) {
        console.error('[Navbar] Initialization error:', err);
      }
    },

    /**
     * Get the current user's role
     * Uses getUserRole from authUtils if available, otherwise falls back to AppState
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
     * Update nav link visibility based on role
     * This method shows/hides existing nav links defined in the HTML
     * @param {string|null} role - The user's role
     */
    updateVisibility: function(role) {
      // Get nav items configuration for the role
      var navItems = window.getNavItemsForRole ? 
        window.getNavItemsForRole(role) : 
        this.getDefaultNavItems(role);

      // Build a set of visible item IDs for this role
      var visibleIds = {};
      navItems.forEach(function(item) {
        visibleIds[item.id] = true;
      });

      // All possible nav link IDs
      var allNavIds = [
        'client-templates-link',
        'client-account-link',
        'client-records-link',
        'create-account-link',
        'master-nav-link',
        'master-template-link',
        'master-support-link',
        'logout-btn',
        'login-link'
      ];

      // Show/hide each nav link based on role config
      allNavIds.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) {
          if (visibleIds[id]) {
            el.style.display = 'inline-block';
            el.classList.remove('hidden');
          } else {
            el.style.display = 'none';
            el.classList.add('hidden');
          }
        }
      });
    },

    /**
     * Render the navbar with role-based items
     * This method replaces the nav container content with items from NAV_CONFIG
     * @param {string|null} role - The user's role
     * @param {string} containerSelector - Optional container selector (defaults to .nav-links)
     */
    render: function(role, containerSelector) {
      var container = document.querySelector(containerSelector || this.containerSelector);
      if (!container) {
        console.warn('[Navbar] Container not found:', containerSelector || this.containerSelector);
        return;
      }

      // Get nav items for the role
      var navItems = window.getNavItemsForRole ? 
        window.getNavItemsForRole(role) : 
        this.getDefaultNavItems(role);

      // Clear existing content
      container.innerHTML = '';

      // Render each nav item
      var self = this;
      navItems.forEach(function(item) {
        var link = self.createNavLink(item);
        container.appendChild(link);
      });
    },

    /**
     * Create a nav link element from item config
     * @param {Object} item - Nav item configuration
     * @returns {HTMLElement}
     */
    createNavLink: function(item) {
      var link = document.createElement('a');
      link.href = item.href || '#';
      link.id = item.id;
      
      // Set label with i18n support
      if (item.i18nKey) {
        link.setAttribute('data-i18n', item.i18nKey);
      }
      link.textContent = item.label;

      // Set click handler
      if (item.onClick) {
        link.setAttribute('onclick', item.onClick + '; return false;');
      }

      // Mark default item as active
      if (item.isDefault) {
        link.classList.add('active');
      }

      return link;
    },

    /**
     * Get default nav items when NAV_CONFIG is not available
     * @param {string|null} role - The user's role
     * @returns {Array}
     */
    getDefaultNavItems: function(role) {
      if (role === 'master') {
        return [
          { id: 'master-template-link', label: 'Template Creation' },
          { id: 'master-nav-link', label: 'Client Management' },
          { id: 'master-support-link', label: 'Support Responses' },
          { id: 'logout-btn', label: 'Logout' }
        ];
      }
      if (role === 'admin') {
        return [
          { id: 'client-templates-link', label: 'Templates' },
          { id: 'client-account-link', label: 'Account' },
          { id: 'client-records-link', label: 'Past Records' },
          { id: 'create-account-link', label: 'Create Account' },
          { id: 'master-template-link', label: 'Template Creation' },
          { id: 'master-nav-link', label: 'Client Management' },
          { id: 'master-support-link', label: 'Support Responses' },
          { id: 'logout-btn', label: 'Logout' }
        ];
      }
      if (role === 'client') {
        return [
          { id: 'client-templates-link', label: 'Templates' },
          { id: 'client-account-link', label: 'Account' },
          { id: 'client-records-link', label: 'Past Records' },
          { id: 'logout-btn', label: 'Logout' }
        ];
      }
      // Unauthenticated
      return [
        { id: 'login-link', label: 'Login' }
      ];
    },

    /**
     * Set active state on a nav link
     * @param {string} pageId - The page ID to mark as active
     */
    setActive: function(pageId) {
      var container = document.querySelector(this.containerSelector);
      if (!container) return;

      // Remove active class from all links
      var links = container.querySelectorAll('a');
      links.forEach(function(link) {
        link.classList.remove('active');
      });

      // Find and activate the matching link
      links.forEach(function(link) {
        var onclick = link.getAttribute('onclick') || '';
        if (onclick.includes(pageId)) {
          link.classList.add('active');
        }
      });
    }
  };

  // Export to global scope (browser)
  if (typeof window !== 'undefined') {
    window.Navbar = Navbar;
  }

  // Export for CommonJS (Node.js/tests)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Navbar;
  }
})();
