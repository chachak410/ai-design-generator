const Registration = {
  temp: {
    email: null,
    industryCode: null,
    verificationCode: null
  },

  async sendVerificationCode() {
    const email = document.getElementById('register-email')?.value.trim();
    const industryCode = document.getElementById('register-industry-code')?.value.trim().toUpperCase();

    if (!email || !industryCode) {
      UI.showMessage('register-msg-step1', 'Please enter email and industry code.', 'error');
      return;
    }

    try {
      UI.showMessage('register-msg-step1', 'Checking industry code...', 'info');
      
      const codeDoc = await AppState.db.collection('industryCodes').doc(industryCode).get();
      
      if (!codeDoc.exists) {
        UI.showMessage('register-msg-step1', 'Invalid industry code.', 'error');
        return;
      }
      
      if (codeDoc.data().used) {
        UI.showMessage('register-msg-step1', 'This industry code has already been used.', 'error');
        return;
      }

      this.temp.verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      this.temp.email = email;
      this.temp.industryCode = industryCode;

      UI.showMessage('register-msg-step1', 'Sending verification code...', 'info');

      await emailjs.send(
        AppConfig.emailjs.serviceId,
        AppConfig.emailjs.templateId,
        {
          email: email,
          code: this.temp.verificationCode
        }
      );

      UI.showMessage('register-msg-step1', ' Verification code sent to your email!', 'success');
      UI.hideElement('register-step1');
      UI.showElement('register-step2');

    } catch (err) {
      console.error(' Send code error:', err);
      UI.showMessage('register-msg-step1', 'Failed to send email: ' + err.message, 'error');
    }
  },

  verifyCode() {
    const code = document.getElementById('register-code')?.value.trim();
    
    if (code === this.temp.verificationCode) {
      UI.hideElement('register-step2');
      UI.showElement('register-step3');
      UI.hideMessage('register-msg-step2');
    } else {
      UI.showMessage('register-msg-step2', 'Incorrect verification code.', 'error');
    }
  },

  async completeRegistration() {
    const password = document.getElementById('register-password')?.value;
    const password2 = document.getElementById('register-password2')?.value;
    const name = document.getElementById('register-name')?.value.trim();

    if (password !== password2) {
      UI.showMessage('register-msg-step3', 'Passwords do not match.', 'error');
      return;
    }

    if (password.length < 6) {
      UI.showMessage('register-msg-step3', 'Password must be at least 6 characters.', 'error');
      return;
    }

    try {
      UI.showMessage('register-msg-step3', 'Creating account...', 'info');

      const result = await AppState.auth.createUserWithEmailAndPassword(this.temp.email, password);
      const user = result.user;

      await user.updateProfile({ displayName: name });

      const codeDoc = await AppState.db.collection('industryCodes').doc(this.temp.industryCode).get();
      const codeData = codeDoc.data();

      await AppState.db.collection('users').doc(user.uid).set({
        email: this.temp.email,
        name: name,
        role: 'client',
        industryCode: this.temp.industryCode,
        industryName: codeData.industryName || 'Default Industry',
        template: codeData.specifications?.style?.[0] || 'modern',
        specifications: codeData.specifications || {},
        productName: codeData.productName || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      await AppState.db.collection('industryCodes').doc(this.temp.industryCode).update({
        used: true,
        usedBy: user.uid,
        usedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      UI.showMessage('register-msg-step3', ' Account created successfully!', 'success');

      this.temp = { email: null, industryCode: null, verificationCode: null };

    } catch (err) {
      console.error(' Registration error:', err);
      let errorMessage = 'Registration failed: ' + err.message;
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists.';
      }
      UI.showMessage('register-msg-step3', errorMessage, 'error');
    }
  }
};
