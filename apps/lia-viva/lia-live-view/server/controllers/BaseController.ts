import { Response } from 'express';
import { logError } from '../utils/logger.js';

/**
 * v1.0: Base Controller to standardize API responses and error handling
 */
export abstract class BaseController {
    /**
     * Standard success response
     */
    protected handleSuccess(res: Response, data: any, statusCode: number = 200) {
        return res.status(statusCode).json({
            ok: true,
            data
        });
    }

    /**
     * Standard error response
     */
    protected handleError(res: Response, error: any, context: string) {
        const message = error instanceof Error ? error.message : String(error);
        logError(context, error);

        return res.status(error.status || 500).json({
            ok: false,
            error: message,
            context
        });
    }

    /**
     * Client error (400)
     */
    protected handleBadRequest(res: Response, message: string = 'Bad Request') {
        return res.status(400).json({
            ok: false,
            error: message
        });
    }

    /**
     * Forbidden (403)
     */
    protected handleForbidden(res: Response, message: string = 'Forbidden') {
        return res.status(403).json({
            ok: false,
            error: message
        });
    }

    /**
     * Not Found (404)
     */
    protected handleNotFound(res: Response, message: string = 'Not Found') {
        return res.status(404).json({
            ok: false,
            error: message
        });
    }
}
