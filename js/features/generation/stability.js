/**
 * Stability AI Image Generator
 * -------------------------------------------------
 * Backup generator when Pollinations fails.
 * Ensures proper JSON request body and Content-Type header.
 */
const StabilityAPI = {
  async generate(prompt, seed) {
    try {
      // Validate inputs - ensure prompt is a non-empty string
      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        throw new Error('Stability API: prompt is required and must be a non-empty string');
      }
      
      // Ensure seed is a valid number within reasonable bounds
      const validSeed = typeof seed === 'number' && !isNaN(seed) && seed >= 0 && seed <= 999999
        ? Math.floor(seed)
        : Math.floor(Math.random() * 1000000);
      
      const payload = {
        text_prompts: [{ text: prompt.trim(), weight: 1 }],
        cfg_scale: 7,
        height: 1024,
        width: 1024,
        steps: 30,
        seed: validSeed
      };

      console.log('Stability → Sending request with payload:', JSON.stringify(payload));
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

      console.debug('Stability → response status:', response.status, 'type:', response.type, 'content-type:', response.headers.get('content-type'));

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
      console.debug('Stability → response data keys:', Object.keys(data));

      // Support artifacts array (legacy format) or images array (newer format)
      if (data.artifacts && data.artifacts.length > 0) {
        const base64 = data.artifacts[0].base64;
        const url = `data:image/png;base64,${base64}`;
        console.log('Stability → Success (artifacts format)');
        return {
          provider: 'Stability AI',
          url: url
        };
      }

      if (data.images && data.images.length > 0) {
        // images[0] may already be a base64 string or a URL
        const imageData = data.images[0];
        const url = imageData.startsWith('data:') ? imageData : `data:image/png;base64,${imageData}`;
        console.log('Stability → Success (images format)');
        console.log('Stability API → Success');
        return {
          provider: 'Stability AI',
          url: url
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
