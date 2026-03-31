import { describe, it, expect, beforeEach } from 'vitest';
import { createServiceRoleClient } from './src/lib/supabase-server-utils';
import { handlePatientReply } from './src/ai/handle-patient-reply';

describe('Gamification Sticky Context Fix', () => {
    const supabase = createServiceRoleClient();
    const TEST_WHATSAPP = 'whatsapp:+5551987700099';

    it('should prioritize gamification handler and clear context after valid response', async () => {
        // 1. Setup: Buscar paciente de teste
        const { data: patient } = await supabase
            .from('patients')
            .select('id, full_name')
            .eq('whatsapp_number', TEST_WHATSAPP)
            .single();
            
        expect(patient).toBeDefined();
        
        // 2. Simular estado de check-in ativo no DB
        const checkinTitle = 'Bem-Estar (Semana 1)';
        await supabase.from('patients').update({
            last_checkin_type: checkinTitle,
            last_checkin_at: new Date().toISOString()
        }).eq('id', patient!.id);
        
        // 3. Executar handlePatientReply com resposta "A"
        const result = await handlePatientReply(
            TEST_WHATSAPP,
            'A',
            patient!.full_name,
            'test_sid_' + Date.now()
        );
        
        expect(result.success).toBe(true);
        
        // 4. Verificar se o estado foi limpo no banco
        const { data: updatedPatient } = await supabase
            .from('patients')
            .select('last_checkin_type, last_checkin_at')
            .eq('id', patient!.id)
            .single();
            
        expect(updatedPatient?.last_checkin_type).toBeNull();
        expect(updatedPatient?.last_checkin_at).toBeNull();
    });

    it('should NOT prioritize gamification if window has expired (2h)', async () => {
        const { data: patient } = await supabase
            .from('patients')
            .select('id, full_name')
            .eq('whatsapp_number', TEST_WHATSAPP)
            .single();
            
        // Simular um check-in de 3 horas atrás
        const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
        await supabase.from('patients').update({
            last_checkin_type: 'Bem-Estar (Semana 1)',
            last_checkin_at: threeHoursAgo.toISOString()
        }).eq('id', patient!.id);
        
        // Esta resposta "A" deve cair na IA normal (ou ser ignorada pelo gamification handler)
        // No caso do sistema atual, a IA deve responder algo genérico.
        // O ponto aqui é que hasActiveCheckin deve ser false.
        
        const result = await handlePatientReply(
            TEST_WHATSAPP,
            'A',
            patient!.full_name,
            'test_sid_' + Date.now()
        );
        
        expect(result.success).toBe(true);
        
        // O contexto NÃO deve ter sido limpo automaticamente pelo handler nesse caso, 
        // ou a IA respondeu normalmente.
    });
});
