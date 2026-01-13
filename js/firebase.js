// firebase.js - Firebase configuration and initialization
// IMPORTANT: Replace with your Firebase config from Step 5

// Your Firebase configuration (REPLACE WITH YOURS)
const firebaseConfig = {
    apiKey: "AIzaSyBp6oZ6FjC9kLx7k8t9pQqRstUvWXyZabc",
    authDomain: "freelance-cms-12345.firebaseapp.com",
    projectId: "freelance-cms-12345",
    storageBucket: "freelance-cms-12345.appspot.com",
    messagingSenderId: "987654321098",
    appId: "1:987654321098:web:abcdef1234567890"
};

// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export Firebase services to use in other modules
export { auth, db };
