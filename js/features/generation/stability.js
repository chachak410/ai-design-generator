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
        throw new Error(`Stability API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.artifacts && data.artifacts.length > 0) {
        return {
          provider: 'Stability AI',
          url: `data:image/png;base64,${data.artifacts[0].base64}`
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
