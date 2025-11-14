const UI = {
  showElement(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('hidden');
      el.style.display = 'block';
    }
  },
  hideElement(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('hidden');
      el.style.display = 'none';
    }
  },
  showMessage(id, message, type = 'info') {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = message;
      el.className = `message ${type}`;
      el.style.display = 'block';
    }
  },
  hideMessage(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  },
  showLogin() {
    this.showElement('login-form');
    this.hideElement('register-form');
    this.showElement('switch-to-register');
    this.hideElement('switch-to-login');
    this.hideMessage('login-msg');
  },
  showRegister() {
    this.hideElement('login-form');
    this.showElement('register-form');
    this.hideElement('switch-to-register');
    this.showElement('switch-to-login');
    this.showElement('register-step1');
    this.hideElement('register-step2');
    this.hideElement('register-step3');
    document.getElementById('register-form')?.reset();
    this.hideMessage('register-msg-step1');
    this.hideMessage('register-msg-step2');
    this.hideMessage('register-msg-step3');
  },
  showMainApp() {
    console.log('showMainApp called');
    const authContainer = document.getElementById('auth-container');
    const mainApp = document.getElementById('main-app');
    if (authContainer) {
      authContainer.style.display = 'none';
      authContainer.classList.add('hidden');
      console.log('auth-container hidden');
    }
    if (mainApp) {
      mainApp.classList.add('show');
      mainApp.style.display = 'block';
      console.log('main-app shown');
    }
  },
  showAuth() {
    console.log('showAuth called');
    const authContainer = document.getElementById('auth-container');
    const mainApp = document.getElementById('main-app');
    if (authContainer) {
      authContainer.style.display = 'block';
      authContainer.classList.remove('hidden');
      console.log('auth-container shown');
    }
    if (mainApp) {
      mainApp.classList.remove('show');
      mainApp.style.display = 'none';
      console.log('main-app hidden');
    }
  },
  showPage(pageId, userRole = null) {
  const pages = ['setup-page', 'account-page', 'template-page', 'records-page', 'create-account-page'];
    // Change this check:
    if (pageId === 'create-account-page' && userRole !== 'master' && userRole !== 'admin') {
      this.showMessage('template-status', 'Access denied: Only master/admin accounts can create industry codes.', 'error');
      pageId = 'template-page';
    }
    pages.forEach(id => this.hideElement(id));
    this.showElement(pageId);
    
    // Call the main showPage function to load data
    if (window.showPage && typeof window.showPage === 'function') {
      window.showPage(pageId);
    }
  },
  checkProductWarning(productName) {
    const warning = document.getElementById('product-warning');
    if (warning) {
      if (productName && productName.trim().length >= 2) {
        this.hideElement('product-warning');
      } else {
        this.showElement('product-warning');
      }
    }
  },
  toggleMasterUI(isMaster) {
    // Change this check:
    if (isMaster || AppState.userRole === 'admin') {
      this.showElement('create-account-link');
    } else {
      this.hideElement('create-account-link');
    }
  }
};

// Export to global scope
window.UI = UI;
