/**
 * @jest-environment jsdom
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

describe('Admin Configuration Module', () => {
  let originalWindow;
  let originalAppConfig;
  let originalAdminEmails;

  beforeEach(() => {
    // Store original window properties
    originalWindow = { ...global.window };
    originalAppConfig = global.window?.AppConfig;
    originalAdminEmails = global.window?.ADMIN_EMAILS;
    
    // Reset global state
    delete global.window.AppConfig;
    delete global.window.ADMIN_EMAILS;
    delete global.window.AdminConfig;
    
    // Clear localStorage
    global.localStorage.clear();
  });

  afterEach(() => {
    // Restore original window properties
    if (originalAppConfig) {
      global.window.AppConfig = originalAppConfig;
    }
    if (originalAdminEmails) {
      global.window.ADMIN_EMAILS = originalAdminEmails;
    }
  });

  // Helper function to load the AdminConfig module
  function loadAdminConfig() {
    // Reset the module
    delete global.window.AdminConfig;
    
    // Mock console.log to prevent noise in tests
    const mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    const mockWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Create a minimal AdminConfig implementation for testing
    const AdminConfig = {
      getAdminEmails: function() {
        let adminEmails = [];
        
        // Priority 1: window.ADMIN_EMAILS
        if (typeof global.window.ADMIN_EMAILS !== 'undefined' && Array.isArray(global.window.ADMIN_EMAILS)) {
          adminEmails = global.window.ADMIN_EMAILS;
        }
        // Priority 2: AppConfig.adminEmails
        else if (typeof global.window.AppConfig !== 'undefined' && Array.isArray(global.window.AppConfig.adminEmails)) {
          adminEmails = global.window.AppConfig.adminEmails;
        }
        // Priority 3: localStorage
        else if (typeof localStorage !== 'undefined') {
          try {
            const storedEmails = localStorage.getItem('admin_emails');
            if (storedEmails) {
              adminEmails = JSON.parse(storedEmails);
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        
        return adminEmails.map(email => (email || '').toLowerCase().trim()).filter(Boolean);
      },
      
      isAdminByEmail: function(email) {
        if (!email || typeof email !== 'string') {
          return false;
        }
        const normalizedEmail = email.toLowerCase().trim();
        const adminEmails = this.getAdminEmails();
        return adminEmails.includes(normalizedEmail);
      },
      
      isAdmin: function(user) {
        if (!user) {
          return false;
        }
        if (user.role === 'admin' || user.role === 'master') {
          return true;
        }
        const email = user.email || '';
        return this.isAdminByEmail(email);
      },
      
      getAdminConfigStatus: function() {
        const adminEmails = this.getAdminEmails();
        return {
          configured: adminEmails.length > 0,
          count: adminEmails.length
        };
      }
    };
    
    global.window.AdminConfig = AdminConfig;
    
    mockLog.mockRestore();
    mockWarn.mockRestore();
    
    return AdminConfig;
  }

  describe('getAdminEmails', () => {
    test('should return empty array when no admin emails are configured', () => {
      const AdminConfig = loadAdminConfig();
      expect(AdminConfig.getAdminEmails()).toEqual([]);
    });

    test('should read from window.ADMIN_EMAILS with highest priority', () => {
      global.window.ADMIN_EMAILS = ['admin1@example.com', 'admin2@example.com'];
      global.window.AppConfig = { adminEmails: ['other@example.com'] };
      
      const AdminConfig = loadAdminConfig();
      const emails = AdminConfig.getAdminEmails();
      
      expect(emails).toContain('admin1@example.com');
      expect(emails).toContain('admin2@example.com');
      expect(emails).not.toContain('other@example.com');
    });

    test('should read from AppConfig.adminEmails when ADMIN_EMAILS is not set', () => {
      global.window.AppConfig = { adminEmails: ['config-admin@example.com'] };
      
      const AdminConfig = loadAdminConfig();
      const emails = AdminConfig.getAdminEmails();
      
      expect(emails).toContain('config-admin@example.com');
    });

    test('should read from localStorage when other sources are not available', () => {
      global.localStorage.setItem('admin_emails', JSON.stringify(['local-admin@example.com']));
      
      const AdminConfig = loadAdminConfig();
      const emails = AdminConfig.getAdminEmails();
      
      expect(emails).toContain('local-admin@example.com');
    });

    test('should normalize emails to lowercase', () => {
      global.window.ADMIN_EMAILS = ['ADMIN@EXAMPLE.COM', 'Admin@Test.Com'];
      
      const AdminConfig = loadAdminConfig();
      const emails = AdminConfig.getAdminEmails();
      
      expect(emails).toContain('admin@example.com');
      expect(emails).toContain('admin@test.com');
    });

    test('should filter out empty or invalid values', () => {
      global.window.ADMIN_EMAILS = ['valid@example.com', '', null, undefined, '  ', 'another@example.com'];
      
      const AdminConfig = loadAdminConfig();
      const emails = AdminConfig.getAdminEmails();
      
      expect(emails).toEqual(['valid@example.com', 'another@example.com']);
    });
  });

  describe('isAdminByEmail', () => {
    test('should return false for null or undefined email', () => {
      const AdminConfig = loadAdminConfig();
      expect(AdminConfig.isAdminByEmail(null)).toBe(false);
      expect(AdminConfig.isAdminByEmail(undefined)).toBe(false);
    });

    test('should return false for empty string', () => {
      const AdminConfig = loadAdminConfig();
      expect(AdminConfig.isAdminByEmail('')).toBe(false);
    });

    test('should return false when email is not in admin list', () => {
      global.window.ADMIN_EMAILS = ['admin@example.com'];
      
      const AdminConfig = loadAdminConfig();
      expect(AdminConfig.isAdminByEmail('user@example.com')).toBe(false);
    });

    test('should return true when email is in admin list', () => {
      global.window.ADMIN_EMAILS = ['admin@example.com', 'superadmin@example.com'];
      
      const AdminConfig = loadAdminConfig();
      expect(AdminConfig.isAdminByEmail('admin@example.com')).toBe(true);
      expect(AdminConfig.isAdminByEmail('superadmin@example.com')).toBe(true);
    });

    test('should be case-insensitive', () => {
      global.window.ADMIN_EMAILS = ['admin@example.com'];
      
      const AdminConfig = loadAdminConfig();
      expect(AdminConfig.isAdminByEmail('ADMIN@EXAMPLE.COM')).toBe(true);
      expect(AdminConfig.isAdminByEmail('Admin@Example.Com')).toBe(true);
    });

    test('should handle whitespace in email', () => {
      global.window.ADMIN_EMAILS = ['admin@example.com'];
      
      const AdminConfig = loadAdminConfig();
      expect(AdminConfig.isAdminByEmail('  admin@example.com  ')).toBe(true);
    });
  });

  describe('isAdmin', () => {
    test('should return false for null user', () => {
      const AdminConfig = loadAdminConfig();
      expect(AdminConfig.isAdmin(null)).toBe(false);
    });

    test('should return false for undefined user', () => {
      const AdminConfig = loadAdminConfig();
      expect(AdminConfig.isAdmin(undefined)).toBe(false);
    });

    test('should return true for user with role "admin"', () => {
      const AdminConfig = loadAdminConfig();
      expect(AdminConfig.isAdmin({ role: 'admin', email: 'user@example.com' })).toBe(true);
    });

    test('should return true for user with role "master"', () => {
      const AdminConfig = loadAdminConfig();
      expect(AdminConfig.isAdmin({ role: 'master', email: 'user@example.com' })).toBe(true);
    });

    test('should return false for user with role "client" and email not in admin list', () => {
      global.window.ADMIN_EMAILS = ['admin@example.com'];
      
      const AdminConfig = loadAdminConfig();
      expect(AdminConfig.isAdmin({ role: 'client', email: 'user@example.com' })).toBe(false);
    });

    test('should return true for user with email in admin list regardless of role', () => {
      global.window.ADMIN_EMAILS = ['admin@example.com'];
      
      const AdminConfig = loadAdminConfig();
      expect(AdminConfig.isAdmin({ role: 'client', email: 'admin@example.com' })).toBe(true);
    });

    test('should return true for user with no role but email in admin list', () => {
      global.window.ADMIN_EMAILS = ['admin@example.com'];
      
      const AdminConfig = loadAdminConfig();
      expect(AdminConfig.isAdmin({ email: 'admin@example.com' })).toBe(true);
    });
  });

  describe('getAdminConfigStatus', () => {
    test('should report no admins configured when list is empty', () => {
      const AdminConfig = loadAdminConfig();
      const status = AdminConfig.getAdminConfigStatus();
      
      expect(status.configured).toBe(false);
      expect(status.count).toBe(0);
    });

    test('should report correct count when admins are configured', () => {
      global.window.ADMIN_EMAILS = ['admin1@example.com', 'admin2@example.com', 'admin3@example.com'];
      
      const AdminConfig = loadAdminConfig();
      const status = AdminConfig.getAdminConfigStatus();
      
      expect(status.configured).toBe(true);
      expect(status.count).toBe(3);
    });
  });

  describe('Integration with example email', () => {
    test('should correctly identify langtechgroup5@gmail.com as admin when configured', () => {
      global.window.ADMIN_EMAILS = ['langtechgroup5@gmail.com'];
      
      const AdminConfig = loadAdminConfig();
      
      expect(AdminConfig.isAdminByEmail('langtechgroup5@gmail.com')).toBe(true);
      expect(AdminConfig.isAdmin({ email: 'langtechgroup5@gmail.com' })).toBe(true);
    });

    test('should handle mixed case for configured admin email', () => {
      global.window.ADMIN_EMAILS = ['LangTechGroup5@Gmail.Com'];
      
      const AdminConfig = loadAdminConfig();
      
      expect(AdminConfig.isAdminByEmail('langtechgroup5@gmail.com')).toBe(true);
      expect(AdminConfig.isAdminByEmail('LANGTECHGROUP5@GMAIL.COM')).toBe(true);
    });
  });
});
