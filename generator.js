const Generator = {
  async generateImages() {
    if (!AppState.currentUser) {
      UI.showMessage('template-status', 'Please sign in to generate images.', 'error');
      return;
    }

    if (!AppState.userProductName || AppState.userProductName.trim().length < 2) {
      UI.showMessage('template-status', 'Please set your product name in Account Settings.', 'error');
      return;
    }

    const selectedTemplates = Array.from(
      document.querySelectorAll('#template-checkboxes input:checked')
    ).map(cb => cb.value);

    if (selectedTemplates.length === 0) {
      UI.showMessage('template-status', 'Please select at least one template.', 'error');
      return;
    }

    if (AppState.generationCount >= 20) {
      UI.showMessage('template-status', 'Maximum generation limit (20) reached for this session.', 'error');
      return;
    }

    let extra = '';
    if (AppState.userSpecs && Object.keys(AppState.selectedSpecs).length > 0) {
      extra = Object.entries(AppState.selectedSpecs)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      if (extra) extra = ', ' + extra;
    }

    const prompt = `A beautiful product design for ${AppState.userProductName}, ${selectedTemplates.join(', ')} style${extra}, high quality, detailed, professional`;

    this.showProgress();

    const generateBtn = document.getElementById('generate-images-btn');
    if (generateBtn) {
      generateBtn.disabled = true;
      generateBtn.textContent = 'Generating...';
    }

    try {
      const images = await this.generateImagePair(prompt);

      if (images.length === 2) {
        ImageRenderer.renderGeneratedImages(images);

        await AppState.db.collection('generations').add({
          userId: AppState.currentUser.uid,
          templates: selectedTemplates,
          productName: AppState.userProductName,
          specifications: AppState.selectedSpecs,
          images: images.map(img => ({ 
            provider: img.provider, 
            url: img.url 
          })),
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        UI.showMessage('template-status', ' Images generated successfully!', 'success');
      } else {
        UI.showMessage('template-status', ` Generated ${images.length}/2 images. Please try again.`, 'error');
      }

    } catch (err) {
      console.error(' Generation error:', err);
      UI.showMessage('template-status', ' Error generating images: ' + err.message, 'error');
    } finally {
      if (generateBtn) {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Images';
      }
    }
  },

  showProgress() {
    const progressMsg = document.createElement('div');
    progressMsg.id = 'generation-progress';
    progressMsg.className = 'message info';
    progressMsg.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>Generating images with AI...</p>
        <p class="progress-text">Preparing request...</p>
      </div>
    `;
    
    const statusEl = document.getElementById('template-status');
    if (statusEl) {
      statusEl.innerHTML = '';
      statusEl.appendChild(progressMsg);
      statusEl.style.display = 'block';
    }
  },

  updateProgress(message) {
    const progressText = document.querySelector('#generation-progress .progress-text');
    if (progressText) {
      progressText.textContent = message;
    }
  },

  async generateImagePair(basePrompt) {
    const seed = Date.now();
    const images = [];
    let attempts = 0;
    const maxAttempts = 10;

    while (images.length < 2 && attempts < maxAttempts && AppState.generationCount < 20) {
      const prompt = images.length === 0 
        ? basePrompt 
        : `${basePrompt} (variation ${images.length + 1})`;

      this.updateProgress(`Generating image ${images.length + 1}/2 (attempt ${attempts + 1}/${maxAttempts})...`);

      try {
        const image = await PollinationsAPI.generate(prompt, seed + attempts);
        
        if (image) {
          images.push(image);
          AppState.generationCount++;
          TemplateManager.updateGenerationCounter();
          this.updateProgress(` Image ${images.length}/2 generated successfully!`);
        } else if (images.length === 0) {
          this.updateProgress(`Trying backup provider...`);
          const backupImage = await StabilityAPI.generate(prompt, seed + attempts);
          if (backupImage) {
            images.push(backupImage);
            AppState.generationCount++;
            TemplateManager.updateGenerationCounter();
            this.updateProgress(` Image ${images.length}/2 generated successfully!`);
          }
        }
      } catch (err) {
        console.error(`Generation attempt ${attempts + 1} failed:`, err);
        this.updateProgress(`Attempt ${attempts + 1} failed, retrying...`);
      }

      attempts++;
    }

    return images;
  },

  handleFeedback(choice) {
    const images = window.currentImages;
    if (!images || images.length !== 2) return;

    console.log('User feedback:', choice);

    if (choice === 0) {
      ImageRenderer.downloadImage(images[0].url, `design-left-${Date.now()}.png`);
      UI.showMessage('template-status', ' Left image downloaded!', 'success');
    } else if (choice === 1) {
      ImageRenderer.downloadImage(images[1].url, `design-right-${Date.now()}.png`);
      UI.showMessage('template-status', ' Right image downloaded!', 'success');
    } else if (choice === 'tie') {
      ImageRenderer.downloadImage(images[0].url, `design-1-${Date.now()}.png`);
      setTimeout(() => {
        ImageRenderer.downloadImage(images[1].url, `design-2-${Date.now()}.png`);
      }, 500);
      UI.showMessage('template-status', ' Both images downloaded!', 'success');
    }
  }
};
