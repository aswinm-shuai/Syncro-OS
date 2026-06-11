import { db } from '../config/firebase.js';
import { writeBatch, doc } from 'firebase/firestore';

/**
 * Commit a batch of updates to a collection.
 * @param {string} collectionName 
 * @param {Array<Object>} updates - Array of objects containing {id, data}
 */
export const batchUpdate = async (collectionName, updates) => {
  const batch = writeBatch(db);
  updates.forEach(update => {
    const ref = doc(db, collectionName, update.id);
    batch.update(ref, update.data);
  });
  await batch.commit();
};

/**
 * Maps a Firestore snapshot directly to an array of objects.
 * @param {Object} snapshot 
 * @returns {Array<Object>}
 */
export const mapSnapshot = (snapshot) => {
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
