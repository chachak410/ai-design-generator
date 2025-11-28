/**
 * Client Management Routes
 * 
 * Express router for managing client accounts.
 * All endpoints require authentication and master role.
 * 
 * Endpoints:
 * - GET /api/clients - List all clients
 * - GET /api/clients/:id - Get client details
 * - PUT /api/clients/:id - Update client fields
 * - POST /api/clients/:id/templates - Assign template to client
 * - DELETE /api/clients/:id/templates/:templateItemId - Remove template from client
 */

const express = require('express');
const router = express.Router();
const { requireMaster } = require('../api/me');
const {
  validateClientData,
  validateTemplateData,
  sanitizeClientForResponse,
  filterEditableFields
} = require('../models/client');

/**
 * Helper to get Firestore instance
 * Supports both firebase-admin and client SDK patterns
 */
function getFirestore(req) {
  // Try to get from app locals (set in server setup)
  if (req.app.locals.db) {
    return req.app.locals.db;
  }
  // Fallback to global firebase if available
  if (typeof firebase !== 'undefined' && firebase.firestore) {
    return firebase.firestore();
  }
  return null;
}

/**
 * GET /api/clients
 * List all clients with role='client'
 * Returns: { clients: [...], total: number }
 */
router.get('/', requireMaster, async (req, res) => {
  try {
    const db = getFirestore(req);
    if (!db) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const snapshot = await db.collection('users').where('role', '==', 'client').get();
    const clients = snapshot.docs.map(doc => sanitizeClientForResponse({ id: doc.id, ...doc.data() }));

    res.json({
      clients,
      total: clients.length
    });
  } catch (error) {
    console.error('[Clients API] Error listing clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

/**
 * GET /api/clients/:id
 * Get full client details
 * Returns: client object
 */
router.get('/:id', requireMaster, async (req, res) => {
  try {
    const db = getFirestore(req);
    if (!db) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { id } = req.params;
    const doc = await db.collection('users').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const data = doc.data();
    if (data.role !== 'client') {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(sanitizeClientForResponse({ id: doc.id, ...data }));
  } catch (error) {
    console.error('[Clients API] Error getting client:', error);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

/**
 * PUT /api/clients/:id
 * Update editable client fields
 * Body: { name?, email?, status?, notes?, billingInfo? }
 * Returns: updated client object
 */
router.put('/:id', requireMaster, async (req, res) => {
  try {
    const db = getFirestore(req);
    if (!db) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { id } = req.params;
    const doc = await db.collection('users').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const data = doc.data();
    if (data.role !== 'client') {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Validate input
    const validation = validateClientData(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }

    // Filter to only editable fields
    const updateData = filterEditableFields(req.body);
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Add timestamp
    updateData.updatedAt = new Date().toISOString();

    await db.collection('users').doc(id).update(updateData);

    // Fetch updated document
    const updatedDoc = await db.collection('users').doc(id).get();
    res.json(sanitizeClientForResponse({ id: updatedDoc.id, ...updatedDoc.data() }));
  } catch (error) {
    console.error('[Clients API] Error updating client:', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

/**
 * POST /api/clients/:id/templates
 * Assign/add a template to the client
 * Body: { templateId: string, specs?: object }
 * Returns: updated client object
 */
router.post('/:id/templates', requireMaster, async (req, res) => {
  try {
    const db = getFirestore(req);
    if (!db) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { id } = req.params;
    const doc = await db.collection('users').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const data = doc.data();
    if (data.role !== 'client') {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Validate template data
    const validation = validateTemplateData(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }

    const { templateId, specs } = req.body;

    // Generate a unique ID for the template item using crypto if available
    let templateItemId;
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      templateItemId = `tpl_${crypto.randomUUID()}`;
    } else {
      templateItemId = `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }

    // Create the new template entry
    const newTemplateEntry = {
      id: templateItemId,
      templateId,
      specs: specs || {},
      addedAt: new Date().toISOString()
    };

    // Get current templates array or initialize empty
    const currentTemplates = data.templates || [];
    currentTemplates.push(newTemplateEntry);

    // Update the document
    await db.collection('users').doc(id).update({
      templates: currentTemplates,
      updatedAt: new Date().toISOString()
    });

    // Fetch updated document
    const updatedDoc = await db.collection('users').doc(id).get();
    res.status(201).json(sanitizeClientForResponse({ id: updatedDoc.id, ...updatedDoc.data() }));
  } catch (error) {
    console.error('[Clients API] Error adding template:', error);
    res.status(500).json({ error: 'Failed to add template' });
  }
});

/**
 * DELETE /api/clients/:id/templates/:templateItemId
 * Remove a template entry from client's templates array
 * Returns: updated client object
 */
router.delete('/:id/templates/:templateItemId', requireMaster, async (req, res) => {
  try {
    const db = getFirestore(req);
    if (!db) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { id, templateItemId } = req.params;
    const doc = await db.collection('users').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const data = doc.data();
    if (data.role !== 'client') {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Get current templates and filter out the one to remove
    const currentTemplates = data.templates || [];
    const filteredTemplates = currentTemplates.filter(t => t.id !== templateItemId);

    if (filteredTemplates.length === currentTemplates.length) {
      return res.status(404).json({ error: 'Template entry not found' });
    }

    // Update the document
    await db.collection('users').doc(id).update({
      templates: filteredTemplates,
      updatedAt: new Date().toISOString()
    });

    // Fetch updated document
    const updatedDoc = await db.collection('users').doc(id).get();
    res.json(sanitizeClientForResponse({ id: updatedDoc.id, ...updatedDoc.data() }));
  } catch (error) {
    console.error('[Clients API] Error removing template:', error);
    res.status(500).json({ error: 'Failed to remove template' });
  }
});

module.exports = router;
