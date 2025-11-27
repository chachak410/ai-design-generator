/**
 * Tests for Admin Configuration Module
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

describe('Admin Configuration', () => {
  let originalEnv;
  
  beforeEach(() => {
    // Save original environment
    originalEnv = process.env.ADMIN_EMAILS;
    // Clear module cache to allow fresh imports with different env values
    jest.resetModules();
  });
  
  afterEach(() => {
    // Restore original environment
    if (originalEnv !== undefined) {
      process.env.ADMIN_EMAILS = originalEnv;
    } else {
      delete process.env.ADMIN_EMAILS;
    }
    jest.resetModules();
  });
  
  describe('isAdminByEmail', () => {
    test('should return true for configured admin email', () => {
      process.env.ADMIN_EMAILS = 'admin@example.com';
      const { isAdminByEmail } = require('../server/config/admin');
      
      expect(isAdminByEmail('admin@example.com')).toBe(true);
    });
    
    test('should return false for non-admin email', () => {
      process.env.ADMIN_EMAILS = 'admin@example.com';
      const { isAdminByEmail } = require('../server/config/admin');
      
      expect(isAdminByEmail('user@example.com')).toBe(false);
    });
    
    test('should be case-insensitive', () => {
      process.env.ADMIN_EMAILS = 'Admin@Example.com';
      const { isAdminByEmail } = require('../server/config/admin');
      
      expect(isAdminByEmail('admin@example.com')).toBe(true);
      expect(isAdminByEmail('ADMIN@EXAMPLE.COM')).toBe(true);
      expect(isAdminByEmail('Admin@Example.COM')).toBe(true);
    });
    
    test('should handle multiple admin emails', () => {
      process.env.ADMIN_EMAILS = 'admin1@example.com,admin2@example.com,admin3@example.com';
      const { isAdminByEmail } = require('../server/config/admin');
      
      expect(isAdminByEmail('admin1@example.com')).toBe(true);
      expect(isAdminByEmail('admin2@example.com')).toBe(true);
      expect(isAdminByEmail('admin3@example.com')).toBe(true);
      expect(isAdminByEmail('user@example.com')).toBe(false);
    });
    
    test('should handle whitespace in email list', () => {
      process.env.ADMIN_EMAILS = '  admin1@example.com ,  admin2@example.com  ';
      const { isAdminByEmail } = require('../server/config/admin');
      
      expect(isAdminByEmail('admin1@example.com')).toBe(true);
      expect(isAdminByEmail('admin2@example.com')).toBe(true);
    });
    
    test('should return false when ADMIN_EMAILS is not set', () => {
      delete process.env.ADMIN_EMAILS;
      const { isAdminByEmail } = require('../server/config/admin');
      
      expect(isAdminByEmail('admin@example.com')).toBe(false);
    });
    
    test('should return false when ADMIN_EMAILS is empty', () => {
      process.env.ADMIN_EMAILS = '';
      const { isAdminByEmail } = require('../server/config/admin');
      
      expect(isAdminByEmail('admin@example.com')).toBe(false);
    });
    
    test('should return false for null or undefined input', () => {
      process.env.ADMIN_EMAILS = 'admin@example.com';
      const { isAdminByEmail } = require('../server/config/admin');
      
      expect(isAdminByEmail(null)).toBe(false);
      expect(isAdminByEmail(undefined)).toBe(false);
    });
    
    test('should return false for non-string input', () => {
      process.env.ADMIN_EMAILS = 'admin@example.com';
      const { isAdminByEmail } = require('../server/config/admin');
      
      expect(isAdminByEmail(123)).toBe(false);
      expect(isAdminByEmail({})).toBe(false);
      expect(isAdminByEmail([])).toBe(false);
    });
    
    test('should handle email with whitespace', () => {
      process.env.ADMIN_EMAILS = 'admin@example.com';
      const { isAdminByEmail } = require('../server/config/admin');
      
      expect(isAdminByEmail('  admin@example.com  ')).toBe(true);
    });
  });
  
  describe('getAdminEmails', () => {
    test('should return array of admin emails', () => {
      process.env.ADMIN_EMAILS = 'admin1@example.com,admin2@example.com';
      const { getAdminEmails } = require('../server/config/admin');
      
      const emails = getAdminEmails();
      expect(emails).toContain('admin1@example.com');
      expect(emails).toContain('admin2@example.com');
      expect(emails.length).toBe(2);
    });
    
    test('should return empty array when no admins configured', () => {
      delete process.env.ADMIN_EMAILS;
      const { getAdminEmails } = require('../server/config/admin');
      
      expect(getAdminEmails()).toEqual([]);
    });
  });
  
  describe('edge cases', () => {
    test('should skip invalid email formats', () => {
      process.env.ADMIN_EMAILS = 'valid@example.com,invalid-no-at,another@valid.com';
      const { getAdminEmails, isAdminByEmail } = require('../server/config/admin');
      
      const emails = getAdminEmails();
      expect(emails).toContain('valid@example.com');
      expect(emails).toContain('another@valid.com');
      expect(emails).not.toContain('invalid-no-at');
      expect(isAdminByEmail('invalid-no-at')).toBe(false);
    });
    
    test('should handle commas only', () => {
      process.env.ADMIN_EMAILS = ',,,';
      const { getAdminEmails } = require('../server/config/admin');
      
      expect(getAdminEmails()).toEqual([]);
    });
    
    test('should recognize the example admin email', () => {
      process.env.ADMIN_EMAILS = 'langtechgroup5@gmail.com';
      const { isAdminByEmail } = require('../server/config/admin');
      
      expect(isAdminByEmail('langtechgroup5@gmail.com')).toBe(true);
      expect(isAdminByEmail('LangTechGroup5@Gmail.com')).toBe(true);
    });
  });
});
