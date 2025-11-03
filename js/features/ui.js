// js/features/ui.js: DOM Manipulations, Messages, Page Switching

// General DOM Helpers
export function showElement(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('hidden');
    el.style.display = 'block';
  } else {
    console.error(`Element ${id} not found`);
  }
}

export function hideElement(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('hidden');
    el.style.display = 'none';
  } else {
    console.error(`Element ${id} not found`);
  }
}

export function showMessage(id, message, type = 'info') {
  const el = document.getElementById(id);
  if (el) {
    el.innerHTML = message;
    el.className = `message ${type}`;
    el.style.display = 'block';
  } else {
    console.error(`Message ${id} not found`);
  }
}

export function hideMessage(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

// Page-Specific UI
export function showLogin() {
  showElement('login-form');
  hideElement('register-form');
  showElement('switch-to-register');
  hideElement('switch-to-login');
  hideMessage('login-msg');
}

export function showRegister() {
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

export function showMainApp(userRole) {
  const authContainer = document.getElementById('auth-container');
  const mainApp = document.getElementById('main-app');
  if (authContainer && mainApp) {
    authContainer.style.display = 'none';
    mainApp.classList.add('show');
    if (userRole === 'master') {
      showElement('create-account-link');
    } else {
      hideElement('create-account-link');
    }
  } else {
    console.error('DOM elements not found');
    showMessage('login-msg', 'Page error. Please refresh.', 'error');
    showAuth();
  }
}

export function showAuth() {
  const authContainer = document.getElementById('auth-container');
  const mainApp = document.getElementById('main-app');
  if (authContainer && mainApp) {
    authContainer.style.display = 'block';
    mainApp.classList.remove('show');
    hideElement('product-warning');
    showLogin();
  } else {
    console.error('DOM elements not found');
    showMessage('login-msg', 'Page error. Please refresh.', 'error');
  }
}

export function showPage(pageId, userRole) {
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
  // Load page-specific content (call from other modules)
}

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

export function addValue(specId) {
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

export function addSpecification() {
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

export function copyCode() {
  const code = document.getElementById('industry-code')?.textContent;
  if (code) {
    navigator.clipboard.writeText(code).then(() => {
      showMessage('create-account-msg', 'Industry code copied!', 'success');
    }).catch(() => {
      showMessage('create-account-msg', 'Failed to copy code.', 'error');
    });
  }
}

export function checkProductWarning() {
  const warning = document.getElementById('product-warning');
  if (warning) {
    if (userProductName && userProductName.trim().length >= 2) {
      hideElement('product-warning');
    } else {
      showElement('product-warning');
      warning.innerHTML = '<strong>Warning: Product name not set.</strong> <a href="#" onclick="showPage(\'account-page\'); return false;">Update now</a>';
    }
  }
}

// Stubs for page loads (use from other modules later)
export function loadTemplates() { console.log('loadTemplates stub'); }
export function loadRecords() { console.log('loadRecords stub'); }