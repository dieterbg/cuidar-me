'use server';


import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { transformPatientFromSupabase } from '@/lib/supabase-transforms';
import { normalizeBrazilianNumber } from '@/lib/utils';
import { uuidFromHash } from '@/lib/deterministic-id';
import { parsePatientRegistrationPhone, type PatientRegistrationInput, type PatientRegistrationResult } from '@/lib/patient-registration';
import type { Patient, HealthMetric, SentVideo, Message } from '@/lib/types';
import { addHealthMetricRecord } from '@/lib/health-metrics-store';
import { attachOpenAttentionRequests, loadPatientListRows } from '@/lib/attention-queue-store';
import { authErrorMessage, getAuthenticatedUserAndRole, requireAdmin, requirePatientOwnerOrStaff, requireStaff, STAFF_ROLES } from '@/lib/authz';

// Force recompile: 2025-11-25T00:45:00
// ... (código anterior)

export async function getPatients(): Promise<Patient[]> {
    const supabase = createClient();

    // Check if user is admin/staff to use admin client
    const { data: { user } } = await supabase.auth.getUser();

    let queryBuilder;

    if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role === 'admin' || profile?.role === 'equipe_saude' || profile?.role === 'assistente') {
            const adminSupabase = createAdminClient();
            queryBuilder = adminSupabase.from('patients').select('*');
        } else {
            queryBuilder = supabase.from('patients').select('*');
        }
    } else {
        queryBuilder = supabase.from('patients').select('*');
    }

    const { data, error } = await queryBuilder.order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching patients:', error);
        return [];
    }

    return (data || []).map(transformPatientFromSupabase);
}

export async function getPatientsWithAttention(): Promise<Patient[]> {
    await requireStaff();
    const supabase = createAdminClient();
    const rows = await loadPatientListRows(supabase);
    return attachOpenAttentionRequests(supabase, rows.map(transformPatientFromSupabase));
}

export async function getPatientProfileByUserId(userId: string): Promise<Patient | null> {
    const supabase = createClient();
    const auth = await getAuthenticatedUserAndRole();
    const callerIsStaff = !!auth.role && STAFF_ROLES.includes(auth.role as any);

    if (!callerIsStaff && auth.userId !== userId) {
        throw new Error('Acesso negado — você só pode ver seu próprio perfil');
    }

    const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error) {
        console.error('Error fetching patient profile by user id:', error);
        return null;
    }

    return transformPatientFromSupabase(data);
}

// ... (código anterior)

export async function getPatientDetails(patientId: string): Promise<{
    patient: Patient | null;
    metrics: HealthMetric[];
    sentVideos: SentVideo[];
    messages: Message[];
}> {
    const access = await requirePatientOwnerOrStaff(patientId);
    const supabase = createAdminClient();

    // Fetch patient
    const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('*, patient_protocols(*)')
        .eq('id', patientId)
        .eq('patient_protocols.is_active', true)
        .single();

    if (patientError || !patientData) {
        console.error('Error fetching patient details:', patientError);
        return { patient: null, metrics: [], sentVideos: [], messages: [] };
    }

    // Fetch health metrics
    const { data: metricsData } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('patient_id', patientId)
        .order('date', { ascending: false });

    // PII redacted: dados de métricas não logados em plaintext
    console.log(`[getPatientDetails] Metrics found: ${metricsData?.length ?? 0}`);

    // Fetch sent videos
    const { data: sentVideosData } = await supabase
        .from('sent_videos')
        .select('*')
        .eq('patient_id', patientId)
        .order('sent_at', { ascending: false });

    // Fetch messages (NEW)
    const { data: messagesData } = await supabase
        .from('messages')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(50); // Limit to last 50 messages for performance

    const transformed = transformPatientFromSupabase(patientData);
    const patient = access.isStaff ? (await attachOpenAttentionRequests(supabase, [transformed]))[0] : transformed;

    // Map protocol from join if exists
    if (patientData.patient_protocols && patientData.patient_protocols.length > 0) {
        const activeProtocol = patientData.patient_protocols[0];
        patient.protocol = {
            protocolId: activeProtocol.protocol_id,
            startDate: activeProtocol.start_date,
            currentDay: activeProtocol.current_day,
            isActive: activeProtocol.is_active,
            weightGoal: activeProtocol.weight_goal_kg
        };
        // If the patient record doesn't have a weightGoal yet, use the one from the protocol for UI continuity
        if (!patient.weightGoal) {
            patient.weightGoal = activeProtocol.weight_goal_kg;
        }
    }

    const metrics = metricsData?.map(m => ({
        id: m.id,
        date: m.date,
        weight: m.weight_kg, // Corrigido mapeamento de weight
        glucoseLevel: m.glucose_level,
        waistCircumference: m.waist_circumference_cm,
        sleepDuration: m.sleep_duration_hours,
        physicalActivity: m.physical_activity_note,
        mealCheckin: m.meal_checkin,
    })) || [];

    const sentVideos = sentVideosData?.map(sv => ({
        id: sv.id,
        videoId: sv.video_id,
        patientId: sv.patient_id,
        sentAt: sv.sent_at,
        feedback: sv.feedback,
    })) || [];

    const messages = messagesData?.map(msg => ({
        id: msg.id,
        patientId: msg.patient_id,
        sender: msg.sender,
        text: msg.message_content || msg.text, // Fallback
        timestamp: msg.created_at,
        mediaUrl: msg.media_url,
        mediaType: msg.media_type,
        isRead: msg.is_read
    })) || [];

    return { patient, metrics, sentVideos, messages };
}

