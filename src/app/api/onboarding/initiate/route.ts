import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getCurrentUser } from '@/lib/supabase-server-utils';
import { getStepMessage } from '@/ai/onboarding';
import type { OnboardingStep } from '@/ai/onboarding';

/**
 * API Route: POST /api/onboarding/initiate
 * Inicia o onboarding WhatsApp para um paciente
 * Requer: usuário autenticado (staff ou paciente) ou CRON_SECRET header
 */
export async function POST(request: NextRequest) {
    try {
        // Verificar autenticação — permite usuário logado OU cron interno
        const cronSecret = request.headers.get('x-cron-secret');
        const isValidCron = cronSecret && cronSecret === process.env.CRON_SECRET;

        if (!isValidCron) {
            const user = await getCurrentUser();
            if (!user) {
                return NextResponse.json(
                    { success: false, error: 'Unauthorized' },
                    { status: 401 }
                );
            }
        }

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
            .select('id, completed_at, created_at')
            .eq('patient_id', patientId)
            .maybeSingle();

        // 2. Verificar se foi INICIADO recentemente (trava de segurança de 5 minutos)
        if (existingOnboarding) {
            // Se foi criado nos últimos 5 minutos, não reinicia (evita duplicidade por cliques rápidos ou bugs de UI)
            const createdAt = new Date(existingOnboarding.created_at).getTime();
            const now = new Date().getTime();
            const tenSeconds = 10 * 1000;

            if (now - createdAt < tenSeconds) {
                console.log(`[POST /api/onboarding/initiate] Onboarding initiated too recently for ${patientId}. Skipping.`);
                return NextResponse.json({
                    success: false,
                    error: 'Onboarding já enviado recentemente. Aguarde 10 segundos antes de tentar novamente.',
                    skipped: true
                });
            }
        }

        // Apagar qualquer estado de onboarding anterior para este paciente
        // Isso permite re-onboarding de pacientes que cancelaram anteriormente ou foram resetados.
        const { error: deleteError } = await supabase
            .from('onboarding_states')
            .delete()
            .eq('patient_id', patientId);

        if (deleteError) {
            console.error('[POST /api/onboarding/initiate] Error resetting onboarding state:', deleteError);
        }

        // Criar um novo estado de onboarding limpo
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
            console.error('[POST /api/onboarding/initiate] Error creating onboarding state:', createError);
            return NextResponse.json(
                { success: false, error: 'Failed to create onboarding state' },
                { status: 500 }
            );
        }

        // 3. Gerar mensagem
        // Se houver template, o histórico deve refletir a mensagem curta (realidade do WhatsApp)
        const hasTemplate = !!process.env.TWILIO_WELCOME_TEMPLATE_SID;

        let welcomeMessage = '';
        try {
            welcomeMessage = getStepMessage(
                initialStep,
                patient.plan as 'freemium' | 'premium' | 'vip',
                {},
                patient.full_name,
                !hasTemplate // se não tem template, envia mensagem completa. se tem, histórico = mensagem curta
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

        // Suporte para Template (Content API) - DESATIVADO para usar o texto corrigido do código
        // const contentSid = process.env.TWILIO_WELCOME_TEMPLATE_SID;
        const contentSid = undefined;
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

        // 5. Registrar mensagem no histórico para evitar duplicidade de boas-vindas
        const { addMessage } = await import('@/ai/actions/messages');
        await addMessage(patientId, {
            sender: 'system',
            text: welcomeMessage
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
