# 🚀 Guia Rápido - GourmetFlow Firebase

## Passo a Passo para Começar

### 1️⃣ Configurar Firebase (10 minutos)

1. Acesse https://console.firebase.google.com/
2. Crie um novo projeto
3. Ative **Authentication** (Email/Senha)
4. Ative **Firestore Database** (modo produção)
5. Copie as credenciais do projeto

### 2️⃣ Configurar o Projeto

```bash
# Edite o arquivo .env com suas credenciais do Firebase
nano .env

# Instale as dependências
npm install
```

### 3️⃣ Configurar Regras de Segurança

No Firebase Console:

**Firestore Rules:**
- Vá em Firestore Database > Regras
- Copie o conteúdo de `firestore.rules`
- Cole e publique

**Storage Rules (opcional):**
- Vá em Storage > Regras
- Copie o conteúdo de `storage.rules`
- Cole e publique

### 4️⃣ Popular o Banco de Dados

```bash
# Execute o script de seed
npm run seed
```

Ou adicione dados manualmente pelo Firebase Console seguindo `firebase-seed.md`

### 5️⃣ Iniciar a Aplicação

```bash
npm run dev
```

Acesse: http://localhost:5173

### 6️⃣ Criar Conta Admin

1. Na tela de login, clique em "Cadastro"
2. Preencha seus dados e crie a conta
3. Vá no Firebase Console > Firestore Database
4. Encontre a coleção `userRoles`
5. Localize seu documento (use seu userId)
6. Edite o campo `role` de `waiter` para `admin`
7. Salve e faça logout/login no app

### ✅ Pronto!

Agora você tem acesso completo ao sistema como administrador.

## Próximos Passos

- Configure os dados do restaurante em "Configurações"
- Adicione categorias e itens ao cardápio
- Configure as mesas do salão
- Comece a criar pedidos

## Problemas Comuns

### Erro de autenticação
- Verifique se as credenciais no `.env` estão corretas
- Confirme que o Authentication está ativado no Firebase

### Erro de permissão no Firestore
- Verifique se as regras de segurança foram aplicadas
- Confirme que seu usuário tem a role correta

### Dados não aparecem
- Execute o script de seed: `npm run seed`
- Ou adicione dados manualmente pelo Firebase Console

## Suporte

Consulte os arquivos:
- `README.md` - Documentação completa
- `MIGRATION_GUIDE.md` - Guia de migração do Supabase
- `firebase-seed.md` - Estrutura de dados iniciais
