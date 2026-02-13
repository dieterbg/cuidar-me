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
        .select('text, metadata')
        .eq('patient_id', patient.id)
        .eq('sender', 'system')
        .order('created_at', { ascending: false })
        .limit(1);

    const lastMsg = lastSystemMessages?.[0];
    const lastSystemMessageText = lastMsg?.text || '';
    const lastMsgMetadata = lastMsg?.metadata || null;

    // 2. Filtrar o passo do protocolo que corresponde ao contexto atual
    // Prioridade 1: Metadados estruturados (preciso)
    // Prioridade 2: Match de texto (fallback fuzzy)
    const activeProtocolStep = allMessages.find(step => {
        // Se temos metadados e o título/perspective batem, é o match perfeito
        if (lastMsgMetadata?.isGamification && lastMsgMetadata.checkinTitle === step.title) {
            return true;
        }
        // Fallback: fuzzy text match
        return lastSystemMessageText.includes(step.message) ||
            (step.title && lastSystemMessageText.includes(step.title));
    });

    if (!activeProtocolStep) {
        console.log('[PROTOCOL-GAMIFICATION] No active protocol step found matching context.');
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
