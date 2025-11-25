'use server';
console.log('[DEBUG] actions/patients.ts loaded');

import { createClient } from '@/lib/supabase-server';
import { transformPatientFromSupabase } from '@/lib/supabase-transforms';
import type { Patient, HealthMetric, SentVideo } from '@/lib/types';

export async function getPatients(): Promise<Patient[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching patients:', error);
        return [];
    }

    return (data || []).map(transformPatientFromSupabase);
}

export async function getPatientDetails(patientId: string): Promise<{
    patient: Patient | null;
    metrics: HealthMetric[];
    sentVideos: SentVideo[]
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
        return { patient: null, metrics: [], sentVideos: [] };
    }

    // Fetch health metrics
    const { data: metricsData, error: metricsError } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('patient_id', patientId)
        .order('recorded_at', { ascending: false });

    // Fetch sent videos
    const { data: sentVideosData, error: sentVideosError } = await supabase
        .from('sent_videos')
        .select('*')
        .eq('patient_id', patientId)
        .order('sent_at', { ascending: false });

    const patient = transformPatientFromSupabase(patientData);
    const metrics = metricsData?.map(m => ({
        id: m.id,
        date: m.recorded_at,
        weight: m.weight,
        glucoseLevel: m.blood_glucose,
        waistCircumference: m.waist_circumference,
        sleepDuration: m.sleep_duration,
        physicalActivity: m.physical_activity,
        mealCheckin: m.meal_checkin,
    })) || [];

    const sentVideos = sentVideosData?.map(sv => ({
        id: sv.id,
        videoId: sv.video_id,
        patientId: sv.patient_id,
        sentAt: sv.sent_at,
        feedback: sv.feedback,
    })) || [];

    return { patient, metrics, sentVideos };
}

export async function updatePatient(patientId: string, updates: Partial<Patient>): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    const { error } = await supabase
        .from('patients')
        .update(updates)
        .eq('id', patientId);

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
    const supabase = createClient();

    const { data, error } = await supabase
        .from('patients')
        .insert(patientData)
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
