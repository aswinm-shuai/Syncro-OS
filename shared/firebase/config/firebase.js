import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

/**
 * Firebase Configuration
 * Replace with your actual Firebase project configuration.
 */
const firebaseConfig = {
  apiKey: "AIzaSyAURk8Q9mfDWnmY6Jy3c8KwQkqYjgx9Ns4",
  authDomain: "syncro-os.firebaseapp.com",
  projectId: "syncro-os",
  storageBucket: "syncro-os.firebasestorage.app",
  messagingSenderId: "968033119456",
  appId: "1:968033119456:web:c5fa44d174063160b53485",
  measurementId: "G-70MKY5497X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
