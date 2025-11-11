if (typeof window.AppConfig === "undefined") {
    console.error("AppConfig not defined. Ensure AppConfig is loaded before js/core/state.js");
} else if (typeof firebase !== "undefined") {
    if (!firebase.apps.length) {
        firebase.initializeApp(window.AppConfig.firebase);
        console.log("Firebase initialized in state.js");
    } else {
        console.log("Firebase already initialized, skipping in state.js");
    }
    window.AppState = {
        auth: firebase.auth(),
        db: firebase.firestore(),
        currentUser: null,
        userRole: null,
        userProductName: null,
        userTemplates: ['modern', 'minimalist'], // Default templates for testing
        userSpecs: {},
        selectedSpecs: {},
        generationCount: 0,
        feedbackVector: null,
        badSelections: 0,
        maxBadSelections: 10,
        creditLimit: 20,
        generatedImages: []
    };
} else {
    console.error("Firebase SDK not loaded. Ensure Firebase scripts are included in index.html");
    window.AppState = {
        auth: null,
        db: null,
        currentUser: null,
        userRole: null,
        userProductName: null,
        userTemplates: ['modern', 'minimalist'], // Default templates for testing
        userSpecs: {},
        selectedSpecs: {},
        generationCount: 0,
        feedbackVector: null,
        badSelections: 0,
        maxBadSelections: 10,
        creditLimit: 20,
        generatedImages: []
    };
}