export async function updatePatient(patientId: string, updates: Partial<Patient>): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();
    const access = await requirePatientOwnerOrStaff(patientId);

    // Mapear campos do frontend (camelCase) para o banco (snake_case)
    // CRITICAL: Create a NEW object to avoid sending any extra fields
    const dbUpdates: any = {};

    // Explicit mapping
    if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
    if (updates.whatsappNumber !== undefined) {
        dbUpdates.whatsapp_number = normalizeBrazilianNumber(updates.whatsappNumber);
    }
    if (updates.birthDate !== undefined) dbUpdates.birth_date = updates.birthDate;
    if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
    if (updates.height !== undefined) dbUpdates.height_cm = updates.height;
    if (updates.initialWeight !== undefined) dbUpdates.initial_weight_kg = updates.initialWeight;
    if (updates.healthConditions !== undefined) dbUpdates.health_conditions = updates.healthConditions;
    if (updates.allergies !== undefined) dbUpdates.allergies = updates.allergies;
    if (access.isStaff && updates.status !== undefined) dbUpdates.status = updates.status;
    if (access.isStaff && updates.riskLevel !== undefined) dbUpdates.risk_level = updates.riskLevel;
    if (access.isStaff && updates.weightGoal !== undefined) dbUpdates.weight_goal_kg = updates.weightGoal;
    if (updates.goal !== undefined) dbUpdates.goal = updates.goal || null;
    if (updates.waist !== undefined) dbUpdates.waist_circumference_cm = updates.waist;
    if (updates.medications !== undefined) dbUpdates.medications = updates.medications;

    // Handle subscription if present (it's a JSON column usually, but let's check schema)
    // Assuming subscription is stored in columns or a jsonb column. 
    // If updates.plan is passed directly:
    if (access.isStaff && (updates as any).plan) dbUpdates.plan = (updates as any).plan;

    // PII redacted: payload de atualização não logado (pode conter nome, telefone)
    console.log("Updating patient fields:", Object.keys(dbUpdates));

    if (Object.keys(dbUpdates).length === 0) {
        return { success: true }; // Nada para atualizar
    }

    // Check permissions
    const { data: { user } } = await supabase.auth.getUser();
    let updateBuilder;

    if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role === 'admin' || profile?.role === 'equipe_saude') {
            const adminSupabase = createAdminClient();
            updateBuilder = adminSupabase.from('patients').update(dbUpdates).eq('id', patientId);
        } else {
            updateBuilder = supabase.from('patients').update(dbUpdates).eq('id', patientId);
        }
    } else {
        updateBuilder = supabase.from('patients').update(dbUpdates).eq('id', patientId);
    }

    const { error } = await updateBuilder;

    if (error) {
        console.error('Error updating patient:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

export async function deletePatient(patientId: string): Promise<{ success: boolean; error?: string }> {
    await requireAdmin();
    const supabase = createClient();

    const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId);

    if (error) {
        console.error('Error deleting patient:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

function readConsentTimestamp(value: unknown): string | null {
    return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null;
}

export async function createPatientRecord(input: PatientRegistrationInput = {}): Promise<PatientRegistrationResult> {
    const unavailable = { success: false, error: 'Não foi possível concluir seu cadastro. Tente novamente.' } as const;
    try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user || user.is_anonymous) {
            return { success: false, error: 'Entre na sua conta para continuar o cadastro.' };
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
        if (profileError || !profile) return unavailable;
        if (profile.role !== 'paciente') {
            return { success: false, error: 'Este cadastro está disponível para contas de paciente.' };
        }

        const admin = createAdminClient();
        const findPatient = () => admin.from('patients').select('*').eq('user_id', user.id).maybeSingle();
        const { data: existing, error: lookupError } = await findPatient();
        if (lookupError) return unavailable;
        if (existing) return { success: true, patient: transformPatientFromSupabase(existing) };

        const metadata = user.user_metadata ?? {};
        const name = [input?.fullName, profile.display_name, metadata.displayName, metadata.full_name]
            .find(value => typeof value === 'string' && value.trim())?.trim();
        const rawPhone = [input?.whatsappNumber, profile.phone, metadata.phone]
            .find(value => typeof value === 'string' && value.trim())?.trim();
        const phone = rawPhone ? parsePatientRegistrationPhone(rawPhone) : null;
        const consent = {
            privacy_consent_at: readConsentTimestamp(profile.privacy_consent_at) ?? readConsentTimestamp(metadata.privacy_consent_at),
            whatsapp_consent_at: readConsentTimestamp(profile.whatsapp_consent_at) ?? readConsentTimestamp(metadata.whatsapp_consent_at),
            ai_consent_at: readConsentTimestamp(profile.ai_consent_at) ?? readConsentTimestamp(metadata.ai_consent_at),
        };
        const hasConsent = Boolean(consent.privacy_consent_at && consent.whatsapp_consent_at && consent.ai_consent_at);
        const missing = { name: !name || name.length > 160, phone: !phone, consent: !hasConsent && input?.acceptConsent !== true };
        if (missing.name || !phone || missing.consent) {
            return {
                success: false,
                missing,
                enteredPhone: missing.phone ? rawPhone?.slice(0, 32) : undefined,
                error: (rawPhone && !phone) ? 'Confira o DDD e o número de WhatsApp.' : undefined,
            };
        }

        // Detect the same number on old records stored without the canonical prefix.
        const international = phone.slice('whatsapp:'.length);
        const local = international.slice('+55'.length);
        const areaCode = local.slice(0, 2);
        const subscriber = local.slice(2);
        const localFormatted = `(${areaCode}) ${subscriber.slice(0, -4)}-${subscriber.slice(-4)}`;
        // Report the phone supplied by this account. Never return the conflicting record.
        const phoneConflict = {
            success: false,
            conflictingPhone: localFormatted,
        } as const;
        const { data: conflict, error: phoneError } = await admin.from('patients')
            .select('id')
            .in('whatsapp_number', [phone, international, international.slice(1), local, localFormatted])
            .limit(1)
            .maybeSingle();
        if (phoneError) return unavailable;
        if (conflict) {
            const { data: ownPatient, error } = await findPatient();
            if (error) return unavailable;
            return ownPatient ? { success: true, patient: transformPatientFromSupabase(ownPatient) } : phoneConflict;
        }

        const { data: invite, error: inviteError } = await admin
            .from('invite_tokens')
            .select('plan')
            .eq('used_by', user.id)
            .not('used_at', 'is', null)
            .order('used_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (inviteError) return unavailable;
        const plan = invite?.plan === 'premium' || invite?.plan === 'vip' ? invite.plan : 'freemium';
        const consentAt = hasConsent ? null : new Date().toISOString();
        const { data: created, error: insertError } = await admin.from('patients').insert({
            // One primary key per authenticated account keeps parallel attempts idempotent.
            id: uuidFromHash(['patient-registration', user.id]),
            user_id: user.id,
            email: user.email,
            full_name: name,
            whatsapp_number: phone,
            privacy_consent_at: consent.privacy_consent_at ?? consentAt,
            whatsapp_consent_at: consent.whatsapp_consent_at ?? consentAt,
            ai_consent_at: consent.ai_consent_at ?? consentAt,
            consent_version: hasConsent ? (profile.consent_version || metadata.consent_version || '2026-06-16') : '2026-06-16',
            consent_source: hasConsent ? (profile.consent_source || metadata.consent_source || 'patient_signup_form') : 'patient_activation_form',
            plan,
            status: 'active',
        }).select('*').single();
        if (!insertError && created) return { success: true, patient: transformPatientFromSupabase(created) };

        if (insertError?.code === '23505') {
            const { data: ownPatient, error: retryError } = await findPatient();
            if (retryError) return unavailable;
            if (ownPatient) return { success: true, patient: transformPatientFromSupabase(ownPatient) };
            return phoneConflict;
        }
        return unavailable;
    } catch {
        return unavailable;
    }
}

export async function addHealthMetric(
    patientId: string,
    data: {
        weight?: number;
        glucoseLevel?: number;
        waistCircumference?: number;
        sleepDuration?: number;
        physicalActivity?: string;
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        await requirePatientOwnerOrStaff(patientId);
    } catch (error) {
        return { success: false, error: authErrorMessage(error) };
    }

    return addHealthMetricRecord(patientId, data);
}
