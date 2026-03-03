/**
 * @fileOverview Onboarding conversacional MÍNIMO via WhatsApp
 * Cadastro completo acontece na plataforma web
 * WhatsApp apenas confirma e define preferências (3 passos)
 */

import { z } from 'zod';

// Estados do onboarding (SIMPLIFICADO)
export type OnboardingStep =
    | 'welcome'      // Confirma dados e pergunta se quer começar
    | 'preferences'  // Horário preferido para mensagens
    | 'complete';    // Mensagem final

export interface OnboardingState {
    step: OnboardingStep;
    plan: 'freemium' | 'premium' | 'vip';
    data: {
        preferredTime?: 'morning' | 'afternoon' | 'night';
    };
    createdAt: Date;
    updatedAt: Date;
}

// Schema para validação
export const OnboardingDataSchema = z.object({
    preferredTime: z.enum(['morning', 'afternoon', 'night']).optional(),
});

/**
 * Determina o próximo passo do onboarding
 */
export function getNextStep(
    currentStep: OnboardingStep,
    plan: 'freemium' | 'premium' | 'vip',
    data: OnboardingState['data']
): OnboardingStep {
    const flow: OnboardingStep[] = ['welcome', 'preferences', 'complete'];

    const currentIndex = flow.indexOf(currentStep);

    if (currentIndex === -1 || currentIndex === flow.length - 1) {
        return 'complete';
    }

    // Pular preferências para o plano Freemium
    const nextStep = flow[currentIndex + 1];
    if (plan === 'freemium' && nextStep === 'preferences') {
        return 'complete';
    }

    return nextStep;
}

/**
 * Gera a mensagem para cada passo do onboarding
 */
export function getStepMessage(
    step: OnboardingStep,
    plan: 'freemium' | 'premium' | 'vip',
    data: OnboardingState['data'],
    patientName?: string
): string {
    switch (step) {
        case 'welcome':
            const planEmoji = plan === 'vip' ? '⭐' : plan === 'premium' ? '💎' : '🌱';
            const planName = plan === 'vip' ? 'VIP' : plan === 'premium' ? 'Premium' : 'Freemium';

            let welcomeMsg = `Olá${patientName ? ` ${patientName}` : ''}! Vi que você se cadastrou no Cuidar.me 👋\n\n`;
            welcomeMsg += `${planEmoji} Plano: ${planName}\n\n`;

            if (plan === 'freemium') {
                welcomeMsg += `Como você está no plano **Gratuito**, você receberá suas dicas e lembretes de saúde sempre pela manhã (8h). 🌅\n\n`;
                welcomeMsg += `_Nota: No plano gratuito, o chat com IA não está habilitado para dúvidas personalizadas._\n\n`;
            }

            welcomeMsg += `Tudo certo para começarmos?\n\n`;
            welcomeMsg += `Responda "Sim" para continuar ou "Ajustar" se precisar alterar algo no cadastro.\n\n`;
            welcomeMsg += `_Para parar de receber mensagens, envie SAIR a qualquer momento._`;

            return welcomeMsg;

        case 'preferences':
            return `Ótimo! Quando prefere receber suas mensagens diárias?

A) 🌅 Manhã (8h)
B) 🌞 Tarde (14h)
C) 🌙 Noite (20h)

Responda A, B ou C`;

        case 'complete':
            const timeEmoji = data.preferredTime === 'morning' ? '🌅' :
                data.preferredTime === 'afternoon' ? '🌞' : '🌙';
            const timeText = data.preferredTime === 'morning' ? '8h' :
                data.preferredTime === 'afternoon' ? '14h' : '20h';

            return `Perfeito! ${timeEmoji}

A partir de amanhã às ${timeText} você receberá:
📊 Check-in diário
💬 Dicas personalizadas
🎯 Acompanhamento do seu progresso

${plan === 'freemium'
                    ? '💡 Dica: Upgrade para Premium e tenha acesso a protocolos personalizados e gamificação completa!'
                    : plan === 'premium'
                        ? '🎉 Como Premium, você tem acesso a protocolos personalizados e gamificação!'
                        : '⭐ Como VIP, você tem acesso total + consultoria mensal!'
                }

Bem-vindo à sua jornada de transformação! 🚀`;

        default:
            return 'Próximo passo...';
    }
}

/**
 * Processa a resposta do usuário e atualiza o estado
 */
export function processStepResponse(
    step: OnboardingStep,
    response: string,
    currentData: OnboardingState['data']
): { data: OnboardingState['data']; error?: string } {
    const data = { ...currentData };
    const normalizedResponse = response.toLowerCase().trim();

    try {
        switch (step) {
            case 'welcome':
                // Aceita "sim", "vamos", "ok", etc.
                if (normalizedResponse.includes('sim') ||
                    normalizedResponse.includes('vamos') ||
                    normalizedResponse.includes('ok') ||
                    normalizedResponse.includes('começar')) {
                    // Confirmado, avança
                    return { data };
                } else if (normalizedResponse.includes('ajustar') ||
                    normalizedResponse.includes('alterar') ||
                    normalizedResponse.includes('mudar')) {
                    return {
                        data,
                        error: 'Para ajustar seus dados, acesse: https://clinicadornelles.com.br/portal/profile\n\nDepois volte aqui e me mande "Sim" para continuar!'
                    };
                } else {
                    return {
                        data,
                        error: 'Responda "Sim" para começar ou "Ajustar" para alterar seus dados.'
                    };
                }

            case 'preferences':
                // Aceita A, B, C ou manhã, tarde, noite
                if (normalizedResponse.includes('a') || normalizedResponse.includes('manhã')) {
                    data.preferredTime = 'morning';
                } else if (normalizedResponse.includes('b') || normalizedResponse.includes('tarde')) {
                    data.preferredTime = 'afternoon';
                } else if (normalizedResponse.includes('c') || normalizedResponse.includes('noite')) {
                    data.preferredTime = 'night';
                } else {
                    return {
                        data,
                        error: 'Por favor, escolha:\nA) Manhã\nB) Tarde\nC) Noite'
                    };
                }
                break;

            case 'complete':
                // Não espera resposta, mas aceita qualquer coisa
                break;
        }

        return { data };
    } catch (error) {
        return { data, error: 'Erro ao processar resposta' };
    }
}
