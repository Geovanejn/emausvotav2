# Configuração do Cloudflare para Emaús Vota

Este documento lista todas as configurações necessárias para fazer deploy do sistema no Cloudflare Pages + Workers + D1.

## 1. Secrets Obrigatórias

Configure estas secrets usando `wrangler secret put <SECRET_NAME>`:

### Autenticação
```bash
wrangler secret put JWT_SECRET
# Valor: string aleatória segura (mínimo 32 caracteres)
# Exemplo: openssl rand -base64 32
```

### Email (Resend)
```bash
wrangler secret put RESEND_API_KEY
# Valor: API key do Resend (obtida em resend.com)
# Formato: re_...
```

### R2 Storage (se usando APIs diretas)
```bash
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
# Nota: Não necessário se usar apenas R2 binding
```

## 2. Variáveis de Ambiente (wrangler.toml)

Já configuradas no `wrangler.toml`:

```toml
[vars]
R2_PUBLIC_URL = "https://pub-39e66b84b6f1472fb913c941ca636fc6.r2.dev"
```

## 3. Bindings Configurados

### D1 Database
```toml
[[d1_databases]]
binding = "DB"
database_name = "emausvota-db"
database_id = "4eb4ca8d-4e1f-4c30-8016-74052544d510"
```

### R2 Bucket
```toml
[[r2_buckets]]
binding = "R2"
bucket_name = "emausvota-fotos"
```

## 4. Upload de Assets para R2

### Logo
```bash
# Fazer upload do logo para R2 (necessário para emails)
wrangler r2 object put emausvota-fotos/logo.png --file=client/public/logo.png --remote
```

## 5. Migração de Dados SQLite → D1

Após fazer deploy, execute a migração:

```bash
# 1. Exportar dados do SQLite local
node scripts/export-sqlite-data.js > data.json

# 2. Criar tabelas no D1
wrangler d1 execute emausvota-db --remote --file=./drizzle/schema.sql

# 3. Importar dados para D1
node scripts/import-to-d1.js data.json
```

## 6. Cron Triggers (Birthday Scheduler)

Configure no Cloudflare Dashboard ou via `wrangler.toml`:

```toml
[triggers]
crons = ["0 9 * * *"]  # Roda todo dia às 9h UTC (6h BR)
```

## 7. Compatibilidade Flags

Já configurado no `wrangler.toml`:

```toml
compatibility_flags = ["nodejs_compat"]
compatibility_date = "2025-01-01"
```

Isso habilita:
- `node:buffer` API
- Web Crypto API
- Outras APIs compatíveis com Node.js

## 8. Deploy

```bash
# Deploy para Cloudflare Pages
npm run deploy

# ou manualmente
wrangler pages deploy dist/public
```

## 9. Checklist de Pré-Deploy

- [ ] JWT_SECRET configurado
- [ ] RESEND_API_KEY configurado
- [ ] Logo uploaded para R2
- [ ] D1 database criado e bindings configurados
- [ ] R2 bucket criado e bindings configurados
- [ ] Cron triggers configurados
- [ ] Dados migrados de SQLite para D1
- [ ] Testar autenticação
- [ ] Testar upload de fotos
- [ ] Testar envio de emails
- [ ] Testar criação de eleição

## 10. Problemas Comuns

### Logo não aparece nos emails
- Verificar se logo foi uploaded para R2: `wrangler r2 object list emausvota-fotos`
- Verificar se R2_PUBLIC_URL está correto
- Verificar logs de email para erros de download

### Autenticação falha
- Verificar se JWT_SECRET está configurado
- Verificar se compatibilidade nodejs_compat está habilitada
- Verificar logs para erros de Web Crypto

### Upload de fotos falha
- Verificar R2 binding no wrangler.toml
- Verificar permissões do bucket
- Verificar logs da Pages Function

### Emails não enviam
- Verificar RESEND_API_KEY
- Verificar domínio verificado no Resend
- Verificar logs para erros de API

## 11. Monitoramento

Acesse logs em tempo real:
```bash
wrangler pages deployment tail
```

Ou pelo Dashboard:
- Cloudflare Dashboard > Workers & Pages > emausvota-worker > Logs
