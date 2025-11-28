/**
 * Client Management Module
 * Master dashboard for managing all client accounts
 */

// Client Management (Admin/Master)
const ClientManagement = {
  initialized: false,
  currentPage: 1,
  itemsPerPage: 10,
  totalPages: 1,
  allClients: [],
  filteredClients: [],
  currentClientId: null,
  /**
   * Toggle to use API endpoints instead of direct Firestore access.
   * When true, all data operations use /api/clients endpoints.
   * When false (default), uses direct Firebase Firestore client SDK.
   * 
   * To enable API mode, set: ClientManagement.useApiEndpoints = true
   * 
   * API mode requires:
   * - Server running with routes mounted at /api/clients
   * - Valid Firebase ID token for authentication
   * - User must have master or admin role
   */
  useApiEndpoints: false,
  isEditMode: false,
  availableTemplates: [],
  clientSpecs: {}, // Current client's specifications

  /**
   * Initialize the client management (called when section is shown)
   */
  async init() {
    if (this.initialized) return;
    const role = window.currentUserData?.role;
    if (role !== 'admin' && role !== 'master') {
      alert(window.i18n?.t('accessDenied') || 'Access denied. Admin or Master role required.');
      return;
    }
    this.setupEventListeners();
    await this.loadClients();
    this.initialized = true;
    
    // Render all i18n elements including select options
    if (window.i18n?.renderAll) {
      window.i18n.renderAll();
    }
    
    console.log('✅ Client Management ready');
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const byId = (id) => document.getElementById(id);

    byId('search-btn')?.addEventListener('click', () => this.applyFilters());
    byId('search-client')?.addEventListener('keypress', (e) => e.key === 'Enter' && this.applyFilters());
    byId('filter-industry')?.addEventListener('change', () => this.applyFilters());
    byId('filter-template')?.addEventListener('change', () => this.applyFilters());
    byId('filter-status')?.addEventListener('change', () => this.applyFilters());
    byId('reset-filters-btn')?.addEventListener('click', () => this.resetFilters());

    byId('prev-page')?.addEventListener('click', () => this.previousPage());
    byId('next-page')?.addEventListener('click', () => this.nextPage());

    document.querySelector('#client-modal .close')?.addEventListener('click', () => this.closeModal());
    window.addEventListener('click', (e) => { if (e.target?.id === 'client-modal') this.closeModal(); });

    byId('update-template-btn')?.addEventListener('click', () => this.updateTemplate());
    byId('add-credits-btn')?.addEventListener('click', () => this.adjustCredits('add'));
    byId('deduct-credits-btn')?.addEventListener('click', () => this.adjustCredits('deduct'));
    byId('reset-credits-btn')?.addEventListener('click', () => this.resetCredits());
    byId('reset-password-btn')?.addEventListener('click', () => this.resetPassword());
    byId('toggle-lock-btn')?.addEventListener('click', () => this.toggleAccountLock());
    byId('delete-account-btn')?.addEventListener('click', () => this.deleteAccount());
    
    // Template management event listeners
    byId('add-client-template-btn')?.addEventListener('click', () => this.addClientTemplate());
    // Edit mode buttons
    byId('edit-client-btn')?.addEventListener('click', () => this.toggleEditMode(true));
    byId('cancel-edit-btn')?.addEventListener('click', () => this.toggleEditMode(false));
    byId('save-client-btn')?.addEventListener('click', () => this.saveClientInfo());
    
    // Specification management
    byId('add-spec-to-client-btn')?.addEventListener('click', () => this.showAddSpecModal());
    byId('save-new-spec-btn')?.addEventListener('click', () => this.saveNewSpec());
    byId('cancel-new-spec-btn')?.addEventListener('click', () => this.hideAddSpecModal());
    
    // Set credit balance directly
    byId('set-credits-btn')?.addEventListener('click', () => this.setCreditsBalance());
  },

  /**
   * Get authorization headers for API calls
   */
  async getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    // If Firebase Auth is available, include the ID token
    if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
      try {
        const token = await firebase.auth().currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      } catch (e) {
        console.warn('Failed to get Firebase ID token:', e);
      }
    }
    return headers;
  },

  /**
   * Load all clients from Firestore or API
   */
  async loadClients() {
    try {
      if (this.useApiEndpoints) {
        // Use API endpoint
        const headers = await this.getAuthHeaders();
        const response = await fetch('/api/clients', { headers });
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        this.allClients = data.clients.map(c => ({
          id: c._id,
          displayName: c.name,
          email: c.email,
          status: c.status,
          templates: c.templates,
          notes: c.notes,
          billingInfo: c.billingInfo,
          industry: c.industry,
          credits: c.credits,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          lastActive: c.lastActive
        }));
      } else {
        // Use direct Firestore
        const db = firebase.firestore();
        const snap = await db.collection('users').where('role', '==', 'client').get();
        this.allClients = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      this.filteredClients = [...this.allClients];
      this.currentPage = 1;
      this.renderClients();
      console.log(`Loaded ${this.allClients.length} clients`);
    } catch (e) {
      console.error('loadClients error', e);
      alert(window.i18n?.t('failedLoadClients') || 'Failed to load clients.');
    }
  },

  applyFilters() {
    const q = (document.getElementById('search-client')?.value || '').toLowerCase();
    const ind = document.getElementById('filter-industry')?.value || '';
    const tpl = document.getElementById('filter-template')?.value || '';
    const status = document.getElementById('filter-status')?.value || '';

    this.filteredClients = this.allClients.filter(c => {
      const s = !q || c.email?.toLowerCase().includes(q) || c.displayName?.toLowerCase().includes(q);
      const i = !ind || c.industry === ind;
      const t = !tpl || c.assignedTemplate === tpl || (c.templates && c.templates.some(tmpl => tmpl.templateId === tpl));
      const st = !status || (c.status || 'active') === status;
      return s && i && t && st;
    });
    this.currentPage = 1;
    this.renderClients();
  },

  resetFilters() {
    ['search-client','filter-industry','filter-template','filter-status']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    this.filteredClients = [...this.allClients];
    this.currentPage = 1;
    this.renderClients();
  },

  renderClients() {
    const tbody = document.getElementById('clients-table-body');
    const noRes = document.getElementById('no-results');
    if (!tbody) return;

    if (this.filteredClients.length === 0) {
      tbody.innerHTML = '';
      if (noRes) noRes.style.display = 'block';
      return;
    } else if (noRes) noRes.style.display = 'none';

    this.totalPages = Math.max(1, Math.ceil(this.filteredClients.length / this.itemsPerPage));
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const page = this.filteredClients.slice(start, start + this.itemsPerPage);

    tbody.innerHTML = page.map(c => {
      // Display templates count or assignedTemplate
      const templateDisplay = c.templates && c.templates.length > 0 
        ? `${c.templates.length} template(s)` 
        : this.escapeHtml(c.assignedTemplate || 'None');
      
      return `
      <tr>
        <td>${this.escapeHtml(c.displayName || 'N/A')}</td>
        <td>${this.escapeHtml(c.email || '')}</td>
        <td>${this.escapeHtml(c.industry || 'N/A')}</td>
        <td>${templateDisplay}</td>
        <td>${c.credits || 0}</td>
        <td><span class="status-badge status-${c.status || 'active'}">${c.status || 'active'}</span></td>
        <td>${c.lastActive ? new Date(c.lastActive).toLocaleDateString() : window.i18n?.t('never') || 'Never'}</td>
        <td><div class="action-btns">
          <button class="btn-icon" onclick="ClientManagement.openClientModal('${c.id}')" title="${window.i18n?.t('viewDetails') || 'View'}">👁️</button>
          <button class="btn-icon btn-edit" onclick="ClientManagement.openClientModal('${c.id}', true)" title="${window.i18n?.t('editClient') || 'Edit'}">✏️</button>
        </div></td>
      </tr>
    `;
    }).join('');

    const info = document.getElementById('page-info');
    const prev = document.getElementById('prev-page');
    const next = document.getElementById('next-page');
    if (info) info.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
    if (prev) prev.disabled = this.currentPage === 1;
    if (next) next.disabled = this.currentPage === this.totalPages;
  },

  async openClientModal(id, editMode = false) {
    this.currentClientId = id;
    let c;
    
    if (this.useApiEndpoints) {
      // Fetch from API
      try {
        const headers = await this.getAuthHeaders();
        const response = await fetch(`/api/clients/${id}`, { headers });
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        c = {
          id: data._id,
          displayName: data.name,
          email: data.email,
          status: data.status,
          templates: data.templates,
          notes: data.notes,
          billingInfo: data.billingInfo,
          industry: data.industry,
          credits: data.credits,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          lastActive: data.lastActive
        };
      } catch (e) {
        console.error('Failed to fetch client details:', e);
        return alert(window.i18n?.t('clientNotFound') || 'Client not found');
      }
    } else {
      c = this.allClients.find(x => x.id === id);
    }
    
    this.isEditMode = editMode;
    if (!c) return alert(window.i18n?.t('clientNotFound') || 'Client not found');

    // Store current client specs
    this.clientSpecs = c.specifications || {};

    // Set view mode display values
    this.setText('modal-client-name', c.displayName || window.i18n?.t('notSet') || 'Not set');
    this.setText('modal-client-email', c.email || '');
    this.setText('modal-client-industry', c.industry || window.i18n?.t('notSet') || 'Not set');
    this.setText('modal-client-status', c.status || 'active');
    this.setText('modal-client-created', c.createdAt ? new Date(c.createdAt).toLocaleDateString() : window.i18n?.t('notSet') || 'Not set');
    this.setText('modal-client-lastactive', c.lastActive ? new Date(c.lastActive).toLocaleDateString() : window.i18n?.t('never') || 'Never');
    
    // Set edit mode input values
    this.setInputValue('edit-client-name', c.displayName || '');
    this.setInputValue('edit-client-email', c.email || '');
    this.setInputValue('edit-client-phone', c.phone || '');
    this.setInputValue('edit-client-company', c.companyName || '');
    this.setInputValue('edit-client-industry', c.industry || '');
    this.setInputValue('edit-client-product', c.productName || '');
    
    // Set status dropdown
    const statusSelect = document.getElementById('edit-client-status');
    if (statusSelect) statusSelect.value = c.status || 'active';

    // Load available templates
    await this.loadTemplateOptions();

    const sel = document.getElementById('modal-template-select');
    if (sel) sel.value = c.assignedTemplate || '';

    this.setText('modal-credit-balance', c.credits || 0);
    
    // Render client's assigned templates list
    this.renderClientTemplates(c.templates || []);
    this.setInputValue('set-credit-amount', c.credits || 0);

    // Load and render specifications
    this.renderSpecifications();

    await this.loadGenerationHistory(id);

    const lockBtn = document.getElementById('toggle-lock-btn');
    if (lockBtn) lockBtn.textContent = (c.status === 'locked') ? (window.i18n?.t('unlockAccount') || 'Unlock Account') : (window.i18n?.t('lockAccountText') || 'Lock Account');

    // Toggle edit mode display
    this.toggleEditMode(editMode);

    const modal = document.getElementById('client-modal');
    if (modal) modal.style.display = 'block';
  },
  
  /**
   * Render the client's assigned templates list in the modal
   */
  renderClientTemplates(templates) {
    const container = document.getElementById('client-templates-list');
    if (!container) return;
    
    if (!templates || templates.length === 0) {
      container.innerHTML = `<p style="color: #666; font-style: italic;">${window.i18n?.t('noTemplatesAssigned') || 'No templates assigned'}</p>`;
      return;
    }
    
    container.innerHTML = templates.map(t => `
      <div class="template-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f9f9f9; border-radius: 4px; margin-bottom: 8px;">
        <div>
          <strong>${this.escapeHtml(t.templateId)}</strong>
          ${t.specs && Object.keys(t.specs).length > 0 ? `<br><small style="color: #666;">Specs: ${this.escapeHtml(JSON.stringify(t.specs))}</small>` : ''}
          <br><small style="color: #999;">Added: ${t.addedAt ? new Date(t.addedAt).toLocaleDateString() : 'N/A'}</small>
        </div>
        <button class="btn btn-danger btn-sm" onclick="ClientManagement.removeClientTemplate('${t.id}')" title="Remove">✕</button>
      </div>
    `).join('');
  },
  
  /**
   * Add a template to the current client
   */
  async addClientTemplate() {
    if (!this.currentClientId) return;
    
    const templateIdInput = document.getElementById('new-template-id');
    const specsInput = document.getElementById('new-template-specs');
    
    const templateId = templateIdInput?.value?.trim();
    let specs = {};
    
    if (!templateId) {
      return alert(window.i18n?.t('templateIdRequired') || 'Template ID is required');
    }
    
    // Parse specs JSON if provided
    if (specsInput?.value?.trim()) {
      try {
        specs = JSON.parse(specsInput.value.trim());
      } catch (e) {
        return alert(window.i18n?.t('invalidSpecsJson') || 'Invalid specs JSON format');
      }
    }
    
    try {
      if (this.useApiEndpoints) {
        // Use API endpoint
        const headers = await this.getAuthHeaders();
        const response = await fetch(`/api/clients/${this.currentClientId}/templates`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ templateId, specs })
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || `API error: ${response.status}`);
        }
        
        const updatedClient = await response.json();
        this.renderClientTemplates(updatedClient.templates || []);
      } else {
        // Use direct Firestore
        const db = firebase.firestore();
        const docRef = db.collection('users').doc(this.currentClientId);
        const doc = await docRef.get();
        
        if (!doc.exists) {
          throw new Error('Client not found');
        }
        
        const data = doc.data();
        const currentTemplates = data.templates || [];
        
        const templateItemId = `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        currentTemplates.push({
          id: templateItemId,
          templateId,
          specs,
          addedAt: new Date().toISOString()
        });
        
        await docRef.update({
          templates: currentTemplates,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        this.renderClientTemplates(currentTemplates);
      }
      
      // Clear inputs
      if (templateIdInput) templateIdInput.value = '';
      if (specsInput) specsInput.value = '';
      
      alert(window.i18n?.t('templateAdded') || 'Template added successfully');
      await this.loadClients();
    } catch (e) {
      console.error('addClientTemplate error', e);
      alert(window.i18n?.t('failedAddTemplate') || 'Failed to add template.');
    }
  },
  
  /**
   * Remove a template from the current client
   */
  async removeClientTemplate(templateItemId) {
    if (!this.currentClientId || !templateItemId) return;
    
    if (!confirm(window.i18n?.t('confirmRemoveTemplate') || 'Remove this template?')) {
      return;
    }
    
    try {
      if (this.useApiEndpoints) {
        // Use API endpoint
        const headers = await this.getAuthHeaders();
        const response = await fetch(`/api/clients/${this.currentClientId}/templates/${templateItemId}`, {
          method: 'DELETE',
          headers
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || `API error: ${response.status}`);
        }
        
        const updatedClient = await response.json();
        this.renderClientTemplates(updatedClient.templates || []);
      } else {
        // Use direct Firestore
        const db = firebase.firestore();
        const docRef = db.collection('users').doc(this.currentClientId);
        const doc = await docRef.get();
        
        if (!doc.exists) {
          throw new Error('Client not found');
        }
        
        const data = doc.data();
        const currentTemplates = data.templates || [];
        const filteredTemplates = currentTemplates.filter(t => t.id !== templateItemId);
        
        await docRef.update({
          templates: filteredTemplates,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        this.renderClientTemplates(filteredTemplates);
      }
      
      alert(window.i18n?.t('templateRemoved') || 'Template removed successfully');
      await this.loadClients();
    } catch (e) {
      console.error('removeClientTemplate error', e);
      alert(window.i18n?.t('failedRemoveTemplate') || 'Failed to remove template.');
    }
  },
  
  /**
   * Update client information using API
   */
  async updateClientInfo(updates) {
    if (!this.currentClientId) return;
    
    try {
      if (this.useApiEndpoints) {
        const headers = await this.getAuthHeaders();
        const response = await fetch(`/api/clients/${this.currentClientId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(updates)
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || `API error: ${response.status}`);
        }
        
        return await response.json();
      } else {
        // Use direct Firestore
        const db = firebase.firestore();
        const updateData = { ...updates };
        if (updates.name) {
          updateData.displayName = updates.name;
          delete updateData.name;
        }
        updateData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('users').doc(this.currentClientId).update(updateData);
        return { success: true };
      }
    } catch (e) {
      console.error('updateClientInfo error', e);
      throw e;
    }
  },

  /**
   * Toggle between view and edit mode
   */
  toggleEditMode(editMode) {
    this.isEditMode = editMode;
    
    // Toggle visibility of view vs edit elements
    const viewElements = document.querySelectorAll('.client-view-mode');
    const editElements = document.querySelectorAll('.client-edit-mode');
    
    viewElements.forEach(el => el.style.display = editMode ? 'none' : '');
    editElements.forEach(el => el.style.display = editMode ? '' : 'none');
    
    // Toggle edit/save buttons
    const editBtn = document.getElementById('edit-client-btn');
    const saveBtn = document.getElementById('save-client-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    
    if (editBtn) editBtn.style.display = editMode ? 'none' : 'inline-block';
    if (saveBtn) saveBtn.style.display = editMode ? 'inline-block' : 'none';
    if (cancelBtn) cancelBtn.style.display = editMode ? 'inline-block' : 'none';
    
    // Update modal title
    const modalTitle = document.querySelector('#client-modal h2');
    if (modalTitle) {
      modalTitle.textContent = editMode 
        ? (window.i18n?.t('editClient') || 'Edit Client') 
        : (window.i18n?.t('clientDetails') || 'Client Details');
    }
  },

  /**
   * Save edited client information
   */
  async saveClientInfo() {
    if (!this.currentClientId) return;
    
    const name = document.getElementById('edit-client-name')?.value?.trim() || '';
    const phone = document.getElementById('edit-client-phone')?.value?.trim() || '';
    const company = document.getElementById('edit-client-company')?.value?.trim() || '';
    const industry = document.getElementById('edit-client-industry')?.value?.trim() || '';
    const product = document.getElementById('edit-client-product')?.value?.trim() || '';
    const status = document.getElementById('edit-client-status')?.value || 'active';
    
    // Basic validation
    if (!name) {
      this.showToast(window.i18n?.t('nameRequired') || 'Name is required', 'error');
      return;
    }
    
    try {
      const db = firebase.firestore();
      const updates = {
        displayName: name,
        phone: phone,
        companyName: company,
        industry: industry,
        productName: product,
        status: status,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      await db.collection('users').doc(this.currentClientId).update(updates);
      
      this.showToast(window.i18n?.t('clientUpdated') || 'Client information updated successfully', 'success');
      
      // Update local data
      const idx = this.allClients.findIndex(x => x.id === this.currentClientId);
      if (idx >= 0) {
        this.allClients[idx] = { ...this.allClients[idx], ...updates };
      }
      
      // Refresh the display
      await this.loadClients();
      this.toggleEditMode(false);
      
      // Update the view mode display
      this.setText('modal-client-name', name);
      this.setText('modal-client-industry', industry || window.i18n?.t('notSet') || 'Not set');
      this.setText('modal-client-status', status);
      
    } catch (e) {
      console.error('saveClientInfo error', e);
      this.showToast(window.i18n?.t('failedUpdateClient') || 'Failed to update client information', 'error');
    }
  },

  /**
   * Render client specifications in the modal
   */
  renderSpecifications() {
    const container = document.getElementById('client-specs-list');
    if (!container) return;
    
    const specs = this.clientSpecs || {};
    const specKeys = Object.keys(specs);
    
    if (specKeys.length === 0) {
      container.innerHTML = `<p class="no-specs-msg">${window.i18n?.t('noSpecifications') || 'No specifications assigned'}</p>`;
      return;
    }
    
    container.innerHTML = specKeys.map(key => {
      const values = Array.isArray(specs[key]) ? specs[key] : [specs[key]];
      return `
        <div class="spec-item" data-spec-key="${this.escapeHtml(key)}">
          <div class="spec-header">
            <strong>${this.escapeHtml(key)}</strong>
            <button class="btn-icon btn-danger btn-sm" onclick="ClientManagement.removeSpec('${this.escapeHtml(key)}')" title="${window.i18n?.t('removeSpec') || 'Remove'}">✕</button>
          </div>
          <div class="spec-values">
            ${values.map(v => `<span class="spec-value-tag">${this.escapeHtml(v)}</span>`).join('')}
          </div>
        </div>
      `;
    }).join('');
  },

  /**
   * Show modal to add new specification
   */
  showAddSpecModal() {
    const modal = document.getElementById('add-spec-modal');
    if (modal) {
      modal.style.display = 'block';
      // Clear previous values
      const nameInput = document.getElementById('new-spec-name');
      const valuesInput = document.getElementById('new-spec-values');
      if (nameInput) nameInput.value = '';
      if (valuesInput) valuesInput.value = '';
    }
  },

  /**
   * Hide add specification modal
   */
  hideAddSpecModal() {
    const modal = document.getElementById('add-spec-modal');
    if (modal) modal.style.display = 'none';
  },

  /**
   * Save new specification to client
   */
  async saveNewSpec() {
    if (!this.currentClientId) return;
    
    const specName = document.getElementById('new-spec-name')?.value?.trim() || '';
    const specValuesRaw = document.getElementById('new-spec-values')?.value?.trim() || '';
    
    if (!specName) {
      this.showToast(window.i18n?.t('specNameRequired') || 'Specification name is required', 'error');
      return;
    }
    
    if (!specValuesRaw) {
      this.showToast(window.i18n?.t('specValuesRequired') || 'At least one value is required', 'error');
      return;
    }
    
    // Parse values (comma-separated)
    const specValues = specValuesRaw.split(',').map(v => v.trim()).filter(v => v.length > 0);
    if (specValues.length === 0) {
      this.showToast(window.i18n?.t('specValuesRequired') || 'At least one value is required', 'error');
      return;
    }
    
    try {
      const db = firebase.firestore();
      
      // Update client specs
      const updatedSpecs = { ...this.clientSpecs };
      
      // Check for duplicates
      if (updatedSpecs[specName]) {
        // Merge values, avoiding duplicates
        const existingValues = Array.isArray(updatedSpecs[specName]) ? updatedSpecs[specName] : [updatedSpecs[specName]];
        const newValues = [...new Set([...existingValues, ...specValues])];
        updatedSpecs[specName] = newValues;
      } else {
        updatedSpecs[specName] = specValues;
      }
      
      await db.collection('users').doc(this.currentClientId).update({
        specifications: updatedSpecs,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Update local state
      this.clientSpecs = updatedSpecs;
      
      // Update local allClients array
      const idx = this.allClients.findIndex(x => x.id === this.currentClientId);
      if (idx >= 0) {
        this.allClients[idx].specifications = updatedSpecs;
      }
      
      this.renderSpecifications();
      this.hideAddSpecModal();
      this.showToast(window.i18n?.t('specAdded') || 'Specification added successfully', 'success');
      
    } catch (e) {
      console.error('saveNewSpec error', e);
      this.showToast(window.i18n?.t('failedAddSpec') || 'Failed to add specification', 'error');
    }
  },

  /**
   * Remove a specification from client
   */
  async removeSpec(specKey) {
    if (!this.currentClientId) return;
    
    // The i18n key uses {spec} placeholder which needs to be replaced with actual specKey
    let confirmMsg = window.i18n?.t('confirmRemoveSpec') || 'Remove specification "{spec}"? This may affect generated designs.';
    confirmMsg = confirmMsg.replace('{spec}', specKey);
    if (!confirm(confirmMsg)) return;
    
    try {
      const db = firebase.firestore();
      
      const updatedSpecs = { ...this.clientSpecs };
      delete updatedSpecs[specKey];
      
      await db.collection('users').doc(this.currentClientId).update({
        specifications: updatedSpecs,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Update local state
      this.clientSpecs = updatedSpecs;
      
      // Update local allClients array
      const idx = this.allClients.findIndex(x => x.id === this.currentClientId);
      if (idx >= 0) {
        this.allClients[idx].specifications = updatedSpecs;
      }
      
      this.renderSpecifications();
      this.showToast(window.i18n?.t('specRemoved') || 'Specification removed', 'success');
      
    } catch (e) {
      console.error('removeSpec error', e);
      this.showToast(window.i18n?.t('failedRemoveSpec') || 'Failed to remove specification', 'error');
    }
  },

  /**
   * Set credit balance to a specific amount
   */
  async setCreditsBalance() {
    if (!this.currentClientId) return;
    
    const input = document.getElementById('set-credit-amount');
    const amount = parseInt(input?.value || '0', 10);
    
    if (isNaN(amount) || amount < 0) {
      this.showToast(window.i18n?.t('enterValidAmount') || 'Enter a valid amount', 'error');
      return;
    }
    
    try {
      const db = firebase.firestore();
      await db.collection('users').doc(this.currentClientId).update({
        credits: amount,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      this.setText('modal-credit-balance', amount);
      
      // Update local data
      const idx = this.allClients.findIndex(x => x.id === this.currentClientId);
      if (idx >= 0) {
        this.allClients[idx].credits = amount;
      }
      
      this.showToast(window.i18n?.t('creditsUpdated') || 'Credits updated', 'success');
      await this.loadClients();
      
    } catch (e) {
      console.error('setCreditsBalance error', e);
      this.showToast(window.i18n?.t('failedUpdateCredits') || 'Failed to update credits', 'error');
    }
  },

  /**
   * Delete client account (with confirmation)
   * 
   * Note: Uses native prompt() for the second confirmation step. While a custom modal
   * would provide better UX, the native prompt ensures the user must actively type
   * "DELETE" which prevents accidental deletions. This is a common pattern for
   * destructive operations. A future enhancement could replace this with a custom
   * confirmation modal with an input field.
   */
  async deleteAccount() {
    if (!this.currentClientId) return;
    
    const c = this.allClients.find(x => x.id === this.currentClientId);
    if (!c) return;
    
    // First confirmation with account details
    const confirmMsg = window.i18n?.t('confirmDeleteAccount') || 'Permanently delete this account? This action cannot be undone.';
    const fullConfirmMsg = `${confirmMsg}\n\nEmail: ${c.email}\nName: ${c.displayName || 'N/A'}`;
    if (!confirm(fullConfirmMsg)) return;
    
    // Second confirmation - user must type DELETE
    const doubleConfirm = window.i18n?.t('typeDeleteToConfirm') || 'Type DELETE to confirm:';
    const userInput = prompt(doubleConfirm);
    if (!userInput || userInput.toUpperCase() !== 'DELETE') {
      this.showToast(window.i18n?.t('deleteCancelled') || 'Delete cancelled', 'info');
      return;
    }
    
    try {
      const db = firebase.firestore();
      
      // Note: This only deletes the Firestore document, not the Firebase Auth user
      // Full deletion would require Firebase Admin SDK on the server
      await db.collection('users').doc(this.currentClientId).delete();
      
      this.showToast(window.i18n?.t('accountDeleted') || 'Account deleted successfully', 'success');
      this.closeModal();
      await this.loadClients();
      
    } catch (e) {
      console.error('deleteAccount error', e);
      this.showToast(window.i18n?.t('failedDeleteAccount') || 'Failed to delete account', 'error');
    }
  },

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    // Try to use existing toast system if available
    if (window.UI && typeof window.UI.showMessage === 'function') {
      const msgEl = document.getElementById('modal-message');
      if (msgEl) {
        msgEl.textContent = message;
        msgEl.className = `message ${type}`;
        msgEl.style.display = 'block';
        setTimeout(() => { msgEl.style.display = 'none'; }, 3000);
        return;
      }
    }
    
    // Fallback to alert for important messages
    if (type === 'error') {
      alert(message);
    } else {
      console.log(`[${type}] ${message}`);
    }
  },

  /**
   * Set input element value
   */
  setInputValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
  },

  async loadTemplateOptions() {
    try {
      const db = firebase.firestore();
      const snap = await db.collection('templates').get();
      const templates = snap.docs.map(d => d.data().name).filter(n => n);

      const sel = document.getElementById('modal-template-select');
      if (!sel) return;

      // Keep the "None" option and add templates
      const currentValue = sel.value;
      sel.innerHTML = `<option value="">${window.i18n?.t('noneValue') || 'None'}</option>`;
      
      templates.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        sel.appendChild(opt);
      });

      // Restore the selected value
      if (currentValue) sel.value = currentValue;
    } catch (e) {
      console.error('loadTemplateOptions error', e);
    }
  },

  closeModal() {
    const modal = document.getElementById('client-modal');
    if (modal) modal.style.display = 'none';
    this.currentClientId = null;
    this.isEditMode = false;
    this.clientSpecs = {};
    // Reset to view mode
    this.toggleEditMode(false);
  },

  async loadGenerationHistory(clientId) {
    try {
      const db = firebase.firestore();
      const snap = await db.collection('generations')
        .where('userId', '==', clientId)
        .orderBy('createdAt', 'desc')
        .limit(50).get();
      const gens = snap.docs.map(d => d.data());

      const total = gens.length;
      const now = new Date();
      const month = gens.filter(g => {
        const d = new Date(g.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;
      const used = gens.reduce((s,g)=> s + (g.creditsUsed || 1), 0);

      this.setText('total-generations', total);
      this.setText('month-generations', month);
      this.setText('credits-used', used);

      const tbody = document.getElementById('history-table-body');
      if (!tbody) return;
      if (!gens.length) {
        const noHistoryText = window.i18n?.t('noHistory') || 'No generation history';
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">${noHistoryText}</td></tr>`;
      } else {
        tbody.innerHTML = gens.slice(0,10).map(g => `
          <tr>
            <td>${new Date(g.createdAt).toLocaleDateString()}</td>
            <td>${this.escapeHtml((g.prompt || '').slice(0,50))}...</td>
            <td>${this.escapeHtml(g.template || window.i18n?.t('notSet') || 'Not set')}</td>
            <td>${g.creditsUsed || 1}</td>
            <td>${g.status || 'completed'}</td>
          </tr>
        `).join('');
      }
    } catch (e) { console.error('history error', e); }
  },

  async updateTemplate() {
    if (!this.currentClientId) return;
    const val = document.getElementById('modal-template-select')?.value || '';
    try {
      const db = firebase.firestore();
      await db.collection('users').doc(this.currentClientId).update({
        assignedTemplate: val || null,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      alert(window.i18n?.t('templateUpdated') || 'Template updated');
      await this.loadClients();
      this.closeModal();
    } catch (e) { console.error('updateTemplate error', e); alert(window.i18n?.t('failedUpdateTemplate') || 'Failed to update template.'); }
  },

  async adjustCredits(action) {
    if (!this.currentClientId) return;
    const input = document.getElementById('credit-adjustment');
    const amount = parseInt(input?.value || '0', 10);
    if (!amount || amount <= 0) return alert(window.i18n?.t('enterValidAmount') || 'Enter a valid amount');

    const c = this.allClients.find(x => x.id === this.currentClientId);
    const cur = c?.credits || 0;
    const next = action === 'add' ? cur + amount : cur - amount;
    if (next < 0) return alert(window.i18n?.t('creditsNegative') || 'Credits cannot be negative');

    try {
      const db = firebase.firestore();
      await db.collection('users').doc(this.currentClientId).update({
        credits: next,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      this.setText('modal-credit-balance', next);
      if (input) input.value = '';
      const msg = action === 'add' 
        ? (window.i18n?.t('creditsAdded') || 'Credits added')
        : (window.i18n?.t('creditsDeducted') || 'Credits deducted');
      alert(msg);
      await this.loadClients();
    } catch (e) {
      console.error('adjustCredits error', e);
      alert(window.i18n?.t('failedAdjustCredits') || 'Failed to adjust credits.');
    }
  },

  async resetCredits() {
    if (!this.currentClientId) return;
    if (!confirm('Reset credits to 100?')) return;
    try {
      const db = firebase.firestore();
      await db.collection('users').doc(this.currentClientId).update({
        credits: 100,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      this.setText('modal-credit-balance', 100);
      alert(window.i18n?.t('creditsReset') || 'Credits reset');
      await this.loadClients();
    } catch (e) {
      console.error('resetCredits error', e);
      alert(window.i18n?.t('failedResetCredits') || 'Failed to reset credits.');
    }
  },

  async resetPassword() {
    if (!this.currentClientId) return;
    const c = this.allClients.find(x => x.id === this.currentClientId);
    if (!c?.email) return;
    if (!confirm(`Send a password reset email to ${c.email}? The client will receive an email to reset their password.`)) return;
    try {
      // Try to send a password reset email immediately (this uses Firebase Auth client SDK)
      if (AppState && AppState.auth && typeof AppState.auth.sendPasswordResetEmail === 'function') {
        await AppState.auth.sendPasswordResetEmail(c.email);
        alert('Password reset email sent to client.');

        // Record the action as a support note (DB if available, otherwise localStorage)
        try {
          const db = AppState.db;
          if (db) {
            await db.collection('users').doc(this.currentClientId).collection('supportRequests').add({
              category: 'security',
              message: `Master (${AppState.currentUser?.email || 'master'}) sent a password reset email to this account.`,
              status: 'resolved',
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              type: 'admin'
            });
          } else {
            // local fallback: push a local incident so master history shows the action
            const key = 'local_security_incidents';
            const list = JSON.parse(localStorage.getItem(key) || '[]');
            list.push({
              id: 'local-admin-' + Math.random().toString(36).slice(2,9),
              email: c.email,
              attempts: 0,
              status: 'resolved',
              category: 'security',
              type: 'admin',
              message: `Master (${AppState.currentUser?.email || 'master'}) sent a password reset email to this account.`,
              clientId: this.currentClientId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            localStorage.setItem(key, JSON.stringify(list));
          }
        } catch (logErr) {
          console.warn('Failed to record reset action in DB/local:', logErr);
        }
      } else {
        // If sendPasswordResetEmail isn't available, fallback to creating an adminAction for backend processing
        const db = AppState.db;
        if (db) {
          await db.collection('users').doc(this.currentClientId).collection('adminActions').add({
            action: 'resetPassword',
            tempPassword: null,
            status: 'pending',
            initiatedBy: AppState.currentUser?.email || 'master',
            initiatedByUid: AppState.currentUser?.uid || null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          await db.collection('users').doc(this.currentClientId).collection('supportRequests').add({
            category: 'security',
            message: `Master (${AppState.currentUser?.email || 'master'}) requested a password reset for this account.`,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            type: 'admin'
          });
          alert('Admin reset request created. A backend admin process is required to actually change the Firebase Auth password.');
        } else {
          // everything is offline and we can't reach DB or Auth SDK — store a local admin action so master sees it
          const key = 'local_security_incidents';
          const list = JSON.parse(localStorage.getItem(key) || '[]');
          list.push({
            id: 'local-admin-' + Math.random().toString(36).slice(2,9),
            email: c.email,
            attempts: 0,
            status: 'pending',
            category: 'security',
            type: 'admin',
            message: `Master (${AppState.currentUser?.email || 'master'}) requested a password reset for this account (local).`,
            clientId: this.currentClientId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          localStorage.setItem(key, JSON.stringify(list));
          alert('Local admin reset recorded. Master action pending (offline).');
        }
      }
    } catch (e) {
      console.error('resetPassword error', e);
      alert(window.i18n?.t('failedSendReset') || 'Failed to send password reset.');
    }
  },

  async toggleAccountLock() {
    if (!this.currentClientId) return;
    const c = this.allClients.find(x => x.id === this.currentClientId);
    const newStatus = c?.status === 'locked' ? 'active' : 'locked';
    const confirmMsg = newStatus === 'locked' ? 
      (window.i18n?.t('confirmLock') || 'Lock this account?') : 
      (window.i18n?.t('confirmUnlock') || 'Unlock this account?');
    if (!confirm(confirmMsg)) return;
    try {
      if (this.useApiEndpoints) {
        await this.updateClientInfo({ status: newStatus });
      } else {
        const db = firebase.firestore();
        await db.collection('users').doc(this.currentClientId).update({
          status: newStatus,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      const successMsg = newStatus === 'locked' ? 
        (window.i18n?.t('accountLocked') || 'Account locked') : 
        (window.i18n?.t('accountUnlocked') || 'Account unlocked');
      alert(successMsg);
      // When unlocking reset failedAttempts; when locking log attempts
      try {
        const db2 = AppState.db || firebase.firestore();
        const updates = {};
        if (newStatus === 'active') {
          updates.failedAttempts = 0;
        } else if (newStatus === 'locked') {
          updates.failedAttempts = 5;
          updates.lockedAt = firebase.firestore.FieldValue.serverTimestamp();
        }
        if (Object.keys(updates).length) {
          await db2.collection('users').doc(this.currentClientId).update(updates);
        }

        // Create a security incident for this lock/unlock action
        try {
          const incidentDb = AppState.db;
          if (incidentDb) {
            await incidentDb.collection('users').doc(this.currentClientId).collection('supportRequests').add({
              category: 'security',
              message: newStatus === 'locked'
                ? `Master (${AppState.currentUser?.email || 'master'}) locked this account.`
                : `Master (${AppState.currentUser?.email || 'master'}) unlocked this account.`,
              status: 'resolved',
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              type: 'admin'
            });
          }
        } catch (e3) {
          console.warn('Failed to log lock/unlock incident:', e3);
        }
      } catch (e4) {
        console.warn('Failed to update failedAttempts after lock/unlock:', e4);
      }
      await this.loadClients();
      this.closeModal();
    } catch (e) {
      console.error('toggleLock error', e);
      alert(window.i18n?.t('failedUpdateStatus') || 'Failed to update status.');
    }
  },

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.renderClients();
    }
  },

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.renderClients();
    }
  },

  setText(id, t) {
    const el = document.getElementById(id);
    if (el) el.textContent = t;
  },

  escapeHtml(t = '') {
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
  }
};
// expose
window.ClientManagement = ClientManagement;