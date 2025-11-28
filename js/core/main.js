// js/core/main.js

// AppState is now initialized in state.js — just use it

/**
 * Helper function to check if a role is an admin/master role.
 * In this application, 'admin' and 'master' are equivalent - both have
 * the same permissions and see the same navbar (Template Creation,
 * Client Management, Support Responses, Logout).
 * 
 * @param {string} role - The user role to check
 * @returns {boolean} - True if the role is admin or master
 */
function isAdminRole(role) {
  return role === 'admin' || role === 'master';
}

// Export to global scope for use in other modules
window.isAdminRole = isAdminRole;

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[main.js] DOM loaded, initializing app...');
  try {
    // Guard EmailJS initialization - only if config is available
    if (typeof emailjs !== 'undefined' && 
        window.AppConfig && 
        window.AppConfig.emailjs && 
        window.AppConfig.emailjs.publicKey) {
      emailjs.init(window.AppConfig.emailjs.publicKey);
      console.log('[main.js] EmailJS initialized');
    } else {
      console.warn('[main.js] EmailJS SDK or config not available, skipping initialization');
    }

    // Hide main app by default until auth state is verified
    const mainApp = document.getElementById('main-app');
    if (mainApp) {
      mainApp.style.display = 'none';
    }

    // Guard AppState.auth usage
    if (!window.AppState || !window.AppState.auth) {
      console.error('[main.js] AppState.auth not available. Firebase may not be initialized.');
      UI.showAuth();
      UI.showLogin();
      return;
    }

    // Now safe to use AppState.auth
    window.AppState.auth.onAuthStateChanged(async (user) => {
      console.log('[main.js] onAuthStateChanged fired, user:', user ? user.email : 'null');
      console.log('[AUTH STATE] User exists:', !!user);
      console.log('[AUTH STATE] User email:', user?.email);
      console.log('[AUTH STATE] User UID:', user?.uid);
      
      if (user) {
        console.log('[main.js] User signed in:', user.email);
        window.AppState.currentUser = user;

        try {
          let userData = null;
          
          // Guard db usage
          if (!window.AppState.db) {
            console.error('[main.js] AppState.db not available');
            UI.showAuth();
            UI.showLogin();
            return;
          }
          
          const doc = await window.AppState.db.collection('users').doc(user.uid).get();
          console.log('[AUTH STATE] Firestore doc exists:', doc.exists);
          
          if (!doc.exists) {
            // 新用户，创建初始文档
            console.log('[AUTH STATE] New user - creating initial document');
            try {
              const newUserData = {
                email: user.email,
                role: 'client',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                questionnaireCompleted: false,
                credits: 20
              };
              await window.AppState.db.collection('users').doc(user.uid).set(newUserData);
              console.log('[AUTH STATE] ✓ Initial user document created');
              userData = newUserData;
              // 设置标记，新用户需要setup
              window.AppState.clientNeedsSetup = true;
            } catch (createErr) {
              console.error('[AUTH STATE] Error creating user document:', createErr);
              userData = {
                role: 'client',
                questionnaireCompleted: false
              };
              window.AppState.clientNeedsSetup = true;
            }
          } else {
            userData = doc.data();
            console.log('[AUTH STATE] User data from Firestore:', userData);
            
            // 关键修复：如果role字段不存在或为空，强制更新为'client'
            if (!userData.role) {
              console.warn('[AUTH STATE] ⚠️  User document missing role field. Auto-fixing...');
              await window.AppState.db.collection('users').doc(user.uid).update({
                role: 'client'
              });
              userData.role = 'client';
              console.log('[AUTH STATE] ✓ Role field auto-fixed');
            }
            
            // 确保email字段存在
            if (!userData.email) {
              console.warn('[AUTH STATE] ⚠️  User document missing email field. Auto-fixing...');
              await window.AppState.db.collection('users').doc(user.uid).update({
                email: user.email
              });
              userData.email = user.email;
              console.log('[AUTH STATE] ✓ Email field auto-fixed');
            }
          }
          
          // Now process userData for both new and existing users
          if (userData) {
            let userRole = userData.role || 'client';
            console.log('[AUTH STATE] Final user role from Firestore:', userRole, 'Email:', userData.email);
            
            // Check if this user's email is configured as an admin via AdminConfig
            // This allows configuring admins without modifying Firestore
            // Use a different variable name to avoid redeclaration
            const computedUserEmail = user.email || userData.email || '';
            if (window.AdminConfig && typeof window.AdminConfig.isAdminByEmail === 'function') {
              const isConfiguredAdmin = window.AdminConfig.isAdminByEmail(computedUserEmail);
              // Only upgrade client users to admin - don't downgrade master or admin users
              if (isConfiguredAdmin && userRole === 'client') {
                console.log('[AUTH STATE] ✓ User email is in admin config list, upgrading role to admin');
                userRole = 'admin';
              }
            }
            
            window.AppState.userRole = userRole;
            // Store admin flag for easy checking throughout the app
            // Note: 'admin' and 'master' are equivalent roles in this application
            window.AppState.isAdmin = isAdminRole(userRole);
            console.log('[AUTH STATE] Final computed role:', userRole, 'isAdmin:', window.AppState.isAdmin);
            
            // Admin users (admin/master) don't need setup redirect
            if (isAdminRole(window.AppState.userRole)) {
              console.log('[DEBUG] User is admin (admin/master role), skipping setup checks');
            } else if (window.AppState.userRole === 'client') {
              // 检查用户是否需要完成问卷（只有 client 账户需要）
              console.log('[DEBUG] Checking if client needs setup...');
              try {
                // 更精确的setup状态判断
                // 对client账户，需要检查：
                // 1. questionnaireCompleted 必须为true
                // 2. 基本信息完整（companyName, contactName, phone, industry）
                // 3. 产品名称不为空
                
                const questionnaireCompleted = !!(userData?.questionnaireCompleted === true);
                
                const hasBasicInfo = !!(
                  userData?.companyName?.trim() && 
                  userData?.contactName?.trim() && 
                  userData?.phone?.trim() && 
                  userData?.industry?.trim()
                );
                
                const hasProduct = !!(userData?.productName?.trim());
                
                // 只有当这三个条件都满足时，才认为client的setup已完成
                const setupComplete = questionnaireCompleted && hasBasicInfo && hasProduct;
                
                console.log('[CLIENT SETUP CHECK]', {
                  questionnaireCompleted,
                  hasBasicInfo,
                  hasProduct,
                  setupComplete,
                  productName: userData?.productName,
                  companyName: userData?.companyName
                });

                if (setupComplete) {
                  console.log('[SETUP COMPLETE] ✓ Client account is fully setup');
                  window.AppState.clientNeedsSetup = false;
                } else {
                  console.log('[SETUP INCOMPLETE] ✗ Client account needs to complete setup', {
                    missing: {
                      questionnaireNotComplete: !questionnaireCompleted,
                      noBasicInfo: !hasBasicInfo,
                      noProduct: !hasProduct
                    }
                  });
                  window.AppState.clientNeedsSetup = true;
                }
              } catch (e) {
                console.warn('Error while evaluating setup status:', e);
              }
            }
            
            console.log('User data loaded:', {
              productName: userData.productName,
              role: userData.role
            });

            window.AppState.userProductName = userData.productName || '';
            window.AppState.userTemplates = userData.template ? [userData.template] : [];
            window.AppState.userSpecs = userData.specifications || {};
            window.AppState.feedbackVector = userData.feedbackVector || null;
            window.AppState.badSelections = userData.badSelections || 0;

            console.log('Deciding whether to show main app or redirect to setup...');

            // If the client account is not fully setup, force them to complete the
            // initial questionnaire/setup before they can use the app.
            // Exception: Admin users (AppState.isAdmin already includes config check) bypass setup
            if (window.AppState.clientNeedsSetup && !window.AppState.isAdmin) {
              const currentEmail = (window.AppState.currentUser && window.AppState.currentUser.email) || user.email || '';
              console.log('[SETUP REDIRECT] Client needs to complete setup, redirecting to setup.html for', currentEmail);
              // Use replace so the back button doesn't easily navigate back to the app without completing setup
              window.location.replace('setup.html');
              return; // Stop further initialization for now
            }

            // Setup is complete — show the main app UI
            console.log('Showing main app...');
            UI.showMainApp();
            
            // Determine admin status using AdminConfig (email-based) or role-based
            // Note: 'admin' and 'master' are equivalent roles
            const emailForAdminCheck = userData.email || user.email || '';
            const isAdmin = (window.AdminConfig && window.AdminConfig.isAdminByEmail(emailForAdminCheck, userData)) ||
                           isAdminRole(window.AppState.userRole);
            window.AppState.isAdmin = isAdmin;
            console.log('[AUTH STATE] isAdmin:', isAdmin, 'for email:', emailForAdminCheck);
            
            // Toggle navbar based on role - toggleMasterUI handles all navigation visibility
            // based on AppState.userRole and AppState.isAdmin
            // For admin roles (admin/master are equivalent): show admin links (Template Creation, Client Management, Support Responses)
            // For client role: show only client links
            UI.toggleMasterUI(isAdminRole(window.AppState.userRole));
            
            // Also use Navbar component for role-based navigation if available
            // This provides an additional layer of role-based nav management
            if (window.Navbar && typeof window.Navbar.updateVisibility === 'function') {
              window.Navbar.updateVisibility(window.AppState.userRole);
            }

            // Safety net: For admin roles (admin/master), explicitly hide client-only nav elements
            // This prevents mixed nav states caused by multiple renderers running in different orders
            // Note: 'admin' and 'master' are equivalent roles - both see the same navbar
            if (isAdminRole(window.AppState.userRole)) {
              console.log('[main.js] Admin role detected (admin/master are equivalent) - applying navbar safety net');
              
              // Client-only nav elements that should be hidden for admin users
              var clientOnlyLinks = ['client-templates-link', 'client-account-link', 'client-records-link', 'create-account-link'];
              clientOnlyLinks.forEach(function(id) {
                var el = document.getElementById(id);
                if (el) {
                  el.style.display = 'none';
                  el.classList.add('hidden');
                  console.log('[main.js] Hid client-only nav element:', id);
                }
              });
              
              // Admin nav elements that should be visible (Template Creation, Client Management, Support Responses, Logout)
              var adminLinks = ['master-template-link', 'master-nav-link', 'master-support-link', 'logout-btn'];
              adminLinks.forEach(function(id) {
                var el = document.getElementById(id);
                if (el) {
                  el.style.display = 'inline-block';
                  el.classList.remove('hidden');
                  console.log('[main.js] Showed admin nav element:', id);
                }
              });
              
              console.log('[main.js] Navbar safety net applied for admin role');
            }

            window.currentUserData = userData;
            
            // Use HomeRedirect to navigate to role-appropriate default page
            // master -> template-creation-page, client/admin -> template-page
            if (window.HomeRedirect && typeof window.HomeRedirect.redirect === 'function') {
              console.log('[main.js] Using HomeRedirect for role-based page navigation');
              await window.HomeRedirect.redirect();
            } else {
              // Fallback to existing behavior - consider role when determining default page
              // Use getDefaultPageForRole if available, otherwise use role-based logic
              var defaultPage = 'template-page';
              if (window.getDefaultPageForRole) {
                defaultPage = window.getDefaultPageForRole(window.AppState.userRole) || 'template-page';
              } else if (isAdminRole(window.AppState.userRole)) {
                // Admin users (admin/master) go to template-creation-page
                defaultPage = 'template-creation-page';
              }
              console.log('[main.js] Fallback: Showing', defaultPage, 'for role:', window.AppState.userRole);
              showPage(defaultPage);
            }
            // Use role-based redirect to show the appropriate homepage
            // Admin users (admin/master) go to Template Creation, Client users go to Templates
            console.log('Redirecting to role-based homepage...');
            if (UI.redirectToRoleHomepage) {
              UI.redirectToRoleHomepage(window.AppState.userRole);
            } else {
              // Fallback if redirectToRoleHomepage is not available
              showPage('template-page');
            }
          }
        } catch (err) {
          console.error('Error loading user data:', err);
          UI.showMessage('template-status', 'Error loading user data: ' + err.message, 'error');
        }
      } else {
        console.log('User signed out');
        window.AppState.currentUser = null;
        window.AppState.userRole = null;
        window.AppState.isAdmin = false;
        window.AppState.userProductName = null;
        window.AppState.generationCount = 0;
        window.AppState.feedbackVector = null;
        window.AppState.badSelections = 0;
        
        // Clear cached role from AuthUtils on logout
        if (window.AuthUtils && typeof window.AuthUtils.clearCachedRole === 'function') {
          window.AuthUtils.clearCachedRole();
        }
        
        UI.showAuth();
        UI.showLogin();
      }
    });

    setupEventListeners();
    console.log('[main.js] App initialization complete');
  } catch (err) {
    console.error('[main.js] Initialization error:', err);
    alert('Failed to initialize app: ' + err.message);
  }
});

