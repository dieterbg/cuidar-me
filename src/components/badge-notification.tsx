import { useEffect, useState } from 'react';
import { BadgeDefinition, getBadgeRarityColor } from '@/lib/badge-catalog';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface BadgeNotificationProps {
    badge: BadgeDefinition | null;
    onClose: () => void;
}

export function BadgeNotification({ badge, onClose }: BadgeNotificationProps) {
    useEffect(() => {
        if (badge) {
            // Auto-close after 5 seconds
            const timer = setTimeout(() => {
                onClose();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [badge, onClose]);

    if (!badge) return null;

    const rarityColor = getBadgeRarityColor(badge.rarity);

    return (
        <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className={cn(
                "relative flex items-center gap-4 p-4 rounded-xl shadow-2xl border-2 bg-white dark:bg-gray-900",
                rarityColor.replace('bg-', 'border-').replace('text-', 'border-')
            )}>
                {/* Botão Fechar */}
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Ícone */}
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-2xl bg-gray-100 dark:bg-gray-800 rounded-full animate-bounce">
                    {badge.icon}
                </div>

                {/* Texto */}
                <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                        Badge Desbloqueado!
                    </p>
                    <h4 className="font-bold text-lg leading-none mb-1">{badge.name}</h4>
                    <p className="text-xs text-muted-foreground">{badge.description}</p>
                </div>
            </div>
        </div>
    );
}
