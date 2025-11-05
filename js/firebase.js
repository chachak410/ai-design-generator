// Initialize Firebase
function initFirebase() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(window.AppConfig.firebase);
            
            // Initialize Firestore
            const db = firebase.firestore();
            window.db = db; // Make it globally available
            
            // Initialize Analytics if needed
            if (typeof firebase.analytics === 'function') {
                const analytics = firebase.analytics();
                window.analytics = analytics;
            }
            
            console.log('Firebase initialized successfully');
            return true;
        }
    } catch (error) {
        console.error('Firebase initialization error:', error);
        return false;
    }
}

initFirebase();