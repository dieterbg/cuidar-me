import type { Patient } from '@/lib/types';
import { normalizeBrazilianNumber } from '@/lib/utils';

export function parsePatientRegistrationPhone(value: string): string | null {
    const input = value.trim().replace(/^whatsapp:/i, '');
    if (!/^\+?[\d().\s-]+$/.test(input) || (input.startsWith('+') && !input.startsWith('+55'))) return null;
    const phone = normalizeBrazilianNumber(input);
    return /^whatsapp:\+55[1-9]\d{9,10}$/.test(phone) ? phone : null;
}

export type PatientRegistrationInput = {
    fullName?: string;
    whatsappNumber?: string;
    acceptConsent?: boolean;
};

export type PatientRegistrationResult =
    | { success: true; patient: Patient }
    | {
        success: false;
        error?: string;
        missing?: { name: boolean; phone: boolean; consent: boolean };
    };
