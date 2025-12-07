import { SupabaseClient } from '@supabase/supabase-js';
import { sendWhatsappMessage } from '@/lib/twilio';

/**
 * Processa check-ins de protocolo + Gamificação
 */
export async function handleProtocolGamification(
    patient: any,
    patientProtocol: any,
    messageText: string,
    whatsappNumber: string,
    supabase: SupabaseClient
): Promise<boolean> {
    console.log('[PROTOCOL-GAMIFICATION] Processing protocol check-in');

    const { protocols, mandatoryGamificationSteps } = await import('@/lib/data');
    const {
        isGamificationCheckin,
        extractPerspective,
        calculatePoints,
        getActionType,
        generateConfirmationMessage
    } = await import('../protocol-response-processor');
    const { registerQuickAction } = await import('../actions/gamification');

    const currentDay = patientProtocol.current_day;
    const protocolData = protocols.find(p => p.id === patientProtocol.protocol.id);
    const contentMessages = protocolData?.messages.filter(m => m.day === currentDay) || [];
    const gamificationMessages = mandatoryGamificationSteps.filter(m => m.day === currentDay);
    const allMessages = [...gamificationMessages, ...contentMessages];

    // 1. Buscar a ÚLTIMA mensagem enviada pelo sistema para este paciente
    const { data: lastSystemMessages } = await supabase
        .from('messages')
        .select('text')
        .eq('patient_id', patient.id)
        .eq('sender', 'system')
        .order('created_at', { ascending: false })
        .limit(1);

    const lastSystemMessageText = lastSystemMessages?.[0]?.text || '';

    // 2. Filtrar apenas o passo do protocolo que corresponde à última mensagem
    // Isso garante que a resposta do usuário seja vinculada APENAS ao contexto atual
    const activeProtocolStep = allMessages.find(step =>
        lastSystemMessageText.includes(step.message) ||
        (step.title && lastSystemMessageText.includes(step.title))
    );

    if (!activeProtocolStep) {
        console.log('[PROTOCOL-GAMIFICATION] No active protocol step found matching last message.');
        return false;
    }

    console.log(`[PROTOCOL-GAMIFICATION] Active Context: ${activeProtocolStep.title}`);

    let totalPointsAwarded = 0;
    let confirmationMessages: string[] = [];

    // 3. Processar APENAS o passo ativo
    if (isGamificationCheckin(activeProtocolStep)) {
        const perspective = extractPerspective(activeProtocolStep);
        if (perspective) {
            const points = calculatePoints(activeProtocolStep.title, messageText, perspective);

            if (points > 0 && patient.user_id) {
                const type = getActionType(perspective);
                const result = await registerQuickAction(patient.user_id, type, perspective);

                if (result.success) {
                    totalPointsAwarded += points;
                    confirmationMessages.push(
                        generateConfirmationMessage(activeProtocolStep.title, points, perspective)
                    );
                    console.log(`[PROTOCOL-GAMIFICATION] +${points} pts (${perspective})`);
                }
            }
        }
    }

    if (totalPointsAwarded > 0) {
        const message = confirmationMessages.join('\n');
        await sendWhatsappMessage(whatsappNumber, message);
        await supabase.from('messages').insert({
            patient_id: patient.id,
            sender: 'system',
            text: message,
        });
        return true; // Processado
    }

    return false; // Não processado
}
