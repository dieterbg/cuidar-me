import { SupabaseClient } from '@supabase/supabase-js';
import { transformPatientFromSupabase } from '@/lib/supabase-transforms';
import { generateChatbotReply } from '@/ai/flows/generate-chatbot-reply';
import { sendWhatsappMessage } from '@/lib/twilio';

/**
 * Processa conversa com IA
 */
export async function handleAIConversation(
    patient: any,
    messageText: string,
    whatsappNumber: string,
    supabase: SupabaseClient
): Promise<{ success: boolean }> {
    await supabase.from('messages').insert({
        patient_id: patient.id,
        sender: 'system',
        text: `[DIAGNOSTIC] Entering handleAIConversation. Calling Gemini...`
    });

    try {
        const transformedPatient = transformPatientFromSupabase(patient);
        const aiResponse = await generateChatbotReply({
            patient: transformedPatient,
            patientMessage: messageText,
            protocolContext: '',
        });

        await supabase.from('messages').insert({
            patient_id: patient.id,
            sender: 'system',
            text: `[DIAGNOSTIC] Gemini responded. Decision: ${aiResponse.decision}. Has reply: ${!!aiResponse.chatbotReply}`
        });

        if (aiResponse.decision === 'escalate' && aiResponse.attentionRequest) {
            await supabase.from('attention_requests').insert({
                patient_id: patient.id,
                reason: aiResponse.attentionRequest.reason,
                trigger_message: messageText,
                ai_summary: aiResponse.attentionRequest.aiSummary,
                ai_suggested_reply: aiResponse.attentionRequest.aiSuggestedReply,
                priority: aiResponse.attentionRequest.priority || 2,
            });
            await supabase.from('patients').update({ needs_attention: true }).eq('id', patient.id);
        }

        if (aiResponse.chatbotReply) {
            await supabase.from('messages').insert({
                patient_id: patient.id,
                sender: 'system',
                text: `[DIAGNOSTIC] Attempting to send WhatsApp via Twilio...`
            });

            const sent = await sendWhatsappMessage(whatsappNumber, aiResponse.chatbotReply);

            await supabase.from('messages').insert({
                patient_id: patient.id,
                sender: 'system',
                text: `[DIAGNOSTIC] Twilio send result: ${sent ? 'SUCCESS' : 'FAILURE'}`
            });

            await supabase.from('messages').insert({
                patient_id: patient.id,
                sender: 'me',
                text: aiResponse.chatbotReply,
            });
        }

        return { success: true };
    } catch (err: any) {
        await supabase.from('messages').insert({
            patient_id: patient.id,
            sender: 'system',
            text: `[ERROR] handleAIConversation CRASHED: ${err.message}`
        });
        throw err;
    }
}
