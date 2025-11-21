const IndustryCodeManager = {
  specCount: 0,

  addSpecification() {
    const container = document.getElementById('spec-container');
    if (!container) return;

    const existingSpecs = container.querySelectorAll('.spec-group').length;
    
    if (existingSpecs >= 5) {
      UI.showMessage('create-account-msg', 'Maximum 5 specifications allowed.', 'error');
      return;
    }

    this.specCount++;
    const specId = this.specCount;
    const specGroup = document.createElement('div');
    specGroup.className = 'spec-group';
    specGroup.dataset.specId = specId;

    specGroup.innerHTML = `
      <div class="form-group">
        <label for="spec-${specId}-type">Specification ${specId}</label>
        <select id="spec-${specId}-type">
          <option value="">Select type...</option>
          <option value="size">Size</option>
          <option value="colorScheme">Color Scheme</option>
          <option value="style">Style</option>
          <option value="tone">Tone</option>
          <option value="dimensions">Dimensions</option>
          <option value="material">Material</option>
          <option value="finish">Finish</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div class="value-group" id="spec-${specId}-values">
        <div class="form-group">
          <label for="spec-${specId}-value-1">Value 1</label>
          <input id="spec-${specId}-value-1" type="text" required placeholder="Enter value">
        </div>
      </div>
      <button type="button" class="btn btn-add-value" onclick="window.addValue(${specId})">
        Add Value
      </button>
      <button type="button" class="btn btn-danger" onclick="window.removeSpecification(${specId})" 
              style="margin-left: 10px;">
        Remove Specification
      </button>
    `;

    container.appendChild(specGroup);
  },

  addValue(specId) {
    const valuesContainer = document.getElementById(`spec-${specId}-values`);
    if (!valuesContainer) return;

    const valueCount = valuesContainer.querySelectorAll('.form-group').length;

    if (valueCount >= 5) {
      UI.showMessage('create-account-msg', 'Maximum 5 values per specification.', 'error');
      return;
    }

    const valueId = valueCount + 1;
    const valueGroup = document.createElement('div');
    valueGroup.className = 'form-group';

    valueGroup.innerHTML = `
      <label for="spec-${specId}-value-${valueId}">Value ${valueId}</label>
      <input id="spec-${specId}-value-${valueId}" type="text" required placeholder="Enter value">
    `;

    valuesContainer.appendChild(valueGroup);
  },

  removeSpecification(specId) {
    const specGroup = document.querySelector(`.spec-group[data-spec-id="${specId}"]`);
    if (specGroup) {
      specGroup.remove();
    }
  },

  collectSpecifications() {
    const specs = {};
    const specGroups = document.querySelectorAll('.spec-group');

    specGroups.forEach(group => {
      const specId = group.dataset.specId;
      const typeSelect = document.getElementById(`spec-${specId}-type`);
      
      if (!typeSelect || !typeSelect.value) return;

      const specType = typeSelect.value;
      const values = [];

      const valueInputs = group.querySelectorAll(`#spec-${specId}-values input`);
      valueInputs.forEach(input => {
        const value = input.value.trim();
        if (value) values.push(value);
      });

      if (values.length > 0) {
        specs[specType] = values;
      }
    });

    return specs;
  },

  async createIndustryCode() {
    if (AppState.userRole !== 'master' && AppState.userRole !== 'admin') {
      UI.showMessage('create-account-msg', 'Access denied.', 'error');
      return;
    }

    const industryName = document.getElementById('industry-name')?.value.trim();
    const productName = document.getElementById('industry-product')?.value.trim();
    const specs = this.collectSpecifications();

    if (!industryName || industryName === '') {
      UI.showMessage('create-account-msg', 'Please select an industry.', 'error');
      return;
    }

    if (!productName || productName.length < 2) {
      UI.showMessage('create-account-msg', 'Please enter a valid product name.', 'error');
      return;
    }

    try {
      UI.showMessage('create-account-msg', 'Creating industry code...', 'info');

      let code;
      let exists = true;
      let attempts = 0;

      while (exists && attempts < 10) {
        code = Math.floor(100000 + Math.random() * 900000).toString();
        const doc = await AppState.db.collection('industryCodes').doc(code).get();
        exists = doc.exists;
        attempts++;
      }

      if (exists) {
        throw new Error('Failed to generate unique code');
      }

      await AppState.db.collection('industryCodes').doc(code).set({
        industryName: industryName,
        productName: productName,
        specifications: specs,
        used: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: AppState.currentUser.uid
      });

      document.getElementById('industry-code').textContent = code;
      UI.showElement('generated-code');

      UI.showMessage('create-account-msg', ' Industry code created successfully!', 'success');

      document.getElementById('create-account-form')?.reset();
      document.getElementById('spec-container').innerHTML = '';
      this.specCount = 0;

    } catch (err) {
      console.error('❌ Create code error:', err);
      UI.showMessage('create-account-msg', 'Error creating code: ' + err.message, 'error');
    }
  },

  copyCode() {
    const code = document.getElementById('industry-code')?.textContent;
    if (!code) return;

    navigator.clipboard.writeText(code).then(() => {
      UI.showMessage('create-account-msg', '✅ Code copied to clipboard!', 'success');
    }).catch(() => {
      UI.showMessage('create-account-msg', 'Failed to copy code.', 'error');
    });
  }
};
