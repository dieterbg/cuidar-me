'use client';

import { useState } from 'react';
import { BadgeDefinition, getBadgeRarityColor } from '@/lib/badge-catalog';
import { cn } from '@/lib/utils';
import { Lock, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface BadgeShowcaseProps {
    unlockedBadges: BadgeDefinition[];
    lockedBadges: BadgeDefinition[];
}

export function BadgeShowcase({ unlockedBadges, lockedBadges }: BadgeShowcaseProps) {
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterRarity, setFilterRarity] = useState<string>('all');

    const allBadges = [...unlockedBadges.map(b => ({ ...b, unlocked: true })), ...lockedBadges.map(b => ({ ...b, unlocked: false }))];

    const filteredBadges = allBadges.filter(badge => {
        const matchCategory = filterCategory === 'all' || badge.criteria.type === filterCategory || (filterCategory === 'perspective' && badge.criteria.type === 'perspective');
        const matchRarity = filterRarity === 'all' || badge.rarity === filterRarity;
        return matchCategory && matchRarity;
    });

    const totalBadges = allBadges.length;
    const unlockedCount = unlockedBadges.length;
    const progressPercent = Math.round((unlockedCount / totalBadges) * 100);

    return (
        <div className="space-y-6">
            {/* Header e Filtros */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                    <h3 className="text-lg font-semibold">Sua Coleção</h3>
                    <p className="text-sm text-muted-foreground">
                        {unlockedCount} de {totalBadges} badges desbloqueados ({progressPercent}%)
                    </p>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Categoria" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            <SelectItem value="streak">Sequência</SelectItem>
                            <SelectItem value="perspective">Pilares</SelectItem>
                            <SelectItem value="points">Pontos</SelectItem>
                            <SelectItem value="community">Comunidade</SelectItem>
                            <SelectItem value="special">Especiais</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={filterRarity} onValueChange={setFilterRarity}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Raridade" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            <SelectItem value="comum">Comum</SelectItem>
                            <SelectItem value="raro">Raro</SelectItem>
                            <SelectItem value="epico">Épico</SelectItem>
                            <SelectItem value="lendario">Lendário</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Grid de Badges */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredBadges.map((badge) => (
                    <BadgeCard key={badge.id} badge={badge} unlocked={badge.unlocked} />
                ))}
            </div>

            {filteredBadges.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    Nenhum badge encontrado com esses filtros.
                </div>
            )}
        </div>
    );
}

function BadgeCard({ badge, unlocked }: { badge: BadgeDefinition; unlocked: boolean }) {
    const rarityColor = getBadgeRarityColor(badge.rarity);

    // Mapeamento de cores para bordas e fundos baseado na raridade
    const rarityStyles = {
        comum: 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900',
        raro: 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30',
        epico: 'border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950/30',
        lendario: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'
    };

    const style = rarityStyles[badge.rarity];

    return (
        <div className={cn(
            "relative flex flex-col items-center p-4 rounded-xl border-2 transition-all",
            unlocked ? style : "border-gray-100 bg-gray-50/50 opacity-70 grayscale dark:border-gray-800 dark:bg-gray-900/50",
            unlocked && "hover:scale-105 hover:shadow-md cursor-pointer"
        )}>
            {/* Ícone */}
            <div className={cn(
                "w-16 h-16 flex items-center justify-center text-3xl rounded-full mb-3 shadow-sm",
                unlocked ? "bg-white dark:bg-gray-800" : "bg-gray-200 dark:bg-gray-800"
            )}>
                {unlocked ? badge.icon : <Lock className="w-6 h-6 text-gray-400" />}
            </div>

            {/* Conteúdo */}
            <div className="text-center space-y-1">
                <h4 className="font-bold text-sm leading-tight">{badge.name}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2 h-8">
                    {badge.description}
                </p>
            </div>

            {/* Badge de Raridade */}
            <div className={cn(
                "absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider",
                unlocked ? rarityColor : "bg-gray-200 text-gray-500"
            )}>
                {badge.rarity}
            </div>
        </div>
    );
}
