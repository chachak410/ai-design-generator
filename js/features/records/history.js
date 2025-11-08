const RecordManager = {
  async loadRecords() {
    if (!AppState.currentUser) {
      UI.showMessage('records-msg', window.i18n?.t('pleaseSignIn') || 'Please sign in to view records.', 'error');
      return;
    }

    const recordsList = document.getElementById('records-list');
    if (!recordsList) return;

    recordsList.innerHTML = '';

    try {
      UI.showMessage('records-msg', window.i18n?.t('loadingRecords') || 'Loading records...', 'info');

      const snapshot = await AppState.db.collection('generations')
        .where('userId', '==', AppState.currentUser.uid)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();

      if (snapshot.empty) {
        UI.showMessage('records-msg', window.i18n?.t('noRecordsFound') || 'No generation records found.', 'info');
        return;
      }

      snapshot.forEach(doc => {
        const data = doc.data();
        this.renderRecord(data, recordsList);
      });

      UI.hideMessage('records-msg');

    } catch (err) {
      console.error(' Error loading records:', err);
      UI.showMessage('records-msg', (window.i18n?.t('errorLoadingRecords') || 'Error loading records: ') + err.message, 'error');
    }
  },

  renderRecord(data, container) {
    const templates = data.templates || [];
    const images = data.images || [];
    const createdAt = data.createdAt ? data.createdAt.toDate().toLocaleString() : 'Unknown';

    images.forEach((image, idx) => {
      const card = document.createElement('div');
      card.className = 'record-card';
      card.style.cssText = 'border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 15px; background: white;';
      
      const img = document.createElement('img');
      img.src = image.url;
      img.alt = `Generated design ${idx + 1}`;
      img.style.cssText = 'width: 100%; border-radius: 6px; margin-bottom: 10px;';
      img.loading = 'lazy';
      
      img.onerror = () => {
        img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23999"%3EImage not available%3C/text%3E%3C/svg%3E';
      };

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span style="background: #667eea; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
            ${templates.join(', ')}
          </span>
          <span style="color: #666; font-size: 12px;">${image.provider}</span>
        </div>
      `;
      
      card.appendChild(img);
      
      const footer = document.createElement('div');
      footer.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-top: 10px;';
      footer.innerHTML = `
        <span style="color: #666; font-size: 12px;">${createdAt}</span>
        <button class="btn btn-primary" style="padding: 6px 12px; font-size: 14px;" data-i18n="downloadAll"
                onclick="RecordManager.downloadImage('${image.url}', 'design-${idx}-${Date.now()}.png')">
           ${window.i18n?.t('downloadAll') || 'Download'}
        </button>
      `;
      
      card.appendChild(footer);
      container.appendChild(card);
    });
  },

  downloadImage(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};

// Export to global scope
window.RecordManager = RecordManager;
