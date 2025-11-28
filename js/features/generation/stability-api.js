/**
 * Stability API Stub (Dev/Test Only)
 * -------------------------------------------------
 * WARNING: This is a development/test stub only!
 * Replace with a real Stability AI integration in production.
 * 
 * This stub provides a mock implementation of the StabilityAPI interface
 * that generator.js expects, returning deterministic placeholder images
 * using picsum.photos based on the seed for consistent testing.
 * 
 * Expected interface:
 *   StabilityAPI.generate(prompt, seed) -> Promise<{ url: '...' }>
 */

const StabilityAPIStub = {
  /**
   * Generate a placeholder image for development/testing
   * @param {string} prompt - The image generation prompt (logged for debugging)
   * @param {number} seed - Seed for deterministic placeholder images
   * @returns {Promise<{provider: string, url: string}|null>} - Object with provider name and placeholder image URL
   */
  async generate(prompt, seed) {
    console.log('[StabilityAPI Stub] generate() called with:', { prompt, seed });
    console.warn('[StabilityAPI Stub] This is a dev/test stub. Replace with real Stability AI integration in production.');
    
    // Validate inputs
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      console.error('[StabilityAPI Stub] Invalid prompt provided');
      throw new Error('StabilityAPI Stub: prompt is required and must be a non-empty string');
    }
    
    // Use seed for deterministic placeholder images
    const validSeed = typeof seed === 'number' && !isNaN(seed) ? Math.abs(Math.floor(seed)) : Date.now();
    
    // Generate a placeholder image using picsum.photos
    // Add 500 to the seed to ensure it's different from Pollinations stubs
    const imageId = ((validSeed + 500) % 1000) + 1;
    const url = `https://picsum.photos/seed/${imageId}/1024/1024`;
    
    console.log('[StabilityAPI Stub] Returning placeholder image:', { url });
    
    // Simulate network delay for more realistic testing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      provider: 'Stability AI (Stub)',
      url: url
    };
  }
};

// Only set window.StabilityAPI if not already defined by the real implementation
// This allows the real stability.js to take precedence when available
if (typeof window.StabilityAPI === 'undefined') {
  window.StabilityAPI = StabilityAPIStub;
  console.log('[StabilityAPI Stub] Registered as window.StabilityAPI (dev/test stub)');
}
