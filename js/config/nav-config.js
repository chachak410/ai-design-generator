/**
 * Centralized Navigation Configuration
 * 
 * This file defines the navigation items for each user role.
 * The navbar component reads from this configuration to render
 * appropriate navigation links based on user's role.
 */

(function() {
  'use strict';

  /**
   * Navigation configuration object
   * Keys are role names, values are arrays of navigation items
   */
  const NAV_CONFIG = {
    /**
     * Master role navigation items
     * Master users see: Template Creation, Client Management, Support Response, Logout
     */
    master: [
      {
        id: 'master-template-link',
        label: 'templateCreation',
        labelFallback: 'Template Creation',
        href: '#',
        page: 'template-creation-page',
        onClick: function() {
          if (window.UI && typeof window.UI.showMasterTemplatePage === 'function') {
            window.UI.showMasterTemplatePage();
          }
        }
      },
      {
        id: 'master-nav-link',
        label: 'clientManagement',
        labelFallback: 'Client Management',
        href: '#',
        page: 'client-management-section',
        onClick: function() {
          if (typeof window.showPage === 'function') {
            window.showPage('client-management-section');
          }
        }
      },
      {
        id: 'master-support-link',
        label: 'supportResponses',
        labelFallback: 'Support Responses',
        href: '#',
        page: 'support-response-page',
        onClick: function() {
          if (typeof window.showPage === 'function') {
            window.showPage('support-response-page');
          }
          if (window.SupportResponse && typeof window.SupportResponse.init === 'function') {
            window.SupportResponse.init();
          }
        }
      },
      {
        id: 'logout-btn',
        label: 'logout',
        labelFallback: 'Logout',
        href: '#',
        page: null,
        isLogout: true,
        onClick: function() {
          if (typeof window.handleLogout === 'function') {
            window.handleLogout();
          }
        }
      }
    ],

    /**
     * Client role navigation items
     * Client users see: Templates, Account, Past Generation Records, Logout
     */
    client: [
      {
        id: 'client-templates-link',
        label: 'templates',
        labelFallback: 'Templates',
        href: '#',
        page: 'template-page',
        onClick: function() {
          if (typeof window.showPage === 'function') {
            window.showPage('template-page');
          }
        }
      },
      {
        id: 'client-account-link',
        label: 'account',
        labelFallback: 'Account',
        href: '#',
        page: 'account-page',
        onClick: function() {
          if (typeof window.showPage === 'function') {
            window.showPage('account-page');
          }
        }
      },
      {
        id: 'client-records-link',
        label: 'pastRecords',
        labelFallback: 'Past Records',
        href: '#',
        page: 'records-page',
        onClick: function() {
          if (typeof window.showPage === 'function') {
            window.showPage('records-page');
          }
        }
      },
      {
        id: 'logout-btn',
        label: 'logout',
        labelFallback: 'Logout',
        href: '#',
        page: null,
        isLogout: true,
        onClick: function() {
          if (typeof window.handleLogout === 'function') {
            window.handleLogout();
          }
        }
      }
    ],

    /**
     * Admin role navigation items (has both client and admin access)
     * Admin users see: Templates, Account, Past Records, Template Creation, Client Management, Support Responses, Logout
     */
    admin: [
      {
        id: 'client-templates-link',
        label: 'templates',
        labelFallback: 'Templates',
        href: '#',
        page: 'template-page',
        onClick: function() {
          if (typeof window.showPage === 'function') {
            window.showPage('template-page');
          }
        }
      },
      {
        id: 'client-account-link',
        label: 'account',
        labelFallback: 'Account',
        href: '#',
        page: 'account-page',
        onClick: function() {
          if (typeof window.showPage === 'function') {
            window.showPage('account-page');
          }
        }
      },
      {
        id: 'client-records-link',
        label: 'pastRecords',
        labelFallback: 'Past Records',
        href: '#',
        page: 'records-page',
        onClick: function() {
          if (typeof window.showPage === 'function') {
            window.showPage('records-page');
          }
        }
      },
      {
        id: 'master-template-link',
        label: 'templateCreation',
        labelFallback: 'Template Creation',
        href: '#',
        page: 'template-creation-page',
        onClick: function() {
          if (window.UI && typeof window.UI.showMasterTemplatePage === 'function') {
            window.UI.showMasterTemplatePage();
          }
        }
      },
      {
        id: 'master-nav-link',
        label: 'clientManagement',
        labelFallback: 'Client Management',
        href: '#',
        page: 'client-management-section',
        onClick: function() {
          if (typeof window.showPage === 'function') {
            window.showPage('client-management-section');
          }
        }
      },
      {
        id: 'master-support-link',
        label: 'supportResponses',
        labelFallback: 'Support Responses',
        href: '#',
        page: 'support-response-page',
        onClick: function() {
          if (typeof window.showPage === 'function') {
            window.showPage('support-response-page');
          }
          if (window.SupportResponse && typeof window.SupportResponse.init === 'function') {
            window.SupportResponse.init();
          }
        }
      },
      {
        id: 'logout-btn',
        label: 'logout',
        labelFallback: 'Logout',
        href: '#',
        page: null,
        isLogout: true,
        onClick: function() {
          if (typeof window.handleLogout === 'function') {
            window.handleLogout();
          }
        }
      }
    ],

    /**
     * Default/unauthenticated navigation items
     * Fallback for unknown roles or unauthenticated users
     */
    default: [
      {
        id: 'logout-btn',
        label: 'logout',
        labelFallback: 'Logout',
        href: '#',
        page: null,
        isLogout: true,
        onClick: function() {
          if (typeof window.handleLogout === 'function') {
            window.handleLogout();
          }
        }
      }
    ]
  };

  /**
   * Get navigation items for a specific role
   * @param {string} role - User role ('master', 'client', 'admin', or any other)
   * @returns {Array} Array of navigation item objects
   */
  function getNavItemsForRole(role) {
    if (!role) return NAV_CONFIG.default;
    
    const normalizedRole = String(role).toLowerCase().trim();
    
    if (NAV_CONFIG[normalizedRole]) {
      return NAV_CONFIG[normalizedRole];
    }
    
    return NAV_CONFIG.default;
  }

  /**
   * Get the default homepage for a specific role
   * Used for role-based redirect from root (/)
   * @param {string} role - User role
   * @returns {string} Page ID to show as homepage
   */
  function getDefaultPageForRole(role) {
    if (!role) return 'template-page';
    
    const normalizedRole = String(role).toLowerCase().trim();
    
    switch (normalizedRole) {
      case 'master':
        // Master users start at Template Creation page
        return 'template-creation-page';
      case 'client':
        // Client users start at Templates page
        return 'template-page';
      case 'admin':
        // Admin users start at Templates page (same as clients)
        return 'template-page';
      default:
        return 'template-page';
    }
  }

  /**
   * Check if a page is accessible by a specific role
   * @param {string} role - User role
   * @param {string} pageId - Page ID to check
   * @returns {boolean} True if the role can access the page
   */
  function canAccessPage(role, pageId) {
    if (!role || !pageId) return false;
    
    const normalizedRole = String(role).toLowerCase().trim();
    const navItems = getNavItemsForRole(normalizedRole);
    
    // Check if the page is in the role's navigation
    const hasAccess = navItems.some(function(item) {
      return item.page === pageId;
    });
    
    // Special case: some pages don't have direct nav links but should be accessible
    // For example, payment-page might be accessible to all authenticated users
    const universalPages = ['payment-page'];
    if (universalPages.includes(pageId)) {
      return true;
    }
    
    return hasAccess;
  }

  /**
   * Get pages that are protected for a specific role (i.e., pages other roles cannot access)
   * @param {string} role - Role to get protected pages for
   * @returns {Array} Array of page IDs that only this role can access
   */
  function getProtectedPagesForRole(role) {
    if (!role) return [];
    
    const normalizedRole = String(role).toLowerCase().trim();
    
    switch (normalizedRole) {
      case 'master':
        // Master-only pages
        return ['template-creation-page', 'client-management-section', 'support-response-page', 'create-account-page'];
      case 'client':
        // Client-specific pages (can also be accessed by admin)
        return ['records-page', 'account-page'];
      case 'admin':
        // Admin has access to all pages
        return [];
      default:
        return [];
    }
  }

  // Export to global scope
  window.NAV_CONFIG = NAV_CONFIG;
  window.NavConfig = {
    getNavItemsForRole: getNavItemsForRole,
    getDefaultPageForRole: getDefaultPageForRole,
    canAccessPage: canAccessPage,
    getProtectedPagesForRole: getProtectedPagesForRole
  };

  console.log('[nav-config.js] NAV_CONFIG loaded successfully');
})();
