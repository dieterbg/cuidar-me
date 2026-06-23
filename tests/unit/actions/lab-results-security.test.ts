import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabase } from '../../helpers/supabase-mock-helper';

const mockContainer = {
    supabase: null as any,
};

vi.mock('@/lib/supabase-server-utils', () => ({
    createServiceRoleClient: vi.fn(() => mockContainer.supabase),
}));

vi.mock('@/ai/flows/extract-lab-results', () => ({
    extractLabResults: vi.fn().mockResolvedValue({
        success: true,
        extractedData: { glucoseFasting: 90 },
        alerts: [],
    }),
    getAlertPriority: vi.fn().mockResolvedValue(1),
}));

vi.mock('@/lib/twilio', () => ({
    sendWhatsappMessage: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/authz', () => ({
    authErrorMessage: vi.fn((error: unknown) => error instanceof Error ? error.message : 'Erro inesperado'),
    requirePatientOwnerOrStaff: vi.fn().mockResolvedValue({ userId: 'user-1', role: 'paciente', isStaff: false }),
}));

import { processLabResultUpload } from '@/ai/actions/lab-results';
import { extractLabResults } from '@/ai/flows/extract-lab-results';
import { sendWhatsappMessage } from '@/lib/twilio';
import { requirePatientOwnerOrStaff } from '@/lib/authz';

describe('processLabResultUpload security', () => {
    let mockFrom: ReturnType<typeof createMockSupabase>['mockFrom'];

    beforeEach(() => {
        vi.clearAllMocks();
        const sb = createMockSupabase();
        mockContainer.supabase = sb.mock;
        mockFrom = sb.mockFrom;
    });

    it('bloqueia usuario sem acesso antes de OCR e WhatsApp', async () => {
        (requirePatientOwnerOrStaff as any).mockRejectedValueOnce(new Error('Acesso negado'));

        const result = await processLabResultUpload('p1', 'YWJj', 'whatsapp:+5511999999999');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Acesso negado');
        expect(extractLabResults).not.toHaveBeenCalled();
        expect(sendWhatsappMessage).not.toHaveBeenCalled();
    });

    it('usa WhatsApp do paciente salvo no banco, nao o parametro externo', async () => {
        mockFrom('patients', {
            data: {
                comorbidities: [],
                full_name: 'Maria Silva',
                plan: 'premium',
                whatsapp_number: 'whatsapp:+5511888888888',
            },
            error: null,
        });
        mockFrom('lab_results', { data: { id: 'lab-1' }, error: null });
        mockFrom('messages', { data: null, error: null });

        const result = await processLabResultUpload('p1', 'YWJj', 'whatsapp:+5599999999999');

        expect(result.success).toBe(true);
        expect(sendWhatsappMessage).toHaveBeenCalledWith(
            'whatsapp:+5511888888888',
            expect.any(String)
        );
    });

    it('rejeita imagem muito grande antes de autenticar', async () => {
        const result = await processLabResultUpload('p1', 'a'.repeat(10_000_001), 'whatsapp:+5511999999999');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Imagem do exame muito grande');
        expect(requirePatientOwnerOrStaff).not.toHaveBeenCalled();
    });
});
