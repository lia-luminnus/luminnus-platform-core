/**
 * Gemini Service - REFATORADO para usar backend LIA
 * =====================================================
 * ANTES: Usava @google/genai diretamente (SDK no frontend)
 * AGORA: Faz chamada HTTP para /api/lia/chat (proxy para backend)
 * 
 * Regra de arquitetura: Nenhum SDK de IA no frontend.
 * Toda IA roda no backend LIA (porta 3000).
 */

/**
 * Envia mensagem para LIA via backend
 * Endpoint: POST /api/lia/chat → backend porta 3000
 */
export const sendMessageToGemini = async (message: string): Promise<string> => {
  try {
    // Chamada via proxy Vite → backend LIA
    const response = await fetch('/api/lia/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        conversationId: `conv_${Date.now()}`,
        personality: 'viva'
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    return data.reply || "I couldn't generate a response.";
  } catch (error) {
    console.error("LIA Backend Error:", error);
    return "Sorry, I encountered an error connecting to LIA. Please try again.";
  }
};