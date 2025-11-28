/**
 * Product Name Translator
 * ---------------------------------------------------------
 * Specialized translator for product names to English
 * Strategy: Try multiple APIs with intelligent fallback
 * 
 * Priority order:
 * 1. Google Translate API (most reliable)
 * 2. MyMemory API with retry
 * 3. LibreTranslate or other free APIs
 * 4. Fallback: dictionary (only for common products)
 */

const ProductTranslator = {
  // Cache for translations to avoid repeated API calls
  translationCache: {},

  // Common Chinese product names (emergency fallback only)
  fallbackDictionary: {
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
    '胶原蛋白': 'Collagen Protein',
    '蛋白质': 'Protein',
    '维生素': 'Vitamin',
    '手机壳': 'Phone Case',
    '茶杯': 'Tea Cup',
    '包': 'Bag',
    '鞋': 'Shoes'
  },

  /**
   * Main translation method - tries all available APIs
   * @param {string} text - Chinese product name
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Promise<string>} - English translation
   */
  async translateProduct(text, maxRetries = 3) {
    if (!text || text.trim().length === 0) {
      return text;
    }

    const cacheKey = `product:${text}`;

    // Check cache first
    if (this.translationCache[cacheKey]) {
      console.log('[ProductTranslator] Cache hit for:', text);
      return this.translationCache[cacheKey];
    }

    // Check if text is already English
    if (!/[\u4e00-\u9fff]/.test(text)) {
      console.log('[ProductTranslator] Text is already English:', text);
      this.translationCache[cacheKey] = text;
      return text;
    }

    console.log('[ProductTranslator] Starting translation for:', text);

    // Try translation methods in priority order
    let result = null;

    // Method 1: Try Google Translate API (via multiple endpoints)
    console.log('[ProductTranslator] Method 1: Trying Google Translate...');
    result = await this._tryGoogleTranslate(text, maxRetries);
    if (result && this._isValidTranslation(result, text)) {
      this.translationCache[cacheKey] = result;
      console.log('[ProductTranslator] ✅ Google Translate success:', result);
      return result;
    }

    // Method 2: Try MyMemory API with retry
    console.log('[ProductTranslator] Method 2: Trying MyMemory API...');
    result = await this._tryMyMemory(text, maxRetries);
    if (result && this._isValidTranslation(result, text)) {
      this.translationCache[cacheKey] = result;
      console.log('[ProductTranslator] ✅ MyMemory success:', result);
      return result;
    }

    // Method 3: Try Libre Translate API
    console.log('[ProductTranslator] Method 3: Trying LibreTranslate...');
    result = await this._tryLibreTranslate(text, maxRetries);
    if (result && this._isValidTranslation(result, text)) {
      this.translationCache[cacheKey] = result;
      console.log('[ProductTranslator] ✅ LibreTranslate success:', result);
      return result;
    }

    // Method 4: Fallback to dictionary
    console.log('[ProductTranslator] Method 4: Trying fallback dictionary...');
    result = this._tryDictionary(text);
    if (result) {
      this.translationCache[cacheKey] = result;
      console.log('[ProductTranslator] ⚠️ Dictionary fallback used:', result);
      return result;
    }

    // Last resort: return as generic product
    console.warn('[ProductTranslator] 🔴 All translation methods failed, using generic name');
    const fallback = 'Product';
    this.translationCache[cacheKey] = fallback;
    return fallback;
  },

  /**
   * Try Google Translate API using DOM script injection
   * @private
   * @param {string} text - Text to translate
   * @param {number} maxRetries - Maximum retry attempts (default 3)
   * @returns {Promise<string|null>} - Translated text or null
   */
  async _tryGoogleTranslate(text, maxRetries = 3) {
    const TIMEOUT_MS = 3000; // 3 second timeout per attempt

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await this._attemptGoogleTranslateWithScriptInjection(text, TIMEOUT_MS);
        if (result) return result;
      } catch (err) {
        console.warn(`[ProductTranslator] Google Translate attempt ${attempt + 1} failed:`, err.message);
        if (attempt < maxRetries - 1) {
          await this._delay(1000 * (attempt + 1)); // Progressive backoff
        }
      }
    }
    return null;
  },

  /**
   * Single attempt to translate using script injection
   * @private
   * @param {string} text - Text to translate
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {Promise<string|null>} - Translated text or null
   */
  async _attemptGoogleTranslateWithScriptInjection(text, timeoutMs) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error('Timeout'));
        }
      }, timeoutMs);

      // Try the simple JSON endpoint as the primary translation method
      this._simpleGoogleTranslate(text)
        .then(result => {
          if (!settled) {
            settled = true;
            clearTimeout(timeoutId);
            resolve(result);
          }
        })
        .catch(err => {
          if (!settled) {
            settled = true;
            clearTimeout(timeoutId);
            // Fall back to script injection to load Google Translate widget
            // This ensures the widget is available for manual translation if needed
            this._injectGoogleTranslateScript().catch(() => {});
            // Return null to fall back to other translation methods
            resolve(null);
          }
        });
    });
  },

  /**
   * Inject Google Translate script element (for widget loading)
   * Note: This loads the Google Translate widget script, which doesn't provide
   * direct translation results but makes the widget available on the page.
   * @private
   * @returns {Promise<void>}
   */
  _injectGoogleTranslateScript() {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      if (window.google && window.google.translate) {
        resolve();
        return;
      }

      // Create and inject script element
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'https://translate.googleapis.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;

      script.onload = () => {
        console.log('[ProductTranslator] Google Translate script loaded via injection');
        resolve();
      };

      script.onerror = (err) => {
        console.warn('[ProductTranslator] Failed to inject Google Translate script:', err);
        reject(new Error('Script injection failed'));
      };

      // Inject into document head
      (document.head || document.documentElement).appendChild(script);
    });
  },

  /**
   * Simple Google Translate using fetch
   * @private
   */
  async _simpleGoogleTranslate(text) {
    try {
      // This is a workaround - Google Translate doesn't have a public JSON API
      // But we can try their hidden API
      const params = new URLSearchParams({
        client: 'gtx',
        sl: 'zh-CN',
        tl: 'en',
        dt: 't',
        q: text
      });

      const response = await Promise.race([
        fetch(`https://translate.googleapis.com/translate_a/single?${params}`, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0'
          }
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]);

      if (response.ok) {
        const data = await response.json();
        if (data && data[0] && data[0][0]) {
          return data[0][0][0]; // Extracted translation
        }
      }
    } catch (err) {
      console.warn('[ProductTranslator] Simple Google Translate failed:', err.message);
    }
    return null;
  },

  /**
   * Try MyMemory Translated API (most reliable free option)
   * @private
   */
  async _tryMyMemory(text, maxRetries) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=zh-CN|en`;

        const response = await Promise.race([
          fetch(url, {
            method: 'GET',
            headers: {
              'User-Agent': 'ai-design-generator'
            }
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.responseStatus === 200 && data.responseData?.translatedText) {
          const result = data.responseData.translatedText;
          // Validate it's not the same as input (means translation failed)
          if (result.toLowerCase().trim() !== text.toLowerCase().trim()) {
            return result;
          }
        }
      } catch (err) {
        console.warn(`[ProductTranslator] MyMemory attempt ${attempt + 1} failed:`, err.message);
        if (attempt < maxRetries - 1) {
          await this._delay(1000 * (attempt + 1)); // Progressive backoff
        }
      }
    }
    return null;
  },

  /**
   * Try LibreTranslate API (self-hosted option)
   * @private
   */
  async _tryLibreTranslate(text, maxRetries) {
    // LibreTranslate has public instances we can use
    const endpoints = [
      'https://libretranslate.de/translate',
      'https://translate.argosopentech.com/translate'
    ];

    for (let endpoint of endpoints) {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const response = await Promise.race([
            fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                q: text,
                source: 'zh',
                target: 'en'
              })
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]);

          if (response.ok) {
            const data = await response.json();
            if (data.translatedText) {
              return data.translatedText;
            }
          }
        } catch (err) {
          console.warn(`[ProductTranslator] LibreTranslate (${endpoint}) attempt ${attempt + 1} failed:`, err.message);
          if (attempt < maxRetries - 1) {
            await this._delay(500 * (attempt + 1));
          }
        }
      }
    }
    return null;
  },

  /**
   * Try fallback dictionary
   * @private
   */
  _tryDictionary(text) {
    // Try exact match
    if (this.fallbackDictionary[text]) {
      return this.fallbackDictionary[text];
    }

    // Try partial match (contains a known product name)
    for (const [chinese, english] of Object.entries(this.fallbackDictionary)) {
      if (text.includes(chinese)) {
        return text.replace(chinese, english);
      }
    }

    return null;
  },

  /**
   * Validate translation result
   * @private
   */
  _isValidTranslation(result, original) {
    if (!result || result.trim().length === 0) {
      return false;
    }

    // Check if result still contains Chinese
    if (/[\u4e00-\u9fff]/.test(result)) {
      console.warn('[ProductTranslator] Translation still contains Chinese:', result);
      return false;
    }

    // Check if result is significantly different from original
    if (result.toLowerCase().trim() === original.toLowerCase().trim()) {
      console.warn('[ProductTranslator] Translation is same as original:', result);
      return false;
    }

    return true;
  },

  /**
   * Utility: delay function for retry backoff
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Clear cache
   */
  clearCache() {
    this.translationCache = {};
    console.log('[ProductTranslator] Cache cleared');
  }
};

// Export globally
window.ProductTranslator = ProductTranslator;
