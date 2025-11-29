
import dotenv from 'dotenv';
dotenv.config();

import { createServiceRoleClient } from '@/lib/supabase-server-utils';

async function checkAndFixProfile() {
    const supabase = createServiceRoleClient();
    const email = 'paciente@teste.com';

    console.log(`Verificando usuário ${email}...`);

    // 1. Buscar usuário
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    const user = users.find((u: any) => u.email === email);

    if (!user) {
        console.error('❌ Usuário não encontrado no Auth!');
        return;
    }
    console.log(`✅ Usuário encontrado: ${user.id}`);

    // 2. Buscar perfil
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profile) {
        console.log('✅ Perfil encontrado:', profile);
    } else {
        console.log('⚠️ Perfil NÃO encontrado. Criando agora...');

        const { error: insertError } = await supabase
            .from('profiles')
            .insert({
                id: user.id,
                email: email,
                display_name: 'Paciente Teste',
                role: 'paciente',
                phone: '11999999999'
            });

        if (insertError) {
            console.error('❌ Erro ao criar perfil:', insertError.message);
        } else {
            console.log('✅ Perfil criado com sucesso!');
        }
    }

    // 3. Verificar tabela de pacientes
    const { data: patient } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (patient) {
        console.log('✅ Registro de paciente encontrado:', patient.id);
    } else {
        console.log('⚠️ Registro de paciente NÃO encontrado. Criando agora...');
        const { error: patientError } = await supabase
            .from('patients')
            .insert({
                user_id: user.id,
                full_name: 'Paciente Teste',
                email: email,
                whatsapp_number: '11999999999',
                status: 'active'
            });

        if (patientError) {
            console.error('❌ Erro ao criar registro de paciente:', patientError.message);
        } else {
            console.log('✅ Registro de paciente criado com sucesso!');
        }
    }
}

checkAndFixProfile();
