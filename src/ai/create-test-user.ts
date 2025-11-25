
import dotenv from 'dotenv';
dotenv.config();

import { createServiceRoleClient } from '@/lib/supabase-server-utils';

async function createTestUser() {
    const supabase = createServiceRoleClient();
    const email = 'paciente@teste.com';
    const password = 'password123'; // Senha simples para teste

    console.log(`Criando usuário ${email}...`);

    // 1. Tenta criar o usuário
    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Confirma o email automaticamente
        user_metadata: {
            displayName: 'Paciente Teste',
            role: 'paciente',
            phone: '11999999999'
        }
    });

    if (error) {
        console.error('Erro ao criar usuário:', error.message);
        return;
    }

    console.log('✅ Usuário criado com sucesso!');
    console.log('------------------------------------------------');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Senha: ${password}`);
    console.log('------------------------------------------------');
}

createTestUser();
