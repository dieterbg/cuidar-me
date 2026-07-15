'use server';

import { createAdminClient } from '@/lib/supabase-admin';
import { requirePatientOwnerOrStaff } from '@/lib/authz';
import { generateClinicalSummary } from '@/ai/flows/generate-clinical-summary';
import { transformPatientFromSupabase } from '@/lib/supabase-transforms';

export async function getClinicalSummaryAction(patientId: string): Promise<{ success: boolean; summary?: string; error?: string }> {
  try {
    // 1. Verify access
    await requirePatientOwnerOrStaff(patientId);

    const supabase = createAdminClient();

    // 2. Fetch patient data
    const { data: patientData, error: patientError } = await supabase
      .from('patients')
      .select('*, patient_protocols(*)')
      .eq('id', patientId)
      .eq('patient_protocols.is_active', true)
      .single();

    if (patientError || !patientData) {
      console.error('Error fetching patient data for clinical summary:', patientError);
      return { success: false, error: 'Paciente não encontrado.' };
    }

    // 3. Fetch metrics (last 10 entries)
    const { data: metricsData } = await supabase
      .from('health_metrics')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false })
      .limit(10);

    // 4. Fetch messages (last 30 entries)
    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(30);

    // 5. Fetch attention requests (last 5 entries)
    const { data: attentionRequestsData } = await supabase
      .from('attention_requests')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(5);

    const patient = transformPatientFromSupabase(patientData);
    if (patientData.patient_protocols && patientData.patient_protocols.length > 0) {
      const activeProtocol = patientData.patient_protocols[0];
      patient.protocol = {
        protocolId: activeProtocol.protocol_id,
        startDate: activeProtocol.start_date,
        currentDay: activeProtocol.current_day,
        isActive: activeProtocol.is_active,
        weightGoal: activeProtocol.weight_goal_kg
      };
    }

    const metrics = metricsData?.map(m => ({
      date: m.date,
      weight: m.weight_kg,
      mealCheckin: m.meal_checkin,
    })) || [];

    const recentMessages = messagesData?.map(m => ({
      sender: m.sender,
      text: m.message_content || m.text || '',
      timestamp: m.created_at,
    })).reverse() || []; // chronological order

    const attentionRequests = attentionRequestsData?.map(a => ({
      reason: a.reason || 'Sem motivo especificado',
      aiSummary: a.ai_summary || 'Sem resumo disponível',
      createdAt: a.created_at,
    })) || [];

    // 6. Call Genkit Flow
    const result = await generateClinicalSummary({
      patientName: patient.name,
      plan: patient.subscription.plan,
      protocolName: patient.protocol?.protocolId,
      protocolDay: patient.protocol?.currentDay,
      level: patient.gamification.level !== undefined ? String(patient.gamification.level) : undefined,
      totalPoints: patient.gamification.totalPoints,
      metrics,
      recentMessages,
      attentionRequests,
    });

    return {
      success: true,
      summary: result.summary,
    };

  } catch (error: any) {
    console.error('Error in getClinicalSummaryAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