function setupEventListeners() {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      Auth.login();
    });
  }

  const switchToRegister = document.getElementById('switch-to-register');
  if (switchToRegister) {
    switchToRegister.addEventListener('click', (e) => {
      e.preventDefault();
      UI.showRegister();
    });
  }

  const switchToLogin = document.getElementById('switch-to-login');
  if (switchToLogin) {
    switchToLogin.addEventListener('click', (e) => {
      e.preventDefault();
      UI.showLogin();
    });
  }

  const sendCodeBtn = document.getElementById('send-code-btn');
  if (sendCodeBtn) {
    sendCodeBtn.addEventListener('click', () => Registration.sendVerificationCode());
  }

  const verifyCodeBtn = document.getElementById('verify-code-btn');
  if (verifyCodeBtn) {
    verifyCodeBtn.addEventListener('click', () => Registration.verifyCode());
  }

  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      Registration.completeRegistration();
    });
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => Auth.logout());
  }

  const forgotPasswordLink = document.getElementById('forgot-password');
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      Auth.resetPassword();
    });
  }

  const editAccountBtn = document.getElementById('edit-account-btn');
  if (editAccountBtn) {
    editAccountBtn.addEventListener('click', () => Profile.showEditAccount());
  }

  const accountForm = document.getElementById('account-form');
  if (accountForm) {
    accountForm.addEventListener('submit', (e) => {
      e.preventDefault();
      Profile.updateAccount();
    });
  }

  const cancelEditBtn = document.getElementById('cancel-edit');
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => Profile.cancelEdit());
  }

  const generateBtn = document.getElementById('generate-images-btn');
  if (generateBtn) {
    generateBtn.addEventListener('click', () => {
      if (window.TemplateManager && typeof TemplateManager.generateImages === 'function') {
        TemplateManager.generateImages(null);
      } else {
        console.error('TemplateManager.generateImages is not available');
        if (window.UI && typeof UI.showMessage === 'function') {
          UI.showMessage('template-status', 'Internal error: generator not initialised.', 'error');
        }
      }
    });
  }

  const createCodeBtn = document.getElementById('create-code-btn');
  if (createCodeBtn) {
    createCodeBtn.addEventListener('click', () => IndustryCodeManager.createIndustryCode());
  }

  const addSpecBtn = document.getElementById('add-spec-btn');
  if (addSpecBtn) {
    addSpecBtn.addEventListener('click', () => IndustryCodeManager.addSpecification());
  }

  const createAccountForm = document.getElementById('create-account-form');
  if (createAccountForm) {
    createAccountForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (window.IndustryCodeManager && typeof window.IndustryCodeManager.createIndustryCode === 'function') {
        window.IndustryCodeManager.createIndustryCode();
      }
    });
  }

  const resetSpecsBtn = document.getElementById('reset-specs');
  if (resetSpecsBtn) {
    resetSpecsBtn.addEventListener('click', () => {
      document.getElementById('create-account-form')?.reset();
      document.getElementById('spec-container').innerHTML = `
        <div class="spec-group" data-spec-id="1">
          <div class="form-group">
            <label for="spec-1-type" data-i18n-dynamic="specificationLabel" data-spec-n="1">Specification 1*</label>
            <select id="spec-1-type" required>
              <option value="">Select specification</option>
              <option value="size">Size</option>
              <option value="colorScheme">Color Scheme</option>
              <option value="style">Style</option>
              <option value="tone">Tone</option>
              <option value="dimensions">Dimensions</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="form-group hidden" id="spec-1-custom-group">
            <label for="spec-1-custom-name" data-i18n="customSpecName">Custom Specification Name</label>
            <input id="spec-1-custom-name" type="text"
                   data-i18n-ph="customSpecPlaceholder" placeholder="Enter specification name (e.g., Font)">
          </div>
          <div class="value-group" id="spec-1-values">
            <div class="form-group">
              <label for="spec-1-value-1">Value 1</label>
              <input id="spec-1-value-1" type="text" required placeholder="Enter value (e.g., 1:1)">
            </div>
          </div>
          <button type="button" class="btn btn-add-value" onclick="addValue(1)">Add Value</button>
        </div>
      `;
      UI.hideElement('generated-code');
      if (window.IndustryCodeManager) {
        window.IndustryCodeManager.specCount = 1;
      }
    });
  }

  const copyCodeBtn = document.getElementById('copy-code-btn');
  if (copyCodeBtn) {
    copyCodeBtn.addEventListener('click', () => IndustryCodeManager.copyCode());
  }

  console.log('Event listeners setup complete');
}

