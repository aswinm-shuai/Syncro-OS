import { auth } from '../config/firebase.js';
import { onAuthStateChanged, signOut as fbSignOut } from "firebase/auth";

/**
 * Listen to global authentication state changes.
 * @param {Function} callback - Triggers with user object or null.
 */
export const subscribeAuthState = (callback) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Sign out the current user.
 */
export const signOut = async () => {
  try {
    await fbSignOut(auth);
  } catch (error) {
    console.error("SignOut Error", error);
    throw error;
  }
};
