import { createServiceRoleClient } from './src/lib/supabase-server-utils';
import { processMessageQueue } from './src/ai/handle-patient-reply';
import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente do .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
    console.log('[DEBUG] Iniciando processamento manual da fila...');
    
    const supabase = createServiceRoleClient();
    
    console.log('[DEBUG] Chamando processMessageQueue...');
    const result = await processMessageQueue(supabase);
    
    console.log('[DEBUG] Resultado do processamento:', JSON.stringify(result, null, 2));
}

run().catch((err) => {
    console.error('[DEBUG] Erro fatal no script:', err);
    process.exit(1);
});
