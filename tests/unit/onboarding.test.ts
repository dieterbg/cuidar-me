import { describe, it, expect } from 'vitest';
import {
    getNextStep,
    getStepMessage,
    processStepResponse,
} from '@/ai/onboarding';

/**
 * Testes do Onboarding Conversacional via WhatsApp
 * Funções puras — sem dependências externas
 */
describe('Onboarding', () => {

    // =================================================================
    // ONB-01/02: getNextStep
    // =================================================================
    describe('getNextStep', () => {
        it('ONB-01: avança welcome → preferences → complete', () => {
            expect(getNextStep('welcome', 'freemium', {})).toBe('preferences');
            expect(getNextStep('preferences', 'freemium', {})).toBe('complete');
        });

        it('ONB-02: retorna complete para step inválido ou último', () => {
            expect(getNextStep('complete', 'freemium', {})).toBe('complete');
            // Cast inválido para testar edge case
            expect(getNextStep('invalid' as any, 'freemium', {})).toBe('complete');
        });

        it('funciona com todos os planos', () => {
            expect(getNextStep('welcome', 'premium', {})).toBe('preferences');
            expect(getNextStep('welcome', 'vip', {})).toBe('preferences');
        });
    });

    // =================================================================
    // ONB-03/04/05: getStepMessage
    // =================================================================
    describe('getStepMessage', () => {
        it('ONB-03: gera mensagem de welcome com nome e plano', () => {
            const msg = getStepMessage('welcome', 'freemium', {}, 'Maria');
            expect(msg).toContain('Maria');
            expect(msg).toContain('Freemium');
            expect(msg).toContain('🌱');
            expect(msg).toContain('Sim');
        });

        it('welcome mostra emoji correto por plano', () => {
            expect(getStepMessage('welcome', 'premium', {}, 'A')).toContain('💎');
            expect(getStepMessage('welcome', 'vip', {}, 'A')).toContain('⭐');
        });

        it('ONB-04: gera mensagem de preferences com opções A/B/C', () => {
            const msg = getStepMessage('preferences', 'freemium', {});
            expect(msg).toContain('A)');
            expect(msg).toContain('B)');
            expect(msg).toContain('C)');
            expect(msg).toContain('Manhã');
            expect(msg).toContain('Tarde');
            expect(msg).toContain('Noite');
        });

        it('ONB-05: gera mensagem complete com horário escolhido', () => {
            const msg = getStepMessage('complete', 'freemium', { preferredTime: 'morning' });
            expect(msg).toContain('8h');
            expect(msg).toContain('🌅');

            const msgAfternoon = getStepMessage('complete', 'premium', { preferredTime: 'afternoon' });
            expect(msgAfternoon).toContain('14h');

            const msgNight = getStepMessage('complete', 'vip', { preferredTime: 'night' });
            expect(msgNight).toContain('20h');
        });

        it('complete mostra texto diferente por plano', () => {
            expect(getStepMessage('complete', 'freemium', { preferredTime: 'morning' })).toContain('Upgrade');
            expect(getStepMessage('complete', 'premium', { preferredTime: 'morning' })).toContain('Premium');
            expect(getStepMessage('complete', 'vip', { preferredTime: 'morning' })).toContain('VIP');
        });
    });

    // =================================================================
    // ONB-06 a ONB-11: processStepResponse
    // =================================================================
    describe('processStepResponse', () => {
        it('ONB-06: welcome — aceita "sim", "vamos", "ok"', () => {
            expect(processStepResponse('welcome', 'Sim', {}).error).toBeUndefined();
            expect(processStepResponse('welcome', 'vamos lá', {}).error).toBeUndefined();
            expect(processStepResponse('welcome', 'OK', {}).error).toBeUndefined();
            expect(processStepResponse('welcome', 'começar', {}).error).toBeUndefined();
        });

        it('ONB-07: welcome — aceita "ajustar" e retorna link', () => {
            const result = processStepResponse('welcome', 'ajustar', {});
            expect(result.error).toContain('portal/profile');
        });

        it('ONB-08: welcome — rejeita resposta inválida', () => {
            const result = processStepResponse('welcome', 'xyz', {});
            expect(result.error).toContain('Sim');
        });

        it('ONB-09: preferences — mapeia A→morning, B→afternoon, C→night', () => {
            const a = processStepResponse('preferences', 'A', {});
            expect(a.data.preferredTime).toBe('morning');
            expect(a.error).toBeUndefined();

            const b = processStepResponse('preferences', 'B', {});
            expect(b.data.preferredTime).toBe('afternoon');

            const c = processStepResponse('preferences', 'C', {});
            expect(c.data.preferredTime).toBe('night');
        });

        it('ONB-10: preferences — aceita "manhã", "tarde", "noite"', () => {
            expect(processStepResponse('preferences', 'manhã', {}).data.preferredTime).toBe('morning');
            expect(processStepResponse('preferences', 'tarde', {}).data.preferredTime).toBe('afternoon');
            expect(processStepResponse('preferences', 'noite', {}).data.preferredTime).toBe('night');
        });

        it('ONB-11: preferences — rejeita resposta inválida', () => {
            const result = processStepResponse('preferences', 'xyz', {});
            expect(result.error).toContain('Manhã');
        });

        it('complete — aceita qualquer resposta', () => {
            const result = processStepResponse('complete', 'qualquer coisa', {});
            expect(result.error).toBeUndefined();
        });
    });
});
