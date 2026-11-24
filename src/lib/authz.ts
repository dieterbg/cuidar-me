import { createClient } from '@/lib/supabase-server';
import { createServiceRoleClient } from '@/lib/supabase-server-utils';
import { getProfileRole, STAFF_ROLES, type StaffRole } from '@/lib/profile-role';

export { STAFF_ROLES, type StaffRole, type AppRole } from '@/lib/profile-role';

// Centralize authorization here. Callers should prove session ownership or staff
// role before using any service-role client that can bypass RLS.
export class AuthorizationError extends Error {
    constructor(message = 'Acesso negado') {
        super(message);
        this.name = 'AuthorizationError';
    }
}

export class AuthenticationError extends Error {
    constructor(message = 'Não autenticado') {
        super(message);
        this.name = 'AuthenticationError';
    }
}

export async function getAuthenticatedUserAndRole(): Promise<{ userId: string; role: string | null }> {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user || user.is_anonymous) {
        throw new AuthenticationError();
    }

    return { userId: user.id, role: await getProfileRole(supabase, user.id) };
}

export async function requireAdmin(): Promise<string> {
    const { userId, role } = await getAuthenticatedUserAndRole();
    if (role !== 'admin') {
        throw new AuthorizationError('Acesso negado — apenas admin');
    }
    return userId;
}

export async function requireStaff(): Promise<{ userId: string; role: string | null }> {
    const auth = await getAuthenticatedUserAndRole();
    if (!auth.role || !STAFF_ROLES.includes(auth.role as StaffRole)) {
        throw new AuthorizationError('Acesso negado — apenas equipe autorizada');
    }
    return auth;
}

export async function requirePatientOwnerOrStaff(patientId: string): Promise<{ userId: string; role: string | null; isStaff: boolean }> {
    const auth = await getAuthenticatedUserAndRole();
    const isStaff = !!auth.role && STAFF_ROLES.includes(auth.role as StaffRole);
    if (isStaff) return { ...auth, isStaff: true };

    const supabaseAdmin = createServiceRoleClient();
    const { data: ownPatient } = await supabaseAdmin
        .from('patients')
        .select('id')
        .eq('id', patientId)
        .eq('user_id', auth.userId)
        .maybeSingle();

    if (!ownPatient) {
        throw new AuthorizationError('Acesso negado — paciente não pertence ao usuário');
    }

    return { ...auth, isStaff: false };
}

export function authErrorMessage(error: unknown): string {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
        return error.message;
    }
    return 'Erro inesperado';
}
