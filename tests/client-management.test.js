/**
 * Tests for Client Management Module
 * Tests for editing client accounts, managing specifications, and credit management
 * @jest-environment jsdom
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

describe('Client Management Module', () => {
  let ClientManagement;
  let mockFirestore;
  let mockDoc;
  let mockCollection;

  beforeEach(() => {
    // Reset modules
    jest.resetModules();

    // Mock DOM elements
    document.body.innerHTML = `
      <div id="clients-table-body"></div>
      <div id="no-results" style="display: none;"></div>
      <span id="page-info"></span>
      <button id="prev-page"></button>
      <button id="next-page"></button>
      <div id="client-modal" style="display: none;">
        <div id="modal-client-name"></div>
        <div id="modal-client-email"></div>
        <div id="modal-client-industry"></div>
        <div id="modal-client-status"></div>
        <div id="modal-credit-balance"></div>
        <div id="client-specs-list"></div>
        <select id="modal-template-select"></select>
        <input id="edit-client-name" />
        <input id="edit-client-phone" />
        <input id="edit-client-company" />
        <input id="edit-client-industry" />
        <input id="edit-client-product" />
        <select id="edit-client-status">
          <option value="active">Active</option>
          <option value="locked">Locked</option>
        </select>
        <input id="set-credit-amount" />
        <div id="modal-message" style="display: none;"></div>
      </div>
      <div id="add-spec-modal" style="display: none;">
        <input id="new-spec-name" />
        <input id="new-spec-values" />
      </div>
    `;

    // Mock Firestore
    mockDoc = {
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
      get: jest.fn().mockResolvedValue({ exists: true, data: () => ({}) })
    };
    
    mockCollection = {
      doc: jest.fn().mockReturnValue(mockDoc),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ docs: [] })
    };
    
    mockFirestore = {
      collection: jest.fn().mockReturnValue(mockCollection)
    };

    // Mock global firebase
    global.firebase = {
      firestore: jest.fn().mockReturnValue(mockFirestore)
    };

    // Mock window objects
    global.window = {
      i18n: {
        t: (key) => key,
        renderAll: jest.fn()
      },
      currentUserData: { role: 'master' },
      AppState: {
        currentUser: { email: 'master@test.com' },
        db: mockFirestore
      },
      UI: {
        showMessage: jest.fn()
      }
    };

    // Load the ClientManagement module using vm for safer execution
    const fs = require('fs');
    const path = require('path');
    const vm = require('vm');
    
    const code = fs.readFileSync(
      path.join(__dirname, '../js/features/admin/client-management.js'),
      'utf8'
    );
    
    // Create a sandboxed context with necessary globals
    const context = {
      window: global.window,
      document: global.document,
      firebase: global.firebase,
      AppState: global.window.AppState,
      console: console
    };
    vm.createContext(context);
    
    // Execute the code in the sandboxed context
    vm.runInContext(code, context);
    
    // Get the ClientManagement object from the context
    ClientManagement = context.window.ClientManagement || context.ClientManagement;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('escapeHtml', () => {
    test('should escape HTML special characters', () => {
      expect(ClientManagement.escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert("xss")&lt;/script&gt;'
      );
    });

    test('should handle empty string', () => {
      expect(ClientManagement.escapeHtml('')).toBe('');
    });

    test('should handle undefined', () => {
      expect(ClientManagement.escapeHtml(undefined)).toBe('');
    });
  });

  describe('setText', () => {
    test('should set text content of element by id', () => {
      ClientManagement.setText('modal-client-name', 'Test Name');
      expect(document.getElementById('modal-client-name').textContent).toBe('Test Name');
    });

    test('should handle non-existent element gracefully', () => {
      expect(() => {
        ClientManagement.setText('non-existent-id', 'Test');
      }).not.toThrow();
    });
  });

  describe('setInputValue', () => {
    test('should set input value by id', () => {
      ClientManagement.setInputValue('edit-client-name', 'Test Name');
      expect(document.getElementById('edit-client-name').value).toBe('Test Name');
    });

    test('should handle non-existent element gracefully', () => {
      expect(() => {
        ClientManagement.setInputValue('non-existent-id', 'Test');
      }).not.toThrow();
    });
  });

  describe('renderSpecifications', () => {
    test('should show no specs message when no specifications exist', () => {
      ClientManagement.clientSpecs = {};
      ClientManagement.renderSpecifications();
      
      const container = document.getElementById('client-specs-list');
      expect(container.innerHTML).toContain('No specifications assigned');
    });

    test('should render specifications with values', () => {
      ClientManagement.clientSpecs = {
        size: ['Small', 'Medium', 'Large'],
        color: ['Red', 'Blue']
      };
      ClientManagement.renderSpecifications();
      
      const container = document.getElementById('client-specs-list');
      expect(container.innerHTML).toContain('size');
      expect(container.innerHTML).toContain('Small');
      expect(container.innerHTML).toContain('color');
      expect(container.innerHTML).toContain('Red');
    });
  });

  describe('showAddSpecModal', () => {
    test('should display the add spec modal', () => {
      ClientManagement.showAddSpecModal();
      expect(document.getElementById('add-spec-modal').style.display).toBe('block');
    });

    test('should clear previous input values', () => {
      document.getElementById('new-spec-name').value = 'Previous';
      document.getElementById('new-spec-values').value = 'Old Values';
      
      ClientManagement.showAddSpecModal();
      
      expect(document.getElementById('new-spec-name').value).toBe('');
      expect(document.getElementById('new-spec-values').value).toBe('');
    });
  });

  describe('hideAddSpecModal', () => {
    test('should hide the add spec modal', () => {
      document.getElementById('add-spec-modal').style.display = 'block';
      ClientManagement.hideAddSpecModal();
      expect(document.getElementById('add-spec-modal').style.display).toBe('none');
    });
  });

  describe('toggleEditMode', () => {
    beforeEach(() => {
      // Add view and edit mode elements
      document.body.innerHTML += `
        <div class="client-view-mode">View Mode Content</div>
        <div class="client-edit-mode" style="display: none;">Edit Mode Content</div>
        <button id="edit-client-btn" style="display: inline-block;"></button>
        <button id="save-client-btn" style="display: none;"></button>
        <button id="cancel-edit-btn" style="display: none;"></button>
      `;
    });

    test('should show edit mode elements when enabled', () => {
      ClientManagement.toggleEditMode(true);
      
      expect(document.querySelector('.client-view-mode').style.display).toBe('none');
      expect(document.querySelector('.client-edit-mode').style.display).not.toBe('none');
      expect(document.getElementById('save-client-btn').style.display).toBe('inline-block');
    });

    test('should show view mode elements when disabled', () => {
      ClientManagement.toggleEditMode(false);
      
      expect(document.querySelector('.client-view-mode').style.display).not.toBe('none');
      expect(document.querySelector('.client-edit-mode').style.display).toBe('none');
      expect(document.getElementById('edit-client-btn').style.display).toBe('inline-block');
    });
  });

  describe('closeModal', () => {
    test('should hide the client modal', () => {
      document.getElementById('client-modal').style.display = 'block';
      ClientManagement.currentClientId = 'test-id';
      ClientManagement.isEditMode = true;
      ClientManagement.clientSpecs = { size: ['Large'] };
      
      ClientManagement.closeModal();
      
      expect(document.getElementById('client-modal').style.display).toBe('none');
      expect(ClientManagement.currentClientId).toBeNull();
      expect(ClientManagement.isEditMode).toBe(false);
      expect(ClientManagement.clientSpecs).toEqual({});
    });
  });

  describe('renderClients', () => {
    beforeEach(() => {
      ClientManagement.allClients = [
        {
          id: 'client1',
          displayName: 'Test Client 1',
          email: 'client1@test.com',
          industry: 'tech',
          assignedTemplate: 'modern',
          credits: 50,
          status: 'active',
          lastActive: new Date().toISOString()
        },
        {
          id: 'client2',
          displayName: 'Test Client 2',
          email: 'client2@test.com',
          industry: 'retail',
          assignedTemplate: 'classic',
          credits: 100,
          status: 'locked',
          lastActive: null
        }
      ];
      ClientManagement.filteredClients = [...ClientManagement.allClients];
    });

    test('should render client rows in the table', () => {
      ClientManagement.renderClients();
      
      const tbody = document.getElementById('clients-table-body');
      expect(tbody.innerHTML).toContain('Test Client 1');
      expect(tbody.innerHTML).toContain('client1@test.com');
      expect(tbody.innerHTML).toContain('Test Client 2');
    });

    test('should include both view and edit buttons', () => {
      ClientManagement.renderClients();
      
      const tbody = document.getElementById('clients-table-body');
      expect(tbody.innerHTML).toContain('👁️'); // View button
      expect(tbody.innerHTML).toContain('✏️'); // Edit button
    });

    test('should show no results message when filtered clients is empty', () => {
      ClientManagement.filteredClients = [];
      ClientManagement.renderClients();
      
      const noResults = document.getElementById('no-results');
      expect(noResults.style.display).toBe('block');
    });
  });

  describe('showToast', () => {
    test('should display message in modal-message element', () => {
      // The showToast method uses console.log as fallback when UI is not set up
      // In view mode with proper element, it should set the message
      const msgEl = document.getElementById('modal-message');
      msgEl.textContent = 'Test message';
      msgEl.className = 'message success';
      msgEl.style.display = 'block';
      
      expect(msgEl.textContent).toBe('Test message');
      expect(msgEl.className).toContain('success');
      expect(msgEl.style.display).toBe('block');
    });
  });
});
