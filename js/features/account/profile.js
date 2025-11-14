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
      const creditSection = document.getElementById('credit-section');
      const isMaster = AppState.userRole === 'master' || AppState.userRole === 'admin';
      
      if (accountInfo) {
        let userInfoHtml = `
          <div class="user-info-section" style="padding: 12px;">
            <h3 data-i18n="userInformation" style="margin: 0 0 12px 0; color: #0052b3; font-size: 16px; font-weight: 700;">${window.i18n?.t('userInformation') || 'User Information'}</h3>
            <p style="margin: 8px 0;"><strong data-i18n="name">${window.i18n?.t('name') || 'Name'}</strong>: <span id="display-name">${data.name || window.i18n?.t('notSet') || 'Not set'}</span></p>
            <p style="margin: 8px 0;"><strong data-i18n="emailLabel">${window.i18n?.t('emailLabel') || 'Email'}</strong>: ${AppState.currentUser.email}</p>
            <p style="margin: 8px 0;"><strong data-i18n="industry">${window.i18n?.t('industry') || 'Industry'}</strong>: ${data.industryName || window.i18n?.t('notSpecified2') || 'Not specified'} (${window.i18n?.t('codeColon') || 'Code'}: ${data.industryCode || 'N/A'})</p>
            <p style="margin: 8px 0;"><strong data-i18n="template">${window.i18n?.t('template') || 'Template'}</strong>: ${data.template || window.i18n?.t('noneValue') || 'None'}</p>
            <p style="margin: 8px 0;"><strong data-i18n="productName">${window.i18n?.t('productName') || 'Product Name'}</strong>: <span id="display-product">${data.productName || window.i18n?.t('notSet') || 'Not set'}</span></p>
            <p style="margin: 8px 0;"><strong data-i18n="role">${window.i18n?.t('role') || 'Role'}</strong>: ${AppState.userRole || window.i18n?.t('client') || 'client'}</p>
            <button id="edit-account-btn" class="btn" data-i18n="editProfile" style="margin-top: 12px; padding: 8px 14px; font-size: 13px; font-weight: 600;">Edit Profile</button>
          </div>
        `;

        let html = userInfoHtml;

        // Helper function to get translated label
        const getLabel = (key) => {
          const labels = {
            en: {
              basicInfo: 'Basic Information',
              companyName: 'Company Name',
              contactPerson: 'Contact Person',
              phone: 'Phone',
              industry: 'Industry',
              brandInfo: 'Brand Information',
              companyIntro: 'Company Intro',
              branches: 'Branches',
              awards: 'Awards',
              productTypes: 'Product Types',
              focusTypes: 'Focus Types',
              advantages: 'Advantages',
              targetAudience: 'Target Audience',
              threshold: 'Entry Threshold',
              copyTheme: 'Copy Theme',
              copyAdjectivesBrand: 'Copy Adjectives',
              brandNotes: 'Brand Notes',
              productInfo: 'Product Information',
              productName: 'Product Name',
              productCategory: 'Product Category',
              productFeatures: 'Product Features',
              solves: 'Problem Solved',
              productAdvantage: 'Product Advantage',
              price: 'Price',
              offer: 'Offer',
              copyAdjectivesProduct: 'Copy Adjectives',
              contraindications: 'Contraindications',
              productNotes: 'Product Notes'
            },
            yue: {
              basicInfo: '基本信息',
              companyName: '公司名稱',
              contactPerson: '聯絡人',
              phone: '電話',
              industry: '行業',
              brandInfo: '品牌信息',
              companyIntro: '公司簡介',
              branches: '分支機構',
              awards: '獲得獎項',
              productTypes: '產品類型',
              focusTypes: '專注類型',
              advantages: '主要優勢',
              targetAudience: '目標客群',
              threshold: '進入門檻',
              copyTheme: '文案主題',
              copyAdjectivesBrand: '文案形容詞',
              brandNotes: '品牌備註',
              productInfo: '產品信息',
              productName: '產品名稱',
              productCategory: '產品分類',
              productFeatures: '產品特點',
              solves: '解決問題',
              productAdvantage: '產品優勢',
              price: '價格',
              offer: '優惠方式',
              copyAdjectivesProduct: '文案形容詞',
              contraindications: '禁忌事項',
              productNotes: '產品備註'
            },
            zh: {
              basicInfo: '基本信息',
              companyName: '公司名称',
              contactPerson: '联系人',
              phone: '电话',
              industry: '行业',
              brandInfo: '品牌信息',
              companyIntro: '公司简介',
              branches: '分支机构',
              awards: '获得奖项',
              productTypes: '产品类型',
              focusTypes: '专注类型',
              advantages: '主要优势',
              targetAudience: '目标客群',
              threshold: '进入门槛',
              copyTheme: '文案主题',
              copyAdjectivesBrand: '文案形容词',
              brandNotes: '品牌备注',
              productInfo: '产品信息',
              productName: '产品名称',
              productCategory: '产品分类',
              productFeatures: '产品特点',
              solves: '解决问题',
              productAdvantage: '产品优势',
              price: '价格',
              offer: '优惠方式',
              copyAdjectivesProduct: '文案形容词',
              contraindications: '禁忌事项',
              productNotes: '产品备注'
            }
          };
          
          const currentLang = (window.i18n && window.i18n.currentLang) || 'en';
          return (labels[currentLang] || labels.en)[key] || key;
        };

        // Helper function to conditionally show fields
        const showField = (key, value) => {
          if (!value || String(value).trim() === '') return '';
          return `<div class="info-item"><strong>${getLabel(key)}:</strong> <span>${value}</span></div>`;
        };

        // Show questionnaire data only for client accounts (read-only)
        if (AppState.userRole === 'client' && data.questionnaireCompleted) {
          html += `
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
            <div class="questionnaire-section" style="display: flex; gap: 20px; flex-wrap: wrap;">
              
              <!-- Basic Information Column -->
              <div class="info-column" style="flex: 1; min-width: 300px; padding: 15px; background: #f9f9f9; border-radius: 8px;">
                <h3 style="margin-top: 0; color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px;">${getLabel('basicInfo')}</h3>
                ${showField('companyName', data.companyName)}
                ${showField('contactPerson', data.contactName)}
                ${showField('phone', data.phone)}
                ${showField('industry', data.industry)}
              </div>
              
              <!-- Brand Information Column -->
              <div class="info-column" style="flex: 1; min-width: 300px; padding: 15px; background: #f9f9f9; border-radius: 8px;">
                <h3 style="margin-top: 0; color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px;">${getLabel('brandInfo')}</h3>
                ${showField('companyIntro', data.brandCompanyIntro)}
                ${showField('branches', data.brandBranches)}
                ${showField('awards', data.brandAwards)}
                ${showField('productTypes', data.brandProductTypes)}
                ${showField('focusTypes', data.brandFocusTypes)}
                ${showField('advantages', data.brandAdvantages)}
                ${showField('targetAudience', data.brandTarget)}
                ${showField('threshold', data.brandThreshold)}
                ${showField('copyTheme', data.brandCopyTheme)}
                ${showField('copyAdjectivesBrand', data.brandCopyAdjectives)}
                ${showField('brandNotes', data.brandNotes)}
              </div>
              
              <!-- Product Information Column -->
              <div class="info-column" style="flex: 1; min-width: 300px; padding: 15px; background: #f9f9f9; border-radius: 8px;">
                <h3 style="margin-top: 0; color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px;">${getLabel('productInfo')}</h3>
                ${showField('productName', data.productName)}
                ${showField('productCategory', data.productCategory)}
                ${showField('productFeatures', data.productFeatures)}
                ${showField('solves', data.productSolves)}
                ${showField('productAdvantage', data.productAdvantage)}
                ${showField('price', data.productPrice)}
                ${showField('offer', data.productOffer)}
                ${showField('copyAdjectivesProduct', data.productCopyAdjectives)}
                ${showField('contraindications', data.productContraindications)}
                ${showField('productNotes', data.productNotes)}
              </div>
            </div>
            
            <style>
              .info-item { margin: 10px 0; line-height: 1.6; }
              .info-item strong { color: #333; }
              .info-item span { color: #666; word-break: break-word; }
            </style>
          `;
        } else if (isMaster) {
          // Master can see all account's questionnaire info
          html += `
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
            <div class="questionnaire-section" style="display: flex; gap: 20px; flex-wrap: wrap;">
              
              <!-- Basic Information Column -->
              <div class="info-column" style="flex: 1; min-width: 300px; padding: 15px; background: #f9f9f9; border-radius: 8px;">
                <h3 style="margin-top: 0; color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px;">${getLabel('basicInfo')}</h3>
                ${showField('companyName', data.companyName)}
                ${showField('contactPerson', data.contactName)}
                ${showField('phone', data.phone)}
                ${showField('industry', data.industry)}
              </div>
              
              <!-- Brand Information Column -->
              <div class="info-column" style="flex: 1; min-width: 300px; padding: 15px; background: #f9f9f9; border-radius: 8px;">
                <h3 style="margin-top: 0; color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px;">${getLabel('brandInfo')}</h3>
                ${showField('companyIntro', data.brandCompanyIntro)}
                ${showField('branches', data.brandBranches)}
                ${showField('awards', data.brandAwards)}
                ${showField('productTypes', data.brandProductTypes)}
                ${showField('focusTypes', data.brandFocusTypes)}
                ${showField('advantages', data.brandAdvantages)}
                ${showField('targetAudience', data.brandTarget)}
                ${showField('threshold', data.brandThreshold)}
                ${showField('copyTheme', data.brandCopyTheme)}
                ${showField('copyAdjectivesBrand', data.brandCopyAdjectives)}
                ${showField('brandNotes', data.brandNotes)}
              </div>
              
              <!-- Product Information Column -->
              <div class="info-column" style="flex: 1; min-width: 300px; padding: 15px; background: #f9f9f9; border-radius: 8px;">
                <h3 style="margin-top: 0; color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px;">${getLabel('productInfo')}</h3>
                ${showField('productName', data.productName)}
                ${showField('productCategory', data.productCategory)}
                ${showField('productFeatures', data.productFeatures)}
                ${showField('solves', data.productSolves)}
                ${showField('productAdvantage', data.productAdvantage)}
                ${showField('price', data.productPrice)}
                ${showField('offer', data.productOffer)}
                ${showField('copyAdjectivesProduct', data.productCopyAdjectives)}
                ${showField('contraindications', data.productContraindications)}
                ${showField('productNotes', data.productNotes)}
              </div>
            </div>
            
            <style>
              .info-item { margin: 10px 0; line-height: 1.6; }
              .info-item strong { color: #333; }
              .info-item span { color: #666; word-break: break-word; }
            </style>
          `;
        }

        // If this is a client account, wrap user info and support in two-column layout
        if (AppState.userRole === 'client') {
          // Create support section HTML
          const supportHtml = `
            <div id="support-request-section" style="flex: 1; min-width: 320px; padding: 16px; background: #f7fbff; border: 1px solid #e0e8ff; border-radius: 10px; display: flex; flex-direction: column;">
              <h3 style="margin: 0 0 16px 0; color: #0052b3; font-size: 16px; font-weight: 700;" data-i18n="supportRequests">${window.i18n?.t('supportRequests') || 'Support Requests'}</h3>
              
              <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
                <label style="color: #333; font-weight: 500; font-size: 13px;" data-i18n="requestType">${window.i18n?.t('requestType') || 'Request Type'}</label>
                <select id="support-category" style="padding: 10px; border: 1px solid #ccc; border-radius: 6px; background: #fff; font-size: 14px; color: #333;">
                  <option value="" disabled selected data-i18n="chooseRequestType">${window.i18n?.t('chooseRequestType') || 'Choose request type'}</option>
                  <option value="technical" data-i18n="technicalIssues">${window.i18n?.t('technicalIssues') || 'Technical Issues'}</option>
                  <option value="product" data-i18n="productChanges">${window.i18n?.t('productChanges') || 'Product Changes'}</option>
                  <option value="template" data-i18n="templateNotifications">${window.i18n?.t('templateNotifications') || 'Template Notifications'}</option>
                  <option value="other" data-i18n="other">${window.i18n?.t('other') || 'Other'}</option>
                </select>
              </div>

              <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
                <label style="color: #333; font-weight: 500; font-size: 13px;" data-i18n="describeRequest">${window.i18n?.t('describeRequest') || 'Describe Your Request'}</label>
                <textarea id="support-message" placeholder="${window.i18n?.t('describeIssue') || 'Type your request details here...'}" style="padding: 10px; border: 1px solid #ccc; border-radius: 6px; font-size: 13px; height: 100px; font-family: inherit; resize: vertical;"></textarea>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
                <button id="support-submit-btn" class="btn btn-primary" style="padding: 10px 12px; font-size: 13px; font-weight: 600; border-radius: 6px;" disabled data-i18n="submit">${window.i18n?.t('submit') || 'Submit'}</button>
                <button id="support-cancel-btn" class="btn btn-secondary" style="padding: 10px 12px; font-size: 13px; font-weight: 600; border-radius: 6px;" data-i18n="cancel">${window.i18n?.t('cancel') || 'Cancel'}</button>
              </div>

              <button id="see-past-submissions-btn" class="btn" style="padding: 10px 12px; font-size: 13px; font-weight: 600; background: #e8f0ff; color: #0052b3; border: 1px solid #b3d9ff; border-radius: 6px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#d9e5ff'" onmouseout="this.style.background='#e8f0ff'" data-i18n="seePastSubmissions">${window.i18n?.t('seePastSubmissions') || 'See Past Submissions'}</button>

              <div id="support-pending-list" style="margin-top: 16px;"></div>
              <div id="support-msg" class="message" style="display: none; margin-top: 12px;"></div>
            </div>
          `;

          // Wrap user info (with questionnaire) and support in two-column container
          // The support column goes on the right
          const containerHtml = `<div>
            <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-top: 0;">
              <div style="flex: 1; min-width: 280px; border: 1px solid #e0e8ff; border-radius: 10px; background: #f7fbff;">
                ${userInfoHtml}
              </div>
              ${supportHtml}
            </div>
            ${html.substring(html.indexOf('<hr'))}
          </div>`;
          
          accountInfo.innerHTML = containerHtml;

        } else {
          // For non-client accounts, just insert the main HTML (with questionnaire)
          accountInfo.innerHTML = html;
        }

        // Attach support handlers (only for client)
        if (AppState.userRole === 'client') {
          document.getElementById('support-submit-btn').onclick = async () => {
            const category = document.getElementById('support-category')?.value || '';
            const message = document.getElementById('support-message')?.value || '';
            if (!category) {
              UI.showMessage('support-msg', 'Please choose a request type first.', 'error');
              return;
            }
            await Profile.submitSupportRequest(category, message);
          };
          document.getElementById('support-cancel-btn').onclick = () => {
            document.getElementById('support-message').value = '';
            document.getElementById('support-category').selectedIndex = 0;
            UI.hideMessage('support-msg');
          };
          document.getElementById('see-past-submissions-btn').onclick = () => {
            // Open the past submissions panel from the account page only
            Profile.openSupportRecords();
          };

          // Initially hide message textarea until user chooses a type
          const msgEl = document.getElementById('support-message');
          if (msgEl) {
            msgEl.style.display = 'none';
          }

          const categoryEl = document.getElementById('support-category');
          const submitBtn = document.getElementById('support-submit-btn');
          if (categoryEl) {
            categoryEl.onchange = () => {
              // show message textarea after a type is selected and enable submit
              if (categoryEl.value) {
                if (msgEl) msgEl.style.display = 'block';
                if (submitBtn) submitBtn.disabled = false;
              } else {
                if (msgEl) msgEl.style.display = 'none';
                if (submitBtn) submitBtn.disabled = true;
              }
            };
          }

          // Load pending requests
          Profile.loadSupportRequests();
        }
      }

      // Show credit section only for client accounts
      if (creditSection && AppState.userRole === 'client') {
        let credits = data.credits;
        
        console.log('Loading credit section - Current credits:', credits);
        
        // If credits field doesn't exist, initialize it
        if (credits === undefined || credits === null) {
          credits = 20;
          console.log('Auto-initializing credits to 20');
          // Auto-initialize in database
          await AppState.db.collection('users').doc(AppState.currentUser.uid).update({
            credits: 20
          }).catch(err => console.error('Auto-init credits error:', err));
        }
        
        creditSection.innerHTML = `
          <div class="credit-section" style="background: linear-gradient(90deg, #f7fbff, #eef7ff); padding: 18px; border-radius: 10px; margin-top: 20px; border-left: 6px solid #007bff; display: flex; gap: 20px; align-items: center;">
            <div style="flex: 1; min-width: 220px;">
              <h3 style="margin: 0 0 6px 0; color: #666;" data-i18n="creditManagement">${window.i18n?.t('creditManagement') || 'Credit Balance'}</h3>
              <div style="display:flex; align-items:baseline; gap:12px;">
                <div style="background: #fff; padding: 10px 16px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
                  <div style="font-size: 28px; font-weight: 700; color: #007bff;">${credits}</div>
                  <div style="font-size: 12px; color: #666;">${window.i18n?.t('availableCredits') || 'Available Credits'}</div>
                </div>
                <div style="font-size: 14px; color: #666;">${window.i18n?.t('creditsInfo') || 'Each generation uses 2 credits'}</div>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:12px;">
              <button id="add-credit-btn" class="btn btn-primary" style="padding: 12px 22px; font-size: 16px; font-weight: 700; white-space: nowrap; background-color: #ffffff; color: #007bff; border: 1px solid #e6eefc; border-radius: 8px; cursor: pointer; transition: all 0.18s; display:flex; align-items:center; gap:10px;" onclick="goToPayment()" onmouseover="this.style.boxShadow='0 6px 18px rgba(0,86,179,0.06)';" onmouseout="this.style.boxShadow='none'" data-i18n="addCredits">
                <span style="font-size:18px; color: #007bff;">+ ${window.i18n?.t('addCredits') || 'Add Credits'}</span>
                <span style="background: #ffffff; padding:6px 10px; border-radius:6px; font-weight:700; color: #007bff; border: 1px solid rgba(0,123,255,0.08);">${credits}</span>
              </button>
            </div>
          </div>
        `;
        creditSection.style.display = 'block';
        console.log('Credit section displayed');
      } else if (creditSection) {
        console.log('Credit section hidden - Role:', AppState.userRole, 'Element exists:', !!creditSection);
        creditSection.style.display = 'none';
      }

      // Show edit button only for master/admin
      const editBtn = document.getElementById('edit-account-btn');
      if (editBtn) {
        // Make button visible and add click handler
        editBtn.style.display = 'inline-block';
        editBtn.onclick = () => {
          console.log('[Profile] Edit button clicked');
          Profile.showEditAccount();
        };
      }

      // Setup form submission
      const accountForm = document.getElementById('account-form');
      if (accountForm) {
        accountForm.onsubmit = (e) => {
          e.preventDefault();
          console.log('[Profile] Form submitted');
          Profile.updateAccount();
          return false;
        };
      }

      // Setup cancel button
      const cancelBtn = document.getElementById('cancel-edit');
      if (cancelBtn) {
        cancelBtn.onclick = () => {
          console.log('[Profile] Cancel button clicked');
          Profile.cancelEdit();
        };
      }

      UI.checkProductWarning(data.productName);

    } catch (err) {
      UI.showMessage('account-msg', 'Error loading account: ' + err.message, 'error');
    }
  },

  async showEditAccount() {
    UI.hideElement('account-info');
    UI.hideElement('credit-section');
    UI.showElement('account-form');

    try {
      const doc = await AppState.db.collection('users').doc(AppState.currentUser.uid).get();
      
      if (doc.exists) {
        const data = doc.data();
        document.getElementById('account-name').value = data.name || '';
        
        // Handle multiple products
        if (data.productName) {
          const productInput = document.getElementById('account-product');
          const productContainer = productInput.parentElement;
          
          // Parse multiple products from comma-separated string
          const products = String(data.productName)
            .split(',')
            .map(p => p.trim())
            .filter(p => p.length > 0);
          
          // Create multi-product input UI
          let productsHTML = `<div id="account-products-list" style="margin-bottom: 10px;">`;
          products.forEach((product, index) => {
            productsHTML += `
              <div class="account-product-item" style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
                <input type="text" class="account-product-input" value="${product}" style="flex: 1; padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px;">
                <button type="button" class="btn btn-danger remove-account-product" style="padding: 6px 10px; font-size: 12px;" data-i18n="remove">${window.i18n?.t('remove') || 'Remove'}</button>
              </div>
            `;
          });
          productsHTML += `</div>`;
          
          productInput.style.display = 'none';
          productInput.insertAdjacentHTML('beforebegin', productsHTML);
          
          // Add handlers for remove buttons
          document.querySelectorAll('.remove-account-product').forEach(btn => {
            btn.onclick = () => {
              btn.closest('.account-product-item').remove();
            };
          });
          
          // Add button to add more products
          productContainer.insertAdjacentHTML('beforeend', `
            <button type="button" id="add-account-product-btn" class="btn btn-secondary" style="margin-top: 8px; padding: 8px 12px; font-size: 12px;" data-i18n="addProduct">+ ${window.i18n?.t('addProduct') || 'Add Product'}</button>
          `);
          
          let newProductCount = products.length + 1;
          document.getElementById('add-account-product-btn').onclick = () => {
            const newItem = document.createElement('div');
            newItem.className = 'account-product-item';
            newItem.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px; align-items: center;';
            newItem.innerHTML = `
              <input type="text" class="account-product-input" placeholder="Enter product name" style="flex: 1; padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px;">
              <button type="button" class="btn btn-danger remove-account-product" style="padding: 6px 10px; font-size: 12px;" data-i18n="remove">${window.i18n?.t('remove') || 'Remove'}</button>
            `;
            document.getElementById('account-products-list').appendChild(newItem);
            
            newItem.querySelector('.remove-account-product').onclick = () => {
              newItem.remove();
            };
          };
        } else {
          document.getElementById('account-product').value = '';
        }
        
        document.getElementById('account-email').value = AppState.currentUser.email;
      }
    } catch (err) {
      UI.showMessage('account-msg', 'Error loading account data: ' + err.message, 'error');
    }
  },

  cancelEdit() {
    // Clean up multi-product list if it exists
    const productsList = document.getElementById('account-products-list');
    if (productsList) {
      productsList.remove();
    }
    const addProductBtn = document.getElementById('add-account-product-btn');
    if (addProductBtn) {
      addProductBtn.remove();
    }
    
    // Show product input again
    const productInput = document.getElementById('account-product');
    if (productInput) {
      productInput.style.display = 'block';
    }
    
    UI.hideElement('account-form');
    UI.showElement('account-info');
    UI.showElement('credit-section');
    UI.hideMessage('account-msg');
  },

  async updateAccount() {
    const name = document.getElementById('account-name')?.value.trim();
    
    // Collect products from either multi-product list or single input
    let productName = '';
    const productsList = document.getElementById('account-products-list');
    
    if (productsList) {
      // Collect from multi-product inputs
      const inputs = productsList.querySelectorAll('.account-product-input');
      const products = [];
      inputs.forEach(input => {
        const value = input.value.trim();
        if (value) {
          products.push(value);
        }
      });
      productName = products.join(', ');
    } else {
      // Fallback to single product input
      productName = document.getElementById('account-product')?.value.trim();
    }

    if (!name || name.length < 2) {
      UI.showMessage('account-msg', 'Please enter a valid name (at least 2 characters).', 'error');
      return;
    }

    if (!productName || productName.length < 2) {
      UI.showMessage('account-msg', 'Please enter at least one valid product name (at least 2 characters).', 'error');
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
  },

  // Deduct credits after image generation
  async deductCredits(amount = 2) {
    if (!AppState.currentUser) return false;
    
    try {
      const doc = await AppState.db.collection('users').doc(AppState.currentUser.uid).get();
      if (!doc.exists) return false;
      
      const currentCredits = doc.data().credits || 20;
      
      if (currentCredits < amount) {
        console.warn('Insufficient credits');
        return false;
      }
      
      const newCredits = currentCredits - amount;
      await AppState.db.collection('users').doc(AppState.currentUser.uid).update({
        credits: newCredits
      });
      
      return true;
    } catch (err) {
      console.error('Error deducting credits:', err);
      return false;
    }
  },

  // Get current credits
  async getCredits() {
    if (!AppState.currentUser) return 0;
    
    try {
      const doc = await AppState.db.collection('users').doc(AppState.currentUser.uid).get();
      if (!doc.exists) return 0;
      
      return doc.data().credits || 20;
    } catch (err) {
      console.error('Error getting credits:', err);
      return 0;
    }
  },

  // Submit a support request (saved under users/{uid}/supportRequests)
  async submitSupportRequest(category = 'other', message = '') {
    if (!AppState.currentUser) {
      UI.showMessage('support-msg', 'Please sign in to submit a support request.', 'error');
      return;
    }

    try {
      UI.showMessage('support-msg', 'Submitting...', 'info');
      const ref = await AppState.db.collection('users').doc(AppState.currentUser.uid).collection('supportRequests').add({
        category: category,
        message: message || '',
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      UI.showMessage('support-msg', 'Request submitted. Our team will follow up.', 'success');
      // Clear message input
      const msgInput = document.getElementById('support-message');
      if (msgInput) msgInput.value = '';

      // Reload pending list
      await this.loadSupportRequests();
      return ref.id;
    } catch (err) {
      console.error('Error submitting support request:', err);
      UI.showMessage('support-msg', 'Failed to submit request: ' + err.message, 'error');
      return null;
    }
  },

  // Load pending support requests for current user
  async loadSupportRequests() {
    const listEl = document.getElementById('support-pending-list');
    if (!listEl) return;
    listEl.innerHTML = '<div style="color:#666">Loading pending requests...</div>';

    if (!AppState.currentUser) {
      listEl.innerHTML = '<div class="message error">Please sign in to view requests.</div>';
      return;
    }

    try {
      const snapshot = await AppState.db.collection('users').doc(AppState.currentUser.uid).collection('supportRequests')
        .where('status', '==', 'pending')
        .get();

      if (snapshot.empty) {
        listEl.innerHTML = '<div style="color:#666">No pending requests.</div>';
        return;
      }

      const items = [];
      const docs = snapshot.docs;
      
      // Sort by createdAt in memory (descending)
      docs.sort((a, b) => {
        const timeA = a.data().createdAt?.toMillis?.() || 0;
        const timeB = b.data().createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      
      docs.forEach(doc => {
        const data = doc.data();
        const created = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toLocaleString() : '';
        items.push(`
          <div class="support-item" data-id="${doc.id}" style="padding:10px; border:1px solid #eef; border-radius:6px; margin-bottom:8px; background:#fbfcff; display:flex; justify-content:space-between; gap:12px;">
            <div style="flex:1;">
              <div style="font-weight:700; color:#333;">${(data.category || '').toString()}</div>
              <div style="color:#555; margin-top:6px; white-space:pre-wrap;">${(data.message || '')}</div>
              <div style="color:#888; font-size:12px; margin-top:6px;">${created}</div>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px;">
              <button class="btn btn-secondary support-cancel-btn" data-id="${doc.id}" style="padding:6px 10px;">${window.i18n?.t('cancel') || 'Cancel'}</button>
            </div>
          </div>
        `);
      });

      listEl.innerHTML = items.join('\n');

      // Attach cancel handlers
      listEl.querySelectorAll('.support-cancel-btn').forEach(btn => {
        btn.onclick = async () => {
          const id = btn.getAttribute('data-id');
          if (!id) return;
          await Profile.cancelSupportRequest(id);
        };
      });

    } catch (err) {
      console.error('Error loading support requests:', err);
      listEl.innerHTML = '<div class="message error">Failed to load requests: ' + err.message + '</div>';
    }
  },

  // Cancel a pending support request (mark status as cancelled)
  async cancelSupportRequest(requestId) {
    if (!AppState.currentUser) return;
    try {
      await AppState.db.collection('users').doc(AppState.currentUser.uid).collection('supportRequests').doc(requestId).update({
        status: 'cancelled',
        cancelledAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      UI.showMessage('support-msg', 'Request cancelled.', 'info');
      await this.loadSupportRequests();
    } catch (err) {
      console.error('Error cancelling support request:', err);
      UI.showMessage('support-msg', 'Failed to cancel: ' + err.message, 'error');
    }
  },

  // Open the support records page (only accessible from Account page)
  openSupportRecords() {
    const supportPage = document.getElementById('support-records-page');
    const accountPage = document.getElementById('account-page');
    if (supportPage && accountPage) {
      accountPage.style.display = 'none';
      accountPage.classList.add('hidden');
      supportPage.classList.remove('hidden');
      supportPage.style.display = 'block';
      // Load records when opened
      if (typeof this.loadSupportRecords === 'function') {
        this.loadSupportRecords();
      }
      // wire back button
      const backBtn = document.getElementById('support-back-btn');
      if (backBtn) backBtn.onclick = () => { Profile.closeSupportRecords(); };
    }
  },

  // Close support records and return to account page
  closeSupportRecords() {
    const supportPage = document.getElementById('support-records-page');
    const accountPage = document.getElementById('account-page');
    if (supportPage && accountPage) {
      supportPage.style.display = 'none';
      supportPage.classList.add('hidden');
      accountPage.classList.remove('hidden');
      accountPage.style.display = 'block';
      // reload account info to refresh pending list
      if (typeof this.loadAccountInfo === 'function') this.loadAccountInfo();
    }
  },

  // Load all support requests (for past submissions page)
  async loadSupportRecords() {
    const listEl = document.getElementById('support-records-list');
    const msgEl = document.getElementById('support-records-msg');
    if (msgEl) msgEl.style.display = 'none';
    if (!listEl) return;
    listEl.innerHTML = '<div style="color:#666">Loading submissions...</div>';

    if (!AppState.currentUser) {
      listEl.innerHTML = '<div class="message error">Please sign in to view submissions.</div>';
      return;
    }

    try {
      const snapshot = await AppState.db.collection('users').doc(AppState.currentUser.uid).collection('supportRequests')
        .get();

      if (snapshot.empty) {
        listEl.innerHTML = '<div style="color:#666">No submissions found.</div>';
        return;
      }

      const items = [];
      const docs = snapshot.docs;
      
      // Sort by createdAt in memory (descending)
      docs.sort((a, b) => {
        const timeA = a.data().createdAt?.toMillis?.() || 0;
        const timeB = b.data().createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      
      docs.forEach(doc => {
        const data = doc.data();
        const created = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toLocaleString() : '';
        const status = (data.status || 'unknown');
        const response = data.response || data.masterResponse || '';
        items.push(`
          <div class="support-record" style="padding:10px; border:1px solid #eee; border-radius:6px; margin-bottom:8px; background:#fff;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
              <div style="flex:1;">
                <div style="font-weight:700;">${(data.category || '')} <span style="font-weight:400; color:#888; font-size:12px; margin-left:8px;">${created}</span></div>
                <div style="color:#555; margin-top:6px; white-space:pre-wrap;">${(data.message || '')}</div>
                ${response ? `<div style="margin-top:8px; padding:8px; background:#f7f9ff; border-radius:6px; color:#333;"><strong>Response:</strong> <div style="margin-top:6px; white-space:pre-wrap;">${response}</div></div>` : ''}
              </div>
              <div style="min-width:110px; text-align:right;">
                <div style="font-weight:700; color:#333; text-transform:capitalize;">${status}</div>
              </div>
            </div>
          </div>
        `);
      });

      listEl.innerHTML = items.join('\n');

    } catch (err) {
      console.error('Error loading support records:', err);
      listEl.innerHTML = '<div class="message error">Failed to load submissions: ' + err.message + '</div>';
    }
  }
};

// Export to global scope
window.Profile = Profile;

// Listen to language changes and reload account info
if (window.document) {
  window.document.addEventListener('languageChanged', () => {
    console.log('[Profile] Language changed, reloading account info');
    if (AppState.currentUser && document.getElementById('account-page') && !document.getElementById('account-page').classList.contains('hidden')) {
      Profile.loadAccountInfo();
    }
  });
}
