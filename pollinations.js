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

    console.log(`Pollinations → Generating (seed: ${seed})`, url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if ((response.status === 502 || response.status === 524) && retries > 0) {
          const delay = 3000 * (7 - retries);
          console.warn(`Pollinations ${response.status} → retry in ${delay}ms (${retries} left)`);
          await new Promise(r => setTimeout(r, delay));
          return this.generateOne(prompt, seed, retries - 1);
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      if (blob.size === 0) throw new Error('Empty blob');

      const objectURL = URL.createObjectURL(blob);
      console.log(`Pollinations → Success (seed: ${seed})`);
      return { provider: 'Pollinations AI', url: objectURL };
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('Pollinations generation failed:', err.message || err);
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