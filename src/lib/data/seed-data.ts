import type { Patient, PatientConversation, Video, HealthMetric, CommunityTopic } from '../types';
import { sub, startOfWeek } from 'date-fns';

const now = new Date();
const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday

// --- PATIENT DATA ---
export const patients: Patient[] = [
    // 1. Paciente VIP, engajado e em progresso.
    {
        id: 'p001',
        fullName: 'Roberto Andrade',
        whatsappNumber: 'whatsapp:+5511999990001',
        needsAttention: false,
        subscription: { plan: 'vip', priority: 3 },
        protocol: {
            protocolId: 'performance_90_dias',
            startDate: sub(now, { days: 15 }).toISOString(),
            currentDay: 16,
            isActive: true,
            weightGoal: 95,
        },
        gamification: {
            totalPoints: 720,
            level: 'Praticante',
            badges: ["pe_direito_badge", "bom_de_garfo_badge"],
            weeklyProgress: {
                weekStartDate: weekStart.toISOString(),
                perspectives: {
                    alimentacao: { current: 1, goal: 5, isComplete: false },
                    movimento: { current: 2, goal: 5, isComplete: false },
                    hidratacao: { current: 3, goal: 5, isComplete: false },
                    disciplina: { current: 1, goal: 5, isComplete: false },
                    bemEstar: { current: 0, goal: 5, isComplete: false },
                }
            }
        },
        name: 'Roberto Andrade',
        avatar: 'https://placehold.co/100x100/A0D2E8/333?text=RA',
        email: 'roberto.andrade.example@gmail.com',
        lastMessage: 'Atingi minha meta de proteína nos últimos 3 dias!',
        lastMessageTimestamp: sub(now, { hours: 18 }).toISOString(),
        riskLevel: 'low',
        status: 'active',
        activeCheckin: null,
    },
    // 2. Paciente Premium que requer atenção por relatar sintoma.
    {
        id: 'p002',
        fullName: 'Carla Dias',
        whatsappNumber: 'whatsapp:+5511999990002',
        needsAttention: true,
        attentionRequest: {
            reason: "Relato de sintoma",
            triggerMessage: "Estou com uma dor de cabeça estranha desde ontem, devo me preocupar?",
            aiSummary: "A paciente Carla Dias relata uma dor de cabeça atípica e pergunta se deve se preocupar, o que pode indicar um efeito adverso ou uma nova condição que requer avaliação médica.",
            aiSuggestedReply: "Olá Carla, obrigado por me avisar sobre a dor de cabeça. Para investigar melhor, você poderia me dizer: a dor é em algum lugar específico? É pulsante ou uma pressão constante? E em uma escala de 0 a 10, qual a intensidade? Isso me ajudará a entender se pode ser algo relacionado ao tratamento ou se precisamos explorar outras causas.",
            priority: 2,
            createdAt: sub(now, { hours: 1 }).toISOString(),
        },
        subscription: { plan: 'premium', priority: 2 },
        protocol: {
            protocolId: 'evolucao_90_dias',
            startDate: sub(now, { days: 20 }).toISOString(),
            currentDay: 21,
            isActive: true,
            weightGoal: 80,
        },
        gamification: {
            totalPoints: 550, level: 'Praticante',
            badges: ["pe_direito_badge", "bom_de_garfo_badge"],
            weeklyProgress: {
                weekStartDate: weekStart.toISOString(),
                perspectives: {
                    alimentacao: { current: 3, goal: 5, isComplete: false },
                    movimento: { current: 1, goal: 5, isComplete: false },
                    hidratacao: { current: 5, goal: 5, isComplete: true },
                    disciplina: { current: 1, goal: 5, isComplete: false },
                    bemEstar: { current: 2, goal: 5, isComplete: false },
                }
            }
        },
        name: 'Carla Dias',
        avatar: 'https://placehold.co/100x100/f9a8d4/333?text=CD',
        email: 'carla.dias.example@gmail.com',
        lastMessage: 'Estou com uma dor de cabeça estranha desde ontem, devo me preocupar?',
        lastMessageTimestamp: sub(now, { hours: 1 }).toISOString(),
        riskLevel: 'high',
        status: 'active',
        activeCheckin: null,
    },
    // 3. Paciente Freemium, novo cadastro pendente.
    {
        id: 'p003',
        fullName: 'Fernando Lima',
        whatsappNumber: 'whatsapp:+5511999990003',
        needsAttention: true,
        subscription: { plan: 'freemium', priority: 1 },
        protocol: null,
        gamification: {
            totalPoints: 0, level: 'Iniciante', badges: [],
            weeklyProgress: {
                weekStartDate: weekStart.toISOString(),
                perspectives: {
                    alimentacao: { current: 0, goal: 5, isComplete: false },
                    movimento: { current: 0, goal: 5, isComplete: false },
                    hidratacao: { current: 0, goal: 5, isComplete: false },
                    disciplina: { current: 0, goal: 5, isComplete: false },
                    bemEstar: { current: 0, goal: 5, isComplete: false },
                }
            }
        },
        name: 'Fernando Lima',
        avatar: 'https://placehold.co/100x100/a5f3fc/333?text=FL',
        email: 'fernando.lima.example@gmail.com',
        lastMessage: 'Oi, me cadastrei pelo site. Como funciona?',
        lastMessageTimestamp: sub(now, { days: 1, hours: 2 }).toISOString(),
        status: 'pending',
        activeCheckin: null,
    },
    // 4. Paciente Premium recém-ativado.
    {
        id: 'p004',
        fullName: 'Juliana Moreira',
        whatsappNumber: 'whatsapp:+5511999990004',
        needsAttention: false,
        subscription: { plan: 'premium', priority: 2 },
        protocol: {
            protocolId: 'fundamentos_90_dias',
            startDate: sub(now, { days: 4 }).toISOString(),
            currentDay: 5,
            isActive: true,
            weightGoal: 68,
        },
        gamification: {
            totalPoints: 280, level: 'Iniciante', badges: ["pe_direito_badge"],
            weeklyProgress: {
                weekStartDate: weekStart.toISOString(),
                perspectives: {
                    alimentacao: { current: 1, goal: 5, isComplete: false },
                    movimento: { current: 0, goal: 5, isComplete: false },
                    hidratacao: { current: 2, goal: 5, isComplete: false },
                    disciplina: { current: 1, goal: 5, isComplete: false },
                    bemEstar: { current: 1, goal: 5, isComplete: false },
                }
            }
        },
        name: 'Juliana Moreira',
        avatar: 'https://placehold.co/100x100/c4b5fd/333?text=JM',
        email: 'juliana.moreira.example@gmail.com',
        lastMessage: 'Aqui está a foto do meu almoço de hoje!',
        lastMessageTimestamp: sub(now, { hours: 4 }).toISOString(),
        riskLevel: 'low',
        status: 'active',
        activeCheckin: null,
    },
    // 5. Paciente VIP em estágio avançado, mas com risco médio.
    {
        id: 'p005',
        fullName: 'Marcos Rocha',
        whatsappNumber: 'whatsapp:+5511999990005',
        needsAttention: true,
        attentionRequest: {
            reason: "Relato de Dificuldade",
            triggerMessage: "Essa semana foi difícil, não consegui seguir o plano direito no fim de semana.",
            aiSummary: "O paciente Marcos, apesar de estar em um protocolo avançado, relatou dificuldades em seguir o plano no fim de semana. Isso pode indicar uma necessidade de ajuste de estratégia ou uma conversa motivacional.",
            aiSuggestedReply: "Oi, Marcos. Acontece! O importante é não deixar um deslize virar uma desistência. Vamos entender o que aconteceu: foi um evento social, falta de planejamento, ou outra coisa? Saber o gatilho nos ajuda a criar uma estratégia para que o próximo fim de semana seja diferente. Estou aqui para te ajudar a ajustar a rota, sem julgamentos.",
            priority: 3,
            createdAt: sub(now, { hours: 3 }).toISOString(),
        },
        subscription: { plan: 'vip', priority: 3 },
        protocol: {
            protocolId: 'performance_90_dias',
            startDate: sub(now, { days: 25 }).toISOString(),
            currentDay: 26,
            isActive: true,
            weightGoal: 85,
        },
        gamification: {
            totalPoints: 1200, level: 'Veterano',
            badges: ["pe_direito_badge", "bom_de_garfo_badge", "pernas_pra_que_te_quero_badge"],
            weeklyProgress: {
                weekStartDate: weekStart.toISOString(),
                perspectives: {
                    alimentacao: { current: 0, goal: 5, isComplete: false },
                    movimento: { current: 1, goal: 5, isComplete: false },
                    hidratacao: { current: 4, goal: 5, isComplete: false },
                    disciplina: { current: 1, goal: 5, isComplete: false },
                    bemEstar: { current: 3, goal: 5, isComplete: false },
                }
            }
        },
        name: 'Marcos Rocha',
        avatar: 'https://placehold.co/100x100/fecaca/333?text=MR',
        email: 'marcos.rocha.example@gmail.com',
        lastMessage: 'Essa semana foi difícil, não consegui seguir o plano direito no fim de semana.',
        lastMessageTimestamp: sub(now, { hours: 3 }).toISOString(),
        riskLevel: 'medium',
        status: 'active',
        activeCheckin: null,
    },
    // 6. Paciente Freemium, ativo, mas sem protocolo.
    {
        id: 'p006',
        fullName: 'Beatriz Costa',
        whatsappNumber: 'whatsapp:+5511999990006',
        needsAttention: false,
        subscription: { plan: 'freemium', priority: 1 },
        protocol: null,
        gamification: {
            totalPoints: 20, level: 'Iniciante', badges: [],
            weeklyProgress: {
                weekStartDate: weekStart.toISOString(),
                perspectives: {
                    alimentacao: { current: 0, goal: 5, isComplete: false },
                    movimento: { current: 0, goal: 5, isComplete: false },
                    hidratacao: { current: 0, goal: 5, isComplete: false },
                    disciplina: { current: 0, goal: 5, isComplete: false },
                    bemEstar: { current: 0, goal: 5, isComplete: false },
                }
            }
        },
        name: 'Beatriz Costa',
        avatar: 'https://placehold.co/100x100/d9f99d/333?text=BC',
        email: 'beatriz.costa.example@gmail.com',
        lastMessage: 'Obrigada pela dica do vídeo!',
        lastMessageTimestamp: sub(now, { days: 3 }).toISOString(),
        status: 'active',
        activeCheckin: null,
    },
    // 7. Paciente Premium estagnado.
    {
        id: 'p007',
        fullName: 'Tiago Nogueira',
        whatsappNumber: 'whatsapp:+5511999990007',
        needsAttention: false,
        subscription: { plan: 'premium', priority: 2 },
        protocol: {
            protocolId: 'fundamentos_90_dias',
            startDate: sub(now, { days: 18 }).toISOString(),
            currentDay: 19,
            isActive: true,
            weightGoal: 100,
        },
        gamification: {
            totalPoints: 150, level: 'Iniciante',
            badges: ["pe_direito_badge"],
            weeklyProgress: {
                weekStartDate: weekStart.toISOString(),
                perspectives: {
                    alimentacao: { current: 0, goal: 5, isComplete: false },
                    movimento: { current: 0, goal: 5, isComplete: false },
                    hidratacao: { current: 1, goal: 5, isComplete: false },
                    disciplina: { current: 1, goal: 5, isComplete: false },
                    bemEstar: { current: 0, goal: 5, isComplete: false },
                }
            }
        },
        name: 'Tiago Nogueira',
        avatar: 'https://placehold.co/100x100/e9d5ff/333?text=TN',
        email: 'tiago.nogueira.example@gmail.com',
        lastMessage: 'Ok',
        lastMessageTimestamp: sub(now, { days: 6 }).toISOString(),
        riskLevel: 'medium',
        status: 'active',
        activeCheckin: null,
    },
    // 8. Novo paciente pendente, sem interação.
    {
        id: 'p008',
        fullName: 'Sofia Almeida',
        whatsappNumber: 'whatsapp:+5511999990008',
        needsAttention: true,
        subscription: { plan: 'freemium', priority: 1 },
        protocol: null,
        gamification: {
            totalPoints: 0, level: 'Iniciante', badges: [],
            weeklyProgress: {
                weekStartDate: weekStart.toISOString(),
                perspectives: {
                    alimentacao: { current: 0, goal: 5, isComplete: false },
                    movimento: { current: 0, goal: 5, isComplete: false },
                    hidratacao: { current: 0, goal: 5, isComplete: false },
                    disciplina: { current: 0, goal: 5, isComplete: false },
                    bemEstar: { current: 0, goal: 5, isComplete: false },
                }
            }
        },
        name: 'Sofia Almeida',
        avatar: 'https://placehold.co/100x100/fde68a/333?text=SA',
        email: 'sofia.almeida.example@gmail.com',
        lastMessage: 'Novo contato via WhatsApp.',
        lastMessageTimestamp: sub(now, { days: 4 }).toISOString(),
        status: 'pending',
        activeCheckin: null,
    },
];


