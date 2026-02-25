import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabase } from '../../helpers/supabase-mock-helper';

// --- Mock container ---
const mockContainer = { supabase: null as any };

vi.mock('@/lib/supabase-server', () => ({
    createClient: vi.fn(() => mockContainer.supabase),
}));

vi.mock('@/lib/twilio', () => ({
    sendWhatsappMessage: vi.fn().mockResolvedValue(true),
}));

import { getMessages, addMessage, addMessageAndSendWhatsapp } from '@/ai/actions/messages';
import { sendWhatsappMessage } from '@/lib/twilio';

describe('Server Action: Messages', () => {
    let mockFrom: ReturnType<typeof createMockSupabase>['mockFrom'];

    beforeEach(() => {
        vi.clearAllMocks();
        const sb = createMockSupabase();
        mockContainer.supabase = sb.mock;
        mockFrom = sb.mockFrom;
    });

    // =================================================================
    // MSG-01: getMessages busca mensagens ordenadas
    // =================================================================
    describe('getMessages', () => {
        it('MSG-01: busca mensagens de paciente ordenadas por timestamp', async () => {
            mockFrom('messages', {
                data: [
                    { id: 'm1', sender: 'patient', text: 'Olá', created_at: '2026-01-01T08:00:00Z' },
                    { id: 'm2', sender: 'me', text: 'Bom dia!', created_at: '2026-01-01T08:01:00Z' },
                ],
                error: null,
            });

            const result = await getMessages('p1');

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('m1');
        });

        it('retorna array vazio se erro', async () => {
            mockFrom('messages', { data: null, error: { message: 'error' } });

            const result = await getMessages('p1');
            expect(result).toEqual([]);
        });
    });

    // =================================================================
    // MSG-03: addMessage salva mensagem do sistema
    // =================================================================
    describe('addMessage', () => {
        it('MSG-03: salva mensagem com sender e atualiza last_message', async () => {
            mockFrom('messages', { data: null, error: null });
            mockFrom('patients', { data: null, error: null });

            const result = await addMessage('p1', { sender: 'me', text: 'Lembrete' });

            expect(result.success).toBe(true);
            expect(mockContainer.supabase.from).toHaveBeenCalledWith('messages');
        });

        it('retorna erro se inserção falha', async () => {
            mockFrom('messages', { data: null, error: { message: 'insert error' } });

            const result = await addMessage('p1', { sender: 'patient', text: 'Olá' });

            expect(result.success).toBe(false);
            expect(result.error).toBe('insert error');
        });
    });

    // =================================================================
    // MSG-02: addMessageAndSendWhatsapp envia + salva
    // =================================================================
    describe('addMessageAndSendWhatsapp', () => {
        it('MSG-02: envia via Twilio e salva no banco', async () => {
            mockFrom('messages', { data: null, error: null });
            mockFrom('patients', { data: null, error: null });

            const result = await addMessageAndSendWhatsapp('p1', 'whatsapp:+5511999', 'Olá!');

            expect(result.success).toBe(true);
            expect(sendWhatsappMessage).toHaveBeenCalledWith('whatsapp:+5511999', 'Olá!');
        });

        it('falha se Twilio retorna false', async () => {
            (sendWhatsappMessage as any).mockResolvedValueOnce(false);

            const result = await addMessageAndSendWhatsapp('p1', 'whatsapp:+5511999', 'Olá');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Twilio');
        });
    });
});
