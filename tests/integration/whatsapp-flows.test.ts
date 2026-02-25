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
        ai: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
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

const mockHandleProtocolGamification = vi.fn().mockResolvedValue(false);
vi.mock('@/ai/handlers/gamification-handler', () => ({
    handleProtocolGamification: (...args: any[]) => mockHandleProtocolGamification(...args),
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

    // Track which "from" table is active
    let currentTable = '';

    const mock: any = {};

    // All chainable methods return `mock` itself
    const chainMethods = ['select', 'insert', 'update', 'eq', 'gte', 'lte', 'ilike', 'order', 'limit'];
    for (const method of chainMethods) {
        mock[method] = vi.fn((..._args: any[]) => mock);
    }

    // `from` sets the current table context
    mock.from = vi.fn((table: string) => {
        currentTable = table;
        return mock;
    });

    // Override `select` to handle count queries
    mock.select = vi.fn((...args: any[]) => {
        if (args[1]?.count === 'exact') {
            // Return a special thenable chain for count queries
            const countChain: any = {};
            const countMethods = ['eq', 'gte', 'lte', 'ilike'];
            for (const m of countMethods) {
                countChain[m] = vi.fn(() => countChain);
            }
            // Make it thenable (awaitable)
            countChain.then = (resolve: any) => {
                if (currentTable === 'messages') {
                    // We don't know if it's rate limit or system msg count from the chain
                    // Rate limit comes first, then system msg count (for non-first-contact)
                    // But we can just return a safe low number for rate limit
                    // and the systemMsgCount for the second call
                    // Since each call creates a new countChain, we use a counter
                    countCallIndex++;
                    if (countCallIndex === 1) {
                        return resolve({ count: rateLimitCount }); // Rate limit check
                    }
                    return resolve({ count: systemMsgCount }); // System msg count
                }
                return resolve({ count: 0 });
            };
            return countChain;
        }
        return mock;
    });

    let countCallIndex = 0;

    // `single` for patient_protocols query
    mock.single = vi.fn(async () => {
        if (currentTable === 'patient_protocols') {
            return { data: patientProtocol };
        }
        return { data: null };
    });

    // `maybeSingle` for idempotency check and recent protocol message
    mock.maybeSingle = vi.fn(async () => {
        return { data: null };
    });

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
        expect(mockClassifyMessageIntent).not.toHaveBeenCalled();
    });

    // ===================================================================
    it('Scenario 2: First Contact — sends welcome message', async () => {
        mockContainer.supabase = createSupabaseMock({ systemMsgCount: 0, rateLimitCount: 0 });
        mockFindPatientByPhone.mockResolvedValue(activePatientRow);

        const result = await handlePatientReply(mockPhone, 'Olá', mockName);

        expect(result.success).toBe(true);
        expect(mockSendWelcomeMessage).toHaveBeenCalled();
        expect(mockClassifyMessageIntent).not.toHaveBeenCalled();
    });

    // ===================================================================
    it('Scenario 3: Emergency keyword — escalates immediately', async () => {
        mockContainer.supabase = createSupabaseMock({ systemMsgCount: 5, rateLimitCount: 0 });
        mockFindPatientByPhone.mockResolvedValue(activePatientRow);

        const result = await handlePatientReply(mockPhone, 'Estou com dor no peito', mockName);

        expect(result.success).toBe(true);
        expect(mockHandleEmergency).toHaveBeenCalled();
        expect(mockClassifyMessageIntent).not.toHaveBeenCalled();
    });

    // ===================================================================
    it('Scenario 4: Social greeting — returns quick reply', async () => {
        mockContainer.supabase = createSupabaseMock({ systemMsgCount: 5, rateLimitCount: 0 });
        mockFindPatientByPhone.mockResolvedValue(activePatientRow);

        mockClassifyMessageIntent.mockResolvedValue({
            intent: 'social', confidence: 0.9, reason: 'Saudação',
        });

        const result = await handlePatientReply(mockPhone, 'Bom dia', mockName);

        expect(result.success).toBe(true);
        expect(mockSendWhatsappMessage).toHaveBeenCalledWith(mockPhone, 'Olá! 😊 Como posso te ajudar?');
        expect(mockGenerateChatbotReply).not.toHaveBeenCalled();
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
    it('Scenario 6: Check-in Response — routes to gamification handler', async () => {
        mockContainer.supabase = createSupabaseMock({ systemMsgCount: 5, rateLimitCount: 0 });
        mockFindPatientByPhone.mockResolvedValue(activePatientRow);

        mockClassifyMessageIntent.mockResolvedValue({
            intent: 'checkin_response', confidence: 0.95, reason: 'Resposta a check-in',
        });

        // Simular que o handler processou com sucesso
        mockHandleProtocolGamification.mockResolvedValueOnce(true);

        const result = await handlePatientReply(mockPhone, 'A', mockName);

        expect(result.success).toBe(true);
        expect(mockHandleProtocolGamification).toHaveBeenCalled();
    });

    // ===================================================================
    it('Scenario 7: SAIR — opt-out command (placeholder logic)', async () => {
        // Atualmente o roteiro marca como PENDENTE, mas vamos testar o routing se existisse
        // Como não há switch específico para SAIR no código atual, ele cairia na IA
        mockContainer.supabase = createSupabaseMock({ systemMsgCount: 5, rateLimitCount: 0 });
        mockFindPatientByPhone.mockResolvedValue(activePatientRow);

        mockClassifyMessageIntent.mockResolvedValue({
            intent: 'social', confidence: 0.5, reason: 'Opt-out?',
        });

        const result = await handlePatientReply(mockPhone, 'SAIR', mockName);

        expect(result.success).toBe(true);
        // Cai no fallback de IA ou Social por enquanto
    });
});

