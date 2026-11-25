'use server';
console.log('[DEBUG] actions-extended.ts loaded');

import { createHash, randomUUID } from 'node:crypto';
import { getCampaignPhone } from '@/lib/campaign-recipient';
import { uuidFromHash } from '@/lib/deterministic-id';
import { createClient } from '@/lib/supabase-server';
import { createServiceRoleClient } from '@/lib/supabase-server-utils';
import type { CommunityTopic, CommunityComment, ScheduledMessage, UserProfile, PatientPlan } from '@/lib/types';
import {
    authErrorMessage,
    getAuthenticatedUserAndRole,
    requireAdmin,
    requirePatientOwnerOrStaff,
    requireStaff,
    STAFF_ROLES
} from '@/lib/authz';

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
    try {
        const auth = await getAuthenticatedUserAndRole();
        if (authorId !== auth.userId) {
            return { success: false, error: 'Acesso negado' };
        }
    } catch (error) {
        return { success: false, error: authErrorMessage(error) };
    }

    if (!title.trim() || !text.trim()) {
        return { success: false, error: 'Titulo e texto sao obrigatorios' };
    }

    if (title.length > 180 || text.length > 4000) {
        return { success: false, error: 'Conteudo muito longo' };
    }

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
    try {
        const auth = await getAuthenticatedUserAndRole();
        if (authorId !== auth.userId) {
            return { success: false, error: 'Acesso negado' };
        }
    } catch (error) {
        return { success: false, error: authErrorMessage(error) };
    }

    if (!text.trim()) {
        return { success: false, error: 'Comentario vazio' };
    }

    if (text.length > 4000) {
        return { success: false, error: 'Comentario muito longo' };
    }

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
    try {
        await requireStaff();
    } catch (error) {
        return { success: false, error: authErrorMessage(error) };
    }

    const supabase = createServiceRoleClient();

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
    try {
        await requireStaff();
    } catch (error) {
        return { success: false, error: authErrorMessage(error) };
    }

    const supabase = createServiceRoleClient();

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
    try {
        const auth = await getAuthenticatedUserAndRole();
        const isStaff = !!auth.role && STAFF_ROLES.includes(auth.role as any);

        if (!isStaff && patientId !== auth.userId) {
            await requirePatientOwnerOrStaff(patientId);
        }
    } catch (error) {
        return { success: false, error: authErrorMessage(error) };
    }

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
    const baseName = ((patient.full_name || 'usuario').split(' ')[0] || 'usuario')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 24) || 'usuario';
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
    try {
        await requireStaff();
    } catch {
        return [];
    }

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



// scheduleReminder moved to ai/tools/schedule-reminder.ts



const CAMPAIGN_PLANS: PatientPlan[] = ['freemium', 'premium', 'vip'];
const MAX_CAMPAIGN_RECIPIENTS = 500;
const CAMPAIGN_PAGE_SIZE = 500;

type CampaignReview = { id: string; fingerprint: string; count: number };
type CampaignRecipient = { id: string; plan: PatientPlan; phone: string };

class CampaignAudienceError extends Error {}

function validCampaignPlans(plans: PatientPlan[]): boolean {
    return Array.isArray(plans) && plans.length > 0 && plans.length <= CAMPAIGN_PLANS.length
        && plans.every(plan => CAMPAIGN_PLANS.includes(plan));
}

async function loadCampaignRecipients(
    supabase: ReturnType<typeof createServiceRoleClient>,
    plans: PatientPlan[]
): Promise<CampaignRecipient[]> {
    const recipients: CampaignRecipient[] = [];
    let cursor: string | undefined;
    while (true) {
        let query = supabase.from('patients')
            .select('id, plan, status, whatsapp_number, whatsapp_consent_at')
            .eq('status', 'active')
            .in('plan', plans)
            .not('whatsapp_consent_at', 'is', null)
            .order('id')
            .limit(CAMPAIGN_PAGE_SIZE);
        if (cursor) query = query.gt('id', cursor);
        const { data, error } = await query;
        if (error || !data) throw new CampaignAudienceError('Não foi possível verificar o público da campanha.');
        if (!data.length) return recipients;

        for (const patient of data) {
            const phone = getCampaignPhone(patient);
            if (phone) recipients.push({ id: patient.id, plan: patient.plan, phone });
            if (recipients.length > MAX_CAMPAIGN_RECIPIENTS) {
                throw new CampaignAudienceError('O público ultrapassa 500 pacientes. Selecione menos planos.');
            }
        }

        cursor = data[data.length - 1].id;
    }
}

