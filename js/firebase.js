// firebase.js - Firebase configuration and initialization
// IMPORTANT: Replace with your Firebase config from Step 5

// Your Firebase configuration (REPLACE WITH YOURS)
const firebaseConfig = {
  apiKey: "AIzaSyC6WfTFTfPIBwF8ChfWoL6w4gBLirSyIs8",
  authDomain: "freelance-cms-akms.firebaseapp.com",
  projectId: "freelance-cms-akms",
  storageBucket: "freelance-cms-akms.firebasestorage.app",
  messagingSenderId: "680498811198",
  appId: "1:680498811198:web:a2d0f87de2eed8a7f1dc6f"
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
