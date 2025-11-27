/**
 * UI Utility Module
 * Provides common UI manipulation functions for showing/hiding elements and managing UI state.
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

  toggleMasterUI: function(isMasterUser) {
    var self = this;
    var userRole = (window.AppState && window.AppState.userRole) || null;
    var isAdminFlag = (window.AppState && window.AppState.isAdmin) || false;
    
    // Determine if the user is a master role (via role property or boolean flag)
    var isMasterRole = userRole === 'master' || isMasterUser === true;
    
    // Determine if user has admin privileges (either master or admin role)
    var hasAdminPrivileges = isMasterRole || userRole === 'admin' || isAdminFlag;
    
    // Navigation link IDs for client/regular users
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
  }
};

// Export to global scope
window.UI = UI;
