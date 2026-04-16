export type { OnboardingState, OnboardingStep } from '@/types/onboarding';

/**
 * Retorna a mensagem para o passo atual do onboarding
 * Alinhado com tests/unit/onboarding.test.ts (ONB-01 a ONB-05)
 */
export function getStepMessage(
    step: OnboardingStep,
    plan: 'freemium' | 'premium' | 'vip' = 'freemium',
    data: OnboardingState['data'] = {},
    firstName: string = 'Paciente'
): string {
    switch (step) {
        case 'welcome':
            const planEmoji = plan === 'premium' ? '💎' : plan === 'vip' ? '⭐' : '🌱';
            const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
            return `Olá, ${firstName}! 👋

Bem-vindo ao Cuidar.me! Você está no plano ${planName} ${planEmoji}.

Vamos começar? Responda "Sim" para iniciar ou "Ajustar" para gerenciar seu cadastro.`;

        case 'preferences':
            return `Ótimo! Em qual período do dia você prefere receber suas dicas de saúde?

A) Manhã (8h)
B) Tarde (14h)
C) Noite (20h)

Responda A, B ou C`;

        case 'complete':
            const timeEmoji = data.preferredTime === 'morning' ? '🌅' :
                data.preferredTime === 'afternoon' ? '🌞' : '🌙';
            const timeText = data.preferredTime === 'morning' ? '8h' :
                data.preferredTime === 'afternoon' ? '14h' : '20h';

            if (plan === 'freemium') {
                return `Pronto! 🌅 Seu cadastro está completo.

Você receberá suas dicas às ${timeText}. ☀️

💎 _Dica: Faça um Upgrade para o Premium e tenha acesso total!_

Bem-vindo ao Cuidar.me! 🚀`;
            }

            const planText = plan === 'vip' ? 'VIP' : 'Premium';
            return `Perfeito! ${timeEmoji}

Seu acompanhamento ${planText} está ativo. Você receberá notificações às ${timeText}.

Vamos juntos! 💪`;

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
    const normalizedResponse = response.trim().toLowerCase();

    try {
        switch (step) {
            case 'welcome':
                if (normalizedResponse.includes('ajustar')) {
                    return { data, error: 'Você pode ajustar seu perfil em: https://clinicadornelles.com.br/portal/profile' };
                }
                const positiveWords = ['sim', 'vamos', 'ok', 'pode', 'bora', 'começar'];
                if (!positiveWords.some(word => normalizedResponse.includes(word))) {
                    return { data, error: 'Por favor, responda "Sim" para começar.' };
                }
                break;

            case 'preferences':
                const isA = normalizedResponse === 'a' || normalizedResponse.startsWith('a)') || normalizedResponse.includes('manhã') || normalizedResponse.includes('manha');
                const isB = normalizedResponse === 'b' || normalizedResponse.startsWith('b)') || normalizedResponse.includes('tarde');
                const isC = normalizedResponse === 'c' || normalizedResponse.startsWith('c)') || normalizedResponse.includes('noite');

                if (isA) {
                    data.preferredTime = 'morning';
                } else if (isB) {
                    data.preferredTime = 'afternoon';
                } else if (isC) {
                    data.preferredTime = 'night';
                } else {
                    return { 
                        data, 
                        error: 'Opção inválida. Escolha A (Manhã), B (Tarde) ou C (Noite).' 
                    };
                }
                break;
        }

        return { data };
    } catch (e) {
        return { data, error: 'Erro ao processar. Pode repetir?' };
    }
}

/**
 * Define qual é o próximo passo do fluxo
 */
export function getNextStep(
    currentStep: OnboardingStep,
    plan: 'freemium' | 'premium' | 'vip' = 'freemium',
    data: OnboardingState['data'] = {}
): OnboardingStep {
    if (currentStep === 'welcome') return 'preferences';
    return 'complete';
}
