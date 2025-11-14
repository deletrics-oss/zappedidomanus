# GourmetFlow - Firebase Edition

Sistema completo de gestão de restaurante migrado para Firebase (Firestore + Authentication).

## 🚀 Tecnologias

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Shadcn/ui + Tailwind CSS
- **Backend**: Firebase (Firestore Database + Authentication + Storage)
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router DOM

## 📋 Pré-requisitos

- Node.js 18+ e npm/pnpm
- Conta no Firebase (gratuita)

## 🔧 Configuração do Firebase

### 1. Criar Projeto no Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Dê um nome ao projeto (ex: "gourmetflow-prod")
4. Desabilite o Google Analytics (opcional)
5. Clique em "Criar projeto"

### 2. Configurar Authentication

1. No menu lateral, clique em "Authentication"
2. Clique em "Começar"
3. Ative o provedor "E-mail/senha"
4. Salve as alterações

### 3. Configurar Firestore Database

1. No menu lateral, clique em "Firestore Database"
2. Clique em "Criar banco de dados"
3. Selecione "Iniciar no modo de produção"
4. Escolha a localização (recomendado: southamerica-east1 para Brasil)
5. Clique em "Ativar"

### 4. Configurar Regras de Segurança do Firestore

No Firestore Database, vá em "Regras" e substitua pelo seguinte:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check user role
    function getUserRole(userId) {
      return get(/databases/$(database)/documents/userRoles/$(userId)).data.role;
    }
    
    function hasRole(role) {
      return request.auth != null && getUserRole(request.auth.uid) == role;
    }
    
    function isAdmin() {
      return hasRole('admin');
    }
    
    function isManager() {
      return hasRole('manager') || isAdmin();
    }
    
    function isStaff() {
      return request.auth != null && (
        hasRole('admin') || 
        hasRole('manager') || 
        hasRole('kitchen') || 
        hasRole('waiter')
      );
    }
    
    // Profiles
    match /profiles/{profileId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // User Roles
    match /userRoles/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if isAdmin();
    }
    
    // Categories
    match /categories/{categoryId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // Menu Items
    match /menuItems/{itemId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // Tables
    match /tables/{tableId} {
      allow read: if true;
      allow write: if isStaff();
    }
    
    // Orders
    match /orders/{orderId} {
      allow read: if isStaff();
      allow write: if isStaff();
    }
    
    // Order Items
    match /orderItems/{itemId} {
      allow read: if isStaff();
      allow write: if isStaff();
    }
    
    // Inventory
    match /inventory/{itemId} {
      allow read: if isManager();
      allow write: if isAdmin();
    }
    
    // Restaurant Settings
    match /restaurantSettings/{settingId} {
      allow read: if isManager();
      allow write: if isAdmin();
    }
  }
}
```

### 5. Obter Credenciais do Firebase

1. No menu lateral, clique no ícone de engrenagem ⚙️ e depois em "Configurações do projeto"
2. Role até "Seus aplicativos"
3. Clique no ícone da Web `</>`
4. Dê um nome ao app (ex: "GourmetFlow Web")
5. NÃO marque "Firebase Hosting"
6. Clique em "Registrar app"
7. Copie o objeto `firebaseConfig`

### 6. Configurar Variáveis de Ambiente

Edite o arquivo `.env` e substitua os valores com suas credenciais do Firebase:

```env
VITE_FIREBASE_API_KEY=sua_api_key_aqui
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto-id
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
```

## 📦 Instalação

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Build para produção
npm run build
```

## 👤 Primeiro Acesso

1. Acesse a aplicação em `http://localhost:5173`
2. Clique em "Cadastro"
3. Crie sua conta com email e senha
4. Após criar a conta, você precisará promover seu usuário para admin

### Promover Usuário para Admin

1. Acesse o Firebase Console
2. Vá em "Firestore Database"
3. Encontre a coleção `userRoles`
4. Localize o documento com seu `userId`
5. Edite o campo `role` de `waiter` para `admin`
6. Salve as alterações
7. Faça logout e login novamente na aplicação

## 📊 Estrutura do Banco de Dados (Firestore)

### Coleções:

- **profiles**: Perfis dos usuários
- **userRoles**: Roles/permissões dos usuários
- **categories**: Categorias do cardápio
- **menuItems**: Itens do cardápio
- **tables**: Mesas do restaurante
- **orders**: Pedidos
- **orderItems**: Itens dos pedidos
- **inventory**: Controle de estoque
- **restaurantSettings**: Configurações do restaurante

## 🔐 Roles e Permissões

- **admin**: Acesso total ao sistema
- **manager**: Gerenciamento de pedidos, estoque e relatórios
- **kitchen**: Visualização e atualização de pedidos da cozinha
- **waiter**: Criação e gerenciamento de pedidos

## 🎨 Funcionalidades

- ✅ Autenticação completa (login/cadastro)
- ✅ Gestão de cardápio (categorias e itens)
- ✅ Sistema de pedidos (delivery, retirada, salão)
- ✅ Controle de mesas
- ✅ Gestão de estoque
- ✅ Dashboard com métricas
- ✅ Relatórios financeiros
- ✅ Sistema de comandas
- ✅ Monitor de cozinha
- ✅ PDV (Ponto de Venda)
- ✅ Gestão de usuários e permissões
- ✅ Configurações do restaurante

## 📝 Notas Importantes

- **Segurança**: Configure corretamente as regras do Firestore
- **Backup**: Configure backups automáticos no Firebase Console
- **Custos**: Monitore o uso do Firebase para evitar custos inesperados

## 🆘 Suporte

Para problemas ou dúvidas:
1. Verifique se todas as credenciais do Firebase estão corretas
2. Confirme que as regras de segurança do Firestore foram aplicadas
3. Verifique o console do navegador para erros específicos
4. Consulte a [documentação do Firebase](https://firebase.google.com/docs)
