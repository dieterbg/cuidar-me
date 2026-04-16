/**
 * Shared authentication error handler.
 *
 * Maps Supabase error codes to user-friendly Portuguese messages.
 * Using `error.code` is more robust than string matching on `error.message`,
 * since provider messages can change across library versions.
 */
import { loggers } from '@/lib/logger';

const ERROR_MAP: Record<string, { title: string; description: string }> = {
  invalid_credentials: {
    title: 'Credenciais inválidas',
    description: 'Email ou senha incorretos. Verifique e tente novamente.',
  },
  email_not_confirmed: {
    title: 'Email não confirmado',
    description: 'Por favor, verifique seu email para confirmar sua conta antes de fazer login.',
  },
  user_already_exists: {
    title: 'Email já cadastrado',
    description: 'Este email já possui uma conta. Tente fazer login.',
  },
  phone_exists: {
    title: 'Telefone já cadastrado',
    description: 'Este número de WhatsApp já está associado a outra conta.',
  },
};

interface AuthError {
  code?: string;
  message?: string;
}

export const handleAuthError = (error: AuthError, toast: (opts: any) => void): void => {
  const mapped = error.code ? ERROR_MAP[error.code] : null;

  const title = mapped?.title ?? 'Erro na autenticação';
  const description =
    mapped?.description ?? error.message ?? 'Ocorreu um erro inesperado. Tente novamente.';

  loggers.auth.error('Authentication Error', error);
  toast({ variant: 'destructive', title, description });
};