export const conversations: PatientConversation[] = [
    {
        patientId: 'p001',
        messages: [
            { id: '1', sender: 'me', text: 'Semana de pico! O foco é consistência. Me envie fotos do seu almoço e jantar hoje. Quero te ajudar a fazer os ajustes finos.', timestamp: sub(now, { days: 1 }).toISOString() },
            { id: '2', sender: 'patient', text: 'Atingi minha meta de proteína nos últimos 3 dias!', timestamp: sub(now, { hours: 18 }).toISOString() },
        ],
    },
    {
        patientId: 'p002',
        messages: [
            { id: '1', sender: 'me', text: "Olá! Como está se sentindo hoje?", timestamp: sub(now, { days: 1 }).toISOString() },
            { id: '2', sender: 'patient', text: 'Estou com uma dor de cabeça estranha desde ontem, devo me preocupar?', timestamp: sub(now, { hours: 1 }).toISOString() },
        ]
    },
    {
        patientId: 'p003',
        messages: [
            { id: '1', sender: 'patient', text: 'Oi, me cadastrei pelo site. Como funciona?', timestamp: sub(now, { days: 1, hours: 2 }).toISOString() },
        ]
    },
    {
        patientId: 'p004',
        messages: [
            { id: '1', sender: 'me', text: "Bem-vinda ao Protocolo Fundamentos! Como se sente?", timestamp: sub(now, { days: 4 }).toISOString() },
            { id: '2', sender: 'patient', text: 'Animada! Meu peso hoje é 75kg.', timestamp: sub(now, { days: 4, hours: -1 }).toISOString() },
            { id: '3', sender: 'me', text: 'Olá! Como foi seu almoço hoje em relação ao plano? A) Segui 100%. B) Fiz algumas adaptações. C) Fugi um pouco do plano.', timestamp: sub(now, { hours: 5 }).toISOString() },
            { id: '4', sender: 'patient', text: 'A', timestamp: sub(now, { hours: 4 }).toISOString() },
        ]
    },
    {
        patientId: 'p005',
        messages: [
            { id: '1', sender: 'me', text: 'Olá Marcos, como foi seu fim de semana?', timestamp: sub(now, { hours: 5 }).toISOString() },
            { id: '2', sender: 'patient', text: 'Essa semana foi difícil, não consegui seguir o plano direito no fim de semana.', timestamp: sub(now, { hours: 3 }).toISOString() },
        ]
    },
    {
        patientId: 'p006',
        messages: [
            { id: '1', sender: 'me', text: 'Oi Beatriz, passando para lembrar do vídeo novo que liberamos no portal!', timestamp: sub(now, { days: 3, hours: -2 }).toISOString() },
            { id: '2', sender: 'patient', text: 'Obrigada pela dica do vídeo!', timestamp: sub(now, { days: 3 }).toISOString() },
        ]
    },
    {
        patientId: 'p007',
        messages: [
            { id: '1', sender: 'me', text: 'Olá Tiago, tudo bem? Como foi a pesagem da semana?', timestamp: sub(now, { days: 6, hours: -2 }).toISOString() },
            { id: '2', sender: 'patient', text: 'Ok', timestamp: sub(now, { days: 6 }).toISOString() },
        ]
    },
    {
        patientId: 'p008',
        messages: [] // No messages yet
    },
];

