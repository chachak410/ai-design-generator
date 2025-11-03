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
      alert('Access denied. Admin or Master role required.');
      return;
    }
    this.setupEventListeners();
    await this.loadClients();
    this.initialized = true;
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
      alert('Failed to load clients.');
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
        <td>${c.lastActive ? new Date(c.lastActive).toLocaleDateString() : 'Never'}</td>
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
    if (!c) return alert('Client not found');

    this.setText('modal-client-name', c.displayName || 'N/A');
    this.setText('modal-client-email', c.email || '');
    this.setText('modal-client-industry', c.industry || 'N/A');
    this.setText('modal-client-status', c.status || 'active');
    this.setText('modal-client-created', c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A');
    this.setText('modal-client-lastactive', c.lastActive ? new Date(c.lastActive).toLocaleDateString() : 'Never');

    const sel = document.getElementById('modal-template-select');
    if (sel) sel.value = c.assignedTemplate || '';

    this.setText('modal-credit-balance', c.credits || 0);

    await this.loadGenerationHistory(id);

    const lockBtn = document.getElementById('toggle-lock-btn');
    if (lockBtn) lockBtn.textContent = (c.status === 'locked') ? 'Unlock Account' : 'Lock Account';

    const modal = document.getElementById('client-modal');
    if (modal) modal.style.display = 'block';
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
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No generation history</td></tr>';
      } else {
        tbody.innerHTML = gens.slice(0,10).map(g => `
          <tr>
            <td>${new Date(g.createdAt).toLocaleDateString()}</td>
            <td>${this.escapeHtml((g.prompt || '').slice(0,50))}...</td>
            <td>${this.escapeHtml(g.template || 'N/A')}</td>
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
      alert('Template updated');
      await this.loadClients();
      this.closeModal();
    } catch (e) { console.error('updateTemplate error', e); alert('Failed to update template.'); }
  },

  async adjustCredits(action) {
    if (!this.currentClientId) return;
    const input = document.getElementById('credit-adjustment');
    const amount = parseInt(input?.value || '0', 10);
    if (!amount || amount <= 0) return alert('Enter a valid amount');

    const c = this.allClients.find(x => x.id === this.currentClientId);
    const cur = c?.credits || 0;
    const next = action === 'add' ? cur + amount : cur - amount;
    if (next < 0) return alert('Credits cannot be negative');

    try {
      const db = firebase.firestore();
      await db.collection('users').doc(this.currentClientId).update({
        credits: next,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      this.setText('modal-credit-balance', next);
      if (input) input.value = '';
      alert(`Credits ${action === 'add' ? 'added' : 'deducted'}`);
      await this.loadClients();
    } catch (e) {
      console.error('adjustCredits error', e);
      alert('Failed to adjust credits.');
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
      alert('Credits reset');
      await this.loadClients();
    } catch (e) {
      console.error('resetCredits error', e);
      alert('Failed to reset credits.');
    }
  },

  async resetPassword() {
    if (!this.currentClientId) return;
    const c = this.allClients.find(x => x.id === this.currentClientId);
    if (!c?.email) return;
    if (!confirm(`Send password reset to ${c.email}?`)) return;
    try {
      await firebase.auth().sendPasswordResetEmail(c.email);
      alert('Password reset email sent');
    } catch (e) {
      console.error('resetPassword error', e);
      alert('Failed to send reset email.');
    }
  },

  async toggleAccountLock() {
    if (!this.currentClientId) return;
    const c = this.allClients.find(x => x.id === this.currentClientId);
    const newStatus = c?.status === 'locked' ? 'active' : 'locked';
    if (!confirm(`${newStatus === 'locked' ? 'Lock' : 'Unlock'} this account?`)) return;
    try {
      const db = firebase.firestore();
      await db.collection('users').doc(this.currentClientId).update({
        status: newStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      alert(`Account ${newStatus === 'locked' ? 'locked' : 'unlocked'}`);
      await this.loadClients();
      this.closeModal();
    } catch (e) {
      console.error('toggleLock error', e);
      alert('Failed to update status.');
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