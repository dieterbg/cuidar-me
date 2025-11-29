'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, type LucideIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { registerQuickAction } from '@/ai/actions/gamification';
import type { Perspective } from '@/lib/types';

interface QuickActionButtonProps {
    userId: string;
    type: 'hydration' | 'mood';
    perspective: Perspective;
    icon: LucideIcon;
    label: string;
    color: 'green' | 'red' | 'blue' | 'purple' | 'orange';
}

const colorClasses = {
    green: 'bg-green-600 hover:bg-green-700',
    red: 'bg-red-600 hover:bg-red-700',
    blue: 'bg-blue-600 hover:bg-blue-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    orange: 'bg-orange-600 hover:bg-orange-700',
};

export function QuickActionButton({
    userId,
    type,
    perspective,
    icon: Icon,
    label,
    color
}: QuickActionButtonProps) {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const handleClick = async () => {
        if (loading) return;
        setLoading(true);

        try {
            const result = await registerQuickAction(userId, type, perspective);

            if (result.success) {
                toast({
                    title: "✅ Registrado!",
                    description: result.message,
                    className: `${colorClasses[color].split(' ')[0]} text-white border-none`
                });
                router.refresh();
            } else {
                toast({
                    variant: "destructive",
                    title: "Erro",
                    description: result.message
                });
            }
        } catch (error) {
            console.error("Erro ao registrar:", error);
            toast({
                variant: "destructive",
                title: "Erro Inesperado",
                description: "Não foi possível registrar a ação."
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            onClick={handleClick}
            disabled={loading}
            size="sm"
            className={`${colorClasses[color]} text-white shadow-sm transition-all active:scale-95 flex flex-col h-auto py-3 gap-1`}
        >
            {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <Icon className="w-5 h-5" />
            )}
            <span className="text-xs font-medium">{loading ? "Registrando..." : label}</span>
        </Button>
    );
}
