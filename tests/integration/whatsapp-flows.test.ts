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

// 4. Mock Onboarding
vi.mock('@/ai/actions/onboarding', () => ({
    isOnboardingActive: vi.fn(),
    startOnboarding: vi.fn(),
    handleOnboardingReply: vi.fn(),
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

    it('Scenario 1: New Patient (Starts Onboarding)', async () => {
        // Setup: Patient not found in DB
        mockSupabase.single.mockResolvedValueOnce({ data: null });
        // Insert returns new patient
        const newPatient = { id: 'new-id', status: 'pending', plan: 'freemium', full_name: mockName };
        mockSupabase.single.mockResolvedValueOnce({ data: newPatient });

        // Onboarding is not active yet
        (isOnboardingActive as any).mockResolvedValue(false);

        await handlePatientReply(mockPhone, 'Olá', mockName);

        // Verify patient creation
        expect(mockSupabase.from).toHaveBeenCalledWith('patients');
        expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
            whatsapp_number: mockPhone,
            status: 'pending'
        }));

        // Verify Onboarding Start
        expect(startOnboarding).toHaveBeenCalledWith('new-id', 'freemium', mockPhone, mockName);
    });

    it('Scenario 2: Pending Patient (Continues Onboarding)', async () => {
        // Setup: Patient exists and is pending
        const pendingPatient = { id: 'pending-id', status: 'pending', full_name: mockName };
        mockSupabase.single.mockResolvedValueOnce({ data: pendingPatient });

        // Onboarding IS active
        (isOnboardingActive as any).mockResolvedValue(true);
        (handleOnboardingReply as any).mockResolvedValue({ success: true });

        await handlePatientReply(mockPhone, 'Meu nome é Teste', mockName);

        // Verify Onboarding Reply Handler
        expect(handleOnboardingReply).toHaveBeenCalledWith('pending-id', mockPhone, 'Meu nome é Teste', mockName);
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
