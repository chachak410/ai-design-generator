// js/i18n.js
const i18n = {
  currentLang: 'en',
  translations: {
    en: {
      pleaseSignIn: 'Please sign in to continue.',
      productNameRequired: 'Product name is required (at least 2 characters).',
      selectTemplate: 'Please select at least one template.',
      maxGeneration: 'You have reached the maximum of 20 generations.',
      generating: 'Generating images with {model}...',
      imagesGenerated: 'Images generated successfully!',
      generationError: 'Failed to generate images. Please try again.',
      generationFailed: 'Only one image was generated. Please try again.',
      likeThis: 'Like This',
      likeThat: 'Like That',
      bothBad: 'Both Bad',
      feedbackThanks: 'Thank you for your feedback!',
      profileNotFound: 'Profile not found. Please set up your profile.',
      updateNow: 'Update now',
      loadTemplatesError: 'Failed to load templates'
    },
    yue: {
      pleaseSignIn: '請先登入以繼續。',
      productNameRequired: '產品名稱必須填寫（至少 2 個字）。',
      selectTemplate: '請至少選擇一個模板。',
      maxGeneration: '您已達到 20 次生成上限。',
      generating: '正在使用 {model} 生成圖片...',
      imagesGenerated: '圖片生成成功！',
      generationError: '生成圖片失敗，請重試。',
      generationFailed: '只生成了一張圖片，請重試。',
      likeThis: '喜歡這張',
      likeThat: '喜歡那張',
      bothBad: '兩張都不喜歡',
      feedbackThanks: '感謝您的反饋！',
      profileNotFound: '未找到個人資料，請先設定。',
      updateNow: '立即更新',
      loadTemplatesError: '載入模板失敗'
    },
    zh: {
      pleaseSignIn: '请先登录以继续。',
      productNameRequired: '产品名称必须填写（至少 2 个字）。',
      selectTemplate: '请至少选择一个模板。',
      maxGeneration: '您已达到 20 次生成上限。',
      generating: '正在使用 {model} 生成图片...',
      imagesGenerated: '图片生成成功！',
      generationError: '生成图片失败，请重试。',
      generationFailed: '只生成了一张图片，请重试。',
      likeThis: '喜欢这张',
      likeThat: '喜欢那张',
      bothBad: '两张都不喜欢',
      feedbackThanks: '感谢您的反馈！',
      profileNotFound: '未找到个人资料，请先设置。',
      updateNow: '立即更新',
      loadTemplatesError: '加载模板失败'
    }
  },

  t(key) {
    return this.translations[this.currentLang][key] || this.translations['en'][key] || key;
  },

  setLanguage(lang) {
    if (this.translations[lang]) {
      this.currentLang = lang;
      localStorage.setItem('lang', lang);
      this.renderAll();
    }
  },

  initLanguage() {
    const saved = localStorage.getItem('lang');
    const browserLang = navigator.language || navigator.userLanguage;
    const lang = saved || (browserLang.includes('zh') ? (browserLang.includes('HK') || browserLang.includes('TW') ? 'yue' : 'zh') : 'en');
    this.setLanguage(lang);
  },

  renderAll() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = this.t(key);
    });
  }
};

// 导出供 main.js 使用
window.i18n = i18n;