// js/features/templates/template.js
const TemplateManager = {
  // -------------------------------------------------
  //  FEEDBACK LEARNING – CONSTANTS
  // -------------------------------------------------
  FEEDBACK_DIM: 64,
  LEARNING_RATE: 0.08,
  NEGATIVE_RATE: 0.12,

  async loadTemplates() {
    if (!AppState.currentUser) {
      UI.showMessage('template-status', window.i18n.t('pleaseSignIn'), 'error');
      return;
    }
    
    // Check if client needs to complete setup
    if (AppState.userRole === 'client' && AppState.clientNeedsSetup) {
      console.log('[TemplateManager] Client needs setup, showing notice');
      
      // Get language preference
      const lang = window.i18n?.language || localStorage.getItem('setupLang') || 'en';
      const messages = {
        en: {
          title: '📝 Account Setup Incomplete',
          message: 'Your account setup is not complete. Please complete the questionnaire to start generating images.',
          button: '→ Complete Setup Now'
        },
        zh_CN: {
          title: '📝 账户设置未完成',
          message: '您的账户设置不完整。请完成问卷问题以开始生成图像。',
          button: '→ 现在完成设置'
        },
        zh_TW: {
          title: '📝 帳戶設定未完成',
          message: '您的帳戶設定不完整。請完成問卷以開始生成圖像。',
          button: '→ 現在完成設定'
        }
      };
      
      const text = messages[lang] || messages.en;
      
      const statusEl = document.getElementById('template-status');
      if (statusEl) {
        statusEl.innerHTML = `
          <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #fff3cd 0%, #fffbea 100%); border-left: 4px solid #ffc107; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #856404;">${text.title}</h3>
            <p style="color: #856404; margin: 15px 0;">${text.message}</p>
            <a href="setup.html" style="
              display: inline-block;
              margin-top: 15px;
              padding: 12px 28px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-decoration: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 600;
              transition: transform 0.3s, box-shadow 0.3s;
            " onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.4)';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';">
              ${text.button}
            </a>
          </div>
        `;
      }
      return;
    }
    
    try {
      AppState.generationCount = AppState.generationCount || 0;
      AppState.badSelections = AppState.badSelections || 0;
      AppState.creditLimit = 20;
      AppState.maxBadSelections = AppState.creditLimit / 2;
      AppState.generatedImages = AppState.generatedImages || [];
      if (AppState.userRole === 'master' || AppState.userRole === 'admin') {
        AppState.userTemplates = ['modern', 'classic', 'minimalist', 'luxury', 'eco'];
        AppState.userSpecs = null;
        AppState.selectedSpecs = {};
      } else {
        const doc = await AppState.db.collection('users').doc(AppState.currentUser.uid).get();
        if (!doc.exists) {
          UI.showMessage('template-status', window.i18n.t('profileNotFound'), 'error');
          showPage('account-page');
          return;
        }
        const data = doc.data();
        
        // Use assignedTemplate if available, fallback to template
        let templateValue = data.assignedTemplate || data.template;
        
        // If no template assigned yet, show warning
        if (!templateValue) {
          console.warn('No template assigned to client. Defaulting to "modern"');
          templateValue = 'modern';
          // Auto-assign default template
          await AppState.db.collection('users').doc(AppState.currentUser.uid).update({
            assignedTemplate: 'modern'
          }).catch(err => console.error('Failed to auto-assign template:', err));
        }
        
        AppState.userTemplates = [templateValue];
        AppState.userSpecs = data.specifications || {};
        AppState.userProductName = data.productName || '';
        
        // NEW: Parse and initialize allowed products for dropdown selection
        const productNameRaw = data.productName || '';
        const productList = productNameRaw
          .split(/[,;]/)
          .map(p => p.trim())
          .filter(p => p.length > 0);
        
        AppState.allowedProducts = productList;
        
        // Initialize selectedProduct with the first product if not already set
        if (!AppState.selectedProduct && productList.length > 0) {
          AppState.selectedProduct = productList[0];
          console.log('[TemplateManager] Initialized selectedProduct:', AppState.selectedProduct);
        }
        
        AppState.selectedSpecs = Object.keys(AppState.userSpecs).reduce((acc, key) => {
          acc[key] = AppState.userSpecs[key][0] || '';
          return acc;
        }, {});
      }

      // ADDED: load learned feedback vector
      await this.loadFeedbackVector();

      this.renderTemplateUI();
      this.updatePromptDisplay();
      this.setupNavigation();
      this.setupImageUpload();
      this.setupGenerateButton();
    } catch (err) {
      UI.showMessage('template-status', window.i18n.t('errorLoadingTemplates') + ': ' + err.message, 'error');
    }
  },

  // -------------------------------------------------
  //  ADDED: load feedback vector from Firestore
  // -------------------------------------------------
  async loadFeedbackVector() {
    if (!AppState.currentUser) return;
    const doc = await AppState.db.collection('users').doc(AppState.currentUser.uid).get();
    let vec = doc.data()?.feedbackVector;
    if (!vec) {
      vec = {};
      for (let i = 0; i < this.FEEDBACK_DIM; i++) vec[`dim${i}`] = 0;
    }
    AppState.feedbackVector = vec;
  },

  // -------------------------------------------------
  //  ADDED: enrich prompt with style bias
  // -------------------------------------------------
  enrichPrompt(basePrompt) {
    if (!AppState.feedbackVector) return basePrompt;
    const token = Object.values(AppState.feedbackVector).map(v => v.toFixed(3)).join(',');
    return `${basePrompt} [STYLE_BIAS:${token}]`;
  },

  // -------------------------------------------------
  //  ADDED: normalise vector
  // -------------------------------------------------
  normalise(vec) {
    const keys = Object.keys(vec);
    let sumSq = keys.reduce((s, k) => s + vec[k] ** 2, 0);
    const norm = Math.sqrt(sumSq) || 1;
    keys.forEach(k => vec[k] /= norm);
    return vec;
  },

  renderTemplateUI() {
    const checkboxContainer = document.getElementById('template-checkboxes');
    if (checkboxContainer) {
      if (AppState.userRole === 'master') {
        checkboxContainer.innerHTML = `
          <div>
${AppState.userTemplates
            .map(
              (template) => `
              <label>
                <input type="checkbox" value="${template}" checked>
${template.charAt(0).toUpperCase() + template.slice(1)}
                <button class="remove-template btn btn-secondary" data-template="${template}" data-i18n="remove">Remove</button>
              </label>
            `
            )
            .join('')}
          </div>
        `;
        document.getElementById('master-template-controls').classList.remove('hidden');
        document.getElementById('add-template')?.addEventListener('click', () => {
          const newTemplate = document.getElementById('new-template').value.trim().toLowerCase();
          if (newTemplate && !AppState.userTemplates.includes(newTemplate)) {
            AppState.userTemplates.push(newTemplate);
            this.renderTemplateUI();
            this.updatePromptDisplay();
            AppState.db.collection('users').doc(AppState.currentUser.uid).update({
              template: AppState.userTemplates,
            });
            window.i18n.renderAll();
          }
        });
        document.querySelectorAll('.remove-template').forEach((btn) => {
          btn.addEventListener('click', () => {
            const template = btn.dataset.template;
            AppState.userTemplates = AppState.userTemplates.filter((t) => t !== template);
            this.renderTemplateUI();
            this.updatePromptDisplay();
            AppState.db.collection('users').doc(AppState.currentUser.uid).update({
              template: AppState.userTemplates,
            });
            window.i18n.renderAll();
          });
        });
      } else {
        checkboxContainer.innerHTML = AppState.userTemplates
          .map(
            (template) => `
          <label>
            <input type="checkbox" value="${template}" checked>
${template.charAt(0).toUpperCase() + template.slice(1)}
          </label>
        `
          )
          .join('');
      }
      checkboxContainer.querySelectorAll('input').forEach((cb) => {
        cb.addEventListener('change', () => this.updatePromptDisplay());
      });
    }
    const specContainer = document.getElementById('spec-selections');
    if (specContainer) {
      if (!AppState.userSpecs || Object.keys(AppState.userSpecs).length === 0) {
        specContainer.innerHTML = '';
      } else {
        specContainer.innerHTML = Object.entries(AppState.userSpecs)
          .map(
            ([key, values]) => `
          <div class="form-group">
            <label for="spec-select-${key}">
${key.charAt(0).toUpperCase() + key.slice(1)}
            </label>
            <select id="spec-select-${key}" data-spec-key="${key}">
${values.map((value) => `<option value="${value}">${value}</option>`).join('')}
            </select>
          </div>
        `
          )
          .join('');
        specContainer.querySelectorAll('select').forEach((select) => {
          select.addEventListener('change', (e) => {
            AppState.selectedSpecs[e.target.dataset.specKey] = e.target.value;
            this.updatePromptDisplay();
          });
        });
      }
    }
    const productDisplay = document.getElementById('product-display');
    if (productDisplay && AppState.userProductName) {
      // Parse products - support multiple products separated by comma or semicolon
      const productList = AppState.allowedProducts.length > 0 
        ? AppState.allowedProducts 
        : AppState.userProductName
          .split(/[,;]/)
          .map(p => p.trim())
          .filter(p => p.length > 0);
      
      if (productList.length > 0) {
        // Always show dropdown for product selection
        const currentProduct = AppState.selectedProduct || productList[0];
        const options = productList
          .map(p => `<option value="${p}" ${p === currentProduct ? 'selected' : ''}>${p}</option>`)
          .join('');
        
        const selectLabel = window.i18n?.t('selectProduct') || 'Select Product';
        const selectedLabel = window.i18n?.t('selectedProduct') || 'Selected:';
        
        productDisplay.innerHTML = `
          <label for="product-selector" style="font-weight: 600; display: block; margin-bottom: 8px;">${selectLabel}</label>
          <select id="product-selector" required style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; background: white; cursor: pointer;">
            ${options}
          </select>
          <div id="selected-product-info" style="margin-top: 8px; padding: 8px; background: #f0f8ff; border-radius: 4px;">
            <small><strong>${selectedLabel}</strong> <span id="selected-product-name">${currentProduct}</span></small>
          </div>
        `;
        
        // Add event listener for product selection changes
        const selector = document.getElementById('product-selector');
        if (selector) {
          selector.addEventListener('change', (e) => {
            AppState.selectedProduct = e.target.value;
            const displayName = document.getElementById('selected-product-name');
            if (displayName) {
              displayName.textContent = AppState.selectedProduct;
            }
            console.log('[TemplateManager] Selected product changed to:', AppState.selectedProduct);
            this.updatePromptDisplay();
          });
        }
        
        UI.showElement('product-display');
      }
    }
    this.updateGenerationCounter();
    window.i18n.renderAll();
  },

  setupNavigation() {
    document.querySelectorAll('.nav-links a').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.getAttribute('onclick').match(/'([^']+)'/)[1];
        document.querySelectorAll('.nav-links a').forEach((l) => l.classList.remove('active'));
        link.classList.add('active');
        showPage(page);
      });
    });
  },

  setupImageUpload() {
    const uploadInput = document.getElementById('reference-image');
    if (uploadInput) {
      uploadInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          if (!file.type.startsWith('image/')) {
            UI.showMessage('template-status', 'Please upload an image file.', 'error');
            return;
          }
          if (file.size > 5 * 1024 * 1024) {
            UI.showMessage('template-status', 'Image size exceeds 5MB limit.', 'error');
            return;
          }
          try {
            await this.generateImages(file);
          } catch (err) {
            UI.showMessage('template-status', window.i18n.t('errorUploadingImage') + ': ' + err.message, 'error');
          }
        }
      });
    }
  },

  setupGenerateButton() {
    const generateBtn = document.getElementById('generate-images-btn');
    if (generateBtn) {
      generateBtn.addEventListener('click', async () => {
        // Delegate to Generator.generateImages() which handles translation
        await Generator.generateImages();
      });
    }
  },

  displayImages(image1, image2) {
    const leftImage = document.getElementById('left-image');
    const rightImage = document.getElementById('right-image');
    if (leftImage && rightImage) {
      leftImage.innerHTML = `<img src="${image1}" alt="${window.i18n.t('generatedLeftImage')}" class="loaded">`;
      rightImage.innerHTML = `<img src="${image2}" alt="${window.i18n.t('generatedRightImage')}" class="loaded">`;
    }
    this.setupFeedbackButtons(image1, image2);
    window.i18n.renderAll();
  },

  // -------------------------------------------------
  //  MODIFIED: setupFeedbackButtons – now learns
  // -------------------------------------------------
  setupFeedbackButtons(image1, image2) {
    const row = document.getElementById('image-feedback-row');
    if (!row) return;
    row.classList.remove('hidden');

    const clone = (id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const neu = el.cloneNode(true);
      el.replaceWith(neu);
      return neu;
    };

    const leftBtn  = clone('left-better');
    const rightBtn = clone('right-better');
    const dlAllBtn = clone('download-all');
    const badBtn   = clone('both-bad');

    if (leftBtn) {
      leftBtn.onclick = async () => {
        this._download(image1, 'left');
        await this.recordFeedback(true, false, false, image1, image2);
      };
    }
    if (rightBtn) {
      rightBtn.onclick = async () => {
        this._download(image2, 'right');
        await this.recordFeedback(false, true, false, image1, image2);
      };
    }
    if (dlAllBtn) {
      dlAllBtn.onclick = async () => {
        this._download(image1, 'left');
        setTimeout(() => this._download(image2, 'right'), 400);
        await this.recordFeedback(true, true, false, image1, image2);
      };
    }
    if (badBtn) {
      badBtn.onclick = async () => {
        if (AppState.badSelections >= AppState.maxBadSelections) {
          UI.showMessage('template-status', window.i18n.t('maxBadSelections'), 'error');
          return;
        }
        AppState.badSelections += 1;
        await this.recordFeedback(false, false, true, image1, image2);
        await Generator.generateImages();
      };
    }
  },

  _download(url, side) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated-${side}-${new Date().toISOString()}.png`;
    a.click();
  },

  // -------------------------------------------------
  //  ADDED: record feedback & update vector
  // -------------------------------------------------
  async recordFeedback(leftGood, rightGood, bothBad, url1, url2) {
    const getEmbedding = async (url) => {
      try {
        const resp = await fetch('/api/embedding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: url })
        });
        const data = await resp.json();
        return data.embedding || {};
      } catch (e) {
        console.warn('Embedding failed, using mock', e);
        const mock = {};
        for (let i = 0; i < this.FEEDBACK_DIM; i++) mock[`dim${i}`] = (Math.random() - 0.5) * 0.2;
        return mock;
      }
    };

    const emb1 = await getEmbedding(url1);
    const emb2 = await getEmbedding(url2);

    const v = AppState.feedbackVector;
    const lr = bothBad ? this.NEGATIVE_RATE : this.LEARNING_RATE;

    const update = (emb, sign) => {
      Object.keys(emb).forEach(k => {
        v[k] = (v[k] || 0) + sign * lr * emb[k];
      });
    };

    if (leftGood)  update(emb1, +1);
    if (rightGood) update(emb2, +1);
    if (bothBad) {
      update(emb1, -1);
      update(emb2, -1);
    }

    this.normalise(v);
    AppState.feedbackVector = v;

    const historyEntry = {
      ts: new Date().toISOString(),
      left: leftGood,
      right: rightGood,
      bothBad
    };

    await AppState.db.collection('users').doc(AppState.currentUser.uid).update({
      feedbackVector: v,
      feedbackHistory: firebase.firestore.FieldValue.arrayUnion(historyEntry)
    });

    const indicator = document.getElementById('learning-indicator');
    if (indicator) {
      indicator.classList.remove('hidden');
      setTimeout(() => indicator.classList.add('hidden'), 1200);
    }
  },

  async saveImagesToDB() {
    if (AppState.currentUser) {
      try {
        await AppState.db
          .collection('users')
          .doc(AppState.currentUser.uid)
          .update({ generatedImages: AppState.generatedImages });
      } catch (err) {
        console.error('Error saving images:', err);
        UI.showMessage('template-status', window.i18n.t('errorSavingImages'), 'error');
      }
    }
  },

  updatePromptDisplay() {
    const selectedTemplates = Array.from(
      document.querySelectorAll('#template-checkboxes input:checked')
    ).map((cb) => cb.value);
    let extra = '';
    if (AppState.userSpecs && Object.keys(AppState.selectedSpecs).length > 0) {
      extra = Object.entries(AppState.selectedSpecs)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      if (extra) extra = ', ' + extra;
    }
    const promptDisplay = document.getElementById('prompt-display');
    if (promptDisplay) {
      // Use selectedProduct (from dropdown) if available, otherwise show placeholder
      const displayProduct = AppState.selectedProduct || AppState.userProductName || 'Product';
      if (selectedTemplates.length > 0 && displayProduct) {
        promptDisplay.textContent = `Generate a design for ${displayProduct} in ${selectedTemplates.join(
          ', '
        )} style${extra}`;
      } else if (!displayProduct) {
        promptDisplay.textContent = window.i18n.t('setProductName');
      } else {
        promptDisplay.textContent = window.i18n.t('selectTemplate');
      }
      UI.showElement('prompt-display');
    }
  },

  updateGenerationCounter() {
    const counter = document.getElementById('generation-counter');
    if (counter) {
      counter.textContent = `Generations: ${AppState.generationCount}/${AppState.creditLimit}`;
    }
  },
};

// Make TemplateManager available in the browser global scope
window.TemplateManager = TemplateManager;