import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  QueryConstraint,
  onSnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from './firebase';

// Helper function to convert Firestore timestamp to Date
export const timestampToDate = (timestamp: any): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  return timestamp;
};

// Generic CRUD operations
export const createDocument = async (collectionName: string, data: any) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error(`Error creating document in ${collectionName}:`, error);
    throw error;
  }
};

export const getDocument = async (collectionName: string, docId: string) => {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error(`Error getting document from ${collectionName}:`, error);
    throw error;
  }
};

export const updateDocument = async (collectionName: string, docId: string, data: any) => {
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error(`Error updating document in ${collectionName}:`, error);
    throw error;
  }
};

export const deleteDocument = async (collectionName: string, docId: string) => {
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}:`, error);
    throw error;
  }
};

export const getDocuments = async (
  collectionName: string,
  constraints: QueryConstraint[] = []
) => {
  try {
    const q = query(collection(db, collectionName), ...constraints);
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(`Error getting documents from ${collectionName}:`, error);
    throw error;
  }
};

// Real-time listeners
export const subscribeToCollection = (
  collectionName: string,
  callback: (data: any[]) => void,
  constraints: QueryConstraint[] = []
) => {
  const q = query(collection(db, collectionName), ...constraints);
  
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(data);
  });
};

export const subscribeToDocument = (
  collectionName: string,
  docId: string,
  callback: (data: any) => void
) => {
  const docRef = doc(db, collectionName, docId);
  
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() });
    } else {
      callback(null);
    }
  });
};

// Specific collection operations
export const getCategories = async () => {
  return getDocuments('categories', [orderBy('sortOrder', 'asc')]);
};

export const getMenuItems = async (categoryId?: string) => {
  const constraints = categoryId 
    ? [where('categoryId', '==', categoryId), orderBy('sortOrder', 'asc')]
    : [orderBy('sortOrder', 'asc')];
  return getDocuments('menuItems', constraints);
};

export const getTables = async () => {
  return getDocuments('tables', [orderBy('number', 'asc')]);
};

export const getOrders = async (status?: string) => {
  const constraints = status
    ? [where('status', '==', status), orderBy('createdAt', 'desc')]
    : [orderBy('createdAt', 'desc')];
  return getDocuments('orders', constraints);
};

export const getOrderItems = async (orderId: string) => {
  return getDocuments('orderItems', [where('orderId', '==', orderId)]);
};

export const getInventory = async () => {
  return getDocuments('inventory', [orderBy('name', 'asc')]);
};

export const getRestaurantSettings = async () => {
  const settings = await getDocuments('restaurantSettings', [limit(1)]);
  return settings.length > 0 ? settings[0] : null;
};

// Generate order number
export const generateOrderNumber = async (): Promise<string> => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  const ordersToday = await getDocuments('orders', [
    where('orderNumber', '>=', dateStr),
    where('orderNumber', '<', dateStr + 'Z')
  ]);
  
  const nextNumber = ordersToday.length + 1;
  return `${dateStr}-${String(nextNumber).padStart(4, '0')}`;
};

// Export Firestore query helpers
export { where, orderBy, limit };
