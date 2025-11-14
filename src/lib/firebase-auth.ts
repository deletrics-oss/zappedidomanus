import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

export const signUp = async (email: string, password: string, fullName?: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update profile with display name
    if (fullName) {
      await updateProfile(user, { displayName: fullName });
    }

    // Create profile document
    await setDoc(doc(db, 'profiles', user.uid), {
      userId: user.uid,
      fullName: fullName || null,
      phone: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Create default user role (waiter)
    await setDoc(doc(db, 'userRoles', user.uid), {
      userId: user.uid,
      role: 'waiter',
      createdAt: serverTimestamp()
    });

    return user;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getCurrentUser = (): Promise<User | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

export const getUserRole = async (userId: string): Promise<string | null> => {
  try {
    const roleDoc = await getDoc(doc(db, 'userRoles', userId));
    if (roleDoc.exists()) {
      return roleDoc.data().role;
    }
    return null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

export const hasRole = async (userId: string, role: string): Promise<boolean> => {
  const userRole = await getUserRole(userId);
  return userRole === role;
};
