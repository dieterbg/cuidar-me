'use server';

import { createServiceRoleClient } from '@/lib/supabase-server-utils';
import { requireAdmin, authErrorMessage } from '@/lib/authz';

/**
 * Popula o banco de dados com dados de exemplo
 * ATENÇÃO: Use apenas em desenvolvimento!
 */
export async function seedDatabase(): Promise<{ success: boolean; error?: string; details?: string }> {
    // SEGURANÇA: server action = endpoint público. Nunca rodar em produção e
    // sempre exigir admin (usa service-role, que ignora RLS).
    if (process.env.VERCEL_ENV === 'production') {
        return { success: false, error: 'Seed de dados de exemplo não é permitido em produção.' };
    }
    try {
        await requireAdmin();
    } catch (error) {
        return { success: false, error: authErrorMessage(error) };
    }

    const supabase = createServiceRoleClient();
    const details: string[] = [];

    try {
        // 0. Limpar dados existentes (apenas dos dados de exemplo)
        console.log('🧹 Cleaning up existing sample data...');

        const samplePhones = ['+5511999999001', '+5511999999002', '+5511999999003', '+5511999999004', '+5511999999005'];

        // Deletar pacientes de exemplo (o cascade deve cuidar das tabelas relacionadas como metrics, messages, etc.)
        const { error: deleteError } = await supabase
            .from('patients')
            .delete()
            .in('whatsapp_number', samplePhones);

        if (deleteError) {
            console.error('Error cleaning up patients:', deleteError);
            // Não retornamos erro aqui para tentar continuar mesmo se falhar (ex: se não existirem)
        } else {
            details.push('🧹 Dados anteriores limpos com sucesso');
        }

        // 1. Inserir protocolos de exemplo
        console.log('📋 Seeding sample protocols...');

        const protocols = [
            {
                name: 'Protocolo Fundamentos (90 Dias)',
                description: 'Focado em criar hábitos básicos como hidratação, caminhadas leves e um dia de pesagem na semana. Ideal para quem precisa de estrutura para começar e manter a consistência.',
                duration_days: 90,
                eligible_plans: ['premium', 'vip'],
                is_active: true,
            },
            {
                name: 'Protocolo Evolução (90 Dias)',
                description: 'Adiciona uma camada de interação e educação, com envio de fotos de pratos e sugestão de vídeos educativos para aprofundar o conhecimento ao longo de 90 dias.',
                duration_days: 90,
                eligible_plans: ['premium', 'vip'],
                is_active: true,
            },
            {
                name: 'Protocolo Performance (90 Dias)',
                description: 'Acompanhamento intensivo com check-ins mais frequentes e metas de macronutrientes, para quem busca otimizar os resultados em um programa de 90 dias.',
                duration_days: 90,
                eligible_plans: ['vip'],
                is_active: true,
            },
        ];

        const protocolIds: string[] = [];

        for (const protocol of protocols) {
            const { data: existing } = await supabase
                .from('protocols')
                .select('id')
                .eq('name', protocol.name)
                .single();

            if (!existing) {
                const { data: newProtocol, error: protocolError } = await supabase
                    .from('protocols')
                    .insert(protocol)
                    .select()
                    .single();

                if (protocolError) {
                    console.error('Error inserting protocol:', protocolError);
                } else if (newProtocol) {
                    protocolIds.push(newProtocol.id);
                    details.push(`✅ Protocolo criado: ${protocol.name}`);

                    // Inserir passos do protocolo
                    const steps = [
                        {
                            protocol_id: newProtocol.id,
                            day: 1,
                            title: 'Boas-vindas',
                            message: `Bem-vindo(a) ao ${protocol.name}! Vamos começar essa jornada juntos. 🎉`,
                            is_gamification: false,
                        },
                        {
                            protocol_id: newProtocol.id,
                            day: 1,
                            title: 'Check-in de Peso Inicial',
                            message: 'Para começarmos, por favor me informe seu peso atual.',
                            is_gamification: true,
                            perspective: 'disciplina',
                        },
                        {
                            protocol_id: newProtocol.id,
                            day: 2,
                            title: 'Meta de Hidratação',
                            message: 'Hoje vamos falar sobre hidratação! Sua meta é beber 2 litros de água. 💧',
                            is_gamification: false,
                        },
                        {
                            protocol_id: newProtocol.id,
                            day: 7,
                            title: 'Check-in Semanal',
                            message: 'Parabéns por completar sua primeira semana! Me conte seu peso de hoje.',
                            is_gamification: true,
                            perspective: 'disciplina',
                        },
                    ];

                    await supabase.from('protocol_steps').insert(steps);
                }
            } else {
                protocolIds.push(existing.id);
            }
        }

        // 2. Inserir pacientes de exemplo
        console.log('👥 Seeding sample patients...');

        const samplePatients = [
            {
                full_name: 'Ana Silva',
                whatsapp_number: '+5511999999001',
                email: 'ana.silva@example.com',
                avatar: 'https://i.pravatar.cc/150?img=1',
                status: 'active',
                plan: 'premium',
                priority: 2,
                total_points: 450,
                level: 'Praticante',
                badges: ['pe_direito_badge', 'hidratado_badge'],
                last_message: 'Bom dia! Meu peso hoje é 68kg.',
                last_message_timestamp: new Date().toISOString(),
                birth_date: '1990-05-15',
                gender: 'Feminino',
                height_cm: 165,
                initial_weight_kg: 75,
            },
            {
                full_name: 'Carlos Santos',
                whatsapp_number: '+5511999999002',
                email: 'carlos.santos@example.com',
                avatar: 'https://i.pravatar.cc/150?img=12',
                status: 'active',
                plan: 'vip',
                priority: 3,
                total_points: 820,
                level: 'Avançado',
                badges: ['pe_direito_badge', 'atleta_badge', 'foco_total_badge'],
                last_message: 'Fiz 45 minutos de corrida hoje! 🏃',
                last_message_timestamp: new Date(Date.now() - 3600000).toISOString(),
                birth_date: '1985-08-22',
                gender: 'Masculino',
                height_cm: 178,
                initial_weight_kg: 95,
            },
            {
                full_name: 'Maria Oliveira',
                whatsapp_number: '+5511999999003',
                email: 'maria.oliveira@example.com',
                avatar: 'https://i.pravatar.cc/150?img=5',
                status: 'active',
                plan: 'freemium',
                priority: 1,
                total_points: 120,
                level: 'Iniciante',
                badges: ['pe_direito_badge'],
                last_message: 'Consegui beber 2L de água hoje! A',
                last_message_timestamp: new Date(Date.now() - 86400000).toISOString(),
                birth_date: '1995-03-10',
                gender: 'Feminino',
                height_cm: 160,
                initial_weight_kg: 70,
            },
            {
                full_name: 'João Pereira',
                whatsapp_number: '+5511999999004',
                email: 'joao.pereira@example.com',
                avatar: 'https://i.pravatar.cc/150?img=8',
                status: 'active',
                plan: 'premium',
                priority: 2,
                needs_attention: true,
                total_points: 280,
                level: 'Praticante',
                badges: ['pe_direito_badge'],
                last_message: 'Estou com dificuldade para seguir a dieta...',
                last_message_timestamp: new Date(Date.now() - 7200000).toISOString(),
                birth_date: '1988-11-30',
                gender: 'Masculino',
                height_cm: 175,
                initial_weight_kg: 88,
            },
            {
                full_name: 'Beatriz Costa',
                whatsapp_number: '+5511999999005',
                email: 'beatriz.costa@example.com',
                avatar: 'https://i.pravatar.cc/150?img=9',
                status: 'pending',
                plan: 'freemium',
                priority: 1,
                total_points: 0,
                level: 'Iniciante',
                badges: [],
                last_message: 'Olá, gostaria de começar o programa.',
                last_message_timestamp: new Date(Date.now() - 172800000).toISOString(),
                birth_date: '1992-07-18',
                gender: 'Feminino',
                height_cm: 168,
                initial_weight_kg: 80,
            },
        ];

        const patientIds: string[] = [];

        for (const patient of samplePatients) {
            const { data: existing } = await supabase
                .from('patients')
                .select('id')
                .eq('whatsapp_number', patient.whatsapp_number)
                .single();

            if (!existing) {
                const { data: newPatient, error } = await supabase
                    .from('patients')
                    .insert(patient)
                    .select()
                    .single();

                if (error) {
                    console.error('Error inserting patient:', error);
                } else if (newPatient) {
                    patientIds.push(newPatient.id);
                    details.push(`✅ Paciente criado: ${patient.full_name}`);
                }
            } else {
                patientIds.push(existing.id);
            }
        }

        // 3. Inserir mensagens de exemplo
        console.log('💬 Seeding sample messages...');

        if (patientIds.length > 0) {
            const messages = [
                { patient_id: patientIds[0], sender: 'patient', text: 'Olá! Estou começando hoje.' },
                { patient_id: patientIds[0], sender: 'me', text: 'Bem-vinda, Ana! Vamos começar com seu peso inicial.' },
                { patient_id: patientIds[0], sender: 'patient', text: 'Meu peso é 75kg.' },
                { patient_id: patientIds[0], sender: 'me', text: 'Perfeito! Peso registrado. +30 pontos! 🎉' },

                { patient_id: patientIds[1], sender: 'patient', text: 'Fiz 45 minutos de corrida!' },
                { patient_id: patientIds[1], sender: 'me', text: 'Excelente, Carlos! +40 pontos pela atividade física! 💪' },

                { patient_id: patientIds[2], sender: 'patient', text: 'Consegui beber 2L de água hoje! A' },
                { patient_id: patientIds[2], sender: 'me', text: 'Parabéns, Maria! +20 pontos! Continue assim! 💧' },
            ];

            const { error: messagesError } = await supabase
                .from('messages')
                .insert(messages);

            if (!messagesError) {
                details.push(`✅ ${messages.length} mensagens criadas`);
            }
        }

        // 4. Inserir métricas de saúde
        console.log('📊 Seeding health metrics...');

        if (patientIds.length > 0) {
            const today = new Date();
            const healthMetrics = [];

            // Ana Silva - últimos 7 dias
            for (let i = 0; i < 7; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                healthMetrics.push({
                    patient_id: patientIds[0],
                    date: date.toISOString().split('T')[0],
                    weight_kg: 75 - (i * 0.3),
                    glucose_level: 95 + (Math.random() * 10),
                    sleep_duration_hours: 7 + (Math.random() * 1.5),
                    meal_checkin: ['A', 'B', 'A', 'C', 'A', 'B', 'A'][i],
                });
            }

            // Carlos Santos - últimos 14 dias
            for (let i = 0; i < 14; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                healthMetrics.push({
                    patient_id: patientIds[1],
                    date: date.toISOString().split('T')[0],
                    weight_kg: 95 - (i * 0.4),
                    glucose_level: 100 + (Math.random() * 15),
                    sleep_duration_hours: 6.5 + (Math.random() * 2),
                    physical_activity: i % 2 === 0 ? 'Corrida 45min' : null,
                    meal_checkin: ['A', 'A', 'B', 'A', 'C', 'A', 'B', 'A', 'A', 'B', 'A', 'C', 'A', 'A'][i],
                });
            }

            // João Pereira - últimos 5 dias (com dificuldade)
            if (patientIds[3]) {
                for (let i = 0; i < 5; i++) {
                    const date = new Date(today);
                    date.setDate(date.getDate() - i);
                    healthMetrics.push({
                        patient_id: patientIds[3],
                        date: date.toISOString().split('T')[0],
                        weight_kg: 88 + (i * 0.1), // Ganho de peso leve
                        glucose_level: 110 + (Math.random() * 10),
                        sleep_duration_hours: 6 + (Math.random() * 1),
                        meal_checkin: ['C', 'B', 'C', 'B', 'C'][i],
                    });
                }
            }

            const { error: metricsError } = await supabase
                .from('health_metrics')
                .insert(healthMetrics);

            if (!metricsError) {
                details.push(`✅ ${healthMetrics.length} métricas de saúde criadas`);
            }
        }

        // 5. Inserir vídeos educativos
        console.log('🎥 Seeding educational videos...');

        const videos = [
            {
                category: 'Nutrição',
                title: 'Fundamentos da Alimentação Saudável',
                description: 'Aprenda os princípios básicos de uma alimentação equilibrada',
                thumbnail_url: 'https://picsum.photos/seed/video1/400/225',
                video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                eligible_plans: ['freemium', 'premium', 'vip'],
                is_active: true,
            },
            {
                category: 'Exercícios',
                title: 'Treino em Casa para Iniciantes',
                description: 'Exercícios simples que você pode fazer em casa sem equipamentos',
                thumbnail_url: 'https://picsum.photos/seed/video2/400/225',
                video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                eligible_plans: ['freemium', 'premium', 'vip'],
                is_active: true,
            },
            {
                category: 'Mindfulness',
                title: 'Meditação para Controle da Ansiedade',
                description: 'Técnicas de meditação para ajudar no controle emocional',
                thumbnail_url: 'https://picsum.photos/seed/video3/400/225',
                video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                eligible_plans: ['premium', 'vip'],
                is_active: true,
            },
        ];

        for (const video of videos) {
            const { data: existing } = await supabase
                .from('videos')
                .select('id')
                .eq('title', video.title)
                .single();

            if (!existing) {
                const { error } = await supabase
                    .from('videos')
                    .insert(video);

                if (!error) {
                    details.push(`✅ Vídeo criado: ${video.title}`);
                }
            }
        }

        // 6. Inserir progresso semanal de gamificação
        console.log('🎮 Seeding weekly progress...');

        if (patientIds.length > 0) {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Domingo

            const weeklyProgress = [
                {
                    patient_id: patientIds[0],
                    week_start_date: weekStart.toISOString().split('T')[0],
                    alimentacao_current: 4,
                    alimentacao_goal: 5,
                    movimento_current: 2,
                    movimento_goal: 5,
                    hidratacao_current: 5,
                    hidratacao_goal: 5,
                    disciplina_current: 1,
                    disciplina_goal: 5,
                    bem_estar_current: 3,
                    bem_estar_goal: 5,
                },
                {
                    patient_id: patientIds[1],
                    week_start_date: weekStart.toISOString().split('T')[0],
                    alimentacao_current: 5,
                    alimentacao_goal: 5,
                    movimento_current: 5,
                    movimento_goal: 5,
                    hidratacao_current: 5,
                    hidratacao_goal: 5,
                    disciplina_current: 1,
                    disciplina_goal: 5,
                    bem_estar_current: 4,
                    bem_estar_goal: 5,
                },
            ];

            const { error: progressError } = await supabase
                .from('weekly_progress')
                .insert(weeklyProgress);

            if (!progressError) {
                details.push(`✅ Progresso semanal criado para ${weeklyProgress.length} pacientes`);
            }
        }

        // 7. Atribuir protocolo a um paciente
        console.log('📋 Assigning protocols to patients...');

        if (patientIds.length > 0 && protocolIds.length > 0) {
            const patientProtocol = {
                patient_id: patientIds[0],
                protocol_id: protocolIds[0],
                start_date: new Date().toISOString().split('T')[0],
                current_day: 3,
                is_active: true,
                weight_goal_kg: 65,
            };

            const { data: existing } = await supabase
                .from('patient_protocols')
                .select('id')
                .eq('patient_id', patientIds[0])
                .eq('is_active', true)
                .single();

            if (!existing) {
                const { error } = await supabase
                    .from('patient_protocols')
                    .insert(patientProtocol);

                if (!error) {
                    details.push(`✅ Protocolo atribuído a Ana Silva`);
                }
            }
        }

        // 8. Criar uma requisição de atenção
        console.log('🚨 Creating attention request...');

        if (patientIds.length > 3) {
            const attentionRequest = {
                patient_id: patientIds[3], // João Pereira
                reason: 'Dificuldade em seguir o plano alimentar',
                trigger_message: 'Estou com dificuldade para seguir a dieta...',
                ai_summary: 'Paciente relatou dificuldades em manter a adesão ao plano alimentar. Pode estar enfrentando desafios emocionais ou práticos.',
                ai_suggested_reply: 'Olá João! Entendo que está enfrentando dificuldades. Vamos conversar sobre isso? Podemos ajustar seu plano para torná-lo mais adequado à sua rotina.',
                priority: 2,
                is_resolved: false,
            };

            const { error } = await supabase
                .from('attention_requests')
                .insert(attentionRequest);

            if (!error) {
                details.push(`✅ Requisição de atenção criada para João Pereira`);
            }
        }

        // 9. Criar tópicos e comentários da comunidade
        console.log('💬 Seeding community topics and comments...');

        if (patientIds.length > 2) {
            // Primeiro, precisamos garantir que os pacientes tenham community_username
            const communityUsernames = [
                { id: patientIds[0], username: 'ana_silva' },
                { id: patientIds[1], username: 'carlos_atleta' },
                { id: patientIds[2], username: 'maria_oliveira' },
            ];

            for (const user of communityUsernames) {
                await supabase
                    .from('patients')
                    .update({ community_username: user.username })
                    .eq('id', user.id);
            }

            // Criar tópicos da comunidade
            const topics = [
                {
                    author_id: patientIds[0],
                    author_username: 'ana_silva',
                    title: 'Dicas de receitas saudáveis e práticas',
                    text: 'Pessoal, queria compartilhar algumas receitas que tenho feito e que estão me ajudando muito! Alguém tem sugestões de lanches saudáveis para o meio da tarde?',
                    is_pinned: true,
                    comment_count: 2,
                },
                {
                    author_id: patientIds[1],
                    author_username: 'carlos_atleta',
                    title: 'Rotina de exercícios em casa',
                    text: 'Comecei a fazer exercícios em casa e já estou vendo resultados! Para quem está começando, recomendo começar com 20 minutos de caminhada. Quem mais está fazendo atividade física?',
                    is_pinned: false,
                    comment_count: 1,
                },
                {
                    author_id: patientIds[2],
                    author_username: 'maria_oliveira',
                    title: 'Como lidar com a ansiedade?',
                    text: 'Às vezes sinto muita ansiedade e acabo comendo mais do que deveria. Alguém tem dicas de como controlar isso?',
                    is_pinned: false,
                    comment_count: 2,
                },
            ];

            const topicIds: string[] = [];

            for (const topic of topics) {
                const { data: existingTopic } = await supabase
                    .from('community_topics')
                    .select('id')
                    .eq('title', topic.title)
                    .single();

                if (!existingTopic) {
                    const { data: newTopic, error } = await supabase
                        .from('community_topics')
                        .insert(topic)
                        .select()
                        .single();

                    if (!error && newTopic) {
                        topicIds.push(newTopic.id);
                        details.push(`✅ Tópico criado: ${topic.title}`);
                    }
                } else {
                    topicIds.push(existingTopic.id);
                }
            }

            // Criar comentários
            if (topicIds.length > 0) {
                const comments = [
                    // Comentários no tópico 1 (Receitas)
                    {
                        topic_id: topicIds[0],
                        author_id: patientIds[1],
                        author_username: 'carlos_atleta',
                        text: 'Ótima ideia! Eu gosto de fazer mix de castanhas com frutas secas. É prático e nutritivo!',
                    },
                    {
                        topic_id: topicIds[0],
                        author_id: patientIds[2],
                        author_username: 'maria_oliveira',
                        text: 'Eu faço iogurte natural com granola e frutas. Fica delicioso e sustenta bem!',
                    },
                    // Comentário no tópico 2 (Exercícios)
                    {
                        topic_id: topicIds[1],
                        author_id: patientIds[0],
                        author_username: 'ana_silva',
                        text: 'Comecei com caminhadas também! Agora estou fazendo 30 minutos por dia. É muito bom!',
                    },
                    // Comentários no tópico 3 (Ansiedade)
                    {
                        topic_id: topicIds[2],
                        author_id: patientIds[0],
                        author_username: 'ana_silva',
                        text: 'Eu também passo por isso. O que tem me ajudado é fazer respiração profunda e beber água quando sinto vontade de comer por ansiedade.',
                    },
                    {
                        topic_id: topicIds[2],
                        author_id: patientIds[1],
                        author_username: 'carlos_atleta',
                        text: 'Exercício físico ajuda muito! Quando estou ansioso, faço uma caminhada rápida e melhora bastante.',
                    },
                ];

                const { error: commentsError } = await supabase
                    .from('community_comments')
                    .insert(comments);

                if (!commentsError) {
                    details.push(`✅ ${comments.length} comentários criados na comunidade`);
                }

                // Criar algumas reações
                const reactions = [
                    // Reações nos tópicos
                    {
                        target_type: 'topic',
                        target_id: topicIds[0],
                        author_id: patientIds[1],
                        emoji: '👍',
                    },
                    {
                        target_type: 'topic',
                        target_id: topicIds[0],
                        author_id: patientIds[2],
                        emoji: '💡',
                    },
                    {
                        target_type: 'topic',
                        target_id: topicIds[1],
                        author_id: patientIds[0],
                        emoji: '💪',
                    },
                ];

                const { error: reactionsError } = await supabase
                    .from('reactions')
                    .insert(reactions);

                if (!reactionsError) {
                    details.push(`✅ ${reactions.length} reações criadas`);
                }
            }
        }

        console.log('✅ Database seeded successfully!');
        return {
            success: true,
            details: details.join('\n')
        };
    } catch (error: any) {
        console.error('❌ Error seeding database:', error);
        return { success: false, error: error.message };
    }
}
