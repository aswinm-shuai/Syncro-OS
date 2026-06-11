import { db } from '../config/firebase.js';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const COLLECTION_NAME = 'expenses';

/**
 * Get all documents from the expenses collection.
 * @returns {Promise<Array>}
 */
export const getAll = async () => {
  const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Get a specific document by ID.
 * @param {string} id 
 * @returns {Promise<Object|null>}
 */
export const getById = async (id) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

/**
 * Create a new document with an explicit or generated ID.
 * @param {string} id 
 * @param {Object} data 
 */
export const create = async (id, data) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  await setDoc(docRef, data);
};

/**
 * Update an existing document.
 * @param {string} id 
 * @param {Object} data 
 */
export const update = async (id, data) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, data);
};

/**
 * Delete a document by ID.
 * @param {string} id 
 */
export const remove = async (id) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
};
