/**
 * Pollinations API Stub (Dev/Test Only)
 * -------------------------------------------------
 * WARNING: This is a development/test stub only!
 * Replace with a real Pollinations API integration in production.
 * 
 * This stub provides a mock implementation of the PollinationsAPI interface
 * that generator.js expects, returning deterministic placeholder images
 * using picsum.photos based on the seed for consistent testing.
 * 
 * Expected interface:
 *   PollinationsAPI.generate(prompt, seed) -> Promise<{ images: [url, ...] }>
 */

const PollinationsAPIStub = {
  /**
   * Generate placeholder images for development/testing
   * @param {string} prompt - The image generation prompt (logged for debugging)
   * @param {number} seed - Seed for deterministic placeholder images
   * @returns {Promise<{images: string[]}>} - Object with array of placeholder image URLs
   */
  async generate(prompt, seed) {
    console.log('[PollinationsAPI Stub] generate() called with:', { prompt, seed });
    console.warn('[PollinationsAPI Stub] This is a dev/test stub. Replace with real Pollinations integration in production.');
    
    // Validate inputs
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      console.error('[PollinationsAPI Stub] Invalid prompt provided');
      throw new Error('PollinationsAPI Stub: prompt is required and must be a non-empty string');
    }
    
    // Use seed for deterministic placeholder images
    const validSeed = typeof seed === 'number' && !isNaN(seed) ? Math.abs(Math.floor(seed)) : Date.now();
    
    // Generate two different placeholder images using picsum.photos
    // The seed is used to generate different images for each request
    const imageId1 = (validSeed % 1000) + 1;
    const imageId2 = ((validSeed + 1) % 1000) + 1;
    
    const url1 = `https://picsum.photos/seed/${imageId1}/768/1024`;
    const url2 = `https://picsum.photos/seed/${imageId2}/768/1024`;
    
    console.log('[PollinationsAPI Stub] Returning placeholder images:', { url1, url2 });
    
    // Simulate network delay for more realistic testing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      images: [url1, url2]
    };
  }
};

// Only set window.PollinationsAPI if not already defined by the real implementation
// This allows the real pollinations.js to take precedence when available
if (typeof window.PollinationsAPI === 'undefined') {
  window.PollinationsAPI = PollinationsAPIStub;
  console.log('[PollinationsAPI Stub] Registered as window.PollinationsAPI (dev/test stub)');
}
