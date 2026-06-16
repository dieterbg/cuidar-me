import { SupabaseClient } from '@supabase/supabase-js';
import { sendWhatsappMessage } from '@/lib/twilio';
import type { Perspective } from '@/lib/types';
import { loggers } from '@/lib/logger';
import { calculateLevel } from '@/lib/level-system';
import {
    buildWeeklyStarProgress,
    calculateWeeklyScore,
    getWeeklyProtocolProfile
} from '@/lib/data';

/**
 * Processa resposta de check-in de gamificação.
 *
 * Aceita APENAS:
 *  - Peso: número (85, 120kg, 72.5)
 *  - Todos os outros: letra A, B ou C
 *
 * Qualquer outra coisa → retorna false → IA responde normalmente.
 */
export async function processCheckinResponse(
    patient: any,
    messageText: string,
    checkinType: string,
    whatsappNumber: string,
    supabase: SupabaseClient
): Promise<{ processed: boolean }> {
    // PII redacted: messageText e whatsappNumber removidos dos logs
    loggers.ai.debug('checkin handler iniciado', { patientId: patient.id, checkinType });

    if (isWeeklyProtocolCheckin(checkinType)) {
        return processWeeklyProtocolCheckin(patient, messageText, checkinType, whatsappNumber, supabase);
    }

    // ── VALIDAÇÃO DE TAMANHO ──────────────────────────
    // Se a mensagem for muito longa, provavelmente é conversacional → IA
    const words = messageText.trim().split(/\s+/);
    if (words.length > 3) {
        loggers.ai.debug('mensagem longa, passando para IA', { patientId: patient.id, wordCount: words.length });
        return { processed: false };
    }

    const category = getCategory(checkinType);
    const perspective = getPerspective(checkinType);

    if (!category || !perspective) {
        return { processed: false };
    }

    const letter = parseLetter(messageText);
    let points = 0;
    let weightValue: number | null = null;

    // ── PESO: aceita apenas número ──────────────────────
    if (category === 'weight') {
        const num = extractNumber(messageText);
        if (num && num >= 30 && num <= 300) {
            points = 50;
            weightValue = num;
        } else {
            const retryMsg = 'Por favor, informe seu peso em kg (ex: 85).';
            await sendWhatsappMessage(whatsappNumber, retryMsg);
            await supabase.from('messages').insert({
                patient_id: patient.id, sender: 'system', text: retryMsg,
            });
            return { processed: true };
        }
    }

    // ── TODOS OS OUTROS: aceita apenas A, B ou C ────────
    if (category === 'abc' || category === 'yesno') {
        if (!letter) {
            // Se for apenas um caractere isolado e não for A/B/C, provavelmente é erro de digitação
            if (words.length === 1 && messageText.trim().length === 1) {
                const options = category === 'yesno' ? 'A ou B' : 'A, B ou C';
                const retryMsg = `Responda apenas com a letra: ${options}`;
                await sendWhatsappMessage(whatsappNumber, retryMsg);
                await supabase.from('messages').insert({
                    patient_id: patient.id, sender: 'system', text: retryMsg,
                });
                return { processed: true };
            }
            
            // Para qualquer outra coisa (interação humana), deixa a IA responder
            loggers.ai.debug('checkin response not strict letter, passing to AI', {
                patientId: patient.id,
                messageLength: messageText.length,
            });
            return { processed: false };
        }

        const key = checkinKey(checkinType);
        if (letter === 'A') points = POINTS[key].a;
        else if (letter === 'B') points = POINTS[key].b;
        else if (letter === 'C') points = POINTS[key].c;
    }

    // ── PONTUAR ─────────────────────────────────────────
    const uid = patient.userId || patient.user_id;

    if (points > 0 && uid) {
        const { awardGamificationPoints } = await import('../actions/gamification');
        const result = await awardGamificationPoints(
            uid, perspective, points, supabase
        );

        if (result.success) {
            if (weightValue) {
                const { addHealthMetric } = await import('../actions/patients');
                await addHealthMetric(patient.id, { weight: weightValue });
            }

            const emoji = EMOJI[perspective];
            const msg = result.message || `✅ +${points} pontos ${emoji}`;
            await sendWhatsappMessage(whatsappNumber, msg);
            await supabase.from('messages').insert({
                patient_id: patient.id, sender: 'system', text: msg,
            });
            return { processed: true };
        }

        // Rate limit ou outro erro → informa e consome
        if (result.message) {
            await sendWhatsappMessage(whatsappNumber, result.message);
            await supabase.from('messages').insert({
                patient_id: patient.id, sender: 'system', text: result.message,
            });
        }
        return { processed: true };
    }

    // B em yesno = 0 pontos mas registra e encerra pendência
    if ((category === 'yesno') && letter === 'B') {
        const msg = '📝 Registrado! Planejar faz toda diferença. 💪';
        await sendWhatsappMessage(whatsappNumber, msg);
        await supabase.from('messages').insert({
            patient_id: patient.id, sender: 'system', text: msg,
        });
        await supabase.from('patients').update({
            last_checkin_type: null, last_checkin_at: null,
        }).eq('id', patient.id);
        return { processed: true };
    }

    return { processed: false };
}

