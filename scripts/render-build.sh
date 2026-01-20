#!/usr/bin/env bash
# Script de build para o Render (Static Site) - Standalone Frontend
set -e

# 1. Instalar pnpm
echo "Installing pnpm..."
npm install -g pnpm@9.0.0

# 2. Navegar para o diretório do frontend
cd apps/web

# 3. Instalar dependências apenas do frontend
echo "Installing frontend dependencies..."
pnpm install

# 4. Buildar o frontend
echo "Building frontend..."
pnpm build

echo "Build complete!"
