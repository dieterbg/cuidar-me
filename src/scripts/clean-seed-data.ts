import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) throw new Error('Missing env vars');
const supabase = createClient(supabaseUrl, supabaseKey);

// Números de seed/teste que devem ser removidos de produção
const SEED_PHONE_PATTERNS = [
    '11999999001',
    '11999990001',
    '11999990002',
    '11999990003',
    '11999990004',
    '11999990005',
    '11999990006',
    '11999990007',
    '11999990008',
    '11999990009',
];

async function cleanSeedData() {
    console.log('=== LIMPEZA DE DADOS DE SEED ===\n');

    // 1. Limpar fila de scheduled_messages para números fake
    console.log('🗑️  Limpando scheduled_messages para números de teste...');
    const { count: deletedMessages, error: msgError } = await supabase
        .from('scheduled_messages')
        .delete({ count: 'exact' })
        .or(SEED_PHONE_PATTERNS.map(p => `patient_whatsapp_number.ilike.%${p}%`).join(','));

    if (msgError) {
        console.error('Erro ao limpar mensagens:', msgError);
    } else {
        console.log(`   ✅ Removidas ${deletedMessages} mensagens agendadas`);
    }

    // 2. Desativar protocolos ativos de pacientes seed
    console.log('\n🔄 Desativando protocolos de pacientes de teste...');

    // Buscar pacientes com números de seed
    const { data: seedPatients } = await supabase
        .from('patients')
        .select('id, full_name, whatsapp_number')
        .or(SEED_PHONE_PATTERNS.map(p => `whatsapp_number.ilike.%${p}%`).join(','));

    if (seedPatients && seedPatients.length > 0) {
        console.log(`   Encontrados ${seedPatients.length} pacientes de teste:`);
        for (const p of seedPatients) {
            console.log(`   - ${p.full_name} (${p.whatsapp_number})`);
        }

        const seedIds = seedPatients.map(p => p.id);

        // Desativar protocolos ativos
        const { count: deactivatedProtocols, error: protError } = await supabase
            .from('patient_protocols')
            .update({ is_active: false, completed_at: new Date().toISOString() }, { count: 'exact' })
            .in('patient_id', seedIds)
            .eq('is_active', true);

        if (protError) {
            console.error('Erro ao desativar protocolos:', protError);
        } else {
            console.log(`   ✅ Desativados ${deactivatedProtocols} protocolos`);
        }

        // Mudar status dos pacientes seed para 'inactive'
        const { count: deactivatedPatients, error: patError } = await supabase
            .from('patients')
            .update({ status: 'inactive' }, { count: 'exact' })
            .in('id', seedIds)
            .eq('status', 'active');

        if (patError) {
            console.error('Erro ao desativar pacientes:', patError);
        } else {
            console.log(`   ✅ Desativados ${deactivatedPatients} pacientes de teste`);
        }
    } else {
        console.log('   ℹ️  Nenhum paciente de teste encontrado com esses números');
    }

    // 3. Confirmar estado final
    console.log('\n=== ESTADO FINAL ===');
    const { count: remaining } = await supabase
        .from('scheduled_messages')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
    console.log(`📬 Mensagens pendentes restantes: ${remaining}`);

    const { count: activeProtocols } = await supabase
        .from('patient_protocols')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
    console.log(`🔄 Protocolos ativos restantes: ${activeProtocols}`);
}

cleanSeedData().catch(console.error);
