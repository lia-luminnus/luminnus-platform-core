import { Express } from 'express';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { ToolService } from '../services/toolService.js';
import { geospatialService } from '../services/geospatialService.js';

dotenv.config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

export function setupToolRoutes(app: Express) {
    // ===============================================================
    // GET /api/weather - Retorna clima de uma localização
    // ===============================================================
    app.get('/api/weather', async (req, res) => {
        try {
            const location = (req.query.location as string) || 'Lisboa';

            if (!OPENWEATHER_API_KEY) {
                return res.status(500).json({ error: 'OPENWEATHER_API_KEY não configurada' });
            }

            console.log(`🌤️ Buscando clima: ${location}`);

            const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=pt`;
            const response = await fetch(url);

            if (!response.ok) {
                return res.status(404).json({ error: `Clima não encontrado para ${location}` });
            }

            const data: any = await response.json();

            res.json({
                location: data.name,
                country: data.sys?.country,
                temperature: Math.round(data.main.temp),
                feelsLike: Math.round(data.main.feels_like),
                description: data.weather[0].description,
                humidity: data.main.humidity,
                windSpeed: (data.wind.speed * 3.6).toFixed(1), // km/h
                summary: `Em ${data.name}: ${Math.round(data.main.temp)}°C, ${data.weather[0].description}. Umidade ${data.main.humidity}%.`
            });

        } catch (error: any) {
            console.error('❌ Erro /api/weather:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // ===============================================================
    // GET /api/places/search - Busca lugares próximos
    // ===============================================================
    app.get('/api/places/search', async (req, res) => {
        try {
            const query = req.query.query as string;
            const location = req.query.location as string || 'Aveiro, Portugal';

            if (!query) {
                return res.status(400).json({ error: 'query é obrigatório' });
            }

            console.log(`📍 Buscando lugares: "${query}" em ${location}`);

            const places = await geospatialService.findNearbyPlaces(location, query, 5000);

            res.json({
                query,
                location,
                places,
                summary: `Encontrei ${places.length} resultados para "${query}" em ${location}`
            });

        } catch (error: any) {
            console.error('❌ Erro /api/places/search:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // ===============================================================
    // GET /api/directions - Calcula rotas entre dois lugares
    // ===============================================================
    app.get('/api/directions', async (req, res) => {
        try {
            const origin = req.query.origin as string;
            const destination = req.query.destination as string;
            const mode = (req.query.mode as string) || 'driving';

            if (!origin || !destination) {
                return res.status(400).json({ error: 'origin e destination são obrigatórios' });
            }

            console.log(`🗺️ Calculando rota: ${origin} → ${destination} (${mode})`);

            const result = await geospatialService.calculateRoute(origin, destination);

            if (!result) {
                return res.json({ error: `Não encontrei rota de ${origin} para ${destination}` });
            }

            res.json({
                ...result,
                mode,
                summary: `De ${result.start_address} para ${result.end_address}: ${result.distance}, aproximadamente ${result.duration}.`
            });

        } catch (error: any) {
            console.error('❌ Erro /api/directions:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // ===============================================================
    // POST /api/translate - Traduz texto
    // ===============================================================
    app.post('/api/translate', async (req, res) => {
        try {
            const { text, targetLanguage, sourceLanguage } = req.body;

            if (!GOOGLE_API_KEY) {
                return res.status(500).json({ error: 'GOOGLE_API_KEY não configurada' });
            }

            if (!text || !targetLanguage) {
                return res.status(400).json({ error: 'text e targetLanguage são obrigatórios' });
            }

            console.log(`🌐 Traduzindo para ${targetLanguage}: "${text.substring(0, 50)}..."`);

            let url = `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_API_KEY}`;
            url += `&q=${encodeURIComponent(text)}`;
            url += `&target=${targetLanguage}`;
            if (sourceLanguage) {
                url += `&source=${sourceLanguage}`;
            }

            const response = await fetch(url, { method: 'POST' });
            const data: any = await response.json();

            if (data.error) {
                return res.status(400).json({ error: data.error.message });
            }

            const translation = data.data?.translations?.[0];

            res.json({
                originalText: text,
                translatedText: translation?.translatedText,
                detectedSourceLanguage: translation?.detectedSourceLanguage,
                targetLanguage
            });

        } catch (error: any) {
            console.error('❌ Erro /api/translate:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // ===============================================================
    // GET /api/timezone - Retorna hora baseada em timezone
    // ===============================================================
    app.get('/api/timezone', async (req, res) => {
        try {
            const timezone = (req.query.timezone as string) || 'Europe/Lisbon';

            const now = new Date();
            const timeStr = now.toLocaleString('pt-BR', {
                timeZone: timezone,
                hour: '2-digit',
                minute: '2-digit',
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

            res.json({
                timezone,
                currentTime: timeStr,
                timestamp: now.toISOString(),
                hour: now.toLocaleString('pt-BR', { timeZone: timezone, hour: '2-digit', minute: '2-digit' }),
                date: now.toLocaleString('pt-BR', { timeZone: timezone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
            });
        } catch (error: any) {
            console.error('❌ Erro /api/timezone:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // ===============================================================
    // POST /api/tools/execute - Execução centralizada de ferramentas
    // ===============================================================
    app.post('/api/tools/execute', async (req, res) => {
        try {
            // v4.17: Aceitar tanto 'name' quanto 'toolName' para compatibilidade voice/chat
            const { name, toolName, args, userId, tenantId } = req.body;
            const finalName = name || toolName;

            if (!finalName) {
                return res.status(400).json({ error: 'Nome da ferramenta é obrigatório' });
            }

            const { ensureSession } = await import('../server.js');
            const session = await ensureSession(userId, req.body.conversationId);

            const result = await ToolService.execute(finalName, args || {}, {
                userId: userId || '00000000-0000-0000-0000-000000000001',
                tenantId: tenantId || '00000000-0000-0000-0000-000000000001',
                userLocation: session?.userLocation
            });

            res.json(result);
        } catch (error: any) {
            console.error(`❌ Erro ao executar ferramenta ${req.body?.name || req.body?.toolName}:`, error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

}

