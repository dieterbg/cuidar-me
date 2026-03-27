import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
    console.log('Inserting pulse message...');
    const { data: patient } = await supabase
        .from('patients')
        .select('id, whatsapp_number')
        .ilike('full_name', '%Dieter Teste 10min%')
        .single();

    if (!patient) {
        console.error('Patient not found');
        return;
    }

    const { data, error } = await supabase.from('scheduled_messages').insert({
        patient_id: patient.id,
        patient_whatsapp_number: patient.whatsapp_number, // Usar número do banco, não hardcoded
        message_content: 'TESTE FINAL DEFINITIVO: Agora com Templates em Produção! 🚀',
        send_at: new Date(Date.now() - 10000).toISOString(),
        source: 'protocol',
        status: 'pending',
        metadata: { title: 'Dica de Energia', isGamification: false }
    }).select();

    if (error) {
        console.error('Insert error:', error);
    } else {
        console.log('Successfully inserted message:', data[0].id);
    }
}

run().catch(console.error);
