
'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting draft responses to patient messages.
 *
 * - suggestWhatsappReplies - A function that takes a patient message as input and returns a suggested reply.
 * - SuggestWhatsappRepliesInput - The input type for the suggestWhatsappReplies function.
 * - SuggestWhatsappRepliesOutput - The return type for the suggestWhatsappReplies function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const SuggestWhatsappRepliesInputSchema = z.object({
  patientMessage: z
    .string()
    .describe('The message from the patient that requires a response.'),
});

const SuggestWhatsappRepliesOutputSchema = z.object({
  suggestedReply: z
    .string()
    .describe('The suggested reply to the patient message.'),
});

const prompt = ai.definePrompt({
  name: 'suggestWhatsappRepliesPrompt',
  input: { schema: SuggestWhatsappRepliesInputSchema },
  model: 'googleai/gemini-flash-latest',
  prompt: `Você é um assistente de IA que ajuda profissionais de saúde a responder mensagens de pacientes no WhatsApp.

  Com base na mensagem do paciente, gere um rascunho de resposta que seja útil, empático e profissional.
  Mantenha a resposta concisa e direta ao ponto.

  Mensagem do Paciente: {{{patientMessage}}}

  Resposta Sugerida:`,
});

const suggestWhatsappRepliesFlow = ai.defineFlow(
  {
    name: 'suggestWhatsappRepliesFlow',
    inputSchema: SuggestWhatsappRepliesInputSchema,
    outputSchema: SuggestWhatsappRepliesOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);

// We define types below just for local usage if needed, avoiding direct export of Zod objects.
export type SuggestWhatsappRepliesInput = z.infer<typeof SuggestWhatsappRepliesInputSchema>;
export type SuggestWhatsappRepliesOutput = z.infer<typeof SuggestWhatsappRepliesOutputSchema>;

// THE ONLY EXPORT ALLOWED AS A FUNCTION IN A `use server` FILE
export async function suggestWhatsappReplies(input: SuggestWhatsappRepliesInput): Promise<SuggestWhatsappRepliesOutput> {
  return suggestWhatsappRepliesFlow(input);
}
