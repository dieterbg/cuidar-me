
'use server';

/**
 * @fileOverview Actions para processar upload de exames laboratoriais
 */

import { createServiceRoleClient } from '@/lib/supabase-server-utils';
import { extractLabResults, getAlertPriority } from '@/ai/flows/extract-lab-results';
import { sendWhatsappMessage } from '@/lib/twilio';

/**
 * Processa upload de exame laboratorial
 */
export async function processLabResultUpload(
    patientId: string,
    imageBase64: string,
    whatsappNumber: string
): Promise<{ success: boolean; error?: string; hasAlerts?: boolean }> {
    const supabase = createServiceRoleClient();

    try {
        console.log(`[processLabResultUpload] Processing lab results for patient ${patientId}`);

        // Buscar dados do paciente
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('comorbidities, full_name, plan')
            .eq('id', patientId)
            .single();

        if (patientError || !patient) {
            return { success: false, error: 'Patient not found' };
        }

        // Extrair dados do exame com Gemini Vision
        const extraction = await extractLabResults({
            imageBase64,
            patientId,
            patientComorbidities: patient.comorbidities || [],
        });

        if (!extraction.success || !extraction.extractedData) {
            return {
                success: false,
                error: extraction.error || 'Não foi possível extrair dados do exame'
            };
        }

        const data = extraction.extractedData;

        // Salvar exame no banco
        const { data: labResult, error: insertError } = await supabase
            .from('lab_results')
            .insert({
                patient_id: patientId,
                exam_date: data.examDate || new Date().toISOString().split('T')[0],
                laboratory: data.laboratory,

                // Glicemia
                glucose_fasting: data.glucoseFasting,
                hba1c: data.hba1c,

                // Lipídios
                total_cholesterol: data.totalCholesterol,
                ldl: data.ldl,
                hdl: data.hdl,
                triglycerides: data.triglycerides,

                // Função renal
                creatinine: data.creatinine,
                urea: data.urea,

                // Função hepática
                alt: data.alt,
                ast: data.ast,

                // Tireoide
                tsh: data.tsh,
                t4: data.t4,

                // Vitaminas
                vitamin_d: data.vitaminD,
                vitamin_b12: data.vitaminB12,

                // Metadados
                image_url: null, // TODO: Salvar imagem no storage
                extracted_by_ai: true,
            })
            .select()
            .single();

        if (insertError) {
            console.error('[processLabResultUpload] Error saving lab result:', insertError);
            return { success: false, error: 'Failed to save lab result' };
        }

        // Processar alertas
        const hasAlerts = extraction.alerts && extraction.alerts.length > 0;

        if (hasAlerts) {
            // Criar attention_request para médico
            for (const alert of extraction.alerts!) {
                const priority = getAlertPriority(
                    alert.type,
                    alert.parameter,
                    patient.comorbidities
                );

                await supabase
                    .from('attention_requests')
                    .insert({
                        patient_id: patientId,
                        reason: `Exame alterado: ${alert.parameter}`,
                        trigger_message: `Valor: ${alert.value} (Referência: ${alert.referenceRange})`,
                        ai_summary: alert.message,
                        ai_suggested_reply: generateSuggestedReply(alert, patient.full_name),
                        priority,
                        related_lab_result_id: labResult.id,
                    });
            }

            // Marcar paciente como precisando atenção
            await supabase
                .from('patients')
                .update({ needs_attention: true })
                .eq('id', patientId);

            // Enviar mensagem ao paciente
            const alertMessage = generatePatientAlertMessage(
                extraction.alerts!,
                patient.plan
            );

            await sendWhatsappMessage(whatsappNumber, alertMessage);

            // Salvar mensagem enviada
            await supabase
                .from('messages')
                .insert({
                    patient_id: patientId,
                    sender: 'system',
                    text: alertMessage,
                });
        } else {
            // Sem alertas - exame normal
            const normalMessage = `✅ Exame recebido e analisado!\n\nTodos os valores estão dentro da normalidade. Continue assim! 👏\n\n${patient.plan === 'vip'
                    ? 'Vamos discutir os detalhes na sua próxima consultoria.'
                    : patient.plan === 'premium'
                        ? 'Você pode ver os detalhes no portal.'
                        : 'Upgrade para Premium para acessar análises detalhadas!'
                }`;

            await sendWhatsappMessage(whatsappNumber, normalMessage);

            await supabase
                .from('messages')
                .insert({
                    patient_id: patientId,
                    sender: 'system',
                    text: normalMessage,
                });
        }

        console.log(`[processLabResultUpload] Lab result processed successfully. Alerts: ${hasAlerts}`);

        return { success: true, hasAlerts };

    } catch (error: any) {
        console.error('[processLabResultUpload] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Gera mensagem de alerta para o paciente
 */
function generatePatientAlertMessage(
    alerts: Array<{ type: string; parameter: string; value: number; message: string }>,
    plan: string
): string {
    const criticalAlerts = alerts.filter(a => a.type === 'critical');
    const warningAlerts = alerts.filter(a => a.type === 'warning');

    let message = '📋 **Exame recebido e analisado**\n\n';

    if (criticalAlerts.length > 0) {
        message += '⚠️ **ATENÇÃO:** Identificamos valores que precisam de atenção médica:\n\n';
        criticalAlerts.forEach(alert => {
            message += `• ${alert.message}\n`;
        });
        message += '\n';
    }

    if (warningAlerts.length > 0) {
        message += '⚡ **Valores alterados:**\n\n';
        warningAlerts.forEach(alert => {
            message += `• ${alert.message}\n`;
        });
        message += '\n';
    }

    message += '👨‍⚕️ Nossa equipe médica já foi notificada e entrará em contato em breve.\n\n';

    if (plan === 'vip') {
        message += '⭐ Como cliente VIP, você terá prioridade no atendimento (até 2h).';
    } else if (plan === 'premium') {
        message += '✅ Você receberá orientações em até 24h.';
    } else {
        message += '💡 Upgrade para Premium para ter orientações personalizadas!';
    }

    return message;
}

/**
 * Gera sugestão de resposta para o médico
 */
function generateSuggestedReply(
    alert: { type: string; parameter: string; value: number; referenceRange: string; message: string },
    patientName: string
): string {
    const firstName = patientName.split(' ')[0];

    return `Olá ${firstName}! 👋\n\nAnalisei seu exame e vi que ${alert.message.toLowerCase()}\n\nPara te orientar melhor, preciso entender:\n\n1. Você está sentindo algum sintoma?\n2. Está tomando alguma medicação?\n3. Houve mudança recente na alimentação?\n\nCom essas informações, posso te dar orientações mais precisas.\n\nAguardo seu retorno! 😊`;
}
