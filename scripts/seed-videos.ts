import { createServiceRoleClient } from '@/lib/supabase-server-utils';

const sampleVideos = [
  {
    title: 'Meditação para Controle da Ansiedade',
    description: 'Técnicas de meditação para ajudar no controle emocional',
    category: 'Bem-Estar',
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnail_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
    is_active: true,
    eligible_plans: ['premium', 'freemium'],
  },
  {
    title: 'Treino em Casa para Iniciantes',
    description: 'Exercícios simples que você pode fazer em casa sem equipamentos',
    category: 'Movimento',
    video_url: 'https://www.youtube.com/watch?v=9bzvolis7aA',
    thumbnail_url: 'https://img.youtube.com/vi/9bzvolis7aA/mqdefault.jpg',
    is_active: true,
    eligible_plans: ['premium', 'freemium'],
  },
  {
    title: 'Fundamentos da Alimentação Saudável',
    description: 'Aprenda os princípios básicos de uma alimentação equilibrada',
    category: 'Alimentação',
    video_url: 'https://www.youtube.com/watch?v=ZXsQAXx_ao0',
    thumbnail_url: 'https://img.youtube.com/vi/ZXsQAXx_ao0/mqdefault.jpg',
    is_active: true,
    eligible_plans: ['premium'],
  },
  {
    title: 'Rotina Matinal para Produtividade',
    description: 'Como organizar sua manhã para uma rotina consistente',
    category: 'Disciplina',
    video_url: 'https://www.youtube.com/watch?v=hHW1oY26kxQ',
    thumbnail_url: 'https://img.youtube.com/vi/hHW1oY26kxQ/mqdefault.jpg',
    is_active: true,
    eligible_plans: ['premium', 'freemium'],
  },
  {
    title: 'Importância da Hidratação',
    description: 'Por que beber água é fundamental para sua saúde',
    category: 'Hidratação',
    video_url: 'https://www.youtube.com/watch?v=0OSK-1vXML8',
    thumbnail_url: 'https://img.youtube.com/vi/0OSK-1vXML8/mqdefault.jpg',
    is_active: true,
    eligible_plans: ['premium', 'freemium'],
  },
];

async function seedVideos() {
  const supabase = createServiceRoleClient();

  console.log('🎬 Iniciando seed de vídeos...');

  for (const video of sampleVideos) {
    const { error } = await supabase.from('videos').insert(video);
    if (error) {
      console.error(`❌ Erro ao inserir "${video.title}":`, error.message);
    } else {
      console.log(`✅ Adicionado: ${video.title}`);
    }
  }

  console.log('🎉 Seed completo!');
}

seedVideos().catch(console.error);
