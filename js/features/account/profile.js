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
        let html = `
          <div class="user-info-section">
            <h3 data-i18n="userInformation">${window.i18n?.t('userInformation') || 'User Information'}</h3>
            <p><strong data-i18n="name">${window.i18n?.t('name') || 'Name'}</strong>: <span id="display-name">${data.name || window.i18n?.t('notSet') || 'Not set'}</span></p>
            <p><strong data-i18n="emailLabel">${window.i18n?.t('emailLabel') || 'Email'}</strong>: ${AppState.currentUser.email}</p>
            <p><strong data-i18n="industry">${window.i18n?.t('industry') || 'Industry'}</strong>: ${data.industryName || window.i18n?.t('notSpecified2') || 'Not specified'} (${window.i18n?.t('codeColon') || 'Code'}: ${data.industryCode || 'N/A'})</p>
            <p><strong data-i18n="template">${window.i18n?.t('template') || 'Template'}</strong>: ${data.template || window.i18n?.t('noneValue') || 'None'}</p>
            <p><strong data-i18n="productName">${window.i18n?.t('productName') || 'Product Name'}</strong>: <span id="display-product">${data.productName || window.i18n?.t('notSet') || 'Not set'}</span></p>
            <p><strong data-i18n="role">${window.i18n?.t('role') || 'Role'}</strong>: ${AppState.userRole || window.i18n?.t('client') || 'client'}</p>
            <button id="edit-account-btn" class="btn" data-i18n="editProfile" style="margin-top: 10px;" data-i18n="editProfile">Edit Profile</button>
          </div>
        `;

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

        accountInfo.innerHTML = html;
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
          <div class="credit-section" style="background: #f0f8ff; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #007bff; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h3 style="margin-top: 0; margin-bottom: 5px;" data-i18n="creditManagement">${window.i18n?.t('creditManagement') || 'Credit Balance'}</h3>
              <p style="font-size: 18px; margin: 10px 0;"><strong data-i18n="addCredits">${window.i18n?.t('addCredits') || 'Available Credits'}</strong>: <span style="color: #007bff; font-size: 24px; font-weight: bold;">${credits}</span> ${window.i18n?.t('noneValue') || 'images'}</p>
              <p style="font-size: 14px; color: #666; margin: 5px 0;">${window.i18n?.t('creditsInfo') || 'Each generation uses 2 credits (max 10 generations)'}</p>
            </div>
            <button id="add-credit-btn" class="btn btn-primary" style="padding: 10px 20px; font-size: 14px; font-weight: 600; white-space: nowrap; margin-left: 20px; background-color: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; transition: all 0.3s; flex-shrink: 0;" onclick="goToPayment()" onmouseover="this.style.backgroundColor='#0056b3'; this.style.boxShadow='0 2px 8px rgba(0,86,179,0.3)'" onmouseout="this.style.backgroundColor='#007bff'; this.style.boxShadow='none'" data-i18n="addCredits">+ Add Credits</button>
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
