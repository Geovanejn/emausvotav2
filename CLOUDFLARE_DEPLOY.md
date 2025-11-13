# 📘 Guia Completo de Migração para Cloudflare Pages

Este documento detalha como migrar o sistema Emaús Vota do backend atual (Node.js + Express + better-sqlite3) para Cloudflare Pages (Functions + D1 + R2).

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Visão Geral da Arquitetura](#visão-geral-da-arquitetura)
3. [Passo a Passo da Migração](#passo-a-passo-da-migração)
4. [Estrutura de Arquivos](#estrutura-de-arquivos)
5. [Padrões de Conversão](#padrões-de-conversão)
6. [Deploy e Configuração](#deploy-e-configuração)
7. [Troubleshooting](#troubleshooting)

---

## 🔧 Pré-requisitos

### Ferramentas Necessárias

```bash
# Instalar Wrangler CLI (ferramenta oficial da Cloudflare)
npm install -g wrangler

# Login na Cloudflare
wrangler login

# Instalar tipos TypeScript para Cloudflare
npm install -D @cloudflare/workers-types
```

### Conta Cloudflare

- Criar uma conta em https://dash.cloudflare.com
- Anotar seu **Account ID** (disponível no dashboard)

---

## 🏗️ Visão Geral da Arquitetura

### ANTES (Replit)
```
Express.js → better-sqlite3 → Sistema de arquivos local → Resend
```

### DEPOIS (Cloudflare)
```
Cloudflare Functions → D1 (SQLite na nuvem) → R2 (Object Storage) → Resend
```

### Principais Mudanças

| Componente | Antes | Depois |
|------------|-------|--------|
| Backend | Express routes | Cloudflare Functions (`onRequestPost`, `onRequestGet`) |
| Database | better-sqlite3 (local) | D1 (Cloudflare's distributed SQLite) |
| File Storage | Sistema de arquivos local | R2 (Object Storage) |
| Environment Variables | `process.env` | `context.env` |
| Authentication | JWT middleware Express | JWT utility functions |

---

## 📝 Passo a Passo da Migração

### Passo 1: Criar Banco de Dados D1

```bash
# Criar database D1
wrangler d1 create emausvota-db

# Anotar o database_id retornado e atualizar wrangler.toml
# Substituir "PLACEHOLDER_DB_ID" pelo ID real
```

### Passo 2: Migrar Schema do Banco

```bash
# Executar migração SQL no D1
wrangler d1 execute emausvota-db --file=./migrations/d1-schema.sql

# Verificar tabelas criadas
wrangler d1 execute emausvota-db --command="SELECT name FROM sqlite_master WHERE type='table'"

# IMPORTANTE: Seed de dados iniciais
# Criar usuário admin padrão (adapte a senha hash)
wrangler d1 execute emausvota-db --command="
INSERT INTO users (full_name, email, password, has_password, is_admin, is_member, active_member) 
VALUES ('UMP Emaús', 'marketingumpemaus@gmail.com', '\$2a\$10\$your-hashed-password-here', 1, 1, 1, 1)
"

# Verificar que as posições fixas foram criadas
wrangler d1 execute emausvota-db --command="SELECT * FROM positions"
```

**Nota**: A senha do admin deve ser gerada com bcrypt antes do insert. Use o script de seed fornecido no repositório ou crie via endpoint de desenvolvimento.

### Passo 3: Criar Bucket R2

```bash
# Criar bucket para fotos
wrangler r2 bucket create emausvota-fotos

# Opcional: Criar bucket de desenvolvimento
wrangler r2 bucket create emausvota-fotos-dev
```

### Passo 4: Configurar Custom Domain para R2 (Opcional)

1. Ir para R2 Dashboard → `emausvota-fotos` → Settings → Custom Domains
2. Adicionar domínio (ex: `fotos.emausvota.com.br`)
3. Atualizar `R2_PUBLIC_URL` em `wrangler.toml`

### Passo 5: Configurar Secrets

```bash
# Adicionar secrets de produção
wrangler secret put RESEND_API_KEY
# Cole sua chave API do Resend quando solicitado

wrangler secret put RESEND_FROM_EMAIL  
# Cole o email remetente (ex: suporte@emausvota.com.br)

wrangler secret put JWT_SECRET
# Cole um secret forte e aleatório (mínimo 32 caracteres)
# Exemplo de geração: openssl rand -base64 32
```

**CRÍTICO**: 
- Secrets NÃO devem NUNCA estar em `wrangler.toml` ou código-fonte!
- Use senhas diferentes entre desenvolvimento e produção
- Anote os secrets em um gerenciador de senhas seguro

### Passo 6: Converter Rotas para Functions

A conversão já foi iniciada com exemplos em `/functions`. Use os padrões abaixo para converter as demais rotas.

---

## 📁 Estrutura de Arquivos

```
projeto/
├── functions/                    # Cloudflare Functions (backend)
│   ├── lib/                      # Utilitários compartilhados
│   │   ├── types.ts              # Tipos TypeScript
│   │   ├── auth.ts               # Autenticação JWT
│   │   ├── utils.ts              # Funções auxiliares
│   │   └── email.ts              # Serviço de email (a criar)
│   └── api/                      # API routes
│       ├── auth/                 # Rotas de autenticação
│       │   ├── login.ts          # POST /api/auth/login
│       │   ├── request-code.ts   # POST /api/auth/request-code
│       │   └── verify-code.ts    # POST /api/auth/verify-code (a criar)
│       ├── admin/                # Rotas administrativas (a criar)
│       ├── elections/            # Rotas de eleições (a criar)
│       └── candidates/           # Rotas de candidatos (a criar)
├── client/                       # Frontend (React/Vite) - SEM MUDANÇAS
├── shared/                       # Código compartilhado - SEM MUDANÇAS
├── migrations/                   # Migrações SQL para D1
│   └── d1-schema.sql             # Schema completo do banco
├── wrangler.toml                 # Configuração Cloudflare
└── CLOUDFLARE_DEPLOY.md          # Este guia
```

---

## 🔄 Padrões de Conversão

### Padrão 1: Rota Simples (GET)

**ANTES (Express):**
```typescript
// server/routes.ts
app.get("/api/members", authenticateToken, async (req: AuthRequest, res) => {
  const members = storage.getAllMembers();
  res.json(members);
});
```

**DEPOIS (Cloudflare Function):**
```typescript
// functions/api/members.ts
import type { EventContext } from "../lib/types";
import { requireAuth, createAuthContext } from "../lib/auth";
import { jsonResponse, handleError } from "../lib/utils";

export async function onRequestGet(context: EventContext) {
  try {
    // Autenticação
    const authResult = requireAuth(context);
    if (authResult instanceof Response) return authResult;
    
    // Query D1
    const { results } = await context.env.DB
      .prepare("SELECT * FROM users WHERE is_member = 1 ORDER BY full_name")
      .all();
    
    // Converter boolean fields
    const members = results.map(row => ({
      ...row,
      hasPassword: Boolean(row.has_password),
      isAdmin: Boolean(row.is_admin),
      isMember: Boolean(row.is_member),
      activeMember: Boolean(row.active_member),
    }));
    
    return jsonResponse(members);
  } catch (error) {
    return handleError(error);
  }
}
```

### Padrão 2: Rota com POST e Validação

**ANTES (Express):**
```typescript
app.post("/api/candidates", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  const validatedData = insertCandidateSchema.parse(req.body);
  const candidate = storage.createCandidate(validatedData);
  res.json(candidate);
});
```

**DEPOIS (Cloudflare Function):**
```typescript
// functions/api/candidates.ts
import { z } from "zod";
import type { EventContext } from "../lib/types";
import { requireAuth, requireAdmin } from "../lib/auth";
import { jsonResponse, errorResponse, parseBody, handleError } from "../lib/utils";

const insertCandidateSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  userId: z.number(),
  positionId: z.number(),
  electionId: z.number(),
});

export async function onRequestPost(context: EventContext) {
  try {
    // Autenticação e autorização
    const authResult = requireAuth(context);
    if (authResult instanceof Response) return authResult;
    
    const adminCheck = requireAdmin(authResult);
    if (adminCheck) return adminCheck;
    
    // Parse e validação
    const body = await parseBody(context.request);
    const validatedData = insertCandidateSchema.parse(body);
    
    // Insert no D1
    const result = await context.env.DB
      .prepare(
        "INSERT INTO candidates (name, email, user_id, position_id, election_id) VALUES (?, ?, ?, ?, ?) RETURNING *"
      )
      .bind(
        validatedData.name,
        validatedData.email,
        validatedData.userId,
        validatedData.positionId,
        validatedData.electionId
      )
      .first();
    
    return jsonResponse(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0].message);
    }
    return handleError(error);
  }
}
```

### Padrão 3: Upload de Arquivo para R2

**ANTES (Express):**
```typescript
app.post("/api/upload-photo", async (req, res) => {
  const file = req.files.photo;
  const filename = `${Date.now()}-${file.name}`;
  fs.writeFileSync(`uploads/${filename}`, file.data);
  res.json({ photoUrl: `/uploads/${filename}` });
});
```

**DEPOIS (Cloudflare Function):**
```typescript
// functions/api/upload-photo.ts
import type { EventContext } from "../lib/types";
import { requireAuth } from "../lib/auth";
import { jsonResponse, handleError } from "../lib/utils";

export async function onRequestPost(context: EventContext) {
  try {
    const authResult = requireAuth(context);
    if (authResult instanceof Response) return authResult;
    
    const formData = await context.request.formData();
    const file = formData.get('photo') as File;
    
    if (!file) {
      return errorResponse("Arquivo não fornecido", 400);
    }
    
    const filename = `${Date.now()}-${file.name}`;
    
    // Upload para R2
    await context.env.FOTOS.put(filename, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });
    
    // URL pública
    const photoUrl = `${context.env.R2_PUBLIC_URL}/${filename}`;
    
    return jsonResponse({ photoUrl });
  } catch (error) {
    return handleError(error);
  }
}
```

### Padrão 4: Rota com Parâmetros Dinâmicos

**ANTES (Express):**
```typescript
app.get("/api/elections/:id/positions", authenticateToken, async (req: AuthRequest, res) => {
  const electionId = parseInt(req.params.id);
  const positions = storage.getElectionPositions(electionId);
  res.json(positions);
});
```

**DEPOIS (Cloudflare Function):**
```typescript
// functions/api/elections/[id]/positions.ts
import type { EventContext } from "../../../lib/types";
import { requireAuth } from "../../../lib/auth";
import { jsonResponse, handleError } from "../../../lib/utils";

type Params = {
  id: string;
};

export async function onRequestGet(context: EventContext<Params>) {
  try {
    const authResult = requireAuth(context);
    if (authResult instanceof Response) return authResult;
    
    const electionId = parseInt(context.params.id);
    
    const { results } = await context.env.DB
      .prepare(`
        SELECT * FROM election_positions 
        WHERE election_id = ? 
        ORDER BY order_index
      `)
      .bind(electionId)
      .all();
    
    return jsonResponse(results);
  } catch (error) {
    return handleError(error);
  }
}
```

---

## 🚀 Deploy e Configuração

### Deploy Inicial

```bash
# Build do frontend
npm run build

# Deploy para Cloudflare Pages
wrangler pages deploy dist --project-name emausvota

# Ou conectar ao GitHub para deploy automático
# 1. Ir para Cloudflare Dashboard → Pages
# 2. Conectar ao repositório GitHub
# 3. Configurar:
#    - Build command: npm run build
#    - Build output directory: dist
#    - Root directory: /
```

### Configurar Bindings no Dashboard

1. Ir para **Pages → emausvota → Settings → Functions**
2. Adicionar **D1 Database Binding**:
   - Variable name: `DB`
   - D1 Database: `emausvota-db`
3. Adicionar **R2 Bucket Binding**:
   - Variable name: `FOTOS`
   - R2 Bucket: `emausvota-fotos`
4. Adicionar **Environment Variables**:
   - `R2_PUBLIC_URL`: URL pública do R2
   - `JWT_SECRET`: Secret para JWT

### Testar Localmente

```bash
# Desenvolvimento local com Wrangler
wrangler pages dev dist --d1=DB=emausvota-db --r2=FOTOS=emausvota-fotos

# OU usar o servidor de desenvolvimento normal (ainda usa Express)
npm run dev
```

---

## ⏰ Scheduled Jobs (Cron)

O sistema atual tem um agendador de aniversários que roda diariamente às 7h. No Cloudflare, você precisa configurar um **Cron Trigger**.

### Opção 1: Cloudflare Workers Cron (Recomendado)

Criar um Worker separado para tarefas agendadas:

```typescript
// workers/birthday-scheduler.ts
export default {
  async scheduled(event, env, ctx) {
    // Query members with birthdays today
    const today = new Date().toISOString().split('T')[0].slice(5); // MM-DD
    
    const { results } = await env.DB.prepare(`
      SELECT * FROM users 
      WHERE substr(birthdate, 6, 5) = ?
      AND is_member = 1
    `).bind(today).all();
    
    // Send birthday emails
    for (const member of results) {
      // Call email service
      await sendBirthdayEmail(member, env);
    }
  },
};
```

Configurar no `wrangler.toml`:

```toml
[triggers]
crons = ["0 10 * * *"]  # 10h UTC = 7h Brasília
```

### Opção 2: Usar Serviço Externo

Usar serviços como:
- **EasyCron**: https://www.easycron.com/
- **cron-job.org**: https://cron-job.org/

Configurar para fazer uma requisição POST para seu endpoint:
```
POST https://emausvota.pages.dev/api/scheduled/birthday-check
Authorization: Bearer YOUR_SCHEDULED_JOB_SECRET
```

---

## 🔍 Troubleshooting

### Erro: "Binding DB is not defined"

**Solução**: Verificar que o binding está configurado corretamente em `wrangler.toml` e no Cloudflare Dashboard.

```toml
[[d1_databases]]
binding = "DB"  # Deve ser exatamente "DB" como no código
database_id = "seu-database-id-real"
```

### Erro: "Table does not exist"

**Solução**: Executar a migração SQL:

```bash
wrangler d1 execute emausvota-db --file=./migrations/d1-schema.sql
```

### Frontend não carrega Functions

**Solução**: Verificar que:
1. Functions estão em `/functions/api/...`
2. Build do frontend está em `/dist`
3. As rotas Functions correspondem aos paths da API

### CORS Errors

**Solução**: Adicionar headers CORS nas Functions:

```typescript
export async function onRequestOptions(context: EventContext) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
```

### R2 Upload lento

**Solução**: Usar Custom Domain em vez de r2.dev (que é rate-limited).

---

## 📊 Checklist de Migração

### Backend

- [x] Criar `wrangler.toml`
- [x] Criar schema SQL para D1
- [x] Criar utilitários de autenticação
- [x] Criar utilitários gerais
- [ ] Converter todas as rotas de autenticação
- [ ] Converter rotas de membros/admin
- [ ] Converter rotas de eleições
- [ ] Converter rotas de cargos
- [ ] Converter rotas de candidatos
- [ ] Converter rotas de votos
- [ ] Converter rotas de auditoria
- [ ] Implementar serviço de email com Resend
- [ ] Implementar uploads R2 para fotos

### Database

- [ ] Criar banco D1 de produção
- [ ] Executar migração SQL
- [ ] Criar usuário admin padrão
- [ ] Migrar dados existentes (se houver)

### Infraestrutura

- [ ] Criar bucket R2
- [ ] Configurar custom domain para R2
- [ ] Configurar secrets de produção
- [ ] Configurar bindings no Dashboard

### Deploy

- [ ] Build do frontend
- [ ] Deploy inicial
- [ ] Testar todas as rotas
- [ ] Configurar domínio custom
- [ ] Configurar SSL/TLS

---

## 💡 Dicas Finais

1. **Desenvolva Localmente Primeiro**: Use `wrangler pages dev` para testar antes de fazer deploy
2. **Use Logs**: `wrangler tail` mostra logs em tempo real da produção
3. **Teste Incrementalmente**: Converta e teste uma rota por vez
4. **Mantenha Express em Paralelo**: Você pode manter o backend Express rodando enquanto migra
5. **Documente Mudanças**: Anote as conversões feitas para referência futura

---

## 📞 Suporte

- **Cloudflare Docs**: https://developers.cloudflare.com/pages/
- **D1 Docs**: https://developers.cloudflare.com/d1/
- **R2 Docs**: https://developers.cloudflare.com/r2/
- **Wrangler CLI**: https://developers.cloudflare.com/workers/wrangler/

---

**Última atualização**: 2025-01-13
