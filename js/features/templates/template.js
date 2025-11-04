const TemplateManager = {
  async loadTemplates() {
    if (!AppState.currentUser) {
      UI.showMessage('template-status', 'Please sign in to view templates.', 'error');
      return;
    }

    try {
      // Check if user is master OR admin
      if (AppState.userRole === 'master' || AppState.userRole === 'admin') {
        AppState.userTemplates = ['modern', 'classic', 'minimalist', 'luxury', 'eco'];
        AppState.userSpecs = null;
        AppState.selectedSpecs = {};
      } else {
        const doc = await AppState.db.collection('users').doc(AppState.currentUser.uid).get();
        
        if (!doc.exists) {
          UI.showMessage('template-status', 'Profile not found.', 'error');
          window.showPage('setup-page');
          return;
        }

        const data = doc.data();
        AppState.userTemplates = data.template ? [data.template] : [];
        AppState.userSpecs = data.specifications || {};
        AppState.userProductName = data.productName || '';

        AppState.selectedSpecs = Object.keys(AppState.userSpecs).reduce((acc, key) => {
          acc[key] = AppState.userSpecs[key][0] || '';
          return acc;
        }, {});
      }

      this.renderTemplateUI();
      this.updatePromptDisplay();

    } catch (err) {
      UI.showMessage('template-status', 'Error loading templates: ' + err.message, 'error');
    }
  },

  renderTemplateUI() {
    const checkboxContainer = document.getElementById('template-checkboxes');
    if (checkboxContainer) {
      checkboxContainer.innerHTML = AppState.userTemplates.map(template => `
        <label>
          <input type="checkbox" value="${template}" checked>
          ${template.charAt(0).toUpperCase() + template.slice(1)}
        </label>
      `).join('');

      checkboxContainer.querySelectorAll('input').forEach(cb => {
        cb.addEventListener('change', () => this.updatePromptDisplay());
      });
    }

    const specContainer = document.getElementById('spec-selections');
    if (specContainer) {
      if (!AppState.userSpecs || Object.keys(AppState.userSpecs).length === 0) {
        specContainer.innerHTML = '';
      } else {
        specContainer.innerHTML = Object.entries(AppState.userSpecs).map(([key, values]) => `
          <div class="form-group">
            <label for="spec-select-${key}">
              ${key.charAt(0).toUpperCase() + key.slice(1)}
            </label>
            <select id="spec-select-${key}" data-spec-key="${key}">
              ${values.map(value => `<option value="${value}">${value}</option>`).join('')}
            </select>
          </div>
        `).join('');

        specContainer.querySelectorAll('select').forEach(select => {
          select.addEventListener('change', (e) => {
            AppState.selectedSpecs[e.target.dataset.specKey] = e.target.value;
            this.updatePromptDisplay();
          });
        });
      }
    }

    const productDisplay = document.getElementById('product-display');
    if (productDisplay && AppState.userProductName) {
      productDisplay.textContent = `Product: ${AppState.userProductName}`;
      UI.showElement('product-display');
    }

    this.updateGenerationCounter();
  },

  updatePromptDisplay() {
    const selectedTemplates = Array.from(
      document.querySelectorAll('#template-checkboxes input:checked')
    ).map(cb => cb.value);

    let extra = '';
    if (AppState.userSpecs && Object.keys(AppState.selectedSpecs).length > 0) {
      extra = Object.entries(AppState.selectedSpecs)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      if (extra) extra = ', ' + extra;
    }

    const promptDisplay = document.getElementById('prompt-display');
    if (promptDisplay) {
      if (selectedTemplates.length > 0 && AppState.userProductName) {
        promptDisplay.textContent = 
          `Generate a design for ${AppState.userProductName} in ${selectedTemplates.join(', ')} style${extra}`;
      } else if (!AppState.userProductName) {
        promptDisplay.textContent = 'Please set your product name in Account Settings.';
      } else {
        promptDisplay.textContent = 'Please select at least one template.';
      }
      UI.showElement('prompt-display');
    }
  },

  updateGenerationCounter() {
    const counter = document.getElementById('generation-counter');
    if (counter) {
      counter.textContent = `Generations: ${AppState.generationCount}/20`;
      if (AppState.generationCount >= 18) {
        counter.style.color = '#e74c3c';
      } else if (AppState.generationCount >= 15) {
        counter.style.color = '#f39c12';
      } else {
        counter.style.color = '#666';
      }
    }
  }
};
