'use server';
console.log('[DEBUG] actions-extended.ts loaded');

import { createClient } from '@/lib/supabase-server';
import { createServiceRoleClient } from '@/lib/supabase-server-utils';
import type { CommunityTopic, CommunityComment, ScheduledMessage, UserProfile } from '@/lib/types';

// =====================================================
// COMMUNITY ACTIONS
// =====================================================

export async function getCommunityTopics(): Promise<CommunityTopic[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('community_topics')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('last_activity_at', { ascending: false });

    if (error) {
        console.error('Error fetching community topics:', error);
        return [];
    }

    if (!data) return [];

    // Transformar snake_case para camelCase
    return data.map(topic => ({
        id: topic.id,
        topicId: topic.id, // Mesmo que id
        authorId: topic.author_id,
        authorUsername: topic.author_username,
        title: topic.title,
        text: topic.text,
        isPinned: topic.is_pinned,
        commentCount: topic.comment_count,
        timestamp: topic.created_at,
        lastActivityTimestamp: topic.last_activity_at || topic.created_at,
        reactions: [], // TODO: buscar reações se necessário
        comments: [], // Não buscar comentários aqui, apenas na página de detalhes
    }));
}

export async function getTopicDetails(topicId: string): Promise<{ topic: CommunityTopic; comments: CommunityComment[] } | null> {
    const supabase = createClient();

    const { data: topic, error: topicError } = await supabase
        .from('community_topics')
        .select('*')
        .eq('id', topicId)
        .single();

    if (topicError || !topic) {
        console.error('Error fetching topic:', topicError);
        return null;
    }

    const { data: comments, error: commentsError } = await supabase
        .from('community_comments')
        .select('*')
        .eq('topic_id', topicId)
        .order('created_at', { ascending: true });

    if (commentsError) {
        console.error('Error fetching comments:', commentsError);
        return { topic, comments: [] };
    }

    return { topic, comments: comments || [] };
}

export async function createCommunityTopic(
    authorId: string,
    authorUsername: string,
    title: string,
    text: string
): Promise<{ success: boolean; topicId?: string; error?: string }> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('community_topics')
        .insert({
            author_id: authorId,
            author_username: authorUsername,
            title,
            text,
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating topic:', error);
        return { success: false, error: error.message };
    }

    return { success: true, topicId: data.id };
}

export async function addCommentToTopic(
    topicId: string,
    authorId: string,
    authorUsername: string,
    text: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    const { error } = await supabase
        .from('community_comments')
        .insert({
            topic_id: topicId,
            author_id: authorId,
            author_username: authorUsername,
            text,
        });

    if (error) {
        console.error('Error adding comment:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

export async function togglePinStatus(topicId: string, isPinned: boolean): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    const { error } = await supabase
        .from('community_topics')
        .update({ is_pinned: isPinned })
        .eq('id', topicId);

    if (error) {
        console.error('Error toggling pin status:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

export async function deleteTopic(topicId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    const { error } = await supabase
        .from('community_topics')
        .delete()
        .eq('id', topicId);

    if (error) {
        console.error('Error deleting topic:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

export async function ensureCommunityUsername(patientId: string): Promise<{ success: boolean; username?: string; error?: string }> {
    const supabase = createClient();

    // Verificar se já tem username
    const { data: patient } = await supabase
        .from('patients')
        .select('community_username, full_name')
        .eq('id', patientId)
        .single();

    if (!patient) {
        return { success: false, error: 'Patient not found' };
    }

    if (patient.community_username) {
        return { success: true, username: patient.community_username };
    }

    // Gerar username único
    const baseName = patient.full_name.split(' ')[0].toLowerCase();
    let username = baseName;
    let counter = 1;

    while (true) {
        const { data: existing } = await supabase
            .from('patients')
            .select('id')
            .eq('community_username', username)
            .single();

        if (!existing) break;

        username = `${baseName}${counter}`;
        counter++;
    }

    // Atualizar paciente com username
    const { error } = await supabase
        .from('patients')
        .update({ community_username: username })
        .eq('id', patientId);

    if (error) {
        console.error('Error setting community username:', error);
        return { success: false, error: error.message };
    }

    return { success: true, username };
}

// =====================================================
// SCHEDULED MESSAGES ACTIONS
// =====================================================

export async function getScheduledMessages(): Promise<ScheduledMessage[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('scheduled_messages')
        .select('*')
        .order('send_at', { ascending: true });

    if (error) {
        console.error('Error fetching scheduled messages:', error);
        return [];
    }

    return data || [];
}



// scheduleReminder moved to actions/messages.ts



export async function sendCampaignMessage(
    patientIds: string[],
    message: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    // Buscar pacientes
    const { data: patients, error: fetchError } = await supabase
        .from('patients')
        .select('id, whatsapp_number')
        .in('id', patientIds);

    if (fetchError || !patients) {
        return { success: false, error: 'Failed to fetch patients' };
    }

    // Agendar mensagens
    const scheduledMessages = patients.map(p => ({
        patient_id: p.id,
        patient_whatsapp_number: p.whatsapp_number,
        message_content: message,
        send_at: new Date().toISOString(),
        source: 'manual' as const,
        status: 'pending' as const,
    }));

    const { error } = await supabase
        .from('scheduled_messages')
        .insert(scheduledMessages);

    if (error) {
        console.error('Error scheduling campaign messages:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

// =====================================================
// GAMIFICATION ACTIONS
// =====================================================

export async function updateGamificationProgress(
    patientId: string,
    perspective: 'alimentacao' | 'movimento' | 'hidratacao' | 'disciplina' | 'bemEstar',
    points: number
): Promise<{ success: boolean; error?: string }> {
    const supabase = createServiceRoleClient();

    try {
        // Usar a função SQL que criamos
        const { error } = await supabase.rpc('update_gamification_progress', {
            p_patient_id: patientId,
            p_perspective: perspective,
            p_points: points,
        });

        if (error) throw error;

        return { success: true };
    } catch (error: any) {
        console.error('Error updating gamification progress:', error);
        return { success: false, error: error.message };
    }
}



export async function deleteAllUsers(): Promise<{ success: boolean; error?: string }> {
    // Esta função é perigosa e deve ser usada apenas em desenvolvimento
    if (process.env.NODE_ENV === 'production') {
        return { success: false, error: 'Cannot delete all users in production' };
    }

    const supabase = createServiceRoleClient();

    const { data: users } = await supabase.auth.admin.listUsers();

    if (!users) {
        return { success: false, error: 'Failed to fetch users' };
    }

    for (const user of users.users) {
        await supabase.auth.admin.deleteUser(user.id);
    }

    return { success: true };
}

// =====================================================
// ATTENTION REQUESTS ACTIONS
// =====================================================



// =====================================================
// HEALTH METRICS ACTIONS
// =====================================================

// addHealthMetric moved to actions/patients.ts

// =====================================================
// SYSTEM CONFIG ACTIONS
// =====================================================


