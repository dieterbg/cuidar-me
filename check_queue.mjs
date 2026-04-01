import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://asvbmcuilrwjgfjquxpq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzdmJtY3VpbHJ3amdmanF1eHBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzk5ODkxMiwiZXhwIjoyMDc5NTc0OTEyfQ.hA4mlqaP-Zu9WfgAWqcw2fOQQVoeiqDsGbL1lbwb4Tw'
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
