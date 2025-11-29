/**
 * Simple Rate Limiting Middleware
 * In-memory implementation (for serverless, consider Upstash Redis)
 */

interface RateLimitConfig {
    windowMs: number; // Time window in milliseconds
    maxRequests: number; // Max requests per window
}

interface RequestLog {
    count: number;
    resetTime: number;
}

// In-memory store (resets on each deployment)
const requestStore = new Map<string, RequestLog>();

/**
 * Rate limit checker
 */
export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig = { windowMs: 60 * 60 * 1000, maxRequests: 10 }
): { allowed: boolean; remainingRequests: number; resetTime: number } {
    const now = Date.now();
    const key = identifier;

    // Get or create request log
    let log = requestStore.get(key);

    // Reset if window expired
    if (!log || now > log.resetTime) {
        log = {
            count: 0,
            resetTime: now + config.windowMs,
        };
    }

    // Increment count
    log.count++;
    requestStore.set(key, log);

    // Check if exceeded
    const allowed = log.count <= config.maxRequests;
    const remainingRequests = Math.max(0, config.maxRequests - log.count);

    return {
        allowed,
        remainingRequests,
        resetTime: log.resetTime,
    };
}

/**
 * Cleanup old entries (run periodically)
 */
export function cleanupRateLimits() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, log] of requestStore.entries()) {
        if (now > log.resetTime) {
            requestStore.delete(key);
            cleaned++;
        }
    }

    return cleaned;
}

/**
 * Get rate limit headers for HTTP response
 */
export function getRateLimitHeaders(result: ReturnType<typeof checkRateLimit>) {
    return {
        'X-RateLimit-Limit': String(result.remainingRequests + (result.allowed ? 1 : 0)),
        'X-RateLimit-Remaining': String(result.remainingRequests),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
    };
}
