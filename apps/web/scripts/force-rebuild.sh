#!/bin/bash

# Script para forçar rebuild completo do Admin Dashboard
# Elimina todo cache e garante renderização das alterações

echo "🧹 Limpando cache de build..."

# Remove diretórios de cache
rm -rf dist
rm -rf .vite
rm -rf node_modules/.vite
rm -rf node_modules/.cache

echo "✨ Cache limpo com sucesso!"

# Se houver argumentos, executa o comando
if [ "$1" == "build" ]; then
    echo "🔨 Iniciando build sem cache..."
    npm run build:force
    echo "✅ Build concluído!"
elif [ "$1" == "dev" ]; then
    echo "🚀 Iniciando servidor de desenvolvimento..."
    npm run dev
fi

echo "🎉 Pronto! O Admin Dashboard será renderizado com as últimas alterações."
