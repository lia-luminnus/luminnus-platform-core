import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import {
    supabase,
    saveMessage,
    loadRecentMessages,
    saveMemory,
    loadImportantMemories,
    detectAndSaveMemory
} from './server.js';

// ===========================================================
// CONFIG EXPRESS + HTTP + SOCKET.IO
// ===========================================================
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

console.log('🚀 LIA Backend iniciando...');

// ===========================================================
// SOCKET.IO - EVENTOS
// ===========================================================
io.on('connection', (socket) => {
    console.log(`✅ Cliente conectado: ${socket.id}`);

    // Evento: user-message (recebe mensagem do usuário)
    socket.on('user-message', async (data) => {
        try {
            const { message, userId = 'user-default', mode = 'text' } = data;

            console.log(`📩 [user-message] ${userId}: ${message}`);

            // Salvar mensagem do usuário
            await saveMessage(userId, 'user', message, mode);

            // Detectar e salvar memórias
            const memories = await detectAndSaveMemory(message, userId);
            if (memories.length > 0) {
                console.log(`💾 Memórias salvas: ${memories.length}`);
            }

            // Emitir "typing" para o frontend
            socket.emit('lia-typing');

            // SIMULAÇÃO: Processar com GPT (implementar depois)
            const liaResponse = `Entendi. Você disse: "${message}". Como posso ajudar?`;

            // Salvar resposta da LIA
            await saveMessage(userId, 'assistant', liaResponse, mode);

            // Emitir resposta
            socket.emit('lia-response', {
                message: liaResponse,
                timestamp: new Date().toISOString()
            });

            // Atualizar estado do avatar
            socket.emit('avatar-state', { state: 'idle' });

        } catch (error) {
            console.error('❌ Erro ao processar mensagem:', error);
            socket.emit('lia-error', { error: error.message });
        }
    });

    // Evento: request-transcription (transcrição de voz)
    socket.on('transcription', (data) => {
        console.log(`🎤 [transcription] ${data.text}`);
        // Repassar para outros clientes se necessário
        socket.broadcast.emit('transcription', data);
    });

    // Evento: avatar-state (mudança de estado do avatar)
    socket.on('set-avatar-state', (data) => {
        console.log(`👤 [avatar-state] ${data.state}`);
        socket.broadcast.emit('avatar-state', data);
    });

    socket.on('disconnect', () => {
        console.log(`❌ Cliente desconectado: ${socket.id}`);
    });
});

// ===========================================================
// REST APIS
// ===========================================================

// POST /api/chat - Enviar mensagem (alternativa ao Socket.IO)
app.post('/api/chat', async (req, res) => {
    try {
        const { message, userId = 'user-default' } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Salvar mensagem
        await saveMessage(userId, 'user', message, 'text');

        // Processar (simulação)
        const response = `Recebi sua mensagem: "${message}"`;

        // Salvar resposta
        await saveMessage(userId, 'assistant', response, 'text');

        res.json({
            success: true,
            response,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Erro em /api/chat:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/search - Busca web
app.get('/api/search', async (req, res) => {
    try {
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        // TODO: Implementar busca real (Google API, etc)
        const results = [
            { title: 'Resultado 1', url: 'https://example.com', snippet: 'Exemplo de resultado' }
        ];

        res.json({
            success: true,
            query,
            results
        });

    } catch (error) {
        console.error('❌ Erro em /api/search:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/time - Data/hora atual
app.get('/api/time', (req, res) => {
    const now = new Date();
    res.json({
        success: true,
        timestamp: now.toISOString(),
        date: now.toLocaleDateString('pt-BR'),
        time: now.toLocaleTimeString('pt-BR'),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
});

// POST /api/memory/save - Salvar memória
app.post('/api/memory/save', async (req, res) => {
    try {
        const { userId = 'user-default', key, value } = req.body;

        if (!key || !value) {
            return res.status(400).json({ error: 'Key and value are required' });
        }

        const result = await saveMemory(userId, key, value);

        res.json({
            success: true,
            memory: result
        });

    } catch (error) {
        console.error('❌ Erro em /api/memory/save:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/memory/load - Carregar memórias
app.get('/api/memory/load', async (req, res) => {
    try {
        const { userId = 'user-default' } = req.query;

        const memories = await loadImportantMemories(userId);

        res.json({
            success: true,
            count: memories.length,
            memories
        });

    } catch (error) {
        console.error('❌ Erro em /api/memory/load:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/messages - Carregar mensagens recentes
app.get('/api/messages', async (req, res) => {
    try {
        const { conversationId = 'user-default', limit = 10 } = req.query;

        const messages = await loadRecentMessages(conversationId, parseInt(limit));

        res.json({
            success: true,
            count: messages.length,
            messages
        });

    } catch (error) {
        console.error('❌ Erro em /api/messages:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET / - Health check
app.get('/', (req, res) => {
    res.json({
        name: 'LIA Backend',
        version: '2.0.0',
        status: 'running',
        websocket: 'ws://localhost:5000/socket.io',
        endpoints: {
            chat: 'POST /api/chat',
            search: 'GET /api/search',
            time: 'GET /api/time',
            memorySave: 'POST /api/memory/save',
            memoryLoad: 'GET /api/memory/load',
            messages: 'GET /api/messages'
        }
    });
});

// ===========================================================
// INICIAR SERVIDOR
// ===========================================================
server.listen(PORT, '0.0.0.0', () => {
    console.log(``);
    console.log(`✅ LIA Backend rodando!`);
    console.log(`📍 HTTP Server: http://localhost:${PORT}`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}/socket.io`);
    console.log(``);
});

// Tratamento de erros
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Rejection:', error);
});
