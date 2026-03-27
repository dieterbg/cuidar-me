import twilio from 'twilio';
import { writeFileSync } from 'fs';

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const client = twilio(accountSid, authToken);

// SIDs do burst de ontem (24/03 às 18:05)
const sids = [
    'SMdbd2b82010d9f4b8ce717ae9a78566c4', // 20/03 18h
    'MM335f51efcc9aaa7351d42c32289e76b8', // 20/03 19h
    'MM4651634e795319aee4e9a041c2d844af', // 21/03 19h
    'MM6902910ddfa8dfa8b19687d94078ada6', // 22/03 11h
    'MMced876361b1129adb8e55504d6379ea6', // 22/03 19h
    'SMaeaf83812da5ff6b72d40320a3699c4f', // 23/03 16h
    'MM504c9b5f7c9d24a68824d6c9396155f0', // 23/03 19h
    'SMf7d78e8f217a7c9385651ec8875fd610', // 24/03 18h
    'MMf593831047584f4bb342fce01bf68787', // 24/03 19h
];

async function run() {
    const lines: string[] = ['\n=== STATUS TWILIO VIA API ===\n'];

    for (const sid of sids) {
        const msg = await client.messages(sid).fetch();
        const brl = msg.dateSent?.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) ?? '-';
        lines.push(`${sid}`);
        lines.push(`  sent: ${brl} | status: ${msg.status} | direction: ${msg.direction}`);
        lines.push(`  errorCode: ${msg.errorCode ?? 'null'} | errorMessage: ${msg.errorMessage ?? 'null'}`);
        lines.push(`  to: ${msg.to} | from: ${msg.from}`);
        lines.push(`  body: ${msg.body?.substring(0, 80)}`);
        lines.push('');
    }

    writeFileSync('/tmp/twilio-status.txt', lines.join('\n'), 'utf8');
    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
