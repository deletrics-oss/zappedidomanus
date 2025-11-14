# Firebase Seed Data - Dados Iniciais

Este documento contém os dados iniciais recomendados para popular o banco de dados Firebase do GourmetFlow.

## Como Adicionar Dados Iniciais

Você pode adicionar estes dados manualmente pelo Firebase Console ou criar um script de seed.

### Opção 1: Manual (Firebase Console)

1. Acesse o Firebase Console
2. Vá em Firestore Database
3. Clique em "Iniciar coleção"
4. Adicione os documentos conforme os exemplos abaixo

### Opção 2: Script Automático

Execute o script `seed-firebase.js` (criar este arquivo na raiz do projeto):

```bash
node seed-firebase.js
```

## Dados Iniciais Recomendados

### 1. Configurações do Restaurante (restaurantSettings)

```json
{
  "name": "Meu Restaurante",
  "phone": "(11) 99999-9999",
  "instagram": "@meurestaurante",
  "logoUrl": null,
  "cnpjCpf": "00.000.000/0000-00",
  "responsibleName": "Nome do Responsável",
  "segment": "Restaurante",
  "address": {
    "street": "Rua Principal",
    "number": "123",
    "complement": "",
    "neighborhood": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "00000-000"
  },
  "businessHours": {
    "monday": { "open": "11:00", "close": "23:00", "closed": false },
    "tuesday": { "open": "11:00", "close": "23:00", "closed": false },
    "wednesday": { "open": "11:00", "close": "23:00", "closed": false },
    "thursday": { "open": "11:00", "close": "23:00", "closed": false },
    "friday": { "open": "11:00", "close": "23:00", "closed": false },
    "saturday": { "open": "11:00", "close": "23:00", "closed": false },
    "sunday": { "open": "11:00", "close": "23:00", "closed": false }
  },
  "deliveryOptions": {
    "enabled": true,
    "fee": 5.00,
    "minOrder": 20.00,
    "estimatedTime": 45
  },
  "dineInSettings": {
    "enabled": true,
    "serviceFeePercent": 10
  },
  "paymentMethods": {
    "cash": true,
    "creditCard": true,
    "debitCard": true,
    "pix": true
  },
  "acceptScheduledOrders": true,
  "isActive": true
}
```

### 2. Categorias (categories)

```json
[
  {
    "name": "Entradas",
    "description": "Aperitivos e entradas",
    "imageUrl": null,
    "sortOrder": 1,
    "isActive": true
  },
  {
    "name": "Pratos Principais",
    "description": "Pratos principais do cardápio",
    "imageUrl": null,
    "sortOrder": 2,
    "isActive": true
  },
  {
    "name": "Bebidas",
    "description": "Bebidas variadas",
    "imageUrl": null,
    "sortOrder": 3,
    "isActive": true
  },
  {
    "name": "Sobremesas",
    "description": "Doces e sobremesas",
    "imageUrl": null,
    "sortOrder": 4,
    "isActive": true
  }
]
```

### 3. Mesas (tables)

```json
[
  { "number": 1, "status": "free", "capacity": 4 },
  { "number": 2, "status": "free", "capacity": 4 },
  { "number": 3, "status": "free", "capacity": 2 },
  { "number": 4, "status": "free", "capacity": 2 },
  { "number": 5, "status": "free", "capacity": 6 },
  { "number": 6, "status": "free", "capacity": 4 },
  { "number": 7, "status": "free", "capacity": 4 },
  { "number": 8, "status": "free", "capacity": 8 }
]
```

### 4. Itens do Cardápio (menuItems)

Adicione após criar as categorias e obter seus IDs:

```json
[
  {
    "categoryId": "ID_DA_CATEGORIA_ENTRADAS",
    "name": "Bruschetta",
    "description": "Pão italiano com tomate, manjericão e azeite",
    "imageUrl": null,
    "price": 18.90,
    "promotionalPrice": null,
    "preparationTime": 15,
    "isAvailable": true,
    "sortOrder": 1
  },
  {
    "categoryId": "ID_DA_CATEGORIA_PRATOS",
    "name": "Filé à Parmegiana",
    "description": "Filé mignon empanado com molho de tomate e queijo",
    "imageUrl": null,
    "price": 45.90,
    "promotionalPrice": null,
    "preparationTime": 30,
    "isAvailable": true,
    "sortOrder": 1
  }
]
```

## Notas Importantes

- Os campos `createdAt` e `updatedAt` são adicionados automaticamente pelo sistema
- Substitua os IDs de categoria pelos IDs reais gerados pelo Firebase
- Ajuste os valores conforme a necessidade do seu restaurante
- Adicione mais itens de cardápio conforme necessário
