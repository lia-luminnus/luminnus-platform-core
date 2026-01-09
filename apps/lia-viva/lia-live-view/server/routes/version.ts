import { Express } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function setupVersionRoutes(app: Express) {
    /**
     * GET /api/version
     * Retorna a versão atual do sistema extraída do package.json
     */
    app.get('/api/version', (req, res) => {
        try {
            const pkgPath = path.join(__dirname, '../../package.json');
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            const version = pkg.version || '0.0.0';

            res.json({
                ok: true,
                version,
                buildVersion: version, // Compatibilidade com UpdateService
                buildTime: new Date().toISOString(),
                buildTimestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'development',
                isRequired: false,
                message: null,
            });
        } catch (error) {
            console.error('❌ Erro ao ler versão:', error);
            res.status(500).json({ ok: false, error: 'Falha ao obter versão' });
        }
    });


    /**
     * POST /api/system/update
     * Dispara um sinal de atualização global para todos os clientes conectados via Socket.io
     * (Segurança: deveria ser restrito a admins em produção)
     */
    app.post('/api/system/update', (req, res) => {
        const io = (req.app as any).get('io');
        if (!io) {
            return res.status(500).json({ ok: false, error: 'Socket.io não disponível' });
        }

        console.log('🚀 [System] Disparando broadcast de atualização global...');
        io.emit('system:update', {
            version: '4.0.0', // Idealmente ler do package.json novamente
            force: true
        });

        res.json({ ok: true, message: 'Broadcast enviado com sucesso' });
    });
}
