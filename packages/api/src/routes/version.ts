import { Router, Request, Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const versionRouter: Router = Router();

// Build timestamp - set at startup
const BUILD_TIMESTAMP = new Date().toISOString();

function getVersion(): string {
    try {
        // Tentar encontrar package.json subindo até 3 níveis
        let currentPath = __dirname;
        for (let i = 0; i < 3; i++) {
            try {
                const pkgPath = join(currentPath, 'package.json');
                const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
                if (pkg.version) return pkg.version;
            } catch {
                currentPath = join(currentPath, '..');
            }
        }
        return process.env.APP_VERSION || '4.0.0';
    } catch {
        return '4.0.0';
    }
}

versionRouter.get('/', (_req: Request, res: Response) => {
    res.json({
        version: getVersion(),
        env: process.env.NODE_ENV || 'development',
        buildTimestamp: BUILD_TIMESTAMP,
        apiName: '@luminnus/api'
    });
});
