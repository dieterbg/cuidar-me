
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function cleanUp() {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) {
        console.error('List error:', error);
        return;
    }

    const admin = users.find(u => u.email === 'admin@gmail.com');
    if (admin) {
        console.log('Deleting ghost user admin@gmail.com:', admin.id);
        const { error: deleteError } = await supabase.auth.admin.deleteUser(admin.id);
        if (deleteError) {
            console.error('Delete error:', deleteError);
        } else {
            console.log('Successfully deleted admin@gmail.com');
        }
    } else {
        console.log('admin@gmail.com not found. Nothing to clean up.');
    }
}

cleanUp();
