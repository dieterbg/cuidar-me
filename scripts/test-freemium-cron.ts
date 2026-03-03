import { sendFreemiumTips } from '../src/cron/send-freemium-tips';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function test() {
    console.log('--- TESTANDO CRON FREEMIUM TIPS ---');
    const result = await sendFreemiumTips();
    console.log('Resultado:', JSON.stringify(result, null, 2));
}

test().catch(console.error);
