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
        it('ONB-01: avança welcome → complete', () => {
            expect(getNextStep('welcome', 'freemium', {})).toBe('complete');
        });

        it('ONB-02: retorna complete para step inválido ou último', () => {
            expect(getNextStep('complete', 'freemium', {})).toBe('complete');
            // Cast inválido para testar edge case
            expect(getNextStep('invalid' as any, 'freemium', {})).toBe('complete');
        });

        it('funciona com todos os planos', () => {
            expect(getNextStep('welcome', 'premium', {})).toBe('complete');
            expect(getNextStep('welcome', 'vip', {})).toBe('complete');
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


        it('ONB-05: gera mensagem complete', () => {
            const msg = getStepMessage('complete', 'freemium', {});
            expect(msg).toContain('🌅');
            expect(msg).toContain('cadastro está completo');
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

        it('ONB-07: welcome — aceita "não" e retorna erro especial', () => {
            const result = processStepResponse('welcome', 'não', {});
            expect(result.error).toBe('CANCEL_ONBOARDING');
        });

        it('ONB-08: welcome — rejeita resposta inválida', () => {
            const result = processStepResponse('welcome', 'xyz', {});
            expect(result.error).toContain('Sim');
        });


        it('complete — aceita qualquer resposta', () => {
            const result = processStepResponse('complete', 'qualquer coisa', {});
            expect(result.error).toBeUndefined();
        });
    });
});
