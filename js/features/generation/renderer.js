const ImageRenderer = {
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
        setTimeout(() => {
            if (window.i18n?.renderAll) {
                window.i18n.renderAll();
            }
            container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
        console.log('Images rendered successfully');
    },
    showGeneratedContent() {
        const container = document.getElementById('generated-images');
        const row = document.getElementById('image-feedback-row');
        const indicator = document.getElementById('learning-indicator');
        if (container && row && indicator) {
            container.classList.remove('hidden');
            row.classList.remove('hidden');
            indicator.classList.remove('hidden');
            if (window.i18n && typeof window.i18n.renderAll === 'function') {
                window.i18n.renderAll();
            }
        } else {
            console.error('Generated images container, feedback row, or learning indicator not found');
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

window.ImageRenderer = ImageRenderer;