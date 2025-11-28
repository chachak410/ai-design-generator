/**
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
  return req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
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

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

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
