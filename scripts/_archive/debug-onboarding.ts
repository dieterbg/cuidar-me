
import dotenv from 'dotenv';
import fs from 'fs';
import { createServiceRoleClient } from '../src/lib/supabase-server-utils';
import { handlePatientReply } from '../src/ai/handle-patient-reply';

// Carregar .env.local
try {
    const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} catch (e) {
    console.error('Error loading .env.local:', e);
}

const TEST_PHONE = '+5511999887766';
const TEST_NAME = 'Debug Onboarding';

async function runDebug() {
    console.log('🚀 DEBUG ONBOARDING FINAL STEP');
    const supabase = createServiceRoleClient();

    // 1. Limpar
    const { data: existing } = await supabase.from('patients').select('id').eq('whatsapp_number', TEST_PHONE).single();
    if (existing) {
        await supabase.from('onboarding_states').delete().eq('patient_id', existing.id);
        await supabase.from('messages').delete().eq('patient_id', existing.id);
        await supabase.from('patients').delete().eq('id', existing.id);
    }

    // 2. Criar paciente
    const { data: patient } = await supabase.from('patients').insert({
        full_name: TEST_NAME,
        whatsapp_number: TEST_PHONE,
        status: 'pending',
        plan: 'freemium'
    }).select().single();

    if (!patient) throw new Error('Failed to create patient');

    // 3. Criar estado no passo 'target_weight' (penúltimo)
    // freemium flow: welcome -> name -> birthdate -> weight -> height -> goal -> target_weight -> complete
    await supabase.from('onboarding_states').insert({
        patient_id: patient.id,
        step: 'target_weight',
        plan: 'freemium',
        data: {
            name: TEST_NAME,
            birthdate: '15/05/1990',
            weight: 80,
            height: 175,
            goal: 'lose_weight'
        }
    });

    console.log('✅ Estado inicial criado em target_weight');

    // 4. Enviar resposta "5"
    console.log('📱 Enviando mensagem "5"...');
    await handlePatientReply(TEST_PHONE, '5', TEST_NAME);

    // 5. Verificar estado final
    const { data: finalState } = await supabase.from('onboarding_states').select('*').eq('patient_id', patient.id).single();
    console.log('📊 Estado Final:', finalState);

    if (finalState.completed_at) {
        console.log('✅ SUCESSO: Onboarding completado!');
    } else {
        console.error('❌ FALHA: Onboarding não completado.');
    }
}

runDebug().catch(console.error);
