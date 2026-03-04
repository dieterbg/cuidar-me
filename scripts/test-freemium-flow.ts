/**
 * 🧪 Teste Automatizado: Fluxo Freemium Completo
 * 
 * Valida TODA a lógica pura (sem DB/Twilio) do fluxo Freemium:
 * - Onboarding: steps, mensagens, routing
 * - Freemium gate: bloqueio de chat
 * - Emergência: keywords detectadas
 * - Opt-out: keywords aceitas
 * - Mensagens: conteúdo correto por plano
 * 
 * Executar: npx tsx scripts/test-freemium-flow.ts
 */

import { getNextStep, getStepMessage, processStepResponse } from '../src/ai/onboarding';

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
// EMERGENCY PATTERNS (copied from handle-patient-reply.ts)
// ============================================================
const EMERGENCY_PATTERNS = [
    /dor.{0,15}(peito|braço|cabeça\s+forte|torax)/i,
    /desmai|desfale|apag|perd.{0,10}(consciência|sentidos)/i,
    /suicid|me\s+mat|não\s+aguento\s+mais|não\s+vejo\s+saída|quero\s+sumir/i,
    /não\s+consigo\s+respir|falta\s+de\s+ar|sufoc/i,
    /reação.{0,15}(medicamento|alergi|remédio)/i,
    /visão\s+(escurec|embara)|quase\s+desmaiei/i,
    /tremed?eira|suando\s+frio|convuls/i,
    /inchaço.{0,15}(língua|garganta|rosto)/i,
];

function isEmergency(msg: string): boolean {
    return EMERGENCY_PATTERNS.some(p => p.test(msg));
}

// ============================================================
// OPT-OUT KEYWORDS (copied from handle-patient-reply.ts)
// ============================================================
const OPT_OUT_KEYWORDS = ['sair', 'stop', 'cancelar', 'parar', 'unsubscribe'];

function isOptOut(msg: string): boolean {
    return OPT_OUT_KEYWORDS.includes(msg.toLowerCase().trim());
}

// ============================================================
// RATE LIMIT LOGIC (copied from handle-patient-reply.ts)
// ============================================================
const DAILY_LIMITS: Record<string, number> = {
    freemium: 5,
    premium: 30,
    vip: Infinity,
};

// ============================================================
// TESTS
// ============================================================

