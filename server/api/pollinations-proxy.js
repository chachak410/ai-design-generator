/**
 * Pollinations Proxy API
 * 
 * Express route handler for POST /api/pollinations-proxy
 * Proxies image generation requests to Pollinations AI to avoid CORS issues.
 * Includes simple in-memory throttling to prevent upstream spam.
 */

// Simple in-memory throttle tracking with mutex-like behavior
const throttleState = {
  lastRequest: 0,
  minInterval: 1000, // Minimum 1 second between requests
  pending: null // Promise to serialize concurrent requests
};

/**
 * Express route handler for POST /api/pollinations-proxy
 * Proxies image generation to Pollinations AI
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * Pollinations API Proxy
 * -------------------------------------------------
 * Express route that proxies requests to image.pollinations.ai
 * to avoid CORS issues on the client side.
 * 
 * Features:
 *   • Simple in-memory throttle to avoid spamming upstream
 *   • Proper CORS headers
 *   • Timeout handling
 */

// Simple in-memory throttle: track last request time per IP
const requestTimestamps = {};
const THROTTLE_MS = 1000; // Minimum 1 second between requests per IP

/**
 * Get client IP from request
 * @param {import('express').Request} req
 * @returns {string}
 */
function getClientIP(req) {
  return req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
}

/**
 * Check if request should be throttled
 * @param {string} ip
 * @returns {boolean}
 */
function isThrottled(ip) {
  const now = Date.now();
  const lastRequest = requestTimestamps[ip];
  if (lastRequest && (now - lastRequest) < THROTTLE_MS) {
    return true;
  }
  requestTimestamps[ip] = now;
  return false;
}

/**
 * Express handler for POST /api/pollinations-proxy
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function pollinationsProxyHandler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const { prompt, width = 768, height = 1024, seed, model = 'flux', safe = 'true' } = req.body || {};

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Wait for any pending throttle to complete first (serializes concurrent requests)
    if (throttleState.pending) {
      await throttleState.pending;
    }

    // Calculate throttle delay and create new pending promise if needed
    const now = Date.now();
    const elapsed = now - throttleState.lastRequest;
    if (elapsed < throttleState.minInterval) {
      const waitTime = throttleState.minInterval - elapsed;
      console.log(`[pollinations-proxy] Throttling: waiting ${waitTime}ms`);
      throttleState.pending = new Promise(resolve => setTimeout(resolve, waitTime));
      await throttleState.pending;
      throttleState.pending = null;
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
  const clientIP = getClientIP(req);

  // Throttle check
  if (isThrottled(clientIP)) {
    console.warn(`[pollinations-proxy] Throttled request from ${clientIP}`);
    return res.status(429).json({ error: 'Too many requests. Please wait.' });
  }

  const { prompt, width = 768, height = 1024, seed, model = 'flux', safe = 'true' } = req.body || {};

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt is required' });
  }

  // Build upstream URL
  const encodedPrompt = encodeURIComponent(prompt.trim());
  const seedParam = seed !== undefined ? `&seed=${seed}` : '';
  const upstreamUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}${seedParam}&nologo=True&model=${model}&safe=${safe}`;

  console.log(`[pollinations-proxy] Fetching from upstream for IP ${clientIP}`);

  // Use AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn('[pollinations-proxy] Request timeout after 60 seconds');
    controller.abort();
  }, 60000);

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log(`[pollinations-proxy] Upstream response: status=${upstreamResponse.status}, content-type=${upstreamResponse.headers.get('content-type')}`);

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text().catch(() => '');
      console.error(`[pollinations-proxy] Upstream error ${upstreamResponse.status}: ${errorText}`);
      return res.status(upstreamResponse.status).json({ error: `Upstream error: ${upstreamResponse.status}` });
    }

    const contentType = upstreamResponse.headers.get('content-type') || 'image/jpeg';
    const buffer = await upstreamResponse.arrayBuffer();

    if (!buffer || buffer.byteLength === 0) {
      console.warn('[pollinations-proxy] Empty response from upstream');
      return res.status(502).json({ error: 'Empty response from upstream' });
    }

    console.log(`[pollinations-proxy] Success, returning ${buffer.byteLength} bytes`);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.byteLength);
    res.send(Buffer.from(buffer));

  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      console.error('[pollinations-proxy] Request aborted (timeout)');
      return res.status(504).json({ error: 'Upstream request timeout' });
    }

    console.error('[pollinations-proxy] Fetch error:', err.message);
    return res.status(502).json({ error: 'Failed to fetch from upstream: ' + err.message });
  }
}

module.exports = pollinationsProxyHandler;
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

    // Sanitize and validate numeric parameters with bounds checking
    const validSeed = typeof seed === 'number' && !isNaN(seed) && seed >= 0 && seed <= 999999
      ? Math.floor(seed)
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
