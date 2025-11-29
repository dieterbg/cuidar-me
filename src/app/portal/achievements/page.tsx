import { Metadata } from 'next';
import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { BadgeShowcase } from '@/components/badge-showcase';
import { getUserBadges } from '@/ai/actions/badges';
import { StreakDisplay } from '@/components/streak-display';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Trophy, Star, Target } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Minhas Conquistas | Cuidar.me',
    description: 'Veja seus badges e progresso na jornada de saúde.',
};

export default async function AchievementsPage() {
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
    const { unlocked, locked, totalCount, unlockedCount } = await getUserBadges(user.id);
    const streakData = patient.gamification?.streak || { currentStreak: 0, longestStreak: 0, streakFreezes: 0 };

    return (
        <div className="space-y-8 pb-10 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Minhas Conquistas</h1>
                    <p className="text-muted-foreground">
                        Colecione badges e celebre seu progresso.
                    </p>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total de Badges
                        </CardTitle>
                        <Trophy className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{unlockedCount} / {totalCount}</div>
                        <p className="text-xs text-muted-foreground">
                            {Math.round((unlockedCount / totalCount) * 100)}% completado
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Pontos Totais
                        </CardTitle>
                        <Star className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{patient.gamification?.totalPoints || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Nível {patient.gamification?.level || 'Iniciante'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Maior Streak
                        </CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{streakData.longestStreak} dias</div>
                        <p className="text-xs text-muted-foreground">
                            Atual: {streakData.currentStreak} dias
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-8 md:grid-cols-[300px_1fr]">
                {/* Sidebar com Streak e Nível */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Sequência Atual</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <StreakDisplay streakData={streakData} size="lg" className="justify-center" />
                            <p className="text-sm text-center text-muted-foreground mt-4">
                                Mantenha a chama acesa realizando atividades diárias!
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Galeria de Badges */}
                <div className="space-y-6">
                    <BadgeShowcase unlockedBadges={unlocked} lockedBadges={locked} />
                </div>
            </div>
        </div>
    );
}
