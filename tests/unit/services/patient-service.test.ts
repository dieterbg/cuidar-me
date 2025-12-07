import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findPatientByPhone } from '@/services/patient-service';

describe('PatientService', () => {
    const mockSupabase = {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn(),
                })),
            })),
        })),
    } as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return existing patient if found', async () => {
        const mockPatient = { id: '123', whatsapp_number: '5511999999999' };

        // Mock chain for select().eq().single()
        const singleMock = vi.fn().mockResolvedValue({ data: mockPatient });
        const eqMock = vi.fn().mockReturnValue({ single: singleMock });
        const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
        const fromMock = vi.fn().mockReturnValue({ select: selectMock });
        mockSupabase.from = fromMock;

        const result = await findPatientByPhone(mockSupabase, '5511999999999');

        expect(result).toEqual(mockPatient);
        expect(fromMock).toHaveBeenCalledWith('patients');
        expect(eqMock).toHaveBeenCalledWith('whatsapp_number', '5511999999999');
    });

    it('should return null if patient not found', async () => {
        // Mock select finding nothing
        const selectSingleMock = vi.fn().mockResolvedValue({ data: null });
        const selectEqMock = vi.fn().mockReturnValue({ single: selectSingleMock });
        const selectMock = vi.fn().mockReturnValue({ eq: selectEqMock });
        const fromMock = vi.fn().mockReturnValue({ select: selectMock });
        mockSupabase.from = fromMock;

        const result = await findPatientByPhone(mockSupabase, '5511888888888');

        expect(result).toBeNull();
        expect(fromMock).toHaveBeenCalledWith('patients');
    });
});
