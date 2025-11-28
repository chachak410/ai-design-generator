/**
 * Tests for Client Management API Routes
 */

const { describe, test, expect, beforeEach, afterEach, jest: jestObj } = require('@jest/globals');

describe('Client Management API', () => {
  let mockDb;
  let mockReq;
  let mockRes;
  let router;

  beforeEach(() => {
    // Mock Firestore
    mockDb = {
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      get: jest.fn(),
      update: jest.fn()
    };

    // Mock request
    mockReq = {
      app: { locals: { db: mockDb } },
      user: { uid: 'master-123', email: 'master@example.com', role: 'master' },
      params: {},
      body: {}
    };

    // Mock response
    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('Client Model Validation', () => {
    test('validateClientData should accept valid data', () => {
      const { validateClientData } = require('../server/models/client');
      
      const result = validateClientData({
        name: 'Test Client',
        email: 'test@example.com',
        status: 'active',
        notes: 'Some notes',
        billingInfo: { address: '123 Main St' }
      });
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('validateClientData should reject invalid email', () => {
      const { validateClientData } = require('../server/models/client');
      
      // Test various invalid email formats
      expect(validateClientData({ email: 'invalid-email' }).valid).toBe(false);
      expect(validateClientData({ email: 'test@' }).valid).toBe(false);
      expect(validateClientData({ email: '@domain.com' }).valid).toBe(false);
      expect(validateClientData({ email: 'test' }).valid).toBe(false);
      
      // Valid email should pass
      expect(validateClientData({ email: 'test@example.com' }).valid).toBe(true);
    });

    test('validateClientData should reject invalid status', () => {
      const { validateClientData } = require('../server/models/client');
      
      const result = validateClientData({
        status: 'invalid-status'
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/Invalid status/);
    });

    test('validateClientData should reject non-string name', () => {
      const { validateClientData } = require('../server/models/client');
      
      const result = validateClientData({
        name: 123
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Name must be a string');
    });

    test('validateClientData should reject non-object billingInfo', () => {
      const { validateClientData } = require('../server/models/client');
      
      const result = validateClientData({
        billingInfo: 'not-an-object'
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Billing info must be an object');
    });
  });

  describe('Template Data Validation', () => {
    test('validateTemplateData should accept valid template data', () => {
      const { validateTemplateData } = require('../server/models/client');
      
      const result = validateTemplateData({
        templateId: 'ecommerce',
        specs: { size: '1:1' }
      });
      
      expect(result.valid).toBe(true);
    });

    test('validateTemplateData should reject missing templateId', () => {
      const { validateTemplateData } = require('../server/models/client');
      
      const result = validateTemplateData({});
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/templateId is required/);
    });

    test('validateTemplateData should reject non-object specs', () => {
      const { validateTemplateData } = require('../server/models/client');
      
      const result = validateTemplateData({
        templateId: 'test',
        specs: 'not-an-object'
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('specs must be an object');
    });

    test('validateTemplateData should reject null specs', () => {
      const { validateTemplateData } = require('../server/models/client');
      
      const result = validateTemplateData({
        templateId: 'test',
        specs: null
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('specs must be an object');
    });
  });

  describe('Client Data Sanitization', () => {
    test('sanitizeClientForResponse should format client data correctly', () => {
      const { sanitizeClientForResponse } = require('../server/models/client');
      
      const rawClient = {
        id: 'client-123',
        displayName: 'Test Client',
        email: 'test@example.com',
        status: 'active',
        templates: [{ id: 'tpl-1', templateId: 'test' }],
        notes: 'Some notes',
        billingInfo: { address: '123 Main St' },
        industry: 'retail',
        credits: 100,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
        lastActive: '2024-01-03',
        // Extra fields that should not be included
        password: 'secret',
        sensitiveData: 'should-not-appear'
      };
      
      const result = sanitizeClientForResponse(rawClient);
      
      expect(result._id).toBe('client-123');
      expect(result.name).toBe('Test Client');
      expect(result.email).toBe('test@example.com');
      expect(result.status).toBe('active');
      expect(result.templates).toEqual([{ id: 'tpl-1', templateId: 'test' }]);
      expect(result.notes).toBe('Some notes');
      expect(result.billingInfo).toEqual({ address: '123 Main St' });
      expect(result.password).toBeUndefined();
      expect(result.sensitiveData).toBeUndefined();
    });

    test('sanitizeClientForResponse should handle missing fields', () => {
      const { sanitizeClientForResponse } = require('../server/models/client');
      
      const rawClient = { id: 'client-123' };
      const result = sanitizeClientForResponse(rawClient);
      
      expect(result._id).toBe('client-123');
      expect(result.name).toBe('');
      expect(result.email).toBe('');
      expect(result.status).toBe('active');
      expect(result.templates).toEqual([]);
      expect(result.notes).toBe('');
      expect(result.billingInfo).toEqual({});
    });
  });

  describe('Field Filtering', () => {
    test('filterEditableFields should only include whitelisted fields', () => {
      const { filterEditableFields } = require('../server/models/client');
      
      const data = {
        name: 'New Name',
        email: 'new@example.com',
        status: 'locked',
        notes: 'Updated notes',
        billingInfo: { address: '456 Oak St' },
        role: 'admin', // Should be filtered out
        credits: 1000, // Should be filtered out
        password: 'newpass' // Should be filtered out
      };
      
      const result = filterEditableFields(data);
      
      expect(result.displayName).toBe('New Name'); // name maps to displayName
      expect(result.email).toBe('new@example.com');
      expect(result.status).toBe('locked');
      expect(result.notes).toBe('Updated notes');
      expect(result.billingInfo).toEqual({ address: '456 Oak St' });
      expect(result.role).toBeUndefined();
      expect(result.credits).toBeUndefined();
      expect(result.password).toBeUndefined();
    });

    test('filterEditableFields should return empty object for no valid fields', () => {
      const { filterEditableFields } = require('../server/models/client');
      
      const data = {
        role: 'admin',
        credits: 1000
      };
      
      const result = filterEditableFields(data);
      
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('Valid Status Values', () => {
    test('validStatuses should contain expected values', () => {
      const { validStatuses } = require('../server/models/client');
      
      expect(validStatuses).toContain('active');
      expect(validStatuses).toContain('locked');
      expect(validStatuses).toContain('suspended');
      expect(validStatuses).toHaveLength(3);
    });
  });

  describe('Editable Fields', () => {
    test('editableFields should contain expected fields', () => {
      const { editableFields } = require('../server/models/client');
      
      expect(editableFields).toContain('name');
      expect(editableFields).toContain('email');
      expect(editableFields).toContain('status');
      expect(editableFields).toContain('notes');
      expect(editableFields).toContain('billingInfo');
      expect(editableFields).not.toContain('role');
      expect(editableFields).not.toContain('credits');
      expect(editableFields).not.toContain('password');
    });
  });
});
