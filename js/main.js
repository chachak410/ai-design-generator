// js/main.js: Orchestrator - Imports Modules, Sets Up Events & Language

// Imports
import * as Auth from './features/auth.js';
import * as UI from './features/ui.js';
import * as Gen from './features/generation.js';
import * as Templates from './features/templates.js';
import * as Records from './features/records.js';

// Expose Functions for HTML onclicks & Event Listeners
window.handleLogin = Auth.handleLogin;
window.resetPassword = Auth.resetPassword;
window.sendVerificationCode = Auth.sendVerificationCode;
window.verifyCode = Auth.verifyCode;
window.completeRegistration = Auth.completeRegistration;
window.handleSetup = Auth.handleSetup;
window.handleAccountUpdate = Auth.handleAccountUpdate;
window.handleCreateAccount = Auth.handleCreateAccount;
window.handleLogout = Auth.handleLogout;
window.showPage = UI.showPage;
window.addValue = UI.addValue;
window.addSpecification = UI.addSpecification;
window.copyCode = UI.copyCode;
window.checkProductWarning = UI.checkProductWarning;
window.generateImages = Gen.generateImages;
window.downloadImage = Gen.downloadImage;
window.downloadBoth = Gen.downloadBoth;
window.loadTemplates = Templates.loadTemplates;
window.updatePromptDisplay = Templates.updatePromptDisplay;
window.loadRecords = Records.loadRecords;

// DOMContentLoaded: Setup Event Listeners Using Modules
document.addEventListener('DOMContentLoaded', function() {
  // Login/Registration Events
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      handleLogin(email, password);
    });
  }

  const sendCodeBtn = document.getElementById('send-code-btn');
  if (sendCodeBtn) sendCodeBtn.addEventListener('click', sendVerificationCode);

  const verifyCodeBtn = document.getElementById('verify-code-btn');
  if (verifyCodeBtn) verifyCodeBtn.addEventListener('click', verifyCode);

  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
      e.preventDefault();
      completeRegistration();
    });
  }

  const backToStep1 = document.getElementById('back-to-step1');
  if (backToStep1) {
    backToStep1.addEventListener('click', function() {
      UI.hideElement('register-step2');
      UI.showElement('register-step1');
      UI.hideMessage('register-msg-step2');
    });
  }

  const backToStep2 = document.getElementById('back-to-step2');
  if (backToStep2) {
    backToStep2.addEventListener('click', function() {
      UI.hideElement('register-step3');
      UI.showElement('register-step2');
      UI.hideMessage('register-msg-step3');
    });
  }

  // Logout, Setup, Account Events
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  const setupForm = document.getElementById('setup-form');
  if (setupForm) setupForm.addEventListener('submit', handleSetup);

  const accountForm = document.getElementById('account-form');
  if (accountForm) accountForm.addEventListener('submit', handleAccountUpdate);

  const editAccountBtn = document.getElementById('edit-account-btn');
  if (editAccountBtn) {
    editAccountBtn.addEventListener('click', function() {
      UI.hideElement('account-info');
      UI.hideElement('edit-account-btn');
      UI.showElement('account-form');
      // Load existing data (from Auth)
      const userDocRef = db.collection('users').doc(currentUser.uid);
      userDocRef.get().then(doc => {
        if (doc.exists) {
          const data = doc.data();
          document.getElementById('account-name').value = data.name || '';
          document.getElementById('account-industry').value = data.industry || '';
          document.getElementById('account-product').value = data.productName || '';
        }
      });
    });
  }

  const cancelEdit = document.getElementById('cancel-edit');
  if (cancelEdit) {
    cancelEdit.addEventListener('click', function() {
      UI.hideElement('account-form');
      UI.showElement('edit-account-btn');
      UI.showElement('account-info');
    });
  }

  // Generation & Creation Events
  const generateBtn = document.getElementById('generate-images-btn');
  if (generateBtn) generateBtn.addEventListener('click', generateImages);

  const createAccountForm = document.getElementById('create-account-form');
  if (createAccountForm) createAccountForm.addEventListener('submit', handleCreateAccount);

  const addSpecBtn = document.getElementById('add-spec-btn');
  if (addSpecBtn) addSpecBtn.addEventListener('click', addSpecification);

  // Industry & Reset Events
  const industryName = document.getElementById('industry-name');
  if (industryName) {
    industryName.addEventListener('change', function() {
      if (this.value === 'other') {
        UI.showElement('custom-industry-group');
        document.getElementById('custom-industry-name').setAttribute('required', 'true');
      } else {
        UI.hideElement('custom-industry-group');
        document.getElementById('custom-industry-name').removeAttribute('required');
      }
    });
  }

  const resetSpecs = document.getElementById('reset-specs');
  if (resetSpecs) {
    resetSpecs.addEventListener('click', function() {
      document.getElementById('spec-container').innerHTML = `
        <div class="spec-group" data-spec-id="1">
          <div class="form-group">
            <label for="spec-1-type">Specification 1*</label>
            <select id="spec-1-type" required>
              <option value="">Select specification</option>
              <option value="size">Size</option>
              <option value="colorScheme">Color Scheme</option>
              <option value="style">Style</option>
              <option value="tone">Tone</option>
              <option value="dimensions">Dimensions</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="form-group hidden" id="spec-1-custom-group">
            <label for="spec-1-custom-name">Custom Specification Name</label>
            <input id="spec-1-custom-name" type="text" placeholder="Enter specification name (e.g., Font)">
          </div>
          <div class="value-group" id="spec-1-values">
            <div class="form-group">
              <label for="spec-1-value-1">Value 1</label>
              <input id="spec-1-value-1" type="text" required placeholder="Enter value (e.g., 1:1)">
            </div>
          </div>
          <button type="button" class="btn btn-add-value" onclick="addValue(1)">Add Value</button>
        </div>
      `;
      setupSpecListeners(1);
      UI.hideMessage('create-account-msg');
    });
  }

  // Template Checkbox Changes
  const templateCheckboxes = document.querySelectorAll('#template-checkboxes input');
  templateCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', Templates.updatePromptDisplay);
  });

  // Spec Select Changes
  const specSelects = document.querySelectorAll('#spec-selections select');
  specSelects.forEach(select => {
    select.addEventListener('change', function() {
      selectedSpecs[this.dataset.specKey] = this.value;
      Templates.updatePromptDisplay();
    });
  });

  // Records Page Load
  const recordsNav = document.querySelector('[onclick="showPage(\'records-page\')"]');
  if (recordsNav) {
    recordsNav.addEventListener('click', function() {
      UI.showPage('records-page', userRole);
      Records.loadRecords();
    });
  }

  // Firebase Auth State Listener
  Auth.auth.onAuthStateChanged(async (user) => {
    if (user) {
      Auth.currentUser = user;
      await Auth.checkUserRole();
      await Auth.loadAccountInfo();
      UI.showMainApp(Auth.userRole);
    } else {
      UI.showAuth();
    }
  });

  // Language Init (from original)
  const savedLang = localStorage.getItem('userLanguage') || 'en';
  setLang(savedLang);
});

// Language Switch Function (from original)
function setLang(lang) {
  currentLanguage = lang;
  localStorage.setItem('userLanguage', lang);

  if (window.i18n && window.i18n.setLanguage) {
    window.i18n.setLanguage(lang);
  }

  document.querySelectorAll('[data-lang]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  document.body.className = lang === 'en' ? 'theme-en' : 'theme-zh';
}

// Note: db/auth globals from Auth (use Auth.db, Auth.auth if needed in main)
const { db, auth } = Auth;  // If needed