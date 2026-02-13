import type { GamificationConfig } from '../types';

// --- GAMIFICATION CONFIG ---
// This single configuration object replaces the linear missions.
export const gamificationConfig: GamificationConfig = {
    perspectiveGoals: {
        alimentacao: 5,
        movimento: 5,
        hidratacao: 5,
        disciplina: 5,
        bemEstar: 5,
    },
    actions: [
        // Alimentação
        { actionId: 'check_in_refeicao', perspective: 'alimentacao', points: { 'A': 20, 'B': 15, 'C': 10 }, checkinTriggerText: 'Check-in de Refeição' },
        // Movimento
        { actionId: 'registrar_atividade_fisica', perspective: 'movimento', points: 40, checkinTriggerText: 'Check-in de Atividade Física' },
        // Disciplina
        { actionId: 'medicao_semanal', perspective: 'disciplina', points: 50, checkinTriggerText: 'Check-in Semanal de Peso' },
        { actionId: 'planejamento_semanal', perspective: 'disciplina', points: 30, checkinTriggerText: 'Planejamento Semanal' },
        // Bem-Estar
        { actionId: 'assistir_video_educativo', perspective: 'bemEstar', points: 20 },
        { actionId: 'participar_comunidade', perspective: 'bemEstar', points: 25 },
        { actionId: 'checkin_bem_estar', perspective: 'bemEstar', points: 15, checkinTriggerText: 'Check-in de Bem-Estar' },
        // Hidratação
        { actionId: 'checkin_hidratacao', perspective: 'hidratacao', points: 15, checkinTriggerText: 'Check-in de Hidratação' },
        // Onboarding Actions (don't directly contribute to weekly perspectives but give points)
        { actionId: 'completar_perfil', perspective: 'disciplina', points: 150 },
        { actionId: 'assistir_video_boas_vindas', perspective: 'bemEstar', points: 30 },
        { actionId: 'assistir_video_nutricao', perspective: 'alimentacao', points: 20 },
    ]
};
