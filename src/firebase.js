
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD8vn42voHwLuR8L1Jp57SkS-2mShVwqnY",
  authDomain: "verbal-test-c52b4.firebaseapp.com",
  projectId: "verbal-test-c52b4",
  storageBucket: "verbal-test-c52b4.firebasestorage.app",
  messagingSenderId: "507102437065",
  appId: "1:507102437065:web:b13f78ce137303ad4ab718",
  measurementId: "G-8RHYBB3QN6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Export the app instance
export default app;