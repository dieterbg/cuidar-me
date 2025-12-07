import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleProtocolGamification } from '@/ai/handlers/gamification-handler';

// Mocks
vi.mock('@/lib/twilio', () => ({
    sendWhatsappMessage: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/data', () => ({
    protocols: [{
        id: 'p1',
        messages: [{
            day: 1,
            title: 'Beber Água',
            gamification: {
                points: 10,
                perspectives: {
                    'positive': { keywords: ['sim', 'bebi'], response: 'Boa!' }
                }
            }
        }]
    }],
    mandatoryGamificationSteps: []
}));

vi.mock('@/ai/protocol-response-processor', () => ({
    isGamificationCheckin: vi.fn().mockReturnValue(true),
    extractPerspective: vi.fn().mockReturnValue('positive'),
    calculatePoints: vi.fn().mockReturnValue(10),
    getActionType: vi.fn().mockReturnValue('hydration'),
    generateConfirmationMessage: vi.fn().mockReturnValue('Ganhou 10 pontos!'),
}));

vi.mock('@/ai/actions/gamification', () => ({
    registerQuickAction: vi.fn().mockResolvedValue({ success: true }),
}));

describe('GamificationHandler', () => {
    const mockSupabase = {
        from: vi.fn(() => ({
            insert: vi.fn().mockResolvedValue({}),
        })),
    } as any;

    const mockPatient = { id: '123', user_id: 'u1', whatsapp_number: '5511999999999' };
    const mockProtocol = { protocol: { id: 'p1' }, current_day: 1 };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should process valid gamification response', async () => {
        const result = await handleProtocolGamification(
            mockPatient,
            mockProtocol,
            'Sim, bebi água',
            '5511999999999',
            mockSupabase
        );

        expect(result).toBe(true);
        // Should send confirmation message
        const { sendWhatsappMessage } = await import('@/lib/twilio');
        expect(sendWhatsappMessage).toHaveBeenCalledWith('5511999999999', 'Ganhou 10 pontos!');

        // Should save system message
        expect(mockSupabase.from).toHaveBeenCalledWith('messages');
    });
});
