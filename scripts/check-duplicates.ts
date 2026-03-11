
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkDuplicates() {
    // Buscar todos os pacientes com nome Dieter
    const { data: patients, error: pError } = await supabase
        .from('patients')
        .select('id, full_name, whatsapp_number, plan, preferred_message_time')
        .ilike('full_name', '%Dieter%');

    if (pError) {
        console.error('Erro ao buscar pacientes:', pError);
        return;
    }

    console.log('\n--- PACIENTES ENCONTRADOS ---');
    console.log(JSON.stringify(patients, null, 2));

    for (const patient of (patients || [])) {
        console.log(`\nVerificando protocolos para: ${patient.id} (${patient.full_name})`);
        const { data: protocols, error: prError } = await supabase
            .from('patient_protocols')
            .select('*, protocols(name)')
            .eq('patient_id', patient.id);

        if (prError) {
            console.error(`Erro ao buscar protocolos para ${patient.id}:`, prError);
        } else {
            console.log(JSON.stringify(protocols, null, 2));
        }
    }
}

checkDuplicates();
