const TemplateManager = {
    FEEDBACK_DIM: 64,
    LEARNING_RATE: 0.08,
    NEGATIVE_RATE: 0.12,

    async loadTemplates() {
        if (!AppState.currentUser) {
            UI.showMessage('template-status', window.i18n.t('pleaseSignIn'), 'error');
            return;
        }
        try {
            AppState.generationCount = AppState.generationCount || 0;
            AppState.badSelections = AppState.badSelections || 0;
            AppState.creditLimit = 20;
            AppState.maxBadSelections = AppState.creditLimit / 2;
            AppState.generatedImages = AppState.generatedImages || [];

            if (AppState.userRole === 'master' || AppState.userRole === 'admin') {
                AppState.userTemplates = ['modern', 'classic', 'minimalist', 'luxury', 'eco'];
                AppState.userSpecs = null;
                AppState.selectedSpecs = {};
            } else {
                const doc = await AppState.db.collection('users').doc(AppState.currentUser.uid).get();
                if (!doc.exists) {
                    UI.showMessage('template-status', window.i18n.t('profileNotFound'), 'error');
                    showPage('account-page');
                    return;
                }
                const data = doc.data();
                AppState.userTemplates = data.template ? [data.template] : [];
                AppState.userSpecs = data.specifications || {};
                AppState.userProductName = data.productName || '';
                AppState.selectedSpecs = Object.keys(AppState.userSpecs).reduce((acc, key) => {
                    acc[key] = AppState.userSpecs[key][0] || '';
                    return acc;
                }, {});
            }

            await this.loadFeedbackVector();
            this.renderTemplateUI();
            this.updatePromptDisplay();
            this.setupNavigation();
            this.setupImageUpload();
            this.setupGenerateButton();
        } catch (err) {
            UI.showMessage('template-status', window.i18n.t('errorLoadingTemplates') + ': ' + err.message, 'error');
            console.error('loadTemplates error:', err);
        }
    },

    async loadFeedbackVector() {
        if (!AppState.currentUser) return;
        const doc = await AppState.db.collection('users').doc(AppState.currentUser.uid).get();
        let vec = doc.data()?.feedbackVector;
        if (!vec) {
            vec = {};
            for (let i = 0; i < this.FEEDBACK_DIM; i++) vec[`dim${i}`] = 0;
        }
        AppState.feedbackVector = vec;
    },

    enrichPrompt(basePrompt) {
        if (!AppState.feedbackVector) return basePrompt;
        const token = Object.values(AppState.feedbackVector).map(v => v.toFixed(3)).join(',');
        return `${basePrompt} [STYLE_BIAS:${token}]`;
    },

    normalise(vec) {
        const keys = Object.keys(vec);
        let sumSq = keys.reduce((s, k) => s + vec[k] ** 2, 0);
        const norm = Math.sqrt(sumSq) || 1;
        keys.forEach(k => vec[k] /= norm);
        return vec;
    },

    renderTemplateUI() {
        const checkboxContainer = document.getElementById('template-checkboxes');
        if (checkboxContainer) {
            if (AppState.userRole === 'master') {
                checkboxContainer.innerHTML = `
                    <div>
${AppState.userTemplates
                            .map(
                                (template) => `
                                    <label>
                                        <input type="checkbox" value="${template}" checked>
${template.charAt(0).toUpperCase() + template.slice(1)}
                                        <button class="remove-template btn btn-secondary" data-template="${template}" data-i18n="remove">Remove</button>
                                    </label>
                                `
                            )
                            .join('')}
                    </div>
                `;
                document.getElementById('master-template-controls').classList.remove('hidden');
                document.getElementById('add-template')?.addEventListener('click', () => {
                    const newTemplate = document.getElementById('new-template').value.trim().toLowerCase();
                    if (newTemplate && !AppState.userTemplates.includes(newTemplate)) {
                        AppState.userTemplates.push(newTemplate);
                        this.renderTemplateUI();
                        this.updatePromptDisplay();
                        AppState.db.collection('users').doc(AppState.currentUser.uid).update({
                            template: AppState.userTemplates,
                        });
                        window.i18n.renderAll();
                    }
                });
                document.querySelectorAll('.remove-template').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        const template = btn.dataset.template;
                        AppState.userTemplates = AppState.userTemplates.filter((t) => t !== template);
                        this.renderTemplateUI();
                        this.updatePromptDisplay();
                        AppState.db.collection('users').doc(AppState.currentUser.uid).update({
                            template: AppState.userTemplates,
                        });
                        window.i18n.renderAll();
                    });
                });
            } else {
                checkboxContainer.innerHTML = AppState.userTemplates
                    .map(
                        (template) => `
                            <label>
                                <input type="checkbox" value="${template}" checked>
${template.charAt(0).toUpperCase() + template.slice(1)}
                            </label>
                        `
                    )
                    .join('');
            }
            checkboxContainer.querySelectorAll('input').forEach((cb) => {
                cb.addEventListener('change', () => this.updatePromptDisplay());
            });
        }

        const specContainer = document.getElementById('spec-selections');
        if (specContainer) {
            if (!AppState.userSpecs || Object.keys(AppState.userSpecs).length === 0) {
                specContainer.innerHTML = '';
            } else {
                specContainer.innerHTML = Object.entries(AppState.userSpecs)
                    .map(
                        ([key, values]) => `
                            <div class="form-group">
                                <label for="spec-select-${key}">
${key.charAt(0).toUpperCase() + key.slice(1)}
                                </label>
                                <select id="spec-select-${key}" data-spec-key="${key}">
${values.map((value) => `<option value="${value}">${value}</option>`).join('')}
                                </select>
                            </div>
                        `
                    )
                    .join('');
                specContainer.querySelectorAll('select').forEach((select) => {
                    select.addEventListener('change', (e) => {
                        AppState.selectedSpecs[e.target.dataset.specKey] = e.target.value;
                        this.updatePromptDisplay();
                    });
                });
            }
        }

        const productDisplay = document.getElementById('product-display');
        if (productDisplay && AppState.userProductName) {
            productDisplay.textContent = `${window.i18n.t('product')}: ${AppState.userProductName}`;
            UI.showElement('product-display');
        }

        this.updateGenerationCounter();
        window.i18n.renderAll();
    },

    setupNavigation() {
        document.querySelectorAll('.nav-links a').forEach((link) => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('onclick').match(/'([^']+)'/)[1];
                document.querySelectorAll('.nav-links a').forEach((l) => l.classList.remove('active'));
                link.classList.add('active');
                showPage(page);
            });
        });
    },

    // FIXED: Custom upload with file name + preview
    setupImageUpload() {
        const uploadInput1 = document.getElementById('reference-image-1');
        const uploadInput2 = document.getElementById('reference-image-2');
        const fileName1 = document.getElementById('file-name-1');
        const fileName2 = document.getElementById('file-name-2');
        const preview1 = document.getElementById('preview-image-1');
        const preview2 = document.getElementById('preview-image-2');
        const imagePreview = document.getElementById('image-preview');

        const updateFileName = (input, label) => {
            if (input.files && input.files[0]) {
                const name = input.files[0].name;
                label.textContent = name.length > 20 ? name.substring(0, 17) + '...' : name;
            } else {
                label.textContent = 'No file chosen';
            }
        };

        const handleImageChange = async (input, preview, label, index) => {
            input.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                updateFileName(input, label);

                if (file) {
                    if (!file.type.startsWith('image/')) {
                        UI.showMessage('template-status', window.i18n.t('invalidImage'), 'error');
                        return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                        UI.showMessage('template-status', window.i18n.t('imageTooLarge'), 'error');
                        return;
                    }

                    const reader = new FileReader();
                    reader.onload = (event) => {
                        preview.innerHTML = `<img src="${event.target.result}" alt="Reference Image ${index}" style="max-width: 150px; height: auto; border: 1px solid #ddd; border-radius: 4px;">`;
                        imagePreview.classList.remove('hidden');
                    };
                    reader.readAsDataURL(file);
                    await this.updateCombinedDescription();
                } else {
                    preview.innerHTML = '';
                    if (!uploadInput1.files[0] && !uploadInput2.files[0]) {
                        imagePreview.classList.add('hidden');
                    }
                }
            });
        };

        if (uploadInput1 && fileName1 && preview1) {
            handleImageChange(uploadInput1, preview1, fileName1, 1);
        }
        if (uploadInput2 && fileName2 && preview2) {
            handleImageChange(uploadInput2, preview2, fileName2, 2);
        }
    },

    async updateCombinedDescription() {
        const file1 = document.getElementById('reference-image-1').files[0];
        const file2 = document.getElementById('reference-image-2').files[0];
        const descriptionContainer = document.getElementById('image-description');
        const descriptionText = document.getElementById('combined-description-text');

        if (!file1 && !file2) {
            descriptionContainer.style.display = 'none';
            return;
        }

        try {
            const description = await this.generateCombinedDescription(file1, file2);
            descriptionText.textContent = description || window.i18n.t('noDescription');
            UI.showElement('image-description');
            this.updatePromptDisplay();
        } catch (err) {
            console.error('Error generating combined description:', err);
            UI.showMessage('template-status', window.i18n.t('descriptionError') + ': ' + err.message, 'error');
        }
    },

    async generateCombinedDescription(file1, file2) {
        let desc1 = file1 ? 'A vibrant scene with colorful elements' : '';
        let desc2 = file2 ? 'A minimalist design with clean lines' : '';

        if (desc1 && desc2) {
            return `This design combines ${desc1.toLowerCase()} with ${desc2.toLowerCase()}, blending vibrant colors with minimalist aesthetics.`;
        } else if (desc1) {
            return desc1;
        } else if (desc2) {
            return desc2;
        }
        return '';
    },

    setupGenerateButton() {
        const generateBtn = document.getElementById('generate-images-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', async () => {
                console.log('Generate button clicked');
                await this.generateImages();
            });
        } else {
            console.error('Generate images button not found');
        }
    },

    async generateImages() {
        if (AppState.generationCount >= AppState.creditLimit) {
            UI.showMessage('template-status', window.i18n.t('maxGeneration'), 'error');
            return;
        }

        const selectedTemplates = Array.from(
            document.querySelectorAll('#template-checkboxes input:checked')
        ).map((cb) => cb.value);

        if (!selectedTemplates.length || !AppState.userProductName) {
            UI.showMessage('template-status', window.i18n.t('selectTemplate'), 'error');
            return;
        }

        let prompt = `Generate a design for ${AppState.userProductName} in ${selectedTemplates.join(', ')} style`;
        if (AppState.selectedSpecs && Object.keys(AppState.selectedSpecs).length > 0) {
            const specs = Object.entries(AppState.selectedSpecs)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
            prompt += `, ${specs}`;
        }

        const descriptionText = document.getElementById('combined-description-text')?.textContent;
        if (descriptionText && descriptionText !== window.i18n.t('noDescription')) {
            prompt += ` based on: ${descriptionText}`;
        }

        prompt = this.enrichPrompt(prompt);
        UI.showMessage('template-status', window.i18n.t('generating', { model: 'AI' }), 'info');
        AppState.generationCount += 1;

        const feedbackRow = document.getElementById('image-feedback-row');
        if (feedbackRow) feedbackRow.classList.add('hidden');

        let image1, image2;
        try {
            const response = await window.ImageGenerator.generate(prompt, null);
            image1 = response.images[0];
            image2 = response.images[1];
            console.log('Images generated:', { image1, image2 });
        } catch (err) {
            UI.showMessage('template-status', window.i18n.t('generationError') + ': ' + err.message, 'error');
            console.error('Image generation error:', err);
            AppState.generationCount -= 1;
            const leftImage = document.getElementById('left-image');
            const rightImage = document.getElementById('right-image');
            if (leftImage) leftImage.innerHTML = '';
            if (rightImage) rightImage.innerHTML = '';
            return;
        }

        const timestamp = new Date().toISOString();
        AppState.generatedImages.push({ id: `img-${AppState.generationCount}-1`, url: image1, prompt, timestamp });
        AppState.generatedImages.push({ id: `img-${AppState.generationCount}-2`, url: image2, prompt, timestamp });
        await this.saveImagesToDB();

        if (window.ImageRenderer && typeof window.ImageRenderer.renderGeneratedImages === 'function') {
            window.ImageRenderer.renderGeneratedImages([
                { url: image1, provider: 'Stability' },
                { url: image2, provider: 'Stability' }
            ]);
            window.ImageRenderer.showGeneratedContent();
        } else {
            this.displayImages(image1, image2);
        }

        this.updateGenerationCounter();
        UI.showMessage('template-status', window.i18n.t('imagesGenerated'), 'success');
    },

    displayImages(image1, image2) {
        const leftImage = document.getElementById('left-image');
        const rightImage = document.getElementById('right-image');
        const feedbackRow = document.getElementById('image-feedback-row');

        if (leftImage && rightImage && feedbackRow) {
            leftImage.innerHTML = `<img src="${image1}" alt="${window.i18n.t('generatedLeftImage')}" class="loaded">`;
            rightImage.innerHTML = `<img src="${image2}" alt="${window.i18n.t('generatedRightImage')}" class="loaded">`;
            feedbackRow.classList.remove('hidden');
            this.setupFeedbackButtons(image1, image2);
        } else {
            console.error('Image containers or feedback row missing');
            UI.showMessage('template-status', 'Error displaying images: containers missing', 'error');
        }
        window.i18n.renderAll();
    },

    setupFeedbackButtons(image1, image2) {
        const feedbackRow = document.getElementById('image-feedback-row');
        if (!feedbackRow) return;

        const buttons = {
            'left-better': async () => {
                this._download(image1, 'left');
                await this.recordFeedback(true, false, false, image1, image2);
            },
            'right-better': async () => {
                this._download(image2, 'right');
                await this.recordFeedback(false, true, false, image1, image2);
            },
            'download-all': async () => {
                this._download(image1, 'left');
                setTimeout(() => this._download(image2, 'right'), 400);
                await this.recordFeedback(true, true, false, image1, image2);
            },
            'both-bad': async () => {
                if (AppState.badSelections >= AppState.maxBadSelections) {
                    UI.showMessage('template-status', window.i18n.t('maxBadSelections'), 'error');
                    return;
                }
                AppState.badSelections += 1;
                await this.recordFeedback(false, false, true, image1, image2);
                document.getElementById('left-image').innerHTML = '';
                document.getElementById('right-image').innerHTML = '';
                feedbackRow.classList.add('hidden');
                await this.generateImages();
            }
        };

        Object.keys(buttons).forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                document.getElementById(id).addEventListener('click', buttons[id]);
            }
        });
    },

    _download(url, side) {
        try {
            const a = document.createElement('a');
            a.href = url;
            a.download = `generated-${side}-${new Date().toISOString()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (err) {
            console.error('Download error:', err);
            UI.showMessage('template-status', 'Error downloading image', 'error');
        }
    },

    async recordFeedback(leftGood, rightGood, bothBad, url1, url2) {
        try {
            const getEmbedding = async (url) => {
                const mock = {};
                for (let i = 0; i < this.FEEDBACK_DIM; i++) mock[`dim${i}`] = (Math.random() - 0.5) * 0.2;
                return mock;
            };

            const emb1 = await getEmbedding(url1);
            const emb2 = await getEmbedding(url2);
            const v = AppState.feedbackVector;
            const lr = bothBad ? this.NEGATIVE_RATE : this.LEARNING_RATE;

            const update = (emb, sign) => {
                Object.keys(emb).forEach(k => {
                    v[k] = (v[k] || 0) + sign * lr * emb[k];
                });
            };

            if (leftGood) update(emb1, +1);
            if (rightGood) update(emb2, +1);
            if (bothBad) {
                update(emb1, -1);
                update(emb2, -1);
            }

            this.normalise(v);
            AppState.feedbackVector = v;

            const historyEntry = { ts: new Date().toISOString(), left: leftGood, right: rightGood, bothBad };
            await AppState.db.collection('users').doc(AppState.currentUser.uid).update({
                feedbackVector: v,
                feedbackHistory: firebase.firestore.FieldValue.arrayUnion(historyEntry),
                badSelections: AppState.badSelections
            });

            const indicator = document.getElementById('learning-indicator');
            if (indicator) {
                indicator.classList.remove('hidden');
                setTimeout(() => indicator.classList.add('hidden'), 1200);
            }
        } catch (err) {
            console.error('Error recording feedback:', err);
            UI.showMessage('template-status', 'Error recording feedback: ' + err.message, 'error');
        }
    },

    async saveImagesToDB() {
        if (AppState.currentUser) {
            try {
                await AppState.db
                    .collection('users')
                    .doc(AppState.currentUser.uid)
                    .update({ generatedImages: AppState.generatedImages });
                console.log('Images saved to DB');
            } catch (err) {
                console.error('Error saving images:', err);
                UI.showMessage('template-status', window.i18n.t('errorSavingImages'), 'error');
            }
        }
    },

    updatePromptDisplay() {
        const selectedTemplates = Array.from(
            document.querySelectorAll('#template-checkboxes input:checked')
        ).map((cb) => cb.value);

        let extra = '';
        if (AppState.userSpecs && Object.keys(AppState.selectedSpecs).length > 0) {
            extra = Object.entries(AppState.selectedSpecs)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
            if (extra) extra = ', ' + extra;
        }

        const promptDisplay = document.getElementById('prompt-display');
        if (promptDisplay) {
            if (selectedTemplates.length > 0 && AppState.userProductName) {
                let prompt = `Generate a design for ${AppState.userProductName} in ${selectedTemplates.join(', ')} style${extra}`;
                const descriptionText = document.getElementById('combined-description-text')?.textContent;
                if (descriptionText && descriptionText !== window.i18n.t('noDescription')) {
                    prompt += ` based on: ${descriptionText}`;
                }
                promptDisplay.textContent = prompt;
            } else if (!AppState.userProductName) {
                promptDisplay.textContent = window.i18n.t('setProductName');
            } else {
                promptDisplay.textContent = window.i18n.t('selectTemplate');
            }
            UI.showElement('prompt-display');
        }
    },

    updateGenerationCounter() {
        const counter = document.getElementById('generation-counter');
        if (counter) {
            counter.textContent = `Generations: ${AppState.generationCount}/${AppState.creditLimit}`;
        }
    },

    showGeneratedContent() {
        const container = document.getElementById('generated-images');
        const row = document.getElementById('image-feedback-row');
        const indicator = document.getElementById('learning-indicator');

        if (container && row && indicator) {
            container.classList.remove('hidden');
            row.classList.remove('hidden');
            indicator.classList.remove('hidden');
            window.i18n.renderAll();
        }
    }
};

window.TemplateManager = TemplateManager;