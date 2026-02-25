import { describe, it, expect } from 'vitest';
import { getStoreItem, STORE_CATALOG } from '@/lib/points-store';

/**
 * Testes da Loja de Pontos (catálogo)
 * Funções puras — sem dependências externas
 */
describe('Points Store', () => {

    // =================================================================
    // PST-01: getStoreItem retorna item existente
    // =================================================================
    it('PST-01: retorna item existente do catálogo', () => {
        const item = getStoreItem('streak_freeze');
        expect(item).toBeDefined();
        expect(item!.id).toBe('streak_freeze');
        expect(item!.name).toContain('Proteção');
        expect(item!.cost).toBe(200);
        expect(item!.category).toBe('streak');
        expect(item!.type).toBe('instant');
    });

    // =================================================================
    // PST-02: getStoreItem retorna undefined para ID inexistente
    // =================================================================
    it('PST-02: retorna undefined para ID inexistente', () => {
        expect(getStoreItem('fake_item')).toBeUndefined();
        expect(getStoreItem('')).toBeUndefined();
    });

    // =================================================================
    // PST-03: STORE_CATALOG contém items com campos obrigatórios
    // =================================================================
    it('PST-03: catálogo contém items com campos obrigatórios válidos', () => {
        expect(STORE_CATALOG.length).toBeGreaterThanOrEqual(3);

        for (const item of STORE_CATALOG) {
            expect(item.id).toBeTruthy();
            expect(item.name).toBeTruthy();
            expect(item.description).toBeTruthy();
            expect(item.cost).toBeGreaterThan(0);
            expect(item.icon).toBeTruthy();
            expect(['streak', 'content', 'consultation', 'discount', 'exclusive']).toContain(item.category);
            expect(['instant', 'redeemable']).toContain(item.type);
        }
    });

    it('todos os IDs são únicos', () => {
        const ids = STORE_CATALOG.map(item => item.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
});
