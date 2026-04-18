'use server';

import { createServiceRoleClient } from '@/lib/supabase-server-utils';
import { createClient } from '@/lib/supabase-server';

// Ensure the caller is admin. Throws if not.
async function requireAdmin(): Promise<string> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
    if (profile?.role !== 'admin') throw new Error('Acesso negado — apenas admin');
    return user.id;
}

export interface AuditLogRow {
    id: string;
    actor_id: string | null;
    actor_role: string | null;
    action: string;
    resource_type: string;
    resource_id: string | null;
    patient_id: string | null;
    ip: string | null;
    metadata: any;
    created_at: string;
    // Joined fields
    patient_name?: string | null;
    actor_email?: string | null;
}

export interface SecurityEventRow {
    id: string;
    event_type: string;
    severity: 'info' | 'warning' | 'critical';
    actor_id: string | null;
    ip: string | null;
    description: string | null;
    metadata: any;
    created_at: string;
}

export interface BusinessEventRow {
    id: string;
    event_type: string;
    patient_id: string | null;
    metadata: any;
    created_at: string;
}

export interface TwilioWebhookRow {
    id: string;
    message_sid: string;
    status: string;
    error_code: number | null;
    error_message: string | null;
    from_number: string | null;
    to_number: string | null;
    patient_id: string | null;
    created_at: string;
}

interface LogFilters {
    limit?: number;
    offset?: number;
    fromDate?: string; // ISO
    toDate?: string;
}

// ── Audit Logs ─────────────────────────────────────────────
export async function getAuditLogs(filters: LogFilters & {
    action?: string;
    patientId?: string;
    actorId?: string;
} = {}): Promise<AuditLogRow[]> {
    await requireAdmin();
    const supabase = createServiceRoleClient();

    let query = supabase
        .from('audit_logs')
        .select(`*, patient:patient_id(full_name)`)
        .order('created_at', { ascending: false })
        .limit(filters.limit ?? 100);

    if (filters.action) query = query.eq('action', filters.action);
    if (filters.patientId) query = query.eq('patient_id', filters.patientId);
    if (filters.actorId) query = query.eq('actor_id', filters.actorId);
    if (filters.fromDate) query = query.gte('created_at', filters.fromDate);
    if (filters.toDate) query = query.lte('created_at', filters.toDate);
    if (filters.offset) query = query.range(filters.offset, (filters.offset ?? 0) + (filters.limit ?? 100) - 1);

    const { data, error } = await query;
    if (error) { console.error('getAuditLogs:', error); return []; }

    return (data || []).map((r: any) => ({
        id: r.id,
        actor_id: r.actor_id,
        actor_role: r.actor_role,
        action: r.action,
        resource_type: r.resource_type,
        resource_id: r.resource_id,
        patient_id: r.patient_id,
        ip: r.ip,
        metadata: r.metadata,
        created_at: r.created_at,
        patient_name: r.patient?.full_name ?? null,
    }));
}

// ── Security Events ────────────────────────────────────────
export async function getSecurityEvents(filters: LogFilters & {
    severity?: 'info' | 'warning' | 'critical';
    eventType?: string;
} = {}): Promise<SecurityEventRow[]> {
    await requireAdmin();
    const supabase = createServiceRoleClient();

    let query = supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(filters.limit ?? 100);

    if (filters.severity) query = query.eq('severity', filters.severity);
    if (filters.eventType) query = query.eq('event_type', filters.eventType);
    if (filters.fromDate) query = query.gte('created_at', filters.fromDate);
    if (filters.toDate) query = query.lte('created_at', filters.toDate);

    const { data, error } = await query;
    if (error) { console.error('getSecurityEvents:', error); return []; }
    return (data || []) as SecurityEventRow[];
}

// ── Business Events ────────────────────────────────────────
export async function getBusinessEvents(filters: LogFilters & {
    eventType?: string;
    patientId?: string;
} = {}): Promise<BusinessEventRow[]> {
    await requireAdmin();
    const supabase = createServiceRoleClient();

    let query = supabase
        .from('business_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(filters.limit ?? 100);

    if (filters.eventType) query = query.eq('event_type', filters.eventType);
    if (filters.patientId) query = query.eq('patient_id', filters.patientId);
    if (filters.fromDate) query = query.gte('created_at', filters.fromDate);
    if (filters.toDate) query = query.lte('created_at', filters.toDate);

    const { data, error } = await query;
    if (error) { console.error('getBusinessEvents:', error); return []; }
    return (data || []) as BusinessEventRow[];
}

// ── Twilio Webhooks ────────────────────────────────────────
export async function getTwilioWebhooks(filters: LogFilters & {
    status?: string;
    errorCode?: number;
    patientId?: string;
} = {}): Promise<TwilioWebhookRow[]> {
    await requireAdmin();
    const supabase = createServiceRoleClient();

    let query = supabase
        .from('twilio_webhooks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(filters.limit ?? 100);

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.errorCode) query = query.eq('error_code', filters.errorCode);
    if (filters.patientId) query = query.eq('patient_id', filters.patientId);
    if (filters.fromDate) query = query.gte('created_at', filters.fromDate);
    if (filters.toDate) query = query.lte('created_at', filters.toDate);

    const { data, error } = await query;
    if (error) { console.error('getTwilioWebhooks:', error); return []; }
    return (data || []) as TwilioWebhookRow[];
}

// ── Stats for dashboard tiles ──────────────────────────────
export async function getLogsStats(): Promise<{
    auditLast24h: number;
    securityCritical: number;
    webhooksFailed24h: number;
    webhooks63049_7d: number;
}> {
    await requireAdmin();
    const supabase = createServiceRoleClient();
    const day = new Date(Date.now() - 24 * 3600e3).toISOString();
    const week = new Date(Date.now() - 7 * 24 * 3600e3).toISOString();

    const [audit, security, failed, blocked] = await Promise.all([
        supabase.from('audit_logs').select('*', { count: 'exact', head: true }).gte('created_at', day),
        supabase.from('security_events').select('*', { count: 'exact', head: true }).eq('severity', 'critical').gte('created_at', week),
        supabase.from('twilio_webhooks').select('*', { count: 'exact', head: true }).in('status', ['failed', 'undelivered']).gte('created_at', day),
        supabase.from('twilio_webhooks').select('*', { count: 'exact', head: true }).eq('error_code', 63049).gte('created_at', week),
    ]);

    return {
        auditLast24h: audit.count ?? 0,
        securityCritical: security.count ?? 0,
        webhooksFailed24h: failed.count ?? 0,
        webhooks63049_7d: blocked.count ?? 0,
    };
}

// ── Per-patient access log (LGPD Art. 19 response) ─────────
export async function getPatientAccessLog(patientId: string): Promise<AuditLogRow[]> {
    await requireAdmin();
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(500);
    if (error) { console.error('getPatientAccessLog:', error); return []; }
    return (data || []) as AuditLogRow[];
}
