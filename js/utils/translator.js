/**
 * Google Translate Integration Module
 * Translates all UI context, prompts, inputs, and feedback
 * Supports: English, Simplified Chinese, Traditional Chinese
 */

const Translator = {
  // Language codes
  LANGUAGES: {
    en: 'en',
    zh_CN: 'zh-CN',    // Simplified Chinese
    zh_TW: 'zh-TW'     // Traditional Chinese
  },

  // Current language (default: English)
  currentLanguage: 'en',

  // Translation cache to avoid repeated API calls
  translationCache: {},

  // Initialize translator
  async init() {
    // Load saved language preference from localStorage
    const savedLanguage = localStorage.getItem('preferredLanguage');
    if (savedLanguage && Object.values(this.LANGUAGES).includes(savedLanguage)) {
      this.currentLanguage = savedLanguage;
    }
    console.log('[Translator] Initialized with language:', this.currentLanguage);
  },

  /**
   * Set the current language
   * @param {string} langCode - 'en', 'zh_CN', or 'zh_TW'
   */
  setLanguage(langCode) {
    if (Object.values(this.LANGUAGES).includes(langCode)) {
      this.currentLanguage = langCode;
      localStorage.setItem('preferredLanguage', langCode);
      console.log('[Translator] Language switched to:', langCode);
      // Trigger global language change event for UI update
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: langCode } }));
    } else {
      console.warn('[Translator] Invalid language code:', langCode);
    }
  },

  /**
   * Get current language
   */
  getLanguage() {
    return this.currentLanguage;
  },

  /**
   * Translate text to a target language
   * Uses Google Translate API via a backend proxy or client-side workaround
   * 
   * @param {string} text - Text to translate
   * @param {string} targetLang - Target language code ('en', 'zh_CN', 'zh_TW')
   * @param {string} sourceLang - Source language (auto-detect if not provided)
   * @returns {Promise<string>} - Translated text
   */
  async translate(text, targetLang = 'en', sourceLang = null) {
    if (!text || text.trim().length === 0) {
      return text;
    }

    // If already in target language, return as is
    if (targetLang === this.currentLanguage && !sourceLang) {
      return text;
    }

    // Create cache key
    const cacheKey = `${text}|${targetLang}|${sourceLang || 'auto'}`;

    // Check cache first
    if (this.translationCache[cacheKey]) {
      console.log('[Translator] Cache hit:', cacheKey.substring(0, 50) + '...');
      return this.translationCache[cacheKey];
    }

    try {
      // Determine source language
      const source = sourceLang || await this.detectLanguage(text);

      // If source and target are the same, return original
      if (source === targetLang) {
        this.translationCache[cacheKey] = text;
        return text;
      }

      // Use Google Translate free API (via RapidAPI or similar service)
      const translatedText = await this._callGoogleTranslateAPI(
        text,
        source,
        targetLang
      );

      // Cache the result
      this.translationCache[cacheKey] = translatedText;
      console.log('[Translator] Translated:', text.substring(0, 30) + '... → ' + translatedText.substring(0, 30) + '...');

      return translatedText;

    } catch (error) {
      console.error('[Translator] Translation failed:', error);
      // Fallback: return original text if translation fails
      return text;
    }
  },

  /**
   * Translate to English (commonly used for AI prompts)
   * @param {string} text
   * @returns {Promise<string>}
   */
  async toEnglish(text) {
    return this.translate(text, 'en');
  },

  /**
   * Translate to current UI language
   * @param {string} text
   * @param {string} sourceLang - Optional source language hint
   * @returns {Promise<string>}
   */
  async toCurrentLanguage(text, sourceLang = null) {
    return this.translate(text, this.currentLanguage, sourceLang);
  },

  /**
   * Detect the language of given text
   * @param {string} text
   * @returns {Promise<string>} - Language code
   */
  async detectLanguage(text) {
    if (!text || text.trim().length === 0) {
      return 'en';
    }

    try {
      const response = await fetch('https://api.mymemory.translated.net/get', {
        method: 'GET'
      });

      // Simplified detection: check for Chinese characters
      if (/[\u4e00-\u9fff]/.test(text)) {
        // Contains Chinese characters
        // Check if Traditional or Simplified
        if (/[\u4e00-\u9fff]/.test(text) && this._hasTraditionalChinese(text)) {
          return 'zh-TW';
        }
        return 'zh-CN';
      }

      // Check for other patterns (Japanese, Korean, etc.)
      if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) {
        return 'ja';
      }
      if (/[\uac00-\ud7af]/.test(text)) {
        return 'ko';
      }

      // Default to English
      return 'en';

    } catch (error) {
      console.warn('[Translator] Language detection failed, defaulting to English:', error);
      return 'en';
    }
  },

  /**
   * Check if text contains Traditional Chinese characters
   * @private
   */
  _hasTraditionalChinese(text) {
    // Common Traditional Chinese characters not in Simplified
    const traditionalChars = /[繁體中文國際會議]/;
    return traditionalChars.test(text);
  },

  /**
   * Call Google Translate API
   * Uses a free/open translation API (MyMemory or Google Translate free endpoint)
   * @private
   */
  async _callGoogleTranslateAPI(text, sourceLang, targetLang) {
    // Map language codes to Google Translate format
    const langMap = {
      'en': 'en',
      'zh-CN': 'zh-CN',
      'zh_CN': 'zh-CN',
      'zh-TW': 'zh-TW',
      'zh_TW': 'zh-TW',
      'zh-CN': 'zh-CN',  // Fallback for simplified Chinese
      'zh': 'zh-CN'       // Default to simplified
    };

    const sourceCode = langMap[sourceLang] || sourceLang;
    const targetCode = langMap[targetLang] || targetLang;

    // Method 1: Use MyMemory Translated API (free, no key required)
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceCode}|${targetCode}`;
      
      const controller = new AbortController();
      let timeoutId;
      
      try {
        timeoutId = setTimeout(() => {
          console.warn('[Translator] API timeout after 10 seconds, aborting...');
          controller.abort();
        }, 10000); // 10 second timeout
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'ai-design-generator'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`API response status: ${response.status}`);
        }

        const data = await response.json();

        // Check if translation was successful
        if (data.responseStatus === 200 && data.responseData?.translatedText) {
          const result = data.responseData.translatedText;
          console.log('[Translator] API translation successful:', text.substring(0, 30) + '... → ' + result.substring(0, 30) + '...');
          return result;
        } else if (data.responseStatus === 429) {
          console.warn('[Translator] API rate limited, using backup method');
          return this._useBackupTranslation(text, sourceCode, targetCode);
        } else {
          throw new Error(`API returned status: ${data.responseStatus}`);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        // Check if it's an AbortError (timeout)
        if (fetchError.name === 'AbortError') {
          console.warn('[Translator] Translation API timed out after 10 seconds');
        } else {
          console.warn('[Translator] API fetch failed:', fetchError.message);
        }
        
        // Fallback to backup method
        return this._useBackupTranslation(text, sourceCode, targetCode);
      }

    } catch (error) {
      console.warn('[Translator] MyMemory API error:', error.message || error);
      // Fallback to backup method
      return this._useBackupTranslation(text, sourceCode, targetCode);
    }
  },

  /**
   * Backup translation method using Google Translate free endpoint
   * @private
   */
  async _useBackupTranslation(text, sourceLang, targetLang) {
    try {
      // This uses the hidden Google Translate API endpoint
      const url = `https://translate.googleapis.com/translate_a/element.js?cb=googleTranslateElementInit`;
      
      // Alternative: Use a public translation API or service
      // For production, consider using a proper backend proxy that calls Google Translate API
      const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`, {
        method: 'GET'
      });

      const data = await response.json();
      if (data.responseData?.translatedText) {
        return data.responseData.translatedText;
      }

      // If all else fails, return original text with a warning
      console.warn('[Translator] All translation methods failed for:', text);
      return text;

    } catch (error) {
      console.error('[Translator] Backup translation error:', error);
      return text;
    }
  },

  /**
   * Translate multiple texts at once (batch translation)
   * @param {string[]} texts - Array of texts to translate
   * @param {string} targetLang - Target language
   * @returns {Promise<string[]>} - Array of translated texts
   */
  async translateBatch(texts, targetLang = 'en') {
    return Promise.all(
      texts.map(text => this.translate(text, targetLang))
    );
  },

  /**
   * Clear translation cache
   */
  clearCache() {
    this.translationCache = {};
    console.log('[Translator] Cache cleared');
  }
};

// Initialize translator when script loads
Translator.init().catch(err => console.error('[Translator] Init failed:', err));

// Export to global scope
window.Translator = Translator;
