import { SupabaseClient } from '@supabase/supabase-js';
import { sendWhatsappMessage } from '@/lib/twilio';
import type { Perspective } from '@/lib/types';

/**
 * Processa resposta de check-in de gamificação.
 *
 * Aceita APENAS respostas simples:
 *  - Letras: A, B, C
 *  - Sim/Não: sim, s, não, nao, n
 *  - Numérico (peso): 85, 120kg, 72.5
 *  - Emojis: 👍, 👎, 🤏
 *
 * Qualquer outra coisa (pergunta, frase longa) → retorna false,
 * deixando a IA responder normalmente.
 */
export async function processCheckinResponse(
    patient: any,
    messageText: string,
    checkinType: string,
    whatsappNumber: string,
    supabase: SupabaseClient
): Promise<{ processed: boolean }> {
    console.log(`[CHECKIN-RESPONSE] Type: "${checkinType}" | Reply: "${messageText}"`);

    const category = getCategory(checkinType);
    const perspective = getPerspective(checkinType);

    if (!category || !perspective) {
        console.log(`[CHECKIN-RESPONSE] Unknown checkin type: "${checkinType}"`);
        return { processed: false };
    }

    const normalized = messageText.trim().toLowerCase();
    let points = 0;
    let weightValue: number | null = null;

    // ── PESO (numérico) ──────────────────────────────
    if (category === 'weight') {
        const num = extractNumber(messageText);
        if (num && num >= 30 && num <= 300) {
            points = 50;
            weightValue = num;
        } else {
            // Resposta não-numérica a check-in de peso → não consome
            console.log(`[CHECKIN-RESPONSE] Weight: invalid number "${messageText}"`);
            return { processed: false };
        }
    }

    // ── A/B/C (alimentação, hidratação, bem-estar) ───
    if (category === 'abc') {
        const grade = parseGrade(normalized);
        if (grade === 'A') points = POINTS_TABLE[checkinKey(checkinType)].a;
        else if (grade === 'B') points = POINTS_TABLE[checkinKey(checkinType)].b;
        else if (grade === 'C') points = POINTS_TABLE[checkinKey(checkinType)].c;
        else {
            // Sem match de A/B/C → tentar sim/não
            const yn = parseYesNo(normalized);
            if (yn === true) points = POINTS_TABLE[checkinKey(checkinType)].a;
            else if (yn === false) points = POINTS_TABLE[checkinKey(checkinType)].c;
            else return { processed: false }; // Resposta complexa → IA
        }
    }

    // ── SIM/NÃO (planejamento, atividade) ────────────
    if (category === 'yesno') {
        const grade = parseGrade(normalized);
        if (grade === 'A') points = POINTS_TABLE[checkinKey(checkinType)].a;
        else if (grade === 'B') points = 0;
        else {
            const yn = parseYesNo(normalized);
            if (yn === true) points = POINTS_TABLE[checkinKey(checkinType)].a;
            else if (yn === false) points = 0;
            else return { processed: false }; // Resposta complexa → IA
        }
    }

    // ── PONTUAR ──────────────────────────────────────
    if (points > 0 && patient.user_id) {
        const { awardGamificationPoints } = await import('../actions/gamification');
        const result = await awardGamificationPoints(
            patient.user_id, perspective, points, supabase
        );

        if (result.success) {
            // Salvar peso se aplicável
            if (weightValue) {
                const { addHealthMetric } = await import('../actions/patients');
                await addHealthMetric(patient.id, { weight: weightValue });
                console.log(`[CHECKIN-RESPONSE] Weight ${weightValue}kg saved`);
            }

            // Enviar confirmação
            const emoji = PERSPECTIVE_EMOJI[perspective];
            await sendWhatsappMessage(whatsappNumber, result.message || `✅ +${points} pontos ${emoji}`);
            await supabase.from('messages').insert({
                patient_id: patient.id,
                sender: 'system',
                text: result.message || `✅ +${points} pontos ${emoji}`,
            });

            console.log(`[CHECKIN-RESPONSE] ✅ +${result.pointsEarned}pts (${perspective})`);
            return { processed: true };
        }

        // Rate limit ou erro → informa mas consome a mensagem
        if (result.message) {
            await sendWhatsappMessage(whatsappNumber, result.message);
            await supabase.from('messages').insert({
                patient_id: patient.id, sender: 'system', text: result.message,
            });
        }
        return { processed: true }; // Consome mesmo com rate limit
    }

    // Pontos = 0 (ex: "B" em planejamento = "não planejei")
    // Registra mas não pontua
    if (category === 'yesno' && points === 0) {
        const msg = '📝 Resposta registrada. Lembre-se: planejar faz toda diferença! 💪';
        await sendWhatsappMessage(whatsappNumber, msg);
        await supabase.from('messages').insert({
            patient_id: patient.id, sender: 'system', text: msg,
        });
        // Limpar pending state
        await supabase.from('patients').update({
            last_checkin_type: null, last_checkin_at: null,
        }).eq('id', patient.id);
        return { processed: true };
    }

    return { processed: false };
}

// ── PARSERS ──────────────────────────────────────────

function parseGrade(text: string): 'A' | 'B' | 'C' | null {
    const t = text.trim();
    if (t === 'a' || t === 'a)' || t.startsWith('a ')) return 'A';
    if (t === 'b' || t === 'b)' || t.startsWith('b ')) return 'B';
    if (t === 'c' || t === 'c)' || t.startsWith('c ')) return 'C';
    return null;
}

function parseYesNo(text: string): boolean | null {
    const t = text.trim();
    const yes = ['sim', 's', 'yes', 'claro', 'ok', 'beleza', 'fiz', 'consegui',
        '👍', '✅', '💪', '🙌', 'tudo planejado', 'bati a meta', 'me movimentei'];
    const no = ['não', 'nao', 'n', 'no', 'não fiz', 'pulei', '👎', '❌', 'não consegui'];

    if (yes.some(w => t === w || t.startsWith(w + ' '))) return true;
    if (no.some(w => t === w || t.startsWith(w + ' '))) return false;
    return null; // Não reconhecido → deixa IA
}

function extractNumber(text: string): number | null {
    const match = text.trim().replace(',', '.').match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : null;
}

// ── CATEGORIZAÇÃO ────────────────────────────────────

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

// ── PONTOS ───────────────────────────────────────────

type CheckinKey = 'almoco' | 'jantar' | 'hidratacao' | 'bemEstar' | 'planejamento' | 'atividade';

const POINTS_TABLE: Record<CheckinKey, { a: number; b: number; c: number }> = {
    almoco:       { a: 20, b: 15, c: 10 },
    jantar:       { a: 20, b: 15, c: 10 },
    hidratacao:   { a: 15, b: 10, c: 5 },
    bemEstar:     { a: 15, b: 10, c: 5 },
    planejamento: { a: 30, b: 0, c: 0 },
    atividade:    { a: 40, b: 0, c: 0 },
};

function checkinKey(type: string): CheckinKey {
    if (type.includes('Almoço')) return 'almoco';
    if (type.includes('Jantar')) return 'jantar';
    if (type.includes('Hidratação')) return 'hidratacao';
    if (type.includes('Bem-Estar')) return 'bemEstar';
    if (type.includes('Planejamento')) return 'planejamento';
    if (type.includes('Atividade')) return 'atividade';
    return 'hidratacao'; // fallback
}

const PERSPECTIVE_EMOJI: Record<Perspective, string> = {
    hidratacao: '💧',
    alimentacao: '🍽️',
    movimento: '🏃',
    disciplina: '⚡',
    bemEstar: '🧠',
};
