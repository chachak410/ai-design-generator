// js/core/main.js

// AppState is now initialized in state.js — just use it
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[main.js] DOM loaded, initializing app...');
  try {
    // Guard EmailJS initialization - only if config is available
    if (typeof emailjs !== 'undefined' && 
        window.AppConfig && 
        window.AppConfig.emailjs && 
        window.AppConfig.emailjs.publicKey) {
      emailjs.init(window.AppConfig.emailjs.publicKey);
      console.log('[main.js] EmailJS initialized');
    } else {
      console.warn('[main.js] EmailJS SDK or config not available, skipping initialization');
    }

    // Guard AppState.auth usage
    if (!window.AppState || !window.AppState.auth) {
      console.error('[main.js] AppState.auth not available. Firebase may not be initialized.');
      UI.showAuth();
      UI.showLogin();
      return;
    }

    // Now safe to use AppState.auth
    window.AppState.auth.onAuthStateChanged(async (user) => {
      if (user) {
        console.log('[main.js] User signed in:', user.email);
        window.AppState.currentUser = user;

        try {
          // Guard db usage
          if (!window.AppState.db) {
            console.error('[main.js] AppState.db not available');
            UI.showAuth();
            UI.showLogin();
            return;
          }
          
          const doc = await window.AppState.db.collection('users').doc(user.uid).get();
          if (!doc.exists) {
            await window.AppState.db.collection('users').doc(user.uid).set({
              email: user.email,
              role: 'client',
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('[main.js] New user created');
            UI.showMainApp();
            UI.showPage('template-page');
          } else {
            const userData = doc.data();
            console.log('[main.js] User data loaded:', {
              productName: userData.productName,
              role: userData.role
            });

            window.AppState.userRole = userData.role || 'client';
            window.AppState.userProductName = userData.productName || '';
            window.AppState.userTemplates = userData.template ? [userData.template] : [];
            window.AppState.userSpecs = userData.specifications || {};
            window.AppState.feedbackVector = userData.feedbackVector || null;
            window.AppState.badSelections = userData.badSelections || 0;

            UI.showMainApp();
            UI.toggleMasterUI(window.AppState.userRole === 'master' || window.AppState.userRole === 'admin');

            // Show/hide navigation links based on user role
            const masterNavLink = document.getElementById('master-nav-link');
            const masterTemplateLink = document.getElementById('master-template-link');
            const masterSupportLink = document.getElementById('master-support-link');
            const clientTemplatesLink = document.getElementById('client-templates-link');
            const clientAccountLink = document.getElementById('client-account-link');
            const clientRecordsLink = document.getElementById('client-records-link');
            const createAccountLink = document.getElementById('create-account-link');
            
            if (window.AppState.userRole === 'master') {
              // Master accounts: show only Template Creation, Client Management, Support Responses, Logout
              if (masterNavLink) masterNavLink.style.display = 'inline-block';
              if (masterTemplateLink) masterTemplateLink.style.display = 'inline-block';
              if (masterSupportLink) masterSupportLink.style.display = 'inline-block';
              // Hide client-only links for master
              if (clientTemplatesLink) clientTemplatesLink.style.display = 'none';
              if (clientAccountLink) clientAccountLink.style.display = 'none';
              if (clientRecordsLink) clientRecordsLink.style.display = 'none';
              if (createAccountLink) createAccountLink.style.display = 'none';
            } else if (window.AppState.userRole === 'admin') {
              // Admin accounts: show master links in addition to client links
              if (masterNavLink) masterNavLink.style.display = 'inline-block';
              if (masterTemplateLink) masterTemplateLink.style.display = 'inline-block';
              if (masterSupportLink) masterSupportLink.style.display = 'inline-block';
            }

            window.currentUserData = userData;
            UI.showPage('template-page', window.AppState.userRole);
            if (window.TemplateManager && typeof window.TemplateManager.loadTemplates === 'function') {
              await window.TemplateManager.loadTemplates();
            }
          }
        } catch (err) {
          console.error('[main.js] Error loading user data:', err);
          UI.showMessage('template-status', 'Error loading user data: ' + err.message, 'error');
        }
      } else {
        console.log('[main.js] User signed out');
        window.AppState.currentUser = null;
        window.AppState.userRole = null;
        window.AppState.userProductName = null;
        window.AppState.generationCount = 0;
        window.AppState.feedbackVector = null;
        window.AppState.badSelections = 0;
        UI.showAuth();
        UI.showLogin();
      }
    });

    setupEventListeners();
    console.log('[main.js] App initialization complete');
  } catch (err) {
    console.error('[main.js] Initialization error:', err);
    alert('Failed to initialize app: ' + err.message);
  }
});

