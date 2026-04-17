import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const AUTH_USER_ID = '885e29df-ebc0-4475-a853-8e1ac1866f3a';

async function run() {
    console.log(`[DEBUG] Tentando excluir usuário Auth ID: ${AUTH_USER_ID}`);
    
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );
    
    const { error } = await supabase.auth.admin.deleteUser(AUTH_USER_ID);
    
    if (error) {
        console.error('[ERROR] Falha ao excluir usuário:', error.message);
        process.exit(1);
    }
    
    console.log('[DEBUG] Usuário Auth excluído com sucesso.');
}

run().catch((err) => {
    console.error('[DEBUG] Erro fatal no script:', err);
    process.exit(1);
});
