#!/usr/bin/env bash
# Script de build para o Render (Static Site)
set -e

# 1. Instalar pnpm
echo "Installing pnpm..."
npm install -g pnpm@9.0.0

# 2. Instalar dependências de todo o monorepo
echo "Installing dependencies..."
pnpm install

# 3. Buildar pacotes internos na ordem correta (SEQUENCIAL)
echo "Building @luminnus/shared..."
cd packages/shared && pnpm build && cd ../..

echo "Building @luminnus/core..."
cd packages/core && pnpm build && cd ../..

# 4. Buildar o frontend
echo "Building @luminnus/web..."
cd apps/web && pnpm build && cd ../..

echo "Build complete!"
