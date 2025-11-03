import * as Gen from './generation.js';
import * as UI from './ui.js';
import * as Templates from './templates.js';
import { config } from '../../config.js';  // NEW: Import config for Firebase/EmailJS

// js/features/auth.js: All Auth, Registration, Profile, and Master Creation Logic

// Globals (shared with other modules)
let currentUser = null;
let userRole = null;
let userIndustryCode = null;
let userTemplates = [];
let userSpecs = null;
let selectedSpecs = {};
let generationCount = 0;
let userProductName = '';
let currentLanguage = 'en';

export { currentUser, userRole, userIndustryCode, userTemplates, userSpecs, selectedSpecs, generationCount, userProductName, currentLanguage };

// EmailJS Setup
const EMAILJS_SERVICE_ID = 'service_sq0910p';
const EMAILJS_TEMPLATE_ID = 'template_6cykjb4';
emailjs.init(config.emailjs.publicKey);  // UPDATED: Use config

// Firebase Setup
firebase.initializeApp(config.firebaseConfig);  // UPDATED: Use config
const auth = firebase.auth();
const db = firebase.firestore();

export { auth, db };

// Main Auth Functions
export async function handleLogin(email, password) {
  try {
    UI.showMessage('login-msg', 'Signing in...', 'info');
    const result = await auth.signInWithEmailAndPassword(email, password);
    currentUser = result.user;
    await checkUserRole();
    await loadAccountInfo();
    UI.hideMessage('login-msg');
    UI.showMainApp(userRole);
  } catch (err) {
    let errorMessage = 'Login failed. Please try again.';
    if (err.code === 'auth/invalid-login-credentials' || err.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect email or password.';
    } else if (err.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email.';
    }
    UI.showMessage('login-msg', errorMessage, 'error');
  }
}

export async function resetPassword() {
  const email = document.getElementById('login-email')?.value.trim();
  if (!email) {
    UI.showMessage('login-msg', 'Please enter your email.', 'error');
    return;
  }
  try {
    await auth.sendPasswordResetEmail(email);
    UI.showMessage('login-msg', 'Reset email sent! Check your inbox.', 'success');
  } catch (err) {
    UI.showMessage('login-msg', 'Error: ' + err.message, 'error');
  }
}

export async function checkUserRole() {
  if (currentUser.email === 'langtechgroup5@gmail.com') {
    userRole = 'master';
    return;
  }
  const userDoc = await db.collection('users').doc(currentUser.uid).get();
  userRole = userDoc.exists ? userDoc.data().role || 'client' : 'client';
  userIndustryCode = userDoc.exists ? userDoc.data().industryCode || null : null;
  if (userRole === 'client') {
    UI.hideElement('setup-industry-group');
    UI.hideElement('account-industry-group');
  } else {
    UI.showElement('setup-industry-group');
    UI.showElement('account-industry-group');
  }
}

export function handleLogout() {
  auth.signOut().then(() => {
    currentUser = null;
    userRole = null;
    userTemplates = [];
    userSpecs = null;
    selectedSpecs = {};
    userProductName = '';
    userIndustryCode = null;
    UI.showAuth();
  }).catch(err => {
    console.error('Logout error:', err);
    UI.showMessage('template-status', 'Logout failed. Please try again.', 'error');
  });
}

export async function sendVerificationCode() {
  const email = document.getElementById('register-email')?.value.trim();
  const industryCode = document.getElementById('register-industry-code')?.value.trim();
  if (!email || !industryCode) {
    UI.showMessage('register-msg-step1', 'Please enter email and code.', 'error');
    return;
  }
  try {
    const codeDoc = await db.collection('industryCodes').doc(industryCode).get();
    if (!codeDoc.exists) {
      UI.showMessage('register-msg-step1', 'Invalid industry code.', 'error');
      return;
    }
    if (codeDoc.data().used) {
      UI.showMessage('register-msg-step1', 'This industry code has already been used.', 'error');
      return;
    }
    const userQuery = await db.collection('users').where('industryCode', '==', industryCode).limit(1).get();
    if (!userQuery.empty) {
      UI.showMessage('register-msg-step1', 'This industry code is already linked to an account.', 'error');
      return;
    }
    window._registerCode = Math.floor(100000 + Math.random() * 900000).toString();
    window._registerEmail = email;
    window._industryCode = industryCode;
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, { email: email, code: window._registerCode });
    UI.showMessage('register-msg-step1', 'Verification code sent!', 'success');
    UI.hideElement('register-step1');
    UI.showElement('register-step2');
  } catch (err) {
    UI.showMessage('register-msg-step1', 'Failed to send email: ' + err.message, 'error');
  }
}

