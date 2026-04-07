"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { getPatientProfileByUserId } from '@/ai/actions/patients';
import { User, ShieldCheck, AlertCircle, CheckCircle2, Circle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PatientEditForm } from '@/components/patient-edit-form';
import type { Patient } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { awardGamificationPoints } from '@/ai/actions/gamification';

export default function PortalProfilePage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [patient, setPatient] = useState<Patient | null>(null);

  const fetchProfile = async () => {
    if (!user) return;
    setIsPageLoading(true);
    try {
      const patientData = await getPatientProfileByUserId(user.id);
      if (patientData) {
        setPatient(patientData);
      } else {
        throw new Error("Perfil do paciente não encontrado.");
      }
    } catch (error: any) {
      console.error("Fetch Profile Error:", error);
      toast({ variant: 'destructive', title: 'Erro ao carregar perfil', description: error.message || 'Não foi possível buscar seus dados.' });
    } finally {
      setIsPageLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && user) {
      fetchProfile();
    }
  }, [user, authLoading]);

  const handleSaveSuccess = async () => {
    await fetchProfile();

    // Check if profile is now complete and initiate WhatsApp onboarding
    if (patient) {
      // Re-fetch patient data to ensure we have latest values
      const updatedPatient = await getPatientProfileByUserId(user!.id);

      if (updatedPatient) {
        const isComplete = !!(
          updatedPatient.height &&
          updatedPatient.initialWeight &&
          updatedPatient.birthDate &&
          updatedPatient.gender &&
          (updatedPatient as any).goal
        );

        const wasAlreadyActive = patient.status === 'active';

        if (isComplete && !wasAlreadyActive) {
          // Award profile completion gamification points (+50 pts — disciplina)
          try {
            await awardGamificationPoints(user!.id, 'disciplina', 50);
          } catch (e) {
            console.error('Failed to award profile completion points:', e);
          }

          // Initiate WhatsApp onboarding
          try {
            fetch('/api/onboarding/initiate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ patientId: updatedPatient.id }),
            }).catch(err => console.error('Failed to initiate onboarding:', err));

            toast({
              title: "🏅 Perfil Completo! +50 pontos!",
              description: "Enviamos uma mensagem no WhatsApp para começar sua jornada! 📱",
              className: "bg-green-50 border-green-200 text-green-800"
            });
          } catch (error) {
            console.error('Error initiating onboarding:', error);
          }
        } else {
          toast({
            title: "✅ Perfil Atualizado!",
            description: "Redirecionando para a página inicial...",
            className: "bg-green-50 border-green-200 text-green-800"
          });
        }
      }
    }

    // Redirect to welcome page after successful save
    setTimeout(() => {
      window.location.href = '/portal/welcome';
    }, 1500);
  }

  if (authLoading || isPageLoading) {
    return <ProfileSkeleton />
  }

  const isProfileComplete = !!patient?.height;

  // Campos obrigatórios para ativação — mesma lista verificada em handleSaveSuccess
  const requiredFields = [
    { label: 'Altura', filled: !!patient?.height },
    { label: 'Peso inicial', filled: !!patient?.initialWeight },
    { label: 'Nascimento', filled: !!patient?.birthDate },
    { label: 'Gênero', filled: !!patient?.gender },
    { label: 'Objetivo', filled: !!(patient as any)?.goal },
  ];
  const filledCount = requiredFields.filter(f => f.filled).length;
  const progressPct = Math.round((filledCount / requiredFields.length) * 100);

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-background/50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <User className="h-8 w-8 text-primary" />
              Meu Perfil
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Seus dados são confidenciais e usados apenas para personalizar seu acompanhamento de saúde.
            </p>
          </div>

          <Badge variant={isProfileComplete ? "outline" : "destructive"} className="px-4 py-1.5 text-sm font-medium flex items-center gap-2">
            {isProfileComplete ? <ShieldCheck className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {isProfileComplete ? "Perfil Completo" : "Perfil Incompleto"}
          </Badge>
        </div>

        {/* PROGRESS BAR — só mostra se perfil ainda não está completo */}
        {!isProfileComplete && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">
                  Progresso do perfil — <span className="text-primary">{filledCount} de {requiredFields.length} campos essenciais</span>
                </p>
                <span className="text-xs font-bold text-primary">{progressPct}%</span>
              </div>
              <Progress value={progressPct} className="h-2" />
              <div className="flex flex-wrap gap-2 pt-1">
                {requiredFields.map(field => (
                  <span key={field.label} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${field.filled ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                    {field.filled
                      ? <CheckCircle2 className="w-3 h-3" />
                      : <Circle className="w-3 h-3" />
                    }
                    {field.label}
                  </span>
                ))}
              </div>
              {filledCount === requiredFields.length && (
                <p className="text-xs text-green-700 font-medium">
                  🏅 Ao salvar, você ganha +50 pontos de Disciplina!
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* MAIN CARD */}
        <Card className="bg-card/80 backdrop-blur-sm border-border/60 shadow-sm overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
          <CardHeader>
            <CardTitle>Dados Pessoais & Saúde</CardTitle>
            <CardDescription>
              Preencha com calma — quanto mais completo, melhor seu protocolo será ajustado pela equipe médica.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {patient ? (
              <PatientEditForm patient={patient} onSave={handleSaveSuccess} context="patient" />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Não foi possível carregar o formulário.
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex-1 p-8 bg-background/50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-6 w-64" />
          </div>
          <Skeleton className="h-8 w-32 rounded-full" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-full max-w-md mt-2" />
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid md:grid-cols-2 gap-6">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-12 w-40" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
