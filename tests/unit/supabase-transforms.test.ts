import { describe, it, expect } from 'vitest';
import {
    transformPatientFromSupabase,
    transformProtocolFromSupabase,
    transformMessageFromSupabase,
    transformVideoFromSupabase,
    transformCommunityTopicFromSupabase,
    transformCommunityCommentFromSupabase,
} from '@/lib/supabase-transforms';

/**
 * Testes das Transformações Supabase → Frontend
 * Funções puras — sem dependências externas
 */
describe('Supabase Transforms', () => {

    // =================================================================
    // TRF-01/02/03: transformPatientFromSupabase
    // =================================================================
    describe('transformPatientFromSupabase', () => {
        it('TRF-01: mapeia todos os campos corretamente', () => {
            const supabaseRow = {
                id: 'p1',
                full_name: 'Maria Silva',
                whatsapp_number: 'whatsapp:+5511999',
                email: 'maria@test.com',
                avatar: 'https://img.com/avatar.jpg',
                needs_attention: true,
                status: 'active',
                risk_level: 'medium',
                plan: 'premium',
                priority: 2,
                total_points: 450,
                level: 5,
                badges: ['first_steps'],
                last_message: 'Olá',
                last_message_timestamp: '2026-01-01T10:00:00Z',
                birth_date: '1990-05-15',
                gender: 'female',
                height_cm: 165,
                initial_weight_kg: 70,
                health_conditions: 'nenhuma',
                allergies: 'nenhuma',
                community_username: 'maria_s',
            };

            const result = transformPatientFromSupabase(supabaseRow);

            expect(result.id).toBe('p1');
            expect(result.fullName).toBe('Maria Silva');
            expect(result.name).toBe('Maria Silva'); // Compatibilidade
            expect(result.whatsappNumber).toBe('whatsapp:+5511999');
            expect(result.email).toBe('maria@test.com');
            expect(result.avatar).toBe('https://img.com/avatar.jpg');
            expect(result.needsAttention).toBe(true);
            expect(result.status).toBe('active');
            expect(result.riskLevel).toBe('medium');
            expect(result.subscription.plan).toBe('premium');
            expect(result.subscription.priority).toBe(2);
            expect(result.gamification.totalPoints).toBe(450);
            expect(result.gamification.level).toBe(5);
            expect(result.gamification.badges).toEqual(['first_steps']);
            expect(result.lastMessage).toBe('Olá');
            expect(result.lastMessageTimestamp).toBe('2026-01-01T10:00:00Z');
            expect(result.birthDate).toBe('1990-05-15');
            expect(result.gender).toBe('female');
            expect(result.height).toBe(165);
            expect(result.initialWeight).toBe(70);
            expect(result.communityUsername).toBe('maria_s');
            expect(result.protocol).toBeNull();
            expect(result.attentionRequest).toBeNull();
            expect(result.activeCheckin).toBeNull();
        });

        it('TRF-02: lida com campos null/undefined com defaults', () => {
            const minimalRow = {
                id: 'p2',
                full_name: 'João',
            };

            const result = transformPatientFromSupabase(minimalRow);

            expect(result.id).toBe('p2');
            expect(result.fullName).toBe('João');
            expect(result.avatar).toBe('');
            expect(result.needsAttention).toBe(false);
            expect(result.status).toBe('active');
            expect(result.subscription.plan).toBe('freemium');
            expect(result.subscription.priority).toBe(1);
            expect(result.gamification.totalPoints).toBe(0);
            expect(result.gamification.level).toBe('Iniciante');
            expect(result.gamification.badges).toEqual([]);
            expect(result.lastMessage).toBe('');
        });

        it('TRF-03: inicializa weeklyProgress com defaults zerados', () => {
            const result = transformPatientFromSupabase({ id: 'p3', full_name: 'A' });

            const wp = result.gamification.weeklyProgress;
            expect(wp.weekStartDate).toBeInstanceOf(Date);
            expect(wp.perspectives.alimentacao).toEqual({ current: 0, goal: 5, isComplete: false });
            expect(wp.perspectives.movimento).toEqual({ current: 0, goal: 5, isComplete: false });
            expect(wp.perspectives.hidratacao).toEqual({ current: 0, goal: 5, isComplete: false });
            expect(wp.perspectives.disciplina).toEqual({ current: 0, goal: 5, isComplete: false });
            expect(wp.perspectives.bemEstar).toEqual({ current: 0, goal: 5, isComplete: false });
        });
    });

    // =================================================================
    // TRF-04: transformProtocolFromSupabase
    // =================================================================
    describe('transformProtocolFromSupabase', () => {
        it('TRF-04: mapeia protocolo corretamente', () => {
            const result = transformProtocolFromSupabase({
                id: 'prot1',
                name: 'Protocolo 21 Dias',
                description: 'Reeducação alimentar',
                duration_days: 21,
                eligible_plans: ['premium', 'vip'],
            });

            expect(result.id).toBe('prot1');
            expect(result.name).toBe('Protocolo 21 Dias');
            expect(result.description).toBe('Reeducação alimentar');
            expect(result.durationDays).toBe(21);
            expect(result.eligiblePlans).toEqual(['premium', 'vip']);
            expect(result.messages).toEqual([]);
        });
    });

    // =================================================================
    // TRF-05: transformMessageFromSupabase
    // =================================================================
    describe('transformMessageFromSupabase', () => {
        it('TRF-05: mapeia mensagem corretamente', () => {
            const result = transformMessageFromSupabase({
                id: 'm1',
                sender: 'patient',
                text: 'Bom dia!',
                created_at: '2026-01-01T08:00:00Z',
            });

            expect(result.id).toBe('m1');
            expect(result.sender).toBe('patient');
            expect(result.text).toBe('Bom dia!');
            expect(result.timestamp).toBe('2026-01-01T08:00:00Z');
        });
    });

    // =================================================================
    // TRF-06: transformVideoFromSupabase
    // =================================================================
    describe('transformVideoFromSupabase', () => {
        it('TRF-06: mapeia vídeo corretamente', () => {
            const result = transformVideoFromSupabase({
                id: 'v1',
                category: 'nutrition',
                title: 'Dicas de Nutrição',
                description: 'Aprenda sobre macro nutrientes',
                thumbnail_url: 'https://img.com/thumb.jpg',
                video_url: 'https://video.com/v1.mp4',
                eligible_plans: ['premium', 'vip'],
            });

            expect(result.id).toBe('v1');
            expect(result.category).toBe('nutrition');
            expect(result.title).toBe('Dicas de Nutrição');
            expect(result.thumbnailUrl).toBe('https://img.com/thumb.jpg');
            expect(result.videoUrl).toBe('https://video.com/v1.mp4');
            expect(result.plans).toEqual(['premium', 'vip']);
        });
    });

    // =================================================================
    // TRF-07: transformCommunityTopicFromSupabase
    // =================================================================
    describe('transformCommunityTopicFromSupabase', () => {
        it('TRF-07: mapeia tópico da comunidade', () => {
            const result = transformCommunityTopicFromSupabase({
                id: 't1',
                author_id: 'u1',
                author_username: 'maria_s',
                title: 'Dica de hidratação',
                text: 'Beber água gelada ajuda...',
                is_pinned: true,
                comment_count: 3,
                created_at: '2026-01-01',
                updated_at: '2026-01-02',
                last_activity_at: '2026-01-03',
            });

            expect(result.id).toBe('t1');
            expect(result.authorId).toBe('u1');
            expect(result.authorUsername).toBe('maria_s');
            expect(result.title).toBe('Dica de hidratação');
            expect(result.isPinned).toBe(true);
            expect(result.commentCount).toBe(3);
        });
    });

    // =================================================================
    // TRF-08: transformCommunityCommentFromSupabase
    // =================================================================
    describe('transformCommunityCommentFromSupabase', () => {
        it('TRF-08: mapeia comentário da comunidade', () => {
            const result = transformCommunityCommentFromSupabase({
                id: 'c1',
                topic_id: 't1',
                author_id: 'u2',
                author_username: 'joao_p',
                text: 'Concordo!',
                created_at: '2026-01-01',
            });

            expect(result.id).toBe('c1');
            expect(result.topicId).toBe('t1');
            expect(result.authorId).toBe('u2');
            expect(result.authorUsername).toBe('joao_p');
            expect(result.text).toBe('Concordo!');
        });
    });
});
