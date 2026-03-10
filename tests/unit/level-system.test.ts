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
        it('deve retornar nível 1 (Bronze I) para 0-299 pontos', () => {
            expect(calculateLevel(0)).toBe(1);
            expect(calculateLevel(150)).toBe(1);
            expect(calculateLevel(299)).toBe(1);
        });

        it('deve retornar níveis Bronze (1-5) corretamente', () => {
            expect(calculateLevel(300)).toBe(2);   // Bronze II
            expect(calculateLevel(700)).toBe(3);   // Bronze III
            expect(calculateLevel(1500)).toBe(4);  // Bronze IV (Official Bronze)
            expect(calculateLevel(2500)).toBe(5);  // Bronze V
        });

        it('deve retornar níveis Prata (6-10) corretamente', () => {
            expect(calculateLevel(4000)).toBe(6);   // Prata I (Official Prata)
            expect(calculateLevel(6000)).toBe(8);   // Prata III (Threshold 5600)
            expect(calculateLevel(7200)).toBe(10);  // Prata V
        });

        it('deve retornar níveis Ouro (11-15) corretamente', () => {
            expect(calculateLevel(8000)).toBe(11);  // Ouro I (Official Ouro)
            expect(calculateLevel(10000)).toBe(13); // Ouro III
            expect(calculateLevel(13000)).toBe(15); // Ouro V
        });

        it('deve retornar níveis Diamante (16-20) corretamente', () => {
            expect(calculateLevel(15000)).toBe(16); // Diamante I (Official Diamante)
            expect(calculateLevel(19500)).toBe(18); // Diamante III
            expect(calculateLevel(25000)).toBe(20); // Diamante V
            expect(calculateLevel(50000)).toBe(20); // Máximo é 20
        });
    });

    describe('getLevelName - Formatação com romanos', () => {
        it('deve formatar Bronze corretamente', () => {
            expect(getLevelName(1)).toBe('Bronze I');
            expect(getLevelName(5)).toBe('Bronze V');
        });

        it('deve formatar Prata corretamente', () => {
            expect(getLevelName(6)).toBe('Prata I');
            expect(getLevelName(10)).toBe('Prata V');
        });

        it('deve formatar Ouro corretamente', () => {
            expect(getLevelName(11)).toBe('Ouro I');
            expect(getLevelName(15)).toBe('Ouro V');
        });

        it('deve formatar Diamante corretamente', () => {
            expect(getLevelName(16)).toBe('Diamante I');
            expect(getLevelName(20)).toBe('Diamante V');
        });
    });

    describe('getLevelTier - Categoria do nível', () => {
        it('deve retornar tier correto', () => {
            expect(getLevelTier(1)).toBe('Bronze');
            expect(getLevelTier(5)).toBe('Bronze');
            expect(getLevelTier(6)).toBe('Prata');
            expect(getLevelTier(10)).toBe('Prata');
            expect(getLevelTier(11)).toBe('Ouro');
            expect(getLevelTier(15)).toBe('Ouro');
            expect(getLevelTier(16)).toBe('Diamante');
            expect(getLevelTier(20)).toBe('Diamante');
        });
    });

    describe('isLevelTier - Compatibilidade com código antigo', () => {
        it('deve funcionar com níveis numéricos', () => {
            expect(isLevelTier(3, 'Bronze')).toBe(true);
            expect(isLevelTier(3, 'Prata')).toBe(false);
            expect(isLevelTier(8, 'Prata')).toBe(true);
            expect(isLevelTier(13, 'Ouro')).toBe(true);
            expect(isLevelTier(18, 'Diamante')).toBe(true);
        });

        it('deve funcionar com strings antigas (mapeamento interno)', () => {
            expect(isLevelTier('Iniciante', 'Bronze')).toBe(true);
            expect(isLevelTier('Praticante', 'Prata')).toBe(true);
            expect(isLevelTier('Veterano', 'Ouro')).toBe(true);
            expect(isLevelTier('Mestre', 'Diamante')).toBe(true);
        });
    });

    describe('getPointsForNextLevel - Progresso', () => {
        it('deve retornar pontos corretos para próximo nível', () => {
            expect(getPointsForNextLevel(1)).toBe(300);  // Nível 1 → 2 precisa 300
            expect(getPointsForNextLevel(5)).toBe(4000); // Nível 5 → 6 precisa 4000
        });

        it('deve retornar 0 quando já está no máximo', () => {
            expect(getPointsForNextLevel(20)).toBe(0);
        });
    });

    describe('getLevelProgress - Barra de progresso', () => {
        it('deve calcular progresso corretamente', () => {
            // Nível 1: 0-300 pontos
            expect(getLevelProgress(0, 1)).toBe(0);
            expect(getLevelProgress(150, 1)).toBe(50);
            expect(getLevelProgress(297, 1)).toBe(99); // 297/300 * 100 = 99%

            // Nível 6: 4000-4800 pontos (gap de 800)
            expect(getLevelProgress(4000, 6)).toBe(0);
            expect(getLevelProgress(4400, 6)).toBe(50);
        });

        it('deve retornar 100 quando no máximo', () => {
            expect(getLevelProgress(30000, 20)).toBe(100);
        });
    });

    describe('migrateOldLevel - Migração do sistema antigo', () => {
        it('deve retornar número se já for número', () => {
            expect(migrateOldLevel(5, 2500)).toBe(5);
        });

        it('deve calcular nível baseado em pontos para strings antigas', () => {
            expect(migrateOldLevel('Iniciante', 700)).toBe(3); // 700 pts = nível 3
        });
    });

    describe('getLevelEmoji - Emojis visuais', () => {
        it('deve retornar emoji correto por tier', () => {
            expect(getLevelEmoji(1)).toBe('🥉');   // Bronze
            expect(getLevelEmoji(6)).toBe('🥈');   // Prata
            expect(getLevelEmoji(11)).toBe('🥇');  // Ouro
            expect(getLevelEmoji(16)).toBe('💎');  // Diamante
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
