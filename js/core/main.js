function waitForGlobal(name, timeout = 5000) {
    return new Promise((resolve, reject) => {
        try {
            if (window[name]) {
                console.log(`${name} found immediately`);
                return resolve(window[name]);
            }
            const start = Date.now();
            const iv = setInterval(() => {
                if (window[name]) {
                    clearInterval(iv);
                    console.log(`${name} found after ${Date.now() - start}ms`);
                    return resolve(window[name]);
                }
                if (Date.now() - start > timeout) {
                    clearInterval(iv);
                    console.error(`${name} not found after ${timeout}ms`);
                    return reject(new Error(`${name} not found after ${timeout}ms`));
                }
            }, 50);
        } catch (err) {
            console.error(`Error in waitForGlobal for ${name}:`, err);
            reject(err);
        }
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    console.log("DOM loaded, initializing app...");
    try {
        await waitForGlobal("AppConfig");
        console.log("AppConfig ready");
        await waitForGlobal("AppState");
        console.log("AppState ready");
        if (window.emailjs && window.AppConfig && window.AppConfig.emailjs) {
            try {
                emailjs.init(window.AppConfig.emailjs.publicKey);
                console.log("EmailJS initialized");
            } catch (e) {
                console.warn("EmailJS init failed (continuing without it):", e);
            }
        } else {
            console.warn("emailjs or AppConfig.emailjs not present; skipping emailjs.init");
        }
        if (window.i18n && typeof window.i18n.initLanguage === "function") {
            window.i18n.initLanguage();
        }
        const mainApp = document.getElementById("main-app");
        if (mainApp) {
            mainApp.style.display = "none";
        }
        if (AppState && AppState.auth && typeof AppState.auth.onAuthStateChanged === "function") {
            AppState.auth.onAuthStateChanged(async (user) => {
                console.log("onAuthStateChanged fired, user:", user ? user.email : "null");
                if (user) {
                    console.log("User signed in:", user.email);
                    AppState.currentUser = user;
                    let userData = null;
                    try {
                        if (AppState.db && typeof AppState.db.collection === "function") {
                            const doc = await AppState.db.collection("users").doc(user.uid).get();
                            if (doc.exists) {
                                userData = doc.data();
                            }
                        }
                    } catch (e) {
                        console.warn("Could not read user document from Firestore:", e);
                    }
                    userData = userData || {
                        productName: "",
                        template: null,
                        specifications: {},
                        feedbackVector: null,
                        badSelections: 0,
                        role: null
                    };
                    AppState.userRole = userData.role || null;
                    AppState.userProductName = userData.productName || "";
                    AppState.userTemplates = userData.template ? [userData.template] : [];
                    AppState.userSpecs = userData.specifications || {};
                    AppState.feedbackVector = userData.feedbackVector || null;
                    AppState.badSelections = userData.badSelections || 0;
                    AppState.generatedImages = userData.generatedImages || [];
                    if (window.UI && typeof window.UI.showMainApp === "function") {
                        UI.showMainApp();
                        UI.toggleMasterUI(AppState.userRole === "master" || AppState.userRole === "admin");
                    }
                    const masterNavLink = document.getElementById("master-nav-link");
                    if ((AppState.userRole === "master" || AppState.userRole === "admin") && masterNavLink) {
                        masterNavLink.style.display = "inline-block";
                    }
                    window.currentUserData = userData;
                    console.log("Showing template page...");
                    if (typeof window.showPage === "function") {
                        showPage("template-page");
                    }
                } else {
                    console.log("User signed out");
                    AppState.currentUser = null;
                    AppState.userRole = null;
                    AppState.userProductName = null;
                    AppState.generationCount = 0;
                    AppState.feedbackVector = null;
                    AppState.badSelections = 0;
                    AppState.generatedImages = [];
                    if (window.UI && typeof window.UI.showAuth === "function") {
                        UI.showAuth();
                    }
                    if (window.UI && typeof window.UI.showLogin === "function") {
                        UI.showLogin();
                    }
                }
                if (window.i18n && typeof window.i18n.renderAll === "function") {
                    window.i18n.renderAll();
                }
            });
        } else {
            console.warn("AppState.auth not ready or not a Firebase auth instance.");
            throw new Error("Firebase auth not initialized");
        }
        setupEventListeners();
        console.log("App initialization complete");
    } catch (err) {
        console.error("Initialization error:", err);
        UI.showMessage("template-status", "Failed to initialize app: " + err.message, "error");
    }
});

function setupEventListeners() {
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (window.Auth && typeof window.Auth.login === "function") {
                await Auth.login();
            }
        });
    }
    const switchToRegister = document.getElementById("switch-to-register");
    if (switchToRegister) {
        switchToRegister.addEventListener("click", (e) => {
            e.preventDefault();
            if (window.UI && typeof window.UI.showRegister === "function") {
                UI.showRegister();
            }
        });
    }
    const switchToLogin = document.getElementById("switch-to-login");
    if (switchToLogin) {
        switchToLogin.addEventListener("click", (e) => {
            e.preventDefault();
            if (window.UI && typeof window.UI.showLogin === "function") {
                UI.showLogin();
            }
        });
    }
    const sendCodeBtn = document.getElementById("send-code-btn");
    if (sendCodeBtn) {
        sendCodeBtn.addEventListener("click", async () => {
            if (window.Registration && typeof window.Registration.sendVerificationCode === "function") {
                await Registration.sendVerificationCode();
            }
        });
    }
    const verifyCodeBtn = document.getElementById("verify-code-btn");
    if (verifyCodeBtn) {
        verifyCodeBtn.addEventListener("click", () => {
            if (window.Registration && typeof window.Registration.verifyCode === "function") {
                Registration.verifyCode();
            }
        });
    }
    const backToStep1 = document.getElementById("back-to-step1");
    if (backToStep1) {
        backToStep1.addEventListener("click", () => {
            UI.showElement("register-step1");
            UI.hideElement("register-step2");
        });
    }
    const backToStep2 = document.getElementById("back-to-step2");
    if (backToStep2) {
        backToStep2.addEventListener("click", () => {
            UI.showElement("register-step2");
            UI.hideElement("register-step3");
        });
    }
    const registerForm = document.getElementById("register-form");
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (window.Registration && typeof window.Registration.completeRegistration === "function") {
                await Registration.completeRegistration();
            }
        });
    }
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            if (window.Auth && typeof window.Auth.logout === "function") {
                await Auth.logout();
            }
        });
    }
    const forgotPasswordLink = document.getElementById("reset-password-link");
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener("click", async (e) => {
            e.preventDefault();
            if (window.Password && typeof window.Password.sendResetEmail === "function") {
                const email = document.getElementById("login-email").value;
                const result = await Password.sendResetEmail(email);
                UI.showMessage("login-msg", result.message || result.error, result.success ? "success" : "error");
            }
        });
    }
    const editAccountBtn = document.getElementById("edit-account-btn");
    if (editAccountBtn) {
        editAccountBtn.addEventListener("click", () => {
            if (window.Profile && typeof window.Profile.showEditAccount === "function") {
                Profile.showEditAccount();
            }
        });
    }
    const accountForm = document.getElementById("account-form");
    if (accountForm) {
        accountForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (window.Profile && typeof window.Profile.updateAccount === "function") {
                await Profile.updateAccount();
            }
        });
    }
    const cancelEditBtn = document.getElementById("cancel-edit");
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener("click", () => {
            if (window.Profile && typeof window.Profile.cancelEdit === "function") {
                Profile.cancelEdit();
            }
        });
    }
    const generateBtn = document.getElementById("generate-images-btn");
    if (generateBtn) {
        generateBtn.addEventListener("click", async () => {
            if (window.TemplateManager && typeof window.TemplateManager.generateImages === "function") {
                await TemplateManager.generateImages(null);
            }
        });
    }
    const createAccountForm = document.getElementById("create-account-form");
    if (createAccountForm) {
        createAccountForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (window.IndustryCodeManager && typeof window.IndustryCodeManager.createIndustryCode === "function") {
                await IndustryCodeManager.createIndustryCode();
            }
        });
    }
    console.log("Event listeners setup complete");
}

