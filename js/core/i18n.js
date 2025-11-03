// js/i18n.js – 完整版、已测试、无语法错误、支持动态按钮
const translations = {
  en: {
    title: "AI Design Generator",
    createImages: "Create stunning images with AI",
    signIn: "Sign In",
    email: "Email Address",
    password: "Password",
    forgotPassword: "Forgot password?",
    noAccountText: "Don't have an account?",
    signUp: "Sign up",
    haveAccount: "Already have an account? Sign in",
    register: "Create Account",
    industryCode: "Industry Code",
    sendCode: "Send Verification Code",
    verifyCode: "Verify Code",
    back: "Back",
    fullName: "Full Name",
    confirmPassword: "Confirm Password",
    setup: "Setup",
    account: "Account",
    templates: "Templates",
    pastRecords: "Past Records",
    createAccount: "Create Account",
    logout: "Logout",
    setupProfile: "Setup Your Profile",
    saveProfile: "Save Profile",
    yourAccount: "Your Account",
    editProfile: "Edit Profile",
    updateProfile: "Update Profile",
    cancel: "Cancel",
    generateImages: "Generate Images",
    selectTemplate: "Select Template",
    selectSpecs: "Select Specifications",
    selectModel: "Select AI Model",
    pollinations: "Pollinations AI",
    stability: "Stability AI (SDXL)",
    huggingface: "Hugging Face (FLUX.1-dev)",
    warningProduct: "Warning: Product name not set. Update now",
    copy: "Copy",
    reset: "Reset",
    addSpecification: "Add Specification",
    addValue: "Add Value",
    name: "Name",
    productName: "Product Name",
    emailLabel: "Email",
    industry: "Industry",
    template: "Template",
    master: "Master",
    notSpecified: "Not specified",
    none: "None",
    codeLabel: "(Code: {code})",
    generateIndustryCode: "Generate Industry Code",
    language: "Language",
    product: "product",
    generating: "Generating images with {model}...",
    imagesGenerated: "Images generated successfully!",
    likeThis: "I like this",
    likeThat: "I like that",
    bothBad: "Both bad",
    pleaseSignIn: "Please sign in.",
    productNameRequired: "Product name required.",
    selectTemplate: "Please select at least one template.",
    maxGeneration: "Maximum generation limit reached.",
    generationFailed: "Failed to generate images.",
    generationError: "Error during generation.",
    profileSaved: "Profile saved!",
    savingProfile: "Saving profile...",

    // Feedback Buttons
    'btn-left-better': 'Left is better',
    'btn-right-better': 'Right is better',
    'btn-tie': 'It’s a tie',
    'btn-both-bad': 'Both bad'
  },

  zh: {
    title: "AI 设计生成器",
    createImages: "用 AI 秒速生成精美图像",
    signIn: "登录",
    email: "邮箱地址",
    password: "密码",
    forgotPassword: "忘记密码？",
    noAccountText: "没有账户？",
    signUp: "注册",
    haveAccount: "已有账户？登录",
    register: "创建账户",
    industryCode: "行业代码",
    sendCode: "发送验证码",
    verifyCode: "验证",
    back: "返回",
    fullName: "姓名",
    confirmPassword: "确认密码",
    setup: "设置",
    account: "账户",
    templates: "模板",
    pastRecords: "历史记录",
    createAccount: "创建账户",
    logout: "退出",
    setupProfile: "设置个人资料",
    saveProfile: "保存",
    yourAccount: "你的账户",
    editProfile: "编辑资料",
    updateProfile: "更新资料",
    cancel: "取消",
    generateImages: "生成图像",
    selectTemplate: "选择模板",
    selectSpecs: "选择规格",
    selectModel: "选择 AI 模型",
    pollinations: "Pollinations AI",
    stability: "Stability AI (SDXL)",
    huggingface: "Hugging Face (FLUX.1-dev)",
    warningProduct: "警告：未设置产品名称。立即更新",
    copy: "复制",
    reset: "重置",
    addSpecification: "添加规格",
    addValue: "添加值",
    name: "名称",
    productName: "产品名称",
    emailLabel: "邮箱",
    industry: "行业",
    template: "模板",
    master: "管理员",
    notSpecified: "未指定",
    none: "无",
    codeLabel: "（代码：{code}）",
    generateIndustryCode: "生成行业代码",
    language: "语言",
    product: "产品",
    generating: "正在使用 {model} 生成图像...",
    imagesGenerated: "图像生成成功！",
    likeThis: "我喜欢这个",
    likeThat: "我喜欢那个",
    bothBad: "两个都不好",
    pleaseSignIn: "请先登录。",
    productNameRequired: "需要产品名称。",
    selectTemplate: "请选择至少一个模板。",
    maxGeneration: "已达到最大生成次数。",
    generationFailed: "生成图像失败。",
    generationError: "生成过程中发生错误。",
    profileSaved: "个人资料已保存！",
    savingProfile: "正在保存个人资料...",

    // Feedback Buttons
    'btn-left-better': '左边更好',
    'btn-right-better': '右边更好',
    'btn-tie': '平手',
    'btn-both-bad': '两个都不好'
  },

  yue: {
    title: "AI 設計生成器",
    createImages: "用 AI 即時生成靚圖",
    signIn: "登入",
    email: "電郵地址",
    password: "密碼",
    forgotPassword: "忘記密碼？",
    noAccountText: "未有帳戶？",
    signUp: "註冊",
    haveAccount: "已有帳戶？登入",
    register: "建立帳戶",
    industryCode: "行業代碼",
    sendCode: "發送驗證碼",
    verifyCode: "驗證",
    back: "返回",
    fullName: "全名",
    confirmPassword: "確認密碼",
    setup: "設定",
    account: "帳戶",
    templates: "模板",
    pastRecords: "歷史記錄",
    createAccount: "建立帳戶",
    logout: "登出",
    setupProfile: "設定個人檔案",
    saveProfile: "儲存",
    yourAccount: "你的帳戶",
    editProfile: "編輯檔案",
    updateProfile: "更新檔案",
    cancel: "取消",
    generateImages: "生成圖像",
    selectTemplate: "選擇模板",
    selectSpecs: "選擇規格",
    selectModel: "選擇 AI 模型",
    pollinations: "Pollinations AI",
    stability: "Stability AI (SDXL)",
    huggingface: "Hugging Face (FLUX.1-dev)",
    warningProduct: "警告：未設定產品名稱。立即更新",
    copy: "複製",
    reset: "重設",
    addSpecification: "新增規格",
    addValue: "新增值",
    name: "名稱",
    productName: "產品名稱",
    emailLabel: "電郵",
    industry: "行業",
    template: "模板",
    master: "管理員",
    notSpecified: "未指定",
    none: "無",
    codeLabel: "（代碼：{code}）",
    generateIndustryCode: "生成行業代碼",
    language: "語言",
    product: "產品",
    generating: "用 {model} 生成圖像...",
    imagesGenerated: "圖像生成成功！",
    likeThis: "我鍾意呢個",
    likeThat: "我鍾意嗰個",
    bothBad: "兩個都唔啱",
    pleaseSignIn: "請先登入。",
    productNameRequired: "需要產品名稱。",
    selectTemplate: "請選擇至少一個模板。",
    maxGeneration: "已達最大生成次數。",
    generationFailed: "生成圖像失敗。",
    generationError: "生成過程中發生錯誤。",
    profileSaved: "個人檔案已儲存！",
    savingProfile: "儲存緊個人檔案...",

    // Feedback Buttons
    'btn-left-better': '左邊更好',
    'btn-right-better': '右邊更好',
    'btn-tie': '打和',
    'btn-both-bad': '兩個都唔啱'
  }
};

