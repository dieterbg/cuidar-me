/**
 * Sistema de Níveis - 20 Níveis Progressivos
 * 
 * Níveis 1-5:   Bronze    (0-3999 pts)     [Exige 1500 para Bronze I real, mas usamos 0-3999 pro tier inteiro]
 * Níveis 6-10:  Prata     (4000-7999 pts)
 * Níveis 11-15: Ouro      (8000-14999 pts)
 * Níveis 16-20: Diamante  (15000+ pts)
 */

// Thresholds de pontos para cada nível (1-20)
// Baseados nas Regras de Ouro:
// Bronze começa em 0 mas a conquista real é 1500. Prata 4000, Ouro 8000, Diamante 15000.
const LEVEL_THRESHOLDS = [
    0,      // Nível 1  (Bronze I)
    300,    // Nível 2  (Bronze II)
    700,    // Nível 3  (Bronze III)
    1500,   // Nível 4  (Bronze IV - Conquista Oficial Bronze)
    2500,   // Nível 5  (Bronze V)
    4000,   // Nível 6  (Prata I - Conquista Oficial Prata)
    4800,   // Nível 7  (Prata II)
    5600,   // Nível 8  (Prata III)
    6400,   // Nível 9  (Prata IV)
    7200,   // Nível 10 (Prata V)
    8000,   // Nível 11 (Ouro I - Conquista Oficial Ouro)
    9000,   // Nível 12 (Ouro II)
    10000,  // Nível 13 (Ouro III)
    11500,  // Nível 14 (Ouro IV)
    13000,  // Nível 15 (Ouro V)
    15000,  // Nível 16 (Diamante I - Conquista Oficial Diamante)
    17000,  // Nível 17 (Diamante II)
    19500,  // Nível 18 (Diamante III)
    22000,  // Nível 19 (Diamante IV)
    25000,  // Nível 20 (Diamante V)
];

export type GamificationTier = 'Bronze' | 'Prata' | 'Ouro' | 'Diamante';

/**
 * Calcula o nível baseado nos pontos totais
 * @param totalPoints - Pontos totais acumulados
 * @returns Número do nível (1-20)
 */
export function calculateLevel(totalPoints: number): number {
    // Percorre thresholds de trás para frente
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (totalPoints >= LEVEL_THRESHOLDS[i]) {
            return i + 1; // Array é 0-indexed, níveis são 1-indexed
        }
    }
    return 1; // Mínimo é nível 1
}

/**
 * Retorna o nome completo do nível (ex: "Ouro III")
 * @param level - Número do nível (1-20)
 * @returns Nome formatado
 */
export function getLevelName(level: number): string {
    if (level <= 5) {
        return `Bronze ${toRoman(level)}`;
    }
    if (level <= 10) {
        return `Prata ${toRoman(level - 5)}`;
    }
    if (level <= 15) {
        return `Ouro ${toRoman(level - 10)}`;
    }
    return `Diamante ${toRoman(level - 15)}`;
}

/**
 * Retorna apenas o "tier" (categoria) do nível
 * @param level - Número do nível (1-20)
 * @returns GamificationTier
 */
export function getLevelTier(level: number): GamificationTier {
    if (level <= 5) return 'Bronze';
    if (level <= 10) return 'Prata';
    if (level <= 15) return 'Ouro';
    return 'Diamante';
}

/**
 * Verifica se um nível está em um tier específico
 * Helper para compatibilidade com código antigo
 */
export function isLevelTier(
    level: number | string,
    tier: GamificationTier | 'Iniciante' | 'Praticante' | 'Veterano' | 'Mestre'
): boolean {
    const targetTier = migrateOldTierName(tier as string);

    if (typeof level === 'string') {
        const mappedLevel = migrateOldTierName(level);
        return mappedLevel === targetTier;
    }

    return getLevelTier(level) === targetTier;
}

function migrateOldTierName(tier: string): GamificationTier {
    const oldMapping: Record<string, GamificationTier> = {
        'Iniciante': 'Bronze',
        'Praticante': 'Prata',
        'Veterano': 'Ouro',
        'Mestre': 'Diamante',
    };
    return oldMapping[tier] || tier as GamificationTier;
}

/**
 * Retorna pontos necessários para o próximo nível
 * @param currentLevel - Nível atual (1-20)
 * @returns Pontos necessários, ou 0 se já está no máximo
 */
