import { NextRequest, NextResponse } from 'next/server';
import { validateCronAuth } from '@/lib/cron-auth';
import { createServiceRoleClient } from '@/lib/supabase-server-utils';

export const dynamic = 'force-dynamic';

type HealthCheck = {
  ok: boolean;
  error?: string;
};

function sanitizeError(error: unknown): string {
  if (!error) return 'unknown_error';
  if (typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
    return (error as any).message.slice(0, 120);
  }
  return 'unknown_error';
}

export async function GET(request: NextRequest) {
  const unauthorized = validateCronAuth(request);
  if (unauthorized) {
    return unauthorized;
  }

  const supabase = createServiceRoleClient();
  const checks: Record<string, HealthCheck> = {};

  const patientsCheck = await supabase
    .from('patients')
    .select('id', { count: 'exact', head: true });
  checks.patientsRead = patientsCheck.error
    ? { ok: false, error: sanitizeError(patientsCheck.error) }
    : { ok: true };

  const profilesCheck = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true });
  checks.profilesRead = profilesCheck.error
    ? { ok: false, error: sanitizeError(profilesCheck.error) }
    : { ok: true };

  const usersCheck = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
  checks.authAdminRead = usersCheck.error
    ? { ok: false, error: sanitizeError(usersCheck.error) }
    : { ok: true };

  const ok = Object.values(checks).every((check) => check.ok);
  return NextResponse.json(
    {
      ok,
      checks,
      checkedAt: new Date().toISOString(),
    },
    { status: ok ? 200 : 500 }
  );
}
