'use client';

import { useState, FormEvent, FC } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, User, Phone } from 'lucide-react';
import { SocialAuthButton } from './SocialAuthButton';
import { handleAuthError } from './auth-utils';

const CONSENT_VERSION = '2026-06-16';

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
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();
  const { signUp, signInWithGoogle } = useAuth();

  const isPatient = userType === 'patient';
  const patientConsentsAccepted = !isPatient || (privacyConsent && whatsappConsent && aiConsent);

  const warnMissingConsent = () => {
    toast({
      variant: 'destructive',
      title: 'Consentimentos obrigatorios',
      description: 'Aceite os termos de privacidade, WhatsApp e assistente de IA para continuar.',
    });
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();

    if (isPatient && !patientConsentsAccepted) {
      warnMissingConsent();
      return;
    }

    setIsPending(true);
    try {
      const roleToAssign = isPatient ? 'paciente' : 'pendente';
      await signUp(email.toLowerCase().trim(), password, {
        displayName: name.trim(),
        role: roleToAssign,
        phone: whatsapp.replace(/\D/g, ''),
        privacyConsentAccepted: privacyConsent,
        whatsappConsentAccepted: whatsappConsent,
        aiConsentAccepted: aiConsent,
        consentVersion: CONSENT_VERSION,
        consentSource: 'patient_signup_form',
      });
    } catch (error: any) {
      handleAuthError(error, toast);
    } finally {
      setIsPending(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isPatient && !patientConsentsAccepted) {
      warnMissingConsent();
      return;
    }

    await signInWithGoogle({
      privacyConsentAccepted: privacyConsent,
      whatsappConsentAccepted: whatsappConsent,
      aiConsentAccepted: aiConsent,
      consentVersion: CONSENT_VERSION,
      consentSource: 'patient_google_signup_form',
    });
  };

  return (
    <form onSubmit={handleRegister} className="space-y-4 pt-4">
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
            placeholder="Minimo de 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isPending}
            className="pl-9 h-12 bg-white/50"
          />
        </div>
      </div>

      {isPatient && (
        <div className="space-y-3 rounded-lg border border-border/60 bg-white/40 p-3 text-xs text-muted-foreground">
          <label className="flex items-start gap-2">
            <Checkbox
              checked={privacyConsent}
              onCheckedChange={(checked) => setPrivacyConsent(checked === true)}
              disabled={isPending}
              aria-label="Aceito a politica de privacidade"
            />
            <span>
              Li e aceito a politica de privacidade e o uso dos meus dados para acompanhamento digital em saude.
              {' '}
              <Link href="/privacidade" className="font-medium text-primary underline-offset-4 hover:underline">
                Ver politica
              </Link>
            </span>
          </label>
          <label className="flex items-start gap-2">
            <Checkbox
              checked={whatsappConsent}
              onCheckedChange={(checked) => setWhatsappConsent(checked === true)}
              disabled={isPending}
              aria-label="Aceito receber mensagens por WhatsApp"
            />
            <span>Aceito receber check-ins, lembretes e orientacoes pelo WhatsApp informado.</span>
          </label>
          <label className="flex items-start gap-2">
            <Checkbox
              checked={aiConsent}
              onCheckedChange={(checked) => setAiConsent(checked === true)}
              disabled={isPending}
              aria-label="Aceito apoio de assistente de IA"
            />
            <span>Entendo que a assistente de IA oferece apoio educativo e triagem, sem substituir consulta medica.</span>
          </label>
          <p className="text-center">
            Sem app para baixar. O Cuidar.me funciona direto no seu WhatsApp.
          </p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full h-12 text-base rounded-xl bg-brand hover:bg-brand-hover shadow-lg shadow-brand/20 transition-all hover:-translate-y-0.5"
        disabled={isPending || !patientConsentsAccepted}
      >
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Comecar Minha Jornada'}
      </Button>

      <OAuthDivider />

      <SocialAuthButton provider="google" onClick={handleGoogleSignIn} disabled={isPending || !patientConsentsAccepted} />
    </form>
  );
};
