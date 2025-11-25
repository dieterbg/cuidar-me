
import { z } from 'zod';

export const ExtractPatientDataInputSchema = z.object({
    message: z
        .string()
        .describe('The patient message from which data needs to be extracted.'),
});
export type ExtractPatientDataInput = z.infer<typeof ExtractPatientDataInputSchema>;

export const ExtractPatientDataOutputSchema = z.object({
    weight: z.number().optional().describe('The weight of the patient in kilograms (kg).'),
    mealCheckin: z.enum(['A', 'B', 'C']).optional().describe("The patient's self-evaluation of a meal (A: followed plan, B: partially followed, C: did not follow)."),
    glucoseLevel: z.number().optional().describe('The blood glucose level of the patient in mg/dL.'),
    waistCircumference: z.number().optional().describe('The waist circumference of the patient in cm.'),
    sleepDuration: z.number().optional().describe('The duration of the patient\'s sleep in hours.'),
    physicalActivity: z.string().optional().describe('A brief description of the physical activity performed by the patient.'),
    gamificationPerspective: z.enum(['alimentacao', 'movimento', 'hidratacao', 'disciplina', 'bemEstar']).optional().describe('The gamification perspective associated with the extracted data.'),
    gamificationPoints: z.number().optional().describe('The number of gamification points to award.'),
});
export type ExtractPatientDataOutput = z.infer<typeof ExtractPatientDataOutputSchema>;


export const SummarizePatientRiskInputSchema = z.object({
    messages: z.string().describe('The messages from the patient to analyze.'),
});
export type SummarizePatientRiskInput = z.infer<typeof SummarizePatientRiskInputSchema>;

export const SummarizePatientRiskOutputSchema = z.object({
    riskSummary: z.string().describe('A summary of potential health risks identified in the patient messages.'),
    riskLevel: z.enum(['low', 'medium', 'high']).describe('The level of risk associated with the patient messages.'),
    suggestedActions: z.string().describe('Suggested actions for the healthcare professional to take based on the risk assessment.'),
});
export type SummarizePatientRiskOutput = z.infer<typeof SummarizePatientRiskOutputSchema>;


export const GetChatAnalysisInputSchema = z.object({
    patientId: z.string().describe("The unique ID of the patient."),
    messages: z.string().describe("The patient's messages to analyze."),
});
export type GetChatAnalysisInput = z.infer<
    typeof GetChatAnalysisInputSchema
>;

export const GetChatAnalysisOutputSchema = z.object({
    extractedData: ExtractPatientDataOutputSchema.nullable(),
    riskAnalysis: SummarizePatientRiskOutputSchema.nullable(),
});
export type GetChatAnalysisOutput = z.infer<
    typeof GetChatAnalysisOutputSchema
>;

// Adding this for compatibility, even though the flow is disabled.
export const AnalyzeConversationInputSchema = z.object({
    patientId: z.string(),
    messages: z.string(),
});
export type AnalyzeConversationInput = z.infer<typeof AnalyzeConversationInputSchema>;

export const AnalyzeConversationOutputSchema = z.object({
    extractedData: ExtractPatientDataOutputSchema.nullable(),
    riskAnalysis: SummarizePatientRiskOutputSchema.nullable(),
});
export type AnalyzeConversationOutput = z.infer<typeof AnalyzeConversationOutputSchema>;
