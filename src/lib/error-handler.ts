/**
 * Error Handling & Retry Logic
 * Resilience utilities for production
 */

import { createLogger } from './logger';

const logger = createLogger('error-handler');

export interface RetryOptions {
    maxRetries?: number;
    initialDelay?: number; // ms
    maxDelay?: number; // ms
    backoffMultiplier?: number;
    onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    onRetry: () => { },
};

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: Error;

    for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt === opts.maxRetries) {
                logger.error('Max retries reached', lastError, { attempt, maxRetries: opts.maxRetries });
                throw lastError;
            }

            const delay = Math.min(
                opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt - 1),
                opts.maxDelay
            );

            logger.warn(`Retry attempt ${attempt}/${opts.maxRetries}`, {
                attempt,
                delay,
                error: lastError.message,
            });

            opts.onRetry(attempt, lastError);
            await sleep(delay);
        }
    }

    throw lastError!;
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Safe async wrapper with error logging
 */
export async function safeAsync<T>(
    fn: () => Promise<T>,
    fallback: T,
    context?: Record<string, any>
): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        logger.error('Safe async failed, using fallback', error, context);
        return fallback;
    }
}

/**
 * Batch operations with error handling
 */
export async function batchProcess<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    options: {
        batchSize?: number;
        continueOnError?: boolean;
    } = {}
): Promise<Array<R | Error>> {
    const { batchSize = 5, continueOnError = true } = options;
    const results: Array<R | Error> = [];

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const promises = batch.map(async (item) => {
            try {
                return await processor(item);
            } catch (error) {
                if (!continueOnError) throw error;
                logger.warn('Batch item failed', { error, item });
                return error instanceof Error ? error : new Error(String(error));
            }
        });

        const batchResults = await Promise.all(promises);
        results.push(...batchResults);
    }

    return results;
}
