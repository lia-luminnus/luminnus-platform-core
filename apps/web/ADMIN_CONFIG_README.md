# 🔐 Painel de Configuração Admin - LIA

## 📋 Visão Geral

Este é um painel de controle privado para gerenciar configurações sensíveis da assistente virtual LIA, incluindo API Keys e tokens.

## 🚀 Como Acessar

1. **URL Secreta**: Acesse o painel através da rota:
   ```
   http://localhost:8080/config-lia-admin
   ```
   Ou em produção:
   ```
   https://seu-dominio.com/config-lia-admin
   ```

2. **Senha Master**:
   - Senha padrão: `senha-da-lia-2025`
   - **IMPORTANTE**: Troque esta senha antes de usar em produção!

## 🔧 Configurações Disponíveis

### 1. OpenAI
- **API Key OpenAI**: Chave para uso da API da OpenAI (GPT-4, etc)
- Obtenha em: https://platform.openai.com/api-keys

### 2. Supabase
- **URL do Projeto**: URL base do seu projeto Supabase
- **Anon Key**: Chave pública (pode ser exposta no frontend)
- **Service Role Key**: Chave secreta com acesso total ao banco

### 3. Outras APIs
- Adicione chaves personalizadas (Stripe, SendGrid, etc)
- Formato: Nome da chave + Valor

## 🔐 Segurança

### Recursos de Segurança Implementados:

1. ✅ **Autenticação por senha** - Acesso protegido por senha master
2. ✅ **Sessão temporária** - Sessão expira após 1 hora de inatividade
3. ✅ **Ofuscação básica** - Dados codificados no localStorage
4. ✅ **Ocultação de valores** - Chaves ocultas por padrão (tipo password)
5. ✅ **Rota não-óbvia** - Caminho `/config-lia-admin` dificulta descoberta

### ⚠️ AVISOS IMPORTANTES:

1. **Troque a senha master** antes de usar em produção:
   - Arquivo: `src/lib/secureStorage.ts`
   - Linha: `export const ADMIN_MASTER_PASSWORD = 'senha-da-lia-2025';`
   - Troque para uma senha forte e única

2. **Armazenamento local** - Os dados são salvos no localStorage do navegador
   - Para produção, considere usar variáveis de ambiente do servidor
   - Ou um serviço de gerenciamento de segredos (AWS Secrets Manager, etc)

3. **Service Role Key** - Nunca exponha a Service Role Key do Supabase no frontend
   - Esta chave tem acesso total ao banco de dados
   - Use apenas em servidores backend seguros

## 🛠️ Como Customizar

### Trocar a Senha Master

Edite o arquivo `src/lib/secureStorage.ts`:

```typescript
// Linha ~72
export const ADMIN_MASTER_PASSWORD = 'SUA-SENHA-SUPER-SEGURA-AQUI';
```

### Trocar a Rota Secreta

Edite o arquivo `src/App.tsx`:

```tsx
// Linha ~39 - Troque o caminho
<Route path="/sua-rota-secreta-aqui" element={<AdminConfig />} />
```

### Adicionar Novos Campos

Edite o arquivo `src/pages/AdminConfig.tsx` e adicione novos campos no formulário conforme necessário.

### Aumentar Tempo de Sessão

Edite `src/lib/secureStorage.ts`:

```typescript
// Linha ~86
expiresIn: 3600000, // 1 hora em milissegundos
// Troque para: 7200000 para 2 horas, etc
```

## 💡 Usando as Configurações

### No Código JavaScript/TypeScript

```typescript
import { secureStorage } from '@/lib/secureStorage';

// Carregar configurações
const config = secureStorage.load();

if (config) {
  // Usar a chave da OpenAI
  const openaiKey = config.openaiKey;

  // Usar Supabase
  const supabaseUrl = config.supabaseUrl;
  const supabaseKey = config.supabaseAnonKey;

  // Chaves personalizadas
  const stripeKey = config.otherApiKeys?.STRIPE_KEY;
}
```

### Exemplo Prático com OpenAI

```typescript
import { secureStorage } from '@/lib/secureStorage';
import OpenAI from 'openai';

const config = secureStorage.load();

const openai = new OpenAI({
  apiKey: config?.openaiKey || process.env.VITE_OPENAI_KEY,
});

// Usar a API
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: "Olá!" }],
});
```

## 📱 Interface do Painel

O painel possui 3 abas principais:

1. **OpenAI** - Configuração da API Key da OpenAI
2. **Supabase** - URL e chaves do Supabase
3. **Outras APIs** - Chaves personalizadas (Stripe, SendGrid, etc)

### Funcionalidades:

- ✅ Adicionar/editar configurações
- ✅ Visualizar/ocultar chaves (botão de olho)
- ✅ Salvar todas as configurações
- ✅ Limpar todas as configurações
- ✅ Adicionar chaves personalizadas
- ✅ Remover chaves personalizadas
- ✅ Logout do painel

## 🚨 Boas Práticas de Produção

### Recomendações para Produção:

1. **Variáveis de Ambiente** (Recomendado)
   ```env
   # .env
   VITE_OPENAI_KEY=sk-...
   VITE_SUPABASE_URL=https://...
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

2. **Backend Proxy** (Mais seguro)
   - Crie um backend que armazena as chaves
   - Frontend faz requisições ao backend
   - Backend usa as chaves para fazer chamadas às APIs

3. **Serviços de Secrets**
   - AWS Secrets Manager
   - Google Cloud Secret Manager
   - HashiCorp Vault
   - Azure Key Vault

4. **Não commitar chaves**
   - Adicione `.env` ao `.gitignore`
   - Nunca faça commit de chaves no código

## 🔄 Migrando para Produção

### Opção 1: Variáveis de Ambiente (Lovable/Vite)

1. Configure as variáveis no painel da Lovable
2. Remova o uso do localStorage
3. Use `import.meta.env.VITE_OPENAI_KEY` diretamente

### Opção 2: Backend Seguro

1. Crie um backend (Node.js, Python, etc)
2. Armazene chaves no servidor
3. Frontend chama o backend via API
4. Backend usa as chaves internamente

## 📞 Suporte

Para dúvidas ou problemas:
- Consulte a documentação oficial das APIs
- Verifique os logs do console do navegador
- Teste em modo de desenvolvimento primeiro

---

**Desenvolvido para LIA Assistant** 🤖
**Versão**: 1.0.0
**Data**: 2025
