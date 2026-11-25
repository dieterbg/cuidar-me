'use server';

import { createClient } from '@/lib/supabase-server';
import { createServiceRoleClient } from '@/lib/supabase-server-utils';
import { authErrorMessage, requireStaff } from '@/lib/authz';
import { uuidFromHash } from '@/lib/deterministic-id';
import { addMessageRecord } from '@/lib/message-store';
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

export async function recommendVideo(patientId: string, videoId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await requireStaff();
    } catch (error) {
        return { success: false, error: authErrorMessage(error) };
    }

    const supabase = createServiceRoleClient();
    const [patientResult, videoResult] = await Promise.all([
        supabase.from('patients').select('full_name, plan, status').eq('id', patientId).maybeSingle(),
        supabase.from('videos').select('title, eligible_plans, is_active').eq('id', videoId).maybeSingle(),
    ]);
    if (patientResult.error || videoResult.error) {
        return { success: false, error: 'Não foi possível verificar o paciente e o vídeo.' };
    }
    const patient = patientResult.data;
    const video = videoResult.data;
    if (patient?.status !== 'active' || !video?.is_active || !video.eligible_plans?.includes(patient.plan)) {
        return { success: false, error: 'Este vídeo precisa estar ativo e disponível no plano do paciente ativo.' };
    }

    const recommendationId = uuidFromHash(['video-recommendation', patientId, videoId]);
    const { error } = await supabase
        .from('sent_videos')
        .upsert({ id: recommendationId, patient_id: patientId, video_id: videoId }, { onConflict: 'id', ignoreDuplicates: true });
    if (error) return { success: false, error: 'Não foi possível registrar a recomendação do vídeo.' };

    const portalUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '') + '/portal/education';
    const history = await addMessageRecord(patientId, {
        sender: 'me',
        text: `Olá, ${patient.full_name}! Recomendamos o vídeo "${video.title}".\n\nVeja na seção Educação do portal: ${portalUrl}`,
    }, supabase, recommendationId);
    if (!history.success) {
        return { success: false, error: 'A recomendação foi registrada. Tente novamente para incluir a orientação no histórico.' };
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
