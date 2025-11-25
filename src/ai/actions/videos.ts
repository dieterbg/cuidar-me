'use server';

import { createClient } from '@/lib/supabase-server';
import type { Video } from '@/lib/types';

export async function getVideos(): Promise<Video[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching videos:', error);
        return [];
    }

    return data || [];
}

export async function addVideo(video: Omit<Video, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    const { error } = await supabase
        .from('videos')
        .insert(video);

    if (error) {
        console.error('Error adding video:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

export async function deleteVideo(videoId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    const { error } = await supabase
        .from('videos')
        .update({ is_active: false })
        .eq('id', videoId);

    if (error) {
        console.error('Error deleting video:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

export async function getPatientEducationVideos(patientId: string): Promise<Video[]> {
    const supabase = createClient();

    // Buscar plano do paciente
    const { data: patient } = await supabase
        .from('patients')
        .select('plan')
        .eq('id', patientId)
        .single();

    if (!patient) return [];

    // Buscar vídeos elegíveis
    const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('is_active', true)
        .contains('eligible_plans', [patient.plan]);

    if (error) {
        console.error('Error fetching patient videos:', error);
        return [];
    }

    return data || [];
}

export async function addSentVideo(patientId: string, videoId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    const { error } = await supabase
        .from('sent_videos')
        .insert({
            patient_id: patientId,
            video_id: videoId,
        });

    if (error) {
        console.error('Error adding sent video:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

export async function updateSentVideoFeedback(
    patientId: string,
    videoId: string,
    feedback: 'liked' | 'disliked'
): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    const { error } = await supabase
        .from('sent_videos')
        .update({ feedback })
        .eq('patient_id', patientId)
        .eq('video_id', videoId);

    if (error) {
        console.error('Error updating video feedback:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}
