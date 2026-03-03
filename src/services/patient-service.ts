import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Busca paciente pelo telefone, tentando múltiplas variações de formato.
 * Twilio envia "whatsapp:+5551987700099" (com 9o dígito).
 * O DB pode armazenar "+5551987700099", "whatsapp:+555198770099" (sem 9o), etc.
 */
export async function findPatientByPhone(
    supabase: SupabaseClient,
    whatsappNumber: string
) {
    // Gerar todas as variações possíveis do número
    const candidates = generatePhoneVariants(whatsappNumber);

    for (const candidate of candidates) {
        const { data: patient } = await supabase
            .from('patients')
            .select('*')
            .eq('whatsapp_number', candidate)
            .maybeSingle();

        if (patient) return patient;
    }

    return null;
}

/**
 * Gera variações de formato para um número brasileiro.
 * Ex: "whatsapp:+5551987700099" gera:
 *   - "whatsapp:+5551987700099"  (original)
 *   - "+5551987700099"           (sem prefixo whatsapp:)
 *   - "whatsapp:+555198770099"   (sem 9o dígito)
 *   - "+555198770099"            (sem prefixo e sem 9o dígito)
 */
function generatePhoneVariants(phone: string): string[] {
    const variants = new Set<string>();

    // Adicionar o original sempre
    variants.add(phone);

    // Versão sem "whatsapp:" prefix
    const withoutPrefix = phone.replace('whatsapp:', '');
    variants.add(withoutPrefix);

    // Versão com "whatsapp:" prefix
    if (!phone.startsWith('whatsapp:')) {
        variants.add(`whatsapp:${phone}`);
    }

    // Extrair apenas dígitos para manipulação do 9o dígito
    const digits = withoutPrefix.replace(/\D/g, '');

    // Se tem 13 dígitos (55 + DDD 2 + 9 + 8 dígitos), tentar sem o 9o dígito
    if (digits.length === 13 && digits.startsWith('55') && digits.charAt(4) === '9') {
        const without9th = digits.substring(0, 4) + digits.substring(5);
        variants.add(`+${without9th}`);
        variants.add(`whatsapp:+${without9th}`);
    }

    // Se tem 12 dígitos (55 + DDD 2 + 8 dígitos), tentar COM o 9o dígito
    if (digits.length === 12 && digits.startsWith('55')) {
        const with9th = digits.substring(0, 4) + '9' + digits.substring(4);
        variants.add(`+${with9th}`);
        variants.add(`whatsapp:+${with9th}`);
    }

    return Array.from(variants);
}
