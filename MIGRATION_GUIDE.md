# Guia de Migração - Supabase para Firebase

Este documento explica as principais mudanças na migração do GourmetFlow de Supabase para Firebase.

## Mudanças Principais

### 1. Autenticação

**Antes (Supabase):**
```typescript
import { supabase } from '@/lib/supabase';
await supabase.auth.signInWithPassword({ email, password });
```

**Depois (Firebase):**
```typescript
import { signIn } from '@/lib/firebase-auth';
await signIn(email, password);
```

### 2. Consultas ao Banco de Dados

**Antes (Supabase):**
```typescript
const { data } = await supabase
  .from('orders')
  .select('*')
  .eq('status', 'new')
  .order('created_at', { ascending: false });
```

**Depois (Firebase):**
```typescript
import { getOrders } from '@/lib/firebase-db';
import { where, orderBy } from 'firebase/firestore';

const orders = await getOrders('new');
// ou com query personalizada:
const orders = await getDocuments('orders', [
  where('status', '==', 'new'),
  orderBy('createdAt', 'desc')
]);
```

### 3. Inserção de Dados

**Antes (Supabase):**
```typescript
const { data, error } = await supabase
  .from('categories')
  .insert({ name, description })
  .select()
  .single();
```

**Depois (Firebase):**
```typescript
import { createDocument } from '@/lib/firebase-db';

const docId = await createDocument('categories', {
  name,
  description
});
```

### 4. Atualização de Dados

**Antes (Supabase):**
```typescript
await supabase
  .from('menu_items')
  .update({ price: newPrice })
  .eq('id', itemId);
```

**Depois (Firebase):**
```typescript
import { updateDocument } from '@/lib/firebase-db';

await updateDocument('menuItems', itemId, {
  price: newPrice
});
```

### 5. Exclusão de Dados

**Antes (Supabase):**
```typescript
await supabase
  .from('categories')
  .delete()
  .eq('id', categoryId);
```

**Depois (Firebase):**
```typescript
import { deleteDocument } from '@/lib/firebase-db';

await deleteDocument('categories', categoryId);
```

### 6. Listeners em Tempo Real

**Antes (Supabase):**
```typescript
const subscription = supabase
  .channel('orders')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, 
    (payload) => {
      console.log('Change received!', payload);
    }
  )
  .subscribe();
```

**Depois (Firebase):**
```typescript
import { subscribeToCollection } from '@/lib/firebase-db';

const unsubscribe = subscribeToCollection('orders', (data) => {
  console.log('Data updated:', data);
});

// Cleanup
unsubscribe();
```

## Nomenclatura de Campos

O Firebase usa camelCase para nomes de campos, enquanto o Supabase usava snake_case:

| Supabase | Firebase |
|----------|----------|
| user_id | userId |
| full_name | fullName |
| created_at | createdAt |
| updated_at | updatedAt |
| is_active | isActive |
| order_number | orderNumber |

## Hooks Customizados

### useFirestoreCollection

Hook para buscar coleções com listeners em tempo real:

```typescript
import { useFirestoreCollection } from '@/hooks/useFirestore';
import { where, orderBy } from 'firebase/firestore';

function MyComponent() {
  const { data, loading, error } = useFirestoreCollection('orders', [
    where('status', '==', 'new'),
    orderBy('createdAt', 'desc')
  ]);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div>{/* render data */}</div>;
}
```

## Regras de Segurança

As regras de segurança do Firestore substituem as Row Level Security (RLS) policies do Supabase. Configure-as no Firebase Console conforme descrito no README.md.

## Diferenças Importantes

1. **IDs de Documentos**: Firebase gera IDs automáticos. Use `doc.id` para acessar.
2. **Timestamps**: Use `serverTimestamp()` do Firestore ao invés de `now()`.
3. **Transações**: Firebase tem suporte a transações, mas com sintaxe diferente.
4. **Relacionamentos**: Firestore não tem JOINs nativos. Use subcoleções ou denormalização.

## Checklist de Migração

- [x] Configurar projeto Firebase
- [x] Migrar autenticação
- [x] Criar estrutura de coleções
- [x] Configurar regras de segurança
- [x] Migrar queries do banco
- [x] Atualizar hooks e contextos
- [x] Testar todas as funcionalidades
- [x] Atualizar documentação
