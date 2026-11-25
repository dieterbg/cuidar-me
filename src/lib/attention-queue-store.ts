import type { SupabaseClient } from '@supabase/supabase-js';
import type { AttentionRequest, Patient } from '@/lib/types';
import { ATTENTION_PRIORITY, compareAttentionRequests, isLegacyEmergency } from '@/lib/attention-priority';

export const ATTENTION_LOAD_ERROR = 'Não foi possível carregar a fila completa. Tente novamente.';
const PAGE_SIZE = 500;
const MAX_PATIENTS = 5000;
const MAX_OPEN_REQUESTS = 10000;
const PATIENT_BATCH_SIZE = 100;
const REQUEST_COLUMNS = 'id,patient_id,reason,trigger_message,ai_summary,ai_suggested_reply,priority,created_at,is_resolved';

type Page = { data: any[] | null; error: unknown; count?: number | null };

async function readCompleteRows(fetchPage: (from: number, to: number) => PromiseLike<Page>, limit: number): Promise<any[]> {
    const rows: any[] = [];
    const seen = new Set<string>();
    let expected: number | undefined;
    try {
        do {
            const { data, error, count } = await fetchPage(rows.length, rows.length + PAGE_SIZE - 1);
            // Count prevents a lower PostgREST row cap from looking like a complete queue.
            if (error || !Array.isArray(data) || typeof count !== 'number' || !Number.isInteger(count)
                || count < 0 || count > limit || (expected !== undefined && expected !== count)
                || rows.length + data.length > count || (!data.length && rows.length < count)) {
                throw new Error(ATTENTION_LOAD_ERROR);
            }
            expected = count;
            for (const row of data) {
                if (!row || typeof row.id !== 'string' || !row.id || seen.has(row.id)) throw new Error(ATTENTION_LOAD_ERROR);
                seen.add(row.id);
                rows.push(row);
            }
        } while (rows.length < expected);
        return rows;
    } catch {
        // Never turn a partial/failed read into an empty or deceptively complete clinical queue.
        throw new Error(ATTENTION_LOAD_ERROR);
    }
}

/** Internal reads: caller must authorize before supplying a privileged client. */
export async function loadPatientListRows(supabase: SupabaseClient): Promise<any[]> {
    return readCompleteRows((from, to) => {
        return supabase.from('patients').select('*', { count: 'exact' }).order('created_at', { ascending: false }).order('id', { ascending: true }).range(from, to);
    }, MAX_PATIENTS);
}

/** Staff-only enrichment; never use a caller-supplied ID set without prior authorization. */
export async function attachOpenAttentionRequests(supabase: SupabaseClient, patients: Patient[]): Promise<Patient[]> {
    const selected = new Map<string, AttentionRequest>();
    let totalRead = 0;
    for (let offset = 0; offset < patients.length; offset += PATIENT_BATCH_SIZE) {
        const ids = patients.slice(offset, offset + PATIENT_BATCH_SIZE).map(patient => patient.id);
        const allowedIds = new Set(ids);
        const rows = await readCompleteRows((from, to) => supabase.from('attention_requests')
            .select(REQUEST_COLUMNS, { count: 'exact' }).in('patient_id', ids).eq('is_resolved', false)
            .order('id', { ascending: true }).range(from, to), MAX_OPEN_REQUESTS - totalRead);
        totalRead += rows.length;
        for (const row of rows) {
            if (!allowedIds.has(row.patient_id) || typeof row.is_resolved !== 'boolean') throw new Error(ATTENTION_LOAD_ERROR);
            if (row.is_resolved) continue;
            if (![1, 2, 3].includes(row.priority)
                || ['reason', 'trigger_message', 'ai_summary', 'ai_suggested_reply', 'created_at'].some(key => typeof row[key] !== 'string')) {
                throw new Error(ATTENTION_LOAD_ERROR);
            }
            const request: AttentionRequest = {
                id: row.id, reason: row.reason, triggerMessage: row.trigger_message,
                aiSummary: row.ai_summary, aiSuggestedReply: row.ai_suggested_reply,
                priority: row.priority === ATTENTION_PRIORITY.standard && isLegacyEmergency(row)
                    ? ATTENTION_PRIORITY.high : row.priority,
                createdAt: row.created_at,
            };
            const previous = selected.get(row.patient_id);
            if (!previous || compareAttentionRequests(request, previous) < 0) selected.set(row.patient_id, request);
        }
    }
    return patients.map(patient => ({ ...patient, attentionRequest: selected.get(patient.id) || null,
        needsAttention: patient.needsAttention || selected.has(patient.id) }));
}
