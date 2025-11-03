/**
 * AI Design Generator - Main Entry Point
 * Clean, modular structure without ES6 modules
 */

// ==================== GLOBAL STATE ====================
const AppState = {
  auth: null,
  db: null,
  currentUser: null,
  userRole: null,
  userProductName: '',
  userSpecs: null,
  userTemplates: [],
  selectedSpecs: {},
  generationCount: 0
};

// ==================== CONFIG ====================
const AppConfig = {
  firebase: {
    apiKey: "AIzaSyC0P-rmy6ZiKCBnivZQBahKWaPcqg4nDnU",
    authDomain: "image-generator-c51e2.firebaseapp.com",
    projectId: "image-generator-c51e2",
    storageBucket: "image-generator-c51e2.firebasestorage.app",
    messagingSenderId: "222706847155",
    appId: "1:222706847155:web:824453eca61077f5f0cfc6",
    measurementId: "G-JSK1FHFEMT"
  },
  emailjs: {
    serviceId: 'service_sq0910p',
    templateId: 'template_6cykjb4',
    userId: 'DjaueAhkuIzk5gj2x'
  },
  api: {
    stability: 'sk-RwqmAp2Q9nr3RgoLh8g04tgrprjlGhrDMYD8JGv1IxF9WnLQ'
  }
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 DOM loaded, initializing app...');

  try {
    // Initialize Firebase
    firebase.initializeApp(AppConfig.firebase);
    AppState.auth = firebase.auth();
    AppState.db = firebase.firestore();
    console.log('✅ Firebase initialized');

    // Initialize EmailJS
    emailjs.init(AppConfig.emailjs.userId);
    console.log('✅ EmailJS initialized');

    // Setup auth listener
    AppState.auth.onAuthStateChanged(handleAuthStateChange);

    // Setup event listeners
    setupEventListeners();

    console.log('✅ App initialization complete');

  } catch (err) {
    console.error('❌ Initialization error:', err);
    alert('Failed to initialize app: ' + err.message);
  }
});

// ==================== AUTH STATE HANDLER ====================
async function handleAuthStateChange(user) {
  if (user) {
    AppState.currentUser = user;
    console.log('👤 User signed in:', user.email);

    await loadUserData();
    
    UI.showMainApp();
    UI.toggleMasterUI(AppState.userRole === 'master');
    UI.checkProductWarning(AppState.userProductName);

    const needsSetup = !user.displayName || !AppState.userProductName || AppState.userProductName.trim().length < 2;
    
    if (needsSetup) {
      showPage('setup-page');
    } else {
      showPage('template-page');
    }

  } else {
    AppState.currentUser = null;
    AppState.userRole = null;
    AppState.userProductName = '';
    console.log('👋 User signed out');
    
    UI.showAuth();
    UI.showLogin();
  }
}

// ==================== LOAD USER DATA ====================
async function loadUserData() {
  try {
    if (AppState.currentUser.email === 'langtechgroup5@gmail.com') {
      AppState.userRole = 'master';
    }

    const doc = await AppState.db.collection('users').doc(AppState.currentUser.uid).get();
    
    if (doc.exists) {
      const data = doc.data();
      AppState.userRole = data.role || AppState.userRole || 'client';
      AppState.userProductName = data.productName || '';
      AppState.userSpecs = data.specifications || {};
      AppState.userTemplates = data.template ? [data.template] : [];
      
      console.log('✅ User data loaded:', { 
        productName: AppState.userProductName, 
        role: AppState.userRole 
      });
    }
  } catch (err) {
    console.error('❌ Error loading user data:', err);
  }
}

// ==================== PAGE NAVIGATION ====================
function showPage(pageId) {
  UI.showPage(pageId, AppState.userRole);
  
  switch(pageId) {
    case 'account-page':
      Profile.loadAccountInfo();
      break;
    case 'template-page':
      TemplateManager.loadTemplates();
      break;
    case 'records-page':
      RecordManager.loadRecords();
      break;
    case 'create-account-page':
      if (AppState.userRole !== 'master') {
        UI.showMessage('template-status', 'Access denied', 'error');
        showPage('template-page');
      }
      break;
  }
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  // Login
  document.getElementById('login-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    Auth.login();
  });

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    Auth.logout();
  });

  // Registration steps
  document.getElementById('send-code-btn')?.addEventListener('click', () => {
    Registration.sendVerificationCode();
  });

  document.getElementById('verify-code-btn')?.addEventListener('click', () => {
    Registration.verifyCode();
  });

  document.getElementById('register-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    Registration.completeRegistration();
  });

  // Setup
  document.getElementById('setup-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    Setup.handleSetup();
  });

  // Account
  document.getElementById('edit-account-btn')?.addEventListener('click', () => {
    Profile.showEditAccount();
  });

  document.getElementById('cancel-edit')?.addEventListener('click', () => {
    Profile.cancelEdit();
  });

  document.getElementById('account-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    Profile.updateAccount();
  });

  // Generate images
  document.getElementById('generate-images-btn')?.addEventListener('click', () => {
    Generator.generateImages();
  });

  // Industry codes
  document.getElementById('create-account-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    IndustryCodeManager.createIndustryCode();
  });

  document.getElementById('add-spec-btn')?.addEventListener('click', () => {
    IndustryCodeManager.addSpecification();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('account-form')?.classList.contains('hidden')) {
      Profile.cancelEdit();
    }

    if (window.currentImages?.length === 2) {
      if (e.key === 'ArrowLeft') Generator.handleFeedback(0);
      else if (e.key === 'ArrowRight') Generator.handleFeedback(1);
      else if (e.key === 'ArrowDown') Generator.handleFeedback('tie');
    }
  });

  console.log('✅ Event listeners setup complete');
}

// ==================== LANGUAGE SWITCHER ====================
function setLang(lang) {
  if (window.i18n?.setLanguage) {
    window.i18n.setLanguage(lang);
    localStorage.setItem('userLanguage', lang);
  }
}

// ==================== GLOBAL EXPORTS ====================
window.showPage = showPage;
window.setLang = setLang;
window.showLogin = () => UI.showLogin();
window.showRegister = () => UI.showRegister();
window.resetPassword = () => Auth.resetPassword();
window.copyCode = () => IndustryCodeManager.copyCode();
window.addSpecification = () => IndustryCodeManager.addSpecification();
window.addValue = (specId) => IndustryCodeManager.addValue(specId);
window.removeSpecification = (specId) => IndustryCodeManager.removeSpecification(specId);