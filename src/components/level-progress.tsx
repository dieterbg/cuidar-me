import { Progress } from '@/components/ui/progress';
import { Trophy } from 'lucide-react';
import { getLevelInfo, type LevelInfo } from '@/lib/level-system';
import { cn } from '@/lib/utils';

interface LevelProgressProps {
    points: number;
    className?: string;
    showDetails?: boolean;
}

export function LevelProgress({ points, className, showDetails = true }: LevelProgressProps) {
    const levelInfo: LevelInfo = getLevelInfo(points);
    const { level, tier, progress, pointsForNext, color } = levelInfo;

    return (
        <div className={cn("space-y-2", className)}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Trophy className={cn("h-5 w-5", color)} />
                    <span className="font-bold text-lg">Nível {level}</span>
                    <span className={cn("text-sm", color)}>({tier})</span>
                </div>
                {showDetails && level < 20 && (
                    <span className="text-xs text-muted-foreground">
                        {pointsForNext} pts para próximo nível
                    </span>
                )}
            </div>

            {level < 20 && (
                <Progress value={progress} className="h-2" />
            )}

            {level === 20 && (
                <div className="text-xs text-muted-foreground italic">
                    Nível máximo atingido! 🎉
                </div>
            )}
        </div>
    );
}

/**
 * Versão compacta para badges
 */
export function LevelBadge({ level, tier }: { level: number; tier: string }) {

    return (
        <div className={cn(
            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border",
            "bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
        )}>
            <Trophy className="h-3 w-3" />
            <span>Nv. {level}</span>
        </div>
    );
}
