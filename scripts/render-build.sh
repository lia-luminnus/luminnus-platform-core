#!/usr/bin/env bash
# Script de build para o Render (Static Site)

# 1. Instalar pnpm
npm install -g pnpm@9.0.0

# 2. Instalar dependências de todo o monorepo
pnpm install

# 3. Buildar pacotes internos na ordem correta
echo "Building @luminnus/shared..."
pnpm --filter @luminnus/shared build

echo "Building @luminnus/core..."
pnpm --filter @luminnus/core build

# 4. Buildar o frontend
echo "Building @luminnus/web..."
pnpm --filter @luminnus/web build

echo "Build complete!"