export const healthMetrics: { patientId: string, metrics: HealthMetric[] }[] = [
    {
        patientId: 'p001',
        metrics: [
            { id: 'm001', date: sub(now, { days: 15 }).toISOString(), weight: 102 },
            { id: 'm002', date: sub(now, { days: 8 }).toISOString(), weight: 100.5 },
            { id: 'm003', date: sub(now, { days: 1 }).toISOString(), weight: 99.8 },
        ]
    },
    {
        patientId: 'p002',
        metrics: [
            { id: 'm004', date: sub(now, { days: 20 }).toISOString(), weight: 89 },
            { id: 'm005', date: sub(now, { days: 13 }).toISOString(), weight: 87.2 },
            { id: 'm006', date: sub(now, { days: 6 }).toISOString(), weight: 85.5 },
        ]
    },
    {
        patientId: 'p004',
        metrics: [
            { id: 'm007', date: sub(now, { days: 4 }).toISOString(), weight: 75 },
        ]
    },
    {
        patientId: 'p005',
        metrics: [
            { id: 'm008', date: sub(now, { days: 25 }).toISOString(), weight: 92 },
            { id: 'm009', date: sub(now, { days: 18 }).toISOString(), weight: 90.1 },
            { id: 'm010', date: sub(now, { days: 11 }).toISOString(), weight: 89 },
            { id: 'm011', date: sub(now, { days: 4 }).toISOString(), weight: 89.5 },
        ]
    },
    {
        patientId: 'p007',
        metrics: [
            { id: 'm012', date: sub(now, { days: 18 }).toISOString(), weight: 110 },
            { id: 'm013', date: sub(now, { days: 11 }).toISOString(), weight: 109.8 },
            { id: 'm014', date: sub(now, { days: 4 }).toISOString(), weight: 109.5 },
        ]
    }
];

