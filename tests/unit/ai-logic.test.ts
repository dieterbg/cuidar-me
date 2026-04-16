import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

const { mockClassifyPrompt, mockChatbotPrompt, mockGenerate } = vi.hoisted(() => ({
    mockClassifyPrompt: vi.fn().mockResolvedValue({ output: {} }),
    mockChatbotPrompt: vi.fn().mockResolvedValue({ output: {} }),
    mockGenerate: vi.fn().mockResolvedValue({ output: {} }),
}));

vi.mock('@/ai/genkit', () => ({
    ai: {
        definePrompt: vi.fn((config) => {
            if (config.name === 'classifyMessageIntent') return mockClassifyPrompt;
            return mockChatbotPrompt;
        }),
        defineFlow: vi.fn((config, fn) => {
            return (input: any) => fn(input);
        }),
        defineTool: vi.fn((config, fn) => {
            return { ...config, run: fn };
        }),
        generate: vi.fn((args) => mockGenerate(args)),
    },
}));

export { mockClassifyPrompt, mockChatbotPrompt, mockGenerate };

import { ai } from '@/ai/genkit';
import {
    MessageIntent,
    classifyMessageIntent,
    generateIntentResponse
} from '@/ai/message-intent-classifier';
import { generateChatbotReply } from '@/ai/flows/generate-chatbot-reply';

// Removendo variáveis instáveis

describe('AI Logic: Intent Classifier', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockClassifyPrompt.mockReset();
        mockClassifyPrompt.mockResolvedValue({ output: {} });
    });



    it('INT-01: classifica mensagem como emergência quando IA retorna emergency', async () => {
        mockClassifyPrompt.mockResolvedValueOnce({ output: { intent: 'emergency', confidence: 0.95, reason: 'dor mencionada' } });

        const result = await classifyMessageIntent('estou com muita dor', { hasActiveCheckin: false });

        expect(result.intent).toBe(MessageIntent.EMERGENCY);
        expect(result.confidence).toBe(0.95);
    });

    it('INT-02: classifica mensagem como social', async () => {
        mockClassifyPrompt.mockResolvedValueOnce({ output: { intent: 'social', confidence: 0.99, reason: 'saudação' } });

        const result = await classifyMessageIntent('bom dia', { hasActiveCheckin: false });

        expect(result.intent).toBe(MessageIntent.SOCIAL);
    });

    it('INT-04: classifica como checkin_response se tem checkin ativo', async () => {
        mockClassifyPrompt.mockResolvedValueOnce({ output: { intent: 'checkin_response', confidence: 0.9, reason: 'resposta a' } });

        const result = await classifyMessageIntent('A', { hasActiveCheckin: true, checkinTitle: 'Almoço' });

        expect(result.intent).toBe(MessageIntent.CHECKIN_RESPONSE);
    });

    it('INT-06: fallback para question em caso de erro da IA', async () => {
        mockClassifyPrompt.mockRejectedValueOnce(new Error('AI failed'));

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
        mockGenerate.mockReset();
        mockGenerate.mockResolvedValue({ output: {} });
    });


    it('CBR-01: chatbot responde com decisao "reply"', async () => {
        // Mock do output da ai.generate
        mockGenerate.mockResolvedValueOnce({
            output: {
                decision: 'reply',
                chatbotReply: 'Sim, você pode beber água.',
                reason: 'pergunta sobre hidratação'
            }
        });

        const result = await generateChatbotReply({
            patientMessage: 'Posso beber água?',
            patient: { id: 'p1', fullName: 'Maria', subscription: { priority: 'standard' } } as any
        });

        expect(result.decision).toBe('reply');
        expect(result.chatbotReply).toContain('água');
    });

    it('CBR-02: chatbot escala para humano em emergências', async () => {
        mockGenerate.mockResolvedValueOnce({
            output: {
                decision: 'escalate',
                reason: 'sintoma grave detectado'
            }
        });

        const result = await generateChatbotReply({
            patientMessage: 'Sinto pontadas no peito',
            patient: { id: 'p1', subscription: { priority: 'urgent' } } as any
        });

        expect(result.decision).toBe('escalate');
    });

    it('CBR-03: chatbot extrai métricas de saúde', async () => {
        mockGenerate.mockResolvedValueOnce({
            output: {
                decision: 'reply',
                chatbotReply: 'Peso registrado!',
                extractedData: { weight: 85.5 }
            }
        });

        const result = await generateChatbotReply({
            patientMessage: 'Meu peso hoje é 85.5kg',
            patient: { id: 'p1', subscription: { priority: 'standard' } } as any
        });

        expect(result.extractedData?.weight).toBe(85.5);
    });

    it('fallback para escalate se a flow falhar', async () => {
        mockGenerate.mockRejectedValue(new Error('Flow failed'));

        const result = await generateChatbotReply({
            patientMessage: 'ajuda',
            patient: { id: 'p1', subscription: { priority: 'standard' } } as any
        });

        expect(result.decision).toBe('escalate');
        expect(result.chatbotReply).toContain('momentaneamente indisponível');
    });
});