function showPage(pageId) {
  console.log('showPage called with:', pageId);
  
  // Check page access control using NavConfig if available
  if (window.UI && typeof window.UI.canAccessPage === 'function') {
    const userRole = window.AppState && window.AppState.userRole;
    if (!window.UI.canAccessPage(pageId, userRole)) {
      console.warn('[showPage] Access denied to page:', pageId, 'for role:', userRole);
      // Redirect to role-appropriate homepage instead
      if (window.UI.redirectToRoleHomepage) {
        window.UI.showMessage('template-status', 'Access denied: You do not have permission to access this page.', 'error');
        window.UI.redirectToRoleHomepage(userRole);
        return;
      }
      // Fallback: show template-page
      pageId = 'template-page';
    }
  }
  
  // Hide all pages
  const pages = ['account-page', 'template-page', 'records-page', 'create-account-page', 'client-management-section', 'payment-page', 'support-response-page', 'template-creation-page'];
  pages.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('hidden');
      el.style.display = 'none';
      console.log(`Hidden ${id}`);
    }
  });

  const targetSection = document.getElementById(pageId);
  if (targetSection) {
    targetSection.classList.remove('hidden');
    // Use !important to override .hidden CSS rule
    targetSection.style.setProperty('display', 'block', 'important');
    console.log(`Showing ${pageId}`);
    
    // Load data when page is shown
    switch(pageId) {
      case 'account-page':
        if (window.Profile && typeof window.Profile.loadAccountInfo === 'function') {
          window.Profile.loadAccountInfo();
        }
        break;
      // support-records-page is intentionally not part of the main page navigation
      // It is shown only via Account page controls (Profile.openSupportRecords)
      case 'records-page':
        if (window.RecordManager && typeof window.RecordManager.loadRecords === 'function') {
          window.RecordManager.loadRecords();
        }
        break;
      case 'template-page':
        if (window.TemplateManager && typeof window.TemplateManager.loadTemplates === 'function') {
          window.TemplateManager.loadTemplates();
        }
        break;
      case 'create-account-page':
        // Page is static, no special loading needed
        if (window.initializeCreateAccountHandlers && typeof window.initializeCreateAccountHandlers === 'function') {
          window.initializeCreateAccountHandlers();
        }
        break;
      case 'client-management-section':
        if (window.ClientManagement && typeof window.ClientManagement.init === 'function') {
          window.ClientManagement.init();
        }
        break;
      case 'support-response-page':
        if (window.SupportResponse && typeof window.SupportResponse.init === 'function') {
          window.SupportResponse.init();
        }
        break;
      case 'template-creation-page':
        if (window.TemplateCreation && typeof window.TemplateCreation.init === 'function') {
          window.TemplateCreation.init();
        }
        break;
    }
  } else {
    console.error(`Section ${pageId} not found`);
  }
}
window.showPage = showPage;

