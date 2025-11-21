/**
 * Support Response Module (Master Only)
 * Allows master account to view client support requests and send responses
 */

const SupportResponse = {
  initialized: false,
  allRequests: [],
  filteredRequests: [],
  currentRequestId: null,
  currentRequestClientId: null,
  currentRequestClientData: null,
  currentPage: 1,
  itemsPerPage: 10,
  totalPages: 1,

  /**
   * Initialize the support response page (called when section is shown)
   */
  async init() {
    const masterEmail = 'langtechgroup5@gmail.com';
    const currentEmail = (AppState.currentUser?.email || '').toLowerCase();

    if (currentEmail !== masterEmail.toLowerCase()) {
      UI.showMessage('support-response-msg', 'Access denied. This page is only for the master account.', 'error');
      return;
    }

    // Always setup event listeners and load requests (don't skip if already initialized)
    if (!this.initialized) {
      this.setupEventListeners();
      this.initialized = true;
      if (window.i18n?.renderAll) {
        window.i18n.renderAll();
      }
    }

    // Always reload requests when page is shown
    await this.loadAllRequests();
    console.log('✅ Support Response Manager ready');
  },

  /**
   * Unlock a client account (master action from support response)
   */
  async unlockAccount(clientId, requestId) {
    if (!clientId) return alert('Client id required');
    if (!confirm('Unlock this account and reset failed attempts?')) return;

    try {
      const db = AppState.db;
      if (!db) throw new Error('Database not available');

      // Read client email for localStorage cleanup later
      const clientDocSnap = await db.collection('users').doc(clientId).get();
      const clientData = clientDocSnap.exists ? clientDocSnap.data() : {};
  const clientEmail = (clientData.email || '').trim().toLowerCase();

      await db.collection('users').doc(clientId).update({
        status: 'active',
        failedAttempts: 0,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // request admin action to re-enable Firebase Auth user (backend may process this)
      try {
            await db.collection('users').doc(clientId).collection('adminActions').add({
          action: 'activate',
          status: 'pending',
          initiatedBy: AppState.currentUser?.email || 'master',
            initiatedByUid: AppState.currentUser?.uid || null,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (aaErr) {
        console.warn('Failed to create adminAction to activate account:', aaErr);
      }

      // Log the unlock action as a security support request
      await db.collection('users').doc(clientId).collection('supportRequests').add({
        category: 'security',
        message: `Master (${AppState.currentUser?.email || 'master'}) unlocked this account via Support Response.`,
        status: 'resolved',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        type: 'admin'
      });

      alert('Account unlocked');
      // Also remove any local_storage incidents for this email so clients relying on fallback are updated
      try {
        if (clientEmail) {
          const key = 'local_security_incidents';
          const list = JSON.parse(localStorage.getItem(key) || '[]');
          const filtered = list.filter((i) => ((i.email || '').trim().toLowerCase() !== clientEmail));
          if (filtered.length !== list.length) {
            localStorage.setItem(key, JSON.stringify(filtered));
          }
        }
      } catch (lsErr) {
        console.warn('Failed cleaning local_storage on unlockAccount:', lsErr);
      }

      await this.loadAllRequests();
    } catch (err) {
      console.error('Error unlocking account:', err);
      alert('Failed to unlock account: ' + err.message);
    }
  },

  /**
   * Create an admin reset-password request for backend to process
   * (client-side cannot change other users' Firebase Auth password; this writes a request
   *  that a backend Cloud Function or admin operator can act upon).
   */
  async requestAdminReset(clientId, requestId) {
    if (!clientId) return alert('Client id required');

    const proceed = confirm('Create an admin password reset request for this account? (A backend admin function is required to actually change the Firebase Auth password)');
    if (!proceed) return;

    try {
      const db = AppState.db;
      if (!db) throw new Error('Database not available');

      // Optionally prompt for a temporary password to be set by the admin function
      let temp = prompt('Enter a temporary password to set (leave empty to let admin generate one):');
      if (temp && temp.length < 6) {
        alert('Temporary password must be at least 6 characters. Request cancelled.');
        return;
      }

      await db.collection('users').doc(clientId).collection('adminActions').add({
        action: 'resetPassword',
        tempPassword: temp || null,
        status: 'pending',
        initiatedBy: AppState.currentUser?.email || 'master',
        initiatedByUid: AppState.currentUser?.uid || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Also add a supportRequests entry to notify the client and track the action
      await db.collection('users').doc(clientId).collection('supportRequests').add({
        category: 'security',
        message: `Master (${AppState.currentUser?.email || 'master'}) requested a password reset for this account.`,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        type: 'admin'
      });

      alert('Admin reset request created. A backend admin process is required to apply the password change.');
      await this.loadAllRequests();
    } catch (err) {
      console.error('Error creating admin reset request:', err);
      alert('Failed to create admin reset request: ' + err.message);
    }
  },

  /**
   * Open client management and show the client modal for the given clientId
   */
  async openClientFromNotification(clientId) {
    if (!clientId) return alert('Client id required');

    try {
      // Close support response page and open client management page
      document.getElementById('support-response-page').classList.add('hidden');
      document.getElementById('support-response-page').style.display = 'none';

      document.getElementById('client-management-section').classList.remove('hidden');
      document.getElementById('client-management-section').style.display = 'block';

      if (window.ClientManagement && typeof window.ClientManagement.openClientModal === 'function') {
        window.ClientManagement.openClientModal(clientId);
      }
    } catch (err) {
      console.error('Error opening client from notification:', err);
      alert('Failed to navigate to client management: ' + err.message);
    }
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const byId = (id) => document.getElementById(id);

    byId('support-filter-category')?.addEventListener('change', () => this.applyFilters());
    byId('support-filter-status')?.addEventListener('change', () => this.applyFilters());
    byId('support-search-client')?.addEventListener('keypress', (e) => e.key === 'Enter' && this.applyFilters());
    byId('support-search-btn')?.addEventListener('click', () => this.applyFilters());
    byId('support-reset-filters-btn')?.addEventListener('click', () => this.resetFilters());

    byId('support-prev-page')?.addEventListener('click', () => this.previousPage());
    byId('support-next-page')?.addEventListener('click', () => this.nextPage());

    // Modal handlers
    document.querySelector('#support-request-modal .close')?.addEventListener('click', () => this.closeModal());
    window.addEventListener('click', (e) => {
      if (e.target?.id === 'support-request-modal') this.closeModal();
    });

    byId('support-go-to-client-btn')?.addEventListener('click', () => this.goToClient());
    byId('support-send-response-btn')?.addEventListener('click', () => this.sendResponse());
    byId('support-mark-resolved-btn')?.addEventListener('click', () => this.markAsResolved());
    byId('support-mark-rejected-btn')?.addEventListener('click', () => this.markAsRejected());
  },

  /**
   * Load all support requests from all clients
   */
  async loadAllRequests() {
    const listEl = document.getElementById('support-requests-list');
    if (!listEl) {
      console.warn('support-requests-list element not found');
      return;
    }

    try {
      console.log('Starting to load support requests...');
      listEl.innerHTML = '<div style="color:#666; text-align: center; padding: 20px;">Loading support requests...</div>';

      const db = AppState.db;
      const allRequests = [];
      const dbAvailable = !!db;

      if (dbAvailable) {
        try {
          console.log('Attempting to read all users...');
          const usersSnap = await db.collection('users').get();
          console.log(`Found ${usersSnap.docs.length} total users`);

          for (const userDoc of usersSnap.docs) {
            const userId = userDoc.id;
            const userData = userDoc.data();

            // Skip master account itself
            if (userData.role === 'master') {
              console.log(`Skipping master account: ${userId}`);
              continue;
            }

            console.log(`Fetching requests for user: ${userId} (${userData.email}, role: ${userData.role})`);

            try {
              const requestsSnap = await db
                .collection('users')
                .doc(userId)
                .collection('supportRequests')
                .get();

              console.log(`  Found ${requestsSnap.docs.length} requests`);

              requestsSnap.forEach((reqDoc) => {
                allRequests.push({
                  id: reqDoc.id,
                  clientId: userId,
                  clientName: userData.displayName || userData.name || 'Unknown',
                  clientEmail: userData.email || 'Unknown',
                  ...reqDoc.data(),
                });
              });
            } catch (subErr) {
              console.warn(`  ⚠️ Could not read supportRequests for ${userId}:`, subErr.message);
              // Continue to next user if one fails
            }
          }
        } catch (err) {
          console.error('❌ Method 1 failed (read all users):', err.message);
          // Continue — we'll still attempt to read top-level incidents and localStorage
        }

        // Also include top-level security incidents for emails without users/{uid} docs
        try {
          console.log('Fetching top-level security incidents...');
          const secSnap = await db.collection('securityIncidents').get();
          console.log(`Found ${secSnap.docs.length} security incidents`);
          secSnap.docs.forEach((sdoc) => {
            const sd = sdoc.data();
            allRequests.push({
              id: sdoc.id,
              clientId: sd.uid || null,
              clientName: sd.name || sd.displayName || 'Unknown',
              clientEmail: sd.email || 'Unknown',
              category: 'security',
              message: sd.message || sd.msg || '',
              status: sd.status || 'pending',
              createdAt: sd.createdAt || sd.updatedAt || null,
              type: sd.type || 'anon',
              attempts: sd.attempts || 0
            });
          });
        } catch (secErr) {
          console.warn('Could not read top-level securityIncidents:', secErr.message || secErr);
        }
      } else {
        console.log('Database not available — skipping Firestore reads and loading local incidents');
      }

      // Always include localStorage incidents if present (local fallback for no-DB environments)
      try {
        const ls = localStorage.getItem('local_security_incidents');
        if (ls) {
          const entries = JSON.parse(ls || '[]');
          entries.forEach((sd, idx) => {
            allRequests.push({
              id: sd.id || `local-${idx}-${(sd.email||'anon')}`,
              clientId: sd.uid || null,
              clientName: sd.name || sd.displayName || 'Unknown',
              clientEmail: sd.email || 'Unknown',
              category: 'security',
              message: sd.message || sd.msg || sd.note || '',
              status: sd.status || (sd.locked ? 'locked' : 'pending'),
              createdAt: sd.createdAt || sd.updatedAt || new Date().toISOString(),
              type: sd.type || 'local',
              attempts: sd.attempts || 0
            });
          });
          console.log(`Loaded local security incidents from localStorage`);
        }
      } catch (lsErr) {
        console.warn('Failed to read local_security_incidents from localStorage:', lsErr);
      }

      // Sort by createdAt in memory (descending). Support Firestore Timestamp, JS Date string, and numbers.
      const getTime = (t) => {
        if (!t) return 0;
        if (typeof t === 'number') return t;
        if (t && typeof t.toMillis === 'function') return t.toMillis();
        const parsed = new Date(t).getTime();
        return isNaN(parsed) ? 0 : parsed;
      };

      allRequests.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));

      this.allRequests = allRequests;
      this.filteredRequests = [...allRequests];
      this.currentPage = 1;
      this.renderRequests();

      console.log(`✅ Successfully loaded ${allRequests.length} support requests`);
    } catch (err) {
      console.error('❌ Error loading support requests:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        stack: err.stack
      });
      listEl.innerHTML = `<div style="color:#d32f2f; text-align: center; padding: 20px; background: #ffebee; border-radius: 8px; border: 1px solid #ef5350;">
        <strong>Error loading requests:</strong><br/>
        ${this.escapeHtml(err.message)}<br/>
        <small style="color: #999; margin-top: 8px; display: block;">Check browser console for details. You may need to update Firestore security rules to allow master account to read all users.</small>
      </div>`;
    }
  },

  /**
   * Apply filters to support requests
   */
  applyFilters() {
    const searchQuery = (document.getElementById('support-search-client')?.value || '').toLowerCase();
    const categoryFilter = document.getElementById('support-filter-category')?.value || '';
    const statusFilter = document.getElementById('support-filter-status')?.value || '';

    this.filteredRequests = this.allRequests.filter((req) => {
      const matchSearch =
        !searchQuery ||
        req.clientName?.toLowerCase().includes(searchQuery) ||
        req.clientEmail?.toLowerCase().includes(searchQuery) ||
        req.message?.toLowerCase().includes(searchQuery);

      const matchCategory = !categoryFilter || req.category === categoryFilter;
      const matchStatus = !statusFilter || req.status === statusFilter;

      return matchSearch && matchCategory && matchStatus;
    });

    this.currentPage = 1;
    this.renderRequests();
  },

  /**
   * Reset all filters
   */
  resetFilters() {
    ['support-search-client', 'support-filter-category', 'support-filter-status'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    this.filteredRequests = [...this.allRequests];
    this.currentPage = 1;
    this.renderRequests();
  },

  /**
   * Render the list of support requests
   */
  renderRequests() {
    const listEl = document.getElementById('support-requests-list');
    if (!listEl) return;

    if (this.filteredRequests.length === 0) {
      listEl.innerHTML = '<div style="color:#666; text-align: center; padding: 20px;">No support requests found.</div>';
      this.updatePagination();
      return;
    }

    this.totalPages = Math.max(1, Math.ceil(this.filteredRequests.length / this.itemsPerPage));
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const page = this.filteredRequests.slice(start, start + this.itemsPerPage);

    const statusColors = {
      pending: '#ffc107',
      resolved: '#28a745',
      rejected: '#dc3545',
      cancelled: '#6c757d',
    };

    const requestCards = page
      .map((req) => {
        const createdDate = req.createdAt
          ? new Date(req.createdAt).toLocaleString()
          : 'Unknown';
        const statusColor = statusColors[req.status] || '#007bff';
        const statusText = (req.status || 'unknown').charAt(0).toUpperCase() + (req.status || 'unknown').slice(1);

  return `
        <div class="support-request-card" style="padding: 16px; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 12px; background: #fff; cursor: pointer; transition: all 0.2s;" onclick="SupportResponse.openRequestModal('${this.escapeAttr(req.id)}', '${this.escapeAttr(req.clientId)}')">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                <span style="font-weight: 700; color: #333; font-size: 14px;">${this.escapeHtml(req.clientName)}</span>
                <span style="font-size: 12px; color: #888;">(<a href="mailto:${this.escapeHtml(req.clientEmail)}" style="color: #007bff; text-decoration: none;">${this.escapeHtml(req.clientEmail)}</a>)</span>
              </div>
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                <span style="display: inline-block; padding: 4px 10px; background: #f0f0f0; border-radius: 4px; font-size: 12px; text-transform: capitalize; color: #666;">${this.escapeHtml(req.category)}</span>
                <span style="font-size: 12px; color: #888;">${createdDate}</span>
              </div>
              <div style="color: #555; font-size: 14px; margin-top: 8px; white-space: normal; word-break: break-word;">${this.escapeHtml(req.message || '')}</div>
              ${
                req.response
                  ? `<div style="margin-top: 8px; padding: 8px; background: #f0f8ff; border-left: 3px solid #007bff; border-radius: 4px;">
                      <strong style="color: #0052b3; font-size: 12px;">Master Response:</strong>
                      <div style="color: #333; font-size: 12px; margin-top: 4px; white-space: normal; word-break: break-word;">${this.escapeHtml(req.response)}</div>
                    </div>`
                  : ''
              }
            </div>
            <div style="min-width: 140px; text-align: right; display:flex; flex-direction:column; gap:8px; align-items:flex-end;">
              <span style="display: inline-block; padding: 6px 12px; background: ${statusColor}; color: #fff; border-radius: 4px; font-size: 12px; font-weight: 700; text-transform: capitalize;">${statusText}</span>
              ${ (req.category === 'security' && req.clientId) ? `
                <div style="display:flex; gap:8px;">
                  <button class="btn-small" style="background:#28a745;color:#fff;border:none;padding:6px 8px;border-radius:4px;cursor:pointer;" onclick="SupportResponse.unlockAccount('${this.escapeAttr(req.clientId)}','${this.escapeAttr(req.id)}')">${window.i18n ? window.i18n.t('unlockAction') : 'Unlock'}</button>
                  <button class="btn-small" style="background:#007bff;color:#fff;border:none;padding:6px 8px;border-radius:4px;cursor:pointer;" onclick="SupportResponse.requestAdminReset('${this.escapeAttr(req.clientId)}','${this.escapeAttr(req.id)}')">${window.i18n ? window.i18n.t('resetPassword') : 'Reset PW'}</button>
                  <button class="btn-small" style="background:#6c757d;color:#fff;border:none;padding:6px 8px;border-radius:4px;cursor:pointer;" onclick="SupportResponse.openClientFromNotification('${this.escapeAttr(req.clientId)}')">${window.i18n ? window.i18n.t('goToClientBtn') : 'Open Client'}</button>
                </div>
              ` : '' }
              ${ (req.category === 'security' && !req.clientId) ? `
                <div style="display:flex; gap:8px;">
                  <button class="btn-small" style="background:#28a745;color:#fff;border:none;padding:6px 8px;border-radius:4px;cursor:pointer;" onclick="SupportResponse.unlockLocalIncident('${this.escapeAttr(req.id)}','${this.escapeAttr(req.clientEmail)}')">${window.i18n ? window.i18n.t('unlockAction') : 'Unlock'}</button>
                  <button class="btn-small" style="background:#007bff;color:#fff;border:none;padding:6px 8px;border-radius:4px;cursor:pointer;" onclick="SupportResponse.findAndOpenClientByEmail('${this.escapeAttr(req.clientEmail)}')">${window.i18n ? window.i18n.t('goToClientBtn') : 'Go to Client'}</button>
                </div>
              ` : '' }
            </div>
          </div>
        </div>
        `;
      })
      .join('');

    listEl.innerHTML = requestCards;
    this.updatePagination();
  },

  /**
   * Update pagination controls
   */
  updatePagination() {
    const prevBtn = document.getElementById('support-prev-page');
    const nextBtn = document.getElementById('support-next-page');
    const pageInfo = document.getElementById('support-page-info');

    if (pageInfo) pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
    if (prevBtn) prevBtn.disabled = this.currentPage === 1;
    if (nextBtn) nextBtn.disabled = this.currentPage === this.totalPages;
  },

  /**
   * Navigate to previous page
   */
  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.renderRequests();
    }
  },

  /**
   * Navigate to next page
   */
  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.renderRequests();
    }
  },

  /**
   * Open the support request modal
   */
  async openRequestModal(requestId, clientId) {
    this.currentRequestId = requestId;
    this.currentRequestClientId = clientId;

    try {
      // If this is a local-only incident (no clientId), load it from localStorage
      if (!clientId) {
        try {
          const ls = JSON.parse(localStorage.getItem('local_security_incidents') || '[]');
          const found = ls.find((i) => (i.id || i.email) && (i.id === requestId || i.email === requestId || i.id === requestId));
          if (!found) {
            alert('Request not found (local)');
            return;
          }

          // Populate modal with local data
          document.getElementById('modal-req-client-name').textContent = found.name || found.displayName || 'Unknown';
          document.getElementById('modal-req-client-email').textContent = found.email || 'Unknown';
          document.getElementById('modal-req-client-industry').textContent = found.industry || 'Not specified';
          document.getElementById('modal-req-client-product').textContent = found.productName || 'Not specified';
          document.getElementById('modal-req-category').textContent = found.category || 'Security';
          document.getElementById('modal-req-message').textContent = found.message || '';

          const createdDate = found.createdAt ? new Date(found.createdAt).toLocaleString() : 'Unknown';
          document.getElementById('modal-req-created').textContent = createdDate;
          document.getElementById('modal-req-status').textContent = (found.status || 'pending').charAt(0).toUpperCase() + (found.status || 'pending').slice(1);

          // Store currentRequestClientData for sending email actions
          this.currentRequestClientData = { email: found.email, name: found.name || found.displayName };
        } catch (lsErr) {
          console.error('Failed to load local request for modal:', lsErr);
          alert('Failed to load local request');
          return;
        }
      } else {
        // Get request data from Firestore
        const requestDoc = await AppState.db
          .collection('users')
          .doc(clientId)
          .collection('supportRequests')
          .doc(requestId)
          .get();

        if (!requestDoc.exists) {
          alert('Request not found');
          return;
        }

        const requestData = requestDoc.data();

        // Get client data
        const clientDoc = await AppState.db.collection('users').doc(clientId).get();
        if (!clientDoc.exists) {
          alert('Client not found');
          return;
        }

        const clientData = clientDoc.data();
        this.currentRequestClientData = { ...clientData, id: clientId };

        // Populate modal
        document.getElementById('modal-req-client-name').textContent = clientData.displayName || clientData.name || 'Unknown';
        document.getElementById('modal-req-client-email').textContent = clientData.email || 'Unknown';
        document.getElementById('modal-req-client-industry').textContent = clientData.industry || 'Not specified';
        document.getElementById('modal-req-client-product').textContent = clientData.productName || 'Not specified';
        document.getElementById('modal-req-category').textContent = requestData.category || 'Other';
        document.getElementById('modal-req-message').textContent = requestData.message || '';

        const createdDate = requestData.createdAt ? new Date(requestData.createdAt).toLocaleString() : 'Unknown';
        document.getElementById('modal-req-created').textContent = createdDate;
        document.getElementById('modal-req-status').textContent = (requestData.status || 'pending').charAt(0).toUpperCase() + (requestData.status || 'pending').slice(1);
      }

      // Show or hide response section based on status
      const responseSection = document.getElementById('modal-response-section');
      const resolvedSection = document.getElementById('modal-resolved-section');

      if (requestData.status === 'resolved' || requestData.status === 'rejected') {
        responseSection.style.display = 'none';
        resolvedSection.style.display = 'block';

        document.getElementById('modal-existing-response').textContent = requestData.response || 'No response provided';
        document.getElementById('modal-response-date').textContent = requestData.resolvedAt
          ? new Date(requestData.resolvedAt).toLocaleString()
          : 'Unknown';
      } else {
        responseSection.style.display = 'block';
        resolvedSection.style.display = 'none';
        document.getElementById('modal-response-text').value = '';
      }

      const modal = document.getElementById('support-request-modal');
      if (modal) modal.style.display = 'block';
    } catch (err) {
      console.error('Error opening request modal:', err);
      alert(`Error loading request: ${err.message}`);
    }
  },

  /**
   * Mark a local incident as resolved (updates localStorage)
   */
  markLocalResolved(localId) {
    try {
      const key = 'local_security_incidents';
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      const idx = list.findIndex((i) => (i.id || i.email || '') === localId || i.id === localId);
      if (idx >= 0) {
        list[idx].status = 'resolved';
        list[idx].resolvedAt = new Date().toISOString();
        list[idx].updatedAt = new Date().toISOString();
        localStorage.setItem(key, JSON.stringify(list));
        alert('Marked local incident as resolved');
        this.loadAllRequests();
      } else {
        alert('Local incident not found');
      }
    } catch (e) {
      console.error('markLocalResolved error', e);
      alert('Failed to mark local incident resolved: ' + e.message);
    }
  },

  /**
   * Attempt to unlock a local incident. Will try Firestore (find user by email)
   * and update the user's status if permitted. Falls back to marking the local
   * incident resolved and creating a local admin action so the master can track it.
   */
  async unlockLocalIncident(localId, clientEmail) {
    try {
      const key = 'local_security_incidents';
      const ls = JSON.parse(localStorage.getItem(key) || '[]');
      const idx = ls.findIndex((i) => (i.id || i.email || '') === localId || i.id === localId || i.email === localId);

      // Try to update Firestore user if we can find one by email
      const db = AppState.db;
      if (db && clientEmail) {
        try {
          const usersSnap = await db.collection('users').where('email', '==', clientEmail).get();
          if (!usersSnap.empty) {
            const userDoc = usersSnap.docs[0];
            const uid = userDoc.id;

            // Update user status and reset attempts
            await db.collection('users').doc(uid).update({
              status: 'active',
              failedAttempts: 0,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Create adminAction to notify backend if needed
            try {
              await db.collection('users').doc(uid).collection('adminActions').add({
                action: 'activate',
                status: 'pending',
                initiatedBy: AppState.currentUser?.email || 'master',
                initiatedByUid: AppState.currentUser?.uid || null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
              });
            } catch (aaErr) {
              console.warn('Failed to create adminAction on unlockLocalIncident:', aaErr?.message || aaErr);
            }

            // Mark any local incident as resolved (if exists)
            if (idx >= 0) {
              ls[idx].status = 'resolved';
              ls[idx].resolvedAt = new Date().toISOString();
              ls[idx].updatedAt = new Date().toISOString();
              localStorage.setItem(key, JSON.stringify(ls));
            }

            alert(window.i18n ? window.i18n.t('accountUnlocked') : 'Account unlocked');
            return await this.loadAllRequests();
          }
        } catch (dbErr) {
          console.warn('unlockLocalIncident: Firestore attempt failed, falling back to localStorage:', dbErr?.message || dbErr);
          // proceed to local fallback
        }
      }

      // Local fallback: remove/resolve any local incidents that match this id/email
      if (idx >= 0) {
  const emailMatch = (ls[idx].email || '').trim().toLowerCase();
        // Remove any entries matching the same email or the specific id
        for (let i = ls.length - 1; i >= 0; i--) {
          try {
            if (((ls[i].email || '').trim().toLowerCase() === emailMatch) || (ls[i].id === localId)) {
              ls.splice(i, 1);
            }
          } catch (e) {
            // ignore and continue
          }
        }
        try {
          localStorage.setItem(key, JSON.stringify(ls));
        } catch (e) {
          console.warn('Failed saving local_security_incidents after unlockLocalIncident cleanup:', e);
        }
        alert(window.i18n ? window.i18n.t('accountUnlocked') : 'Account unlocked (local)');
        return this.loadAllRequests();
      }

      alert(window.i18n ? window.i18n.t('clientNotFound') : 'Client not found');
    } catch (err) {
      console.error('unlockLocalIncident error', err);
      alert('Failed to unlock local incident: ' + (err?.message || err));
    }
  },

  /**
   * Find a client by email and open the client management modal.
   * If Firestore queries are blocked, open the client management section
   * and prefill a search field with the email so the master can find it manually.
   */
  async findAndOpenClientByEmail(email) {
    if (!email) return alert(window.i18n ? window.i18n.t('clientNotFound') : 'Client not found');
    try {
      const db = AppState.db;
      if (db) {
        try {
          const usersSnap = await db.collection('users').where('email', '==', email).get();
          if (!usersSnap.empty) {
            const uid = usersSnap.docs[0].id;
            return this.openClientFromNotification(uid);
          }
        } catch (dbErr) {
          console.warn('findAndOpenClientByEmail: Firestore query failed, falling back to client search UI:', dbErr?.message || dbErr);
        }
      }

      // Fallback: open client management page and try to prefill search
      document.getElementById('support-response-page')?.classList.add('hidden');
      document.getElementById('support-response-page')?.style && (document.getElementById('support-response-page').style.display = 'none');

      document.getElementById('client-management-section')?.classList.remove('hidden');
      document.getElementById('client-management-section')?.style && (document.getElementById('client-management-section').style.display = 'block');

      // Try to find a search input inside client management and prefill
      const selectors = [
        '#client-management-section input[type="search"]',
        '#client-management-section input[name="client-search"]',
        '#client-management-section #client-search',
        '#client-management-section .client-search-input',
        '#client-management-section input'
      ];
      let found = false;
      for (const s of selectors) {
        const el = document.querySelector(s);
        if (el) {
          el.value = email;
          el.dispatchEvent(new Event('input'));
          el.focus();
          found = true;
          break;
        }
      }

      if (!found) {
        alert(window.i18n ? window.i18n.t('goToClientManagement') : 'Go to Client Management');
      }
    } catch (err) {
      console.error('findAndOpenClientByEmail error', err);
      alert('Failed to open client: ' + (err?.message || err));
    }
  },

  /**
   * Open mail client to contact the email
   */
  openEmail(email) {
    if (!email) return alert('No email provided');
    window.location.href = `mailto:${email}`;
  },

  /**
   * Copy email to clipboard
   */
  copyToClipboard(text) {
    if (!text) return;
    try {
      navigator.clipboard?.writeText(text);
      alert('Copied to clipboard');
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      alert('Copied to clipboard');
    }
  },

  /**
   * Close the support request modal
   */
  closeModal() {
    const modal = document.getElementById('support-request-modal');
    if (modal) modal.style.display = 'none';
    this.currentRequestId = null;
    this.currentRequestClientId = null;
    this.currentRequestClientData = null;
  },

  /**
   * Navigate to the client in client management
   */
  goToClient() {
    if (!this.currentRequestClientId || !this.currentRequestClientData) {
      alert('Client information not loaded');
      return;
    }

    // Close the support response modal
    this.closeModal();

    // Hide support response page and show client management
    document.getElementById('support-response-page').classList.add('hidden');
    document.getElementById('support-response-page').style.display = 'none';

    document.getElementById('client-management-section').classList.remove('hidden');
    document.getElementById('client-management-section').style.display = 'block';

    // Open the client modal directly
    if (window.ClientManagement && typeof window.ClientManagement.openClientModal === 'function') {
      window.ClientManagement.openClientModal(this.currentRequestClientId);
    }

    console.log('Navigated to client:', this.currentRequestClientData.email);
  },

  /**
   * Send response to client
   */
  async sendResponse() {
    if (!this.currentRequestId || !this.currentRequestClientId) {
      alert('Request information not loaded');
      return;
    }

    const responseText = document.getElementById('modal-response-text')?.value.trim();
    if (!responseText) {
      alert('Please enter a response message');
      return;
    }

    try {
      const sendBtn = document.getElementById('support-send-response-btn');
      sendBtn.disabled = true;
      sendBtn.textContent = 'Sending...';

      // Update request with response
      await AppState.db
        .collection('users')
        .doc(this.currentRequestClientId)
        .collection('supportRequests')
        .doc(this.currentRequestId)
        .update({
          response: responseText,
          respondedAt: firebase.firestore.FieldValue.serverTimestamp(),
          status: 'resolved',
          resolvedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

      // Send email to client
      if (window.emailjs) {
        try {
          await emailjs.send(AppConfig.emailjs.serviceId, 'support_response_template', {
            to_email: this.currentRequestClientData.email,
            client_name: this.currentRequestClientData.displayName || this.currentRequestClientData.name || 'Valued Client',
            request_category: this.currentRequestClientData.category || 'General',
            response_message: responseText,
          });
          console.log('Support response email sent');
        } catch (emailErr) {
          console.warn('EmailJS not fully configured, but request was saved:', emailErr);
        }
      }

      alert('Response sent successfully to ' + this.currentRequestClientData.email);
      this.closeModal();
      await this.loadAllRequests();
    } catch (err) {
      console.error('Error sending response:', err);
      alert(`Error sending response: ${err.message}`);
    } finally {
      const sendBtn = document.getElementById('support-send-response-btn');
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send Response';
    }
  },

  /**
   * Mark request as resolved
   */
  async markAsResolved() {
    if (!this.currentRequestId || !this.currentRequestClientId) {
      alert('Request information not loaded');
      return;
    }

    try {
      await AppState.db
        .collection('users')
        .doc(this.currentRequestClientId)
        .collection('supportRequests')
        .doc(this.currentRequestId)
        .update({
          status: 'resolved',
          resolvedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

      alert('Request marked as resolved');
      this.closeModal();
      await this.loadAllRequests();
    } catch (err) {
      console.error('Error marking as resolved:', err);
      alert(`Error: ${err.message}`);
    }
  },

  /**
   * Mark request as rejected
   */
  async markAsRejected() {
    if (!this.currentRequestId || !this.currentRequestClientId) {
      alert('Request information not loaded');
      return;
    }

    try {
      await AppState.db
        .collection('users')
        .doc(this.currentRequestClientId)
        .collection('supportRequests')
        .doc(this.currentRequestId)
        .update({
          status: 'rejected',
          resolvedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

      alert('Request marked as rejected');
      this.closeModal();
      await this.loadAllRequests();
    } catch (err) {
      console.error('Error marking as rejected:', err);
      alert(`Error: ${err.message}`);
    }
  },

  /**
   * Helper: Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Helper: Escape HTML attributes
   */
  escapeAttr(text) {
    return String(text).replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
  },

  /**
   * Helper: Set text content of element
   */
  setText(elementId, text) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = text;
  },
};

// Export to global scope
window.SupportResponse = SupportResponse;