function showPage(pageId) {
    console.log("showPage called with:", pageId);
    const pages = ["account-page", "template-page", "records-page", "create-account-page", "client-management-section"];
    pages.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add("hidden");
            el.style.display = "none";
            console.log(`Hidden ${id}`);
        }
    });
    const targetSection = document.getElementById(pageId);
    if (targetSection) {
        if (pageId === "create-account-page" && AppState.userRole !== "master" && AppState.userRole !== "admin") {
            UI.showMessage("template-status", window.i18n.t("pleaseSignIn"), "error");
            pageId = "template-page";
            targetSection = document.getElementById(pageId);
        }
        if (targetSection) {
            targetSection.classList.remove("hidden");
            targetSection.style.setProperty("display", "block", "important");
            console.log(`Showing ${pageId}`);
            switch (pageId) {
                case "account-page":
                    if (window.Profile && typeof window.Profile.loadAccountInfo === "function") {
                        window.Profile.loadAccountInfo();
                    }
                    break;
                case "records-page":
                    if (window.RecordManager && typeof window.RecordManager.loadRecords === "function") {
                        window.RecordManager.loadRecords();
                    }
                    break;
                case "template-page":
                    if (window.TemplateManager && typeof window.TemplateManager.loadTemplates === "function") {
                        window.TemplateManager.loadTemplates();
                    }
                    break;
                case "create-account-page":
                    if (window.IndustryCodeManager && typeof window.IndustryCodeManager.initCreateAccountForm === "function") {
                        window.IndustryCodeManager.initCreateAccountForm();
                    }
                    break;
                case "client-management-section":
                    if (window.ClientManagement && typeof window.ClientManagement.init === "function") {
                        window.ClientManagement.init();
                    }
                    break;
            }
            if (window.i18n && typeof window.i18n.renderAll === "function") {
                window.i18n.renderAll();
            }
        }
    } else {
        console.error(`Section ${pageId} not found`);
    }
}

function handleLogout() {
    if (window.Auth && typeof window.Auth.logout === "function") {
        Auth.logout();
    }
}

window.showPage = showPage;
window.addValue = function (specId) {
    if (window.IndustryCodeManager && typeof window.IndustryCodeManager.addValue === "function") {
        IndustryCodeManager.addValue(specId);
    }
};
window.copyCode = function () {
    if (window.IndustryCodeManager && typeof window.IndustryCodeManager.copyCode === "function") {
        IndustryCodeManager.copyCode();
    }
};
window.handleLogout = handleLogout;