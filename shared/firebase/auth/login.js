import { auth } from '../config/firebase.js';
import { signInWithEmailAndPassword } from "firebase/auth";

/**
 * Authenticate a user with email and password.
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<Object>} user credential
 */
export const loginWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Login Error", error);
    throw error;
  }
};
