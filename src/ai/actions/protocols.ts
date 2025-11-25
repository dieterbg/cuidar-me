'use server';

import { createClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/supabase-server-utils';
import type { Protocol, ProtocolStep } from '@/lib/types';

export async function getProtocols(): Promise<Protocol[]> {
    const supabase = createClient();

    // Buscar protocolos com seus passos
    const { data: protocols, error } = await supabase
        .from('protocols')
        .select(`
            *,
            protocol_steps (
                day,
                title,
                message,
                is_gamification,
                perspective
            )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching protocols:', error);
        return [];
    }

    if (!protocols) return [];

    // Transformar para o formato esperado
    return protocols.map(protocol => ({
        id: protocol.id,
        name: protocol.name,
        description: protocol.description,
        durationDays: protocol.duration_days,
        eligiblePlans: protocol.eligible_plans,
        messages: (protocol.protocol_steps || [])
            .map((step: any) => ({
                day: step.day,
                title: step.title,
                message: step.message,
                isGamification: step.is_gamification,
                perspective: step.perspective,
            }))
            .sort((a: any, b: any) => a.day - b.day),
    }));
}

export async function addProtocol(protocol: Omit<Protocol, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; protocolId?: string; error?: string }> {
    const supabase = createClient();
    const user = await getCurrentUser();

    // Extrair messages para salvar separadamente
    const { messages, ...protocolData } = protocol;

    // Inserir protocolo
    const { data, error } = await supabase
        .from('protocols')
        .insert({
            name: protocolData.name,
            description: protocolData.description,
            duration_days: protocolData.durationDays,
            eligible_plans: protocolData.eligiblePlans,
            is_active: true,
            created_by: user?.id,
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding protocol:', error);
        return { success: false, error: error.message };
    }

    // Inserir passos do protocolo se existirem
    if (messages && messages.length > 0) {
        const steps = messages.map(step => ({
            protocol_id: data.id,
            day: step.day,
            title: step.title,
            message: step.message,
            is_gamification: step.isGamification || false,
            perspective: step.perspective || null,
        }));

        const { error: stepsError } = await supabase
            .from('protocol_steps')
            .insert(steps);

        if (stepsError) {
            console.error('Error adding protocol steps:', stepsError);
            // Não falhar completamente, apenas avisar
            console.warn('Protocol created but steps failed to save');
        }
    }

    return { success: true, protocolId: data.id };
}

export async function deleteProtocol(protocolId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    const { error } = await supabase
        .from('protocols')
        .update({ is_active: false })
        .eq('id', protocolId);

    if (error) {
        console.error('Error deleting protocol:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

export async function addProtocolStep(
    protocolId: string,
    step: Omit<ProtocolStep, 'id' | 'created_at'>
): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    const { error } = await supabase
        .from('protocol_steps')
        .insert({
            ...step,
            protocol_id: protocolId,
        });

    if (error) {
        console.error('Error adding protocol step:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

export async function removeProtocolStep(
    protocolId: string,
    step: ProtocolStep
): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    // Delete by matching protocol_id, day, title, and message
    // since ProtocolStep doesn't have an id field
    const { error } = await supabase
        .from('protocol_steps')
        .delete()
        .eq('protocol_id', protocolId)
        .eq('day', step.day)
        .eq('title', step.title)
        .eq('message', step.message);

    if (error) {
        console.error('Error removing protocol step:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

export async function assignProtocolToPatient(
    patientId: string,
    protocolId: string,
    weightGoal: number | null
): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    // Desativar protocolo anterior se existir
    await supabase
        .from('patient_protocols')
        .update({ is_active: false })
        .eq('patient_id', patientId)
        .eq('is_active', true);

    // Criar novo protocolo ativo
    const { error } = await supabase
        .from('patient_protocols')
        .insert({
            patient_id: patientId,
            protocol_id: protocolId,
            weight_goal_kg: weightGoal,
            start_date: new Date().toISOString().split('T')[0],
            current_day: 1,
            is_active: true,
        });

    if (error) {
        console.error('Error assigning protocol:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

export async function unassignProtocolFromPatient(patientId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    const { error } = await supabase
        .from('patient_protocols')
        .update({ is_active: false })
        .eq('patient_id', patientId)
        .eq('is_active', true);

    if (error) {
        console.error('Error unassigning protocol:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}
