/**
 * Pollinations Proxy API
 * -------------------------------------------------
 * Server-side proxy to handle CORS issues with Pollinations API.
 * 
 * POST /api/pollinations-proxy
 * Body: { prompt: string, seed?: number, width?: number, height?: number }
 * Returns: { url: string } (base64 data URL) or { error: string }
 */
const express = require('express');
const router = express.Router();

/**
 * Proxy request to Pollinations image generation API
 */
router.post('/', async (req, res) => {
  try {
    const { prompt, seed, width = 768, height = 1024 } = req.body;

    // Validate required parameters
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ 
        error: 'Missing or invalid prompt parameter',
        details: 'prompt must be a non-empty string'
      });
    }

    // Sanitize and validate numeric parameters
    const validSeed = typeof seed === 'number' && !isNaN(seed) 
      ? seed 
      : Math.floor(Math.random() * 1000000);
    const validWidth = typeof width === 'number' && width > 0 && width <= 2048 
      ? width 
      : 768;
    const validHeight = typeof height === 'number' && height > 0 && height <= 2048 
      ? height 
      : 1024;

    const model = 'flux';
    const safe = 'true';

    // Build Pollinations URL
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
      `?width=${validWidth}&height=${validHeight}&seed=${validSeed}&nologo=True&model=${model}&safe=${safe}`;

    console.log(`[Pollinations Proxy] Fetching image (seed: ${validSeed})`);

    // Check for unit testing mode
    const UNIT_TESTING = process.env.UNIT_TESTING === '1' || 
                         process.env.UNIT_TESTING === 'true' || 
                         process.env.NODE_ENV === 'test';
    
    if (UNIT_TESTING) {
      // Return mock response for tests
      return res.json({ 
        url: 'data:image/png;base64,MOCK_PROXY_IMAGE_DATA',
        mock: true,
        seed: validSeed
      });
    }

    // Make the request to Pollinations
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    let response;
    try {
      response = await fetch(pollinationsUrl, {
        method: 'GET',
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '(failed to read body)');
      console.error(`[Pollinations Proxy] HTTP ${response.status}: ${errorText}`);
      return res.status(response.status).json({ 
        error: `Pollinations API error: ${response.status}`,
        details: errorText.substring(0, 500)
      });
    }

    // Get the image as buffer
    const buffer = await response.arrayBuffer();
    
    if (!buffer || buffer.byteLength === 0) {
      console.error('[Pollinations Proxy] Empty response received');
      return res.status(502).json({ 
        error: 'Empty response from Pollinations API' 
      });
    }

    // Convert to base64 data URL
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = response.headers.get('content-type') || 'image/png';
    const dataUrl = `data:${contentType};base64,${base64}`;

    console.log(`[Pollinations Proxy] Success (seed: ${validSeed}, size: ${buffer.byteLength} bytes)`);

    res.json({ 
      url: dataUrl,
      seed: validSeed,
      size: buffer.byteLength
    });

  } catch (err) {
    // Handle abort/timeout
    if (err.name === 'AbortError') {
      console.error('[Pollinations Proxy] Request timeout');
      return res.status(504).json({ 
        error: 'Request timeout',
        details: 'Pollinations API did not respond within 60 seconds'
      });
    }

    console.error('[Pollinations Proxy] Error:', err.message || err);
    res.status(500).json({ 
      error: 'Internal proxy error',
      details: err.message || 'Unknown error'
    });
  }
});

module.exports = router;
