import { SupabaseClient } from '@supabase/supabase-js';
import { sendWhatsappMessage } from '@/lib/twilio';
import type { Perspective } from '@/lib/types';

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
    console.log(`[DEBUG-CHECKIN] ========== CHECKIN HANDLER ==========`);
    console.log(`[DEBUG-CHECKIN] checkinType: "${checkinType}"`);
    console.log(`[DEBUG-CHECKIN] messageText: "${messageText}"`);
    console.log(`[DEBUG-CHECKIN] patient.id: "${patient.id}"`);
    console.log(`[DEBUG-CHECKIN] patient.userId: "${patient.userId}"`);
    console.log(`[DEBUG-CHECKIN] patient.user_id: "${patient.user_id}"`);
    console.log(`[DEBUG-CHECKIN] whatsappNumber: "${whatsappNumber}"`);

    const category = getCategory(checkinType);
    const perspective = getPerspective(checkinType);

    console.log(`[DEBUG-CHECKIN] category: "${category}"`);
    console.log(`[DEBUG-CHECKIN] perspective: "${perspective}"`);

    if (!category || !perspective) {
        console.log(`[DEBUG-CHECKIN] ❌ ABORT: Unknown category or perspective for type="${checkinType}"`);
        return { processed: false };
    }

    const letter = parseLetter(messageText);
    let points = 0;
    let weightValue: number | null = null;

    console.log(`[DEBUG-CHECKIN] parseLetter result: "${letter}"`);

    // ── PESO: aceita apenas número ──────────────────────
    if (category === 'weight') {
        const num = extractNumber(messageText);
        console.log(`[DEBUG-CHECKIN] extractNumber result: ${num}`);
        if (num && num >= 30 && num <= 300) {
            points = 50;
            weightValue = num;
            console.log(`[DEBUG-CHECKIN] ✅ Valid weight: ${num}kg → ${points} pts`);
        } else {
            console.log(`[DEBUG-CHECKIN] ❌ Invalid weight number. Asking to retry.`);
            await sendWhatsappMessage(whatsappNumber, 'Por favor, informe seu peso em kg (ex: 85).');
            await supabase.from('messages').insert({
                patient_id: patient.id, sender: 'system',
                text: 'Por favor, informe seu peso em kg (ex: 85).',
            });
            return { processed: true }; // Consome mas não pontua — mantém pending
        }
    }

    // ── TODOS OS OUTROS: aceita apenas A, B ou C ────────
    if (category === 'abc' || category === 'yesno') {
        if (!letter) {
            const options = category === 'yesno' ? 'A ou B' : 'A, B ou C';
            console.log(`[DEBUG-CHECKIN] ❌ No valid letter. Asking to retry with: ${options}`);
            await sendWhatsappMessage(whatsappNumber, `Responda apenas com a letra: ${options}`);
            await supabase.from('messages').insert({
                patient_id: patient.id, sender: 'system',
                text: `Responda apenas com a letra: ${options}`,
            });
            return { processed: true }; // Consome mas não pontua — mantém pending
        }

        const key = checkinKey(checkinType);
        if (letter === 'A') points = POINTS[key].a;
        else if (letter === 'B') points = POINTS[key].b;
        else if (letter === 'C') points = POINTS[key].c;
        console.log(`[DEBUG-CHECKIN] ✅ Letter "${letter}" → key="${key}" → ${points} pts`);
    }

    // ── PONTUAR ─────────────────────────────────────────
    const uid = patient.userId || patient.user_id;
    console.log(`[DEBUG-CHECKIN] ========== SCORING ==========`);
    console.log(`[DEBUG-CHECKIN] points: ${points}`);
    console.log(`[DEBUG-CHECKIN] uid resolved: "${uid}"`);
    console.log(`[DEBUG-CHECKIN] Will attempt scoring: ${!!(points > 0 && uid)}`);

    if (points > 0 && uid) {
        console.log(`[DEBUG-CHECKIN] Calling awardGamificationPoints(uid="${uid}", perspective="${perspective}", points=${points})`);
        const { awardGamificationPoints } = await import('../actions/gamification');
        const result = await awardGamificationPoints(
            uid, perspective, points, supabase
        );

        console.log(`[DEBUG-CHECKIN] awardGamificationPoints result: success=${result.success}, pointsEarned=${result.pointsEarned}, message="${result.message}"`);

        if (result.success) {
            if (weightValue) {
                const { addHealthMetric } = await import('../actions/patients');
                await addHealthMetric(patient.id, { weight: weightValue });
                console.log(`[DEBUG-CHECKIN] Weight ${weightValue}kg saved to health metrics`);
            }

            const emoji = EMOJI[perspective];
            const msg = result.message || `✅ +${points} pontos ${emoji}`;
            await sendWhatsappMessage(whatsappNumber, msg);
            await supabase.from('messages').insert({
                patient_id: patient.id, sender: 'system', text: msg,
            });
            console.log(`[DEBUG-CHECKIN] ✅ SUCCESS: +${result.pointsEarned}pts (${perspective}). Message sent.`);
            return { processed: true };
        }

        // Rate limit → informa e consome
        console.log(`[DEBUG-CHECKIN] ⚠️ awardGamificationPoints failed. message="${result.message}"`);
        if (result.message) {
            await sendWhatsappMessage(whatsappNumber, result.message);
            await supabase.from('messages').insert({
                patient_id: patient.id, sender: 'system', text: result.message,
            });
        }
        return { processed: true };
    }

    // B em yesno = 0 pontos mas registra
    if ((category === 'yesno') && letter === 'B') {
        console.log(`[DEBUG-CHECKIN] yesno letter=B → 0 pts but registering`);
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

    console.log(`[DEBUG-CHECKIN] ❌ FALL-THROUGH: points=${points}, uid="${uid}", category="${category}", letter="${letter}". Returning processed=false`);
    return { processed: false };
}

// ── PARSER: apenas A, B ou C ────────────────────────────
function parseLetter(text: string): 'A' | 'B' | 'C' | null {
    const t = text.trim().toUpperCase();
    if (t === 'A' || t === 'A)' || t === 'A.') return 'A';
    if (t === 'B' || t === 'B)' || t === 'B.') return 'B';
    if (t === 'C' || t === 'C)' || t === 'C.') return 'C';
    return null;
}

function extractNumber(text: string): number | null {
    const match = text.trim().replace(',', '.').match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : null;
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
