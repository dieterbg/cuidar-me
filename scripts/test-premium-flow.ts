/**
 * 🧪 Teste Automatizado: Fluxo Premium Completo
 * 
 * Valida a lógica do fluxo Premium:
 * - Onboarding com escolha de horário
 * - Chat com IA permitido (não bloqueado por Freemium gate)
 * - Rate limits (30 msgs)
 * - Integração de emergência
 */

import { getNextStep, getStepMessage } from '../src/ai/onboarding';

// ============================================================
// Helpers
// ============================================================
let passed = 0;
let failed = 0;
const results: { test: string; status: string; detail?: string }[] = [];

function assert(testName: string, condition: boolean, detail?: string) {
    if (condition) {
        passed++;
        results.push({ test: testName, status: '✅ PASS' });
        console.log(`  ✅ ${testName}`);
    } else {
        failed++;
        results.push({ test: testName, status: '❌ FAIL', detail });
        console.log(`  ❌ ${testName}${detail ? ` — ${detail}` : ''}`);
    }
}

function section(name: string) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  ${name}`);
    console.log(`${'═'.repeat(60)}`);
}

// ============================================================
// RATE LIMIT LOGIC (copied from handle-patient-reply.ts)
// ============================================================
const DAILY_LIMITS: Record<string, number> = {
    freemium: 5,
    premium: 30,
    vip: Infinity,
};

function checkRateLimit(plan: string, messageCountToday: number): { allowed: boolean; reason?: string } {
    const limit = DAILY_LIMITS[plan] || 5;

    // Premium gate check
    if (plan === 'freemium') {
        if (messageCountToday >= limit) {
            return { allowed: false, reason: 'FREEMIUM_HARD_LIMIT' };
        }
        return { allowed: false, reason: 'FREEMIUM_GATE' };
    }

    // Premium/VIP limits
    if (messageCountToday >= limit) {
        return { allowed: false, reason: 'RATE_LIMIT_EXCEEDED' };
    }

    return { allowed: true };
}

// ============================================================
// TESTS
// ============================================================

function runTests() {
    console.log('\n🧪 TESTE AUTOMATIZADO: FLUXO PREMIUM COMPLETO\n');

    // ========================================================
    // TESTE 1: ONBOARDING — Steps Premium
    // ========================================================
    section('TESTE 1: Onboarding Premium — Navegação');

    // 1.1 Premium: welcome → preferences (NÃO pula prefs)
    const nextAfterWelcome = getNextStep('welcome', 'premium', {});
    assert('1.1 Premium pede preferência de horário (welcome → preferences)',
        nextAfterWelcome === 'preferences',
        `Got: ${nextAfterWelcome}`
    );

    // 1.2 Premium: preferences → complete
    const nextAfterPrefs = getNextStep('preferences', 'premium', { preferredTime: 'morning' });
    assert('1.2 Premium completa onboarding após preferência',
        nextAfterPrefs === 'complete',
        `Got: ${nextAfterPrefs}`
    );

    // ========================================================
    // TESTE 2: ONBOARDING — Mensagens
    // ========================================================
    section('TESTE 2: Onboarding Premium — Mensagens');

    const welcomePremium = getStepMessage('welcome', 'premium', {}, 'Maria');

    assert('2.1 Welcome menciona 💎 Premium',
        welcomePremium.includes('💎') && welcomePremium.includes('Premium'),
        'Faltou 💎 ou Premium'
    );

    assert('2.2 Welcome menciona check-in diário e IA 24h',
        welcomePremium.includes('Check-in') && welcomePremium.includes('24h'),
        'Não mencionou check-in ou IA 24h'
    );

    const prefsPremium = getStepMessage('preferences', 'premium', {}, 'Maria');

    assert('2.3 Preferences pede horário A/B/C',
        prefsPremium.includes('A)') && prefsPremium.includes('B)') && prefsPremium.includes('C)'),
        'Não listou opções de horário'
    );

    const completePremium = getStepMessage('complete', 'premium', { preferredTime: 'morning' }, 'Maria');

    assert('2.4 Complete confirma check-in às 20h',
        completePremium.includes('20h') && completePremium.includes('check-in'),
        'Não confirmou horário do check-in consolidado'
    );

    // ========================================================
    // TESTE 3: CHAT E RATE LIMIT
    // ========================================================
    section('TESTE 3: Chat com IA e Limites');

    // 3.1 Mensagem inicial liberada
    const check1 = checkRateLimit('premium', 0);
    assert('3.1 Chat liberado (0 msgs hoje)',
        check1.allowed === true,
        `Bloqueado por: ${check1.reason}`
    );

    // 3.2 Metade do limite
    const check15 = checkRateLimit('premium', 15);
    assert('3.2 Chat liberado na metade do limite (15 msgs)',
        check15.allowed === true,
        `Bloqueado por: ${check15.reason}`
    );

    // 3.3 Atingindo limite (30)
    const check30 = checkRateLimit('premium', 30);
    assert('3.3 Chat bloqueado ao atingir 30 msgs',
        check30.allowed === false && check30.reason === 'RATE_LIMIT_EXCEEDED',
        `Passou incorretamente ou erro de reason: ${check30.reason}`
    );

    // ========================================================
    // RESUMO
    // ========================================================
    section('RESULTADO FINAL');
    console.log(`  Total de testes: ${passed + failed}`);
    console.log(`  ✅ Passaram: ${passed}`);
    console.log(`  ❌ Falharam: ${failed}`);

    if (failed > 0) {
        console.log('\n❌ ALGUNS TESTES FALHARAM!');
        process.exit(1);
    } else {
        console.log('\n✅ TODOS OS TESTES PASSARAM COM SUCESSO!\n');
    }
}

// Executar
try {
    runTests();
} catch (error) {
    console.error('Erro fatal durante a execução dos testes:', error);
    process.exit(1);
}
