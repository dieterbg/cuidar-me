
'use server';
/**
 * @fileOverview This flow is currently disabled to simplify debugging.
 * It was intended to orchestrate the analysis of a patient's conversation,
 * combining data extraction and risk analysis.
 */

// import {ai} from '@/ai/genkit';
// import { updatePatientRisk, addHealthMetric } from '@/ai/firestore-admin'; // OBSOLETO: Migrado para Supabase
import {
  AnalyzeConversationInputSchema,
  AnalyzeConversationOutputSchema,
  type AnalyzeConversationInput,
  type AnalyzeConversationOutput,
  SummarizePatientRiskOutputSchema,
  ExtractPatientDataOutputSchema,
} from '@/lib/schemas';
import { z } from 'zod';


export async function analyzeConversation(
  input: AnalyzeConversationInput
): Promise<AnalyzeConversationOutput> {
  // Flow is disabled, return empty.
  console.warn("analyzeConversation flow is currently disabled.");
  return { extractedData: null, riskAnalysis: null };
}


const CombinedAnalysisSchema = z.object({
  extractedData: ExtractPatientDataOutputSchema.describe("Dados estruturados extraídos da mensagem."),
  riskAnalysis: SummarizePatientRiskOutputSchema.describe("Análise de risco clínico da mensagem.")
});

/*
const analysisPrompt = ai.definePrompt({
    name: "combinedPatientAnalysisPrompt",
    input: { schema: AnalyzeConversationInputSchema },
    output: { schema: CombinedAnalysisSchema },
    prompt: `Você é um assistente de IA especialista em endocrinologia. Sua tarefa é analisar a mensagem de um paciente para extrair dados estruturados e avaliar riscos clínicos em uma única operação.

    **Mensagem do Paciente:**
    "{{messages}}"

    **Sua Tarefa:**
    1.  **Extrair Dados Estruturados:** Analise a mensagem em busca das seguintes métricas e retorne-as no campo 'extractedData':
        - 'weight': O peso do paciente em quilogramas (kg). Ex: "meu peso hoje é 75kg", "estou com 75", "75".
        - 'mealCheckin': Se a mensagem for uma resposta a um check-in de refeição com opções A, B, ou C, extraia a letra correspondente.

    2.  **Analisar Risco Clínico:** Avalie a mensagem em busca de quaisquer sinais de risco, como menções a dores, sintomas, estado emocional negativo, ou dúvidas sobre medicação. Retorne sua análise no campo 'riskAnalysis':
        - 'riskSummary': Um resumo do risco identificado.
        - 'riskLevel': Classifique o risco como 'low', 'medium', ou 'high'.
        - 'suggestedActions': Ações recomendadas para a equipe de saúde.

    Responda SEMPRE em português do Brasil e forneça a saída no formato JSON especificado.
    Se nenhuma métrica for encontrada, retorne um objeto 'extractedData' vazio. Se nenhum risco for encontrado, o nível de risco deve ser 'low'.
    `,
});


const analyzeConversationFlow = ai.defineFlow(
  {
    name: 'analyzeConversationFlow',
    inputSchema: AnalyzeConversationInputSchema,
    outputSchema: AnalyzeConversationOutputSchema,
  },
  async (input) => {
    // Flow is disabled.
    console.warn("analyzeConversationFlow is currently disabled.");
    return { extractedData: null, riskAnalysis: null };
  }
);
*/
