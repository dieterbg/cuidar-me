'use client';

import { useState, FormEvent, FC } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock } from 'lucide-react';
import { SocialAuthButton } from './SocialAuthButton';
import { handleAuthError } from './auth-utils';

const OAuthDivider = () => (
  <div className="relative my-4">
    <div className="absolute inset-0 flex items-center">
      <span className="w-full border-t" />
    </div>
    <div className="relative flex justify-center text-xs uppercase">
      <span className="bg-white px-2 text-muted-foreground">Ou continue com</span>
    </div>
  </div>
);

export const LoginForm: FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();
  const { signIn, signInWithGoogle } = useAuth();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    try {
      await signIn(email, password);
    } catch (error) {
      handleAuthError(error as { code?: string; message?: string }, toast);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="login-email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isPending}
            className="pl-9 h-12 bg-white/50"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">Senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isPending}
            className="pl-9 h-12 bg-white/50"
          />
        </div>
      </div>
      <Button
        type="submit"
        className="w-full h-12 text-base rounded-xl bg-brand hover:bg-brand-hover shadow-lg shadow-brand/20 transition-all hover:-translate-y-0.5"
        disabled={isPending}
      >
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Entrar na Plataforma'}
      </Button>

      <OAuthDivider />

      <SocialAuthButton provider="google" onClick={signInWithGoogle} disabled={isPending} />
    </form>
  );
};
