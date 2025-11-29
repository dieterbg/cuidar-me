/**
 * Mensagens do sistema - Centralizadas
 * Facilita manutenção, A/B testing, e i18n futuro
 */

export const SYSTEM_MESSAGES = {
    // Mensagens sociais/conversacionais
    SOCIAL: {
        GREETING: "Olá! 😊 Como posso te ajudar hoje?",
        THANKS: "De nada! Estou sempre aqui para ajudar. 💪",
        ENCOURAGEMENT: "Você está indo muito bem! Continue assim! 🌟",
    },

    // Emergências
    EMERGENCY: {
        ALERT_CREATED: "🚨 Situação identificada como urgente. Já alertei a equipe médica. Alguém entrará em contato em breve.",
        STAY_CALM: "Por favor, mantenha a calma. Se for muito urgente, ligue para 192 (SAMU) ou vá ao hospital mais próximo.",
    },

    // Check-ins perdidos
    MISSED_CHECKIN: {
        REMINDER: (patientName: string) =>
            `👋 Olá ${patientName}! \n\nPercebi que você ainda não respondeu ao check-in de hoje. \n\nNão se preocupe, estou aqui para te ajudar! Sua resposta é importante para acompanharmos seu progresso. 💪\n\nComo está indo? 😊`,

        GENTLE_NUDGE: "Oi! Vi que você não respondeu ainda. Tudo bem? 💙",
    },

    // Protocolo completado
    PROTOCOL: {
        CONGRATULATIONS: (protocolName: string, days: number) =>
            `🎉 PARABÉNS! Você completou o ${protocolName}! Foram ${days} dias de dedicação e crescimento. Estamos muito orgulhosos de você! 💪`,

        KEEP_IT_UP: "Continue com esse ótimo trabalho! Seus resultados são incríveis! 🌟",
    },

    // Erros genéricos
    ERRORS: {
        GENERIC: "Desculpe, tive um problema ao processar sua mensagem. Pode tentar novamente?",
        TRY_AGAIN: "Algo deu errado. Vamos tentar de novo? 😊",
    },

    // Rollback/Manutenção
    MAINTENANCE: {
        BRIEF_PAUSE: (patientName: string) =>
            `Olá ${patientName}! 👋\n\nVocê pode ter sentido uma pequena pausa nas nossas mensagens hoje.\nJá está tudo funcionando normalmente!\n\nContinue respondendo seus check-ins. Estamos aqui! 💪`,
    },
} as const;

// Helper para gerar mensagens com variáveis
export function getMessage(
    category: keyof typeof SYSTEM_MESSAGES,
    key: string,
    ...args: any[]
): string {
    const message = (SYSTEM_MESSAGES[category] as any)[key];

    if (typeof message === 'function') {
        return message(...args);
    }

    return message;
}

// Tipo para autocomplete
export type MessageCategory = keyof typeof SYSTEM_MESSAGES;
export type SocialMessage = keyof typeof SYSTEM_MESSAGES.SOCIAL;
export type EmergencyMessage = keyof typeof SYSTEM_MESSAGES.EMERGENCY;
export type MissedCheckinMessage = keyof typeof SYSTEM_MESSAGES.MISSED_CHECKIN;
export type ProtocolMessage = keyof typeof SYSTEM_MESSAGES.PROTOCOL;
