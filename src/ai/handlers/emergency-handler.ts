import { SupabaseClient } from '@supabase/supabase-js';
import { transformPatientFromSupabase } from '@/lib/supabase-transforms';
import { generateChatbotReply } from '@/ai/flows/generate-chatbot-reply';
import { sendWhatsappMessage } from '@/lib/twilio';

/**
 * Processa emergências - Escala imediatamente
 */
export async function handleEmergency(
    patient: any,
    messageText: string,
    whatsappNumber: string,
    supabase: SupabaseClient
): Promise<{ success: boolean }> {
    console.log('[EMERGENCY] Escalating immediately');

    const transformedPatient = transformPatientFromSupabase(patient);
    const aiResponse = await generateChatbotReply({
        patient: transformedPatient,
        patientMessage: `[EMERGÊNCIA] ${messageText}`,
        protocolContext: '',
    });

    // Forçar escalonamento
    await supabase.from('attention_requests').insert({
        patient_id: patient.id,
        reason: 'Emergência Detectada',
        trigger_message: messageText,
        ai_summary: `Sistema detectou emergência: ${messageText}`,
        ai_suggested_reply: 'Entre em contato URGENTEMENTE.',
        priority: 1,
    });

    await supabase.from('patients').update({ needs_attention: true }).eq('id', patient.id);

    if (aiResponse.chatbotReply) {
        await sendWhatsappMessage(whatsappNumber, aiResponse.chatbotReply);
        await supabase.from('messages').insert({
            patient_id: patient.id,
            sender: 'me',
            text: aiResponse.chatbotReply,
        });
    }

    return { success: true };
}