function setupEventListeners() {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      Auth.login();
    });
  }

  const switchToRegister = document.getElementById('switch-to-register');
  if (switchToRegister) {
    switchToRegister.addEventListener('click', (e) => {
      e.preventDefault();
      UI.showRegister();
    });
  }

  const switchToLogin = document.getElementById('switch-to-login');
  if (switchToLogin) {
    switchToLogin.addEventListener('click', (e) => {
      e.preventDefault();
      UI.showLogin();
    });
  }

  const sendCodeBtn = document.getElementById('send-code-btn');
  if (sendCodeBtn) {
    sendCodeBtn.addEventListener('click', () => {
      if (window.Registration) Registration.sendVerificationCode();
    });
  }

  const verifyCodeBtn = document.getElementById('verify-code-btn');
  if (verifyCodeBtn) {
    verifyCodeBtn.addEventListener('click', () => {
      if (window.Registration) Registration.verifyCode();
    });
  }

  const completeRegBtn = document.getElementById('complete-registration-btn');
  if (completeRegBtn) {
    completeRegBtn.addEventListener('click', () => {
      if (window.Registration) Registration.completeRegistration();
    });
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => Auth.logout());
  }

  const forgotPasswordLink = document.getElementById('forgot-password');
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      Auth.resetPassword();
    });
  }

  const editAccountBtn = document.getElementById('edit-account-btn');
  if (editAccountBtn) {
    editAccountBtn.addEventListener('click', () => {
      if (window.Profile) Profile.showEditAccount();
    });
  }

  const updateAccountBtn = document.getElementById('update-account-btn');
  if (updateAccountBtn) {
    updateAccountBtn.addEventListener('click', () => {
      if (window.Profile) Profile.updateAccount();
    });
  }

  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
      if (window.Profile) Profile.cancelEdit();
    });
  }

  const generateBtn = document.getElementById('generate-images-btn');
  if (generateBtn) {
    generateBtn.addEventListener('click', () => {
      if (window.TemplateManager) TemplateManager.generateImages(null);
    });
  }

  const createCodeBtn = document.getElementById('create-code-btn');
  if (createCodeBtn) {
    createCodeBtn.addEventListener('click', () => {
      if (window.IndustryCodeManager) IndustryCodeManager.createIndustryCode();
    });
  }

  const addSpecBtn = document.getElementById('add-spec-btn');
  if (addSpecBtn) {
    addSpecBtn.addEventListener('click', () => {
      if (window.IndustryCodeManager) IndustryCodeManager.addSpecification();
    });
  }

  const copyCodeBtn = document.getElementById('copy-code-btn');
  if (copyCodeBtn) {
    copyCodeBtn.addEventListener('click', () => {
      if (window.IndustryCodeManager) IndustryCodeManager.copyCode();
    });
  }

  console.log('[main.js] Event listeners setup complete');
}

function showPage(pageId) {
  const sections = document.querySelectorAll('#main-app .controls, #main-app .page-section');
  sections.forEach(section => { section.style.display = 'none'; });

  const targetSection = document.getElementById(pageId);
  if (targetSection) {
    targetSection.style.display = 'block';
    if (pageId === 'client-management-section' && window.ClientManagement && typeof window.ClientManagement.init === 'function') {
      window.ClientManagement.init();
    }
  } else {
    console.error('[main.js] Section ' + pageId + ' not found');
  }
}
window.showPage = showPage;

window.addValue = function (specId) {
  if (window.IndustryCodeManager) IndustryCodeManager.addValue(specId);
};
window.removeSpecification = function (specId) {
  if (window.IndustryCodeManager) IndustryCodeManager.removeSpecification(specId);
};

window.handleLogout = async function () {
  try {
    if (window.AppState && window.AppState.auth) {
      await window.AppState.auth.signOut();
    }
    location.reload();
  } catch (e) {
    console.error('[main.js] Logout failed', e);
    alert('Logout failed. Please try again.');
  }
};

function showAuthView(target) {
  const groups = {
    login: ['login-panel', 'login-section', 'auth-login', 'login-form-container', 'login-card'],
    register: ['register-panel', 'register-section', 'auth-register', 'register-form-container', 'register-card']
  };

  [...groups.login, ...groups.register].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  const toShow = groups[target] || [];
  let shown = false;
  toShow.forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'block'; shown = true; }
  });

  if (!shown) {
    document.querySelectorAll('.auth-login').forEach(el => el.style.display = (target === 'login' ? 'block' : 'none'));
    document.querySelectorAll('.auth-register').forEach(el => el.style.display = (target === 'register' ? 'block' : 'none'));
  }
}

window.showLogin = function () {
  showAuthView('login');
};
window.showRegister = function () {
  showAuthView('register');
};

window.resetPassword = async function () {
  try {
    if (window.Auth && typeof window.Auth.resetPassword === 'function') {
      await window.Auth.resetPassword();
      return;
    }
    const email = (document.getElementById('login-email')?.value || '').trim() ||
      prompt('Enter your email to receive a password reset link:') || '';
    if (!email) return;
    
    if (window.AppState && window.AppState.auth) {
      await window.AppState.auth.sendPasswordResetEmail(email);
      alert('Password reset email sent.');
    }
  } catch (e) {
    console.error('[main.js] resetPassword error', e);
    alert('Failed to send reset email. Please try again.');
  }
};