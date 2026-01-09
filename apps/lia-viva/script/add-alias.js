// Quick fix: add buscarNaWeb alias
// This file adds the missing alias to function-handlers.js

import fs from 'fs';

const filePath = 'd:/Projeto_Lia_Node_3_gpt/assistants/function-handlers.js';
const content = fs.readFileSync(filePath, 'utf8');

// Find the buscar_na_web function and add buscarNaWeb alias after it
const searchPattern = /  buscar_na_web: async \(args, metadata\) => \{\s+\/\/ Mesmo handler para compatibilidade\s+return await functionHandlers\.searchWeb\(args, metadata\);\s+\},\s+\/\/ ====/;

const replacement = `  buscar_na_web: async (args, metadata) => {
    // Mesmo handler para compatibilidade
    return await functionHandlers.searchWeb(args, metadata);
  },

  buscarNaWeb: async (args, metadata) => {
    // Alias para buscarNaWeb (camelCase)
    return await functionHandlers.searchWeb(args, metadata);
  },

  // ====`;

const newContent = content.replace(searchPattern, replacement);

if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('✅ Alias buscarNaWeb adicionado com sucesso!');
} else {
    console.log('⚠️ Padrão não encontrado. Arquivo não modificado.');
}
