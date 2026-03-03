import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server-utils';
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

        const supabase = createServiceRoleClient();


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

        const { data: existingOnboarding, error: onboardingError } = await supabase
            .from('onboarding_states')
            .select('id, completed_at')
            .eq('patient_id', patientId)
            .maybeSingle(); // Use maybeSingle to avoid 406 errors if none exists

        if (onboardingError) {

        }



        if (existingOnboarding && !existingOnboarding.completed_at) {

        }

        if (existingOnboarding && existingOnboarding.completed_at) {

        }

        // 2. Criar ou Resetar estado inicial se for manual
        const initialStep: OnboardingStep = 'welcome';
        if (!existingOnboarding) {

            const { error: createError } = await supabase
                .from('onboarding_states')
                .insert({
                    patient_id: patientId,
                    current_step: initialStep, // Check field name! (was 'step' in some versions)
                    metadata: { source: 'api_manual_trigger' }
                });

            if (createError) {

                // Fallback to 'step' if 'current_step' fails (depends on DB schema)
                const { error: createError2 } = await supabase
                    .from('onboarding_states')
                    .insert({
                        patient_id: patientId,
                        step: initialStep,
                        plan: patient.plan,
                        data: {},
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    });

            }
        }

        // 3. Gerar mensagem

        let welcomeMessage = '';
        try {
            welcomeMessage = getStepMessage(
                initialStep,
                patient.plan as 'freemium' | 'premium' | 'vip',
                {},
                patient.full_name
            );
        } catch (e: any) {

            // Fallback for onboarding.ts v1 (without plan/data args)
            welcomeMessage = (getStepMessage as any)(initialStep, patient.full_name);
        }


        // 4. Enviar via WhatsApp
        if (!patient.whatsapp_number) {
            return NextResponse.json({
                success: false,
                error: 'WhatsApp number not registered',
            });
        }

        const { sendWhatsappMessage } = await import('@/lib/twilio');

        // Suporte para Template (Content API)
        const contentSid = process.env.TWILIO_WELCOME_TEMPLATE_SID;
        const planEmoji = patient.plan === 'vip' ? '⭐' : patient.plan === 'premium' ? '💎' : '🌱';
        const planName = patient.plan === 'vip' ? 'VIP' : patient.plan === 'premium' ? 'Premium' : 'Freemium';

        const sent = await sendWhatsappMessage(
            patient.whatsapp_number,
            welcomeMessage,
            {
                contentSid,
                contentVariables: {
                    "1": patient.full_name,
                    "2": planEmoji,
                    "3": planName
                }
            }
        );

        if (!sent) {
            return NextResponse.json(
                { success: false, error: 'Failed to send WhatsApp message' },
                { status: 500 }
            );
        }

        // Se for Freemium, enviar uma segunda mensagem com os detalhes do plano (já que o template pode estar desatualizado)
        if (patient.plan === 'freemium') {
            const freemiumDetails = `Como você está no plano **Gratuito**, você receberá suas dicas e lembretes de saúde sempre pela manhã (8h). 🌅\n\n_Nota: No plano gratuito, o chat com IA não está habilitado para dúvidas personalizadas._`;

            await sendWhatsappMessage(patient.whatsapp_number, freemiumDetails);

            // Também registrar esta no histórico
            await supabase.from('messages').insert({
                patient_id: patientId,
                sender: 'system',
                text: freemiumDetails,
            });
        }

        // 5. Registrar mensagem no histórico para evitar duplicidade de boas-vindas
        await supabase.from('messages').insert({
            patient_id: patientId,
            sender: 'system',
            text: welcomeMessage,
        });

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
