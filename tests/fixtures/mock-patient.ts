import type { Patient, PatientPlan } from '@/lib/types';

/**
 * Mock de paciente para testes
 */
export const mockPatient: Patient = {
    id: 'test-patient-123',
    userId: 'test-user-456',
    fullName: 'João da Silva',
    name: 'João da Silva',
    whatsappNumber: '+5511999999999',
    email: 'joao@test.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=joao',
    needsAttention: false,
    status: 'active',
    riskLevel: 'low',
    subscription: {
        plan: 'premium' as PatientPlan,
        priority: 2,
    },
    protocol: {
        protocolId: 'fundamentos_90_dias',
        startDate: new Date('2025-01-01'),
        currentDay: 15,
        isActive: true,
        weightGoal: 75,
    },
    gamification: {
        totalPoints: 250,
        level: 'Iniciante',
        badges: [],
        weeklyProgress: {
            weekStartDate: new Date('2025-11-25'),
            perspectives: {
                alimentacao: { current: 2, goal: 5, isComplete: false },
                movimento: { current: 1, goal: 5, isComplete: false },
                hidratacao: { current: 4, goal: 5, isComplete: false },
                disciplina: { current: 1, goal: 5, isComplete: false },
                bemEstar: { current: 0, goal: 5, isComplete: false },
            },
        },
    },
    activeCheckin: null,
    lastMessage: 'Oi, tudo bem!',
    lastMessageTimestamp: new Date('2025-11-28T10:00:00'),
    birthDate: new Date('1990-05-15'),
    gender: 'masculino',
    height: 175,
    initialWeight: 85,
    healthConditions: 'Nenhuma',
    allergies: null,
    plan: 'premium',
};
