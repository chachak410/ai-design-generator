const Generator = {
  async generateImages() {
    if (!AppState.currentUser) {
      UI.showMessage('template-status', 'Please sign in to generate images.', 'error');
      return;
    }

    // CRITICAL: Ensure selectedProduct is a SINGLE product, not a comma-separated list
    // If selectedProduct is empty or contains multiple products, use the first one
    let selectedProduct = AppState.selectedProduct;
    if (!selectedProduct || selectedProduct.trim().length < 2) {
      // Fallback: try to get first product from allowedProducts
      if (AppState.allowedProducts && AppState.allowedProducts.length > 0) {
        selectedProduct = AppState.allowedProducts[0];
        AppState.selectedProduct = selectedProduct;
        console.log('[Generator] ⚠️ selectedProduct was empty, auto-selecting first:', selectedProduct);
      } else if (AppState.userProductName) {
        // Last resort: parse from userProductName
        const products = AppState.userProductName.split(/[,;]/).map(p => p.trim()).filter(p => p);
        if (products.length > 0) {
          selectedProduct = products[0];
          AppState.selectedProduct = selectedProduct;
          console.log('[Generator] ⚠️ selectedProduct was empty, parsing from userProductName:', selectedProduct);
        }
      }
    }
    
    // ADDITIONAL SAFETY: Check if selectedProduct contains comma (indicates it wasn't properly selected)
    if (selectedProduct && selectedProduct.includes(',')) {
      console.warn('[Generator] ⚠️ selectedProduct contains comma, extracting first product:', selectedProduct);
      const products = selectedProduct.split(',').map(p => p.trim()).filter(p => p);
      if (products.length > 0) {
        selectedProduct = products[0];
        AppState.selectedProduct = selectedProduct;
      }
    }

    if (!selectedProduct || selectedProduct.trim().length < 2) {
      UI.showMessage('template-status', 'Please select a product to generate images.', 'error');
      return;
    }

    // Check credits for client accounts
    if (AppState.userRole === 'client') {
      const credits = await Profile.getCredits();
      if (credits < 2) {
        UI.showMessage('template-status', 'Insufficient credits. Please purchase more credits to generate images.', 'error');
        return;
      }
    }

    const selectedTemplates = Array.from(
      document.querySelectorAll('#template-checkboxes input:checked')
    ).map(cb => cb.value);

    if (selectedTemplates.length === 0) {
      UI.showMessage('template-status', 'Please select at least one template.', 'error');
      return;
    }

    if (AppState.generationCount >= 20) {
      UI.showMessage('template-status', 'Maximum generation limit (20) reached for this session.', 'error');
      return;
    }

    let extra = '';
    if (AppState.userSpecs && Object.keys(AppState.selectedSpecs).length > 0) {
      extra = Object.entries(AppState.selectedSpecs)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      if (extra) extra = ', ' + extra;
    }

    // Translate SELECTED product name to English (CRITICAL for AI quality)
    // Use selectedProduct ALWAYS and ONLY use ProductTranslator (not Translator)
    let productNameEnglish = selectedProduct;
    let extraEnglish = extra;
    
    console.log('[Generator] Initial selected product:', productNameEnglish);
    console.log('[Generator] Selected product from AppState:', AppState.selectedProduct);
    
    // ALWAYS attempt translation for the SELECTED product only
    if (productNameEnglish && productNameEnglish.trim().length > 0) {
      try {
        // First check if text is Chinese
        const containsChinese = /[\u4e00-\u9fff]/.test(productNameEnglish);
        console.log('[Generator] Selected product contains Chinese?', containsChinese);
        
        if (containsChinese) {
          // Use ProductTranslator (not the general Translator)
          console.log('[Generator] Attempting ProductTranslator.translateProduct()...');
          
          try {
            productNameEnglish = await window.ProductTranslator.translateProduct(selectedProduct, 3);
            console.log('[Generator] ✅ ProductTranslator result:', productNameEnglish);
            
            // Verify translation is valid
            if (!productNameEnglish || /[\u4e00-\u9fff]/.test(productNameEnglish)) {
              console.warn('[Generator] ⚠️ Translation result still contains Chinese or is empty!');
              productNameEnglish = 'Product'; // Fallback
            }
          } catch (translatorErr) {
            console.error('[Generator] ❌ ProductTranslator error:', translatorErr.message);
            productNameEnglish = 'Product'; // Fallback
          }
        } else {
          console.log('[Generator] Selected product is already English or not Chinese');
        }
        
        // Also translate extra specs if they contain non-English (with timeout)
        if (extra && /[\u4e00-\u9fff]/.test(extra)) {
          console.log('[Generator] Translating extra specs...');
          try {
            const translatedExtra = await window.ProductTranslator.translateProduct(extra, 2);
            if (translatedExtra && translatedExtra.trim().length > 0 && !/[\u4e00-\u9fff]/.test(translatedExtra)) {
              extraEnglish = translatedExtra;
              console.log('[Generator] Translated specs:', extra, '→', extraEnglish);
            }
          } catch (err) {
            console.warn('[Generator] Specs translation failed:', err.message);
          }
        }
        
      } catch (err) {
        console.error('[Generator] ❌ Outer translation error:', err.message);
        // Make sure we at least use a generic fallback
        if (/[\u4e00-\u9fff]/.test(productNameEnglish)) {
          productNameEnglish = 'Product';
          console.log('[Generator] Fallback to generic name');
        }
      }
    }
    
    // CRITICAL VERIFICATION: Ensure NO Chinese in final prompt
    console.log('[Generator] Final product name for prompt:', productNameEnglish);
    const hasChinese = /[\u4e00-\u9fff]/.test(productNameEnglish);
    console.log('[Generator] ⚠️ CRITICAL: Contains Chinese after translation?', hasChinese);
    if (hasChinese) {
      console.error('[Generator] 🔴 ERROR: Still contains Chinese! Using fallback...');
      productNameEnglish = 'Product';  // Ultimate fallback
    }

    // Build final prompt with ONLY the selected product in English
    const prompt = `A beautiful product design for ${productNameEnglish}, ${selectedTemplates.join(', ')} style${extraEnglish ? ', ' + extraEnglish : ''}, high quality, detailed, professional`;

    this.showProgress();

    const generateBtn = document.getElementById('generate-images-btn');
    if (generateBtn) {
      generateBtn.disabled = true;
      generateBtn.textContent = 'Generating...';
    }

    try {
      const images = await this.generateImagePair(prompt);

      if (images.length === 2) {
        ImageRenderer.renderGeneratedImages(images);
        
        // CRITICAL: Wire up feedback buttons by calling TemplateManager.displayImages
        // This ensures setupFeedbackButtons() is called to attach event listeners
        const image1Url = images[0].url;
        const image2Url = images[1].url;
        TemplateManager.displayImages(image1Url, image2Url);

        // Save with both original and English versions
        await AppState.db.collection('generations').add({
          userId: AppState.currentUser.uid,
          templates: selectedTemplates,
          productName: AppState.selectedProduct,  // Save the selected product (original language)
          productNameEnglish: productNameEnglish,  // Save the translated English version
          prompt: prompt,
          specifications: AppState.selectedSpecs,
          images: images.map(img => ({ 
            provider: img.provider, 
            url: img.url 
          })),
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Deduct credits for client accounts
        if (AppState.userRole === 'client') {
          const deducted = await Profile.deductCredits(2);
          if (deducted) {
            const remainingCredits = await Profile.getCredits();
            UI.showMessage('template-status', ` Images generated successfully! Remaining credits: ${remainingCredits}`, 'success');
            // Reload account info to update credit display
            await Profile.loadAccountInfo();
          } else {
            UI.showMessage('template-status', ' Images generated but credit deduction failed. Please contact support.', 'warning');
          }
        } else {
          UI.showMessage('template-status', ' Images generated successfully!', 'success');
        }
      } else {
        UI.showMessage('template-status', ` Generated ${images.length}/2 images. Please try again.`, 'error');
      }

    } catch (err) {
      console.error(' Generation error:', err);
      UI.showMessage('template-status', ' Error generating images: ' + err.message, 'error');
    } finally {
      if (generateBtn) {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Images';
      }
    }
  },

  showProgress() {
    const progressMsg = document.createElement('div');
    progressMsg.id = 'generation-progress';
    progressMsg.className = 'message info';
    progressMsg.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>Generating images with AI...</p>
        <p class="progress-text">Preparing request...</p>
      </div>
    `;
    
    const statusEl = document.getElementById('template-status');
    if (statusEl) {
      statusEl.innerHTML = '';
      statusEl.appendChild(progressMsg);
      statusEl.style.display = 'block';
    }
  },

  updateProgress(message) {
    const progressText = document.querySelector('#generation-progress .progress-text');
    if (progressText) {
      progressText.textContent = message;
    }
  },

  async generateImagePair(basePrompt) {
    const seed = Date.now();
    const images = [];
    let attempts = 0;
    const maxAttempts = 3;  // Reduced from 15 - no point retrying if API is down

    // CRITICAL CHECK: Verify NO Chinese in prompt before sending to API
    const hasChinese = /[\u4e00-\u9fff]/.test(basePrompt);
    if (hasChinese) {
      console.error('[Generator] 🔴 CRITICAL ERROR: Prompt contains Chinese characters!');
      console.error('[Generator] Prompt:', basePrompt);
      throw new Error('Prompt contains Chinese characters. Translation failed!');
    }
    
    console.log('[Generator] ✅ Starting image generation with CLEAN prompt (no Chinese):', basePrompt);

    // First, try Pollinations with limited retries
    while (images.length < 2 && attempts < maxAttempts && AppState.generationCount < 20) {
      const prompt = images.length === 0 
        ? basePrompt 
        : `${basePrompt} (variation ${images.length + 1})`;

      this.updateProgress(`Generating image ${images.length + 1}/2 (attempt ${attempts + 1}/${maxAttempts})...`);

      try {
        // Use Pollinations API directly
        console.log('[Generator] Calling PollinationsAPI.generate() with prompt:', prompt);
        const result = await PollinationsAPI.generate(prompt, seed + attempts);
        
        if (result && result.images && result.images.length > 0) {
          // Add each image from the result
          for (const imageUrl of result.images) {
            if (imageUrl && images.length < 2) {
              images.push({
                provider: 'Pollinations AI',
                url: imageUrl
              });
              AppState.generationCount++;
              TemplateManager.updateGenerationCounter();
              this.updateProgress(` Image ${images.length}/2 generated successfully!`);
            }
          }
        } else {
          console.warn('[Generator] Pollinations returned no images');
          this.updateProgress(`API returned no images, retrying...`);
        }
      } catch (err) {
        console.error(`[Generator] Generation attempt ${attempts + 1} failed:`, err.message || err);
        this.updateProgress(`Attempt ${attempts + 1} failed, retrying...`);
      }

      attempts++;
    }

    // If Pollinations failed completely, try Stability as backup
    if (images.length < 2) {
      console.warn('[Generator] Pollinations failed, switching to Stability AI backup...');
      this.updateProgress('Pollinations unavailable, trying Stability AI backup...');
      
      try {
        const seed2 = Date.now() + 1;
        for (let i = images.length; i < 2; i++) {
          const backupPrompt = i === 0 ? basePrompt : `${basePrompt} (variation ${i + 1})`;
          console.log('[Generator] Trying Stability backup for image', i + 1);
          
          const backupImage = await StabilityAPI.generate(backupPrompt, seed2 + i);
          
          if (backupImage && backupImage.url) {
            images.push(backupImage);
            AppState.generationCount++;
            TemplateManager.updateGenerationCounter();
            this.updateProgress(` Image ${images.length}/2 generated with Stability backup!`);
          } else {
            console.warn('[Generator] Stability backup also failed for image', i + 1);
            this.updateProgress(`Stability backup failed for image ${i + 1}`);
          }
        }
      } catch (err) {
        console.error('[Generator] Stability backup failed:', err.message);
        this.updateProgress('Both APIs failed, please try again later');
      }
    }

    console.log('[Generator] generateImagePair completed:', { imageCount: images.length, attempts });
    return images;
  },

  /**
   * Simple fallback translation for when API fails
   * Common Chinese product names to English
   * @private
   */
  _simplifyTranslation(chineseText) {
    // Extended translation dictionary for common Chinese products
    const translations = {
      // Beauty & Cosmetics
      '口红': 'Lipstick',
      '眼影': 'Eyeshadow',
      '眉笔': 'Eyebrow Pencil',
      '粉底': 'Foundation',
      '腮红': 'Blush',
      '睫毛膏': 'Mascara',
      '唇膏': 'Lip Gloss',
      '化妆品': 'Cosmetics',
      '护肤': 'Skincare',
      '化妆': 'Makeup',
      '面膜': 'Face Mask',
      '爽肤水': 'Toner',
      '精华': 'Essence',
      '乳液': 'Lotion',
      '面霜': 'Face Cream',
      
      // Proteins & Supplements
      '胶原蛋白': 'Collagen Protein',
      '蛋白质': 'Protein',
      '维生素': 'Vitamin',
      
      // Colors
      '红色': 'Red',
      '蓝色': 'Blue',
      '黑色': 'Black',
      '白色': 'White',
      '绿色': 'Green',
      '粉红': 'Pink',
      '紫色': 'Purple',
      '黄色': 'Yellow',
      '橙色': 'Orange',
      '灰色': 'Gray',
      
      // Accessories & Items
      '手机壳': 'Phone Case',
      '手机': 'Phone',
      '茶杯': 'Tea Cup',
      '杯子': 'Cup',
      '咖啡': 'Coffee',
      '包': 'Bag',
      '鞋': 'Shoes',
      '帽子': 'Hat',
      '手表': 'Watch',
      '眼镜': 'Glasses',
      '项链': 'Necklace',
      '耳环': 'Earrings',
      '手环': 'Bracelet',
      '戒指': 'Ring',
      
      // Apparel
      '服装': 'Clothing',
      '衣服': 'Clothes',
      '连衣裙': 'Dress',
      '上衣': 'Top',
      '裤子': 'Pants',
      '裙子': 'Skirt',
      '外套': 'Jacket',
      '毛衣': 'Sweater',
      '衬衫': 'Shirt',
      
      // Food & Beverage
      '茶': 'Tea',
      '咖啡豆': 'Coffee Beans',
      '巧克力': 'Chocolate',
      '糖果': 'Candy',
      '饼干': 'Cookie',
      '蛋糕': 'Cake',
      
      // Furniture
      '沙发': 'Sofa',
      '椅子': 'Chair',
      '床': 'Bed',
      '桌子': 'Table',
      '柜子': 'Cabinet',
      
      // Electronics
      '电脑': 'Computer',
      '笔记本': 'Laptop',
      '平板': 'Tablet',
      '充电器': 'Charger',
      '耳机': 'Headphones'
    };

    // Try exact match first
    if (translations[chineseText]) {
      console.log('[Generator] Dictionary match found:', chineseText, '→', translations[chineseText]);
      return translations[chineseText];
    }

    // Try partial matches (if text contains a dictionary entry)
    for (const [chinese, english] of Object.entries(translations)) {
      if (chineseText.includes(chinese)) {
        const result = chineseText.replace(chinese, english);
        console.log('[Generator] Partial match found:', chineseText, '→', result);
        return result;
      }
    }

    // Last resort: if still Chinese, return a generic product name
    if (/[\u4e00-\u9fff]/.test(chineseText)) {
      console.warn('[Generator] No dictionary match found for:', chineseText, '- using generic name');
      return 'Product';
    }

    // Already English or unknown
    return chineseText;
  },

  handleFeedback(choice) {
    const images = window.currentImages;
    if (!images || images.length !== 2) return;

    console.log('User feedback:', choice);

    if (choice === 0) {
      ImageRenderer.downloadImage(images[0].url, `design-left-${Date.now()}.png`);
      UI.showMessage('template-status', ' Left image downloaded!', 'success');
    } else if (choice === 1) {
      ImageRenderer.downloadImage(images[1].url, `design-right-${Date.now()}.png`);
      UI.showMessage('template-status', ' Right image downloaded!', 'success');
    } else if (choice === 'tie') {
      ImageRenderer.downloadImage(images[0].url, `design-1-${Date.now()}.png`);
      setTimeout(() => {
        ImageRenderer.downloadImage(images[1].url, `design-2-${Date.now()}.png`);
      }, 500);
      UI.showMessage('template-status', ' Both images downloaded!', 'success');
    }
  }
};

// Export to global scope
window.Generator = Generator;
