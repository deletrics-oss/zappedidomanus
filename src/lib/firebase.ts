import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;

// Types for Firestore collections
export interface Profile {
  id: string;
  userId: string;
  fullName: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRole {
  id: string;
  userId: string;
  role: 'admin' | 'manager' | 'kitchen' | 'waiter';
  createdAt: Date;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuItem {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  promotionalPrice: number | null;
  preparationTime: number;
  isAvailable: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Table {
  id: string;
  number: number;
  status: 'free' | 'occupied' | 'reserved';
  capacity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  customerCpf: string | null;
  deliveryType: 'delivery' | 'pickup' | 'dine_in';
  status: 'new' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled';
  tableId: string | null;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'credit_card' | 'debit_card' | 'pix' | 'paghiper' | 'pending';
  deliveryAddress: any | null;
  notes: string | null;
  scheduledFor: Date | null;
  completedAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes: string | null;
  createdAt: Date;
}

export interface Inventory {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  currentQuantity: number;
  minQuantity: number;
  alertSent: boolean;
  lastAlertDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RestaurantSettings {
  id: string;
  name: string;
  phone: string | null;
  instagram: string | null;
  logoUrl: string | null;
  cnpjCpf: string | null;
  responsibleName: string | null;
  segment: string | null;
  address: any | null;
  businessHours: any | null;
  deliveryOptions: any | null;
  dineInSettings: any | null;
  paymentMethods: any | null;
  acceptScheduledOrders: boolean;
  whatsappApiKey: string | null;
  paghiperApiKey: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
