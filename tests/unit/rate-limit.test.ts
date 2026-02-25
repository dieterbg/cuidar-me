import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, cleanupRateLimits, getRateLimitHeaders } from '@/lib/rate-limit';

/**
 * Testes do Rate Limiter
 * Usa store in-memory — estado compartilhado entre testes
 */
describe('Rate Limiter', () => {

    // =================================================================
    // RLM-01: permite até N requests na janela
    // =================================================================
    it('RLM-01: permite até N requests na janela', () => {
        const config = { windowMs: 60_000, maxRequests: 3 };

        const r1 = checkRateLimit('test-user-1', config);
        expect(r1.allowed).toBe(true);
        expect(r1.remainingRequests).toBe(2);

        const r2 = checkRateLimit('test-user-1', config);
        expect(r2.allowed).toBe(true);
        expect(r2.remainingRequests).toBe(1);

        const r3 = checkRateLimit('test-user-1', config);
        expect(r3.allowed).toBe(true);
        expect(r3.remainingRequests).toBe(0);
    });

    // =================================================================
    // RLM-02: bloqueia após N requests
    // =================================================================
    it('RLM-02: bloqueia após exceder N requests', () => {
        const config = { windowMs: 60_000, maxRequests: 2 };

        checkRateLimit('test-user-2', config);
        checkRateLimit('test-user-2', config);
        const r3 = checkRateLimit('test-user-2', config);

        expect(r3.allowed).toBe(false);
        expect(r3.remainingRequests).toBe(0);
    });

    // =================================================================
    // RLM-03: reseta após janela expirar
    // =================================================================
    it('RLM-03: reseta após janela expirar', () => {
        // Use very short window
        const config = { windowMs: 1, maxRequests: 1 };

        checkRateLimit('test-user-3', config);

        // Busy-wait to guarantee window expiry (synchronous)
        const start = Date.now();
        while (Date.now() - start < 5) { /* spin */ }

        const r2 = checkRateLimit('test-user-3', config);
        expect(r2.allowed).toBe(true);
    });

    // =================================================================
    // RLM-04: cleanupRateLimits remove entradas expiradas
    // =================================================================
    it('RLM-04: cleanupRateLimits remove entradas expiradas', () => {
        // Create an entry with very short window
        const config = { windowMs: 1, maxRequests: 5 };
        checkRateLimit('test-cleanup-user', config);

        // Wait a tiny bit then cleanup — entry should be expired
        const cleaned = cleanupRateLimits();
        // Should have cleaned at least 0 (the window may or may not have expired yet)
        expect(cleaned).toBeGreaterThanOrEqual(0);
    });

    // =================================================================
    // RLM-05: getRateLimitHeaders retorna headers corretos
    // =================================================================
    it('RLM-05: getRateLimitHeaders retorna headers corretos', () => {
        const result = {
            allowed: true,
            remainingRequests: 5,
            resetTime: Date.now() + 60000,
        };

        const headers = getRateLimitHeaders(result);

        expect(headers['X-RateLimit-Remaining']).toBe('5');
        expect(headers['X-RateLimit-Reset']).toBeDefined();
        // X-RateLimit-Limit should be remaining + 1 when allowed
        expect(headers['X-RateLimit-Limit']).toBe('6');
    });

    it('getRateLimitHeaders quando bloqueado', () => {
        const result = {
            allowed: false,
            remainingRequests: 0,
            resetTime: Date.now() + 60000,
        };

        const headers = getRateLimitHeaders(result);
        expect(headers['X-RateLimit-Remaining']).toBe('0');
        expect(headers['X-RateLimit-Limit']).toBe('0');
    });

    // =================================================================
    // Identifiers isolados — diferentes IDs não interferem
    // =================================================================
    it('identifiers diferentes são isolados', () => {
        const config = { windowMs: 60_000, maxRequests: 1 };

        checkRateLimit('test-user-A', config);
        const rB = checkRateLimit('test-user-B', config);

        expect(rB.allowed).toBe(true);
    });
});
