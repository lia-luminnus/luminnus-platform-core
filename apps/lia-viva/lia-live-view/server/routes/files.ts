import { Express } from 'express';
import { FileService } from '../services/fileService.js';

/**
 * Routes para gerenciamento de arquivos (v2.0)
 * GET /api/files - Lista arquivos do tenant
 * DELETE /api/files/:id - Deleta arquivo
 * GET /api/files/:id/download - Gera URL assinada de download
 */
export function setupFilesRoutes(app: Express) {

    /**
     * GET /api/files
     * Lista arquivos de um tenant com filtro opcional por categoria
     */
    app.get('/api/files', async (req, res) => {
        try {
            const tenantId = req.query.tenantId as string;
            const category = req.query.category as string | undefined;

            if (!tenantId) {
                return res.status(400).json({ error: 'tenantId é obrigatório' });
            }

            console.log(`📂 [FilesAPI] Listando arquivos do tenant: ${tenantId}, category: ${category || 'all'}`);

            const files = await FileService.getFilesByTenant(tenantId, category);

            res.json({
                success: true,
                files,
                count: files.length
            });
        } catch (error: any) {
            console.error('[FilesAPI] Erro ao listar arquivos:', error);
            res.status(500).json({ error: 'Erro ao listar arquivos' });
        }
    });

    /**
     * DELETE /api/files/:id
     * Deleta um arquivo do Storage e seus metadados
     */
    app.delete('/api/files/:id', async (req, res) => {
        try {
            const fileId = req.params.id;
            const tenantId = req.query.tenantId as string;

            if (!fileId || !tenantId) {
                return res.status(400).json({ error: 'fileId e tenantId são obrigatórios' });
            }

            console.log(`🗑️ [FilesAPI] Deletando arquivo: ${fileId} do tenant: ${tenantId}`);

            const success = await FileService.deleteFile(fileId, tenantId);

            if (success) {
                res.json({ success: true, message: 'Arquivo deletado com sucesso' });
            } else {
                res.status(500).json({ error: 'Falha ao deletar arquivo' });
            }
        } catch (error: any) {
            console.error('[FilesAPI] Erro ao deletar arquivo:', error);
            res.status(500).json({ error: 'Erro ao deletar arquivo' });
        }
    });

    /**
     * GET /api/files/:id/download
     * Gera URL assinada para download seguro
     */
    app.get('/api/files/:id/download', async (req, res) => {
        try {
            const storagePath = req.query.path as string;

            if (!storagePath) {
                return res.status(400).json({ error: 'path é obrigatório' });
            }

            console.log(`📥 [FilesAPI] Gerando URL de download para: ${storagePath}`);

            const signedUrl = await FileService.getSignedUrl(storagePath);

            if (signedUrl) {
                res.json({ success: true, downloadUrl: signedUrl });
            } else {
                res.status(404).json({ error: 'Arquivo não encontrado' });
            }
        } catch (error: any) {
            console.error('[FilesAPI] Erro ao gerar URL de download:', error);
            res.status(500).json({ error: 'Erro ao gerar URL de download' });
        }
    });

}
