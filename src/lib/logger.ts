/**
 * Structured Logging System — Fase 1
 *
 * Provides 4 logging channels:
 *  • logger.info/warn/error/debug → stdout (Vercel logs, ephemeral)
 *  • logger.audit()    → audit_logs table (5y retention, LGPD Art. 19)
 *  • logger.security() → security_events table (1y retention)
 *  • logger.business() → business_events table (2y retention, pseudonymized)
 *
 * All PII is auto-redacted in stdout logs. Audit table preserves PII for legal/compliance.
 */

// NOTE: we intentionally do NOT import from '@/lib/supabase-server-utils'
// because that file pulls in `next/headers` (server-only) at module load,
// which breaks client bundles that transitively import this logger.
// Instead, we lazy-create a service-role client below.

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
    service?: string;
    action?: string;
    patientId?: string;
    userId?: string;
    [key: string]: any;
}

export interface AuditEntry {
    actorId?: string | null;
    actorRole?: 'admin' | 'equipe_saude' | 'assistente' | 'patient' | 'system' | string;
    action: string;                // e.g. 'view_patient', 'reschedule_message', 'send_whatsapp'
    resourceType: string;          // e.g. 'patient', 'message', 'scheduled_message'
    resourceId?: string;
    patientId?: string;
    ip?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
}

export type Severity = 'info' | 'warning' | 'critical';

export interface SecurityEntry {
    eventType: string;             // 'invalid_token', 'rate_limit_hit', 'rls_denied', etc.
    severity: Severity;
    actorId?: string | null;
    ip?: string;
    userAgent?: string;
    description?: string;
    metadata?: Record<string, any>;
}

export interface BusinessEntry {
    eventType: string;             // 'onboarding_started', 'checkin_completed', etc.
    patientId?: string;
    metadata?: Record<string, any>;
}

// ────────────────────────────────────────────────────────────
// PII Redaction (applied only to stdout logs, never to DB tables)
// ────────────────────────────────────────────────────────────
const SENSITIVE_KEY_PATTERNS = [
    /password/i, /token/i, /secret/i, /authorization/i, /cookie/i,
    /apikey/i, /api_key/i, /auth/i,
];

const PII_KEY_PATTERNS = [
    /^email$/i, /^phone$/i, /whatsapp/i, /cpf/i, /^full_?name$/i, /^name$/i,
    /last_message/i, /message_content/i, /^text$/i, /^display_?name$/i,
];

function maskPhone(value: string): string {
    // +5551999998888 → +55**********8888
    const clean = value.replace(/\D/g, '');
    if (clean.length < 4) return '****';
    return '+' + '*'.repeat(Math.max(clean.length - 4, 0)) + clean.slice(-4);
}

function maskEmail(value: string): string {
    const [local, domain] = value.split('@');
    if (!domain) return '***';
    return local.slice(0, 1) + '***@' + domain;
}

function maskName(value: string): string {
    const parts = value.trim().split(/\s+/);
    if (parts.length === 0) return '***';
    return parts[0] + (parts.length > 1 ? ' ' + parts.slice(1).map(p => p[0] + '.').join(' ') : '');
}

function maskCPF(value: string): string {
    return '***.***.***-**';
}

function redactValue(key: string, value: any): any {
    if (value == null) return value;
    const str = String(value);
    if (SENSITIVE_KEY_PATTERNS.some(re => re.test(key))) return '[REDACTED]';

    if (PII_KEY_PATTERNS.some(re => re.test(key))) {
        if (/phone|whatsapp/i.test(key)) return maskPhone(str);
        if (/email/i.test(key)) return maskEmail(str);
        if (/cpf/i.test(key)) return maskCPF(str);
        if (/name/i.test(key)) return maskName(str);
        if (/message|text/i.test(key)) {
            // Don't log message content in application logs
            return `[REDACTED:${str.length}chars]`;
        }
    }
    return value;
}

function redact(data: any): any {
    if (data == null) return data;
    if (typeof data !== 'object') return data;
    if (Array.isArray(data)) return data.map(redact);

    const out: any = {};
    for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
            out[key] = redact(value);
        } else {
            out[key] = redactValue(key, value);
        }
    }
    return out;
}

// ────────────────────────────────────────────────────────────
// Supabase write helper (lazy — avoids init in build, avoids
// pulling in server-only modules into client bundles)
// ────────────────────────────────────────────────────────────
function getAdminClient(): any | null {
    // Only attempt on the server. On the client, writes are no-ops.
    if (typeof window !== 'undefined') return null;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return null;
    try {
        // Use dynamic require so this only runs server-side at call time.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { createClient } = require('@supabase/supabase-js');
        return createClient(url, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });
    } catch {
        return null;
    }
}

