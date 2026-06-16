import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey
);

const { data } = await supabase.from('scheduled_messages')
  .select('send_at, message_content')
  .eq('patient_id', '2fbe9232-22f1-4201-8cec-beefb0f8e3c8')
  .eq('status', 'pending')
  .order('send_at');

data?.forEach((m, i) => {
  const utc = m.send_at;
  // BRT = UTC - 3h
  const brtDate = new Date(new Date(utc).getTime());
  const brtStr = brtDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  console.log(`${i+1}. UTC: ${utc.substring(11,19)} | BRT: ${brtStr} | ${(m.message_content||'').substring(0,50)}`);
});
