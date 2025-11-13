# Configuração Cloudflare Workers - Emaús Vota

Este documento contém as instruções para configurar os secrets necessários para o Worker do Cloudflare.

## 📋 Pré-requisitos

1. Wrangler CLI instalado (`npm install -g wrangler` ou já está no projeto)
2. Autenticado no Cloudflare (`wrangler login`)
3. Worker já criado no Cloudflare Dashboard

## 🔐 Configurando Secrets

⚠️ **IMPORTANTE:** Os valores dos secrets devem ser fornecidos pelo administrador do sistema. NUNCA commite secrets no repositório Git!

Execute os comandos abaixo **na ordem**. O comando solicitará que você digite o valor do secret:

### 1. JWT Secret
```bash
wrangler secret put JWT_SECRET
```
Digite o valor quando solicitado (gerado anteriormente para o sistema)

### 2. Resend API Key
```bash
wrangler secret put RESEND_API_KEY
```
Digite sua API key do Resend (obtida em https://resend.com/api-keys)

### 3. Resend From Email
```bash
wrangler secret put RESEND_FROM_EMAIL
```
Digite o email remetente verificado no Resend (ex: `suporte@seudominio.com.br`)

### 4. R2 Access Key ID
```bash
wrangler secret put R2_ACCESS_KEY_ID
```
Digite o Access Key ID do R2 (obtido no Cloudflare Dashboard → R2 → Manage R2 API Tokens)

### 5. R2 Secret Access Key
```bash
wrangler secret put R2_SECRET_ACCESS_KEY
```
Digite o Secret Access Key do R2 (obtido junto com o Access Key ID)

## ✅ Verificar Configuração

Após configurar todos os secrets, você pode verificar quais foram configurados (sem ver os valores):

```bash
wrangler secret list
```

## 🚀 Deploy

### Opção 1: Deploy via Wrangler (Worker)
```bash
wrangler deploy
```

### Opção 2: Deploy via Cloudflare Pages (Recomendado para este projeto)
Como o projeto usa Cloudflare Pages Functions (pasta `functions/`), você deve fazer deploy via Pages:

```bash
# Build do frontend
npm run build

# Deploy via wrangler pages
wrangler pages deploy dist
```

Ou configure o deploy automático conectando seu repositório GitHub ao Cloudflare Pages no Dashboard.

## 📝 Estrutura do Projeto

Este projeto usa **Cloudflare Pages Functions**, não Workers tradicionais:

- ✅ **Frontend:** Build em `dist/` (Vite)
- ✅ **Backend:** Functions em `functions/` (executadas no edge)
- ✅ **Database:** D1 Database binding `DB`
- ✅ **Storage:** R2 Bucket binding `R2`
- ✅ **Emails:** Resend API

## 🔧 Configuração no Cloudflare Dashboard

No Cloudflare Pages, você também pode configurar os secrets via Dashboard:

1. Acesse seu projeto no Cloudflare Pages
2. Vá em **Settings** → **Environment Variables**
3. Adicione cada secret como variável de ambiente
4. Marque como **Encrypted** para secrets sensíveis

## 🌐 URLs e Bindings

- **Worker/Pages URL:** `https://emausvota.com.br`
- **R2 Public URL:** `https://pub-39e66b84b6f1472fb913c941ca636fc6.r2.dev`
- **D1 Database:** `emausvota-db` (binding: `DB`)
- **R2 Bucket:** `emausvota-fotos` (binding: `R2`)

## 🔄 Atualizando Secrets

Se precisar atualizar algum secret:

```bash
wrangler secret put <NOME_DO_SECRET>
```

Ou atualize via Cloudflare Dashboard.

## 🗑️ Removendo Secrets

Para remover um secret (caso necessário):

```bash
wrangler secret delete <NOME_DO_SECRET>
```

## ⚠️ Notas de Segurança

- ❌ **NUNCA** commite secrets no código ou no repositório
- ✅ Use sempre `wrangler secret put` ou o Dashboard para configurar secrets
- ✅ Os secrets são criptografados e armazenados com segurança no Cloudflare
- ✅ Cada ambiente (preview/production) pode ter secrets diferentes
- 🔄 Rotacione secrets regularmente por segurança
