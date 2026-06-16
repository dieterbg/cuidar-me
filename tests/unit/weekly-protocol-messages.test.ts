import { describe, expect, it } from 'vitest';
import {
    buildWeeklyStarProgress,
    calculateWeeklyScore,
    getWeeklyProtocolMessages,
} from '@/lib/data/weekly-protocol-messages';

const FUNDAMENTOS_ID = '613a4a63-ed4b-4cbf-9c64-49fe98074032';
const PERFORMANCE_ID = '63e69258-ca73-4a6f-bd64-13031fa140f2';

describe('weekly protocol messages', () => {
    it('creates at most three messages per week', () => {
        const messages = getWeeklyProtocolMessages(FUNDAMENTOS_ID, 90);

        expect(messages).toHaveLength(39);
        expect(messages.filter(message => message.role === 'weekly_checkin')).toHaveLength(13);
        expect(messages.filter(message => message.role === 'education')).toHaveLength(13);
        expect(messages.filter(message => message.role === 'weekly_summary')).toHaveLength(13);
    });

    it('keeps weekly scoring predictable and achievable', () => {
        expect(calculateWeeklyScore({ weightKg: 84.7, adherence: 'A' }).score).toBe(100);
        expect(calculateWeeklyScore({ weightKg: 84.7, adherence: 'B' }).score).toBe(90);
        expect(calculateWeeklyScore({ weightKg: 84.7, adherence: 'C' }).score).toBe(80);
    });

    it('uses protocol-specific star focus', () => {
        const fundamentos = buildWeeklyStarProgress(FUNDAMENTOS_ID, 1, 'A');
        const performance = buildWeeklyStarProgress(PERFORMANCE_ID, 1, 'A');

        expect(fundamentos.hidratacao.current).toBe(5);
        expect(fundamentos.movimento.current).toBe(3);
        expect(performance.movimento.current).toBe(5);
        expect(performance.hidratacao.current).toBe(3);
    });
});
