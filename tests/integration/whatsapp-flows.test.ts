import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handlePatientReply } from '@/ai/handle-patient-reply';

// --- MOCKS ---

// 1. Mock Supabase
const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    gte: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
};

vi.mock('@/lib/supabase-server-utils', () => ({
    createServiceRoleClient: () => mockSupabase,
}));

// 2. Mock Intent Classifier
vi.mock('@/ai/message-intent-classifier', () => ({
    classifyMessageIntent: vi.fn(),
    MessageIntent: {
        EMERGENCY: 'emergency',
        SOCIAL: 'social',
        QUESTION: 'question',
        CHECKIN_RESPONSE: 'checkin_response',
        OFF_TOPIC: 'off_topic',
    },
}));

// 3. Mock Chatbot Reply
vi.mock('@/ai/flows/generate-chatbot-reply', () => ({
    generateChatbotReply: vi.fn(),
}));

// 4. Mock Onboarding & Welcome
vi.mock('@/ai/actions/onboarding', () => ({
    isOnboardingActive: vi.fn(),
    startOnboarding: vi.fn(),
    handleOnboardingReply: vi.fn(),
}));

vi.mock('@/ai/handlers/welcome-handler', () => ({
    sendWelcomeMessage: vi.fn(),
}));

// 5. Mock Twilio
vi.mock('@/lib/twilio', () => ({
    sendWhatsappMessage: vi.fn(),
}));

// 6. Mock Logger
vi.mock('@/lib/logger', () => ({
    loggers: {
        ai: {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        },
    },
}));

// Import mocks to control them in tests
import { classifyMessageIntent } from '@/ai/message-intent-classifier';
import { generateChatbotReply } from '@/ai/flows/generate-chatbot-reply';
import { isOnboardingActive, startOnboarding, handleOnboardingReply } from '@/ai/actions/onboarding';
import { sendWelcomeMessage } from '@/ai/handlers/welcome-handler';
import { sendWhatsappMessage } from '@/lib/twilio';