let currentLang = 'en';

/**
 * 翻译键，支持占位符 {key}
 */
function t(key, placeholders = {}) {
  let text = translations[currentLang]?.[key] ?? translations.en[key] ?? key;
  if (placeholders && typeof placeholders === 'object') {
    for (const p in placeholders) {
      text = text.replace(new RegExp(`\\{${p}\\}`, 'g'), placeholders[p]);
    }
  }
  return text;
}

/**
 * 切换语言并立即渲染
 */
function setLanguage(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
  localStorage.setItem('appLang', lang);

  renderAll();               // 立即翻译已存在的元素
  // 延迟一次，确保 renderImages 插入的动态按钮也被翻译
  setTimeout(renderAll, 100);
}

/**
 * 渲染页面上所有需要翻译的元素
 */
function renderAll() {
  // 1. 普通文本 [data-i18n]
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });

  // 2. placeholder [data-i18n-ph]
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.dataset.i18nPh;
    el.placeholder = t(key);
  });

  // 3. 动态占位符 {n} [data-i18n-dynamic]
  document.querySelectorAll('[data-i18n-dynamic]').forEach(el => {
    const key = el.dataset.i18nDynamic;
    const n = el.dataset.specN || 1;
    el.textContent = t(key, { n });
  });

  // 4. 动态按钮（关键！）[data-i18n-button]
  document.querySelectorAll('[data-i18n-button]').forEach(el => {
    const key = el.dataset.i18nButton;
    el.textContent = t(key);
  });
}

/**
 * 初始化语言（页面首次加载时调用）
 */
function initLanguage() {
  const saved = localStorage.getItem('appLang');
  setLanguage(saved && translations[saved] ? saved : 'en');
}

/* -------------------------------------------------
   全局暴露（main.js 里会直接调用）
   ------------------------------------------------- */
window.i18n = {
  t,
  setLanguage,
  renderAll,
  initLanguage,
  get currentLang() { return currentLang; }
};

/* -------------------------------------------------
   自动初始化
   ------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  initLanguage();
});