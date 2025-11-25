
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, Trophy, User, Users } from "lucide-react";
import { CuidarMeLogo } from "@/components/icons";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { useEffect, useState } from "react";
import { getPatientDetails } from "@/ai/actions";
import type { Patient } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowRight } from "lucide-react";

export default function PatientWelcomePage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatient = async () => {
      if (user) {
        setLoading(true);
        try {
          const details = await getPatientDetails(user.id);
          if (details.patient) {
            setPatient(details.patient);
          }
        } catch (error) {
          console.error("Failed to fetch patient details:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    if (!authLoading) {
      fetchPatient();
    }
  }, [user, authLoading]);

  const isProfileIncomplete = patient && !patient.height;
  const hasActiveProtocol = patient && patient.protocol && patient.protocol.isActive;

  if (loading || authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p>Carregando...</p>
      </div>
    );
  }


  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-background">
      <div className="max-w-4xl mx-auto">

        <div className="text-center mb-12">

          <h2 className="text-4xl font-bold tracking-tight text-foreground">
            Bem-vindo(a), {profile?.display_name || 'Paciente'}!
          </h2>
          <p className="text-xl text-muted-foreground mt-2 max-w-2xl mx-auto">
            Sua central de acompanhamento pessoal.
          </p>
        </div>

        {isProfileIncomplete && !loading && (
          <Alert variant="destructive" className="mb-8">
            <User className="h-4 w-4" />
            <AlertTitle className="font-bold">Ação Necessária!</AlertTitle>
            <AlertDescription>
              Seu perfil está incompleto. Por favor, preencha suas informações para que possamos personalizar seu acompanhamento e liberar todas as funcionalidades.
              <Link href="/portal/profile" className="block mt-2">
                <Button>Completar Perfil Agora <ArrowRight className="h-4 w-4 ml-2" /></Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="text-primary" />
                Sua Jornada
              </CardTitle>
              <CardDescription>Acompanhe seu progresso no protocolo e gamificação.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-20 w-full" /> : (
                hasActiveProtocol && patient ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">{patient.protocol?.protocolId.includes('fundamentos') ? 'Protocolo Fundamentos' : 'Protocolo Evolução'}</p>
                    <p className="text-sm text-muted-foreground">Você está no <span className="font-bold text-primary">dia {patient.protocol?.currentDay}</span> do seu protocolo.</p>
                    <p className="text-sm text-muted-foreground">Pontos: <span className="font-bold text-primary">{patient.gamification.totalPoints}</span> | Nível: <span className="font-bold text-primary">{patient.gamification.level}</span></p>
                    <Link href="/portal/journey" className="pt-2 block">
                      <Button variant="outline" className="w-full">Ver Minha Jornada</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">Nenhum protocolo ativo no momento. Fale com nossa equipe para começar!</p>
                  </div>
                )
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="text-green-500" />
                Próximos Passos
              </CardTitle>
              <CardDescription>Suas próximas ações na plataforma.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                <div>
                  <span className="font-semibold">Complete seu Perfil</span>
                  <p className="text-sm text-muted-foreground">Clique em "Meu Perfil" para adicionar sua altura, peso inicial e outras informações importantes.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                <div>
                  <span className="font-semibold">Explore a Comunidade</span>
                  <p className="text-sm text-muted-foreground">Veja o que outros pacientes estão compartilhando e encontre apoio.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
