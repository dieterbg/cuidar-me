/**
 * Structured Logging Utility
 * Format: JSON for easy parsing in production
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
    service?: string;
    action?: string;
    patientId?: string;
    userId?: string;
    [key: string]: any;
}

class Logger {
    private service: string;

    constructor(service: string) {
        this.service = service;
    }

    private log(level: LogLevel, message: string, context: LogContext = {}) {
        const logEntry = {
            level,
            timestamp: new Date().toISOString(),
            service: this.service,
            message,
            ...context,
        };

        const logString = JSON.stringify(logEntry);

        switch (level) {
            case 'error':
                console.error(logString);
                break;
            case 'warn':
                console.warn(logString);
                break;
            case 'debug':
                if (process.env.NODE_ENV === 'development') {
                    console.debug(logString);
                }
                break;
            default:
                console.log(logString);
        }
    }

    info(message: string, context?: LogContext) {
        this.log('info', message, context);
    }

    warn(message: string, context?: LogContext) {
        this.log('warn', message, context);
    }

    error(message: string, error?: Error | unknown, context?: LogContext) {
        const errorContext = error instanceof Error
            ? { error: error.message, stack: error.stack, ...context }
            : { error: String(error), ...context };

        this.log('error', message, errorContext);
    }

    debug(message: string, context?: LogContext) {
        this.log('debug', message, context);
    }
}

// Factory function
export function createLogger(service: string): Logger {
    return new Logger(service);
}

// Pre-configured loggers for common services
export const loggers = {
    cron: createLogger('cron'),
    ai: createLogger('ai-handler'),
    gamification: createLogger('gamification'),
    protocol: createLogger('protocol'),
    whatsapp: createLogger('whatsapp'),
};