export function getPointsForNextLevel(currentLevel: number): number {
    if (currentLevel >= 20) return 0; // Já no máximo
    return LEVEL_THRESHOLDS[currentLevel]; // Threshold do próximo nível
}

/**
 * Retorna pontos necessários para o nível atual
 * @param currentLevel - Nível atual (1-20)
 * @returns Pontos do início do nível
 */
export function getPointsForCurrentLevel(currentLevel: number): number {
    const index = currentLevel - 1; // Converter para 0-indexed
    if (index < 0) return 0;
    if (index >= LEVEL_THRESHOLDS.length) return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
    return LEVEL_THRESHOLDS[index];
}

/**
 * Calcula progresso dentro do nível atual (0-100%)
 * @param totalPoints - Pontos totais
 * @param currentLevel - Nível atual
 * @returns Percentual de progresso (0-100)
 */
export function getLevelProgress(totalPoints: number, currentLevel: number): number {
    if (currentLevel >= 20) return 100; // Máximo atingido

    const currentLevelPoints = getPointsForCurrentLevel(currentLevel);
    const nextLevelPoints = getPointsForNextLevel(currentLevel);
    const pointsInLevel = nextLevelPoints - currentLevelPoints;
    const pointsEarned = totalPoints - currentLevelPoints;

    return Math.min(Math.round((pointsEarned / pointsInLevel) * 100), 100);
}

/**
 * Retorna emoji baseado no tier
 */
export function getLevelEmoji(level: number): string {
    const tier = getLevelTier(level);
    const emojis: Record<GamificationTier, string> = {
        'Bronze': '🥉',
        'Prata': '🥈',
        'Ouro': '🥇',
        'Diamante': '💎',
    };
    return emojis[tier];
}

/**
 * Converte número para algarismo romano (I a V)
 */
function toRoman(num: number): string {
    if (num <= 0 || num > 5) return String(num);

    const map: [string, number][] = [
        ['V', 5],
        ['IV', 4],
        ['III', 3],
        ['II', 2],
        ['I', 1],
    ];

    let result = '';
    for (const [roman, value] of map) {
        while (num >= value) {
            result += roman;
            num -= value;
        }
    }
    return result;
}

/**
 * Calcula o multiplicador de pontos baseado no streak atual
 * 1.0x (padrão), 1.5x (7+ dias), 2.0x (30+ dias)
 */
export function getStreakMultiplier(currentStreak: number): number {
    if (currentStreak >= 30) return 2.0;
    if (currentStreak >= 7) return 1.5;
    return 1.0;
}

/**
 * Migração suave de sistema antigo (string) para novo (number)
 * @param oldLevel - Nível antigo ('Iniciante', 'Praticante', etc.)
 * @param totalPoints - Pontos totais do paciente
 * @returns Nível numérico equivalente
 */
export function migrateOldLevel(oldLevel: string | number, totalPoints: number): number {
    // Se já for número, retorna direto
    if (typeof oldLevel === 'number') return oldLevel;

    // Calcular baseado em pontos (mais preciso)
    return calculateLevel(totalPoints);
}

/**
 * Interface para informações completas de nível (compatibilidade com UI)
 */
export interface LevelInfo {
    level: number;
    tier: GamificationTier;
    progress: number; // 0-100
    pointsForNext: number;
    color: string;
}

/**
 * Retorna informações completas do nível para exibição na UI
 * @param totalPoints - Pontos totais
 * @returns Objeto com todas as informações de nível
 */
export function getLevelInfo(totalPoints: number): LevelInfo {
    const level = calculateLevel(totalPoints);
    const tier = getLevelTier(level);
    const progress = getLevelProgress(totalPoints, level);
    const pointsForNext = level >= 20 ? 0 : getPointsForNextLevel(level) - totalPoints;

    // Cores por tier
    const colors: Record<GamificationTier, string> = {
        'Bronze': 'text-[#cd7f32] dark:text-[#cd7f32]',
        'Prata': 'text-gray-400 dark:text-gray-300',
        'Ouro': 'text-yellow-500 dark:text-yellow-400',
        'Diamante': 'text-cyan-400 dark:text-cyan-300',
    };

    return {
        level,
        tier,
        progress,
        pointsForNext,
        color: colors[tier],
    };
}

