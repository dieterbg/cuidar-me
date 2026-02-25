import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

vi.mock('@/ai/genkit', () => ({
    ai: {
        definePrompt: vi.fn(() => vi.fn().mockResolvedValue({ output: {} })),
        defineFlow: vi.fn((config, fn) => {
            return (input: any) => fn(input);
        }),
    },
}));

import { ai } from '@/ai/genkit';
import {
    MessageIntent,
    classifyMessageIntent,
    generateIntentResponse
} from '@/ai/message-intent-classifier';
import { generateChatbotReply } from '@/ai/flows/generate-chatbot-reply';

let mockPrompt: any;

describe('AI Logic: Intent Classifier', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // O definePrompt retorna a função que a gente chama
        // @ts-ignore
        mockPrompt = (ai.definePrompt as any).mock.results[0]?.value || vi.fn();
    });



    it('INT-01: classifica mensagem como emergência quando IA retorna emergency', async () => {
        mockPrompt.mockResolvedValueOnce({ output: { intent: 'emergency', confidence: 0.95, reason: 'dor mencionada' } });

        const result = await classifyMessageIntent('estou com muita dor', { hasActiveCheckin: false });

        expect(result.intent).toBe(MessageIntent.EMERGENCY);
        expect(result.confidence).toBe(0.95);
    });

    it('INT-02: classifica mensagem como social', async () => {
        mockPrompt.mockResolvedValueOnce({ output: { intent: 'social', confidence: 0.99, reason: 'saudação' } });

        const result = await classifyMessageIntent('bom dia', { hasActiveCheckin: false });

        expect(result.intent).toBe(MessageIntent.SOCIAL);
    });

    it('INT-04: classifica como checkin_response se tem checkin ativo', async () => {
        mockPrompt.mockResolvedValueOnce({ output: { intent: 'checkin_response', confidence: 0.9, reason: 'resposta a' } });

        const result = await classifyMessageIntent('A', { hasActiveCheckin: true, checkinTitle: 'Almoço' });

        expect(result.intent).toBe(MessageIntent.CHECKIN_RESPONSE);
    });

    it('INT-06: fallback para question em caso de erro da IA', async () => {
        mockPrompt.mockRejectedValueOnce(new Error('AI failed'));

        const result = await classifyMessageIntent('qualquer coisa', { hasActiveCheckin: false });

        expect(result.intent).toBe(MessageIntent.QUESTION);
        expect(result.reason).toContain('Erro');
    });

    it('INT-07: gera resposta para SOCIAL', async () => {
        const response = await generateIntentResponse(MessageIntent.SOCIAL);
        expect(response).toContain('Olá');
    });

    it('INT-08: retorna null para outros intents na geração de resposta', async () => {
        const response = await generateIntentResponse(MessageIntent.EMERGENCY);
        expect(response).toBeNull();
    });
});

describe('AI Logic: Chatbot Reply', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // @ts-ignore
        mockPrompt = (ai.definePrompt as any).mock.results[0]?.value || vi.fn();
    });


    it('CBR-01: chatbot responde com decisao "reply"', async () => {
        // Mock do output da flow (definida com defineFlow que apenas executa a fn)
        mockPrompt.mockResolvedValueOnce({
            output: {
                decision: 'reply',
                chatbotReply: 'Sim, você pode beber água.',
                reason: 'pergunta sobre hidratação'
            }
        });

        const result = await generateChatbotReply({
            patientMessage: 'Posso beber água?',
            patient: { id: 'p1', fullName: 'Maria' } as any
        });

        expect(result.decision).toBe('reply');
        expect(result.chatbotReply).toContain('água');
    });

    it('CBR-02: chatbot escala para humano em emergências', async () => {
        mockPrompt.mockResolvedValueOnce({
            output: {
                decision: 'escalate',
                reason: 'sintoma grave detectado'
            }
        });

        const result = await generateChatbotReply({
            patientMessage: 'Sinto pontadas no peito',
            patient: { id: 'p1' } as any
        });

        expect(result.decision).toBe('escalate');
    });

    it('CBR-03: chatbot extrai métricas de saúde', async () => {
        mockPrompt.mockResolvedValueOnce({
            output: {
                decision: 'reply',
                chatbotReply: 'Peso registrado!',
                extractedData: { weight: 85.5 }
            }
        });

        const result = await generateChatbotReply({
            patientMessage: 'Meu peso hoje é 85.5kg',
            patient: { id: 'p1' } as any
        });

        expect(result.extractedData?.weight).toBe(85.5);
    });

    it('fallback para escalate se a flow falhar', async () => {
        mockPrompt.mockRejectedValueOnce(new Error('Flow failed'));

        const result = await generateChatbotReply({
            patientMessage: 'ajuda',
            patient: { id: 'p1' } as any
        });

        expect(result.decision).toBe('escalate');
        expect(result.chatbotReply).toContain('momentaneamente indisponível');
    });
});



