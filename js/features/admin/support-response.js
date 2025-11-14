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
      if (!db) {
        throw new Error('AppState.db is not available');
      }

      console.log('Fetching all users (trying alternative method)...');
      const allRequests = [];

      // Method 1: Try to get all users without role filter
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
        throw err;
      }

      // Sort by createdAt in memory (descending)
      allRequests.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });

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
            <div style="min-width: 100px; text-align: right;">
              <span style="display: inline-block; padding: 6px 12px; background: ${statusColor}; color: #fff; border-radius: 4px; font-size: 12px; font-weight: 700; text-transform: capitalize;">${statusText}</span>
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
      // Get request data
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

      const createdDate = requestData.createdAt
        ? new Date(requestData.createdAt).toLocaleString()
        : 'Unknown';
      document.getElementById('modal-req-created').textContent = createdDate;
      document.getElementById('modal-req-status').textContent = (requestData.status || 'pending').charAt(0).toUpperCase() + (requestData.status || 'pending').slice(1);

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
