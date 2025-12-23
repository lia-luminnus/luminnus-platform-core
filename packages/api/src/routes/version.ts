import { Router, Request, Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

export const versionRouter: Router = Router();

// Build timestamp - set at startup
const BUILD_TIMESTAMP = new Date().toISOString();

function getVersion(): string {
    try {
        const pkgPath = join(__dirname, '../../package.json');
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        return pkg.version || '0.0.0';
    } catch {
        return process.env.APP_VERSION || '0.0.0';
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
