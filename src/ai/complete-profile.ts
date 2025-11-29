
import dotenv from 'dotenv';
dotenv.config();

import { createServiceRoleClient } from '@/lib/supabase-server-utils';

async function completePatientProfile() {
    const supabase = createServiceRoleClient();
    const email = 'paciente@teste.com';

    console.log(`Completando perfil do usuário ${email}...`);

    // 1. Buscar usuário
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users.find((u: any) => u.email === email);

    if (!user) {
        console.error('❌ Usuário não encontrado!');
        return;
    }

    // 2. Atualizar tabela patients com dados completos
    const { error } = await supabase
        .from('patients')
        .update({
            height_cm: 175,
            initial_weight_kg: 70,
            birth_date: '1990-01-01',
            gender: 'Masculino',
            status: 'active'
        })
        .eq('user_id', user.id);

    if (error) {
        console.error('❌ Erro ao atualizar paciente:', error.message);
    } else {
        console.log('✅ Perfil do paciente completado com sucesso!');
    }
}

completePatientProfile();
