'use server';


import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { transformPatientFromSupabase } from '@/lib/supabase-transforms';
import type { Patient, HealthMetric, SentVideo, Message } from '@/lib/types';

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
    const supabase = createClient();

    // Fetch patient
    const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
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
        .order('recorded_at', { ascending: false });

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
        .order('timestamp', { ascending: false })
        .limit(50); // Limit to last 50 messages for performance

    const patient = transformPatientFromSupabase(patientData);

    const metrics = metricsData?.map(m => ({
        id: m.id,
        date: m.recorded_at,
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
        timestamp: msg.timestamp,
        mediaUrl: msg.media_url,
        mediaType: msg.media_type,
        isRead: msg.is_read
    })) || [];

    return { patient, metrics, sentVideos, messages };
}

export async function updatePatient(patientId: string, updates: Partial<Patient>): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    // Mapear campos do frontend (camelCase) para o banco (snake_case)
    // CRITICAL: Create a NEW object to avoid sending any extra fields
    const dbUpdates: any = {};

    // Explicit mapping
    if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
    if (updates.whatsappNumber !== undefined) dbUpdates.whatsapp_number = updates.whatsappNumber;
    if (updates.birthDate !== undefined) dbUpdates.birth_date = updates.birthDate;
    if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
    if (updates.height !== undefined) dbUpdates.height_cm = updates.height;
    if (updates.initialWeight !== undefined) dbUpdates.initial_weight_kg = updates.initialWeight;
    if (updates.healthConditions !== undefined) dbUpdates.health_conditions = updates.healthConditions;
    if (updates.allergies !== undefined) dbUpdates.allergies = updates.allergies;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.riskLevel !== undefined) dbUpdates.risk_level = updates.riskLevel;

    // Handle subscription if present (it's a JSON column usually, but let's check schema)
    // Assuming subscription is stored in columns or a jsonb column. 
    // If updates.plan is passed directly:
    if ((updates as any).plan) dbUpdates.plan = (updates as any).plan;

    console.log("Updating patient:", patientId, "Payload:", dbUpdates);

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
    console.log('createPatientRecord called with:', patientData);
    const supabase = createClient();

    // Verify if user exists in auth.users using admin client
    if (patientData.userId) {
        try {
            const adminSupabase = createAdminClient();
            const { data: user, error: userError } = await adminSupabase.auth.admin.getUserById(patientData.userId);
            if (userError || !user) {
                console.error('User not found in auth.users:', patientData.userId, userError);
                return { success: false, error: `User not found: ${patientData.userId}` };
            }
            console.log('User verified in auth.users:', user);

            // Check if profile exists
            const { data: profile, error: profileError } = await adminSupabase
                .from('profiles')
                .select('*')
                .eq('id', patientData.userId)
                .single();

            if (profileError || !profile) {
                console.error('Profile not found for user:', patientData.userId, profileError);
                // If profile is missing, try to create it manually (fallback)
                console.log('Attempting to create missing profile...');
                const { error: createProfileError } = await adminSupabase.from('profiles').insert({
                    id: patientData.userId,
                    email: patientData.email,
                    role: 'paciente', // Default role
                    display_name: patientData.fullName || '',
                    phone: patientData.whatsappNumber || ''
                });

                if (createProfileError) {
                    console.error('Failed to create fallback profile:', createProfileError);
                    return { success: false, error: `Profile missing and creation failed: ${createProfileError.message}` };
                }
                console.log('Fallback profile created successfully.');
            } else {
                console.log('Profile verified:', profile);
            }

        } catch (err) {
            console.error('Error verifying user/profile:', err);
        }
    }

    // Mapear para snake_case também na criação
    const dbInsert: any = {};
    if (patientData.fullName) dbInsert.full_name = patientData.fullName;
    if (patientData.email) dbInsert.email = patientData.email;
    if (patientData.userId) dbInsert.user_id = patientData.userId;
    if (patientData.whatsappNumber) dbInsert.whatsapp_number = patientData.whatsappNumber;
    if (patientData.birthDate) dbInsert.birth_date = patientData.birthDate;
    if (patientData.gender) dbInsert.gender = patientData.gender;
    if (patientData.height) dbInsert.height_cm = patientData.height;
    if (patientData.initialWeight) dbInsert.initial_weight_kg = patientData.initialWeight;
    if (patientData.healthConditions) dbInsert.health_conditions = patientData.healthConditions;
    if (patientData.allergies) dbInsert.allergies = patientData.allergies;
    if (patientData.status) dbInsert.status = patientData.status;

    // Default gamification if needed
    if (patientData.gamification) dbInsert.gamification = patientData.gamification;

    const { data, error } = await supabase
        .from('patients')
        .insert(dbInsert)
        .select()
        .single();

    if (error) {
        console.error('Error creating patient:', error);
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
    const supabase = createClient();

    const { error } = await supabase
        .from('health_metrics')
        .insert({
            patient_id: patientId,
            date: new Date().toISOString().split('T')[0],
            weight_kg: data.weight,
            glucose_level: data.glucoseLevel,
            waist_circumference_cm: data.waistCircumference,
            // sleep_duration_hours: data.sleepDuration, // Adicionar coluna se necessário no futuro
            // physical_activity_note: data.physicalActivity, // Adicionar coluna se necessário
        });

    if (error) {
        console.error('Error adding health metric:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}
