import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Normalizes a Brazilian phone number to the E.164 format with 'whatsapp:' prefix.
 * It robustly handles numbers with or without country code, and preserves the 9th digit.
 * @param phoneNumber The raw phone number string, e.g., 'whatsapp:+5511999998888' or '11999998888'.
 * @returns The normalized phone number string in 'whatsapp:+55...' format or the original if invalid.
 */
export function normalizeBrazilianNumber(phoneNumber: string): string {
    // 1. Remove anything that is not a digit.
    let cleanNumber = phoneNumber.replace(/\D/g, '');

    // 2. If it starts with '55' (Brazil's country code), remove it for now. We'll add it back consistently later.
    if (cleanNumber.startsWith('55')) {
        cleanNumber = cleanNumber.substring(2);
    }

    // 3. Brazilian mobile numbers have 11 digits (DDD + 9 + 8 digits). 
    // Landlines have 10 digits (DDD + 8 digits).
    // We want to preserve both as long as they are valid lengths.
    if (cleanNumber.length === 11 || cleanNumber.length === 10) {
        return `whatsapp:+55${cleanNumber}`;
    }

    // 4. Fallback if the remaining digits don't match 10 or 11
    console.warn(`[normalizeBrazilianNumber] Could not normalize "${phoneNumber}" to 10 or 11 digits. Returning original digits with prefix.`);
    return `whatsapp:+55${cleanNumber}`;
}
