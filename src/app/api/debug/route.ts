import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server-utils';

export async function GET(request: NextRequest) {
    const supabase = createServiceRoleClient();

    try {
        const { data: patients, error: patientError } = await supabase
            .from('patients')
            .select('id, full_name, whatsapp_number, plan, last_message')
            .like('whatsapp_number', '%0099%')
            .order('created_at', { ascending: false })
            .limit(1);

        if (patientError || !patients || patients.length === 0) {
            return NextResponse.json({ error: 'Patient not found', details: patientError });
        }

        const patient = patients[0];

        const { data: states, error: statesError } = await supabase
            .from('onboarding_states')
            .select('*')
            .eq('patient_id', patient.id)
            .order('created_at', { ascending: false });

        const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('*')
            .eq('patient_id', patient.id)
            .order('created_at', { ascending: false })
            .limit(10);

        return NextResponse.json({
            patient,
            states,
            messages,
            statesError,
            messagesError,
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
