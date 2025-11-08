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
      console.log('[REGISTRATION] Step 1: Starting registration for email:', this.temp.email);

      // Step 1: Create Firebase Auth account
      console.log('[REGISTRATION] Step 2: Creating Firebase Auth account...');
      console.log('[REGISTRATION] - AppState.auth available:', !!AppState.auth);
      console.log('[REGISTRATION] - Firebase app initialized:', !!firebase.apps.length);
      console.log('[REGISTRATION] - Email to register:', this.temp.email);
      
      let result;
      let user;
      try {
        console.log('[REGISTRATION] Calling createUserWithEmailAndPassword...');
        result = await AppState.auth.createUserWithEmailAndPassword(this.temp.email, password);
        user = result.user;
        console.log('[REGISTRATION] ✓ createUserWithEmailAndPassword returned successfully');
      } catch (createErr) {
        console.error('[REGISTRATION] ✗ createUserWithEmailAndPassword failed:', createErr.code, createErr.message);
        throw createErr;
      }
      
      console.log('[REGISTRATION] ✓ Firebase Auth account created. UID:', user.uid);
      console.log('[REGISTRATION] - Email:', user.email);
      console.log('[REGISTRATION] - Email verified:', user.emailVerified);
      console.log('[REGISTRATION] - Current auth state:', AppState.auth.currentUser?.email);

      // Step 2: Update user profile
      console.log('[REGISTRATION] Step 3: Updating user profile...');
      await user.updateProfile({ displayName: name });
      console.log('[REGISTRATION] ✓ User profile updated');

      // Step 3: Get industry code data
      console.log('[REGISTRATION] Step 4: Fetching industry code data...');
      const codeDoc = await AppState.db.collection('industryCodes').doc(this.temp.industryCode).get();
      const codeData = codeDoc.data();
      console.log('[REGISTRATION] ✓ Industry code data fetched:', codeData);

      // Step 4: Create Firestore user document
      console.log('[REGISTRATION] Step 5: Creating Firestore user document...');
      const userData = {
        email: this.temp.email,
        name: name,
        role: 'client',
        industryCode: this.temp.industryCode,
        industryName: codeData.industryName || 'Default Industry',
        template: codeData.specifications?.style?.[0] || 'modern',
        assignedTemplate: codeData.specifications?.style?.[0] || 'modern',
        specifications: codeData.specifications || {},
        // Store products as comma-separated string (master can set multiple products)
        productName: codeData.productName || '',
        // Store allowed products (from master account) as array
        allowedProducts: Array.isArray(codeData.productName) 
          ? codeData.productName 
          : (codeData.productName ? [codeData.productName] : []),
        questionnaireCompleted: false,
        credits: 20,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      console.log('[REGISTRATION] User data to save:', userData);
      
      await AppState.db.collection('users').doc(user.uid).set(userData);
      console.log('[REGISTRATION] ✓ Firestore user document created');

      // CRITICAL: Verify that user can still authenticate after creation
      console.log('[REGISTRATION] Step 5.5: Verifying Firebase Auth account...');
      try {
        // Try to get current user immediately
        const currentUser = AppState.auth.currentUser;
        console.log('[REGISTRATION] Current user after creation:', currentUser?.email);
        if (!currentUser || currentUser.email !== this.temp.email) {
          console.warn('[REGISTRATION] ⚠️ Current user does not match registered email!');
        }
      } catch (verifyErr) {
        console.warn('[REGISTRATION] ⚠️ Error verifying auth state:', verifyErr.message);
      }

      // Step 5: Mark industry code as used
      console.log('[REGISTRATION] Step 6: Marking industry code as used...');
      await AppState.db.collection('industryCodes').doc(this.temp.industryCode).update({
        used: true,
        usedBy: user.uid,
        usedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log('[REGISTRATION] ✓ Industry code marked as used');

      UI.showMessage('register-msg-step3', ' Account created successfully!', 'success');
      console.log('[REGISTRATION] ✓✓✓ Registration complete! Registered email:', this.temp.email, 'UID:', user.uid);

      this.temp = { email: null, industryCode: null, verificationCode: null };

      // 等待 1.5 秒后跳转到 setup.html
      setTimeout(() => {
        window.location.href = 'setup.html';
      }, 1500);

    } catch (err) {
      console.error(' Registration error:', err);
      console.error('[REGISTRATION] Error code:', err.code);
      console.error('[REGISTRATION] Error message:', err.message);
      console.error('[REGISTRATION] Full error:', err);
      
      let errorMessage = 'Registration failed: ' + err.message;
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      }
      UI.showMessage('register-msg-step3', errorMessage, 'error');
    }
  }
};

// Export to global scope
window.Registration = Registration;
