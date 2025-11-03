const Auth = {
  async login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      UI.showMessage('login-msg', 'Signing in...', 'info');
      await AppState.auth.signInWithEmailAndPassword(email, password);
      UI.hideMessage('login-msg');
    } catch (err) {
      console.error(' Login error:', err);
      let errorMessage = 'Login failed. Please try again.';
      if (err.code === 'auth/invalid-login-credentials' || err.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect email or password.';
      } else if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email.';
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