window.addValue = function (specId) {
  IndustryCodeManager.addValue(specId);
};
window.removeSpecification = function (specId) {
  IndustryCodeManager.removeSpecification(specId);
};

window.handleLogout = async function () {
  try {
    await AppState.auth.signOut();
    location.reload();
  } catch (e) {
    console.error('Logout failed', e);
    alert('Logout failed. Please try again.');
  }
};

function showAuthView(target) {
  const groups = {
    login: ['login-panel', 'login-section', 'auth-login', 'login-form-container', 'login-card'],
    register: ['register-panel', 'register-section', 'auth-register', 'register-form-container', 'register-card']
  };

  [...groups.login, ...groups.register].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  const toShow = groups[target] || [];
  let shown = false;
  toShow.forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'block'; shown = true; }
  });

  if (!shown) {
    document.querySelectorAll('.auth-login').forEach(el => el.style.display = (target === 'login' ? 'block' : 'none'));
    document.querySelectorAll('.auth-register').forEach(el => el.style.display = (target === 'register' ? 'block' : 'none'));
  }
}

window.showLogin = function () {
  showAuthView('login');
};
window.showRegister = function () {
  showAuthView('register');
};

window.resetPassword = async function () {
  try {
    if (window.Auth && typeof window.Auth.resetPassword === 'function') {
      await window.Auth.resetPassword();
      return;
    }
    const email = (document.getElementById('login-email')?.value || '').trim() ||
      prompt('Enter your email to receive a password reset link:') || '';
    if (!email) return;
    await AppState.auth.sendPasswordResetEmail(email);
    alert('Password reset email sent.');
  } catch (e) {
    console.error('resetPassword error', e);
    alert('Failed to send reset email. Please try again.');
  }
};