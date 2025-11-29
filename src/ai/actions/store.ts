'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { getStoreItem, STORE_CATALOG } from '@/lib/points-store';

export interface Transaction {
    id: string;
    item_id: string;
    item_name: string;
    cost: number;
    transaction_type: string;
    created_at: string;
    metadata?: any;
}

/**
 * Realiza a compra de um item da loja
 */
export async function purchaseStoreItem(
    userId: string,
    itemId: string
): Promise<{
    success: boolean;
    message: string;
    newBalance: number;
}> {
    const supabase = createClient();
    const item = getStoreItem(itemId);

    if (!item) {
        return { success: false, message: 'Item não encontrado.', newBalance: 0 };
    }

    try {
        // 1. Buscar dados do paciente (saldo)
        const { data: patientData, error: patientError } = await supabase
            .from('patients')
            .select('id, gamification')
            .eq('user_id', userId)
            .single();

        if (patientError || !patientData) {
            console.error('Error fetching patient for purchase:', patientError);
            return { success: false, message: 'Erro ao identificar usuário.', newBalance: 0 };
        }

        const patient = patientData as any;
        const currentPoints = patient.gamification?.totalPoints || 0;

        // 2. Verificar saldo
        if (currentPoints < item.cost) {
            return {
                success: false,
                message: `Saldo insuficiente. Faltam ${item.cost - currentPoints} pontos.`,
                newBalance: currentPoints
            };
        }

        // 3. Verificar limites (ex: streak freeze max 2)
        if (item.id === 'streak_freeze') {
            const currentFreezes = patient.gamification?.streak?.streakFreezes || 0;
            if (currentFreezes >= 2) {
                return {
                    success: false,
                    message: 'Você já possui o máximo de proteções (2).',
                    newBalance: currentPoints
                };
            }
        }

        // 4. Processar compra (Transação Atômica idealmente, aqui sequencial)

        // 4.1 Deduzir pontos
        const newBalance = currentPoints - item.cost;
        const updatedGamification = {
            ...patient.gamification,
            totalPoints: newBalance
        };

        // 4.2 Aplicar benefício instantâneo
        if (item.type === 'instant') {
            if (item.id === 'streak_freeze') {
                updatedGamification.streak = {
                    ...updatedGamification.streak,
                    streakFreezes: (updatedGamification.streak?.streakFreezes || 0) + 1
                };
            }
            // Outros instantâneos aqui...
        }

        // 4.3 Atualizar paciente
        const { error: updateError } = await supabase
            .from('patients')
            .update({
                gamification: updatedGamification,
                total_points: newBalance // Coluna legada
            })
            .eq('id', patient.id);

        if (updateError) {
            throw updateError;
        }

        // 4.4 Registrar transação
        const { error: txError } = await supabase
            .from('transactions')
            .insert({
                patient_id: patient.id,
                item_id: item.id,
                item_name: item.name,
                cost: item.cost,
                transaction_type: 'purchase',
                metadata: {
                    category: item.category,
                    type: item.type,
                    redeem_code: item.type === 'redeemable' ? generateRedeemCode() : null
                }
            });

        if (txError) {
            console.error('Error logging transaction:', txError);
            // Não falhamos a compra se o log falhar, mas é bom monitorar
        }

        revalidatePath('/portal/store');
        revalidatePath('/portal/journey');

        return {
            success: true,
            message: `Compra realizada com sucesso! ${item.name} adquirido.`,
            newBalance
        };

    } catch (error) {
        console.error('Purchase exception:', error);
        return { success: false, message: 'Erro ao processar compra.', newBalance: 0 };
    }
}

/**
 * Busca histórico de transações do usuário
 */
export async function getUserTransactions(userId: string): Promise<{
    transactions: Transaction[];
    balance: number;
}> {
    const supabase = createClient();

    // Buscar paciente ID primeiro
    const { data: patient } = await supabase
        .from('patients')
        .select('id, gamification')
        .eq('user_id', userId)
        .single();

    if (!patient) return { transactions: [], balance: 0 };

    const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })
        .limit(20);

    return {
        transactions: (transactions as Transaction[]) || [],
        balance: (patient as any).gamification?.totalPoints || 0
    };
}

function generateRedeemCode(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}
