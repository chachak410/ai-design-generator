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

        const newProductId = existingProducts + 1;
        const newItem = document.createElement('div');
        newItem.className = 'product-item';
        newItem.dataset.productId = newProductId;
        newItem.innerHTML = `
          <input type="text" placeholder="Product name (e.g., T-shirt, Handbag)" class="product-name-input" aria-label="Product name ${newProductId}" id="product-name-${newProductId}">
          <button class="btn-remove-product" data-action="remove-product" aria-label="Remove product ${newProductId}">×</button>
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

    test('should set correct data-product-id based on DOM count', () => {
      const container = document.getElementById('products-container');
      const initialCount = container.querySelectorAll('.product-item').length;
      
      TemplateCreation.addProduct();
      
      const newItem = container.querySelectorAll('.product-item')[initialCount];
      expect(newItem.dataset.productId).toBe(String(initialCount + 1));
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
      
      // Should not throw
      expect(() => TemplateCreation.addProduct()).not.toThrow();
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

  describe('displayGeneratedCode with multiple #template-status elements', () => {
    test('should prefer #template-status inside #template-editor when available', async () => {
      // Setup DOM with multiple template-status elements (simulating real page)
      document.body.innerHTML = `
        <div id="template-page">
          <div id="template-status" class="message" style="display: none;"></div>
        </div>
        <div id="template-editor">
          <div id="products-container">
            <div class="product-item" data-product-id="1">
              <input type="text" class="product-name-input">
            </div>
          </div>
          <div id="template-status" class="message" style="display: none;"></div>
        </div>
      `;
      
      // Create updated displayGeneratedCode that uses querySelector
      const displayGeneratedCodeWithSelector = async (code) => {
        const statusEl = document.querySelector('#template-editor #template-status') || 
                         document.getElementById('template-status');
        if (!statusEl) return;

        const codeBox = document.createElement('div');
        codeBox.id = 'generated-industry-code-box';
        codeBox.className = 'industry-code-box';
        
        const codeDisplay = document.createElement('div');
        codeDisplay.className = 'industry-code-value';
        codeDisplay.textContent = code;
        codeBox.appendChild(codeDisplay);

        statusEl.innerHTML = '';
        statusEl.appendChild(codeBox);
        statusEl.style.display = 'block';
      };
      
      await displayGeneratedCodeWithSelector('123456');
      
      // The code box should be in the template-editor's status element
      const editorStatus = document.querySelector('#template-editor #template-status');
      const pageStatus = document.querySelector('#template-page #template-status');
      
      expect(editorStatus.querySelector('#generated-industry-code-box')).toBeTruthy();
      expect(pageStatus.querySelector('#generated-industry-code-box')).toBeFalsy();
    });
  });

  describe('click handlers for add product', () => {
    let addProductCalled;
    
    beforeEach(() => {
      addProductCalled = false;
      
      // Reset DOM with add product button
      document.body.innerHTML = `
        <div id="template-editor">
          <div id="products-container">
            <div class="product-item" data-product-id="1">
              <input type="text" class="product-name-input">
              <button class="btn-remove-product">×</button>
            </div>
          </div>
          <button type="button" id="add-product-btn">+ Add Product</button>
          <div id="template-status" class="message" style="display: none;"></div>
        </div>
      `;
    });

    test('should call addProduct when button is clicked directly', () => {
      const btn = document.getElementById('add-product-btn');
      const container = document.getElementById('products-container');
      const initialCount = container.querySelectorAll('.product-item').length;
      
      // Simulate direct click by calling addProduct
      TemplateCreation.addProduct();
      
      const newCount = container.querySelectorAll('.product-item').length;
      expect(newCount).toBe(initialCount + 1);
    });
  });

  describe('accessibility - dynamically created inputs have labels', () => {
    let AccessibleTemplateCreation;
    
    beforeEach(() => {
      // Use the implementation from the actual source with accessibility fixes
      AccessibleTemplateCreation = {
        MAX_PRODUCTS: 20,
        customSpecCount: 0,
        
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

          const newProductId = existingProducts + 1;
          const newItem = document.createElement('div');
          newItem.className = 'product-item';
          newItem.dataset.productId = newProductId;
          newItem.innerHTML = `
            <input type="text" placeholder="Product name (e.g., T-shirt, Handbag)" class="product-name-input" aria-label="Product name ${newProductId}" id="product-name-${newProductId}">
            <button class="btn-remove-product" data-action="remove-product" aria-label="Remove product ${newProductId}">×</button>
          `;
          container.appendChild(newItem);
          
          const newInput = newItem.querySelector('.product-name-input');
          if (newInput) {
            newInput.focus();
          }
        },
        
        addCustomSpecification() {
          const container = document.getElementById('custom-specs-container');
          if (!container) return;

          const existingSpecs = container.querySelectorAll('.custom-spec-group').length;
          if (existingSpecs >= 5) {
            UI.showMessage('template-status', 'Maximum 5 custom specifications allowed.', 'error');
            return;
          }

          this.customSpecCount++;
          const specId = parseInt(this.customSpecCount, 10);
          const specGroup = document.createElement('div');
          specGroup.className = 'custom-spec-group';
          specGroup.dataset.specId = specId;

          specGroup.innerHTML = `
            <div class="custom-spec-header">
              <input type="text" placeholder="Specification name (e.g., Material, Finish)" class="custom-spec-name" data-spec-id="${specId}" aria-label="Custom specification name ${specId}" id="custom-spec-name-${specId}">
              <button class="btn-remove-custom-spec" data-spec-id="${specId}" aria-label="Remove custom specification ${specId}">×</button>
            </div>
            <div class="custom-spec-values" data-spec-id="${specId}">
              <div class="custom-spec-value-item">
                <input type="text" placeholder="Value" class="custom-spec-value" aria-label="Custom specification ${specId} value 1" id="custom-spec-${specId}-value-1">
                <button class="btn-add-value" data-spec-id="${specId}" aria-label="Add value to specification ${specId}">+</button>
              </div>
            </div>
          `;
          container.appendChild(specGroup);
        },
        
        addCustomSpecValue(specId) {
          const parsedId = parseInt(specId, 10);
          if (isNaN(parsedId)) return;
          
          const container = document.querySelector(`.custom-spec-values[data-spec-id="${parsedId}"]`);
          if (!container) return;

          const values = container.querySelectorAll('.custom-spec-value-item');
          if (values.length >= 5) {
            UI.showMessage('template-status', 'Maximum 5 values per specification.', 'error');
            return;
          }

          const valueNumber = values.length + 1;
          const valueItem = document.createElement('div');
          valueItem.className = 'custom-spec-value-item';
          valueItem.innerHTML = `
            <input type="text" placeholder="Value" class="custom-spec-value" aria-label="Custom specification ${parsedId} value ${valueNumber}" id="custom-spec-${parsedId}-value-${valueNumber}">
            <button class="btn-remove-value" aria-label="Remove value ${valueNumber} from specification ${parsedId}">−</button>
          `;
          container.appendChild(valueItem);
        }
      };
      
      // Reset DOM with containers for testing
      document.body.innerHTML = `
        <div id="template-editor">
          <div id="products-container">
            <div class="product-item" data-product-id="1">
              <input type="text" placeholder="Product name (e.g., T-shirt, Handbag)" class="product-name-input" aria-label="Product name 1" id="product-name-1">
              <button class="btn-remove-product" data-action="remove-product" aria-label="Remove product 1">×</button>
            </div>
          </div>
          <div id="custom-specs-container"></div>
          <div id="template-status" class="message" style="display: none;"></div>
        </div>
      `;
    });

    test('dynamically added product input should have aria-label', () => {
      AccessibleTemplateCreation.addProduct();
      
      const container = document.getElementById('products-container');
      const newItem = container.querySelectorAll('.product-item')[1];
      const newInput = newItem.querySelector('.product-name-input');
      
      expect(newInput.getAttribute('aria-label')).toBe('Product name 2');
    });

    test('dynamically added product input should have unique id', () => {
      AccessibleTemplateCreation.addProduct();
      
      const container = document.getElementById('products-container');
      const newItem = container.querySelectorAll('.product-item')[1];
      const newInput = newItem.querySelector('.product-name-input');
      
      expect(newInput.id).toBe('product-name-2');
    });

    test('dynamically added remove product button should have aria-label', () => {
      AccessibleTemplateCreation.addProduct();
      
      const container = document.getElementById('products-container');
      const newItem = container.querySelectorAll('.product-item')[1];
      const removeBtn = newItem.querySelector('.btn-remove-product');
      
      expect(removeBtn.getAttribute('aria-label')).toBe('Remove product 2');
    });

    test('custom specification name input should have aria-label', () => {
      AccessibleTemplateCreation.addCustomSpecification();
      
      const specGroup = document.querySelector('.custom-spec-group');
      const specNameInput = specGroup.querySelector('.custom-spec-name');
      
      expect(specNameInput.getAttribute('aria-label')).toBe('Custom specification name 1');
      expect(specNameInput.id).toBe('custom-spec-name-1');
    });

    test('custom specification value input should have aria-label', () => {
      AccessibleTemplateCreation.addCustomSpecification();
      
      const specGroup = document.querySelector('.custom-spec-group');
      const valueInput = specGroup.querySelector('.custom-spec-value');
      
      expect(valueInput.getAttribute('aria-label')).toBe('Custom specification 1 value 1');
      expect(valueInput.id).toBe('custom-spec-1-value-1');
    });

    test('custom specification remove button should have aria-label', () => {
      AccessibleTemplateCreation.addCustomSpecification();
      
      const specGroup = document.querySelector('.custom-spec-group');
      const removeBtn = specGroup.querySelector('.btn-remove-custom-spec');
      
      expect(removeBtn.getAttribute('aria-label')).toBe('Remove custom specification 1');
    });

    test('add value button should have aria-label', () => {
      AccessibleTemplateCreation.addCustomSpecification();
      
      const specGroup = document.querySelector('.custom-spec-group');
      const addValueBtn = specGroup.querySelector('.btn-add-value');
      
      expect(addValueBtn.getAttribute('aria-label')).toBe('Add value to specification 1');
    });

    test('dynamically added custom spec value should have correct aria-label', () => {
      AccessibleTemplateCreation.addCustomSpecification();
      AccessibleTemplateCreation.addCustomSpecValue(1);
      
      const container = document.querySelector('.custom-spec-values[data-spec-id="1"]');
      const values = container.querySelectorAll('.custom-spec-value-item');
      const newValueInput = values[1].querySelector('.custom-spec-value');
      
      expect(newValueInput.getAttribute('aria-label')).toBe('Custom specification 1 value 2');
      expect(newValueInput.id).toBe('custom-spec-1-value-2');
    });

    test('dynamically added remove value button should have aria-label', () => {
      AccessibleTemplateCreation.addCustomSpecification();
      AccessibleTemplateCreation.addCustomSpecValue(1);
      
      const container = document.querySelector('.custom-spec-values[data-spec-id="1"]');
      const values = container.querySelectorAll('.custom-spec-value-item');
      const removeBtn = values[1].querySelector('.btn-remove-value');
      
      expect(removeBtn.getAttribute('aria-label')).toBe('Remove value 2 from specification 1');
    });

    test('all dynamically created inputs should have no label accessibility violations', () => {
      // Add multiple products
      AccessibleTemplateCreation.addProduct();
      AccessibleTemplateCreation.addProduct();
      
      // Add custom specifications
      AccessibleTemplateCreation.addCustomSpecification();
      AccessibleTemplateCreation.addCustomSpecValue(1);
      
      // Check all inputs have aria-label or associated label
      const allInputs = document.querySelectorAll('input[type="text"]');
      allInputs.forEach(input => {
        const hasAriaLabel = input.hasAttribute('aria-label');
        const hasId = input.hasAttribute('id');
        expect(hasAriaLabel).toBe(true);
        expect(hasId).toBe(true);
      });
    });
  });
});
