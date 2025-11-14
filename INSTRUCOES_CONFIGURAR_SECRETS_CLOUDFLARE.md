# 🔐 Configuração de Secrets no Cloudflare Pages

Para o site **Emaús Vota** funcionar corretamente em produção, você precisa configurar as seguintes variáveis de ambiente no painel do Cloudflare Pages.

## 📋 Passo a Passo

### 1. Acesse o Cloudflare Dashboard
1. Vá para: https://dash.cloudflare.com/
2. Faça login com sua conta (marketingumpemaus@gmail.com)
3. No menu lateral, clique em **"Workers & Pages"**
4. Encontre e clique no projeto **"emausvota"** na lista

### 2. Configure as Variáveis de Ambiente
1. Na página do projeto, vá até a aba **"Settings"** (Configurações)
2. Role até encontrar **"Environment variables"** (Variáveis de ambiente)
3. Clique em **"Add variables"** ou **"Edit variables"**

### 3. Adicione os Seguintes Secrets

**IMPORTANTE:** Configure estas variáveis para o ambiente **"Production"**

#### JWT_SECRET
- **Nome**: `JWT_SECRET`
- **Valor**: `8734f1e5b92c478be8173af3d2f4ee1c`
- **Tipo**: Encrypted (Secret)

#### RESEND_API_KEY
- **Nome**: `RESEND_API_KEY`
- **Valor**: `re_Yr1HaGUQ_KZVQzTHT5zfEoXAwUYYGAbpn`
- **Tipo**: Encrypted (Secret)

#### RESEND_FROM_EMAIL
- **Nome**: `RESEND_FROM_EMAIL`
- **Valor**: `suporte@emausvota.com.br`
- **Tipo**: Plain text

#### R2_ACCESS_KEY_ID
- **Nome**: `R2_ACCESS_KEY_ID`
- **Valor**: `25c9b14c465587ef0bb8a05255b4c0a1`
- **Tipo**: Encrypted (Secret)

#### R2_SECRET_ACCESS_KEY
- **Nome**: `R2_SECRET_ACCESS_KEY`
- **Valor**: `5c3ea755bc532c2f60acedca698c92e5b2e530e092c1eb400215b6a07d64f338`
- **Tipo**: Encrypted (Secret)

### 4. Salve e Reimplante
1. Após adicionar todas as variáveis, clique em **"Save"** ou **"Save and deploy"**
2. O Cloudflare Pages irá reimplantar automaticamente seu site
3. Aguarde alguns minutos para a reimplantação ser concluída

## ✅ Verificação

Após configurar todos os secrets:

1. Acesse: https://emausvota.pages.dev
2. Tente fazer login com:
   - **Email**: marketingumpemaus@gmail.com
   - **Senha**: reRe@@3131*#$
3. O login deve funcionar sem erros!

## 🎯 Resumo dos Secrets

| Nome | Descrição | Tipo |
|------|-----------|------|
| JWT_SECRET | Chave secreta para autenticação JWT | Secret |
| RESEND_API_KEY | Chave API do serviço Resend (emails) | Secret |
| RESEND_FROM_EMAIL | Email de envio do sistema | Plain text |
| R2_ACCESS_KEY_ID | ID de acesso ao R2 Storage | Secret |
| R2_SECRET_ACCESS_KEY | Chave secreta do R2 Storage | Secret |

## 📝 Notas Importantes

- **Segurança**: Mantenha estes valores em segredo
- **R2_PUBLIC_URL**: Já está configurado no `wrangler.toml` (não precisa adicionar)
- **D1 Database**: Já está vinculado automaticamente através do binding "DB"
- **Reimplantação**: Após adicionar/modificar variáveis, sempre é necessário reimplantar

---

💡 **Dúvidas?** Se após configurar os secrets o erro persistir, limpe o cache do navegador e tente novamente.
