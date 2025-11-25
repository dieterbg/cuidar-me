
"use client";

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/');
      return;
    }

    // A lógica complexa de redirecionamento foi movida para a página /dashboard
    // que atua como um roteador central. Este layout agora apenas garante
    // que um usuário esteja autenticado para acessar a área do dashboard.

  }, [user, profile, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p>Carregando...</p>
      </div>
    );
  }

  // Renderiza o layout para todos os usuários autenticados na área do dashboard.
  return <AppLayout>{children}</AppLayout>;
}
