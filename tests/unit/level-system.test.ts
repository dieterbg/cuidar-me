import { describe, it, expect } from 'vitest';
import {
    calculateLevel,
    getLevelName,
    getLevelTier,
    isLevelTier,
    getPointsForNextLevel,
    getPointsForCurrentLevel,
    getLevelProgress,
    getLevelEmoji,
    migrateOldLevel,
} from '@/lib/level-system';

/**
 * Testes do Sistema de 20 Níveis
 * CRÍTICO: Garantir que não quebre funcionalidade existente
 */
describe('Sistema de 20 Níveis', () => {
    describe('calculateLevel - Cálculo básico', () => {
        it('deve retornar nível 1 para 0-99 pontos', () => {
            expect(calculateLevel(0)).toBe(1);
            expect(calculateLevel(50)).toBe(1);
            expect(calculateLevel(99)).toBe(1);
        });

        it('deve retornar níveis Iniciante (1-5) corretamente', () => {
            expect(calculateLevel(100)).toBe(2);  // 100 pts = nível 2
            expect(calculateLevel(200)).toBe(3);  // 200 pts = nível 3
            expect(calculateLevel(300)).toBe(4);  // 300 pts = nível 4
            expect(calculateLevel(400)).toBe(5);  // 400 pts = nível 5
        });

        it('deve retornar níveis Praticante (6-10) corretamente', () => {
            expect(calculateLevel(500)).toBe(6);   // 500 pts = nível 6
            expect(calculateLevel(700)).toBe(7);   // 700 pts = nível 7
            expect(calculateLevel(900)).toBe(8);   // 900 pts = nível 8
            expect(calculateLevel(1100)).toBe(9);  // 1100 pts = nível 9
            expect(calculateLevel(1300)).toBe(10); // 1300 pts = nível 10
        });

        it('deve retornar níveis Veterano (11-15) corretamente', () => {
            expect(calculateLevel(1500)).toBe(11); // 1500 pts = nível 11
            expect(calculateLevel(1800)).toBe(12);
            expect(calculateLevel(2100)).toBe(13);
            expect(calculateLevel(2400)).toBe(14);
            expect(calculateLevel(2700)).toBe(15);
        });

        it('deve retornar níveis Mestre (16-20) corretamente', () => {
            expect(calculateLevel(3000)).toBe(16);
            expect(calculateLevel(3600)).toBe(17);
            expect(calculateLevel(4200)).toBe(18);
            expect(calculateLevel(4800)).toBe(19);
            expect(calculateLevel(5400)).toBe(20);
            expect(calculateLevel(10000)).toBe(20); // Máximo é 20
        });
    });

    describe('getLevelName - Formatação com romanos', () => {
        it('deve formatar Iniciante corretamente', () => {
            expect(getLevelName(1)).toBe('Iniciante I');
            expect(getLevelName(2)).toBe('Iniciante II');
            expect(getLevelName(3)).toBe('Iniciante III');
            expect(getLevelName(4)).toBe('Iniciante IV');
            expect(getLevelName(5)).toBe('Iniciante V');
        });

        it('deve formatar Praticante corretamente', () => {
            expect(getLevelName(6)).toBe('Praticante I');
            expect(getLevelName(10)).toBe('Praticante V');
        });

        it('deve formatar Veterano corretamente', () => {
            expect(getLevelName(11)).toBe('Veterano I');
            expect(getLevelName(15)).toBe('Veterano V');
        });

        it('deve formatar Mestre corretamente', () => {
            expect(getLevelName(16)).toBe('Mestre I');
            expect(getLevelName(20)).toBe('Mestre V');
        });
    });

    describe('getLevelTier - Categoria do nível', () => {
        it('deve retornar tier correto', () => {
            expect(getLevelTier(1)).toBe('Iniciante');
            expect(getLevelTier(5)).toBe('Iniciante');
            expect(getLevelTier(6)).toBe('Praticante');
            expect(getLevelTier(10)).toBe('Praticante');
            expect(getLevelTier(11)).toBe('Veterano');
            expect(getLevelTier(15)).toBe('Veterano');
            expect(getLevelTier(16)).toBe('Mestre');
            expect(getLevelTier(20)).toBe('Mestre');
        });
    });

    describe('isLevelTier - Compatibilidade com código antigo', () => {
        it('deve funcionar com níveis numéricos', () => {
            expect(isLevelTier(3, 'Iniciante')).toBe(true);
            expect(isLevelTier(3, 'Praticante')).toBe(false);
            expect(isLevelTier(8, 'Praticante')).toBe(true);
            expect(isLevelTier(13, 'Veterano')).toBe(true);
            expect(isLevelTier(18, 'Mestre')).toBe(true);
        });

        it('deve funcionar com strings antigas (compatibilidade)', () => {
            expect(isLevelTier('Iniciante', 'Iniciante')).toBe(true);
            expect(isLevelTier('Praticante', 'Praticante')).toBe(true);
            expect(isLevelTier('Veterano', 'Veterano')).toBe(true);
            expect(isLevelTier('Mestre', 'Mestre')).toBe(true);
            expect(isLevelTier('Iniciante', 'Mestre')).toBe(false);
        });
    });

    describe('getPointsForNextLevel - Progresso', () => {
        it('deve retornar pontos corretos para próximo nível', () => {
            expect(getPointsForNextLevel(1)).toBe(100);  // Nível 1 → 2 precisa 100
            expect(getPointsForNextLevel(6)).toBe(700);  // Nível 6 → 7 precisa 700
            expect(getPointsForNextLevel(11)).toBe(1800); // Nível 11 → 12 precisa 1800
            expect(getPointsForNextLevel(16)).toBe(3600); // Nível 16 → 17 precisa 3600
        });

        it('deve retornar 0 quando já está no máximo', () => {
            expect(getPointsForNextLevel(20)).toBe(0);
        });
    });

    describe('getLevelProgress - Barra de progresso', () => {
        it('deve calcular progresso corretamente', () => {
            // Nível 1: 0-100 pontos
            expect(getLevelProgress(0, 1)).toBe(0);
            expect(getLevelProgress(50, 1)).toBe(50);
            expect(getLevelProgress(99, 1)).toBe(99);

            // Nível 6: 500-700 pontos (gap de 200)
            expect(getLevelProgress(500, 6)).toBe(0);
            expect(getLevelProgress(600, 6)).toBe(50);
            expect(getLevelProgress(650, 6)).toBe(75); // (650-500)/(700-500)=75%
        });

        it('deve retornar 100 quando no máximo', () => {
            expect(getLevelProgress(10000, 20)).toBe(100);
        });
    });

    describe('migrateOldLevel - Migração do sistema antigo', () => {
        it('deve retornar número se já for número', () => {
            expect(migrateOldLevel(5, 400)).toBe(5);
            expect(migrateOldLevel(10, 1300)).toBe(10);
        });

        it('deve calcular nível baseado em pontos para strings antigas', () => {
            expect(migrateOldLevel('Iniciante', 250)).toBe(3); // 250 pts = nível 3
            expect(migrateOldLevel('Praticante', 750)).toBe(7); // 750 pts = nível 7
            expect(migrateOldLevel('Veterano', 1250)).toBe(9); // 1250 pts = nível 9 (threshold for 10 is 1300)
            expect(migrateOldLevel('Mestre', 2250)).toBe(13); // 2250 pts = nível 13
        });
    });

    describe('getLevelEmoji - Emojis visuais', () => {
        it('deve retornar emoji correto por tier', () => {
            expect(getLevelEmoji(1)).toBe('🌱');   // Iniciante
            expect(getLevelEmoji(5)).toBe('🌱');
            expect(getLevelEmoji(6)).toBe('🌿');   // Praticante
            expect(getLevelEmoji(10)).toBe('🌿');
            expect(getLevelEmoji(11)).toBe('🌳');  // Veterano
            expect(getLevelEmoji(15)).toBe('🌳');
            expect(getLevelEmoji(16)).toBe('👑');  // Mestre
            expect(getLevelEmoji(20)).toBe('👑');
        });
    });

    describe('Casos de borda', () => {
        it('deve lidar com pontos negativos', () => {
            expect(calculateLevel(-10)).toBe(1);
        });

        it('deve lidar com pontos muito altos', () => {
            expect(calculateLevel(999999)).toBe(20);
        });

        it('deve ser consistente em fronteiras de nível', () => {
            // Fronteira 99 → 100 (Nível 1 → 2)
            expect(calculateLevel(99)).toBe(1);
            expect(calculateLevel(100)).toBe(2);

            // Fronteira 499 → 500 (Nível 5 → 6)
            expect(calculateLevel(499)).toBe(5);
            expect(calculateLevel(500)).toBe(6);
        });
    });
});
