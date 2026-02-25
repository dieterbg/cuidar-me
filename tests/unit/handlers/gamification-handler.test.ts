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
            message: 'Você bebeu água hoje?',
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
    // Create a fully chainable Supabase mock
    const createMockSupabase = () => {
        const chain: any = {};
        const methods = ['from', 'select', 'insert', 'update', 'eq', 'order', 'limit'];
        for (const method of methods) {
            chain[method] = vi.fn(() => chain);
        }
        // Default terminal operations
        chain.single = vi.fn(async () => ({ data: null }));
        chain.maybeSingle = vi.fn(async () => ({ data: null }));

        // Make the chain itself thenable
        chain.then = (resolve: any) => resolve({
            data: [{
                text: 'Você bebeu água hoje?',
                metadata: { isGamification: true, checkinTitle: 'Beber Água' }
            }]
        });

        return chain;
    };

    const mockPatient = { id: '123', user_id: 'u1', whatsapp_number: '5511999999999' };
    const mockProtocol = { protocol: { id: 'p1' }, current_day: 1 };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should process valid gamification response', async () => {
        const mockSupabase = createMockSupabase();

        const result = await handleProtocolGamification(
            mockPatient,
            mockProtocol,
            'Sim, bebi água',
            '5511999999999',
            mockSupabase
        );

        expect(result).toBe(true);
        const { sendWhatsappMessage } = await import('@/lib/twilio');
        expect(sendWhatsappMessage).toHaveBeenCalledWith('5511999999999', 'Ganhou 10 pontos!');
        expect(mockSupabase.from).toHaveBeenCalledWith('messages');
    });

    it('should ignore non-gamification response', async () => {
        const { isGamificationCheckin } = await import('@/ai/protocol-response-processor');
        (isGamificationCheckin as any).mockReturnValueOnce(false);

        const mockSupabase = createMockSupabase();

        const result = await handleProtocolGamification(
            mockPatient,
            mockProtocol,
            'algum texto',
            '5511999999999',
            mockSupabase
        );

        expect(result).toBe(false);
    });

    it('should return false if no protocol step matches context', async () => {
        const mockSupabase = createMockSupabase();
        mockSupabase.then = (resolve: any) => resolve({
            data: [{ text: 'Outra coisa', metadata: {} }]
        });

        const result = await handleProtocolGamification(
            mockPatient,
            mockProtocol,
            'Sim',
            '5511999999999',
            mockSupabase
        );

        expect(result).toBe(false);
    });
});