// Never throw from a log write — only warn to stdout.
async function safeInsert(table: string, row: Record<string, any>): Promise<void> {
    try {
        const client = getAdminClient();
        if (!client) return;
        const { error } = await client.from(table).insert(row);
        if (error) {
            console.error(JSON.stringify({
                level: 'warn',
                timestamp: new Date().toISOString(),
                service: 'logger',
                message: `Failed to write to ${table}`,
                error: error.message,
            }));
        }
    } catch (err: any) {
        console.error(JSON.stringify({
            level: 'warn',
            timestamp: new Date().toISOString(),
            service: 'logger',
            message: `Exception writing to ${table}`,
            error: err?.message ?? String(err),
        }));
    }
}

// ────────────────────────────────────────────────────────────
// Logger class
// ────────────────────────────────────────────────────────────
class Logger {
    constructor(private service: string) {}

    private writeStdout(level: LogLevel, message: string, context: LogContext = {}) {
        const clean = redact(context);
        const entry = {
            level,
            timestamp: new Date().toISOString(),
            service: this.service,
            message,
            ...clean,
        };
        const str = JSON.stringify(entry);
        switch (level) {
            case 'error': console.error(str); break;
            case 'warn':  console.warn(str);  break;
            case 'debug':
                if (process.env.NODE_ENV === 'development' || process.env.LOG_DEBUG === '1') {
                    console.debug(str);
                }
                break;
            default: console.log(str);
        }
    }

    // ── Stdout channels (Vercel logs) ──────────────────────
    info(message: string, context?: LogContext) { this.writeStdout('info', message, context); }
    warn(message: string, context?: LogContext) { this.writeStdout('warn', message, context); }
    debug(message: string, context?: LogContext) { this.writeStdout('debug', message, context); }

    error(message: string, error?: Error | unknown, context?: LogContext) {
        const errDetails = error instanceof Error
            ? {
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
              }
            : error != null
                ? { error: String(error) }
                : {};
        this.writeStdout('error', message, { ...errDetails, ...context });
    }

    // ── Persistent channels (Supabase) ─────────────────────

    /** Append-only audit trail — who did what. LGPD Art. 19. */
    async audit(entry: AuditEntry): Promise<void> {
        const row = {
            actor_id:      entry.actorId ?? null,
            actor_role:    entry.actorRole ?? 'system',
            action:        entry.action,
            resource_type: entry.resourceType,
            resource_id:   entry.resourceId ?? null,
            patient_id:    entry.patientId ?? null,
            ip:            entry.ip ?? null,
            user_agent:    entry.userAgent ?? null,
            metadata:      entry.metadata ?? {},
        };
        // Also echo to stdout for immediate visibility (redacted)
        this.writeStdout('info', `audit: ${entry.action}`, {
            resourceType: entry.resourceType,
            resourceId: entry.resourceId,
            actorRole: entry.actorRole,
        });
        await safeInsert('audit_logs', row);
    }

    /** Security event. Critical severity triggers alert (Phase 4). */
    async security(entry: SecurityEntry): Promise<void> {
        const row = {
            event_type:  entry.eventType,
            severity:    entry.severity,
            actor_id:    entry.actorId ?? null,
            ip:          entry.ip ?? null,
            user_agent:  entry.userAgent ?? null,
            description: entry.description ?? null,
            metadata:    entry.metadata ?? {},
        };
        const level: LogLevel = entry.severity === 'critical' ? 'error' : entry.severity === 'warning' ? 'warn' : 'info';
        this.writeStdout(level, `security: ${entry.eventType}`, {
            severity: entry.severity,
            description: entry.description,
        });
        await safeInsert('security_events', row);
    }

    /** Pseudonymized funnel/metric event. */
    async business(entry: BusinessEntry): Promise<void> {
        const row = {
            event_type: entry.eventType,
            patient_id: entry.patientId ?? null,
            metadata:   entry.metadata ?? {},
        };
        this.writeStdout('info', `business: ${entry.eventType}`, {
            patientId: entry.patientId,
        });
        await safeInsert('business_events', row);
    }
}

// ────────────────────────────────────────────────────────────
// Factory + pre-configured loggers
// ────────────────────────────────────────────────────────────
export function createLogger(service: string): Logger {
    return new Logger(service);
}

export const loggers = {
    cron:         createLogger('cron'),
    ai:           createLogger('ai-handler'),
    gamification: createLogger('gamification'),
    protocol:     createLogger('protocol'),
    whatsapp:     createLogger('whatsapp'),
    auth:         createLogger('auth'),
    admin:        createLogger('admin'),
    onboarding:   createLogger('onboarding'),
    api:          createLogger('api'),
};

// Exported for unit tests
export const __test__ = { redact, maskPhone, maskEmail, maskName, maskCPF };
