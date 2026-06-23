'use server';


import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { transformPatientFromSupabase } from '@/lib/supabase-transforms';
import { normalizeBrazilianNumber } from '@/lib/utils';
import type { Patient, HealthMetric, SentVideo, Message } from '@/lib/types';
import { addHealthMetricRecord } from '@/lib/health-metrics-store';
import { authErrorMessage, getAuthenticatedUserAndRole, requireAdmin, requirePatientOwnerOrStaff, STAFF_ROLES } from '@/lib/authz';

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
    await requirePatientOwnerOrStaff(patientId);
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

    const patient = transformPatientFromSupabase(patientData);

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

export async function createPatientRecord(patientData: Partial<Patient>): Promise<{ success: boolean; patientId?: string; error?: string }> {
    // PII redacted: patientData pode conter telefone, email, CPF
    console.log('createPatientRecord called');
    const supabase = createClient();
    let auth;
    try {
        auth = await getAuthenticatedUserAndRole();
    } catch (error: any) {
        return { success: false, error: error.message || 'Não autenticado' };
    }

    const callerIsStaff = !!auth.role && STAFF_ROLES.includes(auth.role as any);
    if (!callerIsStaff) {
        if (patientData.userId && patientData.userId !== auth.userId) {
            return { success: false, error: 'Acesso negado — não é permitido criar paciente para outro usuário.' };
        }
        patientData.userId = auth.userId;
    }

    const adminSupabase = createAdminClient(); // Use admin for checks to avoid RLS issues

    // Verify if user exists in auth.users using admin client
    if (patientData.userId) {
        try {
            const { data: user, error: userError } = await adminSupabase.auth.admin.getUserById(patientData.userId);
            if (userError || !user) {
                console.error('User not found in auth.users:', userError?.message);
                return { success: false, error: 'User not found' };
            }
            console.log('User verified in auth.users');

            // Check if profile exists
            const { data: profile, error: profileError } = await adminSupabase
                .from('profiles')
                .select('*')
                .eq('id', patientData.userId)
                .single();

            if (profileError || !profile) {
                console.error('Profile not found for user:', profileError?.message);
                // If profile is missing, try to create it manually (fallback)
                console.log('Attempting to create missing profile...');
                const { error: createProfileError } = await adminSupabase.from('profiles').insert({
                    id: patientData.userId,
                    email: patientData.email,
                    role: 'paciente', // Default role
                    display_name: patientData.fullName || '',
                    phone: patientData.whatsappNumber || '',
                    privacy_consent_at: patientData.privacyConsentAt || null,
                    whatsapp_consent_at: patientData.whatsappConsentAt || null,
                    ai_consent_at: patientData.aiConsentAt || null,
                    consent_version: patientData.consentVersion || null,
                    consent_source: patientData.consentSource || null,
                });

                if (createProfileError) {
                    console.error('Failed to create fallback profile:', createProfileError);
                    return { success: false, error: `Profile missing and creation failed: ${createProfileError.message}` };
                }
                console.log('Fallback profile created successfully.');
            } else {
                console.log('Profile verified');
            }

        } catch (err) {
            console.error('Error verifying user/profile:', err);
        }
    }

    // 1. Check if patient with this WhatsApp already exists
    if (patientData.whatsappNumber) {
        const { data: existingPatient, error: searchError } = await adminSupabase
            .from('patients')
            .select('*')
            .eq('whatsapp_number', patientData.whatsappNumber)
            .single();

        if (existingPatient) {
            console.log('Found existing patient with this WhatsApp');

            // Case A: Already linked to THIS user
            if (existingPatient.user_id === patientData.userId) {
                console.log('Patient already linked to this user. Returning success.');
                return { success: true, patientId: existingPatient.id };
            }

            // Case B: Linked to ANOTHER user
            if (existingPatient.user_id && existingPatient.user_id !== patientData.userId) {
                console.warn('Patient linked to another user');
                return { success: false, error: 'Este número de WhatsApp já está associado a outra conta.' };
            }

            // Case C: Unlinked (Ghost Patient) -> Claim it!
            if (!existingPatient.user_id) {
                console.log('Patient is unlinked. Claiming for authenticated user');

                const updateData: any = {
                    user_id: patientData.userId,
                    email: patientData.email,
                    status: 'pending', // Reset to pending to force onboarding review if needed? Or keep as is? Let's set to pending or active based on input.
                    // Update name if provided
                    full_name: patientData.fullName || existingPatient.full_name,
                    privacy_consent_at: patientData.privacyConsentAt || existingPatient.privacy_consent_at,
                    whatsapp_consent_at: patientData.whatsappConsentAt || existingPatient.whatsapp_consent_at,
                    ai_consent_at: patientData.aiConsentAt || existingPatient.ai_consent_at,
                    consent_version: patientData.consentVersion || existingPatient.consent_version,
                    consent_source: patientData.consentSource || existingPatient.consent_source,
                };

                const { error: updateError } = await adminSupabase
                    .from('patients')
                    .update(updateData)
                    .eq('id', existingPatient.id);

                if (updateError) {
                    console.error('Error claiming patient:', updateError);
                    return { success: false, error: 'Erro ao vincular paciente existente.' };
                }

                return { success: true, patientId: existingPatient.id };
            }
        }
    }

    // Mapear para snake_case também na criação
    const dbInsert: any = {};
    if (patientData.fullName) dbInsert.full_name = patientData.fullName;
    if (patientData.email) dbInsert.email = patientData.email;
    if (patientData.userId) dbInsert.user_id = patientData.userId;
    if (patientData.whatsappNumber) dbInsert.whatsapp_number = normalizeBrazilianNumber(patientData.whatsappNumber);
    if (patientData.birthDate) dbInsert.birth_date = patientData.birthDate;
    if (patientData.gender) dbInsert.gender = patientData.gender;
    if (patientData.height) dbInsert.height_cm = patientData.height;
    if (patientData.initialWeight) dbInsert.initial_weight_kg = patientData.initialWeight;
    if (patientData.healthConditions) dbInsert.health_conditions = patientData.healthConditions;
    if (patientData.allergies) dbInsert.allergies = patientData.allergies;
    if (patientData.status) dbInsert.status = patientData.status;
    if (patientData.goal) dbInsert.goal = patientData.goal;
    if (patientData.waist) dbInsert.waist_circumference_cm = patientData.waist;
    if (patientData.medications) dbInsert.medications = patientData.medications;
    if (patientData.privacyConsentAt) dbInsert.privacy_consent_at = patientData.privacyConsentAt;
    if (patientData.whatsappConsentAt) dbInsert.whatsapp_consent_at = patientData.whatsappConsentAt;
    if (patientData.aiConsentAt) dbInsert.ai_consent_at = patientData.aiConsentAt;
    if (patientData.consentVersion) dbInsert.consent_version = patientData.consentVersion;
    if (patientData.consentSource) dbInsert.consent_source = patientData.consentSource;

    // Default gamification if needed
    if (patientData.gamification) dbInsert.gamification = patientData.gamification;

    const { data, error } = await supabase
        .from('patients')
        .insert(dbInsert)
        .select()
        .single();

    if (error) {
        console.error('Error creating patient:', error);
        // Fallback for race condition
        if (error.code === '23505') { // Unique violation
            return { success: false, error: 'Este número de WhatsApp já está cadastrado.' };
        }
        return { success: false, error: error.message };
    }

    return { success: true, patientId: data.id };
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
