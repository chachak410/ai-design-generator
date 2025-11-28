/**
 * Template Creation Module
 * Handles template creation with industry-specific settings (Tone, Size, Style)
 */

const TemplateCreation = {
  initialized: false,
  currentIndustry: null,
  currentTemplates: [],

  /**
   * Known Firestore permission-related error codes
   */
  PERMISSION_ERROR_CODES: ['permission-denied', 'PERMISSION_DENIED'],
  AUTH_ERROR_CODES: ['unauthenticated', 'UNAUTHENTICATED'],

  /**
   * Check if an error is a permission-denied error
   * @param {Error} err - The error object
   * @returns {boolean}
   */
  isPermissionError(err) {
    const errorCode = err.code || '';
    const errorMessage = err.message || '';
    
    return this.PERMISSION_ERROR_CODES.includes(errorCode) ||
           errorMessage.includes('permission-denied') ||
           errorMessage.includes('Missing or insufficient permissions');
  },

  /**
   * Check if an error is an authentication error
   * @param {Error} err - The error object
   * @returns {boolean}
   */
  isAuthError(err) {
    const errorCode = err.code || '';
    const errorMessage = err.message || '';
    
    return this.AUTH_ERROR_CODES.includes(errorCode) ||
           errorMessage.includes('unauthenticated');
  },

  /**
   * Handle Firestore errors with user-friendly messages
   * @param {Error} err - The error object
   * @param {string} context - Context where the error occurred (e.g., 'loading templates', 'saving settings')
   */
  handleFirestoreError(err, context = 'operation') {
    console.error(`[TemplateCreation] Firestore error during ${context}:`, err);
    
    if (this.isPermissionError(err)) {
      UI.showMessage('template-status', 
        `Access denied: You do not have permission to perform this ${context}. Please check that you are logged in with the correct account and have the required role (Master or Admin).`, 
        'error'
      );
    } else if (this.isAuthError(err)) {
      UI.showMessage('template-status', 
        'Authentication required: Please log in again to continue.', 
        'error'
      );
    } else {
      UI.showMessage('template-status', 
        `Error during ${context}: ${err.message}`, 
        'error'
      );
    }
  },

  /**
   * Helper to check if click target matches a selector
   * @param {Element} target - The click target
   * @param {string} selector - CSS selector to match
   * @returns {boolean}
   */
  matchesSelector(target, selector) {
    if (!target || typeof target.matches !== 'function') {
      return false;
    }
    return target.matches(selector) || target.closest(selector) !== null;
  },
  
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
    },
    other: {
      name: 'Other',
      tones: ['Neutral', 'Warm', 'Cool', 'Vibrant', 'Muted'],
      styles: ['Modern', 'Classic', 'Minimalist', 'Bold', 'Elegant'],
      sizes: ['IG Post (1:1)', 'IG Story (9:16)', 'Banner (16:9)', 'Square (1:1)', 'Portrait (4:5)']
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
      this.hideCustomIndustryInput();
      return;
    }

    this.currentIndustry = industryKey;
    const config = this.industryConfigs[industryKey];
    
    // Show/hide custom industry name input for "Other" option
    if (industryKey === 'other') {
      this.showCustomIndustryInput();
    } else {
      this.hideCustomIndustryInput();
    }
    
    // Load existing templates for this industry if any
    await this.loadIndustryTemplates(industryKey);
    
    // Render the template editor
    this.renderTemplateEditor(config);
  },

  /**
   * Show the custom industry name input field
   */
  showCustomIndustryInput() {
    let customInput = document.getElementById('custom-industry-container');
    if (!customInput) {
      const selector = document.getElementById('industry-selector');
      if (selector && selector.parentNode) {
        customInput = document.createElement('div');
        customInput.id = 'custom-industry-container';
        customInput.className = 'form-group';
        customInput.style.marginTop = '10px';
        
        // Create elements programmatically to avoid XSS
        const label = document.createElement('label');
        label.setAttribute('for', 'custom-industry-name');
        label.textContent = 'Custom Industry Name';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'custom-industry-name';
        input.className = 'form-input';
        input.placeholder = 'Enter custom industry name';
        
        customInput.appendChild(label);
        customInput.appendChild(input);
        selector.parentNode.appendChild(customInput);
      }
    } else {
      customInput.style.display = 'block';
    }
  },

  /**
   * Hide the custom industry name input field
   */
  hideCustomIndustryInput() {
    const customInput = document.getElementById('custom-industry-container');
    if (customInput) {
      customInput.style.display = 'none';
    }
  },

  /**
   * Get the industry name (custom or predefined), sanitized for safe use
   */
  getIndustryName() {
    if (this.currentIndustry === 'other') {
      const customName = document.getElementById('custom-industry-name');
      const rawName = customName && customName.value.trim() ? customName.value.trim() : 'Other';
      // Sanitize the custom industry name to prevent XSS
      return this.escapeHtml(rawName);
    }
    // Robust fallback for unknown industry keys
    const config = this.industryConfigs[this.currentIndustry];
    return config?.name || 'Unknown Industry';
  },

  /**
   * Check if custom industry name is valid (for "Other" option)
   */
  isValidCustomIndustryName() {
    if (this.currentIndustry !== 'other') return true;
    const customName = document.getElementById('custom-industry-name');
    return customName && customName.value.trim().length > 0;
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
      console.error('[TemplateCreation] Error loading industry templates:', err);
      this.handleFirestoreError(err, 'loading templates');
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

    // Use custom industry name for "Other" option
    const displayName = this.currentIndustry === 'other' ? 'Custom' : config.name;

    editor.innerHTML = `
      <div class="template-editor-container">
        <h3>${this.escapeHtml(displayName)} Industry Configuration</h3>
        
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

    // Add direct click listeners for critical buttons to ensure reliability
    // These are in addition to the delegated handlers below
    const addProductBtn = editor.querySelector('#add-product-btn');
    if (addProductBtn && !addProductBtn.dataset.directListenerAttached) {
      addProductBtn.addEventListener('click', (e) => {
        console.debug('[TemplateCreation] Add Product button clicked (direct handler)');
        e.preventDefault();
        e.stopPropagation();
        this.addProduct();
      });
      addProductBtn.dataset.directListenerAttached = 'true';
    }

    const saveAndGenerateBtn = editor.querySelector('#save-and-generate-btn');
    if (saveAndGenerateBtn && !saveAndGenerateBtn.dataset.directListenerAttached) {
      saveAndGenerateBtn.addEventListener('click', (e) => {
        console.debug('[TemplateCreation] Save & Generate button clicked (direct handler)');
        e.preventDefault();
        e.stopPropagation();
        this.saveAndGenerateCode();
      });
      saveAndGenerateBtn.dataset.directListenerAttached = 'true';
    }

    const addCustomSpecBtn = editor.querySelector('#add-custom-spec-btn');
    if (addCustomSpecBtn && !addCustomSpecBtn.dataset.directListenerAttached) {
      addCustomSpecBtn.addEventListener('click', (e) => {
        console.debug('[TemplateCreation] Add Custom Spec button clicked (direct handler)');
        e.preventDefault();
        e.stopPropagation();
        this.addCustomSpecification();
      });
      addCustomSpecBtn.dataset.directListenerAttached = 'true';
    }

    // Event delegation for all buttons - ensures clicks work even if DOM is replaced
    editor.addEventListener('click', (e) => {
      const target = e.target;
      
      // Add product button (delegated)
      if (this.matchesSelector(target, '#add-product-btn')) {
        console.debug('[TemplateCreation] Add Product button clicked (delegated handler)');
        e.preventDefault();
        e.stopPropagation();
        this.addProduct();
        return;
      }
      
      // Save and generate button (delegated)
      if (this.matchesSelector(target, '#save-and-generate-btn')) {
        console.debug('[TemplateCreation] Save & Generate button clicked (delegated handler)');
        e.preventDefault();
        e.stopPropagation();
        this.saveAndGenerateCode();
        return;
      }
      
      // Add custom spec button (delegated)
      if (this.matchesSelector(target, '#add-custom-spec-btn')) {
        console.debug('[TemplateCreation] Add Custom Spec button clicked (delegated handler)');
        e.preventDefault();
        e.stopPropagation();
        this.addCustomSpecification();
        return;
      }
      
      // Remove product button
      if (this.matchesSelector(target, '.btn-remove-product')) {
        const btn = target.matches('.btn-remove-product') ? target : target.closest('.btn-remove-product');
        this.removeProduct(btn);
      }
      
      // Remove custom spec button
      if (this.matchesSelector(target, '.btn-remove-custom-spec')) {
        const btn = target.matches('.btn-remove-custom-spec') ? target : target.closest('.btn-remove-custom-spec');
        this.removeCustomSpec(btn);
      }
      
      // Add custom spec value button
      if (this.matchesSelector(target, '.btn-add-value')) {
        const btn = target.matches('.btn-add-value') ? target : target.closest('.btn-add-value');
        const specId = btn.dataset.specId;
        if (specId) {
          this.addCustomSpecValue(parseInt(specId, 10));
        }
      }
      
      // Remove custom spec value button
      if (this.matchesSelector(target, '.btn-remove-value')) {
        const btn = target.matches('.btn-remove-value') ? target : target.closest('.btn-remove-value');
        this.removeCustomSpecValue(btn);
      }
    });
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
   * Maximum number of products allowed
   */
  MAX_PRODUCTS: 20,

  /**
   * Add a new product input
   */
  addProduct() {
    const container = document.getElementById('products-container');
    if (!container) {
      console.warn('[TemplateCreation] addProduct: products-container not found');
      return;
    }

    // Check max product limit using actual DOM count
    const existingProducts = container.querySelectorAll('.product-item').length;
    if (existingProducts >= this.MAX_PRODUCTS) {
      UI.showMessage('template-status', `Maximum ${this.MAX_PRODUCTS} products allowed.`, 'error');
      return;
    }

    // Use DOM count + 1 for new product ID to avoid mismatches
    const newProductId = existingProducts + 1;
    const newItem = document.createElement('div');
    newItem.className = 'product-item';
    newItem.dataset.productId = newProductId;
    newItem.innerHTML = `
      <input type="text" placeholder="Product name (e.g., T-shirt, Handbag)" class="product-name-input">
      <button class="btn-remove-product" data-action="remove-product">×</button>
    `;
    container.appendChild(newItem);
    
    // Focus on the newly added input
    const newInput = newItem.querySelector('.product-name-input');
    if (newInput) {
      newInput.focus();
    }
    
    console.debug('[TemplateCreation] addProduct completed, new product count:', existingProducts + 1);
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
    const specId = parseInt(this.customSpecCount, 10); // Ensure it's a number
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
    // Safely parse and validate specId
    const parsedId = parseInt(specId, 10);
    if (isNaN(parsedId)) return;
    
    const container = document.querySelector(`.custom-spec-values[data-spec-id="${parsedId}"]`);
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
    console.debug('[TemplateCreation] saveAndGenerateCode called, currentIndustry:', this.currentIndustry);
    
    if (!this.currentIndustry) {
      UI.showMessage('template-status', 'Please select an industry first.', 'error');
      return;
    }

    // Validate custom industry name for "Other" option using helper method
    if (!this.isValidCustomIndustryName()) {
      UI.showMessage('template-status', 'Please enter a custom industry name.', 'error');
      return;
    }

    const settings = this.collectTemplateSettings();
    console.debug('[TemplateCreation] saveAndGenerateCode collected settings:', {
      tonesCount: settings.tones.length,
      sizesCount: settings.sizes.length,
      stylesCount: settings.styles.length,
      productsCount: settings.products.length,
      isUniversal: settings.isUniversal
    });
    
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

      // Get the industry name (custom or predefined)
      const industryName = this.getIndustryName();

      console.log('[TemplateCreation] saveAndGenerateCode saving to Firestore, code:', code);
      
      // Save the code with all settings
      await AppState.db.collection('industryCodes').doc(code).set({
        industryName: industryName,
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

      console.debug('[TemplateCreation] saveAndGenerateCode completed successfully, code:', code);
      
      // Display the generated code
      this.displayGeneratedCode(code);

    } catch (err) {
      console.error('[TemplateCreation] Error in saveAndGenerateCode:', err);
      this.handleFirestoreError(err, 'saving settings');
    }
  },

  /**
   * Copy text to clipboard with fallback for older browsers
   * @param {string} text - Text to copy
   * @returns {Promise<boolean>} - Promise resolving to true if copy succeeded
   */
  async copyToClipboard(text) {
    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn('[TemplateCreation] Clipboard API failed, trying fallback:', err);
      }
    }
    
    // Fallback for older browsers using temporary textarea
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch (err) {
      console.error('[TemplateCreation] Clipboard fallback failed:', err);
      return false;
    }
  },

  /**
   * Show copy success feedback
   * @param {HTMLElement} feedbackEl - Element to show feedback in
   * @param {boolean} success - Whether copy was successful
   */
  showCopyFeedback(feedbackEl, success) {
    if (!feedbackEl) return;
    
    feedbackEl.textContent = success ? '✅ Copied!' : '❌ Copy failed';
    feedbackEl.style.display = 'inline-block';
    feedbackEl.setAttribute('role', 'alert');
    feedbackEl.setAttribute('aria-live', 'polite');
    
    // Hide feedback after 2 seconds
    setTimeout(() => {
      feedbackEl.style.display = 'none';
    }, 2000);
  },

  /**
   * Display generated code with proper event handling and auto-copy
   */
  async displayGeneratedCode(code) {
    // Use querySelector to target the status element inside template-editor specifically
    // This avoids conflicts with other #template-status elements in the page
    const statusEl = document.querySelector('#template-editor #template-status') || 
                     document.getElementById('template-status');
    if (!statusEl) {
      console.warn('[TemplateCreation] displayGeneratedCode: template-status element not found');
      return;
    }

    // Create the industry code readout box
    const codeBox = document.createElement('div');
    codeBox.id = 'generated-industry-code-box';
    codeBox.className = 'industry-code-box';
    
    const title = document.createElement('div');
    title.className = 'industry-code-title';
    title.textContent = 'Client Assignment Code Generated:';
    codeBox.appendChild(title);

    const codeContainer = document.createElement('div');
    codeContainer.className = 'industry-code-display-container';
    
    const codeDisplay = document.createElement('div');
    codeDisplay.className = 'industry-code-value';
    codeDisplay.textContent = code;
    codeContainer.appendChild(codeDisplay);

    // Copy button with icon
    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn btn-copy-code';
    copyBtn.setAttribute('aria-label', 'Copy code to clipboard');
    copyBtn.innerHTML = `<span class="copy-icon">📋</span> Copy`;
    
    // Copy feedback element
    const copyFeedback = document.createElement('span');
    copyFeedback.className = 'copy-feedback';
    copyFeedback.style.display = 'none';
    copyFeedback.setAttribute('aria-live', 'polite');
    
    copyBtn.addEventListener('click', async () => {
      const success = await this.copyToClipboard(code);
      this.showCopyFeedback(copyFeedback, success);
    });
    
    codeContainer.appendChild(copyBtn);
    codeContainer.appendChild(copyFeedback);
    codeBox.appendChild(codeContainer);

    const instruction = document.createElement('p');
    instruction.className = 'industry-code-instruction';
    instruction.textContent = 'Share this code with clients to assign them to this industry template.';
    codeBox.appendChild(instruction);

    // Clear status and add the code box
    statusEl.innerHTML = '';
    statusEl.appendChild(codeBox);
    statusEl.className = 'message success';
    statusEl.style.display = 'block';

    // Auto-copy to clipboard immediately
    const autoCopySuccess = await this.copyToClipboard(code);
    
    // Show auto-copy notification
    const autoCopyNotice = document.createElement('div');
    autoCopyNotice.className = 'auto-copy-notice';
    autoCopyNotice.setAttribute('role', 'alert');
    autoCopyNotice.setAttribute('aria-live', 'assertive');
    autoCopyNotice.textContent = autoCopySuccess 
      ? '✅ Code automatically copied to clipboard!' 
      : '📋 Click the Copy button to copy the code.';
    codeBox.insertBefore(autoCopyNotice, instruction);
    
    // Fade out auto-copy notice after 3 seconds if successful
    if (autoCopySuccess) {
      setTimeout(() => {
        autoCopyNotice.style.opacity = '0.5';
      }, 3000);
    }
  }
};

// Expose to window
window.TemplateCreation = TemplateCreation;
