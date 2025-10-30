// EmailJS
    const EMAILJS_SERVICE_ID = 'service_sq0910p';
    const EMAILJS_TEMPLATE_ID = 'template_6cykjb4';
    emailjs.init('DjaueAhkuIzk5gj2x');

    // Firebase
    const firebaseConfig = {
      apiKey: "AIzaSyC0P-rmy6ZiKCBnivZQBahKWaPcqg4nDnU",
      authDomain: "image-generator-c51e2.firebaseapp.com",
      projectId: "image-generator-c51e2",
      storageBucket: "image-generator-c51e2.firebasestorage.app",
      messagingSenderId: "222706847155",
      appId: "1:222706847155:web:824453eca61077f5f0cfc6",
      measurementId: "G-JSK1FHFEMT"
    };
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // API Keys
    const STABILITY_API_KEY = 'sk-RwqmAp2Q9nr3RgoLh8g04tgrprjlGhrDMYD8JGv1IxF9WnLQ';
    const HUGGINGFACE_API_KEY = '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';

    // Global state
    let currentUser = null;
    let userRole = null;
    let userTemplates = [];
    let userSpecs = null;
    let selectedSpecs = {};
    let generationCount = 0;
    let userProductName = '';
    let userIndustryCode = null;
    let currentLanguage = 'en'; // 添加这一行来追踪当前语言

    // UI Helpers
    function showElement(id) { 
      const el = document.getElementById(id); 
      if (el) { 
        el.classList.remove('hidden'); 
        el.style.display = 'block'; 
      } else {
        console.error(`Element with ID ${id} not found`);
      }
    }
    function hideElement(id) { 
      const el = document.getElementById(id); 
      if (el) { 
        el.classList.add('hidden'); 
        el.style.display = 'none'; 
      } else {
        console.error(`Element with ID ${id} not found`);
      }
    }
    function showMessage(id, message, type = 'info') {
      const el = document.getElementById(id);
      if (el) { 
        el.innerHTML = message; 
        el.className = `message ${type}`; 
        el.style.display = 'block'; 
      } else {
        console.error(`Message element with ID ${id} not found`);
      }
    }
    function hideMessage(id) { 
      const el = document.getElementById(id); 
      if (el) el.style.display = 'none'; 
    }
    function showLogin() {
      showElement('login-form'); 
      hideElement('register-form');
      showElement('switch-to-register'); 
      hideElement('switch-to-login');
      hideMessage('login-msg');
    }
    function showRegister() {
      hideElement('login-form'); 
      showElement('register-form');
      hideElement('switch-to-register'); 
      showElement('switch-to-login');
      showElement('register-step1'); 
      hideElement('register-step2'); 
      hideElement('register-step3');
      document.getElementById('register-form')?.reset();
      hideMessage('register-msg-step1'); 
      hideMessage('register-msg-step2'); 
      hideMessage('register-msg-step3');
    }
    function showPage(pageId) {
      const pages = ['setup-page', 'account-page', 'template-page', 'records-page', 'create-account-page'];
      if (pageId === 'create-account-page' && userRole !== 'master') {
        showMessage('template-status', 'Access denied: Only master accounts can create industry codes.', 'error');
        pageId = 'template-page';
      }
      pages.forEach(id => hideElement(id));
      showElement(pageId);
      if (pageId === 'create-account-page') {
        hideElement('generated-code');
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
            <button type="button" class="btn btn-add-value" onclick="addValue(1)">Add Value</button>
          </div>
        `;
        hideMessage('create-account-msg');
        setupSpecListeners(1);
      }
      if (pageId === 'template-page') loadTemplates();
      if (pageId === 'records-page') loadRecords();
      if (pageId === 'account-page') loadAccountInfo();
      checkProductWarning();
    }
    function showMainApp() {
      const authContainer = document.getElementById('auth-container');
      const mainApp = document.getElementById('main-app');
      if (authContainer && mainApp) {
        authContainer.style.display = 'none';
        mainApp.classList.add('show');
        if (userRole === 'master') showElement('create-account-link');
        else hideElement('create-account-link');
        checkProductWarning();
        showPage((currentUser && (!currentUser.displayName || !userProductName || userProductName.trim().length < 2)) ? 'setup-page' : 'template-page');
      } else {
        console.error('DOM elements not found:', { authContainer, mainApp });
        showMessage('login-msg', 'Page error. Please refresh.', 'error');
        showAuth();
      }
    }
    function showAuth() {
      const authContainer = document.getElementById('auth-container');
      const mainApp = document.getElementById('main-app');
      if (authContainer && mainApp) {
        authContainer.style.display = 'block';
        mainApp.classList.remove('show');
        hideElement('product-warning');
        showLogin();
      } else {
        console.error('DOM elements not found:', { authContainer, mainApp });
        showMessage('login-msg', 'Page error. Please refresh.', 'error');
      }
    }

    // Product Warning
    function checkProductWarning() {
      const warning = document.getElementById('product-warning');
      if (warning) {
        if (userProductName && userProductName.trim().length >= 2) {
          hideElement('product-warning');
        } else {
          showElement('product-warning');
        }
      }
    }

    // Copy Industry Code
    function copyCode() {
      const code = document.getElementById('industry-code')?.textContent;
      if (code) {
        navigator.clipboard.writeText(code).then(() => {
          showMessage('create-account-msg', 'Industry code copied!', 'success');
        }).catch(() => {
          showMessage('create-account-msg', 'Failed to copy code.', 'error');
        });
      }
    }

    // Specification Management
    function setupSpecListeners(specId) {
      const typeSelect = document.getElementById(`spec-${specId}-type`);
      if (typeSelect) {
        typeSelect.addEventListener('change', function() {
          const customGroup = document.getElementById(`spec-${specId}-custom-group`);
          if (this.value === 'other') {
            showElement(`spec-${specId}-custom-group`);
            document.getElementById(`spec-${specId}-custom-name`)?.setAttribute('required', 'true');
          } else {
            hideElement(`spec-${specId}-custom-group`);
            document.getElementById(`spec-${specId}-custom-name`)?.removeAttribute('required');
          }
        });
      }
    }
    function addValue(specId) {
      const valuesContainer = document.getElementById(`spec-${specId}-values`);
      if (!valuesContainer) return;
      const valueCount = valuesContainer.querySelectorAll('.form-group').length;
      if (valueCount >= 5) {
        showMessage('create-account-msg', `Maximum 5 values allowed for specification ${specId}.`, 'error');
        return;
      }
      const valueId = valueCount + 1;
      const valueGroup = document.createElement('div');
      valueGroup.className = 'form-group';
      valueGroup.innerHTML = `
        <label for="spec-${specId}-value-${valueId}">Value ${valueId}</label>
        <input id="spec-${specId}-value-${valueId}" type="text" required placeholder="Enter value (e.g., 1:1)">
      `;
      valuesContainer.appendChild(valueGroup);
    }
    function addSpecification() {
      const container = document.getElementById('spec-container');
      if (!container) return;
      const specCount = container.querySelectorAll('.spec-group').length;
      if (specCount >= 5) {
        showMessage('create-account-msg', 'Maximum 5 specifications allowed.', 'error');
        return;
      }
      const specId = specCount + 1;
      const specGroup = document.createElement('div');
      specGroup.className = 'spec-group';
      specGroup.dataset.specId = specId;
      specGroup.innerHTML = `
        <div class="form-group">
          <label for="spec-${specId}-type">Specification ${specId}</label>
          <select id="spec-${specId}-type">
            <option value="">None</option>
            <option value="size">Size</option>
            <option value="colorScheme">Color Scheme</option>
            <option value="style">Style</option>
            <option value="tone">Tone</option>
            <option value="dimensions">Dimensions</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div class="form-group hidden" id="spec-${specId}-custom-group">
          <label for="spec-${specId}-custom-name">Custom Specification Name</label>
          <input id="spec-${specId}-custom-name" type="text" placeholder="Enter specification name (e.g., Font)">
        </div>
        <div class="value-group" id="spec-${specId}-values">
          <div class="form-group">
            <label for="spec-${specId}-value-1">Value 1</label>
            <input id="spec-${specId}-value-1" type="text" required placeholder="Enter value (e.g., 1:1)">
          </div>
        </div>
        <button type="button" class="btn btn-add-value" onclick="addValue(${specId})">Add Value</button>
      `;
      container.appendChild(specGroup);
      setupSpecListeners(specId);
    }

    // Authentication
    async function handleLogin(email, password) {
      try {
        showMessage('login-msg', 'Signing in...', 'info');
        const result = await auth.signInWithEmailAndPassword(email, password);
        currentUser = result.user;
        await checkUserRole();
        await loadAccountInfo();
        hideMessage('login-msg');
        showMainApp();
      } catch (err) {
        let errorMessage = 'Login failed. Please try again.';
        if (err.code === 'auth/invalid-login-credentials' || err.code === 'auth/wrong-password') {
          errorMessage = 'Incorrect email or password.';
        } else if (err.code === 'auth/user-not-found') {
          errorMessage = 'No account found with this email.';
        }
        showMessage('login-msg', errorMessage, 'error');
      }
    }
    async function resetPassword() {
      const email = document.getElementById('login-email')?.value.trim();
      if (!email) {
        showMessage('login-msg', 'Please enter your email.', 'error');
        return;
      }
      try {
        await auth.sendPasswordResetEmail(email);
        showMessage('login-msg', 'Reset email sent! Check your inbox.', 'success');
      } catch (err) {
        showMessage('login-msg', 'Error: ' + err.message, 'error');
      }
    }
    async function checkUserRole() {
      if (currentUser.email === 'langtechgroup5@gmail.com') {
        userRole = 'master';
        return;
      }
      const userDoc = await db.collection('users').doc(currentUser.uid).get();
      userRole = userDoc.exists ? userDoc.data().role || 'client' : 'client';
      userIndustryCode = userDoc.exists ? userDoc.data().industryCode || null : null;
      if (userRole === 'client') {
        hideElement('setup-industry-group');
        hideElement('account-industry-group');
      } else {
        showElement('setup-industry-group');
        showElement('account-industry-group');
      }
    }
    function handleLogout() {
      auth.signOut().then(() => {
        currentUser = null;
        userRole = null;
        userTemplates = [];
        userSpecs = null;
        selectedSpecs = {};
        userProductName = '';
        userIndustryCode = null;
        showAuth();
      }).catch(err => {
        console.error('Logout error:', err);
        showMessage('template-status', 'Logout failed. Please try again.', 'error');
      });
    }

    // Registration
    async function sendVerificationCode() {
      const email = document.getElementById('register-email')?.value.trim();
      const industryCode = document.getElementById('register-industry-code')?.value.trim();
      if (!email || !industryCode) {
        showMessage('register-msg-step1', 'Please enter email and code.', 'error');
        return;
      }
      try {
        const codeDoc = await db.collection('industryCodes').doc(industryCode).get();
        if (!codeDoc.exists) {
          showMessage('register-msg-step1', 'Invalid industry code.', 'error');
          return;
        }
        if (codeDoc.data().used) {
          showMessage('register-msg-step1', 'This industry code has already been used.', 'error');
          return;
        }
        const userQuery = await db.collection('users')
          .where('industryCode', '==', industryCode)
          .limit(1)
          .get();
        if (!userQuery.empty) {
          showMessage('register-msg-step1', 'This industry code is already linked to an account.', 'error');
          return;
        }
        window._registerCode = Math.floor(100000 + Math.random() * 900000).toString();
        window._registerEmail = email;
        window._industryCode = industryCode;
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
          email: email,
          code: window._registerCode
        });
        showMessage('register-msg-step1', 'Verification code sent!', 'success');
        hideElement('register-step1');
        showElement('register-step2');
      } catch (err) {
        showMessage('register-msg-step1', 'Failed to send email: ' + err.message, 'error');
      }
    }
    function verifyCode() {
      const code = document.getElementById('register-code')?.value.trim();
      if (code === window._registerCode) {
        hideElement('register-step2');
        showElement('register-step3');
        hideMessage('register-msg-step2');
      } else {
        showMessage('register-msg-step2', 'Incorrect code.', 'error');
      }
    }
    async function completeRegistration() {
      const password = document.getElementById('register-password')?.value;
      const password2 = document.getElementById('register-password2')?.value;
      const name = document.getElementById('register-name')?.value.trim();
      if (password !== password2) {
        showMessage('register-msg-step3', 'Passwords do not match.', 'error');
        return;
      }
      if (password.length < 6) {
        showMessage('register-msg-step3', 'Password must be at least 6 characters.', 'error');
        return;
      }
      try {
        showMessage('register-msg-step3', 'Creating account...', 'info');
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
        hideElement('setup-industry-group');
        hideElement('account-industry-group');
        showMessage('register-msg-step3', 'Account created successfully!', 'success');
        setTimeout(() => showMainApp(), 1000);
      } catch (err) {
        showMessage('register-msg-step3', 'Error: ' + err.message, 'error');
      }
    }

    // Setup Page
    async function handleSetup(e) {
      e.preventDefault();
      const name = document.getElementById('setup-name')?.value.trim();
      const productName = document.getElementById('setup-product')?.value.trim();
      const industry = userRole === 'master' ? document.getElementById('setup-industry')?.value.trim() : null;
      if (!name || !productName || productName.length < 2) {
        showMessage('setup-msg', 'Please enter a valid name and product name (2+ characters).', 'error');
        return;
      }
      try {
        showMessage('setup-msg', 'Saving profile...', 'info');
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
        checkProductWarning();
        showMessage('setup-msg', 'Profile saved!', 'success');
        setTimeout(() => showPage('template-page'), 1000);
      } catch (err) {
        showMessage('setup-msg', 'Error: ' + err.message, 'error');
      }
    }

    // Account Page
    async function loadAccountInfo() {
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
          checkProductWarning();
        } else {
          userProductName = '';
          showMessage('account-msg', 'Profile not found. Please set up your profile.', 'error');
          showPage('setup-page');
        }
      } catch (err) {
        showMessage('account-msg', 'Error loading account: ' + err.message, 'error');
      }
    }
    async function handleAccountUpdate(e) {
      e.preventDefault();
      const name = document.getElementById('account-name')?.value.trim();
      const productName = document.getElementById('account-product')?.value.trim();
      const industry = userRole === 'master' ? document.getElementById('account-industry')?.value.trim() : null;
      if (!name || !productName || productName.length < 2) {
        showMessage('account-msg', 'Please enter a valid name and product name (2+ characters).', 'error');
        return;
      }
      try {
        showMessage('account-msg', 'Updating profile...', 'info');
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
        checkProductWarning();
        showMessage('account-msg', 'Profile updated!', 'success');
        hideElement('account-form');
        showElement('edit-account-btn');
        loadAccountInfo();
      } catch (err) {
        showMessage('account-msg', 'Error: ' + err.message, 'error');
      }
    }

// Image Generation Functions
function sanitizePrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    console.error('Invalid prompt:', prompt);
    return '';
  }
  // 更严格的清理：移除所有可能破坏 JSON 的字符
  const sanitized = prompt
    .replace(/[\n\r\t"']/g, ' ')  // 移除换行、制表符、引号
    .replace(/[{}[\]]/g, ' ')     // 移除 JSON 结构字符
    .replace(/[%()<>]/g, ' ')     // 移除其他潜在问题字符
    .replace(/[^\x20-\x7E]/g, ' ') // 移除非 ASCII 字符
    .replace(/\s+/g, ' ')         // 合并多余空格
    .trim()
    .substring(0, 1000);          // 限制长度
  console.log('Sanitized Prompt:', sanitized); // 调试：打印清理后的 prompt
  return sanitized;
}

async function generateWithPollinations(prompt, seed, width = 768, height = 1024, retries = 3) {
  try {
    const sanitizedPrompt = sanitizePrompt(prompt);
    if (!sanitizedPrompt) throw new Error('Prompt is empty or invalid');
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(sanitizedPrompt)}?width=${width}&height=${height}&seed=${seed}&nologo=True`;
    console.log('Pollinations AI URL:', url);
    const response = await fetch(url, { method: 'GET', mode: 'cors' });
    if (!response.ok) {
      if (response.status === 502 && retries > 0) {
        console.warn(`Retrying Pollinations AI request (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return generateWithPollinations(prompt, seed, width, height, retries - 1);
      }
      throw new Error(`Pollinations AI error: ${response.status}`);
    }
    const blob = await response.blob();
    return { provider: 'Pollinations AI', url: URL.createObjectURL(blob) };
  } catch (err) {
    console.error('Pollinations AI error:', err);
    return null;
  }
}

async function generateWithStability(prompt, seed, width = 1024, height = 1024, retries = 3) {
  try {
    const sanitizedPrompt = sanitizePrompt(prompt);
    if (!sanitizedPrompt) throw new Error('Prompt is empty or invalid');
    
    const payload = {
      text_prompts: [
        {
          text: sanitizedPrompt,
          weight: 1
        }
      ],
      cfg_scale: 7,
      height: height,
      width: width,
      steps: 30,
      seed: seed
    };
    
    const jsonString = JSON.stringify(payload);
    console.log('Stability AI Payload (raw JSON):', jsonString);
    
    const url = 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image';
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${STABILITY_API_KEY}`
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: jsonString
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Stability AI Raw Response:', errorText);
      if ((response.status === 429 || response.status === 503) && retries > 0) {
        console.warn(`Retrying Stability AI request (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return generateWithStability(prompt, seed, width, height, retries - 1);
      }
      throw new Error(`Stability AI error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    if (data.artifacts && data.artifacts.length > 0) {
      return {
        provider: 'Stability AI',
        url: `data:image/png;base64,${data.artifacts[0].base64}`
      };
    }
    throw new Error('No images returned by Stability AI');
  } catch (err) {
    console.error('Stability AI error:', err);
    return null;
  }
}

async function generateWithHuggingFace(prompt, seed, width = 1024, height = 1024, retries = 3) {
  try {
    const sanitizedPrompt = sanitizePrompt(prompt);
    if (!sanitizedPrompt) throw new Error('Prompt is empty or invalid');
    
    const payload = {
      inputs: sanitizedPrompt,
      parameters: {
        width: width,
        height: height,
        seed: seed,
        num_inference_steps: 28,
        guidance_scale: 7.0,
        negative_prompt: 'low quality, blurry, distorted'
      }
    };
    
    const jsonString = JSON.stringify(payload);
    console.log('Hugging Face Payload (raw JSON):', jsonString);
    
    const url = 'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev';
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`
    };
    
    const modelCheck = await fetch(url, { method: 'HEAD', headers });
    if (!modelCheck.ok) {
      console.warn('Hugging Face model may not be loaded. Status:', modelCheck.status);
      if (modelCheck.status === 503) {
        throw new Error('Model loading... Please wait and retry.');
      }
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: jsonString
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Hugging Face Raw Response:', errorText);
      if ((response.status === 429 || response.status === 503) && retries > 0) {
        console.warn(`Retrying Hugging Face request (${retries} attempts left): ${errorText}`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        return generateWithHuggingFace(prompt, seed, width, height, retries - 1);
      }
      throw new Error(`Hugging Face error: ${response.status} - ${errorText}`);
    }
    
    const blob = await response.blob();
    if (blob.size === 0) {
      throw new Error('Empty response from Hugging Face');
    }
    return { provider: 'Hugging Face', url: URL.createObjectURL(blob) };
  } catch (err) {
    console.error('Hugging Face error:', err);
    return null;
  }
}

   // Image Generation
    async function generateImages() {
      if (!currentUser) {
        showMessage('template-status', 'Please sign in.', 'error');
        return;
      }
      if (!userProductName || userProductName.trim().length < 2) {
        showMessage('template-status', 'Product name required. <a href="#" onclick="showPage(\'account-page\'); return false;">Update now</a>', 'error');
        showPage('account-page');
        return;
      }
      const selectedTemplates = Array.from(document.querySelectorAll('#template-checkboxes input:checked')).map(input => input.value);
      if (selectedTemplates.length === 0) {
        showMessage('template-status', 'Please select at least one template.', 'error');
        return;
      }
      if (generationCount >= 20) {
        showMessage('template-status', 'Maximum generation limit reached.', 'error');
        return;
      }
      const llmSelect = document.getElementById('llm-select')?.value;
      if (!llmSelect) {
        showMessage('template-status', 'Please select an AI model.', 'error');
        return;
      }
      let extra = '';
if (userSpecs) {
  extra = Object.entries(selectedSpecs)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
  if (extra) extra = ', ' + extra;
}

// 根据当前语言生成对应的提示词
let basePrompt = '';
if (currentLanguage === 'zh') {
  // 简体中文提示词
  basePrompt = `一个精美的${userProductName}产品设计图，${selectedTemplates.join('、')}风格${extra}，高质量，细节丰富，专业级`;
} else if (currentLanguage === 'yue') {
  // 繁体中文提示词
  basePrompt = `一個精美嘅${userProductName}產品設計圖，${selectedTemplates.join('、')}風格${extra}，高質量，細節豐富，專業級`;
} else {
  // 英文提示词（默认）
  basePrompt = `A beautiful product design for ${userProductName}, ${selectedTemplates.join(', ')} style${extra}, high quality, detailed, professional`;
}

      showMessage('template-status', `Generating images with ${llmSelect}...`, 'info');
      const generateBtn = document.getElementById('generate-images-btn');
      if (generateBtn) generateBtn.disabled = true;

      const generators = {
        pollinations: generateWithPollinations,
        stability: generateWithStability,
        huggingface: generateWithHuggingFace
      };
      const dimensions = {
        pollinations: { width: 768, height: 1024 },
        stability: { width: 1024, height: 1024 },
        huggingface: { width: 1024, height: 1024 }
      };
      const llms = ['pollinations', 'stability', 'huggingface'];
      const selectedIndex = llms.indexOf(llmSelect);
      const orderedLLMs = [llmSelect, ...llms.filter(llm => llm !== llmSelect)];

      let images = [];
      let attempts = 0;
      const maxAttempts = 6;
      const seed = Date.now();

      while (images.length < 2 && attempts < maxAttempts && generationCount < 20) {
        const llm = orderedLLMs[attempts % orderedLLMs.length];
        const prompt = images.length === 0 ? basePrompt : `${basePrompt} (variation ${images.length + 1})`;
        const { width, height } = dimensions[llm];
        try {
          console.log(`Attempting ${llm} for image ${images.length + 1}`);
          const image = await generators[llm](prompt, seed + attempts, width, height);
          if (image) {
            images.push(image);
            generationCount++;
          } else {
            console.warn(`No image generated by ${llm}, trying next provider`);
          }
        } catch (err) {
          console.error(`Error with ${llm}:`, err);
        }
        attempts++;
      }

      if (images.length === 1 && attempts < maxAttempts && generationCount < 20) {
        const nextLLM = orderedLLMs[attempts % orderedLLMs.length];
        const prompt = `${basePrompt} (variation 2)`;
        const { width, height } = dimensions[nextLLM];
        try {
          const image = await generators[nextLLM](prompt, seed + attempts, width, height);
          if (image) {
            images.push(image);
            generationCount++;
          }
        } catch (err) {
          console.error(`Error with ${nextLLM}:`, err);
        }
      }

      try {
        if (images.length === 2) {
          renderImages(images);
          const generationRef = db.collection('generations').doc();
          await generationRef.set({
            userId: currentUser.uid,
            templates: selectedTemplates,
            productName: userProductName,
            specifications: selectedSpecs,
            images: images.map(item => ({ provider: item.provider, url: item.url })),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          const userGenerations = await db.collection('generations')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();
          userGenerations.docs.slice(3).forEach(doc => doc.ref.delete());
          showMessage('template-status', 'Images generated successfully!', 'success');
        } else {
          const failedProviders = orderedLLMs.slice(0, attempts).join(', ');
          showMessage('template-status', `Failed to generate images with ${failedProviders}. Please try Pollinations or check API keys.`, 'error');
        }
      } catch (err) {
        showMessage('template-status', 'Error saving generation: ' + err.message, 'error');
      } finally {
        if (generateBtn) generateBtn.disabled = false;
      }
    }

    function renderImages(items) {
      const container = document.getElementById('generated-images');
      const pairDiv = document.getElementById('image-pair');
      const feedbackDiv = document.getElementById('feedback-buttons');
      if (container && pairDiv && feedbackDiv) {
        pairDiv.innerHTML = '';
        feedbackDiv.innerHTML = '';
        container.classList.remove('hidden');

        items.forEach((item, idx) => {
          const imgContainer = document.createElement('div');
          const img = document.createElement('img');
          img.src = item.url;
          img.alt = `Generated image ${idx + 1} from ${item.provider}`;
          img.onload = () => img.classList.add('loaded');
          imgContainer.appendChild(img);
          const providerLabel = document.createElement('div');
          providerLabel.textContent = item.provider;
          imgContainer.appendChild(providerLabel);
          pairDiv.appendChild(imgContainer);
        });

        feedbackDiv.innerHTML = `
          <button class="btn-like-this" onclick="downloadImage('${items[0].url}', 0)">I like this (${items[0].provider})</button>
          <button class="btn-like-that" onclick="downloadImage('${items[1].url}', 1)">I like that (${items[1].provider})</button>
          <button class="btn-both-bad" onclick="handleBothBad()">Both bad</button>
        `;
      }
    }

    function downloadImage(url, idx) {
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-image-${idx + 1}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showMessage('template-status', `Image ${idx + 1} downloaded!`, 'success');
    }
    function handleBothBad() {
      generationCount++;
      generateImages();
    }

    // Template Page
    async function loadTemplates() {
      if (!currentUser) {
        showMessage('template-status', 'Please sign in.', 'error');
        return;
      }
      try {
        if (userRole === 'master') {
          userTemplates = ['modern', 'classic', 'minimalist'];
          userSpecs = null;
          selectedSpecs = {};
        } else {
          const userDoc = await db.collection('users').doc(currentUser.uid).get();
          if (!userDoc.exists) {
            showMessage('template-status', 'Profile not found. Please set up your profile.', 'error');
            showPage('setup-page');
            return;
          }
          const data = userDoc.data();
          userTemplates = data.template ? [data.template] : [];
          userSpecs = data.specifications || {};
          selectedSpecs = Object.keys(userSpecs).reduce((acc, key) => {
            acc[key] = userSpecs[key][0] || '';
            return acc;
          }, {});
          userProductName = data.productName || 'Default Product';
          userIndustryCode = data.industryCode || null;
        }
        if (!userProductName || userProductName.trim().length < 2) {
          showMessage('template-status', 'Product name required. <a href="#" onclick="showPage(\'account-page\'); return false;">Update now</a>', 'error');
          showPage('account-page');
          checkProductWarning();
          return;
        }
        const checkboxes = document.getElementById('template-checkboxes');
        if (checkboxes) {
          checkboxes.innerHTML = userTemplates.map(template => `
            <label><input type="checkbox" value="${template}" checked> ${template.charAt(0).toUpperCase() + template.slice(1)}</label>
          `).join('');
        }
        const productDisplay = document.getElementById('product-display');
        if (productDisplay) {
          productDisplay.textContent = `Product: ${userProductName}`;
          showElement('product-display');
        }
        const specSelections = document.getElementById('spec-selections');
        if (specSelections) {
          specSelections.innerHTML = Object.entries(userSpecs).map(([key, values]) => `
            <div class="form-group">
              <label for="spec-select-${key}">${key.charAt(0).toUpperCase() + key.slice(1)}</label>
              <select id="spec-select-${key}" data-spec-key="${key}">
                ${values.map(value => `<option value="${value}">${value}</option>`).join('')}
              </select>
            </div>
          `).join('');
        }
        document.querySelectorAll('#spec-selections select').forEach(select => {
          select.addEventListener('change', function() {
            selectedSpecs[this.dataset.specKey] = this.value;
            updatePromptDisplay();
          });
        });
        if (Object.keys(userSpecs).length > 0) {
          showElement('spec-selections');
        } else {
          hideElement('spec-selections');
        }
        updatePromptDisplay();
        document.querySelectorAll('#template-checkboxes input').forEach(checkbox => {
          checkbox.addEventListener('change', updatePromptDisplay);
        });
        checkProductWarning();
      } catch (err) {
        showMessage('template-status', 'Error loading templates: ' + err.message, 'error');
      }
    }
    function updatePromptDisplay() {
      const selectedTemplates = Array.from(document.querySelectorAll('#template-checkboxes input:checked')).map(input => input.value);
      let extra = '';
      if (userSpecs) {
        extra = Object.entries(selectedSpecs)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        if (extra) extra = ', ' + extra;
      }
      const promptDisplay = document.getElementById('prompt-display');
      if (promptDisplay) {
        promptDisplay.textContent = selectedTemplates.length > 0
          ? `Generate a design for ${userProductName} in ${selectedTemplates.join(', ')} style${extra}`
          : 'Please select at least one template.';
        showElement('prompt-display');
      }
    }

    // Past Records
    async function loadRecords() {
      const recordsList = document.getElementById('records-list');
      if (!recordsList) return;
      recordsList.innerHTML = '';
      try {
        const generations = await db.collection('generations')
          .where('userId', '==', currentUser.uid)
          .orderBy('createdAt', 'desc')
          .limit(3)
          .get();
        if (generations.empty) {
          showMessage('records-msg', 'No generation records found.', 'info');
          return;
        }
        generations.forEach(doc => {
          const data = doc.data();
          const specsText = data.specifications ? Object.entries(data.specifications).map(([key, value]) => `${key}: ${value}`).join(', ') : '';
          data.images.forEach((item, idx) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
              <div class="badge">${data.templates.join(', ')} (${data.productName}${specsText ? ', ' + specsText : ''}) - ${item.provider}</div>
              <img src="${item.url}" alt="Generated image" onload="this.style.opacity=1" style="opacity:0.5; transition:opacity 0.5s"/>
              <button onclick="downloadImage('${item.url}', ${idx})" class="btn">Download</button>
            `;
            recordsList.appendChild(card);
          });
        });
        hideMessage('records-msg');
      } catch (err) {
        showMessage('records-msg', 'Error loading records: ' + err.message, 'error');
      }
    }

    // Create Account (Master)
    async function handleCreateAccount(e) {
      e.preventDefault();
      if (userRole !== 'master') {
        showMessage('create-account-msg', 'Unauthorized access.', 'error');
        return;
      }
      const industryName = document.getElementById('industry-name')?.value;
      const customIndustryName = document.getElementById('custom-industry-name')?.value.trim();
      if (industryName === 'other' && !customIndustryName) {
        showMessage('create-account-msg', 'Please enter a custom industry name.', 'error');
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
          showMessage('create-account-msg', `Please enter a custom specification name for specification ${specId}.`, 'error');
          return;
        }
        const values = Array.from(document.querySelectorAll(`#spec-${specId}-values .form-group input`))
          .map(input => input.value.trim())
          .filter(value => value);
        if (values.length === 0) {
          showMessage('create-account-msg', `Please enter at least one value for specification ${specId}.`, 'error');
          return;
        }
        const key = type === 'other' ? customName.toLowerCase().replace(/\s+/g, '') : type;
        specifications[key] = values;
        if (key === 'style') hasStyle = true;
      }
      if (!effectiveIndustryName || !productName || productName.length < 2 || !hasStyle) {
        showMessage('create-account-msg', 'Please fill all required fields, including a Style specification with at least one value.', 'error');
        return;
      }
      try {
        showMessage('create-account-msg', 'Generating industry code...', 'info');
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
          showElement('generated-code');
          showMessage('create-account-msg', 'Industry code generated!', 'success');
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
              <button type="button" class="btn btn-add-value" onclick="addValue(1)">Add Value</button>
            </div>
          `;
          setupSpecListeners(1);
        }
      } catch (err) {
        showMessage('create-account-msg', 'Error: ' + err.message, 'error');
      }
    }

        // Event Listeners
    document.addEventListener('DOMContentLoaded', function() {
      document.getElementById('login-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        handleLogin(email, password);
      });
      document.getElementById('send-code-btn').addEventListener('click', sendVerificationCode);
      document.getElementById('verify-code-btn').addEventListener('click', verifyCode);
      document.getElementById('register-form').addEventListener('submit', function(e) {
        e.preventDefault();
        completeRegistration();
      });
      document.getElementById('back-to-step1').addEventListener('click', function() {
        hideElement('register-step2');
        showElement('register-step1');
        hideMessage('register-msg-step2');
      });
      document.getElementById('back-to-step2').addEventListener('click', function() {
        hideElement('register-step3');
        showElement('register-step2');
        hideMessage('register-msg-step3');
      });
      document.getElementById('logout-btn').addEventListener('click', handleLogout);
      document.getElementById('setup-form').addEventListener('submit', handleSetup);
      document.getElementById('account-form').addEventListener('submit', handleAccountUpdate);
      document.getElementById('edit-account-btn').addEventListener('click', function() {
        hideElement('account-info');
        hideElement('edit-account-btn');
        showElement('account-form');
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
      document.getElementById('cancel-edit').addEventListener('click', function() {
        hideElement('account-form');
        showElement('edit-account-btn');
        showElement('account-info');
      });
      document.getElementById('generate-images-btn').addEventListener('click', generateImages);
      document.getElementById('create-account-form').addEventListener('submit', handleCreateAccount);
      document.getElementById('add-spec-btn').addEventListener('click', addSpecification);
      document.getElementById('industry-name').addEventListener('change', function() {
        if (this.value === 'other') {
          showElement('custom-industry-group');
          document.getElementById('custom-industry-name').setAttribute('required', 'true');
        } else {
          hideElement('custom-industry-group');
          document.getElementById('custom-industry-name').removeAttribute('required');
        }
      });
      document.getElementById('reset-specs').addEventListener('click', function() {
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
        hideMessage('create-account-msg');
      });

      // Firebase Auth State
      auth.onAuthStateChanged(async user => {
        if (user) {
          currentUser = user;
          await checkUserRole();
          await loadAccountInfo();
          showMainApp();
        } else {
          showAuth();
        }
      });
    });
    // === 语言切换 + 主题色（贴到 main.js 最底部）===
function setLang(lang) {
  currentLanguage = lang;
  if (!window.i18n) return;
  window.i18n.setLanguage(lang);

  // 按钮高亮
  document.querySelectorAll('[data-lang]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  // 整页主题色
  document.body.className = lang === 'en' ? 'theme-en' : 'theme-zh';
}

// 初始化主题
document.addEventListener('DOMContentLoaded', () => {
  if (window.i18n) {
    setLang(window.i18n.currentLang);
  }
});
// 页面加载时检查保存的语言设置
document.addEventListener('DOMContentLoaded', function() {
  const savedLang = localStorage.getItem('userLanguage') || 'en';
  currentLanguage = savedLang;
  // 如果你的 i18n.js 有 setLang 函数，调用它
  if (typeof setLang === 'function') {
    setLang(savedLang);
  }
});
