import type { AttentionRequest, Patient } from '@/lib/types';

export const ATTENTION_PRIORITY = { high: 3, medium: 2, standard: 1 } as const;

export function isLegacyEmergency(row: { reason: string; ai_summary: string; ai_suggested_reply: string }): boolean {
    // Exact legacy handler fingerprint, never symptom matching or a new medical assessment.
    return row.reason === 'Emerg\u00eancia Detectada'
        && row.ai_summary.startsWith('Sistema detectou emerg\u00eancia: ')
        && row.ai_suggested_reply === 'Entre em contato URGENTEMENTE.';
}

function timestamp(value: AttentionRequest['createdAt'] | undefined): number {
    const time = value === undefined ? NaN : new Date(value).getTime();
    return Number.isFinite(time) ? time : Infinity;
}

export function compareAttentionRequests(a: AttentionRequest, b: AttentionRequest): number {
    if (a.priority !== b.priority) return b.priority - a.priority;
    const timeA = timestamp(a.createdAt), timeB = timestamp(b.createdAt);
    if (timeA !== timeB) return timeA < timeB ? -1 : 1;
    return (a.id || '').localeCompare(b.id || '');
}

export function isInAttentionQueue(patient: Pick<Patient, 'needsAttention' | 'attentionRequest'>): boolean {
    // Onboarding, inactivity and a stale needs_attention flag must not hide an open request.
    return patient.needsAttention || !!patient.attentionRequest;
}

export function compareAttentionPatients(a: Patient, b: Patient): number {
    // Missing classification needs manual review: after high, before medium/standard.
    // Subscription priority and plan deliberately play no part in this ordering.
    const scoreA = a.attentionRequest?.priority ?? 2.5;
    const scoreB = b.attentionRequest?.priority ?? 2.5;
    if (scoreA !== scoreB) return scoreB - scoreA;
    if (a.attentionRequest && b.attentionRequest) {
        const order = compareAttentionRequests(a.attentionRequest, b.attentionRequest);
        if (order) return order;
    }
    return a.id.localeCompare(b.id);
}
