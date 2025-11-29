'use client';

import { useState } from 'react';
import { StoreItem, STORE_CATALOG } from '@/lib/points-store';
import { Transaction, purchaseStoreItem } from '@/ai/actions/store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Loader2, ShoppingBag, History, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PointsStoreProps {
    userId: string;
    initialBalance: number;
    initialTransactions: Transaction[];
}

export function PointsStore({ userId, initialBalance, initialTransactions }: PointsStoreProps) {
    const [balance, setBalance] = useState(initialBalance);
    const [transactions, setTransactions] = useState(initialTransactions);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const { toast } = useToast();

    const handlePurchase = async (item: StoreItem) => {
        if (balance < item.cost) return;

        setLoadingId(item.id);
        try {
            const result = await purchaseStoreItem(userId, item.id);

            if (result.success) {
                setBalance(result.newBalance);
                toast({
                    title: "Compra realizada! 🎉",
                    description: result.message,
                });
                // Atualizar transações localmente (opcional, ou revalidar)
                const newTx: Transaction = {
                    id: Date.now().toString(),
                    item_id: item.id,
                    item_name: item.name,
                    cost: item.cost,
                    transaction_type: 'purchase',
                    created_at: new Date().toISOString(),
                    metadata: { type: item.type }
                };
                setTransactions([newTx, ...transactions]);
            } else {
                toast({
                    title: "Erro na compra",
                    description: result.message,
                    variant: "destructive"
                });
            }
        } catch (error) {
            toast({
                title: "Erro",
                description: "Ocorreu um erro inesperado.",
                variant: "destructive"
            });
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header de Saldo */}
            <div className="bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-950 dark:to-orange-950 p-6 rounded-2xl border border-amber-200 dark:border-amber-800 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="bg-amber-500 text-white p-3 rounded-full shadow-lg">
                        <Star className="w-8 h-8 fill-current" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200 uppercase tracking-wider">Seu Saldo</p>
                        <h2 className="text-4xl font-bold text-amber-900 dark:text-amber-100">{balance.toLocaleString()} <span className="text-lg font-normal">pontos</span></h2>
                    </div>
                </div>
                <div className="text-right hidden md:block">
                    <p className="text-sm text-amber-800 dark:text-amber-200 max-w-xs">
                        Use seus pontos para desbloquear benefícios exclusivos e acelerar seu progresso.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="store" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="store" className="gap-2">
                        <ShoppingBag className="w-4 h-4" /> Loja
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-2">
                        <History className="w-4 h-4" /> Histórico
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="store" className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {STORE_CATALOG.map((item) => (
                            <StoreItemCard
                                key={item.id}
                                item={item}
                                canAfford={balance >= item.cost}
                                onPurchase={() => handlePurchase(item)}
                                isLoading={loadingId === item.id}
                            />
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="history" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Histórico de Transações</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {transactions.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">Nenhuma transação encontrada.</p>
                            ) : (
                                <div className="space-y-4">
                                    {transactions.map((tx) => (
                                        <div key={tx.id} className="flex justify-between items-center border-b pb-4 last:border-0 last:pb-0">
                                            <div>
                                                <p className="font-medium">{tx.item_name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(tx.created_at).toLocaleDateString()} às {new Date(tx.created_at).toLocaleTimeString()}
                                                </p>
                                            </div>
                                            <div className="text-red-500 font-bold">
                                                -{tx.cost} pts
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function StoreItemCard({
    item,
    canAfford,
    onPurchase,
    isLoading
}: {
    item: StoreItem;
    canAfford: boolean;
    onPurchase: () => void;
    isLoading: boolean;
}) {
    return (
        <Card className={cn("flex flex-col h-full transition-all hover:shadow-md", !canAfford && "opacity-80")}>
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div className="text-4xl mb-2">{item.icon}</div>
                    <Badge variant={item.type === 'instant' ? 'default' : 'secondary'}>
                        {item.type === 'instant' ? 'Instantâneo' : 'Resgatável'}
                    </Badge>
                </div>
                <CardTitle className="text-xl">{item.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <p className="text-muted-foreground text-sm mb-4">
                    {item.description}
                </p>
                <div className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                    <Star className="w-4 h-4 fill-current" />
                    {item.cost} pontos
                </div>
            </CardContent>
            <CardFooter>
                <Button
                    className="w-full"
                    disabled={!canAfford || isLoading}
                    onClick={onPurchase}
                    variant={canAfford ? 'default' : 'outline'}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando
                        </>
                    ) : canAfford ? (
                        'Comprar'
                    ) : (
                        'Saldo Insuficiente'
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}
