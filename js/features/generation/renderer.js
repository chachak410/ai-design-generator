const ImageRenderer = {
  renderGeneratedImages(images) {
    const pair = document.getElementById('image-pair');
    const feedbackButtons = document.getElementById('feedback-buttons');
    const container = document.getElementById('generated-images');

    if (!pair || !feedbackButtons || !container) {
      console.error('Required elements not found');
      return;
    }

    pair.innerHTML = '';
    feedbackButtons.innerHTML = '';
    
    container.classList.remove('hidden');
    container.style.display = 'block';

    images.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'image-container';
      
      const img = document.createElement('img');
      img.src = item.url;
      img.alt = `Generated image ${i + 1}`;
      img.onload = () => img.classList.add('loaded');

      const label = document.createElement('div');
      label.className = 'provider-label';
      label.textContent = item.provider;

      div.appendChild(img);
      div.appendChild(label);
      pair.appendChild(div);
    });

    window.currentImages = images;

    const btnContainer = document.createElement('div');
    btnContainer.className = 'feedback-btn-container';
    
    btnContainer.innerHTML = `
      <button class="btn btn-primary" onclick="Generator.handleFeedback(0)">
         <span data-i18n="left_better">Left is better</span>
      </button>
      <button class="btn btn-primary" onclick="Generator.handleFeedback(1)">
        <span data-i18n="right_better">Right is better</span> 
      </button>
      <button class="btn btn-secondary" onclick="Generator.handleFeedback('tie')">
         <span data-i18n="tie">It's a tie</span>
      </button>
      <button class="btn btn-success" onclick="ImageRenderer.downloadAllImages()">
         <span data-i18n="download_all">Download All</span>
      </button>
      <button class="btn btn-danger" onclick="Generator.generateImages()">
         <span data-i18n="regenerate">Both bad - Regenerate</span>
      </button>
    `;
    
    feedbackButtons.appendChild(btnContainer);

    setTimeout(() => {
      if (window.i18n?.renderAll) {
        window.i18n.renderAll();
      }
      container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
    
    console.log(' Images and buttons rendered successfully');
  },

  async downloadAllImages() {
    const images = window.currentImages;
    if (!images || images.length === 0) return;

    for (let i = 0; i < images.length; i++) {
      await new Promise(resolve => setTimeout(resolve, i * 500));
      this.downloadImage(images[i].url, `design-${Date.now()}-${i + 1}.png`);
    }
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
