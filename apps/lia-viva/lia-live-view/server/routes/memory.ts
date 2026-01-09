import { Express } from 'express';
import { ensureSession } from '../server.js';
import { saveMemory, loadImportantMemories, detectAndSaveMemory, deleteMemory, forgetMemory, correctMemory } from '../config/supabase.js';
import { getContext } from '../services/memoryService.js';

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

export function setupMemoryRoutes(app: Express) {
  // GET /api/memory/load - Carrega memórias do Supabase
  app.get('/api/memory/load', async (req, res) => {
    try {
      const userId = (req.query.userId as string) || DEFAULT_USER_ID;
      console.log(`📚 [Memory] Carregando memórias para userId: ${userId}`);

      const memories = await loadImportantMemories(userId);

      console.log(`✅ [Memory] ${memories.length} memórias carregadas`);
      res.json({
        success: true,
        count: memories.length,
        memories
      });
    } catch (error) {
      console.error('❌ [Memory] Erro ao carregar:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // POST /api/memory/save - Salva memória no Supabase
  app.post('/api/memory/save', async (req, res) => {
    try {
      const { content, category, key, value, userId } = req.body;
      const uid = userId || DEFAULT_USER_ID;

      if (!content && !value) {
        return res.status(400).json({ success: false, error: 'Content or value is required' });
      }

      let result;

      // Se tem key/value explícito (chamada de ferramenta), salva direto
      if (key && value) {
        result = await saveMemory(uid, key, value);
        console.log(`✅ [Memory] Salvo explícito: ${key} = ${value}`);
      }
      // Se tem content, usar detectAndSaveMemory para extrair automaticamente
      else if (content) {
        // ============================================================
        // MEMORY GATE: Só salva se detectAndSaveMemory encontrar algo
        // NÃO há mais fallback para salvar tudo como info_importante
        // ============================================================
        const detected = await detectAndSaveMemory(content, uid);
        if (detected && detected.length > 0) {
          result = detected;
          console.log(`✅ [Memory] Detectado e salvo: ${detected.map((d: any) => d.key).join(', ')}`);
        } else {
          // NÃO salva nada - conteúdo trivial ou sem padrão reconhecido
          console.log(`ℹ️ [Memory Gate] Conteúdo ignorado (sem padrão de memória): "${content.substring(0, 50)}..."`);
          return res.json({
            success: true,
            saved: false,
            message: 'Conteúdo não contém informação de longo prazo.',
            gateBlocked: true
          });
        }
      }

      res.json({
        success: true,
        saved: true,
        message: '💾 Informação salva com sucesso!',
        result
      });
    } catch (error) {
      console.error('❌ [Memory] Erro ao salvar:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // GET /api/memories - Retorna todas as memórias (legado - session)
  app.get('/api/memories', async (req, res) => {
    try {
      const session = await ensureSession();
      res.json({
        ok: true,
        memories: session.memories || []
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  // DELETE /api/memory/:key - Deleta uma memória específica do Supabase
  app.delete('/api/memory/:key', async (req, res) => {
    try {
      const { key } = req.params;
      const userId = (req.query.userId as string) || DEFAULT_USER_ID;

      console.log(`🗑️ [Memory] Deletando chave '${key}' para userId: ${userId}`);

      const result = await deleteMemory(userId, key);

      if (result?.deleted) {
        console.log(`✅ [Memory] Memória '${key}' deletada do Supabase`);
        res.json({ success: true, deleted: true, key });
      } else {
        res.status(404).json({ success: false, error: 'Memory not found or already deleted' });
      }
    } catch (error) {
      console.error('❌ [Memory] Erro ao deletar:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // DELETE /api/memories/:id - Deleta uma memória específica (LEGADO - sessão)
  app.delete('/api/memories/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const session = await ensureSession();

      const initialLength = session.memories.length;
      session.memories = session.memories.filter((m: any) => m.id !== id);

      if (session.memories.length < initialLength) {
        console.log(`🗑️ Memória deletada (sessão): ${id}`);
        res.json({ ok: true, deleted: true });
      } else {
        res.status(404).json({ ok: false, error: 'Memory not found' });
      }
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  // GET /api/conversations/:id/context - Contexto Unificado
  app.get('/api/conversations/:id/context', async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req.query.userId as string) || DEFAULT_USER_ID;

      console.log(`🧠 [Memory] Obtendo contexto unificado para conversa: ${id}`);

      // v4.0.0: Buscar localização da sessão para Consciência Espacial
      const session = await ensureSession();
      const context = await getContext(id, userId, undefined, session.userLocation);

      res.json({
        ok: true,
        ...context
      });
    } catch (error) {
      console.error('❌ [Memory] Erro ao obter contexto:', error);
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  // ================================================================
  // MEMÓRIA COGNITIVA v3.0 - Endpoints de Governança
  // ================================================================

  // POST /api/memories/upsert - Cria ou atualiza memória por key
  app.post('/api/memories/upsert', async (req, res) => {
    try {
      const { key, value, userId, tenantId, scope } = req.body;
      const uid = userId || DEFAULT_USER_ID;

      if (!key || !value) {
        return res.status(400).json({ success: false, error: 'key and value are required' });
      }

      console.log(`📝 [Memory] Upsert: ${key} = ${value}`);

      const result = await saveMemory(uid, key, value, true); // allowOverwrite=true

      res.json({
        success: true,
        action: result?.status || 'upserted',
        key,
        value
      });
    } catch (error) {
      console.error('❌ [Memory] Erro no upsert:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // POST /api/memories/correct - Corrige uma memória existente
  app.post('/api/memories/correct', async (req, res) => {
    try {
      const { key, newValue, userId, tenantId } = req.body;
      const uid = userId || DEFAULT_USER_ID;

      if (!key || !newValue) {
        return res.status(400).json({ success: false, error: 'key and newValue are required' });
      }

      console.log(`✏️ [Memory] Correct: ${key} -> ${newValue}`);

      const result = await correctMemory(uid, key, newValue, tenantId);

      if (result?.corrected) {
        res.json({
          success: true,
          corrected: true,
          key,
          newValue
        });
      } else {
        res.status(404).json({ success: false, error: 'Memory not found or not active' });
      }
    } catch (error) {
      console.error('❌ [Memory] Erro na correção:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // POST /api/memories/forget - Soft delete de memória
  app.post('/api/memories/forget', async (req, res) => {
    try {
      const { key, userId, tenantId } = req.body;
      const uid = userId || DEFAULT_USER_ID;

      if (!key) {
        return res.status(400).json({ success: false, error: 'key is required' });
      }

      console.log(`🧹 [Memory] Forget: ${key}`);

      const result = await forgetMemory(uid, key, tenantId);

      if (result?.forgotten) {
        res.json({
          success: true,
          forgotten: true,
          key
        });
      } else {
        res.status(404).json({ success: false, error: 'Memory not found' });
      }
    } catch (error) {
      console.error('❌ [Memory] Erro ao esquecer:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });
}
