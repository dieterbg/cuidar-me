import { createServiceRoleClient } from '@/lib/supabase-server-utils';

(async () => {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('videos')
    .select('id, title, videoUrl, thumbnailUrl, category')
    .limit(5);
  
  if (error) {
    console.error('❌ Erro:', error);
  } else {
    console.log('📺 Vídeos:', JSON.stringify(data, null, 2));
  }
  process.exit(0);
})();
