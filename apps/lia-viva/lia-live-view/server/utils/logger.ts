import pino from 'pino';
import { config } from '../config/unifiedConfig.js';

/**
 * v1.0: Centralized Logger Utility
 * Uses Pino for structured, high-performance logging
 */

const transport = config.isDev ? {
    target: 'pino-pretty',
    options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname'
    }
} : undefined;

export const logger = pino({
    level: process.env.LOG_LEVEL || (config.isDev ? 'debug' : 'info'),
    base: config.isProduction ? { env: config.env } : undefined,
}, transport ? pino.transport(transport) : undefined);

// Standardized log formats
export const logAction = (context: string, action: string, message: string, meta?: any) => {
    logger.info({ context, action, ...meta }, message);
};

export const logError = (context: string, error: any, message?: string, meta?: any) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    logger.error({
        context,
        error: errorMessage,
        stack,
        ...meta
    }, message || `Error in ${context}`);
};
