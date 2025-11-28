// Simple Express server to proxy API calls
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
// Allow a unit-testing mode to short-circuit external API calls during tests.
const UNIT_TESTING = process.env.UNIT_TESTING === '1' || process.env.UNIT_TESTING === 'true' || process.env.NODE_ENV === 'test';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Serve index.html for root
// NOTE: Role-based redirect is handled on the client side after Firebase auth completes.
// The client-side main.js will redirect to role-specific homepage after authentication.
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// API /me endpoint - Returns the current user's role
// This endpoint is used by the client-side authUtils.js to determine user role
// for role-based navigation and homepage redirects.
// 
// TODO: Implement authentication middleware to populate req.user
// The apiMeHandler expects req.user to have: { uid, email, role }
// For Firebase Auth integration, see server/api/me.js for example middleware
const apiMeHandler = require('./server/api/me');
app.get('/api/me', apiMeHandler);
/**
 * API endpoint to get current user information.
 * 
 * This endpoint provides user role information when called with a valid session.
 * Since this app uses Firebase Authentication on the client-side, the actual user
 * role is determined by Firebase Auth state and Firestore user document.
 * 
 * For SPAs using this endpoint:
 * - Call /api/me after obtaining Firebase auth token
 * - Include authorization header with Firebase ID token
 * - Returns user role and basic info
 * 
 * NOTE: This is a placeholder implementation. In production, you would:
 * 1. Verify the Firebase ID token from the Authorization header
 * 2. Fetch the user's role from Firestore
 * 3. Return the role information
 * 
 * Currently, the client-side handles role detection via Firebase onAuthStateChanged.
 */
app.get('/api/me', (req, res) => {
  // In a real implementation, you would:
  // 1. Get the Firebase ID token from Authorization header
  // 2. Verify the token using Firebase Admin SDK
  // 3. Fetch user data from Firestore
  // 4. Return role and user info
  
  // For now, return a placeholder response indicating the client should
  // use Firebase client-side auth to get user role
  res.json({
    authenticated: false,
    message: 'Use Firebase client-side authentication. Role is determined by Firestore user document.',
    note: 'This endpoint is a placeholder for future server-side auth integration.'
  });
});

// Pollinations proxy endpoint
const pollinationsProxyHandler = require('./api/pollinations-proxy');
app.post('/api/pollinations-proxy', pollinationsProxyHandler);

// Proxy for Stability AI
app.post('/api/generate-image', async (req, res) => {
  try {
    if (UNIT_TESTING) {
      // Return a lightweight mock response for unit tests to avoid network access.
      return res.json({ ok: true, mock: true, data: { images: ['data:image/png;base64,TEST_IMAGE_DATA'] } });
    }
    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(req.body)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy for Hugging Face
app.post('/api/huggingface', async (req, res) => {
  try {
    if (UNIT_TESTING) {
      return res.json({ ok: true, mock: true, result: { status: 'mocked', data: {} } });
    }
    const { url, data: requestData } = req.body;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error with Hugging Face API:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Serving files from: ${__dirname}`);
  console.log(`🔑 API Keys loaded: ${process.env.STABILITY_API_KEY ? '✓' : '✗'}`);
});