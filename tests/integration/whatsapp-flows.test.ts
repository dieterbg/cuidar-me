import { describe, it, expect, vi, beforeEach } from 'vitest';

// ===================================================================
// STABLE MOCK CONTAINER — mutable reference that can be swapped per test
// ===================================================================
const mockContainer = {
    supabase: null as any,
};

// --- MODULE MOCKS ---

vi.mock('@/lib/supabase-server-utils', () => ({
    createServiceRoleClient: () => mockContainer.supabase,
}));

const mockFindPatientByPhone = vi.fn();
vi.mock('@/services/patient-service', () => ({
    findPatientByPhone: (...args: any[]) => mockFindPatientByPhone(...args),
}));

const mockSendWhatsappMessage = vi.fn().mockResolvedValue(true);
vi.mock('@/lib/twilio', () => ({
    sendWhatsappMessage: (...args: any[]) => mockSendWhatsappMessage(...args),
}));

const mockClassifyMessageIntent = vi.fn();
vi.mock('@/ai/message-intent-classifier', () => ({
    classifyMessageIntent: (...args: any[]) => mockClassifyMessageIntent(...args),
    MessageIntent: {
        EMERGENCY: 'emergency',
        SOCIAL: 'social',
        QUESTION: 'question',
        CHECKIN_RESPONSE: 'checkin_response',
        OFF_TOPIC: 'off_topic',
    },
}));

const mockGenerateChatbotReply = vi.fn();
vi.mock('@/ai/flows/generate-chatbot-reply', () => ({
    generateChatbotReply: (...args: any[]) => mockGenerateChatbotReply(...args),
}));

vi.mock('@/lib/logger', () => ({
    loggers: {
        ai: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    },
}));

vi.mock('@/lib/supabase-transforms', () => ({
    transformPatientFromSupabase: (p: any) => ({
        id: p.id,
        fullName: p.full_name || 'Test',
        name: p.full_name || 'Test',
        whatsappNumber: p.whatsapp_number || '',
        plan: p.plan || 'freemium',
        subscription: { plan: p.plan || 'freemium', priority: p.priority || 3 },
        gamification: {
            totalPoints: p.total_points || 0,
            level: p.level || 'Iniciante',
            badges: p.badges || [],
            weeklyProgress: { weekStartDate: new Date(), perspectives: {} },
        },
        needsAttention: p.needs_attention || false,
        status: p.status || 'active',
        activeCheckin: null,
    }),
}));

const mockSendWelcomeMessage = vi.fn().mockResolvedValue({ success: true });
vi.mock('@/ai/handlers/welcome-handler', () => ({
    sendWelcomeMessage: (...args: any[]) => mockSendWelcomeMessage(...args),
}));

const mockHandleEmergency = vi.fn().mockResolvedValue({ success: true });
vi.mock('@/ai/handlers/emergency-handler', () => ({
    handleEmergency: (...args: any[]) => mockHandleEmergency(...args),
}));

const mockHandleAIConversation = vi.fn().mockResolvedValue({ success: true });
vi.mock('@/ai/handlers/conversation-handler', () => ({
    handleAIConversation: (...args: any[]) => mockHandleAIConversation(...args),
}));

const mockProcessCheckinResponse = vi.fn().mockResolvedValue({ processed: false });
vi.mock('@/ai/handlers/checkin-response-handler', () => ({
    processCheckinResponse: (...args: any[]) => mockProcessCheckinResponse(...args),
}));

const mockHandleOptOut = vi.fn().mockResolvedValue({ success: true });
vi.mock('@/ai/handlers/opt-out-handler', () => ({
    handleOptOut: (...args: any[]) => mockHandleOptOut(...args),
}));

// ===================================================================
// Helper: Create a fully chainable Supabase mock
// ===================================================================
function createSupabaseMock(opts: {
    systemMsgCount?: number;
    rateLimitCount?: number;
    patientProtocol?: any;
} = {}) {
    const { systemMsgCount = 5, rateLimitCount = 0, patientProtocol = null } = opts;

    let currentTable = '';
    let countCallIndex = 0;

    const mock: any = {
        from: vi.fn((table: string) => {
            currentTable = table;
            return mock;
        }),
        select: vi.fn(() => mock),
        insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
        update: vi.fn(() => mock),
        delete: vi.fn(() => mock),
        upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
        eq: vi.fn(() => mock),
        neq: vi.fn(() => mock),
        gt: vi.fn(() => mock),
        gte: vi.fn(() => mock),
        lt: vi.fn(() => mock),
        lte: vi.fn(() => mock),
        like: vi.fn(() => mock),
        ilike: vi.fn(() => mock),
        is: vi.fn(() => mock),
        in: vi.fn(() => mock),
        order: vi.fn(() => mock),
        limit: vi.fn(() => mock),
        maybeSingle: vi.fn(async () => {
            if (currentTable === 'patient_protocols') return { data: patientProtocol };
            return { data: null };
        }),
        single: vi.fn(async () => {
            if (currentTable === 'patient_protocols') return { data: patientProtocol };
            return { data: null };
        }),
    };

    // Make the mock awaitable (thenable) ONLY for select counts if needed, 
    // but better yet, handle it via vi.fn returns
    mock.eq.mockReturnValue(mock);
    mock.select.mockReturnValue(mock);
    
    // Most important: mock the actual return value of the chain
    // When we await the chain, it calls .then
    mock.then = (resolve: any) => {
        if (currentTable === 'messages') {
            countCallIndex++;
            // First call is usually rate limit (sender='patient'), second is system messages check
            if (countCallIndex === 1) return resolve({ count: rateLimitCount, data: null, error: null });
            return resolve({ count: systemMsgCount, data: null, error: null });
        }
        return resolve({ data: [], error: null });
    };

    return mock;
}

