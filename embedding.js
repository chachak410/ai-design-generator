// server/api/embedding.js
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

// Mock CLIP encoder (replace with real if available)
const mockEmbedding = () => {
  const emb = {};
  for (let i = 0; i < 64; i++) {
    emb[`dim${i}`] = (Math.random() - 0.5) * 0.3;
  }
  return emb;
};

router.post('/', async (req, res) => {
  const { imageUrl } = req.body;
  try {
    // In production: download image → CLIP → reduce to 64 dims
    // For now: return mock
    const embedding = mockEmbedding();
    res.json({ embedding });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'embedding failed' });
  }
});

module.exports = router;