// src/hooks/use-auth.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase-client';
import type { User, Session } from '@supabase/supabase-js';
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
        console.error('Error fetching profile:', error);
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
      console.error('Error in fetchProfile:', error);
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

    // Força um recarregamento para garantir que o estado da sessão seja atualizado corretamente
    // e o redirecionamento ocorra sem falhas.
    window.location.reload();
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

    // Redirecionar usando window.location para garantir que funciona
    setTimeout(() => {
      window.location.href = '/portal/welcome';
    }, 800);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Sair',
        description: 'Não foi possível encerrar sua sessão.'
      });
    } else {
      router.push('/paciente');
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
