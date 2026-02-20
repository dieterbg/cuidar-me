import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getStepMessage } from '@/ai/onboarding';
import type { OnboardingStep } from '@/ai/onboarding';

/**
 * API Route: POST /api/onboarding/initiate
 * Inicia o onboarding WhatsApp para um paciente
 */
export async function POST(request: NextRequest) {
    try {
        const { patientId } = await request.json();

        if (!patientId) {
            return NextResponse.json(
                { success: false, error: 'Patient ID required' },
                { status: 400 }
            );
        }

        const supabase = createClient();

        // 1. Buscar dados do paciente
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('full_name, whatsapp_number, plan, status')
            .eq('id', patientId)
            .single();

        if (patientError || !patient) {
            return NextResponse.json(
                { success: false, error: 'Patient not found' },
                { status: 404 }
            );
        }

        // Verificar se já tem onboarding
        const { data: existingOnboarding } = await supabase
            .from('onboarding_states')
            .select('id, completed_at')
            .eq('patient_id', patientId)
            .single();

        if (existingOnboarding && !existingOnboarding.completed_at) {
            return NextResponse.json({
                success: false,
                error: 'Onboarding already in progress',
            });
        }

        if (existingOnboarding && existingOnboarding.completed_at) {
            return NextResponse.json({
                success: false,
                error: 'Onboarding already completed',
            });
        }

        // 2. Criar estado inicial
        const initialStep: OnboardingStep = 'welcome';
        const { error: createError } = await supabase
            .from('onboarding_states')
            .insert({
                patient_id: patientId,
                step: initialStep,
                plan: patient.plan,
                data: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });

        if (createError) {
            console.error('[POST /api/onboarding/initiate] Create error:', createError);
            return NextResponse.json(
                { success: false, error: 'Failed to create onboarding state' },
                { status: 500 }
            );
        }

        // 3. Gerar mensagem
        const welcomeMessage = getStepMessage(
            initialStep,
            patient.plan as 'freemium' | 'premium' | 'vip',
            {},
            patient.full_name
        );

        // 4. Enviar via WhatsApp
        if (!patient.whatsapp_number) {
            return NextResponse.json({
                success: false,
                error: 'WhatsApp number not registered',
            });
        }

        // 4. Enviar via WhatsApp (Twilio direto)
        const { sendWhatsappMessage } = await import('@/lib/twilio');
        const sent = await sendWhatsappMessage(patient.whatsapp_number, welcomeMessage);

        if (!sent) {
            console.error('[POST /api/onboarding/initiate] Twilio send failed');
            return NextResponse.json(
                { success: false, error: 'Failed to send WhatsApp message' },
                { status: 500 }
            );
        }

        console.log(`[POST /api/onboarding/initiate] Success for patient ${patientId}`);

        return NextResponse.json({
            success: true,
            message: 'WhatsApp onboarding initiated successfully',
        });
    } catch (error: any) {
        console.error('[POST /api/onboarding/initiate] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Unexpected error' },
            { status: 500 }
        );
    }
}