// ── PARSER: Flexível para A, B ou C ────────────────────
async function processWeeklyProtocolCheckin(
    patient: any,
    messageText: string,
    checkinType: string,
    whatsappNumber: string,
    supabase: SupabaseClient
): Promise<{ processed: boolean }> {
    const weightKg = extractNumber(messageText);
    const adherence = parseWeeklyAdherence(messageText);

    if (!weightKg || weightKg < 30 || weightKg > 300 || !adherence) {
        const retryMsg = [
            'Para registrar seu check-in semanal, responda em uma unica mensagem:',
            '',
            'Peso: 84,7',
            'Semana: A, B ou C',
            '',
            'A) fui consistente',
            'B) oscilei, mas mantive parte do plano',
            'C) tive dificuldade e quero retomar',
        ].join('\n');

        await sendWhatsappMessage(whatsappNumber, retryMsg);
        await supabase.from('messages').insert({
            patient_id: patient.id,
            sender: 'system',
            text: retryMsg,
        });
        return { processed: true };
    }

    const { data: activeProtocol } = await supabase
        .from('patient_protocols')
        .select('protocol_id, current_day, protocols:protocol_id(id, name, duration_days)')
        .eq('patient_id', patient.id)
        .eq('is_active', true)
        .single();

    const protocolId = (activeProtocol as any)?.protocol_id
        || (activeProtocol as any)?.protocols?.id
        || patient.protocol?.protocolId
        || '';
    const week = parseWeekFromCheckin(checkinType)
        || Math.max(1, Math.ceil(((activeProtocol as any)?.current_day || 1) / 7));
    const scoreResult = calculateWeeklyScore({ weightKg, adherence });
    const profile = getWeeklyProtocolProfile(protocolId);

    const { data: patientRow } = await supabase
        .from('patients')
        .select('gamification, total_points, level, badges')
        .eq('id', patient.id)
        .single();

    const currentGamification = ((patientRow as any)?.gamification || {}) as any;
    const weeklyProtocolScores = {
        ...(currentGamification.weeklyProtocolScores || {}),
    };
    const weeklyKey = `${protocolId}:week:${week}`;
    const previousScore = Number(weeklyProtocolScores[weeklyKey]?.score || 0);
    const pointsEarned = Math.max(scoreResult.score - previousScore, 0);
    const currentTotal = Number(currentGamification.totalPoints ?? (patientRow as any)?.total_points ?? 0);
    const updatedTotal = currentTotal + pointsEarned;
    const updatedLevel = calculateLevel(updatedTotal);

    weeklyProtocolScores[weeklyKey] = {
        protocolId,
        week,
        score: scoreResult.score,
        band: scoreResult.band,
        label: scoreResult.label,
        adherence,
        weightKg,
        answeredAt: new Date().toISOString(),
    };

    const completedWeeks = Object.values(weeklyProtocolScores)
        .filter((entry: any) => entry?.protocolId === protocolId)
        .length;

    const currentBadges = normalizeBadgeIds(currentGamification.badges || (patientRow as any)?.badges || []);
    const badgesToAdd = [
        completedWeeks >= 1 ? profile.badges.first : null,
        completedWeeks >= 4 ? profile.badges.fourWeeks : null,
        completedWeeks >= 8 ? profile.badges.eightWeeks : null,
        completedWeeks >= 12 ? profile.badges.twelveWeeks : null,
    ].filter(Boolean) as string[];
    const updatedBadges = Array.from(new Set([...currentBadges, ...badgesToAdd]));
    const newBadges = updatedBadges.filter(badge => !currentBadges.includes(badge));
    const weeklyProgress = {
        weekStartDate: new Date().toISOString(),
        perspectives: buildWeeklyStarProgress(protocolId, week, adherence),
    };

    await supabase.from('health_metrics').insert({
        patient_id: patient.id,
        date: new Date().toISOString().split('T')[0],
        weight_kg: weightKg,
    });

    await supabase.from('patients').update({
        gamification: {
            ...currentGamification,
            totalPoints: updatedTotal,
            level: updatedLevel,
            badges: updatedBadges,
            weeklyProtocolScores,
            weeklyProgress,
        },
        total_points: updatedTotal,
        level: updatedLevel,
        badges: updatedBadges,
        last_checkin_type: null,
        last_checkin_at: null,
    }).eq('id', patient.id);

    const confirmation = [
        `Check-in semanal registrado - ${profile.shortName}.`,
        `Peso: ${formatWeight(weightKg)} kg`,
        `Score: ${scoreResult.score}/100 (${scoreResult.label})`,
        pointsEarned > 0 ? `+${pointsEarned} Health Coins` : 'Semana ja registrada; score atualizado sem duplicar pontos.',
        `Total acumulado: ${updatedTotal} Health Coins`,
        'Estrela do Cuidado atualizada com o foco desta semana.',
        newBadges.length > 0 ? `Nova conquista: ${newBadges.join(', ')}` : null,
    ].filter(Boolean).join('\n');

    await sendWhatsappMessage(whatsappNumber, confirmation);
    await supabase.from('messages').insert({
        patient_id: patient.id,
        sender: 'system',
        text: confirmation,
    });

    return { processed: true };
}

