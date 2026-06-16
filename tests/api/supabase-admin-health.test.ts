import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/debug/supabase-admin-health/route';

vi.mock('@/lib/supabase-server-utils', () => ({
  createServiceRoleClient: vi.fn(),
}));

import { createServiceRoleClient } from '@/lib/supabase-server-utils';

describe('API: Supabase admin health', () => {
  const CRON_SECRET = 'test-secret';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
  });

  function mockSupabase(options?: { tableError?: Error; authError?: Error }) {
    const select = vi.fn().mockResolvedValue({
      data: null,
      error: options?.tableError || null,
    });

    const client = {
      from: vi.fn().mockReturnValue({ select }),
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: [] },
            error: options?.authError || null,
          }),
        },
      },
    };

    (createServiceRoleClient as any).mockReturnValue(client);
    return client;
  }

  it('returns 500 when CRON_SECRET is missing', async () => {
    delete process.env.CRON_SECRET;
    const req = new NextRequest('http://localhost/api/debug/supabase-admin-health');

    const res = await GET(req);

    expect(res.status).toBe(500);
  });

  it('returns 401 when token is invalid', async () => {
    const req = new NextRequest('http://localhost/api/debug/supabase-admin-health', {
      headers: { Authorization: 'Bearer wrong' },
    });

    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('returns ok when table and auth-admin checks pass', async () => {
    const client = mockSupabase();
    const req = new NextRequest('http://localhost/api/debug/supabase-admin-health', {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.checks.patientsRead.ok).toBe(true);
    expect(data.checks.profilesRead.ok).toBe(true);
    expect(data.checks.authAdminRead.ok).toBe(true);
    expect(client.from).toHaveBeenCalledWith('patients');
    expect(client.from).toHaveBeenCalledWith('profiles');
    expect(client.auth.admin.listUsers).toHaveBeenCalledWith({ page: 1, perPage: 1 });
  });

  it('returns 500 when a Supabase check fails without exposing data rows', async () => {
    mockSupabase({ authError: new Error('admin failed') });
    const req = new NextRequest('http://localhost/api/debug/supabase-admin-health', {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.ok).toBe(false);
    expect(data.checks.authAdminRead).toEqual({ ok: false, error: 'admin failed' });
    expect(JSON.stringify(data)).not.toContain('users');
  });
});
