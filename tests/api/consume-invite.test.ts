import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase-server', () => ({
    createClient: vi.fn(),
}));

vi.mock('@/lib/supabase-server-utils', () => ({
    createServiceRoleClient: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
    loggers: {
        onboarding: {
            warn: vi.fn(),
            info: vi.fn(),
            error: vi.fn(),
            security: vi.fn(),
            audit: vi.fn(),
        },
    },
}));

import { POST } from '@/app/api/onboarding/consume-invite/route';
import { createClient } from '@/lib/supabase-server';
import { createServiceRoleClient } from '@/lib/supabase-server-utils';

describe('API: consume invite', () => {
    let inviteTable: any;
    let profileTable: any;
    let patientTable: any;

    beforeEach(() => {
        vi.clearAllMocks();

        (createClient as any).mockReturnValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: { id: 'user-1' } },
                    error: null,
                }),
            },
        });

        const inviteChain = {
            update: vi.fn(),
            eq: vi.fn(),
            is: vi.fn(),
            gt: vi.fn(),
            select: vi.fn(),
            single: vi.fn().mockResolvedValue({
                data: { id: 'invite-1', token: 'tok-1', plan: 'premium' },
                error: null,
            }),
        };
        inviteChain.update.mockReturnValue(inviteChain);
        inviteChain.eq.mockReturnValue(inviteChain);
        inviteChain.is.mockReturnValue(inviteChain);
        inviteChain.gt.mockReturnValue(inviteChain);
        inviteChain.select.mockReturnValue(inviteChain);
        inviteTable = inviteChain;

        profileTable = {
            update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
            }),
        };

        patientTable = {
            update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
            }),
        };

        (createServiceRoleClient as any).mockReturnValue({
            from: vi.fn((table: string) => {
                if (table === 'invite_tokens') return inviteTable;
                if (table === 'profiles') return profileTable;
                if (table === 'patients') return patientTable;
                throw new Error(`Unexpected table ${table}`);
            }),
            auth: {
                admin: {
                    updateUserById: vi.fn(),
                },
            },
        });
    });

    it('claims a valid invite atomically before applying plan changes', async () => {
        const req = new NextRequest('http://localhost/api/onboarding/consume-invite', {
            method: 'POST',
            body: JSON.stringify({ token: 'tok-1' }),
        });

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data).toEqual({ success: true, plan: 'premium' });
        expect(inviteTable.update).toHaveBeenCalledWith(expect.objectContaining({
            used_by: 'user-1',
            used_at: expect.any(String),
        }));
        expect(inviteTable.eq).toHaveBeenCalledWith('token', 'tok-1');
        expect(inviteTable.is).toHaveBeenCalledWith('used_at', null);
        expect(inviteTable.gt).toHaveBeenCalledWith('expires_at', expect.any(String));
        expect(inviteTable.select).toHaveBeenCalledWith('*');
    });
});
