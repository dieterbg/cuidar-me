import { describe, expect, it } from 'vitest';
import {
    buildWeeklyStarProgress,
    calculateWeeklyScore,
    getWeeklyProtocolMessages,
} from '@/lib/data/weekly-protocol-messages';

const FUNDAMENTOS_ID = '613a4a63-ed4b-4cbf-9c64-49fe98074032';
const PERFORMANCE_ID = '63e69258-ca73-4a6f-bd64-13031fa140f2';

describe('weekly protocol messages', () => {
    it('creates at most four messages per week', () => {
        const messages = getWeeklyProtocolMessages(FUNDAMENTOS_ID, 90);

        // 13 weeks * 4 messages/week = 52 messages total
        expect(messages).toHaveLength(52);
        expect(messages.filter(message => message.role === 'weekly_weight')).toHaveLength(13);
        expect(messages.filter(message => message.role === 'weekly_adherence')).toHaveLength(13);
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