export function verifyCode() {
  const code = document.getElementById('register-code')?.value.trim();
  if (code === window._registerCode) {
    UI.hideElement('register-step2');
    UI.showElement('register-step3');
    UI.hideMessage('register-msg-step2');
  } else {
    UI.showMessage('register-msg-step2', 'Incorrect code.', 'error');
  }
}

export async function completeRegistration() {
  const password = document.getElementById('register-password')?.value;
  const password2 = document.getElementById('register-password2')?.value;
  const name = document.getElementById('register-name')?.value.trim();
  if (password !== password2) {
    UI.showMessage('register-msg-step3', 'Passwords do not match.', 'error');
    return;
  }
  if (password.length < 6) {
    UI.showMessage('register-msg-step3', 'Password must be at least 6 characters.', 'error');
    return;
  }
  try {
    UI.showMessage('register-msg-step3', 'Creating account...', 'info');
    const result = await auth.createUserWithEmailAndPassword(window._registerEmail, password);
    currentUser = result.user;
    const codeDoc = await db.collection('industryCodes').doc(window._industryCode).get();
    const { industryName, specifications, productName } = codeDoc.data();
    const finalProductName = productName || 'Default Product';
    const style = specifications && specifications.style && specifications.style.length > 0 ? specifications.style[0] : 'default';
    await db.collection('users').doc(currentUser.uid).set({
      email: window._registerEmail,
      name: name,
      role: 'client',
      industryCode: window._industryCode,
      industryName: industryName,
      template: style,
      specifications: specifications || {},
      productName: finalProductName,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    await db.collection('industryCodes').doc(window._industryCode).update({
      used: true,
      usedBy: currentUser.uid
    });
    userRole = 'client';
    userTemplates = [style];
    userSpecs = specifications || {};
    selectedSpecs = Object.keys(userSpecs).reduce((acc, key) => {
      acc[key] = userSpecs[key][0] || '';
      return acc;
    }, {});
    userProductName = finalProductName;
    userIndustryCode = window._industryCode;
    UI.hideElement('setup-industry-group');
    UI.hideElement('account-industry-group');
    UI.showMessage('register-msg-step3', 'Account created successfully!', 'success');
    Gen.setGlobals(currentUser, userProductName, userSpecs, selectedSpecs, generationCount, currentLanguage);
    setTimeout(() => UI.showMainApp(userRole), 1000);
  } catch (err) {
    UI.showMessage('register-msg-step3', 'Error: ' + err.message, 'error');
  }
}

export async function loadAccountInfo() {
  try {
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      userProductName = data.productName || 'Default Product';
      userIndustryCode = data.industryCode || '000000';
      let industryDisplay = data.industryName || 'Not specified';
      if (userIndustryCode && userIndustryCode !== '000000') {
        try {
          const codeDoc = await db.collection('industryCodes').doc(userIndustryCode).get();
          industryDisplay = codeDoc.exists ? codeDoc.data().industryName : 'Unknown';
        } catch (err) {
          console.error('Error fetching industry code:', err);
        }
      }
      const accountInfo = document.getElementById('account-info');
      if (accountInfo) {
        accountInfo.innerHTML = `
          <p><strong>Name:</strong> ${data.name || 'Not set'}</p>
          <p><strong>Email:</strong> ${currentUser.email}</p>
          <p><strong>Industry:</strong> ${industryDisplay} (Code: ${userIndustryCode})</p>
          <p><strong>Template:</strong> ${data.template || 'None'}</p>
          <p><strong>Product Name:</strong> ${userProductName}</p>
        `;
      }
      UI.checkProductWarning();
      Gen.setGlobals(currentUser, userProductName, userSpecs, selectedSpecs, generationCount, currentLanguage);
    } else {
      userProductName = '';
      UI.showMessage('account-msg', 'Profile not found. Please set up your profile.', 'error');
      UI.showPage('setup-page', userRole);
    }
  } catch (err) {
    UI.showMessage('account-msg', 'Error loading account: ' + err.message, 'error');
  }
}

export async function handleSetup(e) {
  e.preventDefault();
  const name = document.getElementById('setup-name')?.value.trim();
  const productName = document.getElementById('setup-product')?.value.trim();
  const industry = userRole === 'master' ? document.getElementById('setup-industry')?.value.trim() : null;
  if (!name || !productName || productName.length < 2) {
    UI.showMessage('setup-msg', 'Please enter a valid name and product name (2+ characters).', 'error');
    return;
  }
  try {
    UI.showMessage('setup-msg', 'Saving profile...', 'info');
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    const existingData = userDoc.exists ? userDoc.data() : {};
    await db.collection('users').doc(currentUser.uid).set({
      name: name,
      industry: industry || existingData.industryName || null,
      industryCode: existingData.industryCode || null,
      productName: productName,
      setupCompleted: true
    }, { merge: true });
    await currentUser.updateProfile({ displayName: name });
    userProductName = productName;
    UI.checkProductWarning();
    UI.showMessage('setup-msg', 'Profile saved!', 'success');
    Gen.setGlobals(currentUser, userProductName, userSpecs, selectedSpecs, generationCount, currentLanguage);
    setTimeout(() => UI.showPage('template-page', userRole), 1000);
  } catch (err) {
    UI.showMessage('setup-msg', 'Error: ' + err.message, 'error');
  }
}

export async function handleAccountUpdate(e) {
  e.preventDefault();
  const name = document.getElementById('account-name')?.value.trim();
  const productName = document.getElementById('account-product')?.value.trim();
  const industry = userRole === 'master' ? document.getElementById('account-industry')?.value.trim() : null;
  if (!name || !productName || productName.length < 2) {
    UI.showMessage('account-msg', 'Please enter a valid name and product name (2+ characters).', 'error');
    return;
  }
  try {
    UI.showMessage('account-msg', 'Updating profile...', 'info');
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    const existingData = userDoc.exists ? userDoc.data() : {};
    await db.collection('users').doc(currentUser.uid).set({
      name: name,
      industry: industry || existingData.industryName || null,
      industryCode: existingData.industryCode || null,
      productName: productName
    }, { merge: true });
    await currentUser.updateProfile({ displayName: name });
    userProductName = productName;
    UI.checkProductWarning();
    UI.showMessage('account-msg', 'Profile updated!', 'success');
    UI.hideElement('account-form');
    UI.showElement('edit-account-btn');
    loadAccountInfo();
  } catch (err) {
    UI.showMessage('account-msg', 'Error: ' + err.message, 'error');
  }
}

export async function handleCreateAccount(e) {
  e.preventDefault();
  if (userRole !== 'master') {
    UI.showMessage('create-account-msg', 'Unauthorized access.', 'error');
    return;
  }
  const industryName = document.getElementById('industry-name')?.value;
  const customIndustryName = document.getElementById('custom-industry-name')?.value.trim();
  if (industryName === 'other' && !customIndustryName) {
    UI.showMessage('create-account-msg', 'Please enter a custom industry name.', 'error');
    return;
  }
  const effectiveIndustryName = industryName === 'other' ? customIndustryName : industryName;
  const productName = document.getElementById('industry-product')?.value.trim();
  const specGroups = document.querySelectorAll('#spec-container .spec-group');
  const specifications = {};
  let hasStyle = false;
  for (const group of specGroups) {
    const specId = group.dataset.specId;
    const type = document.getElementById(`spec-${specId}-type`)?.value;
    if (!type || type === '') continue;
    const customName = document.getElementById(`spec-${specId}-custom-name`)?.value.trim();
    if (type === 'other' && !customName) {
      UI.showMessage('create-account-msg', `Please enter a custom specification name for specification ${specId}.`, 'error');
      return;
    }
    const values = Array.from(document.querySelectorAll(`#spec-${specId}-values .form-group input`))
      .map(input => input.value.trim())
      .filter(value => value);
    if (values.length === 0) {
      UI.showMessage('create-account-msg', `Please enter at least one value for specification ${specId}.`, 'error');
      return;
    }
    const key = type === 'other' ? customName.toLowerCase().replace(/\s+/g, '') : type;
    specifications[key] = values;
    if (key === 'style') hasStyle = true;
  }
  if (!effectiveIndustryName || !productName || productName.length < 2 || !hasStyle) {
    UI.showMessage('create-account-msg', 'Please fill all required fields, including a Style specification with at least one value.', 'error');
    return;
  }
  try {
    UI.showMessage('create-account-msg', 'Generating industry code...', 'info');
    const industryCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    await db.collection('industryCodes').doc(industryCode).set({
      industryName: effectiveIndustryName,
      specifications: specifications,
      productName: productName,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      used: false
    });
    const industryCodeElement = document.getElementById('industry-code');
    if (industryCodeElement) {
      industryCodeElement.textContent = industryCode;
      UI.showElement('generated-code');
    }
    UI.showMessage('create-account-msg', 'Industry code generated!', 'success');
    document.getElementById('create-account-form')?.reset();
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
        <button type="button" class="btn btn-add-value" onclick="UI.addValue(1)">Add Value</button>
      </div>
    `;
    setupSpecListeners(1);
  } catch (err) {
    UI.showMessage('create-account-msg', 'Error: ' + err.message, 'error');
  }
}

// Export stubs for generation (implement in generation.js)
export function generateImages() {
  console.log('generateImages stub - implement in generation module');
}