/**
 * UI Utility Module
 * Provides common UI manipulation functions for showing/hiding elements and managing UI state.
 * 
 * This module now uses NAV_CONFIG from js/config/nav-config.js for centralized
 * navigation configuration. The renderNavbar function reads from NAV_CONFIG
 * to render appropriate navigation links based on user's role.
 */

/**
 * Helper function to determine if a user has master role.
 * Checks for user.role === 'master' or user.isMaster === true.
 * @param {object} user - The user object to check
 * @returns {boolean} - True if the user has master role
 */
function isMaster(user) {
  if (!user) return false;
  // Check role property first (primary method)
  if (user.role === 'master') return true;
  // Check isMaster flag as fallback
  if (user.isMaster === true) return true;
  // Check accountType for additional compatibility
  if (user.accountType === 'master') return true;
  return false;
}

// Export isMaster helper to global scope
window.isMaster = isMaster;

var UI = {
  showElement: function(id) {
    var el = document.getElementById(id);
    if (el) {
      el.classList.remove('hidden');
      el.style.display = 'block';
    }
  },

  hideElement: function(id) {
    var el = document.getElementById(id);
    if (el) {
      el.classList.add('hidden');
      el.style.display = 'none';
    }
  },

  showMessage: function(id, message, type) {
    type = type || 'info';
    var el = document.getElementById(id);
    if (el) {
      el.innerHTML = message;
      el.className = 'message ' + type;
      el.style.display = 'block';
    }
  },

  hideMessage: function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  },

  showLogin: function() {
    this.showElement('login-form');
    this.hideElement('register-form');
    this.showElement('switch-to-register');
    this.hideElement('switch-to-login');
    this.hideMessage('login-msg');
  },

  showRegister: function() {
    this.hideElement('login-form');
    this.showElement('register-form');
    this.hideElement('switch-to-register');
    this.showElement('switch-to-login');
    this.showElement('register-step1');
    this.hideElement('register-step2');
    this.hideElement('register-step3');
    var registerForm = document.getElementById('register-form');
    if (registerForm) registerForm.reset();
    this.hideMessage('register-msg-step1');
    this.hideMessage('register-msg-step2');
    this.hideMessage('register-msg-step3');
  },

  showMainApp: function() {
    console.log('[UI] showMainApp called');
    var authContainer = document.getElementById('auth-container');
    var mainApp = document.getElementById('main-app');
    if (authContainer) {
      authContainer.style.display = 'none';
      authContainer.classList.add('hidden');
      console.log('[UI] auth-container hidden');
    }
    if (mainApp) {
      mainApp.classList.add('show');
      mainApp.style.display = 'block';
      console.log('[UI] main-app shown');
    }
  },

  showAuth: function() {
    console.log('[UI] showAuth called');
    var authContainer = document.getElementById('auth-container');
    var mainApp = document.getElementById('main-app');
    if (authContainer) {
      authContainer.style.display = 'block';
      authContainer.classList.remove('hidden');
      console.log('[UI] auth-container shown');
    }
    if (mainApp) {
      mainApp.classList.remove('show');
      mainApp.style.display = 'none';
      console.log('[UI] main-app hidden');
    }
  },

  showPage: function(pageId, userRole) {
    var pages = ['setup-page', 'account-page', 'template-page', 'records-page', 'create-account-page'];
    var self = this;
    
    // Check for admin access - use isAdmin flag or role
    var isAdmin = (window.AppState && window.AppState.isAdmin) || 
                  userRole === 'master' || 
                  userRole === 'admin';
    
    if (pageId === 'create-account-page' && !isAdmin) {
      this.showMessage('template-status', 'Access denied: Only admin accounts can create industry codes.', 'error');
      pageId = 'template-page';
    }
    
    pages.forEach(function(id) { self.hideElement(id); });
    this.showElement(pageId);
    
    // Call the main showPage function to load data
    if (window.showPage && typeof window.showPage === 'function') {
      window.showPage(pageId);
    }
  },

  checkProductWarning: function(productName) {
    var warning = document.getElementById('product-warning');
    if (warning) {
      if (productName && productName.trim().length >= 2) {
        this.hideElement('product-warning');
      } else {
        this.showElement('product-warning');
      }
    }
  },

  /**
   * Render the navbar based on user's role using NAV_CONFIG.
   * This function dynamically shows/hides nav items based on the centralized
   * navigation configuration.
   * 
   * @param {string} role - User role ('master', 'client', 'admin')
   */
  renderNavbar: function(role) {
    var self = this;
    
    // Use NavConfig if available, otherwise fall back to legacy behavior
    if (!window.NavConfig || !window.NAV_CONFIG) {
      console.warn('[UI] NAV_CONFIG not loaded, using legacy toggleMasterUI');
      this.toggleMasterUI(role === 'master');
      return;
    }
    
    // Get nav items for the role from central config
    var navItems = window.NavConfig.getNavItemsForRole(role);
    var navItemIds = navItems.map(function(item) { return item.id; });
    
    // All possible nav link IDs that might exist in the DOM
    var allNavLinkIds = [
      'client-templates-link',
      'client-account-link', 
      'client-records-link',
      'master-template-link',
      'master-nav-link',
      'master-support-link',
      'create-account-link',
      'logout-btn'
    ];
    
    // Hide all nav links first
    allNavLinkIds.forEach(function(id) {
      self.hideElement(id);
    });
    
    // Show only the nav items for this role
    navItemIds.forEach(function(id) {
      self.showElement(id);
    });
    
    // Attach click handlers from NAV_CONFIG (for dynamically created elements)
    navItems.forEach(function(item) {
      var el = document.getElementById(item.id);
      if (el && item.onClick) {
        // Remove old onclick to prevent duplicates
        el.onclick = function(e) {
          e.preventDefault();
          item.onClick();
          return false;
        };
      }
    });
    
    console.log('[UI] Navbar rendered for role:', role, 'Items:', navItemIds);
  },

  toggleMasterUI: function(isMasterUser) {
    var self = this;
    var userRole = (window.AppState && window.AppState.userRole) || null;
    var isAdminFlag = (window.AppState && window.AppState.isAdmin) || false;
    
    // Determine if the user is a master role (via role property or boolean flag)
    var isMasterRole = userRole === 'master' || isMasterUser === true;
    
    // Determine if user has admin privileges (either master or admin role)
    var hasAdminPrivileges = isMasterRole || userRole === 'admin' || isAdminFlag;
    
    // Determine effective role for NAV_CONFIG lookup
    var effectiveRole = 'client';
    if (isMasterRole) {
      effectiveRole = 'master';
    } else if (hasAdminPrivileges) {
      effectiveRole = 'admin';
    }
    
    // Use renderNavbar if NAV_CONFIG is available
    if (window.NavConfig && window.NAV_CONFIG) {
      this.renderNavbar(effectiveRole);
      return;
    }
    
    // Legacy fallback: Navigation link IDs for client/regular users
    var clientNavLinks = [
      'client-templates-link',    // Templates link
      'client-account-link',      // Account link  
      'client-records-link'       // Past Records link
    ];
    
    // Navigation link IDs for admin users (Template Creation, Client Management, Support Responses)
    var adminNavLinks = [
      'master-template-link',     // Template Creation
      'master-nav-link',          // Client Management
      'master-support-link'       // Support Responses
    ];
    
    if (isMasterRole) {
      // For master users: hide client navigation links, show only admin links
      // Master sees: Template Creation, Client Management, Support Responses, Logout
      clientNavLinks.forEach(function(id) { self.hideElement(id); });
      
      // Show admin-specific links
      adminNavLinks.forEach(function(id) { self.showElement(id); });
      
      // Hide the "Create Account" link since Template Creation handles this for master
      this.hideElement('create-account-link');
      
      console.log('[UI] Master navbar applied: showing Template Creation, Client Management, Support Responses, Logout');
    } else if (hasAdminPrivileges) {
      // For admin users: show BOTH client and admin navigation links
      // Admin sees: Templates, Account, Past Records, Template Creation, Client Management, Support Responses, Logout
      clientNavLinks.forEach(function(id) { self.showElement(id); });
      
      // Show admin-specific links for admin users
      adminNavLinks.forEach(function(id) { self.showElement(id); });
      
      // Show create account link for admin
      this.showElement('create-account-link');
      
      console.log('[UI] Admin navbar applied: showing all client links + Template Creation, Client Management, Support Responses, Logout');
    } else {
      // For regular client users: show only client navigation links
      // Client sees: Templates, Account, Past Records, Logout
      clientNavLinks.forEach(function(id) { self.showElement(id); });
      
      // Hide admin-specific links for client users
      adminNavLinks.forEach(function(id) { self.hideElement(id); });
      
      // Hide create account link for clients
      this.hideElement('create-account-link');
      
      console.log('[UI] Client navbar applied: showing Templates, Account, Past Records, Logout');
    }
  },

  /**
   * Show the Template Creation page for privileged users (master, admin, or isAdmin flag).
   * This handles the navigation click for the Template Creation link.
   * Note: Both master and admin users are allowed access to template creation.
   */
  showMasterTemplatePage: function() {
    // Allow access if user has admin privileges (via role or isAdmin flag)
    var isAdmin = (window.AppState && window.AppState.isAdmin) || 
                  (window.AppState && window.AppState.userRole === 'master') || 
                  (window.AppState && window.AppState.userRole === 'admin');
    
    if (!isAdmin) {
      this.showMessage('template-status', 'Access denied: Only admin accounts can access template creation.', 'error');
      return;
    }
    // Use the global showPage function to show template-creation-page
    if (typeof window.showPage === 'function') {
      window.showPage('template-creation-page');
    }
    // Initialize template creation page if needed
    if (window.TemplateCreation && typeof window.TemplateCreation.init === 'function') {
      window.TemplateCreation.init();
    }
  },

  /**
   * Get the default/homepage for the current user's role.
   * Used for role-based redirect from root (/).
   * 
   * @param {string} role - User role (optional, uses AppState.userRole if not provided)
   * @returns {string} Page ID to show as homepage
   */
  getDefaultPageForRole: function(role) {
    var userRole = role || (window.AppState && window.AppState.userRole) || 'client';
    
    // Use NavConfig if available
    if (window.NavConfig && typeof window.NavConfig.getDefaultPageForRole === 'function') {
      return window.NavConfig.getDefaultPageForRole(userRole);
    }
    
    // Fallback logic
    switch (userRole) {
      case 'master':
        return 'template-creation-page';
      case 'client':
        return 'template-page';
      case 'admin':
        return 'template-page';
      default:
        return 'template-page';
    }
  },

  /**
   * Navigate to the role-specific homepage.
   * This should be called after authentication to redirect users to their 
   * appropriate starting page based on their role.
   * 
   * @param {string} role - User role (optional, uses AppState.userRole if not provided)
   */
  redirectToRoleHomepage: function(role) {
    var userRole = role || (window.AppState && window.AppState.userRole) || 'client';
    var defaultPage = this.getDefaultPageForRole(userRole);
    
    console.log('[UI] Redirecting to role homepage. Role:', userRole, 'Page:', defaultPage);
    
    // Use global showPage function to navigate
    if (typeof window.showPage === 'function') {
      window.showPage(defaultPage);
    }
    
    // Special initialization for certain pages
    if (defaultPage === 'template-creation-page') {
      if (window.TemplateCreation && typeof window.TemplateCreation.init === 'function') {
        window.TemplateCreation.init();
      }
    }
  },

  /**
   * Check if the current user can access a specific page.
   * Uses NAV_CONFIG for role-based access control.
   * 
   * @param {string} pageId - Page ID to check access for
   * @param {string} role - User role (optional, uses AppState.userRole if not provided)
   * @returns {boolean} True if user can access the page
   */
  canAccessPage: function(pageId, role) {
    var userRole = role || (window.AppState && window.AppState.userRole) || null;
    var isAdmin = (window.AppState && window.AppState.isAdmin) || false;
    
    // If no role, deny access to protected pages
    if (!userRole) {
      return false;
    }
    
    // Use NavConfig if available
    if (window.NavConfig && typeof window.NavConfig.canAccessPage === 'function') {
      // Admin users can access all pages
      if (isAdmin || userRole === 'admin' || userRole === 'master') {
        return true;
      }
      return window.NavConfig.canAccessPage(userRole, pageId);
    }
    
    // Fallback: Master-only pages
    var masterOnlyPages = ['template-creation-page', 'client-management-section', 'support-response-page', 'create-account-page'];
    
    if (masterOnlyPages.includes(pageId)) {
      return userRole === 'master' || userRole === 'admin' || isAdmin;
    }
    
    // Client-only pages (also accessible to admin)
    var clientPages = ['records-page', 'account-page', 'template-page'];
    if (clientPages.includes(pageId)) {
      return true; // All authenticated users can access these
    }
    
    return true; // Default allow
  },

  /**
   * Check page access and redirect to appropriate page if access is denied.
   * 
   * @param {string} pageId - Page ID being accessed
   * @param {string} role - User role
   * @returns {string} The pageId if accessible, or redirect pageId if not
   */
  checkPageAccessAndRedirect: function(pageId, role) {
    if (this.canAccessPage(pageId, role)) {
      return pageId;
    }
    
    // Access denied - redirect to role homepage
    var defaultPage = this.getDefaultPageForRole(role);
    this.showMessage('template-status', 'Access denied: You do not have permission to access this page.', 'error');
    console.log('[UI] Access denied to page:', pageId, 'Redirecting to:', defaultPage);
    
    return defaultPage;
  }
};

// Export to global scope
window.UI = UI;
