/**
 * Lightweight Test Runner
 * Run with: npx tsx scripts/run-tests.ts
 */

import { calculatePoints, extractPerspective, isGamificationCheckin } from '@/ai/protocol-response-processor';
import { getNextCheckinStep } from '@/ai/daily-checkin';
import { getMessage } from '@/lib/messages';

// Simple assertion helper
function expect(actual: any, expected: any, message: string) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        console.error(`❌ FAIL: ${message}`);
        console.error(`   Expected: ${JSON.stringify(expected)}`);
        console.error(`   Actual:   ${JSON.stringify(actual)}`);
        process.exit(1);
    } else {
        console.log(`✅ PASS: ${message}`);
    }
}

async function runTests() {
    console.log('🧪 Starting Automated Tests...\n');

    // 1. Test Protocol Response Processor
    console.log('--- Testing Protocol Response Processor ---');

    // Test isGamificationCheckin
    expect(
        isGamificationCheckin({ title: '[GAMIFICAÇÃO] Teste', day: 1, message: '' }),
        true,
        'Should detect gamification tag'
    );
    expect(
        isGamificationCheckin({ title: 'Normal Message', day: 1, message: '' }),
        false,
        'Should ignore normal messages'
    );

    // Test extractPerspective
    expect(
        extractPerspective({ title: '', day: 1, message: '', perspective: 'alimentacao' }),
        'alimentacao',
        'Should extract perspective'
    );

    // Test calculatePoints (Alimentação)
    expect(
        calculatePoints('Almoço', 'A', 'alimentacao'),
        20,
        'Should award 20 points for A in meals'
    );
    expect(
        calculatePoints('Almoço', 'B', 'alimentacao'),
        15,
        'Should award 15 points for B in meals'
    );
    expect(
        calculatePoints('Almoço', 'C', 'alimentacao'),
        10,
        'Should award 10 points for C in meals'
    );

    // Test calculatePoints (Hidratação)
    expect(
        calculatePoints('Hidratação', 'A', 'hidratacao'),
        15,
        'Should award 15 points for A in hydration'
    );

    // 2. Test Daily Check-in Logic
    console.log('\n--- Testing Daily Check-in Logic ---');

    // Test getNextCheckinStep
    expect(
        getNextCheckinStep('hydration', 'premium', false),
        'breakfast',
        'Hydration -> Breakfast'
    );
    expect(
        getNextCheckinStep('wellbeing', 'premium', false),
        'complete',
        'Wellbeing -> Complete (non-weight day)'
    );
    expect(
        getNextCheckinStep('wellbeing', 'premium', true),
        'weight',
        'Wellbeing -> Weight (weight day)'
    );

    // 3. Test Messages System
    console.log('\n--- Testing Messages System ---');

    expect(
        getMessage('SOCIAL', 'GREETING'),
        "Olá! 😊 Como posso te ajudar hoje?",
        'Should retrieve static message'
    );

    const msg = getMessage('PROTOCOL', 'CONGRATULATIONS', 'Protocolo X', 90);
    expect(
        msg.includes('Protocolo X') && msg.includes('90 dias'),
        true,
        'Should interpolate variables in message'
    );

    console.log('\n🎉 ALL TESTS PASSED!');
}

runTests().catch(console.error);
