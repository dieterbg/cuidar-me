import { createServiceRoleClient } from '../src/lib/supabase-server-utils';
import { handlePatientReply } from '../src/ai/handle-patient-reply';

async function testFix() {
    const supabase = createServiceRoleClient();
    const TEST_WHATSAPP = 'whatsapp:+5551987700099'; // Número do admin/teste
    
    console.log('--- TESTE: CORREÇÃO STICKY CONTEXT ---');
    
    // 1. Buscar paciente
    const { data: patient } = await supabase
        .from('patients')
        .select('id, full_name')
        .eq('whatsapp_number', TEST_WHATSAPP)
        .single();
        
    if (!patient) {
        console.error('Paciente de teste não encontrado.');
        return;
    }
    
    console.log(`Paciente: ${patient.full_name} (${patient.id})`);
    
    // 2. Simular envio de check-in (Setar estado no DB)
    const checkinTitle = 'Bem-Estar (Semana 1)';
    console.log(`\nSimulando envio de check-in: "${checkinTitle}"...`);
    
    await supabase.from('patients').update({
        last_checkin_type: checkinTitle,
        last_checkin_at: new Date().toISOString()
    }).eq('id', patient.id);
    
    // 3. Simular resposta do paciente "A"
    console.log('\nSimulando resposta do paciente: "A"');
    const result = await handlePatientReply(
        TEST_WHATSAPP,
        'A',
        patient.full_name,
        'test_sid_' + Date.now()
    );
    
    console.log('\nResultado do processamento:', result);
    
    // 4. Verificar se o estado foi limpo
    const { data: updatedPatient } = await supabase
        .from('patients')
        .select('last_checkin_type, last_checkin_at')
        .eq('id', patient.id)
        .single();
        
    if (updatedPatient?.last_checkin_type === null) {
        console.log('\n✅ SUCESSO: O contexto foi limpo após o processamento.');
    } else {
        console.log('\n❌ FALHA: O contexto ainda está presente no banco de dados.');
    }
    
    console.log('\n--- FIM DO TESTE ---');
}

testFix().catch(console.error);
