"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Droplet, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { registerQuickAction } from "@/ai/actions/gamification";

export function HydrationButton({ userId }: { userId: string }) {
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
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95"
        >
            {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
                <Droplet className="w-4 h-4 mr-2" />
            )}
            {loading ? "Registrando..." : "Registrar Água"}
        </Button>
    );
}
