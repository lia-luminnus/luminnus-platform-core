import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Serviço para manipulação de arquivos compactados (zip/tar)
 * Sem dependências externas, usando comandos nativos do SO
 */
export class ArchiveService {
    /**
     * Lista o conteúdo de um arquivo .zip ou .tar
     */
    static listContent(filePath: string): string[] {
        try {
            // No Windows 10+ e Linux, 'tar -tf' funciona para .zip e .tar
            const output = execSync(`tar -tf "${filePath}"`, { encoding: 'utf8' });
            return output.split('\n').filter(line => line.trim() !== '');
        } catch (error) {
            console.error('[ArchiveService] Erro ao listar conteúdo:', error);
            return [];
        }
    }

    /**
     * Extrai um inventário completo e metadados básicos dos arquivos internos
     */
    static getInventory(filePath: string, originalName: string) {
        const files = this.listContent(filePath);
        return {
            archive_name: originalName,
            total_files: files.length,
            files: files.map(f => ({
                path: f,
                type: path.extname(f).toLowerCase()
            }))
        };
    }
}
