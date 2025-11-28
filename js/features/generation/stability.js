const StabilityAPI = {
  async generate(prompt, seed) {
    try {
      const payload = {
        text_prompts: [{ text: prompt, weight: 1 }],
        cfg_scale: 7,
        height: 1024,
        width: 1024,
        steps: 30,
        seed: seed
      };

      console.log('Stability → Sending request with payload:', JSON.stringify(payload));

      const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${AppConfig.api.stability}`
        },
        body: JSON.stringify(payload)
      });

      console.debug('Stability → response status:', response.status, 'type:', response.type, 'content-type:', response.headers.get('content-type'));

      if (!response.ok) {
        const text = await response.text().catch(() => '(failed to read body)');
        console.error('Stability API error', response.status, text);
        throw new Error(`Stability API error: ${response.status} ${text}`);
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
        return {
          provider: 'Stability AI',
          url: url
        };
      }

      throw new Error('No images returned from Stability AI');

    } catch (err) {
      console.error('Stability generation error:', err);
      return null;
    }
  }
};

// Export to global scope
window.StabilityAPI = StabilityAPI;
