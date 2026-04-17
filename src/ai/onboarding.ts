export type OnboardingStep = 'welcome' | 'complete';
export type OnboardingState = {
    patient_id: string;
    step: OnboardingStep;
    plan: 'freemium' | 'premium' | 'vip';
    data: {
        preferredTime?: 'morning' | 'afternoon' | 'night';
    };
    completed_at?: string;
};

/**
 * Retorna a mensagem para o passo atual do onboarding
 * Alinhado com tests/unit/onboarding.test.ts (ONB-01 a ONB-05)
 */
export function getStepMessage(
    step: OnboardingStep,
    plan: 'freemium' | 'premium' | 'vip' = 'freemium',
    data: OnboardingState['data'] = {},
    firstName: string = 'Paciente',
    fullMessage: boolean = true
): string {
    switch (step) {
        case 'welcome':
            const planEmoji = plan === 'premium' ? '💎' : plan === 'vip' ? '⭐' : '🌱';
            const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
            return `Olá, ${firstName}! 👋

Bem-vindo ao Cuidar.me! Você está no plano ${planName} ${planEmoji}.

Vamos começar? Responda "Sim" para iniciar ou "Ajustar" para gerenciar seu cadastro.`;


        case 'complete':
            const timeText = 'pela manhã';

            if (plan === 'freemium') {
                return `Pronto! 🌅 Seu cadastro está completo.

Você receberá suas dicas às ${timeText}. ☀️

💎 _Dica: Faça um Upgrade para o Premium e tenha acesso total!_

Bem-vindo ao Cuidar.me! 🚀`;
            }

            const planText = plan === 'vip' ? 'VIP' : 'Premium';
            return `Perfeito! 🚀

Seu acompanhamento ${planText} está ativo. Você receberá notificações diárias para te guiar na sua jornada.

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
    return 'complete';
}
