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
}

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata: { displayName: string; role: UserRole; phone?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
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

  useEffect(() => {
    // Buscar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
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
        fetchProfile(session.user.id);
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
    metadata: { displayName?: string; role: UserRole; phone?: string }
  ) => {
    // 1. Criar usuário no Supabase Auth (O Trigger do banco criará o perfil automaticamente)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          displayName: metadata.displayName || '',
          role: metadata.role,
          phone: metadata.phone || '',
        }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create user');

    // 2. Consume Invite if present
    const pendingInvite = typeof window !== 'undefined' ? sessionStorage.getItem('pendingInvite') : null;
    if (pendingInvite && authData.user) {
      loggers.auth.info('Found pending invite, consuming...', { inviteToken: pendingInvite, userId: authData.user.id });
      try {
        const response = await fetch('/api/onboarding/consume-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: pendingInvite, userId: authData.user.id })
        });
        
        if (response.ok) {
          loggers.auth.info('Invite consumed successfully', { userId: authData.user.id });
          sessionStorage.removeItem('pendingInvite');
        } else {
          loggers.auth.error('Failed to consume invite', new Error('Response not OK'), { userId: authData.user.id });
        }
      } catch (err) {
        loggers.auth.error('Error consuming invite', err, { userId: authData.user.id });
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

  const signInWithGoogle = async () => {
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
