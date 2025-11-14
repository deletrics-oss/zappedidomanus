// Script para popular o Firebase com dados iniciais
// Execute: node seed-firebase.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import * as dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedDatabase() {
  console.log('🌱 Iniciando seed do banco de dados...\n');

  try {
    // 1. Configurações do Restaurante
    console.log('📝 Criando configurações do restaurante...');
    await addDoc(collection(db, 'restaurantSettings'), {
      name: 'Meu Restaurante',
      phone: '(11) 99999-9999',
      instagram: '@meurestaurante',
      logoUrl: null,
      cnpjCpf: '00.000.000/0000-00',
      responsibleName: 'Nome do Responsável',
      segment: 'Restaurante',
      address: {
        street: 'Rua Principal',
        number: '123',
        complement: '',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '00000-000'
      },
      businessHours: {
        monday: { open: '11:00', close: '23:00', closed: false },
        tuesday: { open: '11:00', close: '23:00', closed: false },
        wednesday: { open: '11:00', close: '23:00', closed: false },
        thursday: { open: '11:00', close: '23:00', closed: false },
        friday: { open: '11:00', close: '23:00', closed: false },
        saturday: { open: '11:00', close: '23:00', closed: false },
        sunday: { open: '11:00', close: '23:00', closed: false }
      },
      deliveryOptions: {
        enabled: true,
        fee: 5.00,
        minOrder: 20.00,
        estimatedTime: 45
      },
      dineInSettings: {
        enabled: true,
        serviceFeePercent: 10
      },
      paymentMethods: {
        cash: true,
        creditCard: true,
        debitCard: true,
        pix: true
      },
      acceptScheduledOrders: true,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // 2. Categorias
    console.log('📁 Criando categorias...');
    const categories = [
      { name: 'Entradas', description: 'Aperitivos e entradas', sortOrder: 1 },
      { name: 'Pratos Principais', description: 'Pratos principais do cardápio', sortOrder: 2 },
      { name: 'Bebidas', description: 'Bebidas variadas', sortOrder: 3 },
      { name: 'Sobremesas', description: 'Doces e sobremesas', sortOrder: 4 }
    ];

    const categoryIds = {};
    for (const category of categories) {
      const docRef = await addDoc(collection(db, 'categories'), {
        ...category,
        imageUrl: null,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      categoryIds[category.name] = docRef.id;
      console.log(`  ✓ ${category.name}`);
    }

    // 3. Mesas
    console.log('🪑 Criando mesas...');
    const tables = [
      { number: 1, capacity: 4 },
      { number: 2, capacity: 4 },
      { number: 3, capacity: 2 },
      { number: 4, capacity: 2 },
      { number: 5, capacity: 6 },
      { number: 6, capacity: 4 },
      { number: 7, capacity: 4 },
      { number: 8, capacity: 8 }
    ];

    for (const table of tables) {
      await addDoc(collection(db, 'tables'), {
        ...table,
        status: 'free',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`  ✓ Mesa ${table.number}`);
    }

    // 4. Itens do Cardápio
    console.log('🍽️  Criando itens do cardápio...');
    const menuItems = [
      {
        categoryId: categoryIds['Entradas'],
        name: 'Bruschetta',
        description: 'Pão italiano com tomate, manjericão e azeite',
        price: 18.90,
        preparationTime: 15
      },
      {
        categoryId: categoryIds['Entradas'],
        name: 'Carpaccio',
        description: 'Finas fatias de carne com molho especial',
        price: 32.90,
        preparationTime: 10
      },
      {
        categoryId: categoryIds['Pratos Principais'],
        name: 'Filé à Parmegiana',
        description: 'Filé mignon empanado com molho de tomate e queijo',
        price: 45.90,
        preparationTime: 30
      },
      {
        categoryId: categoryIds['Pratos Principais'],
        name: 'Risoto de Camarão',
        description: 'Risoto cremoso com camarões frescos',
        price: 52.90,
        preparationTime: 35
      },
      {
        categoryId: categoryIds['Bebidas'],
        name: 'Refrigerante Lata',
        description: 'Coca-Cola, Guaraná ou Sprite',
        price: 6.00,
        preparationTime: 2
      },
      {
        categoryId: categoryIds['Bebidas'],
        name: 'Suco Natural',
        description: 'Laranja, limão ou morango',
        price: 8.50,
        preparationTime: 5
      },
      {
        categoryId: categoryIds['Sobremesas'],
        name: 'Petit Gateau',
        description: 'Bolo de chocolate com sorvete',
        price: 22.90,
        preparationTime: 15
      },
      {
        categoryId: categoryIds['Sobremesas'],
        name: 'Pudim de Leite',
        description: 'Pudim caseiro com calda de caramelo',
        price: 15.90,
        preparationTime: 5
      }
    ];

    for (const item of menuItems) {
      await addDoc(collection(db, 'menuItems'), {
        ...item,
        imageUrl: null,
        promotionalPrice: null,
        isAvailable: true,
        sortOrder: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`  ✓ ${item.name}`);
    }

    console.log('\n✅ Seed concluído com sucesso!');
    console.log('\n📌 Próximos passos:');
    console.log('1. Crie sua conta no aplicativo');
    console.log('2. Promova seu usuário para admin no Firebase Console');
    console.log('3. Faça login novamente e comece a usar o sistema\n');
    
  } catch (error) {
    console.error('❌ Erro ao fazer seed:', error);
  }
}

seedDatabase();
