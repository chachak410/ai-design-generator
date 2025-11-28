/**
 * Stability AI Image Generator
 * -------------------------------------------------
 * Backup generator when Pollinations fails.
 * Ensures proper JSON request body and Content-Type header.
 */
const StabilityAPI = {
  async generate(prompt, seed) {
    try {
      // Validate inputs
      if (!prompt || typeof prompt !== 'string') {
        throw new Error('Stability API: prompt is required and must be a string');
      }
      
      // Ensure seed is a valid number
      const validSeed = typeof seed === 'number' && !isNaN(seed) ? seed : Math.floor(Math.random() * 1000000);
      
      const payload = {
        text_prompts: [{ text: prompt, weight: 1 }],
        cfg_scale: 7,
        height: 1024,
        width: 1024,
        steps: 30,
        seed: validSeed
      };

      // Explicitly stringify the payload to ensure valid JSON
      let jsonBody;
      try {
        jsonBody = JSON.stringify(payload);
      } catch (jsonErr) {
        console.error('Stability API: Failed to stringify request payload:', jsonErr);
        throw new Error(`Stability API: Failed to create JSON request body: ${jsonErr.message}`);
      }

      console.log('Stability API → Sending request...', { promptLength: prompt.length, seed: validSeed });

      const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',  // Required: tells server we're sending JSON
          'Accept': 'application/json',
          'Authorization': `Bearer ${AppConfig.api.stability}`
        },
        body: jsonBody
      });

      if (!response.ok) {
        // Read response body for detailed error information
        const errorText = await response.text().catch(() => '(failed to read response body)');
        console.error('Stability API error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        // Include full error details in thrown error for upstream logging
        throw new Error(`Stability API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (data.artifacts && data.artifacts.length > 0) {
        console.log('Stability API → Success');
        return {
          provider: 'Stability AI',
          url: `data:image/png;base64,${data.artifacts[0].base64}`
        };
      }

      throw new Error('Stability API: No images returned in response');

    } catch (err) {
      console.error('Stability generation error:', err.message || err);
      return null;
    }
  }
};

// Export to global scope
window.StabilityAPI = StabilityAPI;
