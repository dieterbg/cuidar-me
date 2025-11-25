
'use server';
/**
 * @fileOverview A flow that orchestrates the analysis of a patient's conversation.
 * It now combines data extraction and risk analysis into a single, efficient AI call.
 * This flow is typically used for on-demand analysis from the staff-facing chat panel.
 *
 * - getChatAnalysis - A function that handles the patient conversation analysis.
 * - GetChatAnalysisInput - The input type for the getChatAnalysis function.
 * - GetChatAnalysisOutput - The return type for the getChatAnalysis function.
 */

import {ai} from '@/ai/genkit';
import {
    GetChatAnalysisInputSchema,
    GetChatAnalysisOutputSchema,
    SummarizePatientRiskOutputSchema,
    ExtractPatientDataOutputSchema,
} from '@/lib/schemas';
import type { GetChatAnalysisInput, GetChatAnalysisOutput } from '@/lib/schemas'; // Importa os tipos
import { z } from 'zod';
import { googleAI } from '@genkit-ai/google-genai';

// Re-exporta os tipos para que possam ser importados de outros arquivos.
export type { GetChatAnalysisInput, GetChatAnalysisOutput };

export async function getChatAnalysis(
  input: GetChatAnalysisInput
): Promise<GetChatAnalysisOutput> {
  return getChatAnalysisFlow(input);
}


// Define a new combined output schema for the single AI call
const CombinedAnalysisSchema = z.object({
  extractedData: ExtractPatientDataOutputSchema.nullable().describe("Dados estruturados extraídos da mensagem, ou null se nenhum dado for encontrado."),
  riskAnalysis: SummarizePatientRiskOutputSchema.nullable().describe("Análise de risco clínico da mensagem, ou null se nenhum risco for identificado.")
});

const analysisPrompt = ai.definePrompt({
    name: "getChatAnalysisPrompt",
    input: { schema: GetChatAnalysisInputSchema },
    output: { schema: CombinedAnalysisSchema },
    prompt: `Você é um assistente de IA especialista em endocrinologia. Sua tarefa é analisar a mensagem de um paciente para extrair dados estruturados e avaliar riscos clínicos em uma única operação.

    **Histórico da Conversa:**
    "{{messages}}"

    **Sua Tarefa:**
    1.  **Extrair Dados Estruturados:** Analise a conversa em busca das seguintes métricas e retorne-as no campo 'extractedData':
        - 'weight': O peso do paciente em quilogramas (kg). Ex: "meu peso hoje é 75kg", "estou com 75", "75".
        - 'mealCheckin': Se a mensagem for uma resposta a um check-in de refeição com opções A, B, ou C, extraia a letra correspondente.
        Se nenhuma métrica for encontrada, retorne null para 'extractedData'.

    2.  **Analisar Risco Clínico:** Avalie a conversa em busca de quaisquer sinais de risco, como menções a dores, sintomas, estado emocional negativo, ou dúvidas sobre medicação. Retorne sua análise no campo 'riskAnalysis':
        - 'riskSummary': Um resumo do risco identificado.
        - 'riskLevel': Classifique o risco como 'low', 'medium', ou 'high'.
        - 'suggestedActions': Ações recomendadas para a equipe de saúde.
        Se nenhum risco for encontrado, retorne null para 'riskAnalysis'.

    Responda SEMPRE em português do Brasil e forneça a saída no formato JSON especificado.
    `,
});


const getChatAnalysisFlow = ai.defineFlow(
  {
    name: 'getChatAnalysisFlow',
    inputSchema: GetChatAnalysisInputSchema,
    outputSchema: GetChatAnalysisOutputSchema,
  },
  async (input) => {
    try {
        let response;
        const isRateLimitOrOverloaded = (e: any) => e instanceof Error && (e.message.includes('503') || e.message.includes('429'));

        try {
            // 1. Try with the cost-effective model first.
            response = await analysisPrompt(input, { model: googleAI.model('gemini-2.5-flash') });
        } catch (e: any) {
            if (isRateLimitOrOverloaded(e)) {
                console.warn("Flash model unavailable for chat analysis, falling back to pro model.");
                try {
                    // 2. Fallback to the more powerful model.
                    response = await analysisPrompt(input, { model: googleAI.model('gemini-pro-latest') });
                } catch (e2: any) {
                    if (isRateLimitOrOverloaded(e2)) {
                        console.warn("Pro model also unavailable, falling back to 1.0-pro.");
                         // 3. Last resort fallback.
                        response = await analysisPrompt(input, { model: googleAI.model('gemini-1.0-pro') });
                    } else {
                        throw e2; // Re-throw other errors from flash model
                    }
                }
            } else {
                throw e; // Re-throw other errors from primary model
            }
        }

        const { output: combinedAnalysis } = response;

        if (!combinedAnalysis) {
          console.error("Combined analysis returned null from AI.");
          return { extractedData: null, riskAnalysis: null };
        }

        // Return the nullable fields directly, defaulting to null if they are missing.
        return {
          extractedData: combinedAnalysis.extractedData || null,
          riskAnalysis: combinedAnalysis.riskAnalysis || null,
        };
    } catch (error) {
        if (error instanceof Error && (error.message.includes('503') || error.message.includes('429'))) {
            throw new Error("Nossos modelos de IA estão indisponíveis no momento. Por favor, tente novamente mais tarde.");
        }
        // Re-throw other types of errors
        throw error;
    }
  }
);
