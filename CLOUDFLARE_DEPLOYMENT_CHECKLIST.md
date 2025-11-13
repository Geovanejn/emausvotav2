# ✅ Checklist de Deploy - Cloudflare Pages

**Projeto**: Emaús Vota  
**Data**: 13 de novembro de 2025  
**Status da Migração**: 100% Completo (41/41 rotas)

---

## 📋 Pré-requisitos

### 1. Ferramentas Instaladas
- [ ] Node.js 20+ instalado
- [ ] Wrangler CLI instalado (`npm install -g wrangler`)
- [ ] Conta Cloudflare ativa
- [ ] Acesso ao repositório Git

### 2. Credenciais Preparadas
- [ ] Resend API Key obtida (https://resend.com)
- [ ] Email "From" verificado no Resend
- [ ] JWT Secret gerado (min 32 caracteres): `openssl rand -base64 32`
- [ ] Cloudflare Account ID anotado

---

## 🔧 Setup Local (Desenvolvimento)

### Passo 1: Instalar Dependências
```bash
npm install
```

### Passo 2: Criar D1 Database Local
```bash
# Criar database D1 de desenvolvimento
wrangler d1 create emausvota-db-dev

# Anotar o database_id retornado
# Atualizar wrangler.toml: database_id = "SEU_ID_AQUI"
```

### Passo 3: Executar Migrações
```bash
# Aplicar schema SQL no D1
wrangler d1 execute emausvota-db-dev --file=./migrations/d1-schema.sql

# Verificar tabelas criadas
wrangler d1 execute emausvota-db-dev --command="SELECT name FROM sqlite_master WHERE type='table'"
```

### Passo 4: Seed Inicial (Opcional)
```bash
# Criar posições fixas (já incluídas no schema)
wrangler d1 execute emausvota-db-dev --command="SELECT * FROM positions"

# Criar usuário admin de teste
wrangler d1 execute emausvota-db-dev --command="
INSERT INTO users (full_name, email, password, has_password, is_admin, is_member, active_member) 
VALUES (
  'Admin Teste', 
  'admin@teste.com', 
  '\$2a\$10\$X1234567890123456789012345678901234567890123456', 
  1, 
  1, 
  1, 
  1
)"
```

**Nota**: Use bcrypt para gerar senha real. Exemplo em Node.js:
```javascript
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('suaSenha123', 10);
console.log(hash);
```

### Passo 5: Configurar Secrets Locais
```bash
# Criar arquivo .dev.vars (NÃO commitar!)
cat > .dev.vars << EOF
JWT_SECRET=seu-jwt-secret-aqui-min-32-chars
RESEND_API_KEY=re_sua_chave_resend_aqui
RESEND_FROM_EMAIL=suporte@seudominio.com.br
EOF
```

### Passo 6: Testar Localmente
```bash
# Modo desenvolvimento com Express (backend atual)
npm run dev

# OU testar com Cloudflare Functions localmente
wrangler pages dev dist --d1=DB=emausvota-db-dev
```

---

## 🚀 Deploy em Staging (Cloudflare Pages Preview)

### Passo 1: Conectar Repositório
1. Ir para [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages
2. Clicar em "Create a project" → "Connect to Git"
3. Autorizar GitHub/GitLab e selecionar repositório
4. Configurar build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (raiz)
   - **Node version**: `20`

### Passo 2: Criar D1 Database de Staging
```bash
# Criar database para staging
wrangler d1 create emausvota-db-staging

# Anotar database_id
# Atualizar wrangler.toml no ambiente staging (se houver)
```

### Passo 3: Executar Migrações em Staging
```bash
wrangler d1 execute emausvota-db-staging --file=./migrations/d1-schema.sql

# Criar admin inicial
# (Use script ou comando manual via wrangler)
```

### Passo 4: Criar R2 Bucket de Staging
```bash
wrangler r2 bucket create emausvota-fotos-staging
```

### Passo 5: Configurar Bindings no Dashboard
1. Ir para **Pages** → Seu projeto → **Settings** → **Functions**
2. Adicionar **D1 Database Binding**:
   - Variable name: `DB`
   - D1 Database: `emausvota-db-staging`
3. Adicionar **R2 Bucket Binding**:
   - Variable name: `FOTOS`
   - R2 Bucket: `emausvota-fotos-staging`

### Passo 6: Configurar Environment Variables
1. Ir para **Settings** → **Environment variables**
2. Adicionar variáveis para **Preview** (staging):
   - `R2_PUBLIC_URL` = URL pública do bucket (pode ser `https://pub-HASH.r2.dev` temporariamente)
   - `JWT_SECRET` = Seu secret (use um diferente de produção!)
   - `RESEND_API_KEY` = Sua chave Resend
   - `RESEND_FROM_EMAIL` = Email remetente

### Passo 7: Deploy e Testar
```bash
# Push para branch de staging (ou main)
git push origin main

# Cloudflare vai fazer build e deploy automaticamente
# Aguardar deploy completar no dashboard

# Testar endpoints:
# https://seu-projeto-HASH.pages.dev/api/elections/active
```

### Passo 8: Criar Usuários de Teste
```bash
# Chamar endpoint de seed (apenas em dev/staging!)
curl -X POST https://seu-projeto-HASH.pages.dev/api/dev/seed-test-users
```

---

## 🏭 Deploy em Produção

### Passo 1: Criar D1 Database de Produção
```bash
wrangler d1 create emausvota-db

# Anotar database_id
# Atualizar wrangler.toml: database_id = "SEU_ID_PRODUCAO"
```

### Passo 2: Executar Migrações em Produção
```bash
wrangler d1 execute emausvota-db --file=./migrations/d1-schema.sql

# Verificar
wrangler d1 execute emausvota-db --command="SELECT COUNT(*) FROM positions"
# Deve retornar 8 posições
```

### Passo 3: Criar Admin de Produção
```bash
# Gerar senha hash
node -e "console.log(require('bcryptjs').hashSync('SuaSenhaSegura123!', 10))"

# Inserir admin
wrangler d1 execute emausvota-db --command="
INSERT INTO users (full_name, email, password, has_password, is_admin, is_member, active_member)
VALUES (
  'UMP Emaús',
  'marketingumpemaus@gmail.com',
  '\$2a\$10\$HASH_GERADO_ACIMA',
  1,
  1,
  1,
  1
)"
```

### Passo 4: Criar R2 Bucket de Produção
```bash
wrangler r2 bucket create emausvota-fotos

# Configurar domínio customizado (opcional mas recomendado)
# Dashboard → R2 → emausvota-fotos → Settings → Custom Domains
# Adicionar: fotos.emausvota.com.br (ou seu domínio)
```

### Passo 5: Configurar Secrets de Produção
```bash
# Configurar secrets via CLI
wrangler secret put JWT_SECRET
# Cole um secret DIFERENTE do staging (min 32 chars)

wrangler secret put RESEND_API_KEY
# Cole sua chave Resend

wrangler secret put RESEND_FROM_EMAIL
# Cole: suporte@emausvota.com.br (ou seu email verificado)
```

### Passo 6: Configurar Bindings de Produção
1. Ir para **Pages** → Seu projeto → **Settings** → **Functions**
2. Em **Production** (não Preview):
   - D1 Binding: `DB` → `emausvota-db`
   - R2 Binding: `FOTOS` → `emausvota-fotos`
3. Em **Environment variables** → **Production**:
   - `R2_PUBLIC_URL` = `https://fotos.emausvota.com.br` (ou seu domínio)

### Passo 7: Deploy para Produção
```bash
# Fazer merge para branch de produção (main)
git checkout main
git merge develop
git push origin main

# Ou deploy manual via wrangler
npm run build
wrangler pages deploy dist --project-name emausvota

# Aguardar deploy completar
```

### Passo 8: Configurar Custom Domain (Opcional)
1. Dashboard → Pages → Seu projeto → **Custom domains**
2. Adicionar domínio: `emausvota.com.br`
3. Seguir instruções para configurar DNS
4. Aguardar SSL provisioning (automático)

### Passo 9: Testar Produção
```bash
# Testar endpoints principais
curl https://emausvota.com.br/api/elections/active
curl https://emausvota.com.br/api/positions

# Fazer login como admin
curl -X POST https://emausvota.com.br/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"marketingumpemaus@gmail.com","password":"SuaSenha123!"}'
```

---

## ⏰ Configurar Cron Jobs (Birthday Emails)

### Opção 1: Cloudflare Worker Separado (Recomendado)
```bash
# Criar novo Worker para scheduled jobs
wrangler init birthday-scheduler --template scheduled

# Editar wrangler.toml do Worker:
[triggers]
crons = ["0 10 * * *"]  # 10h UTC = 7h Brasília

# Deploy
cd birthday-scheduler
wrangler deploy
```

### Opção 2: Serviço Externo (Alternativa)
- Usar [cron-job.org](https://cron-job.org) ou similar
- Configurar POST para `https://emausvota.com.br/api/scheduled/birthday-check`
- Adicionar authentication header

---

## 🔒 Security Checklist

- [ ] JWT_SECRET tem 32+ caracteres e é aleatório
- [ ] JWT_SECRET de produção é DIFERENTE de staging/dev
- [ ] Secrets não estão no código ou wrangler.toml
- [ ] RESEND_FROM_EMAIL está verificado no Resend
- [ ] Admin password é forte (min 12 chars, mix de chars)
- [ ] D1 database de produção está em região apropriada
- [ ] R2 bucket tem acesso público limitado (somente leitura)
- [ ] Custom domain tem SSL configurado
- [ ] Endpoint /api/dev/seed-test-users está bloqueado em produção (via env check)

---

## 📊 Validação Pós-Deploy

### Testes Funcionais
- [ ] Login com email/senha funciona
- [ ] Login com código de verificação funciona
- [ ] Email de verificação é recebido
- [ ] Criação de eleição funciona
- [ ] Lista de presença funciona
- [ ] Adição de candidatos funciona
- [ ] Votação funciona (1º, 2º, 3º escrutínio)
- [ ] Resolução de empates funciona
- [ ] Resultados aparecem corretamente
- [ ] Auditoria PDF pode ser gerada
- [ ] Email de auditoria é enviado
- [ ] Verificação de hash funciona

### Testes de Performance
- [ ] Tempo de resposta das APIs < 500ms
- [ ] D1 queries estão otimizadas (usar indexes)
- [ ] Cloudflare Analytics mostra tráfego correto
- [ ] Sem erros nos logs do Cloudflare

### Testes de Segurança
- [ ] Rotas de admin retornam 401/403 sem autenticação
- [ ] JWT expira após 2 horas
- [ ] Candidatos duplicados são bloqueados
- [ ] Voto duplicado é bloqueado
- [ ] CORS está configurado corretamente

---

## 🐛 Troubleshooting

### Erro: "Binding DB is not defined"
✅ **Solução**: Verificar que binding está configurado no dashboard e wrangler.toml

### Erro: "Table does not exist"
✅ **Solução**: Executar migrations: `wrangler d1 execute DB --file=migrations/d1-schema.sql`

### Erro: "Invalid token" em produção
✅ **Solução**: Verificar que JWT_SECRET está configurado via `wrangler secret put`

### Emails não são enviados
✅ **Solução**: 
1. Verificar RESEND_API_KEY está correto
2. Verificar FROM_EMAIL está verificado no Resend
3. Checar logs do Cloudflare para erros de API

### R2 upload retorna 403
✅ **Solução**: Verificar R2 binding está configurado corretamente no dashboard

---

## 📝 Rollback Plan

Se algo der errado em produção:

### Opção 1: Rollback via Dashboard
1. Ir para Pages → Seu projeto → **Deployments**
2. Encontrar deploy anterior que funcionava
3. Clicar em "..." → **Rollback to this deployment**

### Opção 2: Rollback via Git
```bash
git revert HEAD
git push origin main
```

### Opção 3: Manter Express em Paralelo
- Manter backend Express rodando em Replit como fallback
- Apontar DNS de volta para Replit se necessário

---

## 📞 Suporte & Recursos

- **Cloudflare Pages Docs**: https://developers.cloudflare.com/pages/
- **D1 Database Docs**: https://developers.cloudflare.com/d1/
- **R2 Storage Docs**: https://developers.cloudflare.com/r2/
- **Wrangler CLI Docs**: https://developers.cloudflare.com/workers/wrangler/
- **Resend Docs**: https://resend.com/docs

---

## ✅ Conclusão

Este checklist garante que todos os aspectos críticos do deploy foram considerados. Siga passo a passo e valide cada item antes de prosseguir.

**Última atualização**: 13 de novembro de 2025  
**Status**: Pronto para deploy em staging e produção
