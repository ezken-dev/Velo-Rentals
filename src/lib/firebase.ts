import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyACSIeO2UQykkgVNrCvFMsDL_unJKrOx8o",
  authDomain: "velo-rentals.firebaseapp.com",
  projectId: "velo-rentals",
  storageBucket: "velo-rentals.firebasestorage.app",
  messagingSenderId: "942019543292",
  appId: "1:942019543292:web:34a2cf72818cd230d45779",
  measurementId: "G-6MW8NHWD88"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});
export const storage = getStorage(app);

// Initialize analytics only in browser environment
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error: any) {
    // If user not found, we create the admin account 
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        return result.user;
      } catch (e) {
        console.error("Error creating user:", e);
        throw e;
      }
    }
    console.error("Error signing in with email:", error);
    throw error;
  }
};

