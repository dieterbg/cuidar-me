
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a structured patient protocol from a text description.
 *
 * - generateProtocol - A function that takes a text prompt and returns a structured protocol object.
 * - GenerateProtocolInput - The input type for the generateProtocol function.
 * - GenerateProtocolOutput - The return type for the generateProtocol function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { googleAI } from '@genkit-ai/google-genai';

const GenerateProtocolInputSchema = z.object({
  prompt: z.string().describe('The natural language description of the protocol to be generated.'),
});
export type GenerateProtocolInput = z.infer<typeof GenerateProtocolInputSchema>;


const ProtocolStepSchema = z.object({
    day: z.number().describe("The day in the protocol when the message should be sent."),
    title: z.string().describe("A short, descriptive title for the protocol step."),
    description: z.string().describe("The actual message content to be sent to the patient."),
});

const GenerateProtocolOutputSchema = z.object({
  name: z.string().describe("A concise and descriptive name for the generated protocol."),
  description: z.string().describe("A brief summary of the protocol's purpose and duration."),
  goals: z.array(z.string()).describe("A list of 3 to 5 clear, measurable goals for the patient to achieve during the protocol."),
  steps: z.array(ProtocolStepSchema).describe("The array of steps that make up the protocol."),
});
export type GenerateProtocolOutput = z.infer<typeof GenerateProtocolOutputSchema>;


export async function generateProtocol(input: GenerateProtocolInput): Promise<GenerateProtocolOutput> {
  return generateProtocolFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateProtocolPrompt',
  input: {schema: GenerateProtocolInputSchema},
  output: {schema: GenerateProtocolOutputSchema},
  prompt: `Você é um assistente de IA especialista em endocrinologia, focado na criação de protocolos de emagrecimento. Sua tarefa é converter uma descrição em linguagem natural em um protocolo de acompanhamento estruturado em JSON.

  **Instruções:**
  1.  **Analise o Pedido:** Leia atentamente o prompt do usuário para entender o objetivo, a duração, o público-alvo (ex: iniciante, intermediário) e os principais marcos do protocolo de perda de peso.
  2.  **Crie um Nome e Descrição:** Gere um nome (campo 'name') e uma descrição (campo 'description') claros, motivadores e concisos para o protocolo. Ex: "Protocolo Start: 30 dias para Mudar", "Desafio Metabólico Avançado".
  3.  **Defina Metas (Goals):** Crie uma lista (campo 'goals') de 3 a 5 metas claras e mensuráveis para o paciente. Ex: "Perder 2kg", "Caminhar 30 minutos 4x por semana", "Registrar o peso às segundas e quintas", "Beber 2.5L de água por dia".
  4.  **Gere as Etapas (Steps):** Crie uma lista de etapas. Cada etapa deve ter:
      - 'day': O número do dia em que a mensagem será enviada (começando do dia 1).
      - 'title': Um título curto para a etapa (ex: "Dia da Pesagem", "Dica de Hidratação", "Foto do Almoço").
      - 'description': O texto completo da mensagem a ser enviada ao paciente. A mensagem deve ser amigável, clara, encorajadora e, se possível, terminar com uma pergunta para incentivar a resposta.
  5.  **Distribuição Lógica:** Distribua as etapas de forma lógica ao longo da duração do protocolo. Intercale mensagens educativas, de ação (pedir peso, foto), e de motivação.
  6.  **Seja Criativo e Proativo:** Se o prompt for simples (ex: "protocolo de 15 dias para emagrecer"), enriqueça-o com metas e etapas úteis e relevantes, como lembretes para beber água, incentivo à atividade física, pedidos de registro de peso, e checagens de bem-estar.

  **Exemplo de Pedido do Usuário:**
  "Crie um protocolo de 30 dias para perda de peso, nível intermediário, que peça o peso duas vezes na semana e incentive o envio de fotos das refeições."

  **Pedido do Usuário Atual:**
  "{{prompt}}"
  `,
});

const generateProtocolFlow = ai.defineFlow(
  {
    name: 'generateProtocolFlow',
    inputSchema: GenerateProtocolInputSchema,
    outputSchema: GenerateProtocolOutputSchema,
  },
  async input => {
    try {
      let response;
      const isRateLimitOrOverloaded = (e: any) => e instanceof Error && (e.message.includes('503') || e.message.includes('429'));
      
      try {
        // 1. Try with the primary (most powerful) model.
        response = await prompt(input, { model: googleAI.model('gemini-2.5-flash') });
      } catch (e: any) {
        if (isRateLimitOrOverloaded(e)) {
          console.warn("Flash model unavailable for protocol generation, falling back to pro model.");
          try {
            // 2. Fallback to pro model.
            response = await prompt(input, { model: googleAI.model('gemini-pro-latest') });
          } catch (e2: any) {
            if (isRateLimitOrOverloaded(e2)) {
                console.warn("Pro model also unavailable, falling back to 1.0-pro model.");
                // 3. Last resort fallback.
                response = await prompt(input, { model: googleAI.model('gemini-1.0-pro') });
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
        throw new Error("AI failed to return a valid protocol.");
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
