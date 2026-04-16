import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findPatientByPhone } from '@/services/patient-service';

describe('PatientService', () => {
    // Create a fully chainable Supabase mock
    const createMockSupabase = () => {
        const chain: any = {};
        const methods = ['from', 'select', 'in', 'ilike', 'eq', 'order', 'limit', 'maybeSingle', 'single'];
        for (const method of methods) {
            chain[method] = vi.fn(() => chain);
        }
        return chain;
    };

    let mockSupabase: any;

    beforeEach(() => {
        mockSupabase = createMockSupabase();
        vi.clearAllMocks();
    });

    it('should return existing patient if found', async () => {
        const mockPatient = { id: '123', whatsapp_number: '5511999999999' };

        // Define what maybeSingle returns
        mockSupabase.maybeSingle.mockResolvedValue({ data: mockPatient, error: null });

        const result = await findPatientByPhone(mockSupabase, '5511999999999');

        expect(result).toEqual(mockPatient);
        expect(mockSupabase.from).toHaveBeenCalledWith('patients');
        expect(mockSupabase.in).toHaveBeenCalled();
    });

    it('should return null if patient not found', async () => {
        // Mock chain finding nothing
        mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });

        const result = await findPatientByPhone(mockSupabase, '5511888888888');

        expect(result).toBeNull();
        expect(mockSupabase.from).toHaveBeenCalledWith('patients');
        expect(mockSupabase.ilike).toHaveBeenCalled();
    });
});
