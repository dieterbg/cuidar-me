
'use server';

/**
 * @fileOverview Gemini Vision flow para extrair dados de exames laboratoriais
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Schema de entrada
export const ExtractLabResultsInputSchema = z.object({
    imageBase64: z.string().describe('Imagem do exame em base64'),
    patientId: z.string().describe('ID do paciente'),
    patientComorbidities: z.array(z.string()).optional().describe('Comorbidades do paciente'),
});

// Schema de saída
export const ExtractLabResultsOutputSchema = z.object({
    success: z.boolean(),
    extractedData: z.object({
        // Glicemia
        glucoseFasting: z.number().optional().describe('Glicemia de jejum (mg/dL)'),
        hba1c: z.number().optional().describe('Hemoglobina glicada (%)'),

        // Lipídios
        totalCholesterol: z.number().optional().describe('Colesterol total (mg/dL)'),
        ldl: z.number().optional().describe('LDL colesterol (mg/dL)'),
        hdl: z.number().optional().describe('HDL colesterol (mg/dL)'),
        triglycerides: z.number().optional().describe('Triglicerídeos (mg/dL)'),

        // Função renal
        creatinine: z.number().optional().describe('Creatinina (mg/dL)'),
        urea: z.number().optional().describe('Ureia (mg/dL)'),

        // Função hepática
        alt: z.number().optional().describe('ALT/TGP (U/L)'),
        ast: z.number().optional().describe('AST/TGO (U/L)'),

        // Tireoide
        tsh: z.number().optional().describe('TSH (μUI/mL)'),
        t4: z.number().optional().describe('T4 livre (ng/dL)'),

        // Outros
        vitaminD: z.number().optional().describe('Vitamina D (ng/mL)'),
        vitaminB12: z.number().optional().describe('Vitamina B12 (pg/mL)'),

        // Metadados
        examDate: z.string().optional().describe('Data do exame'),
        laboratory: z.string().optional().describe('Laboratório'),
    }).optional(),

    alerts: z.array(z.object({
        type: z.enum(['critical', 'warning', 'info']),
        parameter: z.string(),
        value: z.number(),
        referenceRange: z.string(),
        message: z.string(),
    })).optional(),

    error: z.string().optional(),
});

export type ExtractLabResultsInput = z.infer<typeof ExtractLabResultsInputSchema>;
export type ExtractLabResultsOutput = z.infer<typeof ExtractLabResultsOutputSchema>;

// Prompt para Gemini Vision
const extractLabResultsPrompt = ai.definePrompt({
    name: 'extractLabResultsPrompt',
    input: { schema: ExtractLabResultsInputSchema },
    output: { schema: ExtractLabResultsOutputSchema },
    config: {
        temperature: 0.1, // Baixa temperatura para precisão
    },
    prompt: `Você é um assistente médico especializado em análise de exames laboratoriais.

# TAREFA:
Analise a imagem do exame laboratorial e extraia TODOS os valores numéricos que conseguir identificar.

# PACIENTE:
- ID: {{patientId}}
- Comorbidades: {{#if patientComorbidities}}{{patientComorbidities}}{{else}}Nenhuma informada{{/if}}

# INSTRUÇÕES:
1. **Extraia valores numéricos** de todos os parâmetros que conseguir identificar na imagem
2. **Identifique a data do exame** se visível
3. **Identifique o laboratório** se visível
4. **Gere alertas** para valores fora da faixa de referência:
   - CRITICAL: Valores muito alterados que exigem atenção imediata
   - WARNING: Valores alterados que merecem atenção
   - INFO: Valores limítrofes

# VALORES DE REFERÊNCIA (adultos):

## Glicemia e Diabetes:
- Glicemia jejum: 70-99 mg/dL (normal), 100-125 (pré-diabetes), >126 (diabetes)
- HbA1c: <5.7% (normal), 5.7-6.4% (pré-diabetes), ≥6.5% (diabetes)

## Lipídios:
- Colesterol total: <200 mg/dL (desejável), 200-239 (limítrofe), ≥240 (alto)
- LDL: <100 mg/dL (ótimo), 100-129 (desejável), 130-159 (limítrofe), ≥160 (alto)
- HDL: ≥60 mg/dL (desejável), 40-59 (aceitável), <40 (baixo - risco)
- Triglicerídeos: <150 mg/dL (normal), 150-199 (limítrofe), ≥200 (alto)

## Função Renal:
- Creatinina: 0.6-1.2 mg/dL (homens), 0.5-1.1 (mulheres)
- Ureia: 15-40 mg/dL

## Função Hepática:
- ALT (TGP): 7-56 U/L
- AST (TGO): 10-40 U/L

## Tireoide:
- TSH: 0.4-4.0 μUI/mL
- T4 livre: 0.8-1.8 ng/dL

## Vitaminas:
- Vitamina D: ≥30 ng/mL (suficiente), 20-29 (insuficiente), <20 (deficiente)
- Vitamina B12: 200-900 pg/mL

# REGRAS IMPORTANTES:
- Se não conseguir ler um valor, deixe como null
- Seja PRECISO nos valores numéricos
- Use as unidades corretas (mg/dL, %, U/L, etc.)
- Gere alertas apenas para valores CLARAMENTE alterados
- Para valores limítrofes, use tipo "warning"
- Para valores muito alterados, use tipo "critical"

# FORMATO DE SAÍDA:
Retorne um JSON com:
- success: true se conseguiu extrair pelo menos um valor
- extractedData: objeto com todos os valores encontrados
- alerts: array de alertas para valores alterados
- error: mensagem de erro se não conseguir processar a imagem

Imagem do exame em base64: {{imageBase64}}
`,
});

// Flow para extrair dados de exames
const extractLabResultsFlow = ai.defineFlow(
    {
        name: 'extractLabResultsFlow',
        inputSchema: ExtractLabResultsInputSchema,
        outputSchema: ExtractLabResultsOutputSchema,
    },
    async (input) => {
        try {
            console.log('[extractLabResultsFlow] Processing lab results image');

            // Invocar prompt com Gemini Vision
            const { output } = await extractLabResultsPrompt(input);

            console.log('[extractLabResultsFlow] Extraction complete:', output?.success);

            return output!;
        } catch (error: any) {
            console.error('[extractLabResultsFlow] Error:', error);

            return {
                success: false,
                error: `Erro ao processar imagem: ${error.message}`,
            };
        }
    }
);

/**
 * Função pública para extrair dados de exames
 */
