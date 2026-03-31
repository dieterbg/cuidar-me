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
    const { getStreakMultiplier } = await import('@/lib/level-system');

    const currentDay = patientProtocol.current_day;
    const protocolData = protocols.find(p => p.id === patientProtocol.protocol.id);
    
    const gamificationMessages = mandatoryGamificationSteps;
    const allMessages = [...gamificationMessages, ...(protocolData?.messages || [])];

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
            const { processNumericResponse } = await import('../protocol-response-processor');
            let points = calculatePoints(activeProtocolStep.title, messageText, perspective);

            // Aplicar multiplicador de streak
            const currentStreak = patient.gamification?.streak?.currentStreak || 0;
            const multiplier = getStreakMultiplier(currentStreak);
            if (multiplier > 1) {
                points = Math.round(points * multiplier);
            }

            if (points > 0 && patient.user_id) {
                const { awardGamificationPoints } = await import('../actions/gamification');
                
                // 4. Registrar a ação e dar XP (passando direto, bypass de Rate-Limit da Web)
                const result = await awardGamificationPoints(
                    patient.user_id,
                    perspective,
                    points,
                    supabase
                );

                if (result.success) {
                    totalPointsAwarded += points;
                    confirmationMessages.push(
                        generateConfirmationMessage(activeProtocolStep.title, points, perspective)
                    );
                    console.log(`[PROTOCOL-GAMIFICATION] +${points} pts (${perspective})`);
                } else {
                    // Se falhou por cooldown/limite, responde com a mensagem de rate limit!
                    confirmationMessages.push(result.message);
                    console.log(`[PROTOCOL-GAMIFICATION] Rate limit hit: ${result.message}`);
                    totalPointsAwarded += 1; // Hack para garantir que retorne true no final
                }

                // ✨ NOVO: Armazenar Dado Estruturado se for Peso ✨
                if (result.success && activeProtocolStep.title.includes('Peso')) {
                    const { isValid, value } = processNumericResponse(messageText);
                    if (isValid && value) {
                        const { addHealthMetric } = await import('../actions/patients');
                        await addHealthMetric(patient.id, { weight: value });
                        console.log(`[PROTOCOL-GAMIFICATION] Weight ${value}kg saved for patient ${patient.id}`);
                    }
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
