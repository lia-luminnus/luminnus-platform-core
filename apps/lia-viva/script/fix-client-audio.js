// Script para adicionar listener lia-audio ao client.js
import fs from 'fs';

const filePath = 'd:/Projeto_Lia_Node_3_gpt/public/client.js';
let content = fs.readFileSync(filePath, 'utf8');

// Procurar pelo listener lia-message e adicionar lia-audio logo depois
const pattern = /(\/\/ Listener para mensagem de texto \(fallback\)\s*socket\.on\("lia-message",\s*async\s*\(text\)\s*=>\s*\{[^}]+\}\);)/;

const replacement = `$1

// ✅ NOVO: Listener para áudio de resposta
socket.on("lia-audio", async (audioArray) => {
  console.log("🔊 Áudio recebido:", audioArray.length, "bytes");
  liaImage.classList.remove('searching');
  
  try {
    await playAudioResponse(audioArray);
  } catch (err) {
    console.error("❌ Erro ao reproduzir áudio:", err);
  }
});`;

if (content.match(pattern)) {
    content = content.replace(pattern, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Listener lia-audio adicionado com sucesso!');
} else {
    console.log('⚠️ Padrão não encontrado. Verifique o arquivo manualmente.');
}
