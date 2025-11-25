
"use client";

import { useState, useTransition, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, BrainCircuit, ShieldAlert, ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generatePatientSummary, getChatAnalysis as getChatAnalysisAction } from '@/ai/actions';
import type { PatientSummary } from '@/lib/types';
import type { GetChatAnalysisOutput } from '@/lib/schemas';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface PatientAnalysisPanelProps {
  patientId: string;
}

const statusConfig: Record<PatientSummary['overallStatus'], { color: string; label: string }> = {
    on_track: { color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", label: "No Caminho Certo" },
    stagnated: { color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", label: "Estagnado" },
    needs_attention: { color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300", label: "Requer Atenção" },
    critical: { color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", label: "Crítico" },
};


function SummaryDisplay({ summary }: { summary: PatientSummary }) {
    
    if (!summary) return null;

    const currentStatusConfig = statusConfig[summary.overallStatus];

    return (
        <div className="space-y-6">
            <Alert>
                <BrainCircuit className="h-4 w-4" />
                <AlertTitle className={cn("font-bold", currentStatusConfig.color)}>
                    Status Geral: {currentStatusConfig.label}
                </AlertTitle>
                <AlertDescription>
                    {summary.overallSummary}
                </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <h4 className="font-semibold text-sm">Pontos Positivos</h4>
                    <ul className="list-disc list-inside text-muted-foreground text-sm space-y-1">
                        {summary.positivePoints.map((point, index) => <li key={`pos-${index}`}>{point}</li>)}
                    </ul>
                </div>
                 <div className="space-y-1">
                    <h4 className="font-semibold text-sm">Pontos de Atenção</h4>
                    <ul className="list-disc list-inside text-muted-foreground text-sm space-y-1">
                         {summary.attentionPoints.map((point, index) => <li key={`neg-${index}`}>{point}</li>)}
                    </ul>
                </div>
            </div>

            <div>
                <h4 className="font-semibold text-sm mb-2">Recomendações da IA</h4>
                <div className="p-3 bg-muted rounded-md border text-sm text-muted-foreground italic">
                    <p>{summary.recommendation}</p>
                </div>
            </div>
        </div>
    )
}


export function PatientAnalysisPanel({ patientId }: PatientAnalysisPanelProps) {
  const { toast } = useToast();
  const [summary, setSummary] = useState<PatientSummary | null>(null);
  const [isLoading, startLoading] = useTransition();

  const handleGenerateSummary = () => {
    startLoading(async () => {
      try {
        const result = await generatePatientSummary({ patientId });
        setSummary(result);
        toast({ title: "Análise Gerada!", description: "O resumo do paciente foi carregado." });
      } catch (error: any) {
        console.error("Error generating patient summary:", error);
        toast({
          variant: 'destructive',
          title: 'Erro ao Gerar Análise',
          description: `Ocorreu um erro: ${error.message}`
        });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise Completa do Paciente</CardTitle>
        <CardDescription>
          Clique no botão para gerar um resumo do progresso, engajamento e pontos de atenção do paciente usando IA.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleGenerateSummary} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
          {isLoading ? 'Analisando Histórico...' : 'Gerar Análise Completa'}
        </Button>

        <div className="pt-4 border-t">
          {isLoading ? (
             <div className="space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-16 w-full" />
                <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
             </div>
          ) : summary ? (
            <SummaryDisplay summary={summary} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma análise gerada ainda.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
