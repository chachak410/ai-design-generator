/**
 * Client Model
 * 
 * This module provides a Client data model for the client management feature.
 * Since this application uses Firebase/Firestore rather than MongoDB/Mongoose,
 * this module provides utility functions and validation for client data.
 * 
 * Client fields:
 * - _id: string (Firebase document ID, aliased as id)
 * - name: string (display name)
 * - email: string
 * - status: 'active' | 'locked' | 'suspended'
 * - templates: array of { templateId: string, specs: object, addedAt: timestamp }
 * - notes: string (admin notes)
 * - billingInfo: object { address, company, taxId, etc. }
 * - createdAt: timestamp
 * - updatedAt: timestamp
 */

/**
 * Default client data structure
 */
const defaultClient = {
  name: '',
  email: '',
  status: 'active',
  templates: [],
  notes: '',
  billingInfo: {},
  createdAt: null,
  updatedAt: null
};

/**
 * Whitelist of editable client fields
 */
const editableFields = ['name', 'email', 'status', 'notes', 'billingInfo'];

/**
 * Valid status values for clients
 */
const validStatuses = ['active', 'locked', 'suspended'];

/**
 * Validate client data for updates
 * @param {Object} data - Client data to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateClientData(data) {
  const errors = [];

  if (data.email !== undefined) {
    if (typeof data.email !== 'string' || !data.email.includes('@')) {
      errors.push('Invalid email format');
    }
  }

  if (data.status !== undefined) {
    if (!validStatuses.includes(data.status)) {
      errors.push(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
  }

  if (data.name !== undefined) {
    if (typeof data.name !== 'string') {
      errors.push('Name must be a string');
    }
  }

  if (data.notes !== undefined) {
    if (typeof data.notes !== 'string') {
      errors.push('Notes must be a string');
    }
  }

  if (data.billingInfo !== undefined) {
    if (typeof data.billingInfo !== 'object' || data.billingInfo === null) {
      errors.push('Billing info must be an object');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate template assignment data
 * @param {Object} data - Template assignment data
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateTemplateData(data) {
  const errors = [];

  if (!data.templateId || typeof data.templateId !== 'string') {
    errors.push('templateId is required and must be a string');
  }

  if (data.specs !== undefined && typeof data.specs !== 'object') {
    errors.push('specs must be an object');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Filter client data to only include safe fields for API response
 * @param {Object} client - Raw client document from Firestore
 * @returns {Object} Filtered client data
 */
function sanitizeClientForResponse(client) {
  return {
    _id: client.id || client._id,
    name: client.displayName || client.name || '',
    email: client.email || '',
    status: client.status || 'active',
    templates: client.templates || [],
    notes: client.notes || '',
    billingInfo: client.billingInfo || {},
    industry: client.industry || '',
    credits: client.credits || 0,
    createdAt: client.createdAt || null,
    updatedAt: client.updatedAt || null,
    lastActive: client.lastActive || null
  };
}

/**
 * Filter update data to only include whitelisted fields
 * @param {Object} data - Update data
 * @returns {Object} Filtered data with only editable fields
 */
function filterEditableFields(data) {
  const filtered = {};
  for (const field of editableFields) {
    if (data[field] !== undefined) {
      // Map 'name' to 'displayName' for Firestore consistency
      if (field === 'name') {
        filtered.displayName = data[field];
      } else {
        filtered[field] = data[field];
      }
    }
  }
  return filtered;
}

module.exports = {
  defaultClient,
  editableFields,
  validStatuses,
  validateClientData,
  validateTemplateData,
  sanitizeClientForResponse,
  filterEditableFields
};
