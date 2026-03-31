import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const todayStr = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('scheduled_messages')
    .select('id, status, scheduled_for, message_content, metadata, error_message')
    .gte('scheduled_for', todayStr + 'T00:00:00')
    .order('scheduled_for', { ascending: true });

  if (error) { console.error(error); process.exit(1); }

  console.log('=== FILA HOJE (' + todayStr + ') ===');
  console.log('Total:', data?.length ?? 0);
  for (const m of data || []) {
    const t = new Date(m.scheduled_for).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const title = m.metadata?.messageTitle || m.metadata?.checkinTitle || m.message_content?.substring(0, 50) || '?';
    const err = m.error_message ? ' ⚠️ ' + m.error_message.substring(0, 80) : '';
    console.log(`[${m.status.padEnd(8)}] ${t} | ${title}${err}`);
  }
  process.exit(0);
}

main().catch(console.error);
