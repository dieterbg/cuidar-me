import { Metadata } from 'next';
import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { PointsStore } from '@/components/points-store';
import { getUserTransactions } from '@/ai/actions/store';

export const metadata: Metadata = {
    title: 'Loja de Pontos | Cuidar.me',
    description: 'Troque seus pontos por benefícios exclusivos.',
};

export default async function StorePage() {
    const supabase = createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Buscar dados do usuário
    const { data: patientData } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (!patientData) {
        redirect('/portal/onboarding');
    }

    const patient = patientData as any;
    const { transactions, balance } = await getUserTransactions(user.id);

    return (
        <div className="space-y-6 pb-10 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Loja de Pontos</h1>
                <p className="text-muted-foreground">
                    Recompensas exclusivas para sua dedicação.
                </p>
            </div>

            <PointsStore
                userId={user.id}
                initialBalance={balance}
                initialTransactions={transactions}
            />
        </div>
    );
}
