#!/bin/bash

# Script para configurar todos os secrets necessários no Cloudflare
# Execute este script após fazer login: wrangler login

echo "Configurando secrets do Cloudflare..."

# JWT Secret
echo "8734f1e5b92c478be8173af3d2f4ee1c" | npx wrangler secret put JWT_SECRET

# Resend API Key
echo "re_Yr1HaGUQ_KZVQzTHT5zfEoXAwUYYGAbpn" | npx wrangler secret put RESEND_API_KEY

# Resend From Email
echo "suporte@emausvota.com.br" | npx wrangler secret put RESEND_FROM_EMAIL

# R2 Access Key ID
echo "25c9b14c465587ef0bb8a05255b4c0a1" | npx wrangler secret put R2_ACCESS_KEY_ID

# R2 Secret Access Key
echo "5c3ea755bc532c2f60acedca698c92e5b2e530e092c1eb400215b6a07d64f338" | npx wrangler secret put R2_SECRET_ACCESS_KEY

echo "✅ Todos os secrets foram configurados com sucesso!"
