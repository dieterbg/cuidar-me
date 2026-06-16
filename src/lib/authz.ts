import { createClient } from '@/lib/supabase-server';
import { createServiceRoleClient } from '@/lib/supabase-server-utils';

export const STAFF_ROLES = ['admin', 'equipe_saude', 'assistente'] as const;
export type StaffRole = typeof STAFF_ROLES[number];
export type AppRole = StaffRole | 'paciente' | 'pendente';

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

export async function getAuthenticatedUserAndRole(): Promise<{ userId: string; role: AppRole | string | null }> {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        throw new AuthenticationError();
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

    return { userId: user.id, role: profile?.role ?? null };
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
