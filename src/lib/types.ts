

import { z } from 'zod';
// import type { Patient as PatientType } from '@/lib/types';
import { ExtractPatientDataOutputSchema } from './schemas';


// --- CHATBOT REPLY SCHEMAS ---
export const GenerateChatbotReplyInputSchema = z.object({
    patient: z.any(), // z.custom<PatientType>(),
    patientMessage: z
        .string()
        .describe('The message from the patient that requires a response.'),
    protocolContext: z.string().optional().describe('A brief summary of the patient\'s current protocol status. E.g., "A última mensagem do protocolo enviada hoje foi: \'Qual seu peso hoje?\'".'),
});
export type GenerateChatbotReplyInput = z.infer<typeof GenerateChatbotReplyInputSchema>;


const AttentionRequestSchema = z.object({
    reason: z.string().describe("Motivo classificado pela IA para o escalonamento."),
    aiSummary: z.string().describe("Resumo rápido da IA sobre a situação."),
    aiSuggestedReply: z.string().describe("Sugestão de resposta da IA para a equipe humana. Deve ser escrita do ponto de vista de um endocrinologista experiente."),
    // The following fields will be added by the code, not the AI
    triggerMessage: z.string().optional(),
    priority: z.number().optional(),
    createdAt: z.custom<Date | string>(() => new Date()).optional(),
});

export const GenerateChatbotReplyOutputSchema = z.object({
    decision: z.enum(['reply', 'escalate']).describe('Whether the bot decided to reply or escalate to a human. The bot must always respond or escalate.'),
    chatbotReply: z.string().optional().describe('The generated reply from the chatbot. If decision is "escalate", this contains the escalation message. If a tool was called, this contains the tool\'s confirmation message.'),
    attentionRequest: AttentionRequestSchema.nullable().optional().describe("O objeto de requisição de atenção, se a decisão for 'escalate'."),
    extractedData: ExtractPatientDataOutputSchema.nullable().optional().describe("Dados estruturados extraídos da mensagem do paciente, se houver."),
});
export type GenerateChatbotReplyOutput = z.infer<typeof GenerateChatbotReplyOutputSchema>;

// --- END CHATBOT REPLY SCHEMAS ---


// --- PATIENT SUMMARY SCHEMAS ---
export const GeneratePatientSummaryInputSchema = z.object({
    patientId: z.string().describe("The patient's unique ID."),
});
export type GeneratePatientSummaryInput = z.infer<typeof GeneratePatientSummaryInputSchema>;


export const PatientSummarySchema = z.object({
    overallStatus: z.enum(['on_track', 'stagnated', 'needs_attention', 'critical']).describe("The overall status of the patient based on all available data."),
    overallSummary: z.string().describe("A brief, 2-3 sentence summary of the patient's current situation, progress, and main challenges."),
    positivePoints: z.array(z.string()).describe("A list of 2-3 positive points, such as good adherence, positive results, or proactive communication."),
    attentionPoints: z.array(z.string()).describe("A list of 2-3 points that require attention, such as lack of data, negative trends, or concerning messages."),
    recommendation: z.string().describe("A clear, actionable recommendation for the health professional on the next step to take with this patient.")
});
export type PatientSummary = z.infer<typeof PatientSummarySchema>;
// --- END PATIENT SUMMARY SCHEMAS ---



export type PatientPlan = 'freemium' | 'premium' | 'vip';
export type UserRole = "admin" | "equipe_saude" | "assistente" | "paciente" | "pendente";

export interface UserProfile {
    id: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    role: UserRole;
    phone?: string;
}

// --- NEW UNIFIED DATA MODEL ---

export interface Subscription {
    plan: PatientPlan;
    priority: 1 | 2 | 3; // 1=Freemium, 2=Premium, 3=VIP
}

export interface ProtocolState {
    protocolId: string;
    startDate: Date | string; // Allow string for seeding
    currentDay: number;
    isActive: boolean;
    weightGoal?: number | null;
}

export type Perspective = 'alimentacao' | 'movimento' | 'hidratacao' | 'disciplina' | 'bemEstar';

export interface GamificationPerspective {
    current: number;
    goal: number;
    isComplete: boolean;
}

export interface WeeklyProgress {
    weekStartDate: Date | string;
    perspectives: Record<Perspective, GamificationPerspective>;
}

export interface StreakData {
    currentStreak: number;        // Dias consecutivos atuais
    longestStreak: number;        // Recorde pessoal
    lastActivityDate: string;     // ISO string da última atividade
    streakFreezes: number;        // Proteções disponíveis (max 2)
    freezesUsedThisMonth: number; // Resetado mensalmente
}

