import { Server as IOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';

interface WSClient {
    socket: Socket;
    userId?: string;
    tenantId?: string;
    conversationId?: string;
    plan?: string;
}

const clients = new Map<string, WSClient>();

/**
 * Socket.IO Gateway for real-time communication
 * Refactored from raw 'ws' for compatibility with Dashboard-client
 */
export function setupWebSocket(server: HTTPServer): IOServer {
    const io = new IOServer(server, {
        cors: {
            origin: process.env.CORS_ORIGIN || '*',
            methods: ['GET', 'POST'],
            credentials: true
        },
        path: '/socket.io'
    });

    io.on('connection', (socket) => {
        const clientId = socket.id;
        const auth = socket.handshake.auth;

        console.log(`[Socket.IO] Client connected: ${clientId}`, auth);

        clients.set(clientId, {
            socket,
            userId: auth.userId,
            tenantId: auth.tenantId,
            conversationId: auth.conversationId,
            plan: auth.plan
        });

        // Eventos básicos conforme esperado pelo socketService.ts
        socket.on('register-conversation', (data) => {
            const client = clients.get(clientId);
            if (client) {
                client.conversationId = data.conversationId;
                console.log(`[Socket.IO] Conversation registered for ${clientId}: ${data.conversationId}`);
            }
        });

        socket.on('text-message', (data) => {
            console.log(`[Socket.IO] Message from ${clientId}:`, data.text);
            // Placeholder para integração com LIA Runtime
            socket.emit('lia-transcript', {
                text: 'Backend Socket.IO ativo. Integração com LIA em andamento...',
                conversationId: data.conversationId
            });
        });

        socket.on('disconnect', () => {
            console.log(`[Socket.IO] Client disconnected: ${clientId}`);
            clients.delete(clientId);
        });

        // Saudações
        socket.emit('system:update', {
            type: 'connected',
            clientId,
            timestamp: new Date().toISOString(),
            message: 'Conectado ao Luminnus Platform Core (Socket.IO)'
        });
    });

    console.log('[Socket.IO] Gateway initialized at /socket.io');

    return io;
}

/**
 * Broadcast message to specific user (all their sessions)
 */
export function sendToUser(userId: string, event: string, payload: unknown): void {
    clients.forEach((client) => {
        if (client.userId === userId) {
            client.socket.emit(event, payload);
        }
    });
}
