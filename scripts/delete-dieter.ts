import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
});

async function main() {
  console.log('Buscando paciente "Dieter BG"...');
  
  const { data: patients, error: searchError } = await supabase
    .from('patients')
    .select('id, full_name, whatsapp_number')
    .ilike('full_name', '%Dieter BG%');

  if (searchError) {
    console.error('Erro ao buscar paciente:', searchError);
    return;
  }

  if (!patients || patients.length === 0) {
    console.log('Nenhum paciente encontrado com o nome Dieter BG.');
    return;
  }

  for (const patient of patients) {
    console.log(`Encontrado: ${patient.full_name} (ID: ${patient.id}, AuthID: ${patient.auth_user_id})`);
    
    // Deletar dependências para evitar violação de chave estrangeira
    const tables = ['ai_decision_logs', 'attention_requests', 'messages', 'onboarding_states', 'gamification_logs', 'protocol_states', 'checkins', 'scheduled_messages', 'patient_protocols'];
    for (const table of tables) {
      await supabase.from(table).delete().eq('patient_id', patient.id);
    }
    
    // Excluir da tabela patients
    const { error: dbError } = await supabase
      .from('patients')
      .delete()
      .eq('id', patient.id);
      
    if (dbError) {
      console.error(`Erro ao excluir paciente ${patient.id} da tabela:`, dbError);
    } else {
      console.log(`Paciente ${patient.id} e suas dependências foram excluídos da tabela patients.`);
    }

    if (patient.whatsapp_number) {
      const phone = patient.whatsapp_number.replace('whatsapp:', '');
      const { data: users, error: listError } = await supabase.auth.admin.listUsers();
      if (!listError && users && users.users) {
        const authUser = users.users.find(u => u.phone === phone || u.phone === phone.replace('+', ''));
        if (authUser) {
          const { error: authError } = await supabase.auth.admin.deleteUser(authUser.id);
          if (authError) {
            console.error(`Erro ao excluir usuário Auth ${authUser.id}:`, authError);
          } else {
            console.log(`Usuário de autenticação ${authUser.id} excluído com sucesso.`);
          }
        } else {
          console.log(`Nenhum usuário Auth encontrado para o telefone ${phone}`);
        }
      }
    }
  }
  
  console.log('Processo de exclusão finalizado.');
}

main();
