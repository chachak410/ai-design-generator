/**
 * Template Creation Module
 * Handles template creation with industry-specific settings (Tone, Size, Style)
 */

const TemplateCreation = {
  initialized: false,
  currentIndustry: null,
  currentTemplates: [],
  
  // Industry-specific configurations with color tones
  industryConfigs: {
    ecommerce: {
      name: 'E-commerce',
      tones: ['Bright & Vibrant', 'Soft Pastels', 'Bold & Saturated', 'Muted & Neutral', 'Dark & Moody'],
      styles: ['Modern', 'Minimalist', 'Bold', 'Elegant', 'Vibrant'],
      sizes: ['IG Post (1:1)', 'IG Story (9:16)', 'Facebook Post (1.91:1)', 'Banner (16:9)', 'Square (1:1)']
    },
    fnb: {
      name: 'F&B',
      tones: ['Warm & Earthy', 'Fresh & Bright', 'Rich & Deep', 'Light & Airy', 'Natural Tones'],
      styles: ['Rustic', 'Modern', 'Classic', 'Artisan', 'Clean'],
      sizes: ['IG Post (1:1)', 'IG Story (9:16)', 'Menu Card (A4)', 'Banner (16:9)', 'Square (1:1)']
    },
    retail: {
      name: 'Retail',
      tones: ['Vibrant & Energetic', 'Cool & Calm', 'Warm & Inviting', 'Monochrome', 'Colorful Mix'],
      styles: ['Contemporary', 'Minimal', 'Colorful', 'Classic', 'Trendy'],
      sizes: ['IG Post (1:1)', 'IG Story (9:16)', 'Flyer (A5)', 'Banner (16:9)', 'Square (1:1)']
    },
    beauty: {
      name: 'Beauty',
      tones: ['Soft Blush', 'Luxe Gold & Rose', 'Cool Neutrals', 'Bold & Dramatic', 'Natural Beige'],
      styles: ['Luxe', 'Minimalist', 'Feminine', 'Bold', 'Sophisticated'],
      sizes: ['IG Post (1:1)', 'IG Story (9:16)', 'Product Card (1:1)', 'Banner (16:9)', 'Portrait (4:5)']
    }
  },
  
  customSpecCount: 0,
  productCount: 0,

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
   * Render the template editor UI with new structure
   */
  renderTemplateEditor(config) {
    const editor = document.getElementById('template-editor');
    if (!editor) return;

    this.customSpecCount = 0;
    this.productCount = 1;

    editor.innerHTML = `
      <div class="template-editor-container">
        <h3>${config.name} Industry Configuration</h3>
        
        <!-- Section 1: Generic Specifications (Tone, Size, Style) -->
        <div class="settings-section">
          <h4>1. Generic Specifications</h4>
          <p class="section-description">Select default tone, size, and style options for this industry</p>
          
          <!-- Color Tone Options -->
          <div class="spec-subsection">
            <label class="spec-label">Color Tone</label>
            <div id="tone-options" class="options-container">
              ${config.tones.map((tone, idx) => `
                <label class="option-item">
                  <input type="checkbox" name="tone" value="${this.escapeHtml(tone)}" ${idx === 0 ? 'checked' : ''}>
                  <span>${this.escapeHtml(tone)}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- Size Options -->
          <div class="spec-subsection">
            <label class="spec-label">Size</label>
            <div id="size-options" class="options-container">
              ${config.sizes.map((size, idx) => `
                <label class="option-item">
                  <input type="checkbox" name="size" value="${this.escapeHtml(size)}" ${idx === 0 ? 'checked' : ''}>
                  <span>${this.escapeHtml(size)}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- Style Options -->
          <div class="spec-subsection">
            <label class="spec-label">Style</label>
            <div id="style-options" class="options-container">
              ${config.styles.map((style, idx) => `
                <label class="option-item">
                  <input type="checkbox" name="style" value="${this.escapeHtml(style)}" ${idx === 0 ? 'checked' : ''}>
                  <span>${this.escapeHtml(style)}</span>
                </label>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Section 2: Add Custom Specifications -->
        <div class="settings-section">
          <h4>2. Add Custom Specifications (Optional)</h4>
          <p class="section-description">Add additional specifications beyond tone, size, and style</p>
          <div id="custom-specs-container"></div>
          <button type="button" class="btn btn-secondary" id="add-custom-spec-btn">
            + Add Custom Specification
          </button>
        </div>

        <!-- Section 3: Product Names -->
        <div class="settings-section">
          <h4>3. Product Names</h4>
          <p class="section-description">Add multiple products for this industry (clients can select from these)</p>
          <div id="products-container">
            <div class="product-item" data-product-id="1">
              <input type="text" placeholder="Product name (e.g., T-shirt, Handbag)" class="product-name-input">
              <button class="btn-remove-product" data-action="remove-product">×</button>
            </div>
          </div>
          <button type="button" class="btn btn-secondary" id="add-product-btn">
            + Add Product
          </button>
        </div>

        <!-- Section 4: Generate Code -->
        <div class="settings-section">
          <h4>4. Generate Industry Code</h4>
          <p class="section-description">Save settings and generate a unique code for client assignment</p>
          
          <div class="form-group">
            <label class="toggle-label">
              <input type="checkbox" id="universal-toggle" checked>
              <span>Apply as Universal settings for all clients in this industry</span>
            </label>
            <small style="color: #666; display: block; margin-top: 5px;">
              ⚠️ These settings will only apply to new templates. Existing client templates remain unaffected.
            </small>
          </div>

          <div class="form-actions">
            <button id="save-and-generate-btn" class="btn btn-primary">
              Save & Generate Industry Code
            </button>
          </div>
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

    // Event delegation for all buttons
    editor.addEventListener('click', (e) => {
      const target = e.target;
      
      // Remove product button
      if (target.matches('.btn-remove-product') || target.closest('.btn-remove-product')) {
        const btn = target.matches('.btn-remove-product') ? target : target.closest('.btn-remove-product');
        this.removeProduct(btn);
      }
      
      // Remove custom spec button
      if (target.matches('.btn-remove-custom-spec') || target.closest('.btn-remove-custom-spec')) {
        const btn = target.matches('.btn-remove-custom-spec') ? target : target.closest('.btn-remove-custom-spec');
        this.removeCustomSpec(btn);
      }
      
      // Remove custom spec value button
      if (target.matches('.btn-remove-value') || target.closest('.btn-remove-value')) {
        const btn = target.matches('.btn-remove-value') ? target : target.closest('.btn-remove-value');
        this.removeCustomSpecValue(btn);
      }
    });

    // Add product button
    const addProductBtn = document.getElementById('add-product-btn');
    if (addProductBtn) {
      addProductBtn.addEventListener('click', () => this.addProduct());
    }

    // Add custom specification button
    const addCustomSpecBtn = document.getElementById('add-custom-spec-btn');
    if (addCustomSpecBtn) {
      addCustomSpecBtn.addEventListener('click', () => this.addCustomSpecification());
    }

    // Save and generate code button
    const saveAndGenBtn = document.getElementById('save-and-generate-btn');
    if (saveAndGenBtn) {
      saveAndGenBtn.addEventListener('click', () => this.saveAndGenerateCode());
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
   * Add a new product input
   */
  addProduct() {
    const container = document.getElementById('products-container');
    if (!container) return;

    this.productCount++;
    const newItem = document.createElement('div');
    newItem.className = 'product-item';
    newItem.dataset.productId = this.productCount;
    newItem.innerHTML = `
      <input type="text" placeholder="Product name (e.g., T-shirt, Handbag)" class="product-name-input">
      <button class="btn-remove-product" data-action="remove-product">×</button>
    `;
    container.appendChild(newItem);
  },

  /**
   * Remove a product input
   */
  removeProduct(btn) {
    const container = document.getElementById('products-container');
    if (!container) return;
    
    const items = container.querySelectorAll('.product-item');
    if (items.length > 1) {
      btn.closest('.product-item').remove();
    } else {
      UI.showMessage('template-status', 'At least one product is required.', 'error');
    }
  },

  /**
   * Add a new custom specification
   */
  addCustomSpecification() {
    const container = document.getElementById('custom-specs-container');
    if (!container) return;

    const existingSpecs = container.querySelectorAll('.custom-spec-group').length;
    if (existingSpecs >= 5) {
      UI.showMessage('template-status', 'Maximum 5 custom specifications allowed.', 'error');
      return;
    }

    this.customSpecCount++;
    const specId = this.customSpecCount;
    const specGroup = document.createElement('div');
    specGroup.className = 'custom-spec-group';
    specGroup.dataset.specId = specId;

    specGroup.innerHTML = `
      <div class="custom-spec-header">
        <input type="text" placeholder="Specification name (e.g., Material, Finish)" class="custom-spec-name" data-spec-id="${specId}">
        <button class="btn-remove-custom-spec" data-spec-id="${specId}">×</button>
      </div>
      <div class="custom-spec-values" data-spec-id="${specId}">
        <div class="custom-spec-value-item">
          <input type="text" placeholder="Value" class="custom-spec-value">
          <button class="btn-add-value" data-spec-id="${specId}">+</button>
        </div>
      </div>
    `;
    container.appendChild(specGroup);

    // Add event listener for adding values
    specGroup.querySelector('.btn-add-value').addEventListener('click', (e) => {
      this.addCustomSpecValue(parseInt(e.target.dataset.specId));
    });
  },

  /**
   * Remove a custom specification
   */
  removeCustomSpec(btn) {
    const specGroup = btn.closest('.custom-spec-group');
    if (specGroup) {
      specGroup.remove();
    }
  },

  /**
   * Add a value to a custom specification
   */
  addCustomSpecValue(specId) {
    const container = document.querySelector(`.custom-spec-values[data-spec-id="${specId}"]`);
    if (!container) return;

    const values = container.querySelectorAll('.custom-spec-value-item');
    if (values.length >= 5) {
      UI.showMessage('template-status', 'Maximum 5 values per specification.', 'error');
      return;
    }

    const valueItem = document.createElement('div');
    valueItem.className = 'custom-spec-value-item';
    valueItem.innerHTML = `
      <input type="text" placeholder="Value" class="custom-spec-value">
      <button class="btn-remove-value">−</button>
    `;
    container.appendChild(valueItem);
  },

  /**
   * Remove a value from a custom specification
   */
  removeCustomSpecValue(btn) {
    const container = btn.closest('.custom-spec-values');
    if (!container) return;
    
    const items = container.querySelectorAll('.custom-spec-value-item');
    if (items.length > 1) {
      btn.closest('.custom-spec-value-item').remove();
    } else {
      UI.showMessage('template-status', 'At least one value is required per specification.', 'error');
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
    
    // Collect product names
    const products = Array.from(document.querySelectorAll('.product-name-input'))
      .map(input => input.value.trim())
      .filter(name => name.length > 0);
    
    // Collect custom specifications
    const customSpecs = {};
    document.querySelectorAll('.custom-spec-group').forEach(group => {
      const specName = group.querySelector('.custom-spec-name')?.value.trim();
      if (!specName) return;
      
      const specId = group.dataset.specId;
      const values = Array.from(group.querySelectorAll('.custom-spec-value'))
        .map(input => input.value.trim())
        .filter(val => val.length > 0);
      
      if (values.length > 0) {
        customSpecs[specName] = values;
      }
    });

    return {
      isUniversal,
      tones,
      sizes,
      styles,
      products,
      customSpecs
    };
  },

  /**
   * Validate template settings
   */
  validateSettings(settings) {
    if (settings.tones.length === 0) {
      UI.showMessage('template-status', 'Please select at least one color tone option.', 'error');
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
    if (settings.products.length === 0) {
      UI.showMessage('template-status', 'Please add at least one product name.', 'error');
      return false;
    }
    return true;
  },

  /**
   * Save template settings and generate industry code
   */
  async saveAndGenerateCode() {
    if (!this.currentIndustry) {
      UI.showMessage('template-status', 'Please select an industry first.', 'error');
      return;
    }

    const settings = this.collectTemplateSettings();
    
    if (!this.validateSettings(settings)) {
      return;
    }

    try {
      UI.showMessage('template-status', 'Saving settings and generating code...', 'info');

      // Create the specifications object for this industry
      const specifications = {
        tone: settings.tones,
        size: settings.sizes,
        style: settings.styles,
        ...settings.customSpecs  // Add custom specifications
      };

      // Generate unique 6-digit code
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

      // Save the code with all settings
      await AppState.db.collection('industryCodes').doc(code).set({
        industryName: this.industryConfigs[this.currentIndustry].name,
        industryKey: this.currentIndustry,
        specifications: specifications,
        products: settings.products,
        used: false,
        isUniversal: settings.isUniversal,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: AppState.currentUser.uid
      });

      // Also save to industryTemplates collection for reference
      await AppState.db.collection('industryTemplates').doc(this.currentIndustry).set({
        industryName: this.industryConfigs[this.currentIndustry].name,
        specifications: specifications,
        products: settings.products,
        isUniversal: settings.isUniversal,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: AppState.currentUser.uid
      }, { merge: true });

      // Display the generated code
      this.displayGeneratedCode(code);

    } catch (err) {
      console.error('Error saving settings:', err);
      UI.showMessage('template-status', 'Error: ' + err.message, 'error');
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
