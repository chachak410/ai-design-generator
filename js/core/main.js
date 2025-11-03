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
            console.log(' User profile not found, showing setup');
            UI.showMainApp();
            UI.showPage('setup-page');
            return;
          }

          const userData = doc.data();
          console.log(' User data loaded:', { productName: userData.productName, role: userData.role });

          AppState.userRole = userData.role || 'client';
          AppState.userProductName = userData.productName || '';
          AppState.userTemplates = userData.template ? [userData.template] : [];
          AppState.userSpecs = userData.specifications || {};

          UI.showMainApp();
          UI.toggleMasterUI(AppState.userRole === 'master' || AppState.userRole === 'admin');

          if (!userData.setupCompleted && AppState.userRole !== 'master' && AppState.userRole !== 'admin') {
            UI.showPage('setup-page');
          } else {
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

  const setupForm = document.getElementById('setup-form');
  if (setupForm) {
    setupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      Setup.handleSetup();
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

window.showPage = function(pageId) {
  UI.showPage(pageId, AppState.userRole);

  if (pageId === 'account-page') {
    Profile.loadAccountInfo();
  } else if (pageId === 'template-page') {
    TemplateManager.loadTemplates();
  } else if (pageId === 'records-page') {
    RecordManager.loadRecords();
  }
};

window.addValue = function(specId) {
  IndustryCodeManager.addValue(specId);
};

window.removeSpecification = function(specId) {
  IndustryCodeManager.removeSpecification(specId);
};
