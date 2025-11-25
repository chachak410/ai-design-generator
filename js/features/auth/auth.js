const Auth = {
  // Debounce timer for email lookup
  _emailLookupTimer: null,
  // Helper to detect Firestore permission errors
  isPermissionError: function(e) {
    if (!e) return false;
    const code = e.code || '';
    const msg = String(e.message || '');
    return code === 'permission-denied' || /insufficient permissions/i.test(msg) || /Missing or insufficient permissions/i.test(msg);
  },

  /**
   * Initialize auth helpers (attach listeners)
   */
  init() {
    try {
      const emailEl = document.getElementById('login-email');
      if (emailEl) {
        emailEl.addEventListener('input', () => {
          clearTimeout(this._emailLookupTimer);
          this._emailLookupTimer = setTimeout(() => {
            this.updateFailedAttemptNotice(emailEl.value.trim());
          }, 450);
        });
        emailEl.addEventListener('blur', () => {
          clearTimeout(this._emailLookupTimer);
          this.updateFailedAttemptNotice(emailEl.value.trim());
        });
      }
    } catch (e) {
      console.warn('Auth.init error:', e);
    }
  },

  /**
   * Fetch user doc by email and display failed-attempts notice under the email field.
   */
  async updateFailedAttemptNotice(email) {
    const elId = 'login-attempts';
    try {
      // remove notice if no email
      if (!email) {
        const old = document.getElementById(elId);
        if (old) old.remove();
        return;
      }

  const db = AppState.db;
  // If Firestore not available or permission denied, fall back to localStorage
  let useLocal = !db;

      let snap = null;
      if (!useLocal) {
        snap = await db.collection('users').where('email', '==', email).limit(1).get();
      }
      let text = '';
      let isLocked = false;
      if (!useLocal && snap && !snap.empty) {
        const doc = snap.docs[0];
        const data = doc.data();
        const attempts = data.failedAttempts || 0;
        const status = data.status || 'active';
        if (status === 'locked') {
          text = window.i18n?.t('accountLockedFull') || 'Account locked.';
          isLocked = true;
        } else if (attempts > 0) {
          // Use translation for attempts notice; fallback to English formatting
          if (window.i18n?.t) {
            // some translations accept {n} or {plural}
            text = window.i18n.t('failedAttemptsNotice', { n: attempts, plural: attempts > 1 ? 's' : '' });
          } else {
            text = `${attempts}/5 failed attempt${attempts > 1 ? 's' : ''}. After 5 attempts the account will be locked.`;
          }
        }
      } else {
        // No users doc found — if we have DB, check securityIncidents; otherwise, check localStorage fallback
        if (!useLocal) {
          try {
            const secSnap = await db.collection('securityIncidents').where('email', '==', email).limit(1).get();
            if (!secSnap.empty) {
              const sdoc = secSnap.docs[0];
              const sdata = sdoc.data();
              const attempts = sdata.attempts || 0;
              const status = sdata.status || 'pending';
              if (status === 'locked') {
                text = window.i18n?.t('accountLockedFull') || 'Account locked.';
                isLocked = true;
              } else if (attempts > 0) {
                if (window.i18n?.t) {
                  text = window.i18n.t('failedAttemptsNotice', { n: attempts, plural: attempts > 1 ? 's' : '' });
                } else {
                  text = `${attempts}/5 failed attempt${attempts > 1 ? 's' : ''}. After 5 attempts the account will be locked.`;
                }
              }
            }
          } catch (secErr) {
            // If security error (permissions), fallback to local storage
            console.warn('Failed to read securityIncidents for notice:', secErr);
            if (this.isPermissionError(secErr)) useLocal = true;
          }
        }

        // localStorage fallback
        if (useLocal) {
          try {
            const list = JSON.parse(localStorage.getItem('local_security_incidents') || '[]');
            const found = list.find((i) => (i.email || '').toLowerCase() === (email || '').toLowerCase());
            if (found) {
              const attempts = found.attempts || 0;
              const status = found.status || 'pending';
              if (status === 'locked') {
                text = window.i18n?.t('accountLockedFull') || 'Account locked.';
                isLocked = true;
              } else if (attempts > 0) {
                if (window.i18n?.t) {
                  text = window.i18n.t('failedAttemptsNotice', { n: attempts, plural: attempts > 1 ? 's' : '' });
                } else {
                  text = `${attempts}/5 failed attempt${attempts > 1 ? 's' : ''}. After 5 attempts the account will be locked.`;
                }
              }
            }
          } catch (e) {
            console.warn('localStorage read error for security incidents:', e);
          }
        }
      }

      // ensure a small helper element exists under the email input
      const emailEl = document.getElementById('login-email');
      if (!emailEl) return;
      let notice = document.getElementById(elId);
      if (!notice) {
        notice = document.createElement('div');
        notice.id = elId;
        notice.style.fontSize = '12px';
        notice.style.color = '#d32f2f';
        notice.style.marginTop = '6px';
        emailEl.parentNode && emailEl.parentNode.insertBefore(notice, emailEl.nextSibling);
      }

      // show the text; if account locked add unlock button after message
      notice.textContent = text;
      // create or remove unlock button based on locked state
      let btn = document.getElementById('unlock-request-btn');
      if (isLocked) {
        if (!btn) {
          btn = document.createElement('button');
          btn.id = 'unlock-request-btn';
          btn.style.marginLeft = '8px';
          btn.style.padding = '4px 8px';
          btn.style.borderRadius = '4px';
          btn.style.border = '1px solid #ccc';
          btn.style.cursor = 'pointer';
          btn.addEventListener('click', async () => {
            await Auth.requestUnlock(email);
            // provide immediate feedback
            btn.disabled = true;
            btn.textContent = window.i18n?.t('unlockRequestBtn') || 'Unlock Request';
          });
          notice.appendChild(btn);
        }
        btn.textContent = window.i18n?.t('unlockRequestBtn') || 'Unlock Request';
      } else {
        if (btn) btn.remove();
      }
      notice.style.display = text ? 'block' : 'none';
    } catch (err) {
      // If we hit a permission error on the initial db query, fall back to localStorage
      // Avoid spamming console with expected permission-denied errors; log at debug level instead.
      if (this.isPermissionError(err)) {
        console.debug('updateFailedAttemptNotice permission denied, falling back to localStorage');
      } else {
        console.warn('updateFailedAttemptNotice error:', err);
      }
      try {
        if (this.isPermissionError(err)) {
          // Retry using localStorage
          const list = JSON.parse(localStorage.getItem('local_security_incidents') || '[]');
          const found = list.find((i) => (i.email || '').toLowerCase() === (email || '').toLowerCase());
          const emailEl = document.getElementById('login-email');
          const elId = 'login-attempts';
          let notice = document.getElementById(elId);
          if (!notice && emailEl) {
            notice = document.createElement('div');
            notice.id = elId;
            notice.style.fontSize = '12px';
            notice.style.color = '#d32f2f';
            notice.style.marginTop = '6px';
            emailEl.parentNode && emailEl.parentNode.insertBefore(notice, emailEl.nextSibling);
          }
          let text = '';
          let isLockedLocal = false;
          if (found) {
            const attempts = found.attempts || 0;
            const status = found.status || 'pending';
            if (status === 'locked') {
              text = window.i18n?.t('accountLockedFull') || 'Account locked.';
              isLockedLocal = true;
            } else if (attempts > 0) {
              text = window.i18n.t ? window.i18n.t('failedAttemptsNotice', { n: attempts, plural: attempts > 1 ? 's' : '' }) : (attempts + '/5 failed login attempts. After 5 attempts the account will be locked.');
            }
          }
          if (notice) {
            notice.textContent = text;
            // manage unlock button for local fallback
            let localBtn = document.getElementById('unlock-request-btn');
            if (isLockedLocal) {
              if (!localBtn) {
                localBtn = document.createElement('button');
                localBtn.id = 'unlock-request-btn';
                localBtn.style.marginLeft = '8px';
                localBtn.style.padding = '4px 8px';
                localBtn.style.borderRadius = '4px';
                localBtn.style.border = '1px solid #ccc';
                localBtn.style.cursor = 'pointer';
                localBtn.addEventListener('click', async () => {
                  await Auth.requestUnlock(email);
                  localBtn.disabled = true;
                  localBtn.textContent = window.i18n?.t('unlockRequestBtn') || 'Unlock Request';
                });
                notice.appendChild(localBtn);
              }
              localBtn.textContent = window.i18n?.t('unlockRequestBtn') || 'Unlock Request';
            } else if (localBtn) {
              localBtn.remove();
            }
          }
        }
      } catch (e) {
        console.warn('Fallback local updateFailedAttemptNotice failed:', e);
      }
    }
  },

  /**
   * User-initiated unlock request: creates a supportRequests entry for master and an adminAction
   */
  async requestUnlock(email) {
    try {
      if (!email) return alert('Please enter your email');
      const db = AppState.db;
      if (!db) {
        // localStorage fallback: mark or create a local security incident and flag unlock request
        try {
          const list = JSON.parse(localStorage.getItem('local_security_incidents') || '[]');
          const idx = list.findIndex((i) => (i.email || '').toLowerCase() === (email || '').toLowerCase());
          if (idx >= 0) {
            list[idx].unlockRequested = true;
            list[idx].updatedAt = new Date().toISOString();
          } else {
            list.push({
              email,
              attempts: 0,
              message: window.i18n?.t ? window.i18n.t('unlockRequestMessage', { email }) : `Unlock request submitted by user (${email}).`,
              status: 'pending',
              type: 'client',
              unlockRequested: true,
              createdAt: new Date().toISOString()
            });
          }
          localStorage.setItem('local_security_incidents', JSON.stringify(list));
          alert('Unlock request submitted (local). The master will see this in the local support list.');
          this.updateFailedAttemptNotice(email);
          return;
        } catch (e) {
          console.error('local unlock request error:', e);
          return alert('Failed to submit unlock request locally: ' + e.message);
        }
      }

      const snap = await db.collection('users').where('email', '==', email).limit(1).get();
      if (snap.empty) return alert('No account found with that email');
      const doc = snap.docs[0];
      const clientId = doc.id;

      await db.collection('users').doc(clientId).collection('supportRequests').add({
        category: 'security',
        message: window.i18n?.t ? window.i18n.t('unlockRequestMessage', { email }) : `Unlock request submitted by user (${email}). Please review and unlock if appropriate.`,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        type: 'client'
      });

      await db.collection('users').doc(clientId).collection('adminActions').add({
        action: 'unlockRequest',
        status: 'pending',
        initiatedBy: email,
        initiatedByUid: AppState.currentUser?.uid || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      alert('Unlock request submitted. The master account will be notified.');
      // refresh notice to show pending state
      this.updateFailedAttemptNotice(email);
    } catch (err) {
      console.error('requestUnlock error:', err);
      alert('Failed to submit unlock request: ' + err.message);
    }
  },
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

      // Check user document to enforce account lock and track failed attempts
      const db = AppState.db;
      let userDoc = null;
      let dbPermissionIssue = false;
      try {
        if (db) {
          const snap = await db.collection('users').where('email', '==', email).limit(1).get();
          if (!snap.empty) userDoc = snap.docs[0];
        }
      } catch (e) {
        console.warn('Could not read user document before sign-in:', e);
        if (e && (e.code === 'permission-denied' || /insufficient permissions/i.test(String(e.message || '')))) {
          dbPermissionIssue = true;
        }
      }

      // If user doc exists and is locked (or reached 5 attempts), block sign-in immediately
      try {
        if (userDoc) {
          const ud = userDoc.data();
          const status = ud.status || 'active';
          const attempts = ud.failedAttempts || 0;
          if (status === 'locked' || attempts >= 5) {
            UI.showMessage('login-msg', 'This account is locked. Please contact the master to unlock it.', 'error');
            // expose a 'Send request to master' button so the user can notify master directly
            const msgEl = document.getElementById('login-msg');
            if (msgEl) {
              let btn = document.getElementById('send-master-request-btn');
              if (!btn) {
                btn = document.createElement('button');
                btn.id = 'send-master-request-btn';
                btn.textContent = 'Send request to master';
                btn.style.marginLeft = '8px';
                btn.style.padding = '6px 10px';
                btn.style.borderRadius = '4px';
                btn.style.cursor = 'pointer';
                btn.addEventListener('click', async () => {
                  await Auth.requestUnlock(email);
                  // give feedback and remove the button
                  btn.disabled = true;
                  btn.textContent = 'Request sent';
                });
                msgEl.appendChild(btn);
              }
            }
            this.updateFailedAttemptNotice(email);
            return;
          }
        }
      } catch (e) {
        console.warn('Error checking userDoc lock state before sign-in:', e);
      }

      // If we detected a DB permission issue, check localStorage for locked status and show attempts.
      // Do NOT block the sign-in attempt based on localStorage alone — show a warning but allow the user
      // to try logging in (this lets a master unlock via server/Admin SDK and the client then succeed).
      if (dbPermissionIssue || !db) {
        try {
          const list = JSON.parse(localStorage.getItem('local_security_incidents') || '[]');
          const found = list.find((i) => (i.email || '').toLowerCase() === (email || '').toLowerCase());
          if (found && (found.status === 'locked' || (found.attempts || 0) >= 5)) {
            // show a warning but don't prevent sign-in attempts
            UI.showMessage('login-msg', 'This device shows the account as locked locally. You may still try to sign in — if the master has unlocked the account on the server your sign-in will succeed.', 'warning');
            this.updateFailedAttemptNotice(email);
            // NOTE: intentionally not returning here so the sign-in attempt proceeds
          }
        } catch (e) {
          console.warn('Error checking local lock status before sign-in:', e);
        }
      }

      await AppState.auth.signInWithEmailAndPassword(email, password);

      // On successful login, reset failedAttempts and update lastActive
      try {
        if (userDoc && db) {
          await db.collection('users').doc(userDoc.id).update({
            failedAttempts: 0,
            lastActive: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
        // Clear any local_security_incidents for this email on successful login so stale local locks don't persist
        try {
          const key = 'local_security_incidents';
          const list = JSON.parse(localStorage.getItem(key) || '[]');
          const filtered = list.filter((i) => (i.email || '').toLowerCase() !== (email || '').toLowerCase());
          if (filtered.length !== list.length) {
            localStorage.setItem(key, JSON.stringify(filtered));
            // refresh inline notice
            this.updateFailedAttemptNotice(email);
          }
        } catch (e) {
          // non-fatal
          console.debug('Failed to clear local_security_incidents after successful login:', e);
        }
      } catch (e) {
        console.warn('Failed to reset failedAttempts after successful login:', e);
      }

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
      
      // If sign-in failed, increment attempts. Prefer Firestore but if permission errors occur, fallback to localStorage.
      try {
        const db = AppState.db;
        let usedLocalFallback = false;

        if (db) {
          try {
            const snap = await db.collection('users').where('email', '==', email).limit(1).get();
            if (!snap.empty) {
              const doc = snap.docs[0];
              const data = doc.data();
              const next = (data.failedAttempts || 0) + 1;
              const updates = { failedAttempts: next };
              let createdIncident = false;
              if (next >= 5) {
                updates.status = 'locked';
                updates.lockedAt = firebase.firestore.FieldValue.serverTimestamp();
                createdIncident = true;
              }
              await db.collection('users').doc(doc.id).update(updates);

              // If account just locked, also create an adminAction so backend can deactivate the Firebase Auth user
              if (createdIncident) {
                try {
                  await db.collection('users').doc(doc.id).collection('adminActions').add({
                    action: 'deactivate',
                    status: 'pending',
                    initiatedBy: 'system',
                    initiatedByUid: 'system',
                    reason: 'locked-after-failed-logins',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                  });
                } catch (aaErr) {
                  console.warn('Failed to create adminAction to deactivate account:', aaErr);
                }
              }

              // Create or update user's supportRequests (best-effort)
              try {
                const reqCol = db.collection('users').doc(doc.id).collection('supportRequests');
                const latestSnap = await reqCol.orderBy('createdAt', 'desc').limit(1).get();
                const message = next >= 5
                  ? `Account locked after ${next} failed login attempts.`
                  : `${next}/5 failed login attempts. After 5 attempts the account will be locked.`;

                if (!latestSnap.empty) {
                  const latest = latestSnap.docs[0];
                  const ld = latest.data();
                  if (ld && ld.category === 'security' && ld.type === 'system' && (!ld.resolvedAt || ld.status === 'pending')) {
                    await reqCol.doc(latest.id).update({
                      message,
                      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                      status: 'pending'
                    });
                  } else {
                    await reqCol.add({
                      category: 'security',
                      message,
                      status: 'pending',
                      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                      type: 'system'
                    });
                  }
                } else {
                  await reqCol.add({
                    category: 'security',
                    message,
                    status: 'pending',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    type: 'system'
                  });
                }
              } catch (e2) {
                console.warn('Failed to create/update security incident:', e2);
              }
            } else {
              // No users doc — update top-level securityIncidents
              try {
                const secCol = db.collection('securityIncidents');
                const secSnap = await secCol.where('email', '==', email).limit(1).get();
                if (!secSnap.empty) {
                  const sdoc = secSnap.docs[0];
                  const sdata = sdoc.data();
                  const next = (sdata.attempts || 0) + 1;
                  const message = next >= 5 ? `Account locked after ${next} failed login attempts.` : `${next}/5 failed login attempts. After 5 attempts the account will be locked.`;
                  const updates = {
                    attempts: next,
                    message,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                  };
                  if (next >= 5) updates.status = 'locked';
                  await secCol.doc(sdoc.id).update(updates);
                } else {
                  const initial = 1;
                  const message = `${initial}/5 failed login attempts. After 5 attempts the account will be locked.`;
                  await secCol.add({
                    email,
                    attempts: initial,
                    message,
                    status: 'pending',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    type: 'anon'
                  });
                }
              } catch (secErr) {
                // If permission error, fall back to local storage below
                console.warn('Failed to update top-level securityIncidents for unknown user:', secErr);
                if (this.isPermissionError(secErr)) usedLocalFallback = true;
              }
            }
          } catch (eDb) {
            console.warn('Firestore error when updating failedAttempts:', eDb);
            if (this.isPermissionError(eDb)) usedLocalFallback = true;
          }
        } else {
          usedLocalFallback = true;
        }

        if (usedLocalFallback) {
          try {
            const key = 'local_security_incidents';
            const list = JSON.parse(localStorage.getItem(key) || '[]');
            const idx = list.findIndex((i) => (i.email || '').toLowerCase() === (email || '').toLowerCase());
            if (idx >= 0) {
              list[idx].attempts = (list[idx].attempts || 0) + 1;
              list[idx].updatedAt = new Date().toISOString();
              // ensure category/type and clientId are set for master UI
              list[idx].category = list[idx].category || 'security';
              list[idx].type = list[idx].type || 'local';
              list[idx].clientId = list[idx].clientId || null;
              if (list[idx].attempts >= 5) {
                list[idx].status = 'locked';
                list[idx].message = 'Account locked after ' + list[idx].attempts + ' failed login attempts.';
                // show immediate lock confirmation to the user
                alert('Your account has been locked after multiple failed login attempts. Please contact support or the master account to unlock it.');
              } else {
                list[idx].message = (list[idx].attempts || 0) + '/5 failed login attempts. After 5 attempts the account will be locked.';
              }
            } else {
              const initial = 1;
              list.push({
                id: 'local-' + Math.random().toString(36).slice(2, 9),
                email: email,
                attempts: initial,
                status: initial >= 5 ? 'locked' : 'pending',
                message: initial + '/5 failed login attempts. After 5 attempts the account will be locked.',
                category: 'security',
                type: 'local',
                clientId: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
              if (initial >= 5) alert('Your account has been locked after multiple failed login attempts. Please contact support or the master account to unlock it.');
            }
            localStorage.setItem(key, JSON.stringify(list));
            // refresh the inline notice under the email field
            this.updateFailedAttemptNotice(email);
          } catch (e3) {
            console.warn('localStorage error updating failedAttempts:', e3);
          }
        }
      } catch (e3) {
        console.warn('Error updating failedAttempts after failed login:', e3);
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
  },

  // Developer helper: seed a local_security_incidents entry for testing the UI without Firestore
  seedLocalIncident: function(email, attempts) {
    try {
      attempts = Number.isFinite(Number(attempts)) ? Number(attempts) : 1;
      if (!email) throw new Error('email required');
      const key = 'local_security_incidents';
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      const idx = list.findIndex((i) => (i.email || '').toLowerCase() === (email || '').toLowerCase());
      const now = new Date().toISOString();
      if (idx >= 0) {
        list[idx].attempts = attempts;
        list[idx].status = attempts >= 5 ? 'locked' : 'pending';
        list[idx].message = attempts >= 5 ? 'Account locked after ' + attempts + ' failed login attempts.' : attempts + '/5 failed login attempts.';
        list[idx].updatedAt = now;
      } else {
        list.push({
          id: 'local-' + Math.random().toString(36).slice(2, 9),
          email: email,
          attempts: attempts,
          status: attempts >= 5 ? 'locked' : 'pending',
          message: attempts >= 5 ? 'Account locked after ' + attempts + ' failed login attempts.' : attempts + '/5 failed login attempts.',
          createdAt: now,
          updatedAt: now
        });
      }
      localStorage.setItem(key, JSON.stringify(list));
      this.updateFailedAttemptNotice(email);
      return true;
    } catch (e) {
      console.warn('seedLocalIncident error', e);
      return false;
    }
  },
};

// Export to global scope
window.Auth = Auth;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Auth.init());
} else {
  Auth.init();
}
