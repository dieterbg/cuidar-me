import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes a Brazilian phone number to the E.164 format with 'whatsapp:' prefix.
 * It robustly handles numbers with or without country code, and removes the 9th digit if present.
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
    
    // 3. Check for the mobile 9th digit. Common format is DDD (2 digits) + 9th digit (usually '9') + rest of number (8 digits). Total 11 digits.
    if (cleanNumber.length === 11) {
        const ddd = cleanNumber.substring(0, 2);
        const ninthDigit = cleanNumber.charAt(2);
        const mainNumber = cleanNumber.substring(3);
        
        // Mobile numbers in Brazil have '9' as the ninth digit. We remove it for the standard format.
        if (ninthDigit === '9') {
             cleanNumber = ddd + mainNumber;
        }
    }

    // 4. After normalization, the number should have 10 digits (2 for DDD + 8 for the number).
    if (cleanNumber.length === 10) {
         return `whatsapp:+55${cleanNumber}`;
    }

    // If it's still not in the correct format, log a warning and return the best possible guess.
    // This could happen for landlines or malformed numbers.
    console.warn(`[normalizeBrazilianNumber] Could not normalize "${phoneNumber}" to a 10-digit format. Returning a best-effort string.`);
    return `whatsapp:+55${phoneNumber.replace(/\D/g, '')}`;
}
