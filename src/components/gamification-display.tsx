import { cn } from '@/lib/utils';
import { Flame, Sparkles, Trophy, Star, Zap } from 'lucide-react';

interface GamificationPointsDisplayProps {
    points: number;
    level: string;
    streak?: number;
    className?: string;
    showAnimation?: boolean;
}

export function GamificationPointsDisplay({
    points,
    level,
    streak = 0,
    className,
    showAnimation = false
}: GamificationPointsDisplayProps) {
    return (
        <div className={cn("flex items-center gap-4", className)}>
            {/* Pontos */}
            <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950 px-4 py-2 rounded-full border-2 border-amber-200 dark:border-amber-800">
                <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                <span className="font-bold text-lg text-amber-700 dark:text-amber-300">
                    {points.toLocaleString('pt-BR')}
                </span>
                <span className="text-xs text-amber-600 dark:text-amber-400">pts</span>
            </div>

            {/* Nível */}
            <div className="flex items-center gap-2 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950 px-4 py-2 rounded-full border-2 border-purple-200 dark:border-purple-800">
                <Trophy className="h-5 w-5 text-purple-500" />
                <span className="font-bold text-sm text-purple-700 dark:text-purple-300">
                    {level}
                </span>
            </div>

            {/* Streak (se houver) */}
            {streak > 0 && (
                <div className={cn(
                    "flex items-center gap-2 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 px-4 py-2 rounded-full border-2 border-orange-200 dark:border-orange-800",
                    showAnimation && "animate-pulse"
                )}>
                    <Flame className="h-5 w-5 text-orange-500" />
                    <span className="font-bold text-lg text-orange-700 dark:text-orange-300">
                        {streak}
                    </span>
                    <span className="text-xs text-orange-600 dark:text-orange-400">dias</span>
                </div>
            )}
        </div>
    );
}

interface PerspectiveProgressProps {
    current: number;
    goal: number;
    label: string;
    isComplete: boolean;
    icon: React.ElementType;
    color: string;
}

export function PerspectiveProgress({
    current,
    goal,
    label,
    isComplete,
    icon: Icon,
    color
}: PerspectiveProgressProps) {
    const percentage = Math.min((current / goal) * 100, 100);
    const stars = Array.from({ length: goal }, (_, i) => i < current);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", color)} />
                    <span className="text-sm font-medium">{label}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                    {current}/{goal}
                </span>
            </div>

            {/* Barra de progresso com estrelas */}
            <div className="flex gap-1">
                {stars.map((filled, index) => (
                    <div
                        key={index}
                        className={cn(
                            "flex-1 h-2 rounded-full transition-all duration-300",
                            filled
                                ? "bg-gradient-to-r from-amber-400 to-yellow-500 shadow-sm"
                                : "bg-muted"
                        )}
                    />
                ))}
            </div>

            {/* Mensagem de celebração */}
            {isComplete && (
                <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <Sparkles className="h-3 w-3" />
                    <span>Meta completa! 🎉</span>
                </div>
            )}
        </div>
    );
}

interface CelebrationMessageProps {
    type: 'streak' | 'complete' | 'levelup' | 'badge';
    message: string;
    show: boolean;
}

export function CelebrationMessage({ type, message, show }: CelebrationMessageProps) {
    if (!show) return null;

    const icons = {
        streak: Flame,
        complete: Sparkles,
        levelup: Zap,
        badge: Trophy
    };

    const colors = {
        streak: 'from-orange-500 to-red-500',
        complete: 'from-green-500 to-emerald-500',
        levelup: 'from-purple-500 to-indigo-500',
        badge: 'from-amber-500 to-yellow-500'
    };

    const Icon = icons[type];

    return (
        <div className={cn(
            "fixed top-4 right-4 z-50 animate-in slide-in-from-top-4 duration-500",
            "bg-gradient-to-r p-4 rounded-lg shadow-lg text-white",
            colors[type]
        )}>
            <div className="flex items-center gap-3">
                <Icon className="h-6 w-6 animate-bounce" />
                <p className="font-bold">{message}</p>
            </div>
        </div>
    );
}
