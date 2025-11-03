// js/features/templates.js: Templates Loading, Specs, Prompt Building
import * as UI from './ui.js';
import * as Gen from './generation.js';

// Globals (shared)
let userRole;
let userTemplates = [];
let userSpecs = null;
let selectedSpecs = {};
let userProductName = '';
let currentLanguage = 'en';

// Load Templates (full original logic)
export async function loadTemplates() {
  if (!currentUser) {
    UI.showMessage('template-status', 'Please sign in.', 'error');
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
        UI.showMessage('template-status', 'Profile not found. Please set up your profile.', 'error');
        UI.showPage('setup-page', userRole);
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
      UI.showMessage('template-status', 'Product name required. <a href="#" onclick="UI.showPage(\'account-page\', userRole); return false;">Update now</a>', 'error');
      UI.showPage('account-page', userRole);
      UI.checkProductWarning();
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
      UI.showElement('product-display');
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
      UI.showElement('spec-selections');
    } else {
      UI.hideElement('spec-selections');
    }
    updatePromptDisplay();
    document.querySelectorAll('#template-checkboxes input').forEach(checkbox => {
      checkbox.addEventListener('change', updatePromptDisplay);
    });
    UI.checkProductWarning();
  } catch (err) {
    UI.showMessage('template-status', 'Error loading templates: ' + err.message, 'error');
  }
}

// Update Prompt Display
export function updatePromptDisplay() {
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
    UI.showElement('prompt-display');
  }
}

// Spec Management (from master creation, but reusable)
export function setupSpecListeners(specId) {
  const typeSelect = document.getElementById(`spec-${specId}-type`);
  if (typeSelect) {
    typeSelect.addEventListener('change', function() {
      const customGroup = document.getElementById(`spec-${specId}-custom-group`);
      if (this.value === 'other') {
        UI.showElement(`spec-${specId}-custom-group`);
        document.getElementById(`spec-${specId}-custom-name`)?.setAttribute('required', 'true');
      } else {
        UI.hideElement(`spec-${specId}-custom-group`);
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
    UI.showMessage('create-account-msg', `Maximum 5 values allowed for specification ${specId}.`, 'error');
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
    UI.showMessage('create-account-msg', 'Maximum 5 specifications allowed.', 'error');
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

// Set globals from auth (call after login/registration)
export function setGlobals(user, role, industryCode, templates, specs, selected, genCount, productName, lang) {
  currentUser = user;
  userRole = role;
  userIndustryCode = industryCode;
  userTemplates = templates;
  userSpecs = specs;
  selectedSpecs = selected;
  generationCount = genCount;
  userProductName = productName;
  currentLanguage = lang;
}

// Export stubs for loading (use in main)
export function loadTemplates() { console.log('loadTemplates stub - full in templates'); }
export function loadRecords() { console.log('loadRecords stub - full in records'); }