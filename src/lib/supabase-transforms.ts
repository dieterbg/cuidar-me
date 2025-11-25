// src/lib/supabase-transforms.ts
/**
 * Funções para transformar dados do Supabase para o formato esperado pelo frontend
 */

import type { Patient } from './types';

/**
 * Transforma um paciente do formato Supabase para o formato do frontend
 */
export function transformPatientFromSupabase(supabasePatient: any): Patient {
    return {
        id: supabasePatient.id,
        fullName: supabasePatient.full_name,
        name: supabasePatient.full_name, // Compatibilidade
        whatsappNumber: supabasePatient.whatsapp_number,
        email: supabasePatient.email,
        avatar: supabasePatient.avatar || '',

        // Status e atenção
        needsAttention: supabasePatient.needs_attention || false,
        status: supabasePatient.status || 'active',
        riskLevel: supabasePatient.risk_level,

        // Subscription
        subscription: {
            plan: supabasePatient.plan || 'freemium',
            priority: supabasePatient.priority || 1,
        },

        // Protocolo (será buscado separadamente se necessário)
        protocol: null,

        // Gamificação
        gamification: {
            totalPoints: supabasePatient.total_points || 0,
            level: supabasePatient.level || 'Iniciante',
            badges: supabasePatient.badges || [],
            weeklyProgress: {
                weekStartDate: new Date(),
                perspectives: {
                    alimentacao: { current: 0, goal: 5, isComplete: false },
                    movimento: { current: 0, goal: 5, isComplete: false },
                    hidratacao: { current: 0, goal: 5, isComplete: false },
                    disciplina: { current: 0, goal: 5, isComplete: false },
                    bemEstar: { current: 0, goal: 5, isComplete: false },
                },
            },
        },

        // Attention Request (será buscado separadamente se necessário)
        attentionRequest: null,

        // Active Checkin
        activeCheckin: null,

        // Mensagens
        lastMessage: supabasePatient.last_message || '',
        lastMessageTimestamp: supabasePatient.last_message_timestamp || new Date().toISOString(),

        // Dados pessoais
        birthDate: supabasePatient.birth_date,
        gender: supabasePatient.gender,
        height: supabasePatient.height_cm,
        initialWeight: supabasePatient.initial_weight_kg,
        healthConditions: supabasePatient.health_conditions,
        allergies: supabasePatient.allergies,
        communityUsername: supabasePatient.community_username,

        // Compatibilidade
        plan: supabasePatient.plan,
    };
}

/**
 * Transforma um protocolo do formato Supabase para o formato do frontend
 */
export function transformProtocolFromSupabase(supabaseProtocol: any): any {
    return {
        id: supabaseProtocol.id,
        name: supabaseProtocol.name,
        description: supabaseProtocol.description,
        durationDays: supabaseProtocol.duration_days,
        eligiblePlans: supabaseProtocol.eligible_plans,
        messages: [], // Será preenchido com protocol_steps se necessário
    };
}

/**
 * Transforma uma mensagem do formato Supabase para o formato do frontend
 */
export function transformMessageFromSupabase(supabaseMessage: any): any {
    return {
        id: supabaseMessage.id,
        sender: supabaseMessage.sender,
        text: supabaseMessage.text,
        timestamp: supabaseMessage.created_at,
    };
}

/**
 * Transforma um vídeo do formato Supabase para o formato do frontend
 */
export function transformVideoFromSupabase(supabaseVideo: any): any {
    return {
        id: supabaseVideo.id,
        category: supabaseVideo.category,
        title: supabaseVideo.title,
        description: supabaseVideo.description,
        thumbnailUrl: supabaseVideo.thumbnail_url,
        videoUrl: supabaseVideo.video_url,
        plans: supabaseVideo.eligible_plans,
    };
}

/**
 * Transforma um tópico da comunidade do formato Supabase para o formato do frontend
 */
export function transformCommunityTopicFromSupabase(supabaseTopic: any): any {
    return {
        id: supabaseTopic.id,
        authorId: supabaseTopic.author_id,
        authorUsername: supabaseTopic.author_username,
        title: supabaseTopic.title,
        text: supabaseTopic.text,
        isPinned: supabaseTopic.is_pinned,
        commentCount: supabaseTopic.comment_count,
        createdAt: supabaseTopic.created_at,
        updatedAt: supabaseTopic.updated_at,
        lastActivityAt: supabaseTopic.last_activity_at,
    };
}

/**
 * Transforma um comentário da comunidade do formato Supabase para o formato do frontend
 */
export function transformCommunityCommentFromSupabase(supabaseComment: any): any {
    return {
        id: supabaseComment.id,
        topicId: supabaseComment.topic_id,
        authorId: supabaseComment.author_id,
        authorUsername: supabaseComment.author_username,
        text: supabaseComment.text,
        createdAt: supabaseComment.created_at,
    };
}
