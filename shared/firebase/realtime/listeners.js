import { db } from '../config/firebase.js';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';

/**
 * Generic Realtime Listener for a Collection
 * @param {string} collectionName 
 * @param {Function} callback - Called with an array of documents whenever data changes.
 * @returns {Function} Unsubscribe function
 */
export const subscribeCollection = (collectionName, callback) => {
  const q = query(collection(db, collectionName));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  });
};

/**
 * Subscribe to a collection with specific conditions (example).
 */
export const subscribeWithFilters = (collectionName, field, operator, value, callback) => {
  const q = query(collection(db, collectionName), where(field, operator, value));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  });
};