function buildCampaignReview(id: string, message: string, recipients: CampaignRecipient[]): CampaignReview {
    return {
        id,
        fingerprint: createHash('sha256').update(JSON.stringify([message, recipients])).digest('hex'),
        count: recipients.length,
    };
}

export async function previewCampaign(
    plans: PatientPlan[],
    message: string
): Promise<{ success: true; review: CampaignReview } | { success: false; error: string }> {
    try {
        await requireStaff();
        const text = typeof message === 'string' ? message.trim() : '';
        if (!text || text.length > 1500) return { success: false, error: 'Escreva uma mensagem de até 1.500 caracteres.' };
        if (!validCampaignPlans(plans)) return { success: false, error: 'Escolha pelo menos um plano.' };

        const recipients = await loadCampaignRecipients(createServiceRoleClient(), plans);
        return { success: true, review: buildCampaignReview(randomUUID(), text, recipients) };
    } catch (error) {
        return { success: false, error: error instanceof CampaignAudienceError ? error.message : authErrorMessage(error) };
    }
}

export async function sendCampaignMessage(
    plans: PatientPlan[],
    message: string,
    review: CampaignReview
): Promise<
    | { success: true; scheduled: number; alreadyScheduled: number }
    | { success: false; error: string; review?: CampaignReview }
> {
    try {
        await requireStaff();
        const text = typeof message === 'string' ? message.trim() : '';
        if (!text || text.length > 1500) return { success: false, error: 'Escreva uma mensagem de até 1.500 caracteres.' };
        if (!validCampaignPlans(plans) || !review || !/^[a-f0-9-]{36}$/i.test(review.id)) {
            return { success: false, error: 'Revise o público antes de agendar.' };
        }

        const supabase = createServiceRoleClient();
        const recipients = await loadCampaignRecipients(supabase, plans);
        const currentReview = buildCampaignReview(review.id, text, recipients);
        if (currentReview.fingerprint !== review.fingerprint || currentReview.count !== review.count) {
            return { success: false, error: 'O público mudou. Confira a nova contagem antes de agendar.', review: currentReview };
        }
        if (!recipients.length) return { success: false, error: 'Nenhum paciente elegível para agendar.' };

        const sendAt = new Date().toISOString();
        const rows = recipients.map(patient => ({
            id: uuidFromHash(['campaign', review.id, patient.id]),
            patient_id: patient.id,
            patient_whatsapp_number: patient.phone,
            message_content: text,
            send_at: sendAt,
            source: 'manual' as const,
            status: 'pending' as const,
            metadata: { campaignPlan: patient.plan },
        }));
        const { data, error } = await supabase
            .from('scheduled_messages')
            .upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
            .select('id');

        if (error || !data) {
            if (error) console.error('Error scheduling campaign messages:', error.code);
            return { success: false, error: 'Não foi possível confirmar o agendamento. Tente novamente nesta revisão.' };
        }

        return { success: true, scheduled: data.length, alreadyScheduled: rows.length - data.length };
    } catch (error) {
        return { success: false, error: error instanceof CampaignAudienceError ? error.message : authErrorMessage(error) };
    }
}

// =====================================================
// GAMIFICATION ACTIONS
// =====================================================

export async function updateGamificationProgress(
    patientId: string,
    perspective: 'alimentacao' | 'movimento' | 'hidratacao' | 'disciplina' | 'bemEstar',
    points: number
): Promise<{ success: boolean; error?: string }> {
    try {
        await requireStaff();
    } catch (error) {
        return { success: false, error: authErrorMessage(error) };
    }

    if (!patientId || !Number.isInteger(points) || points < 0 || points > 1000) {
        return { success: false, error: 'Pontuacao invalida' };
    }

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

    try {
        await requireAdmin();
    } catch (error) {
        return { success: false, error: authErrorMessage(error) };
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


