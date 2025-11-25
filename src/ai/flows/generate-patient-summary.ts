
'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating a comprehensive patient summary.
 * 
 * - generatePatientSummary - A function that takes a patient ID and returns a detailed analysis.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getPatientDetails } from '../firestore-admin';
import type { Patient, Message, HealthMetric } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { GeneratePatientSummaryInputSchema, PatientSummarySchema, type GeneratePatientSummaryInput, type PatientSummary } from '@/lib/types';
import { googleAI } from '@genkit-ai/google-genai';


// Re-export the types so they can be imported from this file
export type { GeneratePatientSummaryInput, PatientSummary };

export async function generatePatientSummary(input: GeneratePatientSummaryInput): Promise<PatientSummary> {
  return generatePatientSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePatientSummaryPrompt',
  input: { schema: z.object({
    patient: z.custom<Patient>(),
    conversation: z.custom<Message[]>(),
    metrics: z.custom<HealthMetric[]>(),
  })},
  output: { schema: PatientSummarySchema },
  prompt: `Você é um assistente de endocrinologia especialista em análise de dados de pacientes em programas de emagrecimento. Sua tarefa é analisar TODAS as informações fornecidas sobre um paciente e gerar um resumo conciso e acionável para a equipe de saúde.

  **Dados do Paciente:**
  - Nome: {{patient.name}}
  - Plano: {{patient.subscription.plan}}
  - Condições de Saúde: {{patient.healthConditions}}
  - Alergias: {{patient.allergies}}
  - Protocolo Ativo: {{#if patient.protocol}}{{patient.protocol.protocolId}} (Dia {{patient.protocol.currentDay}}){{else}}Nenhum{{/if}}

  **Métricas de Saúde (do mais antigo para o mais recente):**
  {{#each metrics}}
  - Data: {{date}}, Peso: {{#if weight}}{{weight}}kg{{else}}N/A{{/if}}
  {{/each}}

  **Últimas 10 Mensagens (do mais antigo para o mais recente):**
  {{#each conversation}}
  - {{sender}}: "{{text}}" (em {{timestamp}})
  {{/each}}

  **Sua Tarefa:**
  Com base em TODOS os dados acima, gere uma análise completa.
  1.  **overallStatus**: Classifique o status do paciente.
      - 'on_track': Progresso consistente, boa comunicação.
      - 'stagnated': Sem progresso recente nas métricas, comunicação baixa.
      - 'needs_attention': Tendência de piora, mensagens preocupantes, falta de dados importantes.
      - 'critical': Risco claro à saúde, mensagens de alerta, piora acentuada.
  2.  **overallSummary**: Um resumo geral da situação.
  3.  **positivePoints**: Destaque o que está indo bem.
  4.  **attentionPoints**: Aponte os problemas ou riscos.
  5.  **recommendation**: Qual a PRÓXIMA ação que a equipe deve tomar? (Ex: "Enviar mensagem de incentivo", "Perguntar sobre a dieta do fim de semana", "Agendar uma consulta de reavaliação").

  Seja objetivo, clínico e direto ao ponto. Forneça insights que ajudem a equipe a tomar a melhor decisão para o cuidado do paciente.
  `,
});

const generatePatientSummaryFlow = ai.defineFlow(
  {
    name: 'generatePatientSummaryFlow',
    inputSchema: GeneratePatientSummaryInputSchema,
    outputSchema: PatientSummarySchema,
  },
  async (input) => {
    // 1. Fetch all patient data
    const { patient, conversation, metrics } = await getPatientDetails(input.patientId);

    if (!patient) {
        throw new Error(`Patient with ID ${input.patientId} not found.`);
    }

    // 2. Format and prepare data for the prompt
    const formattedConversation = conversation.slice(-10).map(m => ({
        ...m,
        timestamp: format(parseISO(m.timestamp as string), "dd/MM/yyyy HH:mm")
    }));

     const formattedMetrics = metrics.map(m => ({
        ...m,
        date: format(parseISO(m.date as string), "dd/MM/yyyy")
    }));

    // 3. Call the LLM with fallback logic for this high-value, low-frequency task.
    try {
        let response;
        const promptInput = {
            patient,
            conversation: formattedConversation,
            metrics: formattedMetrics
        };
        const isRateLimitOrOverloaded = (e: any) => e instanceof Error && (e.message.includes('503') || e.message.includes('429'));

        try {
            // 1. Try with the primary (most powerful) model as this is a high-value task.
            response = await prompt(promptInput, { model: googleAI.model('gemini-2.5-flash') });
        } catch (e: any) {
            if (isRateLimitOrOverloaded(e)) {
                console.warn("Flash model unavailable for summary, falling back to pro model.");
                 try {
                    // 2. Fallback to pro model.
                    response = await prompt(promptInput, { model: googleAI.model('gemini-pro-latest') });
                } catch (e2: any) {
                    if (isRateLimitOrOverloaded(e2)) {
                        console.warn("Pro model also unavailable for summary, falling back to 1.0-pro.");
                        // 3. Last resort fallback.
                        response = await prompt(promptInput, { model: googleAI.model('gemini-1.0-pro') });
                    } else {
                        throw e2; // Re-throw other errors from flash model
                    }
                }
            } else {
                throw e; // Re-throw other errors from primary model
            }
        }

        const { output } = response;

        if (!output) {
            throw new Error("Failed to generate patient summary from AI.");
        }
        
        return output;

    } catch (error) {
         if (error instanceof Error && (error.message.includes('503') || error.message.includes('429'))) {
            throw new Error("Nossos modelos de IA estão indisponíveis no momento. Por favor, tente novamente mais tarde.");
        }
        // Re-throw other types of errors
        throw error;
    }
  }
);