export const videos: Video[] = [
    {
        id: 'vid01',
        category: 'Nutrição Inteligente',
        title: '10 DICAS PARA EMAGRECER DA FORMA CORRETA',
        description: 'O vídeo apresenta 10 dicas práticas para emagrecer de forma saudável e sustentável, com foco em mudanças de hábitos, como alimentação equilibrada e prática regular de exercícios, evitando dietas extremas.',
        thumbnailUrl: 'https://img.youtube.com/vi/OiqS2ohM5Jc/hqdefault.jpg',
        videoUrl: 'https://www.youtube.com/watch?v=OiqS2ohM5Jc',
        plans: ['freemium', 'premium', 'vip'],
    },
    {
        id: 'vid02',
        category: 'Mentalidade e Comportamento',
        title: 'Se você NÃO CONSEGUE EMAGRECER, assista isso…',
        description: 'Um guia detalhado baseado em estudos científicos, explicando por que muitas dietas falham e oferecendo estratégias para perder peso de forma definitiva, com dicas para evitar o efeito sanfona.',
        thumbnailUrl: 'https://img.youtube.com/vi/Q_2TGWW8XpM/hqdefault.jpg',
        videoUrl: 'https://www.youtube.com/watch?v=Q_2TGWW8XpM',
        plans: ['premium', 'vip'],
    },
    {
        id: 'vid03',
        category: 'Mentalidade e Comportamento',
        title: '4 HÁBITOS PARA EMAGRECER E NÃO ENGORDAR DE NOVO',
        description: 'O vídeo destaca quatro hábitos simples e eficazes para emagrecer e manter o peso, incluindo ajustes na alimentação, sono de qualidade e rotina de atividades físicas.',
        thumbnailUrl: 'https://img.youtube.com/vi/ecUQERiCcJ0/hqdefault.jpg',
        videoUrl: 'https://www.youtube.com/watch?v=ecUQERiCcJ0',
        plans: ['premium', 'vip'],
    },
    {
        id: 'vid04',
        category: 'Movimento é Vida',
        title: 'Dicas para EMAGRECIMENTO RÁPIDO!',
        description: 'Oferece dicas práticas e acessíveis para acelerar a perda de peso, com ênfase em treinos rápidos e escolhas alimentares inteligentes, ideal para quem busca resultados imediatos.',
        thumbnailUrl: 'https://img.youtube.com/vi/fO3VRnsNcB0/hqdefault.jpg',
        videoUrl: 'https://www.youtube.com/watch?v=fO3VRnsNcB0',
        plans: ['freemium', 'premium', 'vip'],
    },
    {
        id: 'vid05',
        category: 'Nutrição Inteligente',
        title: 'Como emagrecer rápido? 7 técnicas saudáveis!',
        description: 'Apresenta sete técnicas saudáveis para emagrecer rapidamente, com foco em estratégias práticas como controle de porções, hidratação e exercícios de alta intensidade.',
        thumbnailUrl: 'https://img.youtube.com/vi/9pXv7YX_AyQ/hqdefault.jpg',
        videoUrl: 'https://www.youtube.com/watch?v=9pXv7YX_AyQ',
        plans: ['premium', 'vip'],
    },
    {
        id: 'vid06',
        category: 'Nutrição Inteligente',
        title: '10 DICAS PARA EMAGRECER RÁPIDO E COM SAÚDE',
        description: 'Lista 10 passos para emagrecer com saúde, com ênfase na redução de gordura abdominal, incluindo dicas de alimentação, exercícios específicos e hábitos diários.',
        thumbnailUrl: 'https://img.youtube.com/vi/SXMSSscBklk/hqdefault.jpg',
        videoUrl: 'https://www.youtube.com/watch?v=SXMSSscBklk',
        plans: ['premium', 'vip'],
    },
    {
        id: 'vid07',
        category: 'Mentalidade e Comportamento',
        title: 'Quer emagrecer? Veja essas 5 dicas fáceis! | MARCIO ATALLA',
        description: 'Márcio Atalla compartilha cinco dicas simples para iniciantes no processo de emagrecimento, com foco em mudanças graduais na alimentação e aumento da atividade física.',
        thumbnailUrl: 'https://img.youtube.com/vi/NtVrQKurPkw/hqdefault.jpg',
        videoUrl: 'https://www.youtube.com/watch?v=NtVrQKurPkw',
        plans: ['freemium', 'premium', 'vip'],
    },
    {
        id: 'vid08',
        category: 'Nutrição Inteligente',
        title: '10 DICAS para EMAGRECER SEM GASTAR NADA!',
        description: 'Traz 10 estratégias gratuitas para perder peso, incluindo ajustes na alimentação, treinos caseiros e dicas de motivação para um "glow up" sem custos.',
        thumbnailUrl: 'https://img.youtube.com/vi/zez6XujoXL8/hqdefault.jpg',
        videoUrl: 'https://www.youtube.com/watch?v=zez6XujoXL8',
        plans: ['premium', 'vip'],
    }
];

