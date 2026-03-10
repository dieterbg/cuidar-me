"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Droplet, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { registerQuickAction } from "@/ai/actions/gamification";

export function HydrationButton({ userId, onSuccess }: { userId: string, onSuccess?: () => void }) {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const handleRegister = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const result = await registerQuickAction(userId, 'hydration');

            if (result.success) {
                toast({
                    title: "Hidratação Registrada!",
                    description: result.message,
                    className: "bg-blue-500 text-white border-none"
                });
                if (onSuccess) onSuccess();
                router.refresh(); // Force UI update
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
            onClick={handleRegister}
            disabled={loading}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95 flex flex-col h-auto py-3 gap-1"
        >
            {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <Droplet className="w-5 h-5" />
            )}
            <span className="text-xs font-medium">{loading ? "Registrando..." : "Registrar Água"}</span>
        </Button>
    );
}
