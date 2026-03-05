'use server';

/**
 * @fileOverview Classificador inteligente de intenção de mensagens usando IA
 * Usa Google Gemini para detectar se mensagem é emergência, saudação, pergunta, resposta de check-in, etc.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export enum MessageIntent {
    EMERGENCY = 'emergency',           // "Estou com dor"
    SOCIAL = 'social',                 // "Olá bom dia!"
    QUESTION = 'question',             // "Como funciona o programa?"
    CHECKIN_RESPONSE = 'checkin_response', // "A", "85kg", "Sim"
    OFF_TOPIC = 'off_topic'           // Qualquer coisa não relacionada
}

export interface MessageContext {
    hasActiveCheckin: boolean;
    checkinTitle?: string;
}

const MessageIntentSchema = z.enum([
    'emergency',
    'social',
    'question',
    'checkin_response',
    'off_topic'
]);

const classifyPrompt = ai.definePrompt({
    name: 'classifyMessageIntent',
    input: {
        schema: z.object({
            message: z.string(),
            hasActiveCheckin: z.boolean(),
            checkinTitle: z.string().optional(),
        })
    },
    output: {
        schema: z.object({
            intent: MessageIntentSchema,
            confidence: z.number().min(0).max(1),
            reason: z.string(),
        })
    },
    model: 'googleai/gemini-2.0-flash-exp',
    config: {
        temperature: 0.1, // Baixa temperatura para classificação consistente
    },
    prompt: `Você é um classificador de mensagens de pacientes em uma clínica de saúde.

CONTEXTO:
- Mensagem do paciente: "{{message}}"
- Tem check-in pendente: {{hasActiveCheckin}}
{{#if checkinTitle}}- Título do check-in: "{{checkinTitle}}"{{/if}}

SUA TAREFA: Classificar a intenção da mensagem em UMA das categorias:

1. **EMERGENCY** - Sintomas urgentes ou problemas de saúde que precisam atenção médica IMEDIATA
   Exemplos: "estou com dor", "tontura", "mal", "febre", "medicamento", "pressão alta"
   
2. **SOCIAL** - Saudações simples ou mensagens sociais curtas
   Exemplos: "olá", "bom dia", "obrigado", "tchau"
   
3. **QUESTION** - Perguntas sobre o programa, dúvidas gerais, pedidos de informação
   Exemplos: "como funciona?", "onde vejo meu progresso?", "quando é a consulta?"
   
4. **CHECKIN_RESPONSE** - Resposta direta ao check-in pendente (se houver)
   Exemplos: "A", "B", "C", "Sim", "Não", "85kg", números, respostas curtas
   ATENÇÃO: Só classifique como CHECKIN_RESPONSE se {{hasActiveCheckin}} for true E a mensagem parecer ser uma resposta válida
   
5. **OFF_TOPIC** - Qualquer outra coisa que não se encaixa acima

REGRAS CRÍTICAS:
- PRIORIDADE MÁXIMA: Se mencionar QUALQUER sintoma de saúde → EMERGENCY
- Se mencionar medicamento, dosagem, ou efeito colateral → EMERGENCY
- Saudações de 1-2 palavras → SOCIAL
- Termina com "?" ou começa com "como/quando/onde" → QUESTION
- Se NÃO tem check-in pendente (hasActiveCheckin = false), NUNCA retorne CHECKIN_RESPONSE

Retorne em JSON:
{
  "intent": "emergency" | "social" | "question" | "checkin_response" | "off_topic",
  "confidence": 0.0-1.0,
  "reason": "breve explicação da classificação"
}
`,
});

/**
 * Classifica a intenção de uma mensagem usando IA
 */
export async function classifyMessageIntent(
    message: string,
    context: MessageContext
): Promise<{
    intent: MessageIntent;
    confidence: number;
    reason: string;
}> {
    try {
        const { output } = await classifyPrompt({
            message,
            hasActiveCheckin: context.hasActiveCheckin,
            checkinTitle: context.checkinTitle || '',
        });

        return {
            intent: output!.intent as MessageIntent,
            confidence: output!.confidence,
            reason: output!.reason,
        };
    } catch (error) {
        console.error('[classifyMessageIntent] Error:', error);

        // Fallback seguro: se erro, tratar como pergunta (vai para IA)
        return {
            intent: MessageIntent.QUESTION,
            confidence: 0.5,
            reason: 'Erro na classificação, tratando como pergunta por segurança',
        };
    }
}

/**
 * Gera mensagem de resposta para cada tipo de intenção
 */
export async function generateIntentResponse(intent: MessageIntent): Promise<string | null> {
    switch (intent) {
        case MessageIntent.SOCIAL:
            return "Olá! 😊 Como posso te ajudar hoje?";

        default:
            return null;
    }
}
