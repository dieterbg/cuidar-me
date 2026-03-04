/**
 * 🧪 Simulação Dinâmica Completa: Cuidar.me
 * 
 * Este script simula o ciclo de vida completo de um paciente:
 * 1. Onboarding Freemium
 * 2. Log de Mensagens (Correção de "Pontos Cegos")
 * 3. Upgrade para Premium e Protocolos
 * 4. Gamificação e Streaks
 * 5. Detecção de Emergência e Escalonamento
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
const Module = require('module');

// 1. Carregar variáveis de ambiente
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// 2. Setup de Shims ANTES dos imports da aplicação
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const mockSupabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);

const originalLoad = Module._load;
Module._load = function (request: string, parent: any, isMain: boolean) {
    if (request === 'next/headers') {
        return {
            cookies: () => ({
                get: () => ({ value: '' }),
                set: () => { },
                remove: () => { },
            }),
            headers: () => new Map(),
        };
    }
    // Redirecionar createClient do servidor para o nosso mock com service role
    if (request === '@/lib/supabase-server') {
        return {
            createClient: () => mockSupabase,
        };
    }
    return originalLoad.apply(this, arguments);
};

// 3. Imports de dependências da simulação
const TEST_PHONE = 'whatsapp:+5511999990005';
const TEST_NAME = 'Paciente Simulação';

async function cleanup(supabase: any, patientId: string) {
    console.log(`🧹 [CLEANUP] Removendo dados de teste para ${patientId}...`);
    await supabase.from('messages').delete().eq('patient_id', patientId);
    await supabase.from('patient_protocols').delete().eq('patient_id', patientId);
    await supabase.from('onboarding_states').delete().eq('patient_id', patientId);
    await supabase.from('patients').delete().eq('id', patientId);
}

async function runSimulation() {
    console.log('\n🚀 INICIANDO SIMULAÇÃO DINÂMICA\n');

    // Dinamicamente importar funções da aplicação
    const { handlePatientReply } = await import('@/ai/handle-patient-reply');
    const { assignProtocolToPatient } = await import('@/ai/actions/protocols');
    const { getProtocols } = await import('@/ai/actions/protocols');

    const supabase = mockSupabase;

    console.log(`[SETUP] Criando paciente Freemium: ${TEST_NAME} (${TEST_PHONE})`);

    // Limpar se já existir
    const { data: existing } = await supabase.from('patients').select('id').eq('whatsapp_number', TEST_PHONE).maybeSingle();
    if (existing) await cleanup(supabase, existing.id);

    const { data: patient, error: pError } = await supabase
        .from('patients')
        .insert({
            full_name: TEST_NAME,
            whatsapp_number: TEST_PHONE,
            plan: 'freemium',
            status: 'active'
        })
        .select()
        .single();

    if (pError) throw pError;
    const patientId = patient.id;

    const protocols = await getProtocols();

    // SCENARIO A: ONBOARDING FREEMIUM
    console.log('\n--- SCENARIO A: ONBOARDING FREEMIUM ---');
    console.log('[ONBOARDING] Iniciando fluxo...');
    await handlePatientReply(TEST_PHONE, 'Olá', 'Simulação');

    const { data: welcomeMsgs } = await supabase.from('messages').select('*').eq('patient_id', patientId);
    console.log(`[VERIFY] Mensagens logadas: ${welcomeMsgs?.length}`);
    if (welcomeMsgs?.some(m => m.sender_type === 'system')) {
        console.log('✅ Welcome logado como SYSTEM!');
    }

    console.log('[ONBOARDING] Usuário responde "Sim"');
    await handlePatientReply(TEST_PHONE, 'Sim', 'Simulação');

    const { data: onbState } = await supabase.from('onboarding_states').select('*').eq('patient_id', patientId).single();
    console.log(`[VERIFY] Onboarding State: ${onbState?.step || 'N/A'}`);

    // SCENARIO B: PREMIUM & PROTOCOLS
    console.log('\n--- SCENARIO B: PREMIUM & PROTOCOLS ---');
    console.log('[UPGRADE] Mudando plano para Premium...');
    await supabase.from('patients').update({ plan: 'premium' }).eq('id', patientId);

    const protocol = protocols[0];
    console.log(`[PROTOCOL] Atribuindo ${protocol.name}...`);
    await assignProtocolToPatient(patientId, protocol.id, 85);

    console.log('[GAMIFICATION] Simulando ENVIO de check-in de Hidratação...');
    await supabase.from('messages').insert({
        patient_id: patientId,
        sender_type: 'system',
        content: '[GAMIFICAÇÃO] Como está sua Hidratação hoje?\nA) Meta batida! 💧\nB) Quase lá\nC) Preciso beber mais',
        whatsapp_sid: 'SIM_SYSTEM_123',
        status: 'delivered'
    });

    console.log('[GAMIFICATION] Simulando RESPOSTA "A"');
    await handlePatientReply(TEST_PHONE, 'A', 'Simulação');

    const { data: updatedPatient } = await supabase.from('patients').select('points, streak_days').eq('id', patientId).single();
    console.log(`[VERIFY] PontosAtuais: ${updatedPatient?.points || 0}`);
    if (updatedPatient && updatedPatient.points > 0) {
        console.log('✅ Gamificação funcionou!');
    }

    // SCENARIO C: EMERGENCY ESCALATION
    console.log('\n--- SCENARIO C: EMERGENCY ESCALATION ---');
    console.log('[EMERGENCY] Enviando: "Socorro, estou com uma dor forte no peito e falta de ar"');
    await handlePatientReply(TEST_PHONE, 'Socorro, estou com uma dor forte no peito e falta de ar', 'Simulação');

    const { data: errorMsgs } = await supabase.from('messages').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(2);
    if (errorMsgs?.some(m => m.sender_type === 'system' && m.content.toLowerCase().includes('emergência'))) {
        console.log('✅ Escalonamento de emergência detectado!');
    }

    // SCENARIO D: RATE LIMIT & LOGS
    console.log('\n--- SCENARIO D: RATE LIMIT & LOGS ---');
    console.log('[LOGS] Testando registro de mensagens de sistema...');
    await handlePatientReply(TEST_PHONE, 'Teste', 'Simulação');

    console.log('\n🏁 SIMULAÇÃO CONCLUÍDA!');
}

runSimulation().catch(e => {
    console.error('\n❌ ERRO NA SIMULAÇÃO:');
    console.error(e);
    process.exit(1);
});
