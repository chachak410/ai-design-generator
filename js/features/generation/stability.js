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

      console.log('Stability → Generating image with seed:', seed);

      const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${AppConfig.api.stability}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '(failed to read body)');
        console.error('Stability API error', response.status, text);
        throw new Error(`Stability API error: ${response.status} ${text}`);
      }

      const data = await response.json();

      // Handle data.artifacts[0].base64 format (v1 API)
      if (data.artifacts && data.artifacts.length > 0 && data.artifacts[0].base64) {
        console.log('Stability → Success (artifacts format)');
        return {
          provider: 'Stability AI',
          url: `data:image/png;base64,${data.artifacts[0].base64}`
        };
      }

      // Handle data.images[0] format (alternative response format)
      if (data.images && data.images.length > 0) {
        const imageData = data.images[0];
        console.log('Stability → Success (images format)');
        // If it's already a data URL, use as-is; otherwise, construct one
        const url = imageData.startsWith('data:') ? imageData : `data:image/png;base64,${imageData}`;
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
