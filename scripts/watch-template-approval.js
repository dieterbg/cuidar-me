/**
 * Poll Twilio Content API to watch the 3 new UTILITY templates.
 * Logs status every 10 min. Exits with a banner when all 3 are approved.
 *
 * Usage: node scripts/watch-template-approval.js
 */
require('dotenv').config({ path: '.env.local' });

const SIDS = [
    ['protocolo_registro', 'HX193cee2c16ff81693fecdf3f54092e19'],
    ['checkin_diario', 'HXe236db790c659423adb7d845cf13a127'],
    ['pesagem_semanal', 'HX2969139e625ba07c84dd1b3c002f6b2f'],
];

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const auth = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

async function checkOne(sid) {
    const res = await fetch(`https://content.twilio.com/v1/Content/${sid}/ApprovalRequests`, {
        headers: { Authorization: auth },
    });
    const json = await res.json();
    return {
        category: json.whatsapp?.category,
        status: json.whatsapp?.status,
        rejection: json.whatsapp?.rejection_reason || null,
    };
}

async function checkAll() {
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    console.log(`\n[${now}] Verificando aprovação...`);
    const results = [];
    for (const [name, sid] of SIDS) {
        try {
            const r = await checkOne(sid);
            const mark = r.status === 'approved' ? '✅' : r.status === 'rejected' ? '❌' : '⏳';
            console.log(`  ${mark} ${name.padEnd(22)} ${r.category} | ${r.status}${r.rejection ? ' | rejection: ' + r.rejection : ''}`);
            results.push({ name, ...r });
        } catch (e) {
            console.log(`  ⚠️  ${name} ERROR ${e.message}`);
            results.push({ name, error: e.message });
        }
    }
    return results;
}

async function main() {
    console.log('Monitor de aprovação — checando a cada 10 min.');
    console.log('Templates monitorados:', SIDS.map(([n]) => n).join(', '));

    while (true) {
        const results = await checkAll();
        const allApproved = results.every(r => r.status === 'approved');
        const anyRejected = results.some(r => r.status === 'rejected');

        if (allApproved) {
            console.log('\n========================================');
            console.log('🎉 TODOS OS 3 TEMPLATES APROVADOS!');
            console.log('========================================');
            console.log('Próximo passo: integrar SIDs no código.');
            process.exit(0);
        }
        if (anyRejected) {
            console.log('\n========================================');
            console.log('❌ ALGUM TEMPLATE FOI REJEITADO — verificar');
            console.log('========================================');
            process.exit(1);
        }

        await new Promise(r => setTimeout(r, 10 * 60 * 1000)); // 10 min
    }
}

main().catch(e => {
    console.error('Fatal:', e);
    process.exit(1);
});
