// js/features/generation/renderer.js

const ImageRenderer = {
  // ADDED: expose current images globally for feedback system
  renderGeneratedImages(images) {
    const pair = document.getElementById('image-pair');
    const container = document.getElementById('generated-images');

    if (!pair || !container) {
      console.error('Required elements not found');
      return;
    }

    pair.innerHTML = '';
    container.classList.remove('hidden');
    container.style.display = 'block';

    // ADDED: Store images globally so feedback can access them
    window.currentImages = images;

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

    // REMOVED: Old feedback buttons (now handled in template.js)
    // We keep only image display here

    setTimeout(() => {
      if (window.i18n?.renderAll) {
        window.i18n.renderAll();
      }
      container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);

    console.log('Images rendered successfully');
  },

  // REMOVED: downloadAllImages() – now handled in TemplateManager._download()
  // But kept as fallback if needed elsewhere
  async downloadAllImages() {
    const images = window.currentImages;
    if (!images || images.length === 0) return;

    for (let i = 0; i < images.length; i++) {
      await new Promise(resolve => setTimeout(resolve, i * 400));
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

// ADDED: expose globally (required by TemplateManager)
window.ImageRenderer = ImageRenderer;