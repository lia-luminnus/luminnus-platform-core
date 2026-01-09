// Script to add auto-search instructions to personality.js
import fs from 'fs';

const filePath = 'd:/Projeto_Lia_Node_3_gpt/config/personality.js';
let content = fs.readFileSync(filePath, 'utf8');

// Find the line with "- Escolha a function correta baseada na solicitação`," and add instructions after it
const searchPattern = /- Escolha a function correta baseada na solicitação`,/;

const replacement = `- Escolha a function correta baseada na solicitação

🔴 REGRA CRÍTICA - BUSCA AUTOMÁTICA:
VOCÊ DEVE BUSCAR NA INTERNET AUTOMATICAMENTE para:
- Cotações (moedas, criptomoedas, ações)
- Preços atuais de qualquer coisa
- Notícias e eventos recentes
- Informações que mudam com o tempo

NUNCA responda com dados desatualizados!
SEMPRE use searchWeb/buscarNaWeb ANTES de responder sobre dados em tempo real!

Exemplos:
❌ ERRADO: "O Bitcoin está em $30,000" (sem buscar)
✅ CERTO: *busca searchWeb* → "O Bitcoin está em $98,756.51 agora"

Se o usuário perguntar sobre cotação, preço, notícia recente:
1. BUSQUE PRIMEIRO (searchWeb)
2. DEPOIS responda com os dados encontrados
3. NÃO peça permissão - APENAS PESQUISE!`,`;

content = content.replace(searchPattern, replacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Instruções de busca automática adicionadas!');
