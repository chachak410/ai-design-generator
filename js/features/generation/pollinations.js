const PollinationsAPI = {
  async generate(prompt, seed, retries = 6) {
    try {
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=1024&seed=${seed}&nologo=True&model=flux&safe=true`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);

      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        if ((response.status === 502 || response.status === 524) && retries > 0) {
          const delay = 3000 * (7 - retries);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.generate(prompt, seed, retries - 1);
        }
        throw new Error(`Pollinations API error: ${response.status}`);
      }

      const blob = await response.blob();
      
      if (blob.size === 0) {
        throw new Error('Empty image blob received');
      }

      return {
        provider: 'Pollinations AI',
        url: URL.createObjectURL(blob)
      };

    } catch (err) {
      console.error('Pollinations generation error:', err);
      return null;
    }
  }
};
