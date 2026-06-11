import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, where } from "firebase/firestore";
import { db } from "../firebase/config.js";

// Mock Fallback for Local Development without Firebase Keys
const MOCK_DB_KEY = "srisoengkem_mock_db";

function getMockDb() {
  const data = localStorage.getItem(MOCK_DB_KEY);
  return data ? JSON.parse(data) : {
    products: [], transactions: [], orders: [], customers: [], 
    ingredients: [], recipes: [], expenses: [], procurement: [], audit_logs: []
  };
}
function saveMockDb(data) {
  localStorage.setItem(MOCK_DB_KEY, JSON.stringify(data));
}

// Generate unique ID for mock
const generateId = () => Math.random().toString(36).substr(2, 9);

export const dbService = {
  // Listen to a collection (Realtime)
  listenCollection: (colName, callback) => {
    if (db) {
      const q = query(collection(db, colName));
      return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(data);
      });
    } else {
      // Mock Realtime via interval
      console.log(`[Mock] Listening to ${colName}`);
      callback(getMockDb()[colName] || []);
      const interval = setInterval(() => {
        callback(getMockDb()[colName] || []);
      }, 2000);
      return () => clearInterval(interval); // Return unsubscribe function
    }
  },

  // Add Document
  addDocument: async (colName, data) => {
    if (db) {
      return await addDoc(collection(db, colName), data);
    } else {
      console.log(`[Mock] Adding to ${colName}`, data);
      const mockDb = getMockDb();
      if (!mockDb[colName]) mockDb[colName] = [];
      const newDoc = { id: generateId(), ...data };
      mockDb[colName].push(newDoc);
      saveMockDb(mockDb);
      return newDoc;
    }
  },

  // Update Document
  updateDocument: async (colName, docId, data) => {
    if (db) {
      const docRef = doc(db, colName, docId);
      return await updateDoc(docRef, data);
    } else {
      console.log(`[Mock] Updating ${colName}/${docId}`, data);
      const mockDb = getMockDb();
      if (mockDb[colName]) {
        const index = mockDb[colName].findIndex(item => item.id === docId);
        if (index !== -1) {
          mockDb[colName][index] = { ...mockDb[colName][index], ...data };
          saveMockDb(mockDb);
        }
      }
    }
  },

  // Delete Document
  deleteDocument: async (colName, docId) => {
    if (db) {
      const docRef = doc(db, colName, docId);
      return await deleteDoc(docRef);
    } else {
      console.log(`[Mock] Deleting ${colName}/${docId}`);
      const mockDb = getMockDb();
      if (mockDb[colName]) {
        mockDb[colName] = mockDb[colName].filter(item => item.id !== docId);
        saveMockDb(mockDb);
      }
    }
  }
};
