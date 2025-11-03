window.AppState = {
  auth: firebase.auth(),
  db: firebase.firestore(),
  currentUser: null,
  userRole: null,
  userProductName: null,
  userTemplates: [],
  userSpecs: {},
  selectedSpecs: {},
  generationCount: 0
};

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 DOM loaded, initializing app...');

  try {
    firebase.initializeApp(AppConfig.firebase);
    console.log('✅ Firebase initialized');

    emailjs.init(AppConfig.emailjs.publicKey);
    console.log(' EmailJS initialized');

    AppState.auth.onAuthStateChanged(async (user) => {
      if (user) {
        console.log(' User signed in:', user.email);
        AppState.currentUser = user;

        try {
          const doc = await AppState.db.collection('users').doc(user.uid).get();

          if (!doc.exists) {
            // User not found in Firestore – create basic doc
            await AppState.db.collection('users').doc(user.uid).set({
              email: user.email,
              role: 'client',
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log(' New user created, showing template page');
            UI.showMainApp();
            UI.showPage('template-page');
          } else {
            const userData = doc.data();
            console.log(' User data loaded:', { productName: userData.productName, role: userData.role });

            AppState.userRole = userData.role || 'client';
            AppState.userProductName = userData.productName || '';
            AppState.userTemplates = userData.template ? [userData.template] : [];
            AppState.userSpecs = userData.specifications || {};

            UI.showMainApp();
            UI.toggleMasterUI(AppState.userRole === 'master' || AppState.userRole === 'admin');

            // Show Client Management nav for admin/master
            const masterNavLink = document.getElementById('master-nav-link');
            if (AppState.userRole === 'master' || AppState.userRole === 'admin') {
              if (masterNavLink) {
                masterNavLink.style.display = 'inline-block';
                console.log('✅ Client Management nav shown');
              }
            }

            // Store user data globally
            window.currentUserData = userData;

            // Remove setup check - go directly to Template page
            UI.showPage('template-page', AppState.userRole);
            await TemplateManager.loadTemplates();
          }

        } catch (err) {
          console.error(' Error loading user data:', err);
          UI.showMessage('template-status', 'Error loading user data: ' + err.message, 'error');
        }

      } else {
        console.log('👋 User signed out');
        AppState.currentUser = null;
        AppState.userRole = null;
        AppState.userProductName = null;
        AppState.generationCount = 0;
        UI.showAuth();
        UI.showLogin();
      }
    });

    setupEventListeners();
    console.log(' App initialization complete');

  } catch (err) {
    console.error(' Initialization error:', err);
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
    sendCodeBtn.addEventListener('click', () => Registration.sendVerificationCode());
  }

  const verifyCodeBtn = document.getElementById('verify-code-btn');
  if (verifyCodeBtn) {
    verifyCodeBtn.addEventListener('click', () => Registration.verifyCode());
  }

  const completeRegBtn = document.getElementById('complete-registration-btn');
  if (completeRegBtn) {
    completeRegBtn.addEventListener('click', () => Registration.completeRegistration());
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
    editAccountBtn.addEventListener('click', () => Profile.showEditAccount());
  }

  const updateAccountBtn = document.getElementById('update-account-btn');
  if (updateAccountBtn) {
    updateAccountBtn.addEventListener('click', () => Profile.updateAccount());
  }

  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => Profile.cancelEdit());
  }

  const generateBtn = document.getElementById('generate-images-btn');
  if (generateBtn) {
    generateBtn.addEventListener('click', () => Generator.generateImages());
  }

  const createCodeBtn = document.getElementById('create-code-btn');
  if (createCodeBtn) {
    createCodeBtn.addEventListener('click', () => IndustryCodeManager.createIndustryCode());
  }

  const addSpecBtn = document.getElementById('add-spec-btn');
  if (addSpecBtn) {
    addSpecBtn.addEventListener('click', () => IndustryCodeManager.addSpecification());
  }

  const copyCodeBtn = document.getElementById('copy-code-btn');
  if (copyCodeBtn) {
    copyCodeBtn.addEventListener('click', () => IndustryCodeManager.copyCode());
  }

  console.log(' Event listeners setup complete');
}

function showPage(pageId) {
  // Hide all sections (controls and page-section)
  const sections = document.querySelectorAll('#main-app .controls, #main-app .page-section');
  sections.forEach(section => { section.style.display = 'none'; });

  // Show requested section
  const targetSection = document.getElementById(pageId);
  if (targetSection) {
    targetSection.style.display = 'block';

    if (pageId === 'client-management-section' && window.ClientManagement && typeof window.ClientManagement.init === 'function') {
      window.ClientManagement.init();
    }
  } else {
    console.error(`❌ Section ${pageId} not found`);
  }
}
window.showPage = showPage;

// Simple wrappers exposed to window
window.addValue = function (specId) {
  IndustryCodeManager.addValue(specId);
};
window.removeSpecification = function (specId) {
  IndustryCodeManager.removeSpecification(specId);
};

// Simple global logout handler
window.handleLogout = async function () {
  try {
    await AppState.auth.signOut();
    location.reload();
  } catch (e) {
    console.error('Logout failed', e);
    alert('Logout failed. Please try again.');
  }
};

// Auth view helpers (toggle login/register)
function showAuthView(target) {
  const groups = {
    login: ['login-panel','login-section','auth-login','login-form-container','login-card'],
    register: ['register-panel','register-section','auth-register','register-form-container','register-card']
  };

  // Hide all known auth containers
  [...groups.login, ...groups.register].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  // Show target group
  const toShow = groups[target] || [];
  let shown = false;
  toShow.forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'block'; shown = true; }
  });

  // If nothing matched, fallback to simple classes
  if (!shown) {
    document.querySelectorAll('.auth-login').forEach(el => el.style.display = (target === 'login' ? 'block' : 'none'));
    document.querySelectorAll('.auth-register').forEach(el => el.style.display = (target === 'register' ? 'block' : 'none'));
  }
}

// Expose required globals used by inline onclick in index.html
window.showLogin = function () {
  showAuthView('login');
};
window.showRegister = function () {
  showAuthView('register');
};
window.resetPassword = async function () {
  try {
    // Prefer existing Auth module if present
    if (window.Auth && typeof window.Auth.resetPassword === 'function') {
      await window.Auth.resetPassword();
      return;
    }
    // Fallback: ask for email or use login email field
    const email = (document.getElementById('login-email')?.value || '').trim() ||
                  prompt('Enter your email to receive a password reset link:') || '';
    if (!email) return;
    await AppState.auth.sendPasswordResetEmail(email);
    alert('Password reset email sent.');
  } catch (e) {
    console.error('resetPassword error', e);
    alert('Failed to send reset email. Please try again.');
  }
};