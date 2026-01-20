#!/usr/bin/env bash
# Script de build para o Render (Static Site)

# 1. Instalar pnpm
npm install -g pnpm@9.0.0

# 2. Instalar dependências de todo o monorepo
pnpm install

# 3. Buildar todo o monorepo usando Turbo
# Isso garante que a ordem de dependências seja respeitada automaticamente
echo "Building all packages and apps..."
pnpm build

echo "Build complete!"
