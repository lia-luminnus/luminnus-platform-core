import { Express } from 'express';
import { buscarNaWeb } from '../search/web-search.js';

export function setupSearchRoutes(app: Express) {
  // POST /api/web-search - Busca web via Google Custom Search
  app.post('/api/web-search', async (req, res) => {
    try {
      const { query } = req.body;

      if (!query) {
        return res.status(400).json({ error: 'Query obrigatória' });
      }

      console.log(`🔍 Busca web solicitada: "${query}"`);

      const results = await buscarNaWeb(query);

      res.json({
        ok: true,
        results: results
      });
    } catch (error) {
      console.error('❌ Erro web-search:', error);
      res.status(500).json({ ok: false, error: String(error) });
    }
  });
}
