import { Express } from 'express';
import { ensureSession } from '../server.js';
import { loadImportantMemories } from '../config/supabase.js';
import { getContext } from '../services/memoryService.js';
import { LIA_FULL_PERSONALITY, LIA_GEMINI_LIVE_PERSONALITY } from '@luminnus/shared';

export function setupSessionRoutes(app: Express) {
  // GET /api/session - Retorna sessão atual + API Key
  app.get('/api/session', async (req, res) => {
    const geminiApiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.API_KEY;

    const session = await ensureSession();

    const response: any = {
      conversationId: session.conversationId,
      systemInstruction: session.systemInstruction,
      messages: session.messages
    };

    // Include API key if available
    if (geminiApiKey) {
      response.apiKey = geminiApiKey;
    }

    res.json(response);
  });

  // GET /api/history - Retorna histórico de mensagens
  app.get('/api/history', async (req, res) => {
    const session = await ensureSession();
    res.json({
      messages: session.messages
    });
  });

  // POST /api/history/save - Salva mensagem no histórico
  app.post('/api/history/save', async (req, res) => {
    try {
      const { message } = req.body;
      if (message) {
        const session = await ensureSession();
        session.messages.push(message);
      }
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  // POST /api/location - Salva localização do usuário
  app.post('/api/location', async (req, res) => {
    try {
      const { latitude, longitude, address, conversationId, userId } = req.body;
      const session = await ensureSession(userId, conversationId);

      session.userLocation = {
        latitude,
        longitude,
        address,
        timestamp: Date.now()
      };

      console.log(`📍 Localização atualizada para sessão ${session.conversationId}: ${address || `${latitude}, ${longitude}`}`);
      res.json({ ok: true, location: session.userLocation });
    } catch (error) {
      console.error('❌ Erro ao salvar localização:', error);
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  // GET /api/live-token - Gera ephemeral token para Gemini Live
  app.get('/api/live-token', async (req, res) => {
    try {
      const geminiApiKey = process.env.GEMINI_API_KEY;

      if (!geminiApiKey) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY não configurada no servidor'
        });
      }

      // ===============================================================
      // EXTRAIR userId DO TOKEN SUPABASE (Authorization header)
      // ===============================================================
      const authHeader = req.headers.authorization;
      let userId = '00000000-0000-0000-0000-000000000001'; // Fallback para dev

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const supabaseUrl = process.env.SUPABASE_URL!;
          const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
          const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
            auth: { persistSession: false, autoRefreshToken: false }
          });

          const { data, error } = await supabaseAdmin.auth.getUser(token);
          if (!error && data?.user?.id) {
            userId = data.user.id;
            console.log(`🔐 [live-token] UserId extraído do token: ${userId}`);
          } else {
            console.warn('⚠️ [live-token] Falha ao validar token, usando fallback');
          }
        } catch (authErr) {
          console.warn('⚠️ [live-token] Erro ao processar token:', authErr);
        }
      } else {
        console.log('ℹ️ [live-token] Sem Authorization header, usando userId de dev');
      }

      // ===============================================================
      // CARREGAR CONTEXTO COMPLETO VIA getContext (SSOT)
      // ===============================================================

      // Receber conversationId do frontend (query param ou criar novo)
      const conversationId = req.query.conversationId as string || `live_${userId.split('-')[0]}_${Date.now()}`;
      console.log(`🧠 [live-token] Carregando contexto para conv=${conversationId}, user=${userId}`);

      // Carregar sessão (para userLocation)
      const session = await ensureSession(userId, conversationId);

      // Usar getContext para carregar histórico + memórias + systemInstruction
      const context = await getContext(conversationId, userId, undefined, session?.userLocation);

      // Extrair histórico formatado do contexto (já está no systemInstruction, mas logamos para debug)
      const historyCount = context.history?.length || 0;
      console.log(`📜 [live-token] ${historyCount} mensagens de histórico carregadas do banco`);

      // Localização
      let locationContext = '';
      if (session.userLocation?.address) {
        locationContext = `\n\n📍 LOCALIZAÇÃO DO USUÁRIO: ${session.userLocation.address}`;
      }

      // v4.30: Extrair nome do usuário das memórias (busca robusta em múltiplas chaves)
      let userNameFromMemory = '';
      const memories = context.memories || [];

      // Debug: Logar memórias recebidas
      console.log(`🧠 [live-token] ${memories.length} memórias carregadas:`,
        memories.map((m: any) => `${m.key}: ${(m.content || '').substring(0, 30)}`));

      // Buscar nome em múltiplas chaves possíveis
      const nameKeys = ['nome_usuario', 'nome', 'name', 'user_name', 'full_name'];
      for (const key of nameKeys) {
        const mem = memories.find((m: any) => (m.key || '').toLowerCase() === key.toLowerCase());
        if (mem && mem.content) {
          userNameFromMemory = mem.content.trim();
          console.log(`👤 [live-token] Nome encontrado via key '${mem.key}': ${userNameFromMemory}`);
          break;
        }
      }

      // Se ainda não encontrou, buscar por conteúdo que mencione "nome" ou "chama"
      if (!userNameFromMemory) {
        const nameMem = memories.find((m: any) => {
          const keyLower = (m.key || '').toLowerCase();
          return keyLower.includes('nome') || keyLower.includes('cham') || keyLower.includes('name');
        });
        if (nameMem && nameMem.content) {
          userNameFromMemory = nameMem.content.trim();
          console.log(`👤 [live-token] Nome encontrado via busca parcial: ${userNameFromMemory}`);
        }
      }

      // v4.31: Injetar consciência de controle de dashboard (LIA Action)
      const { DASHBOARD_CONTROL_PROMPT } = await import('@luminnus/shared').catch(() => ({ DASHBOARD_CONTROL_PROMPT: '' }));


      // Construir systemInstruction COMPLETO para motor de voz Gemini
      // Integrando ContextPack (Persona + Memória + Histórico + Voz)
      const fullSystemInstruction = `${LIA_GEMINI_LIVE_PERSONALITY}
${userNameFromMemory ? `\n[NOME DO USUÁRIO - OBRIGATÓRIO] O nome do usuário é: ${userNameFromMemory}. SEMPRE use este nome corretamente nas interações.` : ''}

=== IDENTIDADE CRÍTICA ===
• Seu nome é LIA (Lia).
• NUNCA, em hipótese alguma, se chame de "Lilian" ou aceite ser chamada de "Lilian".
• Se o usuário disser "Lilian", você pode gentilmente dizer "É Lia, na verdade!".
• Sua identidade é LIA - Luminnus Intelligent Assistant.

=== CONTEXTO DINÂMICO (Tempo/Localização/Memórias) ===
${context.systemInstruction.replace(LIA_FULL_PERSONALITY, '')}

=== CONTROLE DE DASHBOARD (LUMINNUS) ===
${DASHBOARD_CONTROL_PROMPT}

=== REGRAS DE VOZ (MULTIMODAL) ===
• Respostas CURTAS e NATURAIS (máximo 2-3 frases).
• Sotaque brasileiro natural. NUNCA narre emojis ou ações.
• Se já houve conversa por texto, não cumprimente de novo. Continue o assunto.
• Você TEM memória persistente. Use o que sabe sobre o usuário naturalmente.
• Quando o usuário corrigir grafia do nome (ex: "com dois L"), APLIQUE a correção ao escrever/falar o nome.

=== POLÍTICA DE EXECUÇÃO DE FERRAMENTAS (CRÍTICO) ===
• **REGRA DE OURO**: Você DEVE chamar a ferramenta (function call) ANTES de confirmar ao usuário que fez algo.
• **NUNCA alucine sucesso**: Se você vai agendar na agenda, use 'createCalendarEvent'. Só diga "Agendado!" DEPOIS que a ferramenta retornar sucesso.
• **Fluxo de Agenda**: Para agendar, você PRECISA de Título, Início e Fim (ISO). Se não souber a duração, assuma 1 hora.
• **Confirmação Visual**: O usuário verá um indicador de que você está executando a ferramenta. Não precisa dizer "estou processando", as ferramentas cuidam disso.
• Se o usuário pedir para "lembrar" ou "anotar", use 'createCalendarEvent' ou 'saveMemory' conforme o contexto.

=== CONSCIÊNCIA DE HISTÓRICO (CRÍTICO) ===
• O CONTEXTO DINÂMICO acima contém o HISTÓRICO RECENTE DA CONVERSA.
• Este histórico inclui mensagens trocadas por TEXTO antes de você entrar em modo de voz.
• Se o usuário perguntar "o que a gente tava conversando?" ou "qual foi minha primeira pergunta?", CONSULTE o histórico.
• Se houver análise de IMAGEM ou ARQUIVO no histórico, você LEMBRA. Consulte o log.
• Se o usuário perguntar sobre algo que NÃO está no histórico, diga que o contexto atual não contém essa informação.
• Se o usuário perguntar sobre emails que você trouxe, CONSULTE o histórico onde você listou esses emails.

=== GATILHOS DE BUSCA EM TEMPO REAL (searchWeb) ===
• O uso da ferramenta "searchWeb" é OBRIGATÓRIO quando o usuário usar palavras-chave como: "últimas", "notícias", "cotação", "preço", "taxa", "ao vivo", "atualizado", "2026", "essa semana".
• Se a busca falhar ou demorar, use a transparência: "Não consegui validar em tempo real agora, mas..."
• NUNCA alucine dados em tempo real sem consultar a ferramenta.
• Ao responder após uma busca, cite a fonte ou trecho do resultado.
`;

      // Log simplificado
      console.log('📋 [live-token-v4.5-DEBUG] SystemInstruction preparado COM contexto unificado');

      // v3.2: Log detalhado do histórico para debug
      const historyMarkerFound = context.systemInstruction.includes('=== HISTÓRICO RECENTE');
      if (historyMarkerFound) {
        const historyStart = context.systemInstruction.indexOf('=== HISTÓRICO RECENTE');
        const historyPreview = context.systemInstruction.substring(historyStart, historyStart + 500);
        console.log('📜 [live-token] HISTÓRICO encontrado no systemInstruction:', historyPreview.substring(0, 200) + '...');
      } else {
        console.warn('⚠️ [live-token] HISTÓRICO NÃO encontrado no systemInstruction do getContext!');
      }

      // ===============================================================
      // GERAR TOKEN EPHEMERAL
      // ===============================================================

      const { GoogleGenAI } = await import('@google/genai');
      const client = new GoogleGenAI({ apiKey: geminiApiKey, httpOptions: { apiVersion: 'v1alpha' } });

      const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      const token = await (client as any).authTokens.create({
        config: {
          uses: 1,
          expireTime: expireTime,
          liveConnectConstraints: {
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            config: {
              // v4.26: OBRIGATÓRIO manter apenas AUDIO para evitar erro 1007 (TEXT não suportado em ephemeral tokens do Live API)
              responseModalities: ['AUDIO'],

              // v5.0: Google Search Grounding (busca nativa - NÃO causa erro 1008)
              // Permite que o Gemini faça buscas em tempo real diretamente, sem precisar de tools customizados
              tools: [{ googleSearch: {} }],

              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: 'Aoede'
                  }
                },
                languageCode: 'pt-BR'
              },

              // v4.21: Transcrição - OBRIGATÓRIO para obter texto junto com áudio
              // Usar camelCase (implementação original usa camelCase)
              inputAudioTranscription: {},   // Transcreve fala do usuário
              outputAudioTranscription: {},  // v4.32: RESTAURADO - necessário para transcrição limpa (sem thinking)

              // v4.31: Tools customizados removidos (causa erro 1008)
              // v5.0: googleSearch habilitado acima como alternativa nativa

              systemInstruction: fullSystemInstruction
            }
          }
        }
      });

      console.log('✅ Ephemeral token gerado para Gemini Live');
      console.log('   📋 Contexto incluído:', {
        conversationId,
        userId,
        historico: historyCount > 0 ? `${historyCount} msgs` : 'NÃO',
        localizacao: locationContext ? 'SIM' : 'NÃO',
        hasHistoryInInstruction: fullSystemInstruction.includes('=== HISTÓRICO RECENTE'),
        instructionLength: fullSystemInstruction.length
      });

      res.json({ token: token.name, expiresAt: expireTime });

    } catch (error: any) {
      console.error('❌ Erro ao gerar ephemeral token:', error);
      res.status(500).json({
        error: 'Falha ao gerar token',
        details: error.message
      });
    }
  });
}
