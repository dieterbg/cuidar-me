import { SupabaseClient } from '@supabase/supabase-js';

export async function findPatientByPhone(
    supabase: SupabaseClient,
    whatsappNumber: string
) {
    // 1. Buscar paciente pelo telefone
    const { data: patient } = await supabase
        .from('patients')
        .select('*')
        .eq('whatsapp_number', whatsappNumber)
        .single();

    return patient;
}
