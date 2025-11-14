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
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

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