export interface GamificationState {
    totalPoints: number;
    level: string;
    badges: string[];
    weeklyProgress: WeeklyProgress;
    streak?: StreakData;          // Sistema de sequências
}


export interface AttentionRequest {
    reason: string;
    triggerMessage: string;
    aiSummary: string;
    aiSuggestedReply: string;
    priority: 1 | 2 | 3;
    createdAt: string | Date;
}

export interface ActiveCheckin {
    perspective: Perspective;
    sentAt: Date | string;
}

export interface Patient {
    id: string;
    fullName: string;
    whatsappNumber: string;
    needsAttention: boolean;
    subscription: Subscription;
    protocol: ProtocolState | null;
    gamification: GamificationState;
    attentionRequest?: AttentionRequest | null;
    activeCheckin: ActiveCheckin | null;
    // --- LEGACY & UI-related fields ---
    name: string; // Keep for compatibility with existing components
    avatar: string;
    email?: string;
    userId?: string; // Added for compatibility with createPatientRecord
    lastMessage: string;
    lastMessageTimestamp: Date | string;
    riskLevel?: 'low' | 'medium' | 'high';
    status?: 'active' | 'pending';
    birthDate?: Date | string | null;
    gender?: 'masculino' | 'feminino' | 'outro' | null;
    height?: number | null; // in cm
    initialWeight?: number | null; // in kg
    healthConditions?: string | null;
    allergies?: string | null;
    communityUsername?: string;
    plan?: PatientPlan; // Legacy for patient edit form
}


// --- COLLECTIONS ---
export interface ProtocolStep {
    day: number;
    title: string;
    message: string;
    isGamification?: boolean;
    perspective?: Perspective;
}

export interface Protocol {
    id: string;
    name: string;
    description: string;
    durationDays: number;
    eligiblePlans: PatientPlan[];
    messages: ProtocolStep[];
}


export interface GamificationAction {
    actionId: string;
    perspective: Perspective;
    points: number | Record<string, number>; // Can be a number or a map for conditional points
    checkinTriggerText?: string;
}

export interface GamificationConfig {
    perspectiveGoals: Record<Perspective, number>;
    actions: GamificationAction[];
}

export interface Task {
    id?: string;
    patientId: string;
    patientName: string;
    type: 'weekly_review' | 'proactive_checkin' | 'patient_question';
    status: 'pending' | 'completed';
    priority: 1 | 2 | 3;
    createdAt: Date | string;
}

export interface ScheduledMessage {
    id: string;
    patientId: string;
    patientWhatsappNumber: string;
    messageContent: string;
    sendAt: string | Date;
    status: 'pending' | 'sent' | 'error';
    source: 'protocol' | 'dynamic_reminder';
    createdAt: string | Date;
    errorInfo: string | null;
}


// --- LEGACY/UNCHANGED TYPES ---

export interface Message {
    id: string;
    sender: 'patient' | 'me';
    text: string;
    timestamp: Date | string; // Allow string for seeding
}

export interface PatientConversation {
    patientId: string;
    messages: Message[];
}

export interface Video {
    id: string;
    category: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    videoUrl: string;
    plans: PatientPlan[]; // Which plans can access this video
}

export interface SentVideo {
    id: string; // Document ID from Firestore
    videoId: string;
    sentAt: Date | string; // Allow string for seeding
    feedback?: 'liked' | 'disliked' | null;
}

export interface HealthMetric {
    id?: string;
    date: Date | string;
    weight?: number;
    glucoseLevel?: number;
    waistCircumference?: number;
    sleepDuration?: number;
    physicalActivity?: string;
    mealCheckin?: 'A' | 'B' | 'C';
}


// --- Community MVP Types ---

export type ReactionEmoji = '👍' | '🎉' | '💪' | '💡';

export interface CommunityReaction {
    id: string;
    authorId: string;
    emoji: ReactionEmoji;
}

export interface CommunityComment {
    id: string;
    commentId: string;
    topicId: string;
    authorId: string; // ID real do paciente
    authorUsername: string; // Nome anônimo
    text: string;
    timestamp: Date | string;
    reactions: CommunityReaction[];
}

export interface CommunityTopic {
    id: string;
    topicId: string;
    authorId: string; // ID real do paciente
    authorUsername: string; // Nome anônimo
    title: string;
    text: string;
    isPinned: boolean;
    timestamp: Date | string;
    lastActivityTimestamp: Date | string; // Atualizado com cada novo comentário
    reactions: CommunityReaction[];
    commentCount: number;
    comments: CommunityComment[];
}

export interface TwilioCredentials {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
}