// ===================================================================
// Import the function under test (after all mocks are set up)
// ===================================================================
import { handlePatientReply } from '@/ai/handle-patient-reply';

// ===================================================================
// Test Suite
// ===================================================================
describe('WhatsApp Integration Flows', () => {
    const mockPhone = 'whatsapp:+5511999999999';
    const mockName = 'Teste User';

    const activePatientRow = {
        id: 'active-id',
        status: 'active',
        full_name: mockName,
        whatsapp_number: mockPhone,
        plan: 'premium',
        priority: 2,
        needs_attention: false,
        total_points: 100,
        level: 'Iniciante',
        badges: [],
        last_message: 'Oi',
        last_message_timestamp: new Date().toISOString(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ===================================================================
    it('Scenario 1: New Patient (Unregistered) — sends registration link', async () => {
        mockContainer.supabase = createSupabaseMock();
        mockFindPatientByPhone.mockResolvedValue(null);

        const result = await handlePatientReply(mockPhone, 'Olá', mockName);

        expect(result.success).toBe(true);
        expect(mockSendWhatsappMessage).toHaveBeenCalledWith(
            mockPhone,
            expect.stringContaining('cadastro')
        );
    });

    // ===================================================================
    it('Scenario 2: First Contact — sends welcome message', async () => {
        mockContainer.supabase = createSupabaseMock({ systemMsgCount: 0, rateLimitCount: 0 });
        mockFindPatientByPhone.mockResolvedValue(activePatientRow);

        const result = await handlePatientReply(mockPhone, 'Olá', mockName);

        expect(result.success).toBe(true);
        expect(mockSendWelcomeMessage).toHaveBeenCalled();
    });

    // ===================================================================
    it('Scenario 3: Emergency keyword — escalates immediately', async () => {
        mockContainer.supabase = createSupabaseMock({ systemMsgCount: 5, rateLimitCount: 0 });
        mockFindPatientByPhone.mockResolvedValue(activePatientRow);

        const result = await handlePatientReply(mockPhone, 'Estou com dor no peito', mockName);

        expect(result.success).toBe(true);
        expect(mockHandleEmergency).toHaveBeenCalled();
    });

    // ===================================================================
    it('Scenario 4: Social greeting — delegates to AI conversation', async () => {
        mockContainer.supabase = createSupabaseMock({ systemMsgCount: 5, rateLimitCount: 0 });
        mockFindPatientByPhone.mockResolvedValue(activePatientRow);

        mockClassifyMessageIntent.mockResolvedValue({
            intent: 'social', confidence: 0.9, reason: 'Saudação',
        });

        const result = await handlePatientReply(mockPhone, 'Bom dia', mockName);

        expect(result.success).toBe(true);
        expect(mockHandleAIConversation).toHaveBeenCalled();
    });

    // ===================================================================
    it('Scenario 5: Question — delegates to AI conversation handler', async () => {
        mockContainer.supabase = createSupabaseMock({ systemMsgCount: 5, rateLimitCount: 0 });
        mockFindPatientByPhone.mockResolvedValue(activePatientRow);

        mockClassifyMessageIntent.mockResolvedValue({
            intent: 'question', confidence: 0.8, reason: 'Pergunta',
        });

        const result = await handlePatientReply(mockPhone, 'Como funciona?', mockName);

        expect(result.success).toBe(true);
        expect(mockHandleAIConversation).toHaveBeenCalled();
    });

    // ===================================================================
    it('Scenario 6: Check-in Response — routes to checkin handler', async () => {
        mockContainer.supabase = createSupabaseMock({ systemMsgCount: 5, rateLimitCount: 0 });
        
        // Mock patient with active check-in metadata
        const patientWithCheckin = {
            ...activePatientRow,
            last_checkin_type: 'Hidratação',
            last_checkin_at: new Date().toISOString()
        };
        mockFindPatientByPhone.mockResolvedValue(patientWithCheckin);

        // Simular que o handler processou com sucesso
        mockProcessCheckinResponse.mockResolvedValueOnce({ processed: true });

        const result = await handlePatientReply(mockPhone, 'A', mockName);

        expect(result.success).toBe(true);
        expect(mockProcessCheckinResponse).toHaveBeenCalled();
    });

    // ===================================================================
    it('Scenario 7: SAIR — opt-out command', async () => {
        mockContainer.supabase = createSupabaseMock({ systemMsgCount: 5, rateLimitCount: 0 });
        mockFindPatientByPhone.mockResolvedValue(activePatientRow);

        const result = await handlePatientReply(mockPhone, 'SAIR', mockName);

        expect(result.success).toBe(true);
        expect(mockHandleOptOut).toHaveBeenCalled();
    });
});

