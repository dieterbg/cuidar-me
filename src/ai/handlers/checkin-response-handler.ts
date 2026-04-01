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
    console.log(`[CHECKIN] Type: "${checkinType}" | Reply: "${messageText}"`);

    const category = getCategory(checkinType);
    const perspective = getPerspective(checkinType);

    if (!category || !perspective) {
        console.log(`[CHECKIN] Unknown type: "${checkinType}"`);
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
            // Não é número válido → pede para tentar de novo
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
            // Não é letra → pede para tentar
            const options = category === 'yesno' ? 'A ou B' : 'A, B ou C';
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
    }

    // ── PONTUAR ─────────────────────────────────────────
    if (points > 0 && patient.user_id) {
        const { awardGamificationPoints } = await import('../actions/gamification');
        const result = await awardGamificationPoints(
            patient.user_id, perspective, points, supabase
        );

        if (result.success) {
            if (weightValue) {
                const { addHealthMetric } = await import('../actions/patients');
                await addHealthMetric(patient.id, { weight: weightValue });
                console.log(`[CHECKIN] Weight ${weightValue}kg saved`);
            }

            const emoji = EMOJI[perspective];
            const msg = result.message || `✅ +${points} pontos ${emoji}`;
            await sendWhatsappMessage(whatsappNumber, msg);
            await supabase.from('messages').insert({
                patient_id: patient.id, sender: 'system', text: msg,
            });
            console.log(`[CHECKIN] ✅ +${result.pointsEarned}pts (${perspective})`);
            return { processed: true };
        }

        // Rate limit → informa e consome
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
