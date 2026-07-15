'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateClinicalSummaryInputSchema = z.object({
  patientName: z.string(),
  plan: z.string(),
  protocolName: z.string().optional(),
  protocolDay: z.number().optional(),
  level: z.string().optional(),
  totalPoints: z.number().optional(),
  metrics: z.array(
    z.object({
      date: z.string(),
      weight: z.number().nullable().optional(),
      mealCheckin: z.string().nullable().optional(),
    })
  ),
  recentMessages: z.array(
    z.object({
      sender: z.string(),
      text: z.string(),
      timestamp: z.string().optional(),
    })
  ),
  attentionRequests: z.array(
    z.object({
      reason: z.string(),
      aiSummary: z.string(),
      createdAt: z.string().optional(),
    })
  ),
});

const GenerateClinicalSummaryOutputSchema = z.object({
  summary: z.string().describe('O resumo clínico formatado em Markdown.'),
});

const generateClinicalSummaryFlow = ai.defineFlow(
  {
    name: 'generateClinicalSummaryFlow',
    inputSchema: GenerateClinicalSummaryInputSchema,
    outputSchema: GenerateClinicalSummaryOutputSchema,
  },
  async (input) => {
    // Format metrics and messages for prompt readability
    const metricsStr = input.metrics.length > 0 
      ? input.metrics.map(m => `- ${new Date(m.date).toLocaleDateString('pt-BR')}: Peso: ${m.weight ?? 'Não registrado'} kg, Refeição Check-in: ${m.mealCheckin ?? 'N/A'}`).join('\n')
      : 'Nenhuma métrica recente registrada.';

    const messagesStr = input.recentMessages.length > 0
      ? input.recentMessages.map(m => `- ${m.sender === 'patient' ? 'Paciente' : 'Clínica'}: ${m.text}`).join('\n')
      : 'Nenhuma mensagem recente.';

    const alertsStr = input.attentionRequests.length > 0
      ? input.attentionRequests.map(a => `- Motivo: ${a.reason} | Resumo IA: ${a.aiSummary} (${a.createdAt ? new Date(a.createdAt).toLocaleDateString('pt-BR') : 'Sem data'})`).join('\n')
      : 'Nenhum alerta de atenção recente.';

    const response = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: `Você é um endocrinologista sênior e especialista em medicina comportamental e estilo de vida, assessorando a equipe da Clínica Dornelles.
Sua tarefa é analisar o prontuário digital e histórico de interações do paciente e gerar um **Resumo Clínico e Comportamental** estruturado, que será lido pelo médico ou equipe de saúde antes de uma consulta ou contato.

# DADOS DO PACIENTE:
- **Nome:** ${input.patientName}
- **Plano:** ${input.plan}
- **Protocolo Ativo:** ${input.protocolName || 'Nenhum'} (Dia ${input.protocolDay || 0})
- **Engajamento (Gamificação):** Nível ${input.level || '1'} | Pontos: ${input.totalPoints || 0}

# HISTÓRICO DE MÉTRICAS RECENTES:
${metricsStr}

# ALERTAS DE ATENÇÃO RECENTES:
${alertsStr}

# HISTÓRICO DE MENSAGENS RECENTES (Últimas interações):
${messagesStr}

---

# INSTRUÇÕES PARA O RESUMO:
Crie um relatório em Markdown altamente escaneável e conciso (máximo 300 palavras). Evite termos genéricos, foque em dados objetivos e padrões observados.
Use os seguintes títulos principais em seu Markdown:

1. **📊 Visão Geral e Engajamento**: Resuma o nível de atividade na plataforma, se está engajado na jornada (nível/pontos/streak) e se mantém a constância.
2. **⚖️ Evolução de Peso**: Analise a tendência do peso (está perdendo peso, estável, oscilando ou sem registros). Calcule a perda recente se houver dados.
3. **💬 Padrão de Comunicação e Dúvidas**: Sintetize o tom do paciente nas mensagens (ex: motivado, ansioso, frustrado, lacônico) e as principais dúvidas levantadas por ele.
4. **⚠️ Pontos de Atenção Clínicos**: Destaque quaisquer sintomas relatados, uso de medicamentos mencionados ou queixas físicas/emocionais importantes encontradas nos alertas ou mensagens.
5. **🏥 Recomendação de Abordagem**: Como a clínica ou o médico deve abordar este paciente no próximo contato (ex: "Focar em reforço positivo devido a desânimo", "Investigar dores relatadas", "Orientar sobre a importância do registro de peso").

Seja direto, empático e extremamente profissional. Mantenha o formato limpo, use bullet points e negritos estrategicamente para leitura rápida em 30 segundos.`,
    });

    return {
      summary: response.text,
    };
  }
);

export async function generateClinicalSummary(
  input: z.infer<typeof GenerateClinicalSummaryInputSchema>
): Promise<z.infer<typeof GenerateClinicalSummaryOutputSchema>> {
  return generateClinicalSummaryFlow(input);
}
