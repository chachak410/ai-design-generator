const Profile = {
  async loadAccountInfo() {
    if (!AppState.currentUser) {
      UI.showMessage('account-msg', 'Please sign in to view account information.', 'error');
      return;
    }

    try {
      const doc = await AppState.db.collection('users').doc(AppState.currentUser.uid).get();
      
      if (!doc.exists) {
        UI.showMessage('account-msg', 'Account data not found.', 'error');
        return;
      }

      const data = doc.data();
      const accountInfo = document.getElementById('account-info');
      
      if (accountInfo) {
        accountInfo.innerHTML = `
          <p><strong>Name:</strong> ${data.name || 'Not set'}</p>
          <p><strong>Email:</strong> ${AppState.currentUser.email}</p>
          <p><strong>Industry:</strong> ${data.industryName || 'Not specified'} (Code: ${data.industryCode || 'N/A'})</p>
          <p><strong>Template:</strong> ${data.template || 'None'}</p>
          <p><strong>Product Name:</strong> ${data.productName || 'Not set'}</p>
          <p><strong>Role:</strong> ${AppState.userRole || 'client'}</p>
        `;
      }

      UI.checkProductWarning(data.productName);

    } catch (err) {
      UI.showMessage('account-msg', 'Error loading account: ' + err.message, 'error');
    }
  },

  async showEditAccount() {
    UI.hideElement('account-info');
    UI.hideElement('edit-account-btn');
    UI.showElement('account-form');

    try {
      const doc = await AppState.db.collection('users').doc(AppState.currentUser.uid).get();
      
      if (doc.exists) {
        const data = doc.data();
        document.getElementById('account-name').value = data.name || '';
        document.getElementById('account-product').value = data.productName || '';
        document.getElementById('account-email').value = AppState.currentUser.email;
      }
    } catch (err) {
      UI.showMessage('account-msg', 'Error loading account data: ' + err.message, 'error');
    }
  },

  cancelEdit() {
    UI.hideElement('account-form');
    UI.showElement('edit-account-btn');
    UI.showElement('account-info');
    UI.hideMessage('account-msg');
  },

  async updateAccount() {
    const name = document.getElementById('account-name')?.value.trim();
    const productName = document.getElementById('account-product')?.value.trim();

    if (!name || name.length < 2) {
      UI.showMessage('account-msg', 'Please enter a valid name (at least 2 characters).', 'error');
      return;
    }

    if (!productName || productName.length < 2) {
      UI.showMessage('account-msg', 'Please enter a valid product name (at least 2 characters).', 'error');
      return;
    }

    try {
      UI.showMessage('account-msg', 'Updating profile...', 'info');

      await AppState.db.collection('users').doc(AppState.currentUser.uid).update({
        name: name,
        productName: productName
      });

      await AppState.currentUser.updateProfile({ displayName: name });

      AppState.userProductName = productName;

      UI.showMessage('account-msg', ' Profile updated successfully!', 'success');

      this.cancelEdit();
      await this.loadAccountInfo();

    } catch (err) {
      console.error(' Update account error:', err);
      UI.showMessage('account-msg', 'Error updating profile: ' + err.message, 'error');
    }
  }
};
