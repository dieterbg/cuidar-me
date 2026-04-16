import { describe, it, expect, vi } from 'vitest';
import { handleAuthError } from '../../src/components/auth/auth-utils';

describe('Auth Utilities', () => {
    describe('handleAuthError', () => {
        it('should map invalid_credentials to Portuguese', () => {
            const toast = vi.fn();
            const error = { code: 'invalid_credentials' };
            
            handleAuthError(error, toast);
            
            expect(toast).toHaveBeenCalledWith(expect.objectContaining({
                title: 'Credenciais inválidas',
                description: expect.stringContaining('Email ou senha incorretos')
            }));
        });

        it('should map email_not_confirmed to Portuguese', () => {
            const toast = vi.fn();
            const error = { code: 'email_not_confirmed' };
            
            handleAuthError(error, toast);
            
            expect(toast).toHaveBeenCalledWith(expect.objectContaining({
                title: 'Email não confirmado'
            }));
        });

        it('should fallback to default error message if code is unknown', () => {
            const toast = vi.fn();
            const error = { message: 'Something went wrong' };
            
            handleAuthError(error, toast);
            
            expect(toast).toHaveBeenCalledWith(expect.objectContaining({
                title: 'Erro na autenticação',
                description: 'Something went wrong'
            }));
        });
    });
});
