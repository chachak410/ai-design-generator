// js/features/templates/template.js
const TemplateManager = {
  // -------------------------------------------------
  // FEEDBACK LEARNING – CONSTANTS
  // -------------------------------------------------
  FEEDBACK_DIM: 64,
  LEARNING_RATE: 0.08,
  NEGATIVE_RATE: 0.12,

  // Keep track of uploaded reference images
  refImage1: null,
  refImage2: null,

  async loadTemplates() {
    if (!AppState.currentUser) {
      UI.showMessage('template-status', window.i18n.t('pleaseSignIn'), 'error');
      return;
    }

    // ... (your existing client setup check code remains unchanged)
    if (AppState.userRole === 'client' && AppState.clientNeedsSetup) {
      console.log('[TemplateManager] Client needs setup, showing notice');
      const lang = window.i18n?.language || localStorage.getItem('setupLang') || 'en';
      const messages = {
        en: {
          title: 'Account Setup Incomplete',
          message: 'Your account setup is not complete. Please complete the questionnaire to start generating images.',
          button: '→ Complete Setup Now'
        },
        zh_CN: {
          title: '账户设置未完成',
          message: '您的账户设置不完整。请完成问卷问题以开始生成图像。',
          button: '→ 现在完成设置'
        },
        zh_TW: {
          title: '帳戶設定未完成',
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
        let templateValue = data.assignedTemplate || data.template;
        if (!templateValue) {
          console.warn('No template assigned to client. Defaulting to "modern"');
          templateValue = 'modern';
          await AppState.db.collection('users').doc(AppState.currentUser.uid).update({
            assignedTemplate: 'modern'
          }).catch(err => console.error('Failed to auto-assign template:', err));
        }
        AppState.userTemplates = [templateValue];
        AppState.userSpecs = data.specifications || {};
        AppState.userProductName = data.productName || '';

        const productList = (data.productName || '')
          .split(/[,;]/)
          .map(p => p.trim())
          .filter(p => p.length > 0);
        AppState.allowedProducts = productList;
        if (!AppState.selectedProduct && productList.length > 0) {
          AppState.selectedProduct = productList[0];
        }

        AppState.selectedSpecs = Object.keys(AppState.userSpecs).reduce((acc, key) => {
          acc[key] = AppState.userSpecs[key][0] || '';
          return acc;
        }, {});
      }

      await this.loadFeedbackVector();
      this.renderTemplateUI();
      this.updatePromptDisplay();
      this.setupNavigation();
      this.setupDualImageUpload();  // ← Updated function
      this.setupGenerateButton();
    } catch (err) {
      UI.showMessage('template-status', window.i18n.t('errorLoadingTemplates') + ': ' + err.message, 'error');
    }
  },

  // ... (loadFeedbackVector, enrichPrompt, normalise stay the same)

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

  enrichPrompt(basePrompt) {
    if (!AppState.feedbackVector) return basePrompt;
    const token = Object.values(AppState.feedbackVector).map(v => v.toFixed(3)).join(',');
    return `${basePrompt} [STYLE_BIAS:${token}]`;
  },

  normalise(vec) {
    const keys = Object.keys(vec);
    let sumSq = keys.reduce((s, k) => s + vec[k] ** 2, 0);
    const norm = Math.sqrt(sumSq) || 1;
    keys.forEach(k => vec[k] /= norm);
    return vec;
  },

  renderTemplateUI() {
    // ... (your existing renderTemplateUI code – unchanged)
    // (checkboxes, specs, product selector, etc.)
    // Just make sure you have a container in HTML for the new dual upload section
  },

  setupNavigation() { /* unchanged */ },
  setupGenerateButton() { /* unchanged */ },

  // ================================================
  // NEW: Dual Reference Image Upload + Combined Description
  // ================================================
  setupDualImageUpload() {
    const container = document.getElementById('dual-reference-upload');
    if (!container) return;

    container.innerHTML = `
      <div class="dual-upload-grid">
        <div class="upload-box">
          <label for="reference-image-1" class="upload-label">
            <span>Image 1</span>
            <input type="file" id="reference-image-1" accept="image/*" />
          </label>
          <div id="preview-1" class="preview"></div>
          <button id="remove-1" class="remove-btn hidden">Remove</button>
        </div>

        <div class="upload-box">
          <label for="reference-image-2" class="upload-label">
            <span>Image 2</span>
            <input type="file" id="reference-image-2" accept="image/*" />
          </label>
          <div id="preview-2" class="preview"></div>
          <button id="remove-2" class="remove-btn hidden">Remove</button>
        </div>
      </div>

      <div id="combined-description" class="combined-desc hidden" style="margin-top: 20px; padding: 16px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e0e0e0;">
        <strong>Combined Description:</strong>
        <p id="description-text" style="margin: 10px 0 0; white-space: pre-wrap;"></p>
      </div>
    `;

    const input1 = document.getElementById('reference-image-1');
    const input2 = document.getElementById('reference-image-2');
    const preview1 = document.getElementById('preview-1');
    const preview2 = document.getElementById('preview-2');
    const remove1 = document.getElementById('remove-1');
    const remove2 = document.getElementById('remove-2');
    const descContainer = document.getElementById('combined-description');
    const descText = document.getElementById('description-text');

    const handleUpload = (input, preview, removeBtn, slot) => {
      input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
          UI.showMessage('template-status', 'Please upload an image file.', 'error');
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          UI.showMessage('template-status', 'Image too large (max 10MB).', 'error');
          return;
        }

        const url = URL.createObjectURL(file);
        preview.innerHTML = `<img src="${url}" style="max-width:100%; max-height:300px; border-radius:8px;">`;
        removeBtn.classList.remove('hidden');

        // Store reference
        if (slot === 1) this.refImage1 = file;
        else this.refImage2 = file;

        removeBtn.onclick = () => {
          input.value = '';
          preview.innerHTML = '';
          removeBtn.classList.add('hidden');
          if (slot === 1) this.refImage1 = null;
          else this.refImage2 = null;
          descContainer.classList.add('hidden');
        };

        // Check if both images are ready → generate combined description
        if (this.refImage1 && this.refImage2) {
          await this.generateCombinedDescription();
        }
      });
    };

    handleUpload(input1, preview1, remove1, 1);
    handleUpload(input2, preview2, remove2, 2);
  },

  // Call your backend to get a combined description from two images
  async generateCombinedDescription() {
    const descContainer = document.getElementById('combined-description');
    const descText = document.getElementById('description-text');

    descContainer.classList.remove('hidden');
    descText.textContent = 'Analyzing both images...';

    try {
      const formData = new FormData();
      formData.append('image1', this.refImage1);
      formData.append('image2', this.refImage2);

      const resp = await fetch('/api/describe-dual', {
        method: 'POST',
        body: formData
      });

      const result = await resp.json();

      if (result.description) {
        descText.textContent = result.description;
        // Optional: auto-fill into prompt or store in AppState
        AppState.combinedReferenceDescription = result.description;
        this.updatePromptDisplay(); // if you want to include it
      } else {
        descText.textContent = 'Could not generate description.';
      }
    } catch (err) {
      console.error('Combined description error:', err);
      descText.textContent = 'Error generating description.';
    }
  },

  // Optional: enhance prompt with combined description
  updatePromptDisplay() {
    // your existing logic...
    const selectedTemplates = Array.from(
      document.querySelectorAll('#template-checkboxes input:checked')
    ).map(cb => cb.value);

    let extra = '';
    if (AppState.userSpecs && Object.keys(AppState.selectedSpecs).length > 0) {
      extra = Object.entries(AppState.selectedSpecs)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      if (extra) extra = ', ' + extra;
    }

    // Add combined description if available
    if (AppState.combinedReferenceDescription) {
      extra += (extra ? ' | ' : ', ') + 'Reference: ' + AppState.combinedReferenceDescription;
    }

    const promptDisplay = document.getElementById('prompt-display');
    const displayProduct = AppState.selectedProduct || AppState.userProductName || 'Product';

    if (promptDisplay) {
      if (selectedTemplates.length > 0 && displayProduct) {
        promptDisplay.textContent = `Generate a design for ${displayProduct} in ${selectedTemplates.join(', ')} style${extra}`;
      } else if (!displayProduct) {
        promptDisplay.textContent = window.i18n.t('setProductName');
      } else {
        promptDisplay.textContent = window.i18n.t('selectTemplate');
      }
    }
  },

  // ... rest of your methods (displayImages, feedback, etc.) stay exactly the same
  displayImages(image1, image2) { /* unchanged */ },
  setupFeedbackButtons(image1, image2) { /* unchanged */ },
  _download(url, side) { /* unchanged */ },
  async recordFeedback(leftGood, rightGood, bothBad, url1, url2) { /* unchanged */ },
  async saveImagesToDB() { /* unchanged */ },
  updateGenerationCounter() { /* unchanged */ },
};

window.TemplateManager = TemplateManager;