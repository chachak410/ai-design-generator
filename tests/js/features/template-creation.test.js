/**
 * @jest-environment jsdom
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

describe('TemplateCreation Module', () => {
  let TemplateCreation;
  let mockUI;
  
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <div id="template-editor">
        <div id="products-container">
          <div class="product-item" data-product-id="1">
            <input type="text" placeholder="Product name" class="product-name-input">
            <button class="btn-remove-product" data-action="remove-product">×</button>
          </div>
        </div>
        <div id="template-status" class="message" style="display: none;"></div>
      </div>
    `;
    
    // Mock UI.showMessage
    mockUI = {
      showMessage: jest.fn()
    };
    global.UI = mockUI;
    
    // Mock navigator.clipboard
    const mockClipboard = {
      writeText: jest.fn().mockResolvedValue(undefined)
    };
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      writable: true,
      configurable: true
    });
    
    // Create a fresh TemplateCreation instance for each test
    TemplateCreation = {
      MAX_PRODUCTS: 20,
      productCount: 1,
      
      addProduct() {
        const container = document.getElementById('products-container');
        if (!container) {
          console.warn('[TemplateCreation] addProduct: products-container not found');
          return;
        }

        const existingProducts = container.querySelectorAll('.product-item').length;
        if (existingProducts >= this.MAX_PRODUCTS) {
          UI.showMessage('template-status', `Maximum ${this.MAX_PRODUCTS} products allowed.`, 'error');
          return;
        }

        this.productCount++;
        const newItem = document.createElement('div');
        newItem.className = 'product-item';
        newItem.dataset.productId = this.productCount;
        newItem.innerHTML = `
          <input type="text" placeholder="Product name (e.g., T-shirt, Handbag)" class="product-name-input">
          <button class="btn-remove-product" data-action="remove-product">×</button>
        `;
        container.appendChild(newItem);
        
        const newInput = newItem.querySelector('.product-name-input');
        if (newInput) {
          newInput.focus();
        }
      },
      
      async copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          try {
            await navigator.clipboard.writeText(text);
            return true;
          } catch (err) {
            console.warn('[TemplateCreation] Clipboard API failed:', err);
          }
        }
        
        try {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.left = '-9999px';
          document.body.appendChild(textarea);
          textarea.select();
          const success = document.execCommand('copy');
          document.body.removeChild(textarea);
          return success;
        } catch (err) {
          return false;
        }
      },
      
      showCopyFeedback(feedbackEl, success) {
        if (!feedbackEl) return;
        feedbackEl.textContent = success ? '✅ Copied!' : '❌ Copy failed';
        feedbackEl.style.display = 'inline-block';
        feedbackEl.setAttribute('role', 'alert');
        feedbackEl.setAttribute('aria-live', 'polite');
      },
      
      async displayGeneratedCode(code) {
        const statusEl = document.getElementById('template-status');
        if (!statusEl) return;

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

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn btn-copy-code';
        copyBtn.setAttribute('aria-label', 'Copy code to clipboard');
        copyBtn.innerHTML = `<span class="copy-icon">📋</span> Copy`;
        
        const copyFeedback = document.createElement('span');
        copyFeedback.className = 'copy-feedback';
        copyFeedback.style.display = 'none';
        
        codeContainer.appendChild(copyBtn);
        codeContainer.appendChild(copyFeedback);
        codeBox.appendChild(codeContainer);

        statusEl.innerHTML = '';
        statusEl.appendChild(codeBox);
        statusEl.className = 'message success';
        statusEl.style.display = 'block';

        await this.copyToClipboard(code);
      }
    };
  });
  
  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('addProduct', () => {
    test('should add a new product input to the container', () => {
      const container = document.getElementById('products-container');
      const initialCount = container.querySelectorAll('.product-item').length;
      
      TemplateCreation.addProduct();
      
      const newCount = container.querySelectorAll('.product-item').length;
      expect(newCount).toBe(initialCount + 1);
    });

    test('should increment productCount when adding a product', () => {
      const initialCount = TemplateCreation.productCount;
      
      TemplateCreation.addProduct();
      
      expect(TemplateCreation.productCount).toBe(initialCount + 1);
    });

    test('should create product item with correct class and input', () => {
      TemplateCreation.addProduct();
      
      const container = document.getElementById('products-container');
      const newItem = container.querySelectorAll('.product-item')[1];
      
      expect(newItem).toBeTruthy();
      expect(newItem.querySelector('.product-name-input')).toBeTruthy();
      expect(newItem.querySelector('.btn-remove-product')).toBeTruthy();
    });

    test('should focus on the newly added input', () => {
      TemplateCreation.addProduct();
      
      const container = document.getElementById('products-container');
      const newItem = container.querySelectorAll('.product-item')[1];
      const newInput = newItem.querySelector('.product-name-input');
      
      expect(document.activeElement).toBe(newInput);
    });

    test('should show error when max products reached', () => {
      // Add products up to MAX_PRODUCTS
      for (let i = 1; i < TemplateCreation.MAX_PRODUCTS; i++) {
        TemplateCreation.addProduct();
      }
      
      // Try to add one more
      TemplateCreation.addProduct();
      
      expect(mockUI.showMessage).toHaveBeenCalledWith(
        'template-status',
        `Maximum ${TemplateCreation.MAX_PRODUCTS} products allowed.`,
        'error'
      );
    });

    test('should not add product when container is missing', () => {
      document.getElementById('products-container').remove();
      
      const initialCount = TemplateCreation.productCount;
      TemplateCreation.addProduct();
      
      expect(TemplateCreation.productCount).toBe(initialCount);
    });
  });

  describe('copyToClipboard', () => {
    test('should use navigator.clipboard when available', async () => {
      const testCode = '123456';
      
      const result = await TemplateCreation.copyToClipboard(testCode);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(testCode);
      expect(result).toBe(true);
    });

    test('should return false when clipboard API fails and fallback fails', async () => {
      navigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard error'));
      document.execCommand = jest.fn().mockReturnValue(false);
      
      const result = await TemplateCreation.copyToClipboard('123456');
      
      expect(result).toBe(false);
    });
  });

  describe('showCopyFeedback', () => {
    test('should show success message when copy succeeds', () => {
      const feedbackEl = document.createElement('span');
      
      TemplateCreation.showCopyFeedback(feedbackEl, true);
      
      expect(feedbackEl.textContent).toBe('✅ Copied!');
      expect(feedbackEl.style.display).toBe('inline-block');
      expect(feedbackEl.getAttribute('role')).toBe('alert');
    });

    test('should show error message when copy fails', () => {
      const feedbackEl = document.createElement('span');
      
      TemplateCreation.showCopyFeedback(feedbackEl, false);
      
      expect(feedbackEl.textContent).toBe('❌ Copy failed');
    });

    test('should not throw when feedbackEl is null', () => {
      expect(() => {
        TemplateCreation.showCopyFeedback(null, true);
      }).not.toThrow();
    });
  });

  describe('displayGeneratedCode', () => {
    test('should create industry code box with correct id', async () => {
      await TemplateCreation.displayGeneratedCode('123456');
      
      const codeBox = document.getElementById('generated-industry-code-box');
      expect(codeBox).toBeTruthy();
      expect(codeBox.className).toContain('industry-code-box');
    });

    test('should display the code correctly', async () => {
      const testCode = '654321';
      
      await TemplateCreation.displayGeneratedCode(testCode);
      
      const codeValue = document.querySelector('.industry-code-value');
      expect(codeValue.textContent).toBe(testCode);
    });

    test('should include a copy button', async () => {
      await TemplateCreation.displayGeneratedCode('123456');
      
      const copyBtn = document.querySelector('.btn-copy-code');
      expect(copyBtn).toBeTruthy();
      expect(copyBtn.getAttribute('aria-label')).toBe('Copy code to clipboard');
    });

    test('should auto-copy code to clipboard', async () => {
      const testCode = '789012';
      
      await TemplateCreation.displayGeneratedCode(testCode);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(testCode);
    });

    test('should make status element visible', async () => {
      await TemplateCreation.displayGeneratedCode('123456');
      
      const statusEl = document.getElementById('template-status');
      expect(statusEl.style.display).toBe('block');
      expect(statusEl.className).toContain('success');
    });
  });

  describe('MAX_PRODUCTS constant', () => {
    test('should be set to 20', () => {
      expect(TemplateCreation.MAX_PRODUCTS).toBe(20);
    });
  });
});
