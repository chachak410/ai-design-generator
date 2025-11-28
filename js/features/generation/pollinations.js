/**
 * Pollinations AI Image Generator
 * -------------------------------------------------
 * Returns: { images: [url1, url2] }  ← exactly what TemplateManager expects
 * Features:
 *   • Two different seeds → two unique images
 *   • 45-second timeout + retry on 502/524/429
 *   • Safe mode + flux model
 *   • CORS + no-cache
 *   • Proxy fallback for network/CORS errors
 *   • Proxy fallback for CORS/network errors
 *   • Exponential backoff with jitter
 *   • Logs everything to console
 */

const PollinationsAPI = {
  /**
   * Attempt to fetch image via proxy endpoint
   * @param {string} prompt
   * @param {number} width
   * @param {number} height
   * @param {number} seed
   * @param {string} model
   * @param {string} safe
   * @returns {Promise<{provider: string, url: string}|null>}
   */
  async fetchViaProxy(prompt, width, height, seed, model, safe) {
    console.log(`Pollinations → Attempting proxy fallback (seed: ${seed})`);
    try {
      const proxyResponse = await fetch('/api/pollinations-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, width, height, seed, model, safe })
      });

      console.debug('Pollinations Proxy → response', proxyResponse.status, 'type', proxyResponse.type, 'content-type=', proxyResponse.headers.get('content-type'), 'url', proxyResponse.url);

      if (!proxyResponse.ok) {
        let errorBody = '';
        try {
          errorBody = await proxyResponse.text();
        } catch (_) { /* ignore */ }
        console.warn(`Pollinations Proxy → HTTP ${proxyResponse.status}: ${errorBody}`);
        return null;
      }

      const blob = await proxyResponse.blob();
      if (blob.size === 0) {
        console.warn('Pollinations Proxy → Empty blob received');
        return null;
      }

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          console.log(`Pollinations Proxy → Success (seed: ${seed}, size: ${blob.size} bytes)`);
          resolve({ provider: 'Pollinations AI', url: reader.result });
        };
        reader.onerror = () => reject(new Error('Failed to read proxy blob'));
        reader.onabort = () => reject(new Error('Proxy FileReader aborted'));
        reader.readAsDataURL(blob);
      });
    } catch (proxyErr) {
      console.error('Pollinations Proxy → fetch error:', proxyErr.message || proxyErr);
   * Calculate exponential backoff delay with jitter
   * @param {number} attempt - Current attempt number (0-based)
   * @param {number} baseDelay - Base delay in milliseconds
   * @param {number} maxDelay - Maximum delay cap in milliseconds
   * @returns {number} - Delay in milliseconds
   */
  calculateBackoffDelay(attempt, baseDelay, maxDelay) {
    const exponentialDelay = baseDelay * Math.pow(1.5, attempt);
    const jitter = Math.random() * baseDelay;
    return Math.min(exponentialDelay + jitter, maxDelay);
  },

  /**
   * Attempt to generate an image via the server-side proxy
   * @param {string} prompt
   * @param {number} seed
   * @returns {Promise<{provider: string, url: string}|null>}
   */
  async tryProxyFallback(prompt, seed) {
    console.log(`Pollinations → Attempting proxy fallback (seed: ${seed})`);
    const proxyUrl = '/api/pollinations-proxy';
    
    try {
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt, seed, width: 768, height: 1024 })
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => '(failed to read body)');
        console.warn(`Pollinations proxy → HTTP ${response.status}: ${errorText}`);
        return null;
      }
      
      const data = await response.json();
      if (data.url) {
        console.log(`Pollinations proxy → Success (seed: ${seed})`);
        return { provider: 'Pollinations AI (via proxy)', url: data.url };
      }
      
      console.warn('Pollinations proxy → No URL in response');
      return null;
    } catch (proxyErr) {
      // Proxy endpoint not available or network error
      console.warn(`Pollinations proxy → Not available or error: ${proxyErr.message || proxyErr}`);
      return null;
    }
  },

  /**
   * Generate a single image from Pollinations
   * @param {string} prompt
   * @param {number} seed
   * @param {number} retries
   * @param {number} overallStartTime - timestamp when generation started (for overall timeout tracking)
   * @returns {Promise<{provider: string, url: string}|null>}
   */
  async generateOne(prompt, seed, retries = 6, overallStartTime = null) {
    const width = 768;
    const height = 1024;
    const model = 'flux';
    const safe = 'true';
    const OVERALL_TIMEOUT_MS = 180000; // 3 minutes overall timeout

    // Track overall timeout
    if (overallStartTime === null) {
      overallStartTime = Date.now();
    }
    
    // Check if overall timeout exceeded
    if (Date.now() - overallStartTime > OVERALL_TIMEOUT_MS) {
      console.error('Pollinations → Overall timeout exceeded (3 minutes), giving up');
      return null;
    }

    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
                `?width=${width}&height=${height}&seed=${seed}&nologo=True&model=${model}&safe=${safe}`;

    console.log(`Pollinations → Generating (seed: ${seed}, retries left: ${retries})`);

    const controller = new AbortController();
    let timeoutId;

    try {
      timeoutId = setTimeout(() => {
        console.warn(`Pollinations → Timeout after 45 seconds, aborting...`);
        controller.abort();
      }, 45000);

      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',  // Back to cors mode to get proper status codes
        cache: 'no-cache',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      timeoutId = null;

      // Diagnostic logging
      console.debug('Pollinations → response status:', response.status, 'type:', response.type, 'content-type:', response.headers.get('content-type'), 'url:', response.url);

      // Check response status
      if (!response.ok) {
        // Log non-ok response body for diagnostics
        let errorBody = '';
        try {
          errorBody = await response.text();
          console.warn(`Pollinations → HTTP ${response.status} response body:`, errorBody);
        } catch (_) {
          console.warn(`Pollinations → HTTP ${response.status}`);
        }

        const is429 = response.status === 429;
        const is5xx = response.status >= 500 && response.status < 600;
        const retryable = is429 || is5xx;

        if (retryable && retries > 0) {
          // 429: 10s base backoff with jitter; 5xx: 5s base backoff with jitter
          const base = is429 ? 10000 : 5000;
          const jitter = Math.random() * base;
          const delay = base + jitter;
          console.warn(`Pollinations → ${is429 ? 'Rate limit' : 'Server error'} ${response.status}, retrying in ${Math.round(delay)}ms (${retries} left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.generateOne(prompt, seed, retries - 1);
      // Log response details for debugging
      const headers = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      console.debug('Pollinations → response', {
        status: response.status,
        type: response.type,
        headers,
        url: response.url
      });

      // Check response status
      if (!response.ok) {
        // Try to read response body for error details
        const errorBody = await response.text().catch(() => '(failed to read body)');
        console.warn(`Pollinations → HTTP ${response.status}: ${errorBody}`);
        
        const retryable = [429, 502, 503, 504].includes(response.status);
        if (retryable && retries > 0) {
          const attempt = 6 - retries;
          const base = response.status === 429 ? 10000 : 5000; // 429: longer backoff
          const delay = this.calculateBackoffDelay(attempt, base, 60000);
          console.warn(`Pollinations → Server/Rate limit ${response.status}, retrying in ${Math.round(delay)}ms (${retries} left)`);
          await new Promise(r => setTimeout(r, delay));
          return this.generateOne(prompt, seed, retries - 1, overallStartTime);
        }
        throw new Error(`HTTP ${response.status}: ${errorBody.substring(0, 200)}`);
      }

      let blob;
      try {
        blob = await response.blob();
      } catch (blobErr) {
        console.warn(`Pollinations → Blob read failed:`, blobErr.message);
        if (retries > 0) {
          const delay = 3000 + Math.random() * 2000;
          console.warn(`Pollinations → Retrying in ${Math.round(delay)}ms (${retries} left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.generateOne(prompt, seed, retries - 1);
          await new Promise(r => setTimeout(r, delay));
          return this.generateOne(prompt, seed, retries - 1, overallStartTime);
        }
        throw blobErr;
      }

      if (blob.size === 0) {
        console.warn(`Pollinations → Empty blob received`);
        if (retries > 0) {
          const delay = 3000 + Math.random() * 2000;
          console.warn(`Pollinations → Retrying in ${Math.round(delay)}ms (${retries} left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.generateOne(prompt, seed, retries - 1);
          await new Promise(r => setTimeout(r, delay));
          return this.generateOne(prompt, seed, retries - 1, overallStartTime);
        }
        throw new Error('Empty blob received from Pollinations API');
      }

      // Convert blob to base64 data URL (more reliable than blob:// URLs)
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64DataUrl = reader.result;
          console.log(`Pollinations → Success (seed: ${seed}, size: ${blob.size} bytes)`);
          resolve({ provider: 'Pollinations AI', url: base64DataUrl });
        };
        reader.onerror = (error) => {
          console.error(`Pollinations → FileReader error:`, error);
          reject(new Error('Failed to read blob from Pollinations response'));
        };
        reader.onabort = () => {
          console.error(`Pollinations → FileReader aborted`);
          reject(new Error('FileReader was aborted while reading Pollinations response'));
        };
        try {
          reader.readAsDataURL(blob);
        } catch (err) {
          console.error(`Pollinations → readAsDataURL error:`, err);
          reject(new Error(`Failed to convert blob to data URL: ${err.message}`));
        }
      });
    } catch (err) {
      // Always clear timeout to prevent memory leaks
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      // Handle different error types
      if (err.name === 'AbortError') {
        console.error('Pollinations generation failed: request aborted (timeout or cancelled)');
      } else if (err instanceof TypeError) {
        // TypeError typically indicates network/CORS failure
        console.error('Pollinations generation failed: network/CORS error:', err.message);
        // Attempt proxy fallback
        const proxyResult = await this.fetchViaProxy(prompt, width, height, seed, model, safe);
        if (proxyResult) {
          return proxyResult;
        }
        // If proxy also fails, retry with backoff if retries remain
        if (retries > 0) {
          const delay = 2000 + Math.random() * 3000;
          console.log(`Pollinations → Network/CORS error, retrying in ${Math.round(delay)}ms (${retries} left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.generateOne(prompt, seed, retries - 1);
        }
      } else if (err.message && err.message.includes('CORS')) {
        console.error('Pollinations generation failed: CORS error, attempting proxy fallback...');
        const proxyResult = await this.fetchViaProxy(prompt, width, height, seed, model, safe);
        if (proxyResult) {
          return proxyResult;
        }
        // For CORS errors, retry with backoff
        if (retries > 0) {
          const delay = 2000 + Math.random() * 3000;
          console.log(`Pollinations → CORS error, retrying in ${Math.round(delay)}ms (${retries} left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.generateOne(prompt, seed, retries - 1);
        console.error('Pollinations → Request aborted (timeout or cancelled)');
        // Try proxy fallback for timeout
        const proxyResult = await this.tryProxyFallback(prompt, seed);
        if (proxyResult) {
          return proxyResult;
        }
        console.error('Pollinations → Both direct and proxy requests failed (timeout)');
        return null;
      }
      
      // Detect CORS/network errors (TypeError in fetch typically indicates CORS or network failure)
      const isCorsOrNetworkError = err instanceof TypeError || 
        (err.message && (err.message.includes('CORS') || 
                         err.message.includes('Failed to fetch') || 
                         err.message.includes('NetworkError') ||
                         err.message.includes('network')));
      
      if (isCorsOrNetworkError) {
        console.error(`Pollinations → CORS/Network error detected: ${err.message || err}`);
        
        // Try proxy fallback for CORS/network errors
        const proxyResult = await this.tryProxyFallback(prompt, seed);
        if (proxyResult) {
          return proxyResult;
        }
        
        // If proxy failed, retry with backoff (CORS issues can be transient)
        if (retries > 0) {
          const attempt = 6 - retries;
          const delay = this.calculateBackoffDelay(attempt, 2000, 30000);
          console.log(`Pollinations → CORS/Network error, retrying in ${Math.round(delay)}ms (${retries} left)`);
          await new Promise(r => setTimeout(r, delay));
          return this.generateOne(prompt, seed, retries - 1, overallStartTime);
        }
        
        console.error('Pollinations → CORS/Network error: All retries and proxy fallback exhausted');
        return null;
      }
      
      // Other errors
      console.error(`Pollinations → Generation failed: ${err.message || err}`);
      return null;
    }
  },

  /**
   * Generate TWO images (left + right)
   * @param {string} prompt
   * @param {File|null} referenceImage - not used (kept for compatibility)
   * @returns {Promise<{images: [string, string]}>}
   */
  async generate(prompt, referenceImage = null) {
    if (!prompt?.trim()) {
      throw new Error('Prompt is required');
    }

    // Use two different random seeds for variety
    const seed1 = Math.floor(Math.random() * 1000000);
    const seed2 = seed1 + 1; // or use another random

    console.log('Pollinations → Starting dual generation...', { prompt, seed1, seed2 });

    const [img1, img2] = await Promise.all([
      this.generateOne(prompt, seed1),
      this.generateOne(prompt, seed2)
    ]);

    if (!img1?.url || !img2?.url) {
      throw new Error('Failed to generate one or both images');
    }

    return {
      images: [img1.url, img2.url]
    };
  }
};

// Export globally so TemplateManager can use it
window.ImageGenerator = PollinationsAPI;