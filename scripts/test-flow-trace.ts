import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const logStream = fs.createWriteStream('scripts/flow-trace.json');
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

const logs: any[] = [];
console.log = (...args) => {
    logs.push({ level: 'info', args: args.map(a => typeof a === 'object' ? JSON.stringify(a) : a) });
    originalConsoleLog(...args);
};
console.error = (...args) => {
    logs.push({ level: 'error', args: args.map(a => typeof a === 'object' ? JSON.stringify(a) : a) });
    originalConsoleError(...args);
};

import { handlePatientReply } from '../src/ai/handle-patient-reply';
import { createServiceRoleClient } from '../src/lib/supabase-server-utils';

async function runTest() {
    console.log('--- STARTING FLOW TRACE ---');
    const supabase = createServiceRoleClient();

    const { data: patients } = await supabase.from('patients').select('whatsapp_number').ilike('full_name', '%Dieter%').limit(1);
    const whatsapp = patients?.[0]?.whatsapp_number || 'whatsapp:+5551980313050';

    console.log(`Testing with WhatsApp number: ${whatsapp}`);
    const message = 'vc consegue sugerir um exercicio?';

    try {
        console.log(`[1] Invoking handlePatientReply for message: "${message}"`);
        const result = await handlePatientReply(
            whatsapp,
            message,
            'Dieter BG'
        );
        console.log(`[END] Result:`, result);
    } catch (e: any) {
        console.error(`[CATASTROPHIC ERROR]`, e.stack);
    } finally {
        fs.writeFileSync('scripts/flow-trace.json', JSON.stringify(logs, null, 2));
    }
}

runTest();
