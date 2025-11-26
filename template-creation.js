/**
 * Template Creation Module
 * Handles template creation with industry-specific settings (Tone, Size, Style)
 */

const TemplateCreation = {
  initialized: false,
  currentIndustry: null,
  currentTemplates: [],
  
  // Industry-specific configurations
  industryConfigs: {
    ecommerce: {
      name: 'E-commerce',
      tones: ['Professional', 'Friendly', 'Urgent', 'Luxurious', 'Casual'],
      styles: ['Modern', 'Minimalist', 'Bold', 'Elegant', 'Vibrant'],
      sizes: ['IG Post (1:1)', 'IG Story (9:16)', 'Facebook Post (1.91:1)', 'Banner (16:9)', 'Square (1:1)']
    },
    fnb: {
      name: 'F&B',
      tones: ['Appetizing', 'Warm', 'Inviting', 'Fresh', 'Energetic'],
      styles: ['Rustic', 'Modern', 'Classic', 'Artisan', 'Clean'],
      sizes: ['IG Post (1:1)', 'IG Story (9:16)', 'Menu Card (A4)', 'Banner (16:9)', 'Square (1:1)']
    },
    retail: {
      name: 'Retail',
      tones: ['Persuasive', 'Friendly', 'Exciting', 'Trustworthy', 'Dynamic'],
      styles: ['Contemporary', 'Minimal', 'Colorful', 'Classic', 'Trendy'],
      sizes: ['IG Post (1:1)', 'IG Story (9:16)', 'Flyer (A5)', 'Banner (16:9)', 'Square (1:1)']
    },
    beauty: {
      name: 'Beauty',
      tones: ['Elegant', 'Luxurious', 'Confident', 'Natural', 'Glamorous'],
      styles: ['Luxe', 'Minimalist', 'Feminine', 'Bold', 'Sophisticated'],
      sizes: ['IG Post (1:1)', 'IG Story (9:16)', 'Product Card (1:1)', 'Banner (16:9)', 'Portrait (4:5)']
    }
  },

  /**
   * Initialize the template creation module
   */
  async init() {
    if (!this.checkAccess()) return;
    
    console.log('✅ Initializing Template Creation');
    this.setupEventListeners();
    this.renderIndustrySelector();
    this.initialized = true;
  },

  /**
   * Check if user has access to template creation
   */
  checkAccess() {
    const role = AppState.userRole;
    if (role !== 'master' && role !== 'admin') {
      UI.showMessage('template-status', 'Access denied. Master or Admin role required.', 'error');
      return false;
    }
    return true;
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const industrySelector = document.getElementById('industry-selector');
    if (industrySelector) {
      industrySelector.addEventListener('change', (e) => this.onIndustryChange(e.target.value));
    }

    const saveTemplateBtn = document.getElementById('save-template-settings-btn');
    if (saveTemplateBtn) {
      saveTemplateBtn.addEventListener('click', () => this.saveTemplateSettings());
    }
  },

  /**
   * Render industry selector dropdown
   */
  renderIndustrySelector() {
    const selector = document.getElementById('industry-selector');
    if (!selector) return;

    selector.innerHTML = '<option value="">-- Select Industry --</option>';
    Object.entries(this.industryConfigs).forEach(([key, config]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = config.name;
      selector.appendChild(option);
    });
  },

  /**
   * Handle industry selection change
   */
  async onIndustryChange(industryKey) {
    if (!industryKey) {
      document.getElementById('template-editor').innerHTML = '';
      return;
    }

    this.currentIndustry = industryKey;
    const config = this.industryConfigs[industryKey];
    
    // Load existing templates for this industry if any
    await this.loadIndustryTemplates(industryKey);
    
    // Render the template editor
    this.renderTemplateEditor(config);
  },

  /**
   * Load existing templates for an industry from Firestore
   */
  async loadIndustryTemplates(industryKey) {
    try {
      const doc = await AppState.db.collection('industryTemplates').doc(industryKey).get();
      if (doc.exists) {
        const data = doc.data();
        this.currentTemplates = data.templates || [];
      } else {
        this.currentTemplates = [];
      }
    } catch (err) {
      console.error('Error loading industry templates:', err);
      this.currentTemplates = [];
    }
  },

  /**
   * Render the template editor UI
   */
  renderTemplateEditor(config) {
    const editor = document.getElementById('template-editor');
    if (!editor) return;

    editor.innerHTML = `
      <div class="template-editor-container">
        <h3>${config.name} Template Configuration</h3>
        
        <!-- Universal/Specific Toggle -->
        <div class="form-group">
          <label class="toggle-label">
            <input type="checkbox" id="universal-toggle" checked>
            <span>Apply as Universal settings for all templates in this industry</span>
          </label>
          <small style="color: #666; display: block; margin-top: 5px;">
            ⚠️ These settings will only apply to new templates. Existing client templates remain unaffected.
          </small>
        </div>

        <!-- Tone Settings -->
        <div class="settings-section">
          <h4>Tone Options</h4>
          <div id="tone-options" class="options-container">
            ${config.tones.map((tone, idx) => `
              <label class="option-item">
                <input type="checkbox" name="tone" value="${tone}" ${idx === 0 ? 'checked' : ''}>
                <span>${tone}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <!-- Size Settings -->
        <div class="settings-section">
          <h4>Size Options</h4>
          <div id="size-options" class="options-container">
            ${config.sizes.map((size, idx) => `
              <label class="option-item">
                <input type="checkbox" name="size" value="${size}" ${idx === 0 ? 'checked' : ''}>
                <span>${size}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <!-- Style Settings -->
        <div class="settings-section">
          <h4>Style Options</h4>
          <div id="style-options" class="options-container">
            ${config.styles.map((style, idx) => `
              <label class="option-item">
                <input type="checkbox" name="style" value="${style}" ${idx === 0 ? 'checked' : ''}>
                <span>${style}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <!-- Template Management -->
        <div class="settings-section">
          <h4>Template Names</h4>
          <div id="template-names-container">
            ${this.currentTemplates.length > 0 ? 
              this.currentTemplates.map(t => `
                <div class="template-name-item">
                  <input type="text" value="${t}" placeholder="Template name">
                  <button class="btn-remove-template" onclick="TemplateCreation.removeTemplateName(this)">×</button>
                </div>
              `).join('') :
              `<div class="template-name-item">
                <input type="text" placeholder="Template name (e.g., modern, classic)">
                <button class="btn-remove-template" onclick="TemplateCreation.removeTemplateName(this)">×</button>
              </div>`
            }
          </div>
          <button type="button" class="btn btn-secondary" onclick="TemplateCreation.addTemplateName()">
            + Add Template
          </button>
        </div>

        <!-- Save Button -->
        <div class="form-actions">
          <button id="save-template-settings-btn" class="btn btn-primary">
            Save Template Settings
          </button>
          <button type="button" class="btn btn-secondary" onclick="TemplateCreation.generateIndustryCode()">
            Generate Client Assignment Code
          </button>
        </div>

        <div id="template-status" class="message" style="display: none;"></div>
      </div>
    `;
  },

  /**
   * Add a new template name input
   */
  addTemplateName() {
    const container = document.getElementById('template-names-container');
    if (!container) return;

    const newItem = document.createElement('div');
    newItem.className = 'template-name-item';
    newItem.innerHTML = `
      <input type="text" placeholder="Template name (e.g., modern, classic)">
      <button class="btn-remove-template" onclick="TemplateCreation.removeTemplateName(this)">×</button>
    `;
    container.appendChild(newItem);
  },

  /**
   * Remove a template name input
   */
  removeTemplateName(btn) {
    const container = document.getElementById('template-names-container');
    if (!container) return;
    
    const items = container.querySelectorAll('.template-name-item');
    if (items.length > 1) {
      btn.closest('.template-name-item').remove();
    } else {
      UI.showMessage('template-status', 'At least one template is required.', 'error');
    }
  },

  /**
   * Collect template settings from the form
   */
  collectTemplateSettings() {
    const isUniversal = document.getElementById('universal-toggle')?.checked || false;
    
    // Collect selected tones
    const tones = Array.from(document.querySelectorAll('input[name="tone"]:checked'))
      .map(cb => cb.value);
    
    // Collect selected sizes
    const sizes = Array.from(document.querySelectorAll('input[name="size"]:checked'))
      .map(cb => cb.value);
    
    // Collect selected styles
    const styles = Array.from(document.querySelectorAll('input[name="style"]:checked'))
      .map(cb => cb.value);
    
    // Collect template names
    const templates = Array.from(document.querySelectorAll('#template-names-container input[type="text"]'))
      .map(input => input.value.trim())
      .filter(name => name.length > 0);

    return {
      isUniversal,
      tones,
      sizes,
      styles,
      templates
    };
  },

  /**
   * Validate template settings
   */
  validateSettings(settings) {
    if (settings.tones.length === 0) {
      UI.showMessage('template-status', 'Please select at least one tone option.', 'error');
      return false;
    }
    if (settings.sizes.length === 0) {
      UI.showMessage('template-status', 'Please select at least one size option.', 'error');
      return false;
    }
    if (settings.styles.length === 0) {
      UI.showMessage('template-status', 'Please select at least one style option.', 'error');
      return false;
    }
    if (settings.templates.length === 0) {
      UI.showMessage('template-status', 'Please add at least one template name.', 'error');
      return false;
    }
    return true;
  },

  /**
   * Save template settings to Firestore
   */
  async saveTemplateSettings() {
    if (!this.currentIndustry) {
      UI.showMessage('template-status', 'Please select an industry first.', 'error');
      return;
    }

    const settings = this.collectTemplateSettings();
    
    if (!this.validateSettings(settings)) {
      return;
    }

    try {
      UI.showMessage('template-status', 'Saving template settings...', 'info');

      // Create the specifications object for this industry
      const specifications = {
        tone: settings.tones,
        size: settings.sizes,
        style: settings.styles
      };

      // Save to industryTemplates collection
      await AppState.db.collection('industryTemplates').doc(this.currentIndustry).set({
        industryName: this.industryConfigs[this.currentIndustry].name,
        templates: settings.templates,
        specifications: specifications,
        isUniversal: settings.isUniversal,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: AppState.currentUser.uid
      }, { merge: true });

      UI.showMessage('template-status', '✅ Template settings saved successfully!', 'success');
      this.currentTemplates = settings.templates;

    } catch (err) {
      console.error('Error saving template settings:', err);
      UI.showMessage('template-status', 'Error saving settings: ' + err.message, 'error');
    }
  },

  /**
   * Generate a unique client assignment code for the current industry
   */
  async generateIndustryCode() {
    if (!this.currentIndustry) {
      UI.showMessage('template-status', 'Please select an industry and save settings first.', 'error');
      return;
    }

    // Check if settings are saved
    const doc = await AppState.db.collection('industryTemplates').doc(this.currentIndustry).get();
    if (!doc.exists) {
      UI.showMessage('template-status', 'Please save template settings before generating a code.', 'error');
      return;
    }

    const templateData = doc.data();

    try {
      UI.showMessage('template-status', 'Generating industry code...', 'info');

      // Generate unique 6-digit code
      let code;
      let exists = true;
      let attempts = 0;

      while (exists && attempts < 10) {
        code = Math.floor(100000 + Math.random() * 900000).toString();
        const codeDoc = await AppState.db.collection('industryCodes').doc(code).get();
        exists = codeDoc.exists;
        attempts++;
      }

      if (exists) {
        throw new Error('Failed to generate unique code');
      }

      // Save the code with template settings
      await AppState.db.collection('industryCodes').doc(code).set({
        industryName: this.industryConfigs[this.currentIndustry].name,
        industryKey: this.currentIndustry,
        specifications: templateData.specifications,
        templates: templateData.templates,
        used: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: AppState.currentUser.uid
      });

      // Display the code
      const message = `
        <div style="padding: 15px; background: #e7f3ff; border-radius: 8px; margin-top: 10px;">
          <strong>Client Assignment Code Generated:</strong>
          <div style="font-size: 24px; font-weight: bold; color: #007bff; margin: 10px 0;">${code}</div>
          <button class="btn btn-secondary" onclick="navigator.clipboard.writeText('${code}').then(() => UI.showMessage('template-status', '✅ Code copied to clipboard!', 'success'))">
            Copy Code
          </button>
        </div>
      `;
      UI.showMessage('template-status', message, 'success');

    } catch (err) {
      console.error('Error generating code:', err);
      UI.showMessage('template-status', 'Error generating code: ' + err.message, 'error');
    }
  }
};

// Expose to window
window.TemplateCreation = TemplateCreation;
