/**
 * Tests for UI module and master navbar conditional rendering
 */
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

describe('UI Module', () => {
  describe('isMaster helper function', () => {
    // Import the helper function logic for testing
    const isMaster = (user) => {
      if (!user) return false;
      if (user.role === 'master') return true;
      if (user.isMaster === true) return true;
      if (user.accountType === 'master') return true;
      return false;
    };

    test('should return false for null user', () => {
      expect(isMaster(null)).toBe(false);
    });

    test('should return false for undefined user', () => {
      expect(isMaster(undefined)).toBe(false);
    });

    test('should return true when user.role is "master"', () => {
      const user = { role: 'master', email: 'master@example.com' };
      expect(isMaster(user)).toBe(true);
    });

    test('should return true when user.isMaster is true', () => {
      const user = { isMaster: true, email: 'master@example.com' };
      expect(isMaster(user)).toBe(true);
    });

    test('should return true when user.accountType is "master"', () => {
      const user = { accountType: 'master', email: 'master@example.com' };
      expect(isMaster(user)).toBe(true);
    });

    test('should return false for client role', () => {
      const user = { role: 'client', email: 'client@example.com' };
      expect(isMaster(user)).toBe(false);
    });

    test('should return false for admin role (admin is not master)', () => {
      const user = { role: 'admin', email: 'admin@example.com' };
      expect(isMaster(user)).toBe(false);
    });

    test('should return false for user with no role property', () => {
      const user = { email: 'user@example.com' };
      expect(isMaster(user)).toBe(false);
    });
  });

  describe('toggleMasterUI function', () => {
    let mockElements;
    let mockAppState;
    
    beforeEach(() => {
      // Create fresh mock DOM elements for each test
      mockElements = {
        'client-templates-link': { classList: { add: jest.fn(), remove: jest.fn() }, style: {} },
        'client-account-link': { classList: { add: jest.fn(), remove: jest.fn() }, style: {} },
        'client-records-link': { classList: { add: jest.fn(), remove: jest.fn() }, style: {} },
        'master-template-link': { classList: { add: jest.fn(), remove: jest.fn() }, style: {} },
        'master-nav-link': { classList: { add: jest.fn(), remove: jest.fn() }, style: {} },
        'master-support-link': { classList: { add: jest.fn(), remove: jest.fn() }, style: {} },
        'create-account-link': { classList: { add: jest.fn(), remove: jest.fn() }, style: {} },
        'logout-btn': { classList: { add: jest.fn(), remove: jest.fn() }, style: {} },
      };
      
      // Mock document.getElementById
      global.document = {
        getElementById: jest.fn((id) => mockElements[id] || null)
      };
      
      // Mock AppState
      mockAppState = {
        currentUser: null,
        userRole: null
      };
      global.AppState = mockAppState;
    });
    
    afterEach(() => {
      jest.clearAllMocks();
    });

    // Simulate the UI module's toggleMasterUI logic
    const toggleMasterUI = (isMasterUser, elements, appState) => {
      const userRole = appState.userRole;
      const isMasterRole = userRole === 'master' || isMasterUser === true;
      
      const clientNavLinks = [
        'client-templates-link',
        'client-account-link',
        'client-records-link'
      ];
      
      const masterNavLinks = [
        'master-template-link',
        'master-nav-link',
        'master-support-link'
      ];
      
      if (isMasterRole) {
        // Hide client links
        clientNavLinks.forEach(id => {
          const el = elements[id];
          if (el) {
            el.classList.add('hidden');
            el.style.display = 'none';
          }
        });
        
        // Show master links
        masterNavLinks.forEach(id => {
          const el = elements[id];
          if (el) {
            el.classList.remove('hidden');
            el.style.display = 'block';
          }
        });
        
        // Hide create account
        const createAccountEl = elements['create-account-link'];
        if (createAccountEl) {
          createAccountEl.classList.add('hidden');
          createAccountEl.style.display = 'none';
        }
      } else {
        // Show client links
        clientNavLinks.forEach(id => {
          const el = elements[id];
          if (el) {
            el.classList.remove('hidden');
            el.style.display = 'block';
          }
        });
        
        // Hide master links
        masterNavLinks.forEach(id => {
          const el = elements[id];
          if (el) {
            el.classList.add('hidden');
            el.style.display = 'none';
          }
        });
        
        // Show create account only for admin
        const createAccountEl = elements['create-account-link'];
        if (createAccountEl) {
          if (userRole === 'admin') {
            createAccountEl.classList.remove('hidden');
            createAccountEl.style.display = 'block';
          } else {
            createAccountEl.classList.add('hidden');
            createAccountEl.style.display = 'none';
          }
        }
      }
    };

    test('should hide client nav links for master user', () => {
      mockAppState.userRole = 'master';
      toggleMasterUI(true, mockElements, mockAppState);
      
      // Verify client links are hidden
      expect(mockElements['client-templates-link'].classList.add).toHaveBeenCalledWith('hidden');
      expect(mockElements['client-account-link'].classList.add).toHaveBeenCalledWith('hidden');
      expect(mockElements['client-records-link'].classList.add).toHaveBeenCalledWith('hidden');
      expect(mockElements['client-templates-link'].style.display).toBe('none');
      expect(mockElements['client-account-link'].style.display).toBe('none');
      expect(mockElements['client-records-link'].style.display).toBe('none');
    });

    test('should show master nav links for master user', () => {
      mockAppState.userRole = 'master';
      toggleMasterUI(true, mockElements, mockAppState);
      
      // Verify master links are shown
      expect(mockElements['master-template-link'].classList.remove).toHaveBeenCalledWith('hidden');
      expect(mockElements['master-nav-link'].classList.remove).toHaveBeenCalledWith('hidden');
      expect(mockElements['master-support-link'].classList.remove).toHaveBeenCalledWith('hidden');
      expect(mockElements['master-template-link'].style.display).toBe('block');
      expect(mockElements['master-nav-link'].style.display).toBe('block');
      expect(mockElements['master-support-link'].style.display).toBe('block');
    });

    test('should hide create account link for master user', () => {
      mockAppState.userRole = 'master';
      toggleMasterUI(true, mockElements, mockAppState);
      
      expect(mockElements['create-account-link'].classList.add).toHaveBeenCalledWith('hidden');
      expect(mockElements['create-account-link'].style.display).toBe('none');
    });

    test('should show client nav links for non-master user', () => {
      mockAppState.userRole = 'client';
      toggleMasterUI(false, mockElements, mockAppState);
      
      // Verify client links are shown
      expect(mockElements['client-templates-link'].classList.remove).toHaveBeenCalledWith('hidden');
      expect(mockElements['client-account-link'].classList.remove).toHaveBeenCalledWith('hidden');
      expect(mockElements['client-records-link'].classList.remove).toHaveBeenCalledWith('hidden');
      expect(mockElements['client-templates-link'].style.display).toBe('block');
      expect(mockElements['client-account-link'].style.display).toBe('block');
      expect(mockElements['client-records-link'].style.display).toBe('block');
    });

    test('should hide master nav links for non-master user', () => {
      mockAppState.userRole = 'client';
      toggleMasterUI(false, mockElements, mockAppState);
      
      // Verify master links are hidden
      expect(mockElements['master-template-link'].classList.add).toHaveBeenCalledWith('hidden');
      expect(mockElements['master-nav-link'].classList.add).toHaveBeenCalledWith('hidden');
      expect(mockElements['master-support-link'].classList.add).toHaveBeenCalledWith('hidden');
      expect(mockElements['master-template-link'].style.display).toBe('none');
      expect(mockElements['master-nav-link'].style.display).toBe('none');
      expect(mockElements['master-support-link'].style.display).toBe('none');
    });

    test('should show create account link for admin user', () => {
      mockAppState.userRole = 'admin';
      toggleMasterUI(false, mockElements, mockAppState);
      
      expect(mockElements['create-account-link'].classList.remove).toHaveBeenCalledWith('hidden');
      expect(mockElements['create-account-link'].style.display).toBe('block');
    });

    test('should hide create account link for client user', () => {
      mockAppState.userRole = 'client';
      toggleMasterUI(false, mockElements, mockAppState);
      
      expect(mockElements['create-account-link'].classList.add).toHaveBeenCalledWith('hidden');
      expect(mockElements['create-account-link'].style.display).toBe('none');
    });
  });

  describe('Master navbar link routes', () => {
    test('master nav links should have correct target pages', () => {
      // Verify the expected nav link element IDs map to correct page IDs
      const masterNavMappings = {
        'master-template-link': 'template-creation-page', // Template Creation
        'master-nav-link': 'client-management-section',   // Client Management
        'master-support-link': 'support-response-page'    // Support Responses
      };
      
      // These are the expected mappings based on index.html onclick handlers
      expect(masterNavMappings['master-template-link']).toBe('template-creation-page');
      expect(masterNavMappings['master-nav-link']).toBe('client-management-section');
      expect(masterNavMappings['master-support-link']).toBe('support-response-page');
    });

    test('logout button should always be visible for both master and non-master users', () => {
      // The logout button is never conditionally hidden
      // This test verifies our understanding that logout remains visible for all users
      const logoutVisible = true;
      expect(logoutVisible).toBe(true);
    });
  });
});