export const communityPosts: CommunityTopic[] = [
    {
        id: 't001',
        topicId: 't001',
        authorId: 'p002', // Carla Dias
        authorUsername: 'Navegante_Corajoso_1234',
        title: 'Mural de Vitórias: Qual foi sua maior conquista essa semana?',
        text: 'Queria criar um espaço pra gente comemorar junto! Pra mim, foi ter conseguido caminhar 30 minutos 4 dias seguidos. E pra vocês?',
        isPinned: true,
        timestamp: sub(now, { days: 1, hours: 2 }).toISOString(),
        lastActivityTimestamp: sub(now, { hours: 5 }).toISOString(),
        commentCount: 1,
        reactions: [],
        comments: [
            {
                id: 'c001',
                commentId: 'c001',
                topicId: 't001',
                authorId: 'p001',
                authorUsername: 'Membro_Otimista_5678',
                text: 'Que demais! Parabéns! A minha foi ter resistido à sobremesa no escritório hoje.',
                timestamp: sub(now, { hours: 5 }).toISOString(),
                reactions: [],
            }
        ]
    },
    {
        id: 't002',
        topicId: 't002',
        authorId: 'p001', // Roberto Andrade
        authorUsername: 'Explorador_Determinado_9012',
        title: 'Dica pra quem tem dificuldade com água',
        text: 'Gente, eu tinha muita dificuldade em beber água. O que me ajudou foi comprar uma garrafa de 1L bonita e deixar sempre na minha mesa. Deixo a meta de beber duas daquelas por dia. Fica a dica!',
        isPinned: false,
        timestamp: sub(now, { days: 2, hours: 8 }).toISOString(),
        lastActivityTimestamp: sub(now, { days: 2, hours: 8 }).toISOString(),
        commentCount: 0,
        reactions: [],
        comments: []
    }
];
