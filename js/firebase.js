function initFirebase() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(window.AppConfig.firebase);
            console.log("Firebase initialized successfully in firebase.js");
            firebase.analytics();
        } else {
            console.log("Firebase already initialized, skipping in firebase.js");
        }
        window.AppState = window.AppState || {};
        window.AppState.auth = firebase.auth();
        window.AppState.db = firebase.firestore();
    } catch (error) {
        console.error("Firebase initialization error:", error);
        throw error;
    }
}

if (typeof window.AppConfig !== "undefined" && typeof firebase !== "undefined") {
    initFirebase();
} else {
    console.error("AppConfig or firebase not defined. Ensure AppConfig is loaded and Firebase SDKs are included.");
}