import { describe, it, expect } from 'vitest';
import { normalizeBrazilianNumber, maskPhone } from '../../src/lib/utils';

describe('Phone Utilities', () => {
    describe('normalizeBrazilianNumber', () => {
        it('should normalize a number with whatsapp: prefix', () => {
            const input = 'whatsapp:+5511999998888';
            expect(normalizeBrazilianNumber(input)).toBe('whatsapp:+5511999998888');
        });

        it('should add whatsapp: prefix and country code to a raw number', () => {
            const input = '11999998888';
            expect(normalizeBrazilianNumber(input)).toBe('whatsapp:+5511999998888');
        });

        it('should handle numbers with spaces and dashes', () => {
            const input = '(11) 99999-8888';
            expect(normalizeBrazilianNumber(input)).toBe('whatsapp:+5511999998888');
        });

        it('should handle 10-digit numbers (landline/old mobile)', () => {
            const input = '1188887777';
            expect(normalizeBrazilianNumber(input)).toBe('whatsapp:+551188887777');
        });
    });

    describe('maskPhone', () => {
        it('should mask the middle of a phone number', () => {
            const input = '+5511999998888';
            expect(maskPhone(input)).toBe('+5511 ****-8888');
        });

        it('should handle raw digits', () => {
            const input = '5511999998888';
            expect(maskPhone(input)).toBe('+5511 ****-8888');
        });

        it('should return empty string for empty input', () => {
            expect(maskPhone('')).toBe('');
        });

        it('should not mask very short numbers', () => {
            const input = '123';
            expect(maskPhone(input)).toBe('123');
        });
    });
});
