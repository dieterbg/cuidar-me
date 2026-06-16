// src/hooks/use-auth.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase-client';
import type { User, Session } from '@supabase/supabase-js';
import { loggers } from '@/lib/logger';
import { useRouter } from 'next/navigation';
import { useToast } from './use-toast';

export type UserRole = "admin" | "equipe_saude" | "assistente" | "paciente" | "pendente";

export interface UserProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  photo_url: string | null;
  role: UserRole;
  phone?: string;
  privacy_consent_at?: string | null;
  whatsapp_consent_at?: string | null;
  ai_consent_at?: string | null;
  consent_version?: string | null;
  consent_source?: string | null;
}

export interface SignUpMetadata {
  displayName?: string;
  role: UserRole;
  phone?: string;
  privacyConsentAccepted?: boolean;
  whatsappConsentAccepted?: boolean;
  aiConsentAccepted?: boolean;
  consentVersion?: string;
  consentSource?: string;
}

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata: SignUpMetadata) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: (metadata?: Partial<SignUpMetadata>) => Promise<void>;
  triggerPatientsUpdate: () => void;
  patientsUpdateCount: number;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [patientsUpdateCount, setPatientsUpdateCount] = useState(0);
  const { toast } = useToast();
  const router = useRouter();

  const triggerPatientsUpdate = () => {
    setPatientsUpdateCount(count => count + 1);
  };

  const persistPendingConsent = async (userId: string) => {
    if (typeof window === 'undefined') return;

    const raw = localStorage.getItem('pendingPatientConsent');
    if (!raw) return;

    try {
      const consent = JSON.parse(raw) as {
        privacy_consent_at?: string | null;
        whatsapp_consent_at?: string | null;
        ai_consent_at?: string | null;
        consent_version?: string | null;
        consent_source?: string | null;
      };

      const { error } = await supabase
        .from('profiles')
        .update(consent)
        .eq('id', userId);

      if (error) {
        loggers.auth.warn('Pending consent update failed', { error: error.message });
        return;
      }

      localStorage.removeItem('pendingPatientConsent');
    } catch {
      loggers.auth.warn('Pending consent parse failed');
      localStorage.removeItem('pendingPatientConsent');
    }
  };

  useEffect(() => {
    // Buscar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        persistPendingConsent(session.user.id).finally(() => fetchProfile(session.user.id));
      } else {
        setLoading(false);
      }
    });

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        persistPendingConsent(session.user.id).finally(() => fetchProfile(session.user.id));
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        loggers.auth.error('Error fetching profile', error, { userId });
        setProfile(null);
      } else if (data) {
        setProfile({
          id: data.id,
          email: data.email,
          display_name: data.display_name,
          photo_url: data.photo_url,
          role: data.role as UserRole,
          phone: data.phone,
          privacy_consent_at: data.privacy_consent_at,
          whatsapp_consent_at: data.whatsapp_consent_at,
          ai_consent_at: data.ai_consent_at,
          consent_version: data.consent_version,
          consent_source: data.consent_source,
        });
      }
    } catch (error) {
      loggers.auth.error('Unexpected error in fetchProfile', error, { userId });
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    toast({
      title: "Login bem-sucedido!",
      description: "Entrando..."
    });

    // O useEffect no AuthProvider detectará a mudança da sessão 
    // e buscará o perfil automaticamente, disparando os redirecionamentos.
  };

  const signUp = async (
    email: string,
    password: string,
    metadata: SignUpMetadata
  ) => {
    const consentAt = (
      metadata.privacyConsentAccepted &&
      metadata.whatsappConsentAccepted &&
      metadata.aiConsentAccepted
    ) ? new Date().toISOString() : null;

    // 1. Criar usuário no Supabase Auth (O Trigger do banco criará o perfil automaticamente)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          displayName: metadata.displayName || '',
          role: metadata.role,
          phone: metadata.phone || '',
          privacy_consent_at: metadata.privacyConsentAccepted ? consentAt : null,
          whatsapp_consent_at: metadata.whatsappConsentAccepted ? consentAt : null,
          ai_consent_at: metadata.aiConsentAccepted ? consentAt : null,
          consent_version: metadata.consentVersion || null,
          consent_source: metadata.consentSource || null,
        }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create user');

    if (consentAt) {
      const { error: consentError } = await supabase
        .from('profiles')
        .update({
          privacy_consent_at: metadata.privacyConsentAccepted ? consentAt : null,
          whatsapp_consent_at: metadata.whatsappConsentAccepted ? consentAt : null,
          ai_consent_at: metadata.aiConsentAccepted ? consentAt : null,
          consent_version: metadata.consentVersion || null,
          consent_source: metadata.consentSource || null,
        })
        .eq('id', authData.user.id);

      if (consentError) {
        loggers.auth.warn('Consent profile update failed', {
          error: consentError.message,
        });
      }
    }

    // 2. Consume Invite if present
    const pendingInvite = typeof window !== 'undefined' ? sessionStorage.getItem('pendingInvite') : null;
    if (pendingInvite && authData.user) {
      loggers.auth.info('Found pending invite, consuming...');
      try {
        const response = await fetch('/api/onboarding/consume-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // userId NÃO é enviado — o servidor deriva da sessão autenticada (anti-IDOR)
          body: JSON.stringify({ token: pendingInvite })
        });
        
        if (response.ok) {
          loggers.auth.info('Invite consumed successfully');
          sessionStorage.removeItem('pendingInvite');
        } else {
          loggers.auth.error('Failed to consume invite', new Error('Response not OK'));
        }
      } catch (err) {
        loggers.auth.error('Error consuming invite', err);
      }
    }

    // Perfil é criado automaticamente pelo Trigger no banco de dados.
    // O registro de paciente será criado no primeiro acesso ao portal.

    // Verificar se a sessão foi criada (email confirmation desabilitada)
    if (!authData.session) {
      toast({
        title: "Confirme seu email",
        description: "Enviamos um email de confirmação. Por favor, verifique sua caixa de entrada.",
      });
      return;
    }

    toast({
      title: "Cadastro realizado!",
      description: "Bem-vindo ao Cuidar.me!",
    });

    // Redirecionar para o dashboard que é o nosso roteador inteligente de roles
    setTimeout(() => {
      router.replace('/dashboard');
    }, 800);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      loggers.auth.error('Sign out error', error, { userId: user?.id });
      toast({
        variant: 'destructive',
        title: 'Erro ao Sair',
        description: 'Não foi possível encerrar sua sessão.'
      });
    } else {
      router.push('/paciente');
    }
  };

  const signInWithGoogle = async (metadata?: Partial<SignUpMetadata>) => {
    if (
      typeof window !== 'undefined' &&
      metadata?.privacyConsentAccepted &&
      metadata?.whatsappConsentAccepted &&
      metadata?.aiConsentAccepted
    ) {
      const consentAt = new Date().toISOString();
      localStorage.setItem('pendingPatientConsent', JSON.stringify({
        privacy_consent_at: consentAt,
        whatsapp_consent_at: consentAt,
        ai_consent_at: consentAt,
        consent_version: metadata.consentVersion || null,
        consent_source: metadata.consentSource || 'patient_google_signup_form',
      }));
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });

    if (error) {
      loggers.auth.error('Google sign in error', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao entrar com Google',
        description: error.message
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
        triggerPatientsUpdate,
        patientsUpdateCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
