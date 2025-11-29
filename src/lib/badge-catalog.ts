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
