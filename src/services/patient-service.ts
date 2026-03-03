import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Busca paciente pelo telefone, tentando múltiplas variações de formato.
 * Twilio envia "whatsapp:+5551987700099" (com 9o dígito).
 * O DB pode armazenar "+5551987700099", "whatsapp:+555198770099" (sem 9o), etc.
 * 
 * Estratégia de busca em 2 fases:
 * 1. Exact match com todas as variações geradas (rápido)
 * 2. Fallback: busca pelos últimos 8 dígitos usando LIKE (cobre qualquer formato)
 */
export async function findPatientByPhone(
    supabase: SupabaseClient,
    whatsappNumber: string
) {
    // ==========================================
    // FASE 1: Exact match com variações
    // ==========================================
    const candidates = generatePhoneVariants(whatsappNumber);
    console.log(`[findPatientByPhone] Trying ${candidates.length} variants for ...${whatsappNumber.slice(-4)}`);

    // Busca todas as variações em uma única query com IN
    const { data: exactMatch } = await supabase
        .from('patients')
        .select('*')
        .in('whatsapp_number', candidates)
        .limit(1)
        .maybeSingle();

    if (exactMatch) {
        console.log(`[findPatientByPhone] ✅ Exact match found: patient ${exactMatch.id}`);
        return exactMatch;
    }

    // ==========================================
    // FASE 2: Fallback por últimos 8 dígitos
    // ==========================================
    const digits = whatsappNumber.replace(/\D/g, '');
    const last8 = digits.slice(-8);

    if (last8.length === 8) {
        console.log(`[findPatientByPhone] ⚠️ No exact match. Trying last-8 fallback: ...${last8}`);
        const { data: fuzzyMatch } = await supabase
            .from('patients')
            .select('*')
            .like('whatsapp_number', `%${last8}%`)
            .limit(1)
            .maybeSingle();

        if (fuzzyMatch) {
            console.log(`[findPatientByPhone] ✅ Fuzzy match found: patient ${fuzzyMatch.id} (stored: ${fuzzyMatch.whatsapp_number})`);
            return fuzzyMatch;
        }
    }

    console.log(`[findPatientByPhone] ❌ No patient found for any variant of ...${whatsappNumber.slice(-4)}`);
    return null;
}

/**
 * Gera variações de formato para um número brasileiro.
 * Ex: "whatsapp:+5551987700099" gera:
 *   - "whatsapp:+5551987700099"  (original)
 *   - "+5551987700099"           (sem prefixo whatsapp:)
 *   - "whatsapp:+555198770099"   (sem 9o dígito)
 *   - "+555198770099"            (sem prefixo e sem 9o dígito)
 *   - "5551987700099"            (só dígitos com country code)
 *   - "51987700099"              (só dígitos sem country code)
 *   - "(51) 98770-0099"          (formatado BR sem 9o)
 *   - "(51) 987700099"           (formatado BR com 9o)
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

    // Extrair apenas dígitos para manipulação
    const digits = withoutPrefix.replace(/\D/g, '');

    // Adicionar versão só-dígitos
    variants.add(digits);
    variants.add(`+${digits}`);

    // Se tem 13 dígitos (55 + DDD 2 + 9 + 8 dígitos), tentar sem o 9o dígito
    if (digits.length === 13 && digits.startsWith('55') && digits.charAt(4) === '9') {
        const without9th = digits.substring(0, 4) + digits.substring(5);
        variants.add(`+${without9th}`);
        variants.add(`whatsapp:+${without9th}`);
        variants.add(without9th);

        // Sem country code
        const localWith9th = digits.substring(2); // DDD + 9 + 8 dígitos
        const localWithout9th = digits.substring(2, 4) + digits.substring(5); // DDD + 8 dígitos
        variants.add(localWith9th);
        variants.add(localWithout9th);
        variants.add(`+${localWith9th}`);
        variants.add(`+${localWithout9th}`);
    }

    // Se tem 12 dígitos (55 + DDD 2 + 8 dígitos), tentar COM o 9o dígito
    if (digits.length === 12 && digits.startsWith('55')) {
        const with9th = digits.substring(0, 4) + '9' + digits.substring(4);
        variants.add(`+${with9th}`);
        variants.add(`whatsapp:+${with9th}`);
        variants.add(with9th);

        // Sem country code
        const localWithout9th = digits.substring(2); // DDD + 8 dígitos
        const localWith9th = digits.substring(2, 4) + '9' + digits.substring(4); // DDD + 9 + 8 dígitos
        variants.add(localWithout9th);
        variants.add(localWith9th);
        variants.add(`+${localWithout9th}`);
        variants.add(`+${localWith9th}`);
    }

    // Se tem 11 dígitos (DDD + 9 + 8 dígitos, sem country code)
    if (digits.length === 11 && digits.charAt(2) === '9') {
        variants.add(`+55${digits}`);
        variants.add(`whatsapp:+55${digits}`);
        const without9th = digits.substring(0, 2) + digits.substring(3);
        variants.add(without9th);
        variants.add(`+55${without9th}`);
        variants.add(`whatsapp:+55${without9th}`);
    }

    // Se tem 10 dígitos (DDD + 8 dígitos, sem country code e sem 9o)
    if (digits.length === 10) {
        variants.add(`+55${digits}`);
        variants.add(`whatsapp:+55${digits}`);
        const with9th = digits.substring(0, 2) + '9' + digits.substring(2);
        variants.add(with9th);
        variants.add(`+55${with9th}`);
        variants.add(`whatsapp:+55${with9th}`);
    }

    return Array.from(variants);
}
