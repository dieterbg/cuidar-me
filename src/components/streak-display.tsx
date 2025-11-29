import { Flame, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StreakData } from '@/lib/types';

interface StreakDisplayProps {
    streakData: StreakData;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export function StreakDisplay({ streakData, className, size = 'md' }: StreakDisplayProps) {
    const { currentStreak, longestStreak, streakFreezes } = streakData;

    const sizeClasses = {
        sm: {
            container: 'px-3 py-1.5',
            icon: 'h-4 w-4',
            text: 'text-base',
            subtext: 'text-[9px]',
            shield: 'h-3 w-3'
        },
        md: {
            container: 'px-4 py-2',
            icon: 'h-5 w-5',
            text: 'text-lg',
            subtext: 'text-[10px]',
            shield: 'h-4 w-4'
        },
        lg: {
            container: 'px-6 py-3',
            icon: 'h-6 w-6',
            text: 'text-2xl',
            subtext: 'text-xs',
            shield: 'h-5 w-5'
        }
    };

    const classes = sizeClasses[size];

    return (
        <div className={cn("flex items-center gap-4", className)}>
            {/* Streak Atual */}
            <div className={cn(
                "flex items-center gap-2 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 rounded-full border-2 border-orange-200 dark:border-orange-800",
                classes.container
            )}>
                <Flame className={cn(classes.icon, "text-orange-500")} />
                <div className="flex flex-col">
                    <span className={cn("font-bold text-orange-700 dark:text-orange-300", classes.text)}>
                        {currentStreak}
                    </span>
                    <span className={cn("text-orange-600 dark:text-orange-400 -mt-1", classes.subtext)}>
                        dias
                    </span>
                </div>
            </div>

            {/* Recorde Pessoal */}
            {longestStreak > currentStreak && (
                <div className="text-xs text-muted-foreground">
                    Recorde: {longestStreak} dias
                </div>
            )}

            {/* Proteções de Streak */}
            <div className="flex items-center gap-1" title="Proteções de streak disponíveis">
                {[...Array(2)].map((_, i) => (
                    <Shield
                        key={i}
                        className={cn(
                            classes.shield,
                            i < streakFreezes
                                ? "text-blue-500 fill-blue-500"
                                : "text-gray-300 dark:text-gray-600"
                        )}
                    />
                ))}
            </div>
        </div>
    );
}

/**
 * Versão compacta para exibir em cards
 */
export function StreakBadge({ currentStreak }: { currentStreak: number }) {
    if (currentStreak === 0) return null;

    return (
        <div className="inline-flex items-center gap-1 bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 px-2 py-1 rounded-full text-xs font-medium">
            <Flame className="h-3 w-3" />
            <span>{currentStreak}</span>
        </div>
    );
}
