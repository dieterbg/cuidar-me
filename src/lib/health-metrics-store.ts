import { createServiceRoleClient } from '@/lib/supabase-server-utils';

// Internal insert helper for clinical metrics. The caller must already have
// checked patient ownership or staff permission before reaching this function.
export interface HealthMetricInput {
    weight?: number;
    glucoseLevel?: number;
    waistCircumference?: number;
    sleepDuration?: number;
    physicalActivity?: string;
    mealCheckin?: string;
    date?: string;
}

export async function addHealthMetricRecord(
    patientId: string,
    data: HealthMetricInput,
    supabase = createServiceRoleClient()
): Promise<{ success: boolean; error?: string }> {
    const validationError = validateHealthMetricInput(patientId, data);
    if (validationError) {
        return { success: false, error: validationError };
    }

    const metric: Record<string, unknown> = {
        patient_id: patientId,
        date: data.date || new Date().toISOString().split('T')[0],
    };

    if (data.weight !== undefined) metric.weight_kg = data.weight;
    if (data.glucoseLevel !== undefined) metric.glucose_level = data.glucoseLevel;
    if (data.waistCircumference !== undefined) metric.waist_circumference_cm = data.waistCircumference;
    if (data.sleepDuration !== undefined) metric.sleep_duration_hours = data.sleepDuration;
    if (data.physicalActivity !== undefined) metric.physical_activity_note = data.physicalActivity;
    if (data.mealCheckin !== undefined) metric.meal_checkin = data.mealCheckin;

    const { error } = await supabase
        .from('health_metrics')
        .insert(metric);

    if (error) {
        console.error('Error adding health metric:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

function validateHealthMetricInput(patientId: string, data: HealthMetricInput): string | null {
    if (!patientId || typeof patientId !== 'string') {
        return 'Paciente invalido';
    }

    if (Object.values(data).every(value => value === undefined || value === null || value === '')) {
        return 'Nenhuma metrica informada';
    }

    if (data.weight !== undefined && !isNumberInRange(data.weight, 30, 300)) {
        return 'Peso fora do intervalo esperado';
    }

    if (data.glucoseLevel !== undefined && !isNumberInRange(data.glucoseLevel, 20, 600)) {
        return 'Glicemia fora do intervalo esperado';
    }

    if (data.waistCircumference !== undefined && !isNumberInRange(data.waistCircumference, 30, 250)) {
        return 'Circunferencia abdominal fora do intervalo esperado';
    }

    if (data.sleepDuration !== undefined && !isNumberInRange(data.sleepDuration, 0, 24)) {
        return 'Sono fora do intervalo esperado';
    }

    if (data.physicalActivity !== undefined && data.physicalActivity.length > 1000) {
        return 'Descricao de atividade fisica muito longa';
    }

    if (data.mealCheckin !== undefined && data.mealCheckin.length > 1000) {
        return 'Check-in de refeicao muito longo';
    }

    return null;
}

function isNumberInRange(value: number, min: number, max: number): boolean {
    return Number.isFinite(value) && value >= min && value <= max;
}
