/**
 * Navigation Configuration by User Role
 * 
 * Centralizes navbar configuration for master, client, and default (unauthenticated) roles.
 * This module exports NAV_CONFIG which defines the navigation items for each role.
 * 
 * Usage:
 *   const { NAV_CONFIG } = require('./navConfig');
 *   const items = NAV_CONFIG[userRole] || NAV_CONFIG.default;
 */

const NAV_CONFIG = {
  /**
   * Master role navigation items
   * Master users see: Template Creation, Client Management, Support Responses, Logout
   */
  master: [
    {
      id: 'master-template-link',
      label: 'Template Creation',
      i18nKey: 'templateCreation',
      href: '#',
      page: 'template-creation-page',
      onClick: 'UI.showMasterTemplatePage()'
    },
    {
      id: 'master-nav-link',
      label: 'Client Management',
      i18nKey: 'clientManagement',
      href: '#',
      page: 'client-management-section',
      onClick: "showPage('client-management-section')"
    },
    {
      id: 'master-support-link',
      label: 'Support Responses',
      i18nKey: 'supportResponses',
      href: '#',
      page: 'support-response-page',
      onClick: "showPage('support-response-page'); SupportResponse.init()"
    },
    {
      id: 'logout-btn',
      label: 'Logout',
      i18nKey: 'logout',
      href: '#',
      onClick: 'handleLogout()'
    }
  ],

  /**
   * Client role navigation items
   * Client users see: Templates, Account, Past Records, Logout
   */
  client: [
    {
      id: 'client-templates-link',
      label: 'Templates',
      i18nKey: 'templates',
      href: '#',
      page: 'template-page',
      onClick: "showPage('template-page')",
      isDefault: true
    },
    {
      id: 'client-account-link',
      label: 'Account',
      i18nKey: 'account',
      href: '#',
      page: 'account-page',
      onClick: "showPage('account-page')"
    },
    {
      id: 'client-records-link',
      label: 'Past Records',
      i18nKey: 'pastRecords',
      href: '#',
      page: 'records-page',
      onClick: "showPage('records-page')"
    },
    {
      id: 'logout-btn',
      label: 'Logout',
      i18nKey: 'logout',
      href: '#',
      onClick: 'handleLogout()'
    }
  ],

  /**
   * Admin role navigation items (has both client and master access)
   * Admin users see: Templates, Account, Past Records, Create Account, Template Creation, Client Management, Support Responses, Logout
   */
  admin: [
    {
      id: 'client-templates-link',
      label: 'Templates',
      i18nKey: 'templates',
      href: '#',
      page: 'template-page',
      onClick: "showPage('template-page')",
      isDefault: true
    },
    {
      id: 'client-account-link',
      label: 'Account',
      i18nKey: 'account',
      href: '#',
      page: 'account-page',
      onClick: "showPage('account-page')"
    },
    {
      id: 'client-records-link',
      label: 'Past Records',
      i18nKey: 'pastRecords',
      href: '#',
      page: 'records-page',
      onClick: "showPage('records-page')"
    },
    {
      id: 'create-account-link',
      label: 'Create Account',
      i18nKey: 'createAccount',
      href: '#',
      page: 'create-account-page',
      onClick: "showPage('create-account-page')"
    },
    {
      id: 'master-template-link',
      label: 'Template Creation',
      i18nKey: 'templateCreation',
      href: '#',
      page: 'template-creation-page',
      onClick: 'UI.showMasterTemplatePage()'
    },
    {
      id: 'master-nav-link',
      label: 'Client Management',
      i18nKey: 'clientManagement',
      href: '#',
      page: 'client-management-section',
      onClick: "showPage('client-management-section')"
    },
    {
      id: 'master-support-link',
      label: 'Support Responses',
      i18nKey: 'supportResponses',
      href: '#',
      page: 'support-response-page',
      onClick: "showPage('support-response-page'); SupportResponse.init()"
    },
    {
      id: 'logout-btn',
      label: 'Logout',
      i18nKey: 'logout',
      href: '#',
      onClick: 'handleLogout()'
    }
  ],

  /**
   * Default (unauthenticated) navigation items
   * Unauthenticated users see: Login link only
   */
  default: [
    {
      id: 'login-link',
      label: 'Login',
      i18nKey: 'signIn',
      href: '#',
      onClick: 'showLogin()'
    }
  ]
};

/**
 * Get navigation items for a specific role
 * @param {string} role - User role ('master', 'client', 'admin', or null/undefined for default)
 * @returns {Array} Array of navigation item objects
 */
function getNavItemsForRole(role) {
  if (!role) return NAV_CONFIG.default;
  return NAV_CONFIG[role] || NAV_CONFIG.default;
}

/**
 * Get the default landing page for a role
 * @param {string} role - User role ('master', 'client', 'admin', or null/undefined for default)
 * @returns {string} The default page/route for the role
 */
function getDefaultPageForRole(role) {
  const items = getNavItemsForRole(role);
  const defaultItem = items.find(item => item.isDefault);
  if (defaultItem && defaultItem.page) {
    return defaultItem.page;
  }
  // Fallbacks by role
  if (role === 'master') return 'template-creation-page';
  if (role === 'admin') return 'template-page';
  if (role === 'client') return 'template-page';
  return null; // unauthenticated - no default page
}

// Export for browser usage
if (typeof window !== 'undefined') {
  window.NAV_CONFIG = NAV_CONFIG;
  window.getNavItemsForRole = getNavItemsForRole;
  window.getDefaultPageForRole = getDefaultPageForRole;
}

// Export for CommonJS (Node.js/tests)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NAV_CONFIG, getNavItemsForRole, getDefaultPageForRole };
}
