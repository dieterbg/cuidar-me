import type { BadgeDefinition } from './badge-catalog';
import { BADGE_CATALOG } from './badge-catalog';
import type { Patient, Perspective } from './types';

/**
 * Interface para estatísticas agregadas do paciente
 * Usada para verificar critérios de badges
 */
export interface PatientStats {
    streak: {
        current: number;
        longest: number;
    };
    points: {
        total: number;
    };
    level: {
        current: number;
    };
    perspectives: {
        [key in Perspective]?: {
            checkins: number; // Total de check-ins
            perfectCheckins: number; // Check-ins com nota 'A' (para alimentação)
        };
    };
    community: {
        comments: number;
        reactions: number;
        posts: number;
    };
    special: {
        perfectWeeks: number;
        weightGoalReached: boolean;
    };
}

/**
 * Verifica quais badges o paciente desbloqueou baseado em suas estatísticas
 * Retorna lista de IDs de badges NOVOS (que ainda não tinha)
 */
export function checkBadgeUnlocks(
    currentBadges: string[],
    stats: PatientStats
): string[] {
    const newBadges: string[] = [];

    for (const badge of BADGE_CATALOG) {
        // Se já tem o badge, pula
        if (currentBadges.includes(badge.id)) continue;

        // Verifica critérios
        if (checkBadgeCriteria(badge, stats)) {
            newBadges.push(badge.id);
        }
    }

    return newBadges;
}

/**
 * Verifica se as estatísticas atendem aos critérios de um badge específico
 */
export function checkBadgeCriteria(
    badge: BadgeDefinition,
    stats: PatientStats
): boolean {
    const { type, requirement, perspectiveKey } = badge.criteria;

    switch (type) {
        case 'streak':
            return stats.streak.current >= (requirement as number);

        case 'points':
            return stats.points.total >= (requirement as number);

        case 'level':
            return stats.level.current >= (requirement as number);

        case 'perspective':
            if (!perspectiveKey) return false;
            const pStats = stats.perspectives[perspectiveKey];
            if (!pStats) return false;

            // Para alimentação, geralmente contamos check-ins "A" (perfeitos)
            if (perspectiveKey === 'alimentacao' && badge.id === 'nutrition_expert') {
                return pStats.perfectCheckins >= (requirement as number);
            }

            // Para outros, contamos check-ins totais
            return pStats.checkins >= (requirement as number);

        case 'community':
            if (badge.id.includes('comment')) {
                return stats.community.comments >= (requirement as number);
            }
            if (badge.id.includes('reaction')) {
                return stats.community.reactions >= (requirement as number);
            }
            if (badge.id.includes('influencer')) {
                // Exemplo: criar tópico com X reações (lógica simplificada aqui)
                return false; // Implementar lógica específica se necessário
            }
            return false;

        case 'special':
            if (requirement === 'perfect_4_weeks') {
                return stats.special.perfectWeeks >= 4;
            }
            if (requirement === 'weight_goal_reached') {
                return stats.special.weightGoalReached;
            }
            return false;

        default:
            return false;
    }
}

/**
 * Helper para extrair estatísticas de um objeto Patient completo
 * (Isso seria chamado no server action antes de verificar badges)
 */
export function extractPatientStats(patient: Patient): PatientStats {
    const gamification = patient.gamification || {};
    const streak = gamification.streak || { currentStreak: 0, longestStreak: 0 };

    // Inicializa stats com valores padrão
    const stats: PatientStats = {
        streak: {
            current: streak.currentStreak,
            longest: streak.longestStreak
        },
        points: {
            total: gamification.totalPoints || 0
        },
        level: {
            current: getLevelNumber(gamification.level || 'Iniciante')
        },
        perspectives: {
            alimentacao: { checkins: 0, perfectCheckins: 0 },
            movimento: { checkins: 0, perfectCheckins: 0 },
            hidratacao: { checkins: 0, perfectCheckins: 0 },
            disciplina: { checkins: 0, perfectCheckins: 0 },
            bemEstar: { checkins: 0, perfectCheckins: 0 }
        },
        community: {
            comments: 0, // Precisaria buscar da tabela community_comments
            reactions: 0, // Precisaria buscar da tabela community_reactions
            posts: 0
        },
        special: {
            perfectWeeks: 0, // Precisaria calcular histórico
            weightGoalReached: false // Verificar protocolo vs peso atual
        }
    };

    // Nota: Estatísticas complexas (comunidade, histórico de semanas) 
    // devem ser preenchidas pelo caller (server action) que tem acesso ao banco de dados,
    // pois o objeto Patient nem sempre tem tudo isso aninhado.

    return stats;
}

// Helper local para converter string de nível em número (simplificado)
function getLevelNumber(levelName: string): number {
    // Se o nível já vier como número (sistema novo), retorna ele
    // Mas o tipo em Patient diz string, então vamos tentar parsear ou mapear
    if (!isNaN(Number(levelName))) return Number(levelName);

    const mapping: Record<string, number> = {
        'Iniciante': 1,
        'Praticante': 6,
        'Veterano': 11,
        'Mestre': 16
    };
    return mapping[levelName] || 1;
}
