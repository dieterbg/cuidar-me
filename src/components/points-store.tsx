'use client';

import { useState } from 'react';
import { StoreItem, STORE_CATALOG } from '@/lib/points-store';
import { Transaction, purchaseStoreItem } from '@/ai/actions/store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, ShoppingBag, History, Star, Copy, Check, Ticket } from 'lucide-react';
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
    const [voucherDialog, setVoucherDialog] = useState<{ open: boolean; code: string; itemName: string }>({
        open: false, code: '', itemName: ''
    });
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    const handlePurchase = async (item: StoreItem) => {
        if (balance < item.cost) return;

        setLoadingId(item.id);
        try {
            const result = await purchaseStoreItem(userId, item.id);

            if (result.success) {
                setBalance(result.newBalance);

                const newTx: Transaction = {
                    id: Date.now().toString(),
                    item_id: item.id,
                    item_name: item.name,
                    cost: item.cost,
                    transaction_type: 'purchase',
                    created_at: new Date().toISOString(),
                    metadata: {
                        type: item.type,
                        redeem_code: result.redeemCode || null
                    }
                };
                setTransactions([newTx, ...transactions]);

                // Itens resgatáveis: abrir dialog com o código
                if (result.redeemCode) {
                    setVoucherDialog({ open: true, code: result.redeemCode, itemName: item.name });
                } else {
                    toast({
                        title: "Benefício ativado! 🎉",
                        description: result.message,
                    });
                }
            } else {
                toast({
                    title: "Erro na compra",
                    description: result.message,
                    variant: "destructive"
                });
            }
        } catch {
            toast({
                title: "Erro",
                description: "Ocorreu um erro inesperado.",
                variant: "destructive"
            });
        } finally {
            setLoadingId(null);
        }
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(voucherDialog.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Vouchers ativos (compras redeemable com código)
    const activeVouchers = transactions.filter(
        tx => tx.metadata?.type === 'redeemable' && tx.metadata?.redeem_code
    );

    return (
        <>
            {/* Dialog de Voucher */}
            <Dialog open={voucherDialog.open} onOpenChange={(o) => setVoucherDialog(v => ({ ...v, open: o }))}>
                <DialogContent className="max-w-sm text-center">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">Voucher Gerado! 🎉</DialogTitle>
                        <DialogDescription>
                            Seu código para <strong>{voucherDialog.itemName}</strong>. Guarde-o com cuidado — nossa equipe irá validá-lo.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="my-4">
                        <div className="bg-muted border-2 border-dashed border-border rounded-xl px-6 py-4 text-center">
                            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-widest font-bold">Seu código</p>
                            <p className="text-3xl font-black tracking-widest font-mono text-primary">{voucherDialog.code}</p>
                        </div>
                        <Button
                            variant="outline"
                            className="mt-3 w-full gap-2"
                            onClick={handleCopyCode}
                        >
                            {copied ? <><Check className="w-4 h-4 text-green-500" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar Código</>}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Você também encontra este código na aba <strong>Histórico</strong>.
                    </p>
                </DialogContent>
            </Dialog>

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
                    <TabsList className="grid w-full grid-cols-3 max-w-[500px]">
                        <TabsTrigger value="store" className="gap-2">
                            <ShoppingBag className="w-4 h-4" /> Loja
                        </TabsTrigger>
                        <TabsTrigger value="vouchers" className="gap-2 relative">
                            <Ticket className="w-4 h-4" /> Meus Vouchers
                            {activeVouchers.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                                    {activeVouchers.length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="history" className="gap-2">
                            <History className="w-4 h-4" /> Histórico
                        </TabsTrigger>
                    </TabsList>

                    {/* ABA: LOJA */}
                    <TabsContent value="store" className="mt-6 space-y-12">
                        {['Comum', 'Bronze', 'Prata', 'Ouro', 'Diamante'].map((tier) => {
                            const tierItems = STORE_CATALOG.filter(item => item.tier === tier);
                            if (tierItems.length === 0) return null;

                            return (
                                <div key={tier} className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <h3 className={cn(
                                            "text-xl font-black uppercase tracking-widest px-4 py-1 rounded-lg border",
                                            tier === 'Bronze' ? "bg-amber-100/50 text-amber-700 border-amber-200" :
                                                tier === 'Prata' ? "bg-slate-100/50 text-slate-700 border-slate-200" :
                                                    tier === 'Ouro' ? "bg-yellow-100/50 text-yellow-700 border-yellow-200" :
                                                        tier === 'Diamante' ? "bg-cyan-100/50 text-cyan-700 border-cyan-200" :
                                                            "bg-muted text-muted-foreground border-border"
                                        )}>
                                            {tier === 'Comum' ? 'Apoio Diário' : `Nível ${tier}`}
                                        </h3>
                                        <div className="h-px flex-1 bg-border/40" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {tierItems.map((item) => (
                                            <StoreItemCard
                                                key={item.id}
                                                item={item}
                                                balance={balance}
                                                canAfford={balance >= item.cost}
                                                onPurchase={() => handlePurchase(item)}
                                                isLoading={loadingId === item.id}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </TabsContent>

                    {/* ABA: MEUS VOUCHERS */}
                    <TabsContent value="vouchers" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Ticket className="w-5 h-5" /> Meus Vouchers Ativos
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {activeVouchers.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Ticket className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                                        <p className="text-muted-foreground">Nenhum voucher ainda.</p>
                                        <p className="text-sm text-muted-foreground mt-1">Resgate itens na loja para ver seus códigos aqui.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {activeVouchers.map((tx) => (
                                            <VoucherCard key={tx.id} tx={tx} />
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ABA: HISTÓRICO */}
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
                                            <div key={tx.id} className="border-b pb-4 last:border-0 last:pb-0">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-medium">{tx.item_name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {new Date(tx.created_at).toLocaleDateString('pt-BR')} às {new Date(tx.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                        {tx.metadata?.redeem_code && (
                                                            <p className="text-xs font-mono mt-1 text-primary bg-primary/5 border border-primary/20 px-2 py-0.5 rounded inline-block">
                                                                Código: {tx.metadata.redeem_code}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="text-red-500 font-bold text-sm">
                                                        -{tx.cost.toLocaleString()} pts
                                                    </div>
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
        </>
    );
}

function VoucherCard({ tx }: { tx: Transaction }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(tx.metadata.redeem_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border bg-muted/30">
            <div>
                <p className="font-semibold">{tx.item_name}</p>
                <p className="text-xs text-muted-foreground">
                    Resgatado em {new Date(tx.created_at).toLocaleDateString('pt-BR')}
                </p>
            </div>
            <div className="flex items-center gap-2">
                <div className="bg-background border-2 border-dashed border-border rounded-lg px-4 py-2 text-center">
                    <p className="text-lg font-black tracking-widest font-mono text-primary">{tx.metadata.redeem_code}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={handleCopy} className="shrink-0">
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
            </div>
        </div>
    );
}

function StoreItemCard({
    item,
    balance,
    canAfford,
    onPurchase,
    isLoading
}: {
    item: StoreItem;
    balance: number;
    canAfford: boolean;
    onPurchase: () => void;
    isLoading: boolean;
}) {
    return (
        <Card className={cn(
            "flex flex-col h-full transition-all duration-300 hover:shadow-xl border-border/40 overflow-hidden relative group",
            !canAfford && "grayscale-[0.5] opacity-90",
            item.tier === 'Diamante' ? "border-cyan-500/30 shadow-cyan-500/5" :
                item.tier === 'Ouro' ? "border-amber-500/30 shadow-amber-500/5" : ""
        )}>
            {item.tier !== 'Comum' && (
                <div className={cn(
                    "absolute -top-12 -right-12 w-24 h-24 rotate-45 z-0 opacity-10 transition-transform group-hover:scale-110",
                    item.tier === 'Bronze' ? "bg-amber-500" :
                        item.tier === 'Prata' ? "bg-slate-500" :
                            item.tier === 'Ouro' ? "bg-yellow-500" :
                                item.tier === 'Diamante' ? "bg-cyan-500" : ""
                )} />
            )}

            <CardHeader className="pb-2 relative z-10">
                <div className="flex justify-between items-start">
                    <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">{item.icon}</div>
                    <Badge variant={item.type === 'instant' ? 'default' : 'secondary'} className="font-bold">
                        {item.type === 'instant' ? 'Instantâneo' : 'Voucher'}
                    </Badge>
                </div>
                <CardTitle className="text-xl font-black leading-tight">{item.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 relative z-10">
                <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                    {item.description}
                </p>
                <div className="flex items-center gap-2 bg-muted/50 w-fit px-3 py-1.5 rounded-lg border border-border/50">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                    <span className="font-black text-amber-600 dark:text-amber-400">{item.cost.toLocaleString()}</span>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Health Coins</span>
                </div>
            </CardContent>
            <CardFooter className="relative z-10">
                <Button
                    className={cn(
                        "w-full h-12 rounded-xl font-bold transition-all",
                        canAfford ? "shadow-lg shadow-primary/20 hover:scale-[1.02]" : ""
                    )}
                    disabled={!canAfford || isLoading}
                    onClick={onPurchase}
                    variant={canAfford ? 'default' : 'outline'}
                >
                    {isLoading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</>
                    ) : canAfford ? (
                        'Resgatar Recompensa'
                    ) : (
                        `Faltam ${(item.cost - balance).toLocaleString()} pts`
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}
