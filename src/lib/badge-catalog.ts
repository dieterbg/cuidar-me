import type { Perspective } from './types';

/**
 * Definição de um badge (conquista)
 */
export interface BadgeDefinition {
    id: string;
    name: string;
    description: string;
    icon: string; // emoji
    rarity: 'comum' | 'raro' | 'epico' | 'lendario';
    criteria: BadgeCriteria;
}

interface BadgeCriteria {
    type: 'streak' | 'points' | 'perspective' | 'level' | 'community' | 'special';
    requirement: number | string;
    perspectiveKey?: Perspective;
}

/**
 * Catálogo completo de badges (20 badges)
 */
export const BADGE_CATALOG: BadgeDefinition[] = [
    // ===== CATEGORIA: STREAK (Sequências) =====
    {
        id: 'streak_7',
        name: 'Fogo no Parquinho',
        description: 'Mantenha um streak de 7 dias consecutivos',
        icon: '🔥',
        rarity: 'comum',
        criteria: { type: 'streak', requirement: 7 }
    },
    {
        id: 'streak_14',
        name: 'Chama Constante',
        description: 'Mantenha um streak de 14 dias consecutivos',
        icon: '🔥',
        rarity: 'comum',
        criteria: { type: 'streak', requirement: 14 }
    },
    {
        id: 'streak_30',
        name: 'Chama Acesa',
        description: 'Mantenha um streak de 30 dias consecutivos',
        icon: '🔥🔥',
        rarity: 'raro',
        criteria: { type: 'streak', requirement: 30 }
    },
    {
        id: 'streak_60',
        name: 'Inferno Controlado',
        description: 'Mantenha um streak de 60 dias consecutivos',
        icon: '🔥🔥',
        rarity: 'epico',
        criteria: { type: 'streak', requirement: 60 }
    },
    {
        id: 'streak_90',
        name: 'Inferno Vivo',
        description: 'Mantenha um streak de 90 dias consecutivos',
        icon: '🔥🔥🔥',
        rarity: 'lendario',
        criteria: { type: 'streak', requirement: 90 }
    },

    // ===== CATEGORIA: PERSPECTIVAS (Pilares) =====
    {
        id: 'hydration_master',
        name: 'Hidratado Profissional',
        description: 'Complete 30 check-ins de hidratação',
        icon: '💧',
        rarity: 'comum',
        criteria: { type: 'perspective', requirement: 30, perspectiveKey: 'hidratacao' }
    },
    {
        id: 'nutrition_expert',
        name: 'Nutri Expert',
        description: 'Obtenha 50 respostas "A" em check-ins de refeição',
        icon: '🥗',
        rarity: 'raro',
        criteria: { type: 'perspective', requirement: 50, perspectiveKey: 'alimentacao' }
    },
    {
        id: 'athlete',
        name: 'Atleta',
        description: 'Complete 20 check-ins de atividade física',
        icon: '🏃',
        rarity: 'raro',
        criteria: { type: 'perspective', requirement: 20, perspectiveKey: 'movimento' }
    },
    {
        id: 'zen_master',
        name: 'Zen Master',
        description: 'Complete 20 check-ins de bem-estar',
        icon: '🧘',
        rarity: 'raro',
        criteria: { type: 'perspective', requirement: 20, perspectiveKey: 'bemEstar' }
    },
    {
        id: 'disciplined',
        name: 'Disciplinado',
        description: 'Complete 10 pesagens semanais',
        icon: '📊',
        rarity: 'comum',
        criteria: { type: 'perspective', requirement: 10, perspectiveKey: 'disciplina' }
    },

    // ===== CATEGORIA: PONTOS =====
    {
        id: 'points_500',
        name: 'Iniciante Dedicado',
        description: 'Alcance 500 pontos totais',
        icon: '⭐',
        rarity: 'comum',
        criteria: { type: 'points', requirement: 500 }
    },
    {
        id: 'points_1000',
        name: 'Praticante Comprometido',
        description: 'Alcance 1.000 pontos totais',
        icon: '⭐',
        rarity: 'comum',
        criteria: { type: 'points', requirement: 1000 }
    },
    {
        id: 'points_2000',
        name: 'Veterano Comprometido',
        description: 'Alcance 2.000 pontos totais',
        icon: '⭐⭐',
        rarity: 'raro',
        criteria: { type: 'points', requirement: 2000 }
    },
    {
        id: 'points_5000',
        name: 'Mestre dos Pontos',
        description: 'Alcance 5.000 pontos totais',
        icon: '⭐⭐⭐',
        rarity: 'epico',
        criteria: { type: 'points', requirement: 5000 }
    },

    // ===== CATEGORIA: COMUNIDADE =====
    {
        id: 'community_10_comments',
        name: 'Conversador',
        description: 'Faça 10 comentários na comunidade',
        icon: '💬',
        rarity: 'comum',
        criteria: { type: 'community', requirement: 10 }
    },
    {
        id: 'community_50_reactions',
        name: 'Apoiador',
        description: 'Dê 50 reações em posts da comunidade',
        icon: '❤️',
        rarity: 'raro',
        criteria: { type: 'community', requirement: 50 }
    },

    // ===== CATEGORIA: ESPECIAIS =====
    {
        id: 'protocol_complete',
        name: 'Transformação Completa',
        description: 'Conclua um protocolo de acompanhamento do início ao fim',
        icon: '🏅',
        rarity: 'epico',
        criteria: { type: 'special', requirement: 'protocol_completed' }
    },
    {
        id: 'weekly_first_step',
        name: 'Primeira Semana Registrada',
        description: 'Complete seu primeiro check-in semanal consolidado',
        icon: 'â­',
        rarity: 'comum',
        criteria: { type: 'special', requirement: 'weekly_first_checkin' }
    },
    {
        id: 'weekly_consistency_4',
        name: '4 Semanas na Rota',
        description: 'Registre quatro semanas de protocolo',
        icon: 'â­',
        rarity: 'comum',
        criteria: { type: 'special', requirement: 'weekly_4_checkins' }
    },
    {
        id: 'weekly_consistency_8',
        name: '8 Semanas de Constancia',
        description: 'Registre oito semanas de protocolo',
        icon: 'â­â­',
        rarity: 'raro',
        criteria: { type: 'special', requirement: 'weekly_8_checkins' }
    },
    {
        id: 'weekly_consistency_12',
        name: 'Ciclo Quase Completo',
        description: 'Registre doze semanas de protocolo',
        icon: 'â­â­â­',
        rarity: 'epico',
        criteria: { type: 'special', requirement: 'weekly_12_checkins' }
    },
    {
        id: 'fundamentos_first_checkin',
        name: 'Base Iniciada',
        description: 'Complete seu primeiro check-in do protocolo Fundamentos',
        icon: 'â­',
        rarity: 'comum',
        criteria: { type: 'special', requirement: 'fundamentos_first_checkin' }
    },
    {
        id: 'fundamentos_consistency_4',
        name: 'Base 4 Semanas',
        description: 'Registre quatro semanas no protocolo Fundamentos',
        icon: 'â­',
        rarity: 'comum',
        criteria: { type: 'special', requirement: 'fundamentos_4_checkins' }
    },
    {
        id: 'fundamentos_consistency_8',
        name: 'Base Sustentada',
        description: 'Registre oito semanas no protocolo Fundamentos',
        icon: 'â­â­',
        rarity: 'raro',
        criteria: { type: 'special', requirement: 'fundamentos_8_checkins' }
    },
    {
        id: 'fundamentos_consistency_12',
        name: 'Base Consolidada',
        description: 'Registre doze semanas no protocolo Fundamentos',
        icon: 'â­â­â­',
        rarity: 'epico',
        criteria: { type: 'special', requirement: 'fundamentos_12_checkins' }
    },
    {
        id: 'evolucao_first_checkin',
        name: 'Evolucao Iniciada',
        description: 'Complete seu primeiro check-in do protocolo Evolucao',
        icon: 'â­',
        rarity: 'comum',
        criteria: { type: 'special', requirement: 'evolucao_first_checkin' }
    },
    {
        id: 'evolucao_consistency_4',
        name: 'Evolucao 4 Semanas',
        description: 'Registre quatro semanas no protocolo Evolucao',
        icon: 'â­',
        rarity: 'comum',
        criteria: { type: 'special', requirement: 'evolucao_4_checkins' }
    },
    {
        id: 'evolucao_consistency_8',
        name: 'Evolucao Sustentada',
        description: 'Registre oito semanas no protocolo Evolucao',
        icon: 'â­â­',
        rarity: 'raro',
        criteria: { type: 'special', requirement: 'evolucao_8_checkins' }
    },
    {
        id: 'evolucao_consistency_12',
        name: 'Evolucao de Ciclo',
        description: 'Registre doze semanas no protocolo Evolucao',
        icon: 'â­â­â­',
        rarity: 'epico',
        criteria: { type: 'special', requirement: 'evolucao_12_checkins' }
    },
    {
        id: 'performance_first_checkin',
        name: 'Performance Iniciada',
        description: 'Complete seu primeiro check-in do protocolo Performance',
        icon: 'â­',
        rarity: 'comum',
        criteria: { type: 'special', requirement: 'performance_first_checkin' }
    },
    {
        id: 'performance_consistency_4',
        name: 'Performance 4 Semanas',
        description: 'Registre quatro semanas no protocolo Performance',
        icon: 'â­',
        rarity: 'comum',
        criteria: { type: 'special', requirement: 'performance_4_checkins' }
    },
    {
        id: 'performance_consistency_8',
        name: 'Performance Sustentada',
        description: 'Registre oito semanas no protocolo Performance',
        icon: 'â­â­',
        rarity: 'raro',
        criteria: { type: 'special', requirement: 'performance_8_checkins' }
    },
    {
        id: 'performance_consistency_12',
        name: 'Performance de Ciclo',
        description: 'Registre doze semanas no protocolo Performance',
        icon: 'â­â­â­',
        rarity: 'epico',
        criteria: { type: 'special', requirement: 'performance_12_checkins' }
    },
    {
        id: 'perfectionist',
        name: 'Perfeccionista',
        description: 'Complete todas as metas semanais 4 semanas seguidas',
        icon: '🎯',
        rarity: 'epico',
        criteria: { type: 'special', requirement: 'perfect_4_weeks' }
    },
    {
        id: 'weight_goal',
        name: 'Campeão',
        description: 'Atinja sua meta de peso do protocolo',
        icon: '🏆',
        rarity: 'lendario',
        criteria: { type: 'special', requirement: 'weight_goal_reached' }
    },
    {
        id: 'level_10',
        name: 'Praticante Avançado',
        description: 'Alcance o nível 10',
        icon: '👑',
        rarity: 'raro',
        criteria: { type: 'level', requirement: 10 }
    },
    {
        id: 'level_20',
        name: 'Lenda Viva',
        description: 'Alcance o nível máximo (20)',
        icon: '👑',
        rarity: 'lendario',
        criteria: { type: 'level', requirement: 20 }
    }
];

/**
 * Busca badge por ID
 */
export function getBadgeById(badgeId: string): BadgeDefinition | undefined {
    return BADGE_CATALOG.find(b => b.id === badgeId);
}

/**
 * Retorna cor baseada na raridade
 */
export function getBadgeRarityColor(rarity: BadgeDefinition['rarity']): string {
    const colors = {
        comum: 'bg-gray-100 text-gray-700 border-gray-300',
        raro: 'bg-blue-100 text-blue-700 border-blue-300',
        epico: 'bg-purple-100 text-purple-700 border-purple-300',
        lendario: 'bg-amber-100 text-amber-700 border-amber-300'
    };
    return colors[rarity];
}
