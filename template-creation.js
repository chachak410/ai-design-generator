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
                  <input type="text" value="${this.escapeHtml(t)}" placeholder="Template name">
                  <button class="btn-remove-template" data-action="remove-template">×</button>
                </div>
              `).join('') :
              `<div class="template-name-item">
                <input type="text" placeholder="Template name (e.g., modern, classic)">
                <button class="btn-remove-template" data-action="remove-template">×</button>
              </div>`
            }
          </div>
          <button type="button" class="btn btn-secondary" id="add-template-name-btn">
            + Add Template
          </button>
        </div>

        <!-- Save Button -->
        <div class="form-actions">
          <button id="save-template-settings-btn" class="btn btn-primary">
            Save Template Settings
          </button>
          <button type="button" id="generate-code-btn" class="btn btn-secondary">
            Generate Client Assignment Code
          </button>
        </div>

        <div id="template-status" class="message" style="display: none;"></div>
      </div>
    `;
    
    // Setup event listeners using event delegation
    this.setupTemplateEditorListeners();
  },

  /**
   * Setup event listeners for template editor
   */
  setupTemplateEditorListeners() {
    const editor = document.getElementById('template-editor');
    if (!editor) return;

    // Event delegation for remove template buttons
    editor.addEventListener('click', (e) => {
      if (e.target.matches('.btn-remove-template') || e.target.closest('.btn-remove-template')) {
        const btn = e.target.matches('.btn-remove-template') ? e.target : e.target.closest('.btn-remove-template');
        this.removeTemplateName(btn);
      }
    });

    // Add template button
    const addBtn = document.getElementById('add-template-name-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.addTemplateName());
    }

    // Generate code button
    const genBtn = document.getElementById('generate-code-btn');
    if (genBtn) {
      genBtn.addEventListener('click', () => this.generateIndustryCode());
    }
  },

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
      <button class="btn-remove-template" data-action="remove-template">×</button>
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

      // Generate unique 6-digit code with better collision detection
      let code = null;
      const maxAttempts = 10;
      
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const candidateCode = Math.floor(100000 + Math.random() * 900000).toString();
        const codeDoc = await AppState.db.collection('industryCodes').doc(candidateCode).get();
        
        if (!codeDoc.exists) {
          code = candidateCode;
          break;
        }
      }

      if (!code) {
        throw new Error('Failed to generate unique code after ' + maxAttempts + ' attempts');
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

      // Display the code with proper event handling (no inline handlers)
      this.displayGeneratedCode(code);

    } catch (err) {
      console.error('Error generating code:', err);
      UI.showMessage('template-status', 'Error generating code: ' + err.message, 'error');
    }
  },

  /**
   * Display generated code with proper event handling
   */
  displayGeneratedCode(code) {
    const statusEl = document.getElementById('template-status');
    if (!statusEl) return;

    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = 'padding: 15px; background: #e7f3ff; border-radius: 8px; margin-top: 10px;';
    
    const title = document.createElement('strong');
    title.textContent = 'Client Assignment Code Generated:';
    messageDiv.appendChild(title);

    const codeDisplay = document.createElement('div');
    codeDisplay.style.cssText = 'font-size: 24px; font-weight: bold; color: #007bff; margin: 10px 0;';
    codeDisplay.textContent = code;
    messageDiv.appendChild(codeDisplay);

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn btn-secondary';
    copyBtn.textContent = 'Copy Code';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(code).then(() => {
        UI.showMessage('template-status', '✅ Code copied to clipboard!', 'success');
      }).catch(() => {
        UI.showMessage('template-status', 'Failed to copy code', 'error');
      });
    });
    messageDiv.appendChild(copyBtn);

    statusEl.innerHTML = '';
    statusEl.appendChild(messageDiv);
    statusEl.className = 'message success';
    statusEl.style.display = 'block';
  }
};

// Expose to window
window.TemplateCreation = TemplateCreation;
