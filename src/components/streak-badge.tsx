/**
 * Componente de Badge de Streak
 * 
 * Exibe a sequência atual de dias do paciente com animação
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, Shield } from 'lucide-react';
import type { StreakData } from '@/lib/streak-system';

interface StreakBadgeProps {
    streakData: StreakData;
    size?: 'sm' | 'md' | 'lg';
    showFreezes?: boolean;
}

export function StreakBadge({
    streakData,
    size = 'md',
    showFreezes = true
}: StreakBadgeProps) {
    const { currentStreak, longestStreak, streakFreezes } = streakData;

    // Estilo baseado no tamanho do streak
    const getStreakColor = (streak: number): string => {
        if (streak === 0) return 'text-gray-400';
        if (streak < 7) return 'text-orange-500';
        if (streak < 30) return 'text-orange-600';
        if (streak < 90) return 'text-red-500';
        return 'text-red-600 animate-pulse';
    };

    const sizeClasses = {
        sm: 'text-2xl',
        md: 'text-4xl',
        lg: 'text-6xl',
    };

    return (
        <Card className="p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* Ícone de Fogo com tamanho dinâmico */}
                    <div className={`${sizeClasses[size]} ${getStreakColor(currentStreak)}`}>
                        <Flame
                            className="w-full h-full"
                            fill="currentColor"
                            strokeWidth={0}
                        />
                    </div>

                    {/* Números de Streak */}
                    <div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold">{currentStreak}</span>
                            <span className="text-gray-600">
                                {currentStreak === 1 ? 'dia' : 'dias'}
                            </span>
                        </div>

                        {/* Recorde Pessoal */}
                        {longestStreak > currentStreak && (
                            <div className="text-sm text-gray-500 mt-1">
                                Recorde: {longestStreak} dias 🏆
                            </div>
                        )}

                        {longestStreak === currentStreak && currentStreak > 0 && (
                            <div className="text-sm text-green-600 font-medium mt-1">
                                ✨ Novo recorde!
                            </div>
                        )}
                    </div>
                </div>

                {/* Proteções de Streak */}
                {showFreezes && (
                    <div className="flex flex-col items-end">
                        <Badge variant="outline" className="gap-1">
                            <Shield className="w-3 h-3" />
                            {streakFreezes} {streakFreezes === 1 ? 'proteção' : 'proteções'}
                        </Badge>
                        <span className="text-xs text-gray-500 mt-1">
                            Proteções disponíveis
                        </span>
                    </div>
                )}
            </div>

            {/* Barra de Progresso para próximo marco */}
            {currentStreak > 0 && currentStreak < 90 && (
                <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Próximo marco:</span>
                        <span className="font-medium">
                            {currentStreak < 7 ? '7 dias 🌟' :
                                currentStreak < 30 ? '30 dias 🔥' :
                                    '90 dias 👑'}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className={`h-2 rounded-full transition-all duration-500 ${currentStreak < 7 ? 'bg-orange-500' :
                                    currentStreak < 30 ? 'bg-red-500' :
                                        'bg-red-600'
                                }`}
                            style={{
                                width: `${(currentStreak / (
                                    currentStreak < 7 ? 7 :
                                        currentStreak < 30 ? 30 :
                                            90
                                )) * 100}%`
                            }}
                        />
                    </div>
                </div>
            )}
        </Card>
    );
}
