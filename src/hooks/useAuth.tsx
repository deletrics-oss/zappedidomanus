import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { signIn as firebaseSignIn, signUp as firebaseSignUp, signOut as firebaseSignOut, getUserRole } from '@/lib/firebase-auth';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  userRole: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  isKitchen: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Fetch user role
        const role = await getUserRole(currentUser.uid);
        setUserRole(role);
      } else {
        setUserRole(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await firebaseSignIn(email, password);
      toast.success('Login realizado com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer login');
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      await firebaseSignUp(email, password, fullName);
      toast.success('Conta criada com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar conta');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut();
      toast.success('Logout realizado com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer logout');
      throw error;
    }
  };

  const value = {
    user,
    userRole,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin: userRole === 'admin',
    isManager: userRole === 'manager' || userRole === 'admin',
    isKitchen: userRole === 'kitchen',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
