import { normalizeBrazilianNumber } from '@/lib/utils';

export function getCampaignPhone(patient: {
    status: string;
    whatsapp_consent_at: string | null;
    whatsapp_number: string | null;
}): string | null {
    if (patient.status !== 'active' || !patient.whatsapp_consent_at || !patient.whatsapp_number) return null;
    const rawNumber = patient.whatsapp_number.trim().replace(/^whatsapp:/i, '');
    if (!/^\+?[()\d .-]+$/.test(rawNumber)) return null;
    if (rawNumber.startsWith('+') && !rawNumber.startsWith('+55')) return null;

    const number = normalizeBrazilianNumber(rawNumber);
    return /^whatsapp:\+55[1-9]\d{9,10}$/.test(number) ? number : null;
}
