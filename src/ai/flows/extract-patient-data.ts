
'use server';

/**
 * @fileOverview AI flow to extract structured health data from informal patient messages.
 *
 * - extractPatientData - Function to extract patient data from messages.
 * - ExtractPatientDataInput - The input type for the extractPatientData function.
 * - ExtractPatientDataOutput - The return type for the extractPatientData function.
 */

// import {ai} from '@/ai/genkit';
import {
  ExtractPatientDataInputSchema,
  ExtractPatientDataOutput,
  ExtractPatientDataOutputSchema,
} from '@/lib/schemas';
import type {ExtractPatientDataInput} from '@/lib/schemas';

export async function extractPatientData(
  input: ExtractPatientDataInput
): Promise<ExtractPatientDataOutput> {
  // return extractPatientDataFlow(input);
  console.warn("Genkit features are disabled due to an installation issue.");
  return {};
}

/*
const prompt = ai.definePrompt({
  name: 'extractPatientDataPrompt',
  input: {schema: ExtractPatientDataInputSchema},
  output: {schema: ExtractPatientDataOutputSchema},
  prompt: `Você é um assistente de IA especialista em analisar mensagens de pacientes para um programa de perda de peso.

  Sua tarefa é ler a mensagem do paciente e extrair QUALQUER uma das seguintes métricas de saúde, se mencionadas.
  
  **Métricas a serem extraídas:**
  - 'weight': O peso do paciente em quilogramas. Extraia apenas o número. Exemplos: "meu peso hoje é 75.3kg", "estou com 75.3", "a balança marcou 75,3".
  - 'mealCheckin': Se a mensagem for uma resposta a uma pergunta de autoavaliação sobre uma refeição (com opções A, B, ou C), extraia a letra. Exemplos: "Hoje foi letra B", "resposta C", "segui 100% então foi A".
  - 'glucoseLevel': O nível de glicose no sangue. Extraia apenas o número. Exemplos: "minha glicemia em jejum foi 99", "deu 105mg/dl", "glicose: 98".
  - 'waistCircumference': A circunferência da cintura em centímetros. Extraia apenas o número. Exemplos: "minha cintura está com 92cm", "cintura: 92".
  - 'sleepDuration': A duração do sono em horas. Extraia apenas o número. Exemplos: "dormi umas 7 horas", "consegui dormir 6.5h esta noite".
  - 'physicalActivity': Uma breve descrição da atividade física realizada. Exemplos: "fiz 30 minutos de caminhada", "corri 5km hoje", "treino de musculação de 45min".

  **Regras Importantes:**
  - Se um valor para uma métrica não for mencionado, omita a chave do resultado.
  - Se múltiplos valores para a mesma métrica forem mencionados, retorne apenas o valor mais recente/último.
  - Retorne os dados em formato JSON. Não adicione nenhum texto de conversação. 
  - Se nenhuma métrica for encontrada, retorne um objeto JSON vazio.

  **Mensagem do Paciente:** 
  "{{message}}"
  `,
});

const extractPatientDataFlow = ai.defineFlow(
  {
    name: 'extractPatientDataFlow',
    inputSchema: ExtractPatientDataInputSchema,
    outputSchema: ExtractPatientDataOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // Ensure the flow always returns an object, even if AI fails or returns null.
    return output || {};
  }
);
*/
    
