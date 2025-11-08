const Payment = {
  // Credit packages: { images, price }
  packages: [
    { images: 10, price: 20 },
    { images: 20, price: 39 },
    { images: 40, price: 75 },
    { images: 100, price: 180 }
  ],

  selectedPackage: null,

  // Initialize payment page
  init() {
    this.renderPackages();
    this.setupEventListeners();
  },

  getDisplayName(images) {
    return `${images} ${window.i18n?.t('noneValue') === 'None' ? 'Images' : 'Images'} (${images / 2} ${window.i18n?.t('generatedLeftImage')?.includes('生成') ? '次' : 'generations'})`;
  },

  renderPackages() {
    const container = document.getElementById('payment-options');
    if (!container) return;

    container.innerHTML = this.packages.map((pkg, idx) => {
      const generationCount = pkg.images / 2;
      return `
      <div class="payment-option" onclick="Payment.selectPackage(${idx})" 
           style="border: 2px solid #ddd; border-radius: 8px; padding: 20px; cursor: pointer; text-align: center; transition: all 0.3s;">
        <h4 style="margin: 0 0 10px 0; color: #333;">${pkg.images} ${window.i18n?.t('generatedLeftImage')?.includes('圖') ? '圖片' : window.i18n?.t('generatedLeftImage')?.includes('生成') ? '张图片' : 'Images'} (${generationCount} ${window.i18n?.t('generatedLeftImage')?.includes('生成') ? '次生成' : 'generations'})</h4>
        <p style="margin: 5px 0; font-size: 14px; color: #666;">
          ${window.i18n?.t('noneValue') === 'None' ? `${generationCount} generations` : `${generationCount} 次生成`}
        </p>
        <p style="margin: 15px 0 0 0; font-size: 24px; color: #007bff; font-weight: bold;">HK$${pkg.price}</p>
        <p style="margin: 5px 0 0 0; font-size: 12px; color: #999;">
          ${(pkg.price / pkg.images).toFixed(2)} per image
        </p>
      </div>
    `;
    }).join('');
  },

  selectPackage(idx) {
    this.selectedPackage = this.packages[idx];
    
    // Update UI
    document.querySelectorAll('.payment-option').forEach((el, i) => {
      if (i === idx) {
        el.style.borderColor = '#007bff';
        el.style.backgroundColor = '#f0f8ff';
      } else {
        el.style.borderColor = '#ddd';
        el.style.backgroundColor = '#fff';
      }
    });

    // Show summary
    const summary = document.getElementById('payment-summary');
    if (summary) {
      const genCount = this.selectedPackage.images / 2;
      document.getElementById('summary-package').textContent = `${this.selectedPackage.images} ${window.i18n?.t('noneValue') || 'Images'} (${genCount} ${window.i18n?.t('noneValue')?.includes('无') ? 'generations' : 'generations'})`;
      document.getElementById('summary-price').textContent = this.selectedPackage.price;
      summary.style.display = 'block';
    }
  },

  setupEventListeners() {
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => this.processPayment());
    }
  },

  async processPayment() {
    if (!this.selectedPackage) {
      this.showMessage(window.i18n?.t('selectPackage') || 'Please select a package', 'error');
      return;
    }

    if (!AppState.currentUser) {
      this.showMessage(window.i18n?.t('pleaseSignIn') || 'Please sign in first', 'error');
      return;
    }

    try {
      this.showMessage(window.i18n?.t('processingPayment') || 'Processing payment...', 'info');

      // Simulate payment processing
      // In real implementation, integrate with payment gateway (PayPal, Stripe, etc.)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Update user credits in Firestore
      const currentCredits = await Profile.getCredits();
      const newCredits = currentCredits + this.selectedPackage.images;

      await AppState.db.collection('users').doc(AppState.currentUser.uid).update({
        credits: newCredits,
        lastPurchaseDate: new Date(),
        lastPurchaseAmount: this.selectedPackage.price
      });

      this.showMessage(window.i18n?.t('purchaseSuccess', { images: this.selectedPackage.images }) || `Successfully purchased ${this.selectedPackage.images} credits!`, 'success');

      // Reload account info
      await Profile.loadAccountInfo();

      // Navigate back to account page after 2 seconds
      setTimeout(() => {
        window.showPage('account-page');
        this.reset();
      }, 2000);

    } catch (err) {
      console.error('Payment error:', err);
      this.showMessage((window.i18n?.t('paymentFailed') || 'Payment failed: ') + err.message, 'error');
    }
  },

  showMessage(msg, type) {
    const msgEl = document.getElementById('payment-msg');
    if (msgEl) {
      msgEl.textContent = msg;
      msgEl.className = 'message ' + type;
      msgEl.style.display = 'block';
    }
  },

  reset() {
    this.selectedPackage = null;
    document.getElementById('payment-summary').style.display = 'none';
    document.querySelectorAll('.payment-option').forEach(el => {
      el.style.borderColor = '#ddd';
      el.style.backgroundColor = '#fff';
    });
    document.getElementById('payment-msg').style.display = 'none';
  }
};

// Global functions
function goToPayment() {
  Payment.reset();
  Payment.init();
  window.showPage('payment-page');
}

function cancelPayment() {
  Payment.reset();
  window.showPage('account-page');
}

// Export to global scope
window.Payment = Payment;
window.goToPayment = goToPayment;
window.cancelPayment = cancelPayment;
