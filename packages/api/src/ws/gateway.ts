import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

interface WSClient {
    ws: WebSocket;
    userId?: string;
    companyId?: string;
    mode?: 'chat' | 'multimodal' | 'live';
}

const clients = new Map<string, WSClient>();

/**
 * WebSocket Gateway for real-time communication
 * Handles Chat, Multimodal, and Live modes
 */
export function setupWebSocket(server: Server): WebSocketServer {
    const wss = new WebSocketServer({
        server,
        path: '/ws'
    });

    wss.on('connection', (ws, req) => {
        const clientId = generateClientId();

        clients.set(clientId, { ws });

        console.log(`[WS] Client connected: ${clientId}`);

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                handleMessage(clientId, message);
            } catch (error) {
                console.error('[WS] Invalid message:', error);
                ws.send(JSON.stringify({ error: 'Invalid message format' }));
            }
        });

        ws.on('close', () => {
            console.log(`[WS] Client disconnected: ${clientId}`);
            clients.delete(clientId);
        });

        ws.on('error', (error) => {
            console.error(`[WS] Client error ${clientId}:`, error);
            clients.delete(clientId);
        });

        // Send welcome message
        ws.send(JSON.stringify({
            type: 'connected',
            clientId,
            timestamp: new Date().toISOString()
        }));
    });

    console.log('[WS] WebSocket gateway initialized at /ws');

    return wss;
}

function generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

interface WSMessage {
    type: string;
    payload?: unknown;
    token?: string;
    mode?: 'chat' | 'multimodal' | 'live';
}

async function handleMessage(clientId: string, message: WSMessage): Promise<void> {
    const client = clients.get(clientId);
    if (!client) return;

    switch (message.type) {
        case 'auth':
            // TODO: Validate token and associate user/company
            client.userId = 'pending-auth';
            client.ws.send(JSON.stringify({ type: 'auth_ack', status: 'ok' }));
            break;

        case 'set_mode':
            if (message.mode && ['chat', 'multimodal', 'live'].includes(message.mode)) {
                client.mode = message.mode;
                client.ws.send(JSON.stringify({
                    type: 'mode_set',
                    mode: message.mode
                }));
            }
            break;

        case 'ping':
            client.ws.send(JSON.stringify({ type: 'pong' }));
            break;

        case 'message':
            // Placeholder for message handling
            // Will be implemented during LIA integration
            client.ws.send(JSON.stringify({
                type: 'ack',
                message: 'Message received - LIA processing not yet integrated'
            }));
            break;

        default:
            client.ws.send(JSON.stringify({
                error: 'Unknown message type',
                received: message.type
            }));
    }
}

/**
 * Broadcast message to all clients in a company
 */
export function broadcastToCompany(companyId: string, message: unknown): void {
    clients.forEach((client) => {
        if (client.companyId === companyId && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(message));
        }
    });
}

/**
 * Send message to specific client
 */
export function sendToClient(clientId: string, message: unknown): void {
    const client = clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
    }
}
