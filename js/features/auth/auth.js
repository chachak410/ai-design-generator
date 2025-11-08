const Auth = {
  async login() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      UI.showMessage('login-msg', 'Please enter both email and password.', 'error');
      return;
    }

    try {
      UI.showMessage('login-msg', 'Signing in...', 'info');
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        UI.showMessage('login-msg', 'Please enter a valid email address.', 'error');
        return;
      }
      
      await AppState.auth.signInWithEmailAndPassword(email, password);
      UI.hideMessage('login-msg');
    } catch (err) {
      console.error(' Login error:', err);
      console.error('[LOGIN] Error code:', err.code);
      console.error('[LOGIN] Error message:', err.message);
      console.error('[LOGIN] Full error object:', err);
      
      let errorMessage = 'Login failed. Please try again.';
      
      // Map specific Firebase error codes
      if (err.code === 'auth/invalid-login-credentials' || 
          err.code === 'auth/wrong-password' ||
          err.code === 'auth/user-not-found') {
        errorMessage = 'Incorrect email or password.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many login attempts. Please try again later.';
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled.';
      } else {
        // Log other error codes for debugging
        console.warn('[LOGIN] Unmapped error code:', err.code);
        errorMessage = 'Login failed: ' + (err.message || 'Unknown error');
      }
      
      UI.showMessage('login-msg', errorMessage, 'error');
    }
  },

  async logout() {
    try {
      await AppState.auth.signOut();
    } catch (err) {
      console.error(' Logout error:', err);
      alert('Logout failed: ' + err.message);
    }
  },

  async resetPassword() {
    const email = prompt('Enter your email address:');
    if (!email) return;

    try {
      await AppState.auth.sendPasswordResetEmail(email);
      alert('Password reset email sent! Check your inbox.');
    } catch (err) {
      console.error(' Password reset error:', err);
      alert('Error: ' + err.message);
    }
  }
};

// Export to global scope
window.Auth = Auth;
