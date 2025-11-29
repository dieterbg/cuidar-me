
import dotenv from 'dotenv';
import fs from 'fs';
import { resolve } from 'path';

// Carregar .env.local
try {
    const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
    console.log('Environment variables loaded.');
} catch (e) {
    console.error('Error loading .env.local:', e);
}

import { handlePatientReply } from '../src/ai/handle-patient-reply';
import { startDailyCheckin } from '../src/ai/actions/daily-checkin';
import { createServiceRoleClient } from '../src/lib/supabase-server-utils';

const TEST_PHONE = '+5511999887766';
const TEST_NAME = 'Paciente Simulacao';

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function simulateMessage(text: string) {
    console.log(`\n[PACIENTE]: "${text}"`);
    try {
        const result = await handlePatientReply(TEST_PHONE, text, TEST_NAME);

        if (result.error) {
            console.error('[ERRO]:', result.error);
        } else {
            console.log('[SUCESSO] Mensagem processada.');
            // Tentar imprimir a resposta se houver (dependendo de como handlePatientReply retorna ou loga)
            // Como handlePatientReply retorna void ou status, assumimos que o sucesso é o envio da mensagem via Twilio (que vai falhar aqui pois não tem credenciais reais ou vai logar erro)
            // Mas queremos ver os logs internos.
        }
    } catch (err) {
        console.error('[EXCEPTION] simulateMessage:', err);
    }
    await delay(1000);
}

async function runSimulation() {
    console.log('INICIANDO SIMULACAO...');

    try {
        const supabase = createServiceRoleClient();

        // 1. Limpar dados anteriores
        console.log('\nLimpando dados de teste...');
        const { data: existingPatient } = await supabase.from('patients').select('id').eq('whatsapp_number', TEST_PHONE).single();
        if (existingPatient) {
            await supabase.from('onboarding_states').delete().eq('patient_id', existingPatient.id);
            await supabase.from('daily_checkin_states').delete().eq('patient_id', existingPatient.id);
            await supabase.from('daily_checkins').delete().eq('patient_id', existingPatient.id);
            await supabase.from('messages').delete().eq('patient_id', existingPatient.id);
            await supabase.from('patients').delete().eq('id', existingPatient.id);
        }
        console.log('Dados limpos.');

        // 2. Teste de Onboarding
        console.log('\n--- ETAPA 1: ONBOARDING ---');

        await simulateMessage('Ola, gostaria de comecar');
        await simulateMessage(TEST_NAME);
        await simulateMessage('15/05/1990');
        await simulateMessage('80.5');
        await simulateMessage('175');
        await simulateMessage('Quero emagrecer');
        await simulateMessage('5');

        console.log('\nOnboarding finalizado!');

        // 3. Teste de IA
        console.log('\n--- ETAPA 2: IA CONVERSACIONAL ---');
        await simulateMessage('Obrigado! O que devo comer no cafe da manha?');

        // 4. Teste de Check-in
        console.log('\n--- ETAPA 3: CHECK-IN DIARIO ---');

        const { data: patient } = await supabase.from('patients').select('id').eq('whatsapp_number', TEST_PHONE).single();
        if (patient) {
            await supabase.from('patients').update({ plan: 'premium' }).eq('id', patient.id);
            console.log('Upgrade para Premium realizado.');

            console.log('Iniciando check-in...');
            await startDailyCheckin(patient.id, TEST_PHONE, TEST_NAME, 'premium');

            await simulateMessage('Sim'); // Hidratacao
            await simulateMessage('A'); // Cafe
            await simulateMessage('B'); // Almoco
            await simulateMessage('A'); // Jantar
            await simulateMessage('Sim'); // Lanches
            await simulateMessage('Sim'); // Atividade
            await simulateMessage('Bem'); // Bem-estar
        } else {
            console.error('Paciente nao encontrado para check-in.');
        }

        console.log('\nSIMULACAO CONCLUIDA!');

    } catch (error) {
        console.error('FATAL ERROR in runSimulation:', error);
    }
}

runSimulation().catch(e => console.error('Unhandled Rejection:', e));