function isWeeklyProtocolCheckin(type: string): boolean {
    return type.includes('Check-in Semanal');
}

function parseWeekFromCheckin(type: string): number | null {
    const match = type.match(/Semana\s+(\d+)/i);
    return match ? Number(match[1]) : null;
}

function parseWeeklyAdherence(text: string): 'A' | 'B' | 'C' | null {
    const normalized = text.trim().toUpperCase();
    const explicit = normalized.match(/SEMANA\s*:\s*([ABC])/);
    if (explicit) return explicit[1] as 'A' | 'B' | 'C';

    const standalone = normalized.match(/(?:^|\s|[(:;-])([ABC])(?:\s|$|[).,;:-])/);
    return standalone ? standalone[1] as 'A' | 'B' | 'C' : null;
}

function normalizeBadgeIds(badges: any[]): string[] {
    return badges
        .map((badge) => typeof badge === 'string' ? badge : badge?.id)
        .filter((badge): badge is string => !!badge);
}

function parseLetter(text: string): 'A' | 'B' | 'C' | null {
    const t = text.trim().toUpperCase();
    
    // 1. Casidade estrita: "A", "A.", "A)"
    if (/^[A][).]?$/.test(t)) return 'A';
    if (/^[B][).]?$/.test(t)) return 'B';
    if (/^[C][).]?$/.test(t)) return 'C';
    
    // 2. Variações comuns: "Opção A", "Letra B", "Resposta C"
    // Busca A, B ou C precedida por palavras comuns ou no início
    const flexibleMatch = t.match(/(?:OPÇÃO|LETRA|RESPOSTA|^)\s*([A-C])(?:\s|$|[).])/i);
    if (flexibleMatch) {
        return flexibleMatch[1].toUpperCase() as 'A' | 'B' | 'C';
    }

    return null;
}

function extractNumber(text: string): number | null {
    const match = text.trim().replace(',', '.').match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : null;
}

function formatWeight(weight: number): string {
    return weight.toFixed(1).replace('.', ',');
}

// ── CATEGORIZAÇÃO ───────────────────────────────────────
type Category = 'weight' | 'abc' | 'yesno';

function getCategory(type: string): Category | null {
    if (type.includes('Peso')) return 'weight';
    if (type.includes('Almoço') || type.includes('Jantar') || type.includes('Hidratação') || type.includes('Bem-Estar')) return 'abc';
    if (type.includes('Planejamento') || type.includes('Atividade')) return 'yesno';
    return null;
}

function getPerspective(type: string): Perspective | null {
    if (type.includes('Hidratação')) return 'hidratacao';
    if (type.includes('Almoço') || type.includes('Jantar')) return 'alimentacao';
    if (type.includes('Atividade')) return 'movimento';
    if (type.includes('Bem-Estar')) return 'bemEstar';
    if (type.includes('Peso') || type.includes('Planejamento')) return 'disciplina';
    return null;
}

// ── PONTOS ──────────────────────────────────────────────
const POINTS: Record<string, { a: number; b: number; c: number }> = {
    almoco:       { a: 20, b: 15, c: 10 },
    jantar:       { a: 20, b: 15, c: 10 },
    hidratacao:   { a: 15, b: 10, c: 5 },
    bemEstar:     { a: 15, b: 10, c: 5 },
    planejamento: { a: 30, b: 0, c: 0 },
    atividade:    { a: 40, b: 0, c: 0 },
};

function checkinKey(type: string): string {
    if (type.includes('Almoço')) return 'almoco';
    if (type.includes('Jantar')) return 'jantar';
    if (type.includes('Hidratação')) return 'hidratacao';
    if (type.includes('Bem-Estar')) return 'bemEstar';
    if (type.includes('Planejamento')) return 'planejamento';
    if (type.includes('Atividade')) return 'atividade';
    return 'hidratacao';
}

const EMOJI: Record<Perspective, string> = {
    hidratacao: '💧',
    alimentacao: '🍽️',
    movimento: '🏃',
    disciplina: '⚡',
    bemEstar: '🧠',
};
