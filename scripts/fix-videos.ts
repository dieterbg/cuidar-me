import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  // Delete all existing videos
  const { error: delErr } = await supabase.from('videos').delete().gte('created_at', '2000-01-01');
  console.log('🗑️ Deletou vídeos antigos:', delErr ? delErr.message : 'OK');

  const realVideos = [
    {
      title: 'Meditação Guiada para Ansiedade - 10 min',
      description: 'Técnicas de respiração e meditação para acalmar a mente e reduzir a ansiedade.',
      category: 'Bem-Estar',
      video_url: 'https://www.youtube.com/watch?v=ssss1MFGnXE',
      thumbnail_url: 'https://img.youtube.com/vi/ssss1MFGnXE/hqdefault.jpg',
      is_active: true,
      eligible_plans: ['premium', 'freemium'],
    },
    {
      title: 'Treino Funcional em Casa - 20 min',
      description: 'Exercícios simples que você pode fazer em casa sem nenhum equipamento.',
      category: 'Movimento',
      video_url: 'https://www.youtube.com/watch?v=ml6cT4AZdqI',
      thumbnail_url: 'https://img.youtube.com/vi/ml6cT4AZdqI/hqdefault.jpg',
      is_active: true,
      eligible_plans: ['premium', 'freemium'],
    },
    {
      title: 'Alimentação Saudável - Guia Completo',
      description: 'Aprenda os princípios básicos de uma alimentação equilibrada para emagrecer com saúde.',
      category: 'Alimentação',
      video_url: 'https://www.youtube.com/watch?v=OiqS2ohM5Jc',
      thumbnail_url: 'https://img.youtube.com/vi/OiqS2ohM5Jc/hqdefault.jpg',
      is_active: true,
      eligible_plans: ['premium', 'freemium'],
    },
    {
      title: 'Como Criar uma Rotina Matinal Produtiva',
      description: 'Dicas práticas para organizar sua manhã e manter a disciplina nos hábitos saudáveis.',
      category: 'Disciplina',
      video_url: 'https://www.youtube.com/watch?v=Q_2TGWW8XpM',
      thumbnail_url: 'https://img.youtube.com/vi/Q_2TGWW8XpM/hqdefault.jpg',
      is_active: true,
      eligible_plans: ['premium', 'freemium'],
    },
    {
      title: 'Importância da Hidratação no Emagrecimento',
      description: 'Entenda como a água impacta seu metabolismo, energia e processo de emagrecimento.',
      category: 'Hidratação',
      video_url: 'https://www.youtube.com/watch?v=9iMGFqMmUFs',
      thumbnail_url: 'https://img.youtube.com/vi/9iMGFqMmUFs/hqdefault.jpg',
      is_active: true,
      eligible_plans: ['premium', 'freemium'],
    },
  ];

  for (const v of realVideos) {
    const { error } = await supabase.from('videos').insert(v);
    if (error) console.error('❌', v.title, error.message);
    else console.log('✅', v.title);
  }

  const { data } = await supabase.from('videos').select('title, thumbnail_url').eq('is_active', true);
  console.log('\n📺 Total vídeos ativos:', data?.length);
  data?.forEach(v => console.log(' -', v.title));
  process.exit(0);
}

run().catch(console.error);
