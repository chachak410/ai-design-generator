const Setup = {
  async handleSetup() {
    const name = document.getElementById('setup-name')?.value.trim();
    const productName = document.getElementById('setup-product')?.value.trim();

    if (!name || name.length < 2) {
      UI.showMessage('setup-msg', 'Please enter a valid name (at least 2 characters).', 'error');
      return;
    }

    if (!productName || productName.length < 2) {
      UI.showMessage('setup-msg', 'Please enter a valid product name (at least 2 characters).', 'error');
      return;
    }

    try {
      UI.showMessage('setup-msg', 'Saving profile...', 'info');

      await AppState.db.collection('users').doc(AppState.currentUser.uid).update({
        name: name,
        productName: productName,
        setupCompleted: true
      });

      await AppState.currentUser.updateProfile({ displayName: name });

      AppState.userProductName = productName;

      UI.showMessage('setup-msg', ' Profile saved successfully!', 'success');

      setTimeout(() => {
        window.showPage('template-page');
      }, 1000);

    } catch (err) {
      console.error(' Setup error:', err);
      UI.showMessage('setup-msg', 'Error saving profile: ' + err.message, 'error');
    }
  }
};
