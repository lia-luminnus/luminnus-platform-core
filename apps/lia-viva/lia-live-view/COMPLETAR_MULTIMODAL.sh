#!/bin/bash

# ======================================================================
# SCRIPT DE FINALIZAÇÃO - SISTEMA MULTIMODAL 100%
# ======================================================================

echo "🚀 Iniciando finalização do sistema multimodal..."

cd "D:/Projeto_Lia_Node_3_gpt/lia-live-view"

# ======================================================================
# 1. INSTALAR DEPENDÊNCIAS
# ======================================================================

echo "📦 Instalando dependências..."
npm install multer @types/multer --save
npm install @google/generative-ai --save

# ======================================================================
# 2. CRIAR DIRETÓRIO PARA MEMÓRIAS
# ======================================================================

echo "📁 Criando diretório de dados..."
mkdir -p server/data

# ======================================================================
# 3. BUILD DO PROJETO
# ======================================================================

echo "🔨 Compilando projeto..."
npm run build

echo "✅ Script concluído!"
echo ""
echo "📝 Próximos passos manuais:"
echo "1. Editar server/server.ts - adicionar: import { setupMultimodalRoutes } from './routes/multimodal.js';"
echo "2. Editar server/server.ts - adicionar: setupMultimodalRoutes(app); (após outras rotas)"
echo "3. Rodar: npx tsx server/server.ts"
echo "4. Rodar: npm run dev (em outro terminal)"
