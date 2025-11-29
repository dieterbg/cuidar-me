"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { getPatientProfileByUserId } from '@/ai/actions/patients';
import { User, ShieldCheck, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PatientEditForm } from '@/components/patient-edit-form';
import type { Patient } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

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

        if (isComplete) {
          // Initiate WhatsApp onboarding
          try {
            fetch('/api/onboarding/initiate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ patientId: updatedPatient.id }),
            }).catch(err => console.error('Failed to initiate onboarding:', err));

            toast({
              title: "✅ Perfil Completo!",
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
              Mantenha seus dados atualizados para um acompanhamento personalizado.
            </p>
          </div>

          <Badge variant={isProfileComplete ? "outline" : "destructive"} className="px-4 py-1.5 text-sm font-medium flex items-center gap-2">
            {isProfileComplete ? <ShieldCheck className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {isProfileComplete ? "Perfil Completo" : "Perfil Incompleto"}
          </Badge>
        </div>

        {/* MAIN CARD */}
        <Card className="bg-card/80 backdrop-blur-sm border-border/60 shadow-sm overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
          <CardHeader>
            <CardTitle>Dados Pessoais & Saúde</CardTitle>
            <CardDescription>
              Essas informações são confidenciais e usadas apenas pela equipe médica.
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
