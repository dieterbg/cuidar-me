'use client';

import { useState, FormEvent, FC } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, User, Phone } from 'lucide-react';
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

/** Máscara simples de telefone brasileiro (DDD + 9 dígitos) */
const applyPhoneMask = (value: string): string => {
  let v = value.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
  if (v.length > 9) v = `${v.slice(0, 9)}-${v.slice(9)}`;
  return v;
};

interface RegisterFormProps {
  userType: 'staff' | 'patient';
}

export const RegisterForm: FC<RegisterFormProps> = ({ userType }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();
  const { signUp, signInWithGoogle } = useAuth();

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    try {
      const roleToAssign = userType === 'patient' ? 'paciente' : 'pendente';
      await signUp(email.toLowerCase().trim(), password, {
        displayName: name.trim(),
        role: roleToAssign,
        phone: whatsapp.replace(/\D/g, ''), // Armazena só dígitos
      });
    } catch (error: any) {
      handleAuthError(error, toast);
    } finally {
      setIsPending(false);
    }
  };

  const isPatient = userType === 'patient';

  return (
    <form onSubmit={handleRegister} className="space-y-4 pt-4">
      {/* Campos extras apenas para pacientes */}
      {isPatient && (
        <>
          <div className="space-y-2">
            <Label htmlFor="register-name">Nome Completo</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="register-name"
                type="text"
                placeholder="Seu nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isPending}
                className="pl-9 h-12 bg-white/50"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-whatsapp">WhatsApp</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="register-whatsapp"
                type="tel"
                placeholder="(11) 99999-9999"
                value={whatsapp}
                onChange={(e) => setWhatsapp(applyPhoneMask(e.target.value))}
                required
                disabled={isPending}
                className="pl-9 h-12 bg-white/50"
              />
            </div>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="register-email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="register-email"
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
        <Label htmlFor="register-password">Senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="register-password"
            type="password"
            placeholder="Mínimo de 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isPending}
            className="pl-9 h-12 bg-white/50"
          />
        </div>
      </div>

      {isPatient && (
        <p className="text-xs text-muted-foreground text-center">
          Sem app para baixar. O Cuidar.me funciona direto no seu WhatsApp.
        </p>
      )}

      <Button
        type="submit"
        className="w-full h-12 text-base rounded-xl bg-brand hover:bg-brand-hover shadow-lg shadow-brand/20 transition-all hover:-translate-y-0.5"
        disabled={isPending}
      >
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Começar Minha Jornada'}
      </Button>

      <OAuthDivider />

      <SocialAuthButton provider="google" onClick={signInWithGoogle} disabled={isPending} />
    </form>
  );
};