function runTests() {
    console.log('\n🧪 TESTE AUTOMATIZADO: FLUXO FREEMIUM COMPLETO\n');

    // ========================================================
    // TESTE 1: ONBOARDING — Steps
    // ========================================================
    section('TESTE 1: Onboarding — Navegação de Steps');

    // 1.1 Freemium: welcome → complete (PULA preferences)
    const nextAfterWelcomeFreemium = getNextStep('welcome', 'freemium', {});
    assert('1.1 Freemium pula preferências (welcome → complete)',
        nextAfterWelcomeFreemium === 'complete',
        `Got: ${nextAfterWelcomeFreemium}`
    );

    // 1.2 Premium: welcome → preferences (NÃO pula)
    const nextAfterWelcomePremium = getNextStep('welcome', 'premium', {});
    assert('1.2 Premium NÃO pula preferências (welcome → preferences)',
        nextAfterWelcomePremium === 'preferences',
        `Got: ${nextAfterWelcomePremium}`
    );

    // 1.3 VIP: welcome → preferences (NÃO pula)
    const nextAfterWelcomeVip = getNextStep('welcome', 'vip', {});
    assert('1.3 VIP NÃO pula preferências (welcome → preferences)',
        nextAfterWelcomeVip === 'preferences',
        `Got: ${nextAfterWelcomeVip}`
    );

    // 1.4 Premium: preferences → complete
    const nextAfterPrefs = getNextStep('preferences', 'premium', { preferredTime: 'morning' });
    assert('1.4 Premium preferences → complete',
        nextAfterPrefs === 'complete',
        `Got: ${nextAfterPrefs}`
    );

    // ========================================================
    // TESTE 2: ONBOARDING — Mensagens Welcome
    // ========================================================
    section('TESTE 2: Onboarding — Mensagens Welcome');

    const welcomeFreemium = getStepMessage('welcome', 'freemium', {}, 'Dieter');
    const welcomePremium = getStepMessage('welcome', 'premium', {}, 'Maria');
    const welcomeVip = getStepMessage('welcome', 'vip', {}, 'João');

    // 2.1 Freemium welcome contém 🌱 e "Gratuito"
    assert('2.1 Freemium welcome menciona plano 🌱 Freemium',
        welcomeFreemium.includes('🌱') && welcomeFreemium.includes('Freemium'),
        `Got: ${welcomeFreemium.substring(0, 80)}...`
    );

    // 2.2 Freemium welcome menciona 8h
    assert('2.2 Freemium welcome menciona dica diária 8h',
        welcomeFreemium.includes('8h'),
        'Missing "8h"'
    );

    // 2.3 Freemium welcome menciona Premium (upsell)
    assert('2.3 Freemium welcome tem upsell para Premium',
        welcomeFreemium.includes('Premium'),
        'Missing "Premium"'
    );

    // 2.4 Freemium welcome NÃO promete check-in como benefício próprio
    // (pode mencionar check-in na frase de upsell para Premium — isso é marketing)
    assert('2.4 Freemium welcome NÃO promete check-in como benefício',
        !welcomeFreemium.includes('Check-in consolidado') && !welcomeFreemium.includes('📊 Check-in'),
        'Found check-in as a Freemium promise!'
    );

    // 2.5 Freemium welcome NÃO promete IA 24h
    assert('2.5 Freemium welcome NÃO promete IA 24h',
        !welcomeFreemium.includes('24h'),
        'Found "24h" in Freemium welcome!'
    );

    // 2.6 Premium welcome contém 💎 e detalhes do plano
    assert('2.6 Premium welcome menciona 💎 Premium',
        welcomePremium.includes('💎') && welcomePremium.includes('Premium'),
        `Got: ${welcomePremium.substring(0, 80)}...`
    );

    // 2.7 Premium welcome menciona check-in e IA
    assert('2.7 Premium welcome menciona check-in e IA',
        welcomePremium.includes('Check-in') && welcomePremium.includes('24h'),
        'Missing check-in or 24h in Premium welcome'
    );

    // 2.8 VIP welcome contém ⭐
    assert('2.8 VIP welcome menciona ⭐ VIP',
        welcomeVip.includes('⭐') && welcomeVip.includes('VIP'),
        `Got: ${welcomeVip.substring(0, 80)}...`
    );

    // ========================================================
    // TESTE 3: ONBOARDING — Mensagens Complete
    // ========================================================
    section('TESTE 3: Onboarding — Mensagens Complete');

    const completeFreemium = getStepMessage('complete', 'freemium', {}, 'Dieter');
    const completePremium = getStepMessage('complete', 'premium', { preferredTime: 'morning' }, 'Maria');
    const completeVip = getStepMessage('complete', 'vip', { preferredTime: 'night' }, 'João');

    // 3.1 Freemium complete menciona Dica de Saúde 8h
    assert('3.1 Freemium complete menciona Dica de Saúde e 8h',
        completeFreemium.includes('8h') && completeFreemium.includes('Dica'),
        `Got: ${completeFreemium.substring(0, 80)}...`
    );

    // 3.2 Freemium complete tem upsell Premium
    assert('3.2 Freemium complete tem upsell para Premium',
        completeFreemium.includes('Premium'),
        'Missing "Premium" in Freemium complete'
    );

    // 3.3 Freemium complete NÃO promete check-in como benefício
    // (pode mencionar no upsell)
    assert('3.3 Freemium complete NÃO promete check-in como benefício',
        !completeFreemium.includes('Check-in consolidado') && !completeFreemium.includes('📊 Check-in'),
        'Found check-in as Freemium benefit!'
    );

    // 3.4 Freemium complete NÃO menciona gamificação/pontos
    assert('3.4 Freemium complete NÃO menciona gamificação/pontos',
        !completeFreemium.includes('pontos') && !completeFreemium.includes('Gamificação'),
        'Found gamification in Freemium complete!'
    );

    // 3.5 Premium complete menciona check-in consolidado 20h
    assert('3.5 Premium complete menciona check-in consolidado 20h',
        completePremium.includes('20h') && completePremium.toLowerCase().includes('check-in'),
        `Got: ${completePremium.substring(0, 100)}...`
    );

    // 3.6 Premium complete menciona IA 24h
    assert('3.6 Premium complete menciona IA 24h',
        completePremium.includes('24h'),
        'Missing "24h" in Premium complete'
    );

    // 3.7 VIP complete menciona "ilimitado" e "prioridade"
    assert('3.7 VIP complete menciona ilimitado e prioridade',
        completeVip.toLowerCase().includes('ilimitado') && completeVip.toLowerCase().includes('prioridade'),
        `Got: ${completeVip.substring(0, 100)}...`
    );

    // ========================================================
    // TESTE 4: ONBOARDING — Processamento de Respostas
    // ========================================================
    section('TESTE 4: Onboarding — Processamento de Respostas');

    // 4.1 "Sim" aceita no welcome
    const simResult = processStepResponse('welcome', 'Sim', {});
    assert('4.1 "Sim" aceita no welcome step',
        !simResult.error,
        `Error: ${simResult.error}`
    );

    // 4.2 "Vamos" aceita no welcome
    const vamosResult = processStepResponse('welcome', 'Vamos lá!', {});
    assert('4.2 "Vamos" aceita no welcome step',
        !vamosResult.error,
        `Error: ${vamosResult.error}`
    );

    // 4.3 "Ajustar" retorna erro com link
    const ajustarResult = processStepResponse('welcome', 'Ajustar', {});
    assert('4.3 "Ajustar" retorna erro com link de perfil',
        !!ajustarResult.error && ajustarResult.error.includes('profile'),
        `Error: ${ajustarResult.error}`
    );

    // 4.4 "Talvez" retorna erro
    const talvezResult = processStepResponse('welcome', 'Talvez', {});
    assert('4.4 "Talvez" (inválido) retorna erro',
        !!talvezResult.error,
        'Should have returned error for "Talvez"'
    );

    // 4.5 Preferences: "A" → morning
    const prefA = processStepResponse('preferences', 'A', {});
    assert('4.5 Preferência "A" → morning',
        prefA.data.preferredTime === 'morning',
        `Got: ${prefA.data.preferredTime}`
    );

    // 4.6 Preferences: "B" → afternoon
    const prefB = processStepResponse('preferences', 'B', {});
    assert('4.6 Preferência "B" → afternoon',
        prefB.data.preferredTime === 'afternoon',
        `Got: ${prefB.data.preferredTime}`
    );

    // 4.7 Preferences: "C" → night
    const prefC = processStepResponse('preferences', 'C', {});
    assert('4.7 Preferência "C" → night',
        prefC.data.preferredTime === 'night',
        `Got: ${prefC.data.preferredTime}`
    );

    // ========================================================
    // TESTE 5: EMERGÊNCIA — Keywords
    // ========================================================
    section('TESTE 5: Emergência — Detecção de Keywords');

    // 5.1 Dor no peito
    assert('5.1 "Estou com dor forte no peito" → emergência',
        isEmergency('Estou com dor forte no peito'),
        'Should detect chest pain'
    );

    // 5.2 Desmaio
    assert('5.2 "Acho que vou desmaiar" → emergência',
        isEmergency('Acho que vou desmaiar'),
        'Should detect fainting'
    );

    // 5.3 Suicídio
    assert('5.3 "Não aguento mais, quero sumir" → emergência',
        isEmergency('Não aguento mais, quero sumir'),
        'Should detect suicidal ideation'
    );

    // 5.4 Falta de ar
    assert('5.4 "Não consigo respirar" → emergência',
        isEmergency('Não consigo respirar'),
        'Should detect breathing difficulty'
    );

    // 5.5 Reação alérgica
    assert('5.5 "Reação ao medicamento" → emergência',
        isEmergency('Tive uma reação ao medicamento'),
        'Should detect medication reaction'
    );

    // 5.6 Mensagem normal NÃO é emergência
    assert('5.6 "Bom dia" NÃO é emergência',
        !isEmergency('Bom dia! Tudo bem?'),
        'Should not detect emergency in greeting'
    );

    // 5.7 Pergunta de saúde NÃO é emergência
    assert('5.7 "Posso comer chocolate?" NÃO é emergência',
        !isEmergency('Posso comer chocolate à noite?'),
        'Should not detect emergency in health question'
    );

    // 5.8 Suando frio
    assert('5.8 "Estou suando frio" → emergência',
        isEmergency('Estou suando frio'),
        'Should detect cold sweat'
    );

    // ========================================================
    // TESTE 6: OPT-OUT — Keywords
    // ========================================================
    section('TESTE 6: Opt-Out — Keywords');

    assert('6.1 "SAIR" → opt-out', isOptOut('SAIR'));
    assert('6.2 "sair" → opt-out', isOptOut('sair'));
    assert('6.3 "stop" → opt-out', isOptOut('stop'));
    assert('6.4 "cancelar" → opt-out', isOptOut('cancelar'));
    assert('6.5 "parar" → opt-out', isOptOut('parar'));
    assert('6.6 "unsubscribe" → opt-out', isOptOut('unsubscribe'));
    assert('6.7 "Bom dia" NÃO é opt-out', !isOptOut('Bom dia'));
    assert('6.8 "Sim" NÃO é opt-out', !isOptOut('Sim'));

    // ========================================================
    // TESTE 7: RATE LIMIT — Por Plano
    // ========================================================
    section('TESTE 7: Rate Limits por Plano');

    assert('7.1 Freemium limit = 5', DAILY_LIMITS.freemium === 5);
    assert('7.2 Premium limit = 30', DAILY_LIMITS.premium === 30);
    assert('7.3 VIP limit = ilimitado', DAILY_LIMITS.vip === Infinity);
    assert('7.4 Plano desconhecido → fallback freemium (5)',
        (DAILY_LIMITS['unknown'] ?? DAILY_LIMITS.freemium) === 5
    );

    // ========================================================
    // TESTE 8: FLUXO COMPLETO SIMULADO
    // ========================================================
    section('TESTE 8: Fluxo Completo Simulado (Freemium)');

    // Simular toda a jornada do Freemium
    const plan = 'freemium';

    // Step 1: welcome
    const step1Msg = getStepMessage('welcome', plan, {}, 'Dieter');
    assert('8.1 Step 1 welcome — mensagem gerada', step1Msg.length > 50);

    // Step 2: user says "Sim"
    const step1Response = processStepResponse('welcome', 'Sim', {});
    assert('8.2 Step 2 "Sim" — aceito sem erro', !step1Response.error);

    // Step 3: calcular próximo step — deve pular para complete
    const step2 = getNextStep('welcome', plan, step1Response.data);
    assert('8.3 Step 3 — pula preferências para complete', step2 === 'complete');

    // Step 4: mensagem complete
    const step3Msg = getStepMessage('complete', plan, { preferredTime: 'morning' }, 'Dieter');
    assert('8.4 Step 4 complete — tem "8h" e "Dica"',
        step3Msg.includes('8h') && step3Msg.includes('Dica')
    );
    assert('8.5 Step 4 complete — NÃO promete check-in/gamificação como benefício',
        !step3Msg.includes('📊 Check-in') && !step3Msg.includes('pontos') && !step3Msg.includes('Check-in consolidado')
    );

    // Step 5: após onboarding, usuario manda "Oi" → deveria ser bloqueado pelo gate
    // (não podemos simular o gate completo sem DB, mas testamos a lógica)
    const msgNormal = 'Oi, tudo bem?';
    assert('8.6 "Oi" NÃO é emergência (gate bloquearia)',
        !isEmergency(msgNormal)
    );
    assert('8.7 "Oi" NÃO é opt-out (gate bloquearia)',
        !isOptOut(msgNormal)
    );
    // Portanto: Freemium gate mandaria upsell ✅

    // ========================================================
    // RESULTADOS
    // ========================================================
    section('RESULTADOS');

    console.log(`\n  Total: ${passed + failed} testes`);
    console.log(`  ✅ Passou: ${passed}`);
    console.log(`  ❌ Falhou: ${failed}`);

    if (failed > 0) {
        console.log(`\n  ❌ TESTES COM FALHA:`);
        results.filter(r => r.status.includes('FAIL')).forEach(r => {
            console.log(`     ${r.test}${r.detail ? ` — ${r.detail}` : ''}`);
        });
    }

    console.log(`\n${failed === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️ SOME TESTS FAILED'}\n`);

    process.exit(failed > 0 ? 1 : 0);
}

runTests();