describe('WhatsApp Integration Flows', () => {
    const mockPhone = 'whatsapp:+5511999999999';
    const mockName = 'Teste User';

    beforeEach(() => {
        vi.clearAllMocks();
        // Default Supabase behaviors
        mockSupabase.select.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.single.mockResolvedValue({ data: null }); // Default: user not found
        mockSupabase.insert.mockReturnThis();
        mockSupabase.update.mockReturnThis();
        mockSupabase.maybeSingle.mockResolvedValue({ data: null }); // No recent checkin
    });

    it('Scenario 1: New Patient (Unregistered)', async () => {
        // Setup: Patient not found in DB
        mockSupabase.single.mockResolvedValueOnce({ data: null });

        await handlePatientReply(mockPhone, 'Olá', mockName);

        // Verify NO patient creation
        expect(mockSupabase.insert).not.toHaveBeenCalled();

        // Verify Registration Message sent
        expect(sendWhatsappMessage).toHaveBeenCalledWith(
            mockPhone,
            expect.stringContaining('https://cuidar.me/cadastro')
        );

        // Verify Onboarding Start NOT called
        expect(startOnboarding).not.toHaveBeenCalled();
    });

    it('Scenario 2: First Contact (Active Patient - Welcome)', async () => {
        // Setup: Patient exists and is active (newly created via Portal)
        const activePatient = { id: 'active-id', status: 'active', full_name: mockName, plan: 'freemium', whatsapp_number: mockPhone };
        mockSupabase.single.mockResolvedValueOnce({ data: activePatient });

        // Mock NO previous system messages (First Contact)
        // Chain: from -> select -> eq -> eq -> resolve { count: 0 }
        const countQueryMock: any = {
            then: vi.fn((resolve) => resolve({ count: 0, data: [] }))
        };
        countQueryMock.eq = vi.fn().mockReturnValue(countQueryMock);

        // 1st call: findPatientByPhone (returns builder -> maybeSingle)
        // 2nd call: count query (returns countQueryMock -> resolve)
        mockSupabase.select
            .mockReturnValueOnce(mockSupabase)
            .mockReturnValueOnce(countQueryMock);

        await handlePatientReply(mockPhone, 'Olá', mockName);

        // Verify Welcome Message Handler called
        expect(sendWelcomeMessage).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'active-id' }),
            expect.anything()
        );

        // Should NOT call classifier
        expect(classifyMessageIntent).not.toHaveBeenCalled();
    });

    it('Scenario 3: Emergency Flow', async () => {
        // Setup: Active patient with COMPLETE fields for transformer
        const activePatient = {
            id: 'active-id',
            status: 'active',
            full_name: mockName,
            whatsapp_number: mockPhone,
            plan: 'premium',
            priority: 1,
            needs_attention: false,
            total_points: 100,
            level: 'Iniciante',
            badges: [],
            last_message: '',
            last_message_timestamp: new Date().toISOString()
        };
        mockSupabase.single.mockResolvedValueOnce({ data: activePatient });

        // Intent: EMERGENCY
        (classifyMessageIntent as any).mockResolvedValue({ intent: 'emergency', confidence: 0.9 });

        // Chatbot Reply for Emergency
        (generateChatbotReply as any).mockResolvedValue({
            decision: 'escalate',
            chatbotReply: 'Entendi, vou chamar um humano.',
            attentionRequest: {
                reason: 'Dor',
                aiSummary: 'Paciente com dor',
                aiSuggestedReply: 'Vá ao médico',
                priority: 1
            }
        });

        await handlePatientReply(mockPhone, 'Estou com muita dor', mockName);

        // Verify Attention Request created
        expect(mockSupabase.from).toHaveBeenCalledWith('attention_requests');
        expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
            reason: 'Emergência Detectada',
            priority: 1
        }));

        // Verify Emergency Reply sent
        expect(sendWhatsappMessage).toHaveBeenCalledWith(mockPhone, 'Entendi, vou chamar um humano.');
    });

    it('Scenario 4: Social Flow', async () => {
        // Setup: Active patient
        const activePatient = { id: 'active-id', status: 'active', full_name: mockName };
        mockSupabase.single.mockResolvedValueOnce({ data: activePatient });

        // Intent: SOCIAL
        (classifyMessageIntent as any).mockResolvedValue({ intent: 'social', confidence: 0.9 });

        await handlePatientReply(mockPhone, 'Bom dia', mockName);

        // Verify Simple Reply
        expect(sendWhatsappMessage).toHaveBeenCalledWith(mockPhone, "Olá! 😊 Como posso te ajudar?");
        // Should NOT call AI generator
        expect(generateChatbotReply).not.toHaveBeenCalled();
    });

    it('Scenario 5: General AI Conversation', async () => {
        // Setup: Active patient with COMPLETE fields
        const activePatient = {
            id: 'active-id',
            status: 'active',
            full_name: mockName,
            whatsapp_number: mockPhone,
            plan: 'premium',
            priority: 1,
            needs_attention: false,
            total_points: 100,
            level: 'Iniciante',
            badges: [],
            last_message: '',
            last_message_timestamp: new Date().toISOString()
        };
        mockSupabase.single.mockResolvedValueOnce({ data: activePatient });

        // Intent: QUESTION
        (classifyMessageIntent as any).mockResolvedValue({ intent: 'question', confidence: 0.8 });

        // Chatbot Reply
        (generateChatbotReply as any).mockResolvedValue({
            decision: 'reply',
            chatbotReply: 'O programa funciona assim...',
        });

        await handlePatientReply(mockPhone, 'Como funciona?', mockName);

        // Verify AI Reply
        expect(generateChatbotReply).toHaveBeenCalled();
        expect(sendWhatsappMessage).toHaveBeenCalledWith(mockPhone, 'O programa funciona assim...');
    });
});
