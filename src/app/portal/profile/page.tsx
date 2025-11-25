
"use client";

import { useEffect, useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { getPatientDetails } from '@/ai/actions';
import { Loader2, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { PatientEditForm } from '@/components/patient-edit-form';
import type { Patient } from '@/lib/types';


export default function PortalProfilePage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);


  const fetchProfile = async () => {
    if (!user) return;
    setIsPageLoading(true);
    try {
      const patientDetails = await getPatientDetails(user.id);
      if (patientDetails.patient) {
        setPatient(patientDetails.patient);
        // Check if profile is incomplete
        if (!patientDetails.patient.height) {
          setIsProfileIncomplete(true);
        }
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


  const handleSaveSuccess = () => {
    // Reload the page to update the layout and access rights
    if (isProfileIncomplete) {
      window.location.reload();
    } else {
      // Just refetch data without full reload if profile was already complete
      fetchProfile();
    }
  }

  if (authLoading || isPageLoading) {
    return <ProfileSkeleton />
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <User className="h-8 w-8 text-primary" />
            Meu Perfil
          </h1>
          <p className="text-muted-foreground mt-2">
            Mantenha seus dados atualizados para que nossa equipe possa oferecer o melhor cuidado possível.
          </p>
        </div>

        {isProfileIncomplete && (
          <Alert className="mb-6 bg-blue-50 border-blue-200 text-blue-900">
            <AlertTitle className="font-bold">Complete seu Perfil</AlertTitle>
            <AlertDescription>
              Por favor, preencha as informações abaixo para liberar o acesso total à plataforma.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Suas Informações</CardTitle>
            <CardDescription>
              Essas informações são confidenciais e usadas apenas pela equipe de saúde para personalizar seu acompanhamento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {patient ? (
              <PatientEditForm patient={patient} onSave={handleSaveSuccess} context="patient" />
            ) : (
              <p>Carregando perfil...</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


function ProfileSkeleton() {
  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-full max-w-lg mt-2" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-5 w-full max-w-md mt-2" />
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-24 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-10 w-36" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
