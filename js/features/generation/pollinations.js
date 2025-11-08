/**
 * Pollinations AI Image Generator
 * -------------------------------------------------
 * Returns: { images: [url1, url2] }  ← exactly what TemplateManager expects
 * Features:
 *   • Two different seeds → two unique images
 *   • 45-second timeout + retry on 502/524
 *   • Safe mode + flux model
 *   • CORS + no-cache
 *   • Logs everything to console
 */

const PollinationsAPI = {
  /**
   * Generate a single image from Pollinations
   * @param {string} prompt
   * @param {number} seed
   * @param {number} retries
   * @returns {Promise<{provider: string, url: string}|null>}
   */
  async generateOne(prompt, seed, retries = 6) {
    const width = 768;
    const height = 1024;
    const model = 'flux';
    const safe = 'true';

    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
                `?width=${width}&height=${height}&seed=${seed}&nologo=True&model=${model}&safe=${safe}`;

    console.log(`Pollinations → Generating (seed: ${seed})`);

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

      // Check response status
      if (!response.ok) {
        console.warn(`Pollinations → HTTP ${response.status}`);
        
        // Only retry on server errors (5xx) after a delay, not immediately
        if ((response.status === 502 || response.status === 503 || response.status === 504) && retries > 0) {
          const delay = 5000 + Math.random() * 5000;  // Wait 5-10 seconds before retrying on server error
          console.warn(`Pollinations → Server error ${response.status}, retrying in ${Math.round(delay)}ms (${retries} left)`);
          await new Promise(r => setTimeout(r, delay));
          return this.generateOne(prompt, seed, retries - 1);
        }
        
        // For other errors, don't retry
        throw new Error(`HTTP ${response.status}`);
      }

      let blob;
      try {
        blob = await response.blob();
      } catch (blobErr) {
        console.warn(`Pollinations → Blob read failed:`, blobErr.message);
        if (retries > 0) {
          const delay = 3000 + Math.random() * 2000;
          console.warn(`Pollinations → Retrying in ${Math.round(delay)}ms (${retries} left)`);
          await new Promise(r => setTimeout(r, delay));
          return this.generateOne(prompt, seed, retries - 1);
        }
        throw blobErr;
      }

      if (blob.size === 0) {
        console.warn(`Pollinations → Empty blob received`);
        if (retries > 0) {
          const delay = 3000 + Math.random() * 2000;
          console.warn(`Pollinations → Retrying in ${Math.round(delay)}ms (${retries} left)`);
          await new Promise(r => setTimeout(r, delay));
          return this.generateOne(prompt, seed, retries - 1);
        }
        throw new Error('Empty blob');
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
          reject(new Error('Failed to read blob'));
        };
        reader.onabort = () => {
          console.error(`Pollinations → FileReader aborted`);
          reject(new Error('FileReader was aborted'));
        };
        try {
          reader.readAsDataURL(blob);
        } catch (err) {
          console.error(`Pollinations → readAsDataURL error:`, err);
          reject(err);
        }
      });
    } catch (err) {
      clearTimeout(timeoutId);
      
      // Handle different error types
      if (err.name === 'AbortError') {
        console.error('Pollinations generation failed: request aborted (timeout or cancelled)');
      } else if (err.message && err.message.includes('CORS')) {
        console.error('Pollinations generation failed: CORS error, will retry...');
        // For CORS errors, retry with backoff
        if (retries > 0) {
          const delay = 2000 + Math.random() * 3000;
          console.log(`Pollinations → CORS error, retrying in ${Math.round(delay)}ms (${retries} left)`);
          return this.generateOne(prompt, seed, retries - 1);
        }
      } else {
        console.error('Pollinations generation failed:', err.message || err);
      }
      
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