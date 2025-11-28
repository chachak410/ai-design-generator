/**
 * Pollinations Proxy API
 * 
 * Express route handler for POST /api/pollinations-proxy
 * Proxies image generation requests to Pollinations AI to avoid CORS issues.
 * Includes simple in-memory throttling to prevent upstream spam.
 */

// Simple in-memory throttle tracking
const throttleState = {
  lastRequest: 0,
  minInterval: 1000 // Minimum 1 second between requests
};

/**
 * Express route handler for POST /api/pollinations-proxy
 * Proxies image generation to Pollinations AI
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function pollinationsProxyHandler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const { prompt, width = 768, height = 1024, seed, model = 'flux', safe = 'true' } = req.body || {};

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Simple throttle check
    const now = Date.now();
    const elapsed = now - throttleState.lastRequest;
    if (elapsed < throttleState.minInterval) {
      const waitTime = throttleState.minInterval - elapsed;
      console.log(`[pollinations-proxy] Throttling: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    throttleState.lastRequest = Date.now();

    // Build the Pollinations URL
    const seedValue = seed !== undefined ? seed : Math.floor(Math.random() * 1000000);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.trim())}` +
      `?width=${width}&height=${height}&seed=${seedValue}&nologo=True&model=${model}&safe=${safe}`;

    console.log(`[pollinations-proxy] Requesting: ${pollinationsUrl.substring(0, 100)}...`);

    // Fetch from Pollinations
    const response = await fetch(pollinationsUrl, {
      method: 'GET',
      headers: {
        'Accept': 'image/*'
      }
    });

    console.log(`[pollinations-proxy] Response: status=${response.status}, content-type=${response.headers.get('content-type')}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '(failed to read body)');
      console.error(`[pollinations-proxy] Upstream error: ${response.status} ${errorText}`);
      return res.status(response.status).json({ 
        error: `Pollinations API error: ${response.status}`,
        details: errorText
      });
    }

    // Get content type from response
    const contentType = response.headers.get('content-type') || 'image/png';

    // Get the image data as a buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      console.warn('[pollinations-proxy] Empty response from Pollinations');
      return res.status(502).json({ error: 'Empty response from Pollinations' });
    }

    console.log(`[pollinations-proxy] Success: ${buffer.length} bytes`);

    // Send the image with proper headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);

  } catch (error) {
    console.error('[pollinations-proxy] Error:', error.message || error);
    res.status(500).json({ 
      error: 'Proxy error',
      message: error.message || 'Unknown error'
    });
  }
}

module.exports = pollinationsProxyHandler;
module.exports.pollinationsProxyHandler = pollinationsProxyHandler;
