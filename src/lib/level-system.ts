/**
 * Sistema de Níveis - 20 Níveis Progressivos
 * 
 * Níveis 1-5:   Iniciante   (0-500 pts,    gaps de 100)
 * Níveis 6-10:  Praticante  (500-1500 pts, gaps de 200)
 * Níveis 11-15: Veterano    (1500-3000 pts, gaps de 300)
 * Níveis 16-20: Mestre      (3000-6000 pts, gaps de 600)
 */

// Thresholds de pontos para cada nível (1-20)
const LEVEL_THRESHOLDS = [
    0,    // Nível 1
    100,  // Nível 2
    200,  // Nível 3
    300,  // Nível 4
    400,  // Nível 5
    500,  // Nível 6
    700,  // Nível 7
    900,  // Nível 8
    1100, // Nível 9
    1300, // Nível 10
    1500, // Nível 11
    1800, // Nível 12
    2100, // Nível 13
    2400, // Nível 14
    2700, // Nível 15
    3000, // Nível 16
    3600, // Nível 17
    4200, // Nível 18
    4800, // Nível 19
    5400, // Nível 20
];

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
 * Retorna o nome completo do nível (ex: "Veterano III")
 * @param level - Número do nível (1-20)
 * @returns Nome formatado
 */
export function getLevelName(level: number): string {
    if (level <= 5) {
        return `Iniciante ${toRoman(level)}`;
    }
    if (level <= 10) {
        return `Praticante ${toRoman(level - 5)}`;
    }
    if (level <= 15) {
        return `Veterano ${toRoman(level - 10)}`;
    }
    return `Mestre ${toRoman(level - 15)}`;
}

/**
 * Retorna apenas o "tier" (categoria) do nível
 * @param level - Número do nível (1-20)
 * @returns 'Iniciante' | 'Praticante' | 'Veterano' | 'Mestre'
 */
export function getLevelTier(level: number): 'Iniciante' | 'Praticante' | 'Veterano' | 'Mestre' {
    if (level <= 5) return 'Iniciante';
    if (level <= 10) return 'Praticante';
    if (level <= 15) return 'Veterano';
    return 'Mestre';
}

/**
 * Verifica se um nível está em um tier específico
 * Helper para compatibilidade com código antigo
 */
export function isLevelTier(
    level: number | string,
    tier: 'Iniciante' | 'Praticante' | 'Veterano' | 'Mestre'
): boolean {
    // Se vier como string antiga, converter
    if (typeof level === 'string') {
        const oldMapping: Record<string, 'Iniciante' | 'Praticante' | 'Veterano' | 'Mestre'> = {
            'Iniciante': 'Iniciante',
            'Praticante': 'Praticante',
            'Veterano': 'Veterano',
            'Mestre': 'Mestre',
        };
        return oldMapping[level] === tier;
    }

    return getLevelTier(level) === tier;
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
    const emojis = {
        'Iniciante': '🌱',
        'Praticante': '🌿',
        'Veterano': '🌳',
        'Mestre': '👑',
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
    tier: 'Iniciante' | 'Praticante' | 'Veterano' | 'Mestre';
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
    const colors = {
        'Iniciante': 'text-gray-600 dark:text-gray-400',
        'Praticante': 'text-blue-600 dark:text-blue-400',
        'Veterano': 'text-purple-600 dark:text-purple-400',
        'Mestre': 'text-amber-600 dark:text-amber-400',
    };

    return {
        level,
        tier,
        progress,
        pointsForNext,
        color: colors[tier],
    };
}
