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
  },

  /**
   * Load all clients from Firestore
   */
  async loadClients() {
    try {
      const db = firebase.firestore();
      const snap = await db.collection('users').where('role', '==', 'client').get();
      this.allClients = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
      const t = !tpl || c.assignedTemplate === tpl;
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

    tbody.innerHTML = page.map(c => `
      <tr>
        <td>${this.escapeHtml(c.displayName || 'N/A')}</td>
        <td>${this.escapeHtml(c.email || '')}</td>
        <td>${this.escapeHtml(c.industry || 'N/A')}</td>
        <td>${this.escapeHtml(c.assignedTemplate || 'None')}</td>
        <td>${c.credits || 0}</td>
        <td><span class="status-badge status-${c.status || 'active'}">${c.status || 'active'}</span></td>
        <td>${c.lastActive ? new Date(c.lastActive).toLocaleDateString() : window.i18n?.t('never') || 'Never'}</td>
        <td><div class="action-btns">
          <button class="btn-icon" onclick="ClientManagement.openClientModal('${c.id}')" title="View">👁️</button>
        </div></td>
      </tr>
    `).join('');

    const info = document.getElementById('page-info');
    const prev = document.getElementById('prev-page');
    const next = document.getElementById('next-page');
    if (info) info.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
    if (prev) prev.disabled = this.currentPage === 1;
    if (next) next.disabled = this.currentPage === this.totalPages;
  },

  async openClientModal(id) {
    this.currentClientId = id;
    const c = this.allClients.find(x => x.id === id);
    if (!c) return alert(window.i18n?.t('clientNotFound') || 'Client not found');

    this.setText('modal-client-name', c.displayName || window.i18n?.t('notSet') || 'Not set');
    this.setText('modal-client-email', c.email || '');
    this.setText('modal-client-industry', c.industry || window.i18n?.t('notSet') || 'Not set');
    this.setText('modal-client-status', c.status || 'active');
    this.setText('modal-client-created', c.createdAt ? new Date(c.createdAt).toLocaleDateString() : window.i18n?.t('notSet') || 'Not set');
    this.setText('modal-client-lastactive', c.lastActive ? new Date(c.lastActive).toLocaleDateString() : window.i18n?.t('never') || 'Never');

    // Load available templates
    await this.loadTemplateOptions();

    const sel = document.getElementById('modal-template-select');
    if (sel) sel.value = c.assignedTemplate || '';

    this.setText('modal-credit-balance', c.credits || 0);

    await this.loadGenerationHistory(id);

    const lockBtn = document.getElementById('toggle-lock-btn');
    if (lockBtn) lockBtn.textContent = (c.status === 'locked') ? (window.i18n?.t('unlockAccount') || 'Unlock Account') : (window.i18n?.t('lockAccountText') || 'Lock Account');

    const modal = document.getElementById('client-modal');
    if (modal) modal.style.display = 'block';
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
      const db = firebase.firestore();
      await db.collection('users').doc(this.currentClientId).update({
        status: newStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
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