export async function extractLabResults(
    input: ExtractLabResultsInput
): Promise<ExtractLabResultsOutput> {
    return extractLabResultsFlow(input);
}

/**
 * Determina a severidade de um alerta baseado no tipo e comorbidades
 */
export function getAlertPriority(
    alertType: 'critical' | 'warning' | 'info',
    parameter: string,
    patientComorbidities?: string[]
): number {
    // Prioridade base por tipo
    let priority = alertType === 'critical' ? 3 : alertType === 'warning' ? 2 : 1;

    // Aumentar prioridade se paciente tem comorbidade relacionada
    const hasDiabetes = patientComorbidities?.some(c =>
        c.toLowerCase().includes('diabetes')
    );
    const hasHypertension = patientComorbidities?.some(c =>
        c.toLowerCase().includes('hipertensão') || c.toLowerCase().includes('pressão')
    );
    const hasDyslipidemia = patientComorbidities?.some(c =>
        c.toLowerCase().includes('dislipidemia') || c.toLowerCase().includes('colesterol')
    );

    // Glicemia alterada + diabetes = prioridade máxima
    if ((parameter.includes('glucose') || parameter.includes('hba1c')) && hasDiabetes) {
        priority = 3;
    }

    // Lipídios alterados + dislipidemia = alta prioridade
    if ((parameter.includes('cholesterol') || parameter.includes('ldl') ||
        parameter.includes('triglycerides')) && hasDyslipidemia) {
        priority = Math.max(priority, 2);
    }

    return priority;
}
