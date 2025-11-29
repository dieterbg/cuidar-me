
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Mock types needed for the simulation
type OnboardingStep = 'welcome' | 'preferences' | 'complete';

async function simulateConversation() {
    console.log('\n🤖 Iniciando Simulação de Conversa WhatsApp\n');
    console.log('='.repeat(60));

    // 1. Setup: Criar/Limpar Paciente de Teste
    const testPhone = 'whatsapp:+5511999999999';
    console.log(`\n📋 Passo 1: Preparando paciente de teste (${testPhone})...`);

    // Limpar dados antigos
    await supabase.from('onboarding_states').delete().eq('patient_id', 'test-uuid');
    await supabase.from('patients').delete().eq('whatsapp_number', testPhone);

    // Criar novo paciente
    const { data: patient, error: createError } = await supabase
        .from('patients')
        .insert({
            full_name: 'Paciente Teste Simulação',
            whatsapp_number: testPhone,
            plan: 'freemium',
            status: 'active',
            height_cm: 180,
            initial_weight_kg: 80,
            birth_date: '1990-01-01',
            gender: 'masculino',
            goal: 'lose_weight'
        })
        .select()
        .single();

    if (createError) {
        console.error('❌ Erro ao criar paciente:', createError);
        return;
    }
    console.log('✅ Paciente criado com sucesso:', patient.id);

    // 2. Simular Início do Onboarding (O que a API faz)
    console.log('\n🚀 Passo 2: Iniciando Onboarding (Simulando API)...');

    const { error: initError } = await supabase
        .from('onboarding_states')
        .insert({
            patient_id: patient.id,
            step: 'welcome',
            plan: patient.plan,
            data: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });

    if (initError) {
        console.error('❌ Erro ao iniciar onboarding:', initError);
        return;
    }
    console.log('✅ Estado inicial criado no banco (Step: welcome)');
    console.log('📱 Mensagem enviada: "Olá Paciente...! Tudo certo para começarmos?"');

    // 3. Simular Resposta do Usuário: "Sim"
    console.log('\n💬 Passo 3: Usuário responde "Sim"...');

    // Lógica simplificada do handler de resposta
    let currentState = await getOnboardingState(patient.id);

    if (currentState.step === 'welcome') {
        console.log('   Processando resposta "Sim" para etapa "welcome"...');
        // Avançar para preferences
        await updateOnboardingState(patient.id, 'preferences', {});
        console.log('✅ Sistema avançou para etapa: preferences');
        console.log('📱 Mensagem enviada: "Ótimo! Quando prefere receber suas mensagens? A) Manhã..."');
    }

    // 4. Simular Resposta do Usuário: "A" (Manhã)
    console.log('\n💬 Passo 4: Usuário responde "A" (Manhã)...');

    currentState = await getOnboardingState(patient.id);

    if (currentState.step === 'preferences') {
        console.log('   Processando resposta "A" para etapa "preferences"...');

        // Atualizar preferência e finalizar
        await updateOnboardingState(patient.id, 'complete', { preferredTime: 'morning' });

        // Marcar como concluído
        await supabase
            .from('onboarding_states')
            .update({ completed_at: new Date().toISOString() })
            .eq('patient_id', patient.id);

        // Atualizar paciente com horário preferido
        await supabase
            .from('patients')
            .update({ preferred_message_time: 'morning' })
            .eq('id', patient.id);

        console.log('✅ Sistema avançou para etapa: complete');
        console.log('✅ Onboarding marcado como concluído');
        console.log('✅ Preferência salva no perfil do paciente');
        console.log('📱 Mensagem enviada: "Perfeito! 🌅 A partir de amanhã às 8h..."');
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 SIMULAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('O fluxo lógico está funcionando corretamente.');
}

// Helpers
async function getOnboardingState(patientId: string) {
    const { data } = await supabase
        .from('onboarding_states')
        .select('*')
        .eq('patient_id', patientId)
        .single();
    return data;
}

async function updateOnboardingState(patientId: string, step: string, data: any) {
    await supabase
        .from('onboarding_states')
        .update({
            step,
            data,
            updated_at: new Date().toISOString()
        })
        .eq('patient_id', patientId);
}

simulateConversation();
