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
    let digits = phoneNumber.replace(/\D/g, '');

    // 2. Remove '55' country code if present to standardize the core number
    if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
        digits = digits.substring(2);
    }

    // 3. Handle Brazilian mobile (11 digits: DDD + 9 + 8 digits) and landline (10 digits: DDD + 8 digits)
    // If it's 11 digits and the 3rd digit is 9, it's a mobile number.
    // If it's 10 digits, we might want to add the 9th digit if it's mobile, 
    // but without knowing the DDD it's risky for all regions. 
    // For now, we standardize to +55 + digits.

    if (digits.length === 11 || digits.length === 10) {
        // Standardize to +55 + digits (keeping 9th digit if present)
        return `whatsapp:+55${digits}`;
    }

    // 4. Fallback for other lengths
    return phoneNumber.startsWith('whatsapp:') ? phoneNumber : `whatsapp:+${digits || phoneNumber}`;
}
