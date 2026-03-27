"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
    Star,
    Trophy,
    Flame,
    ShoppingBag,
    Droplet,
    HeartPulse,
    Brain,
    Zap,
    UtensilsCrossed,
    ArrowRight,
    Sparkles,
    Shield,
    Gift,
    Target,
    TrendingUp,
    Crown,
    Medal,
} from 'lucide-react';

const tiers = [
    {
        name: 'Bronze',
        range: '0 - 3.999',
        emoji: '🥉',
        color: 'from-amber-700/20 to-amber-600/10 border-amber-600/30',
        textColor: 'text-amber-700 dark:text-amber-400',
        description: 'Primeiros passos na sua jornada de saude.',
    },
    {
        name: 'Prata',
        range: '4.000 - 7.999',
        emoji: '🥈',
        color: 'from-slate-400/20 to-slate-300/10 border-slate-400/30',
        textColor: 'text-slate-600 dark:text-slate-300',
        description: 'Habitos se formando. Voce ja e consistente.',
    },
    {
        name: 'Ouro',
        range: '8.000 - 14.999',
        emoji: '🥇',
        color: 'from-yellow-500/20 to-yellow-400/10 border-yellow-500/30',
        textColor: 'text-yellow-600 dark:text-yellow-400',
        description: 'Elite. Poucos chegam aqui. Recompensas exclusivas.',
    },
    {
        name: 'Diamante',
        range: '15.000+',
        emoji: '💎',
        color: 'from-cyan-500/20 to-blue-400/10 border-cyan-500/30',
        textColor: 'text-cyan-600 dark:text-cyan-300',
        description: 'Lenda. Beneficios VIP e reconhecimento maximo.',
    },
];

const perspectives = [
    { name: 'Alimentacao', icon: UtensilsCrossed, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', desc: 'Registre refeicoes e ganhe ate 20 pts por check-in.' },
    { name: 'Movimento', icon: HeartPulse, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', desc: 'Atividade fisica vale 40 pts. Seu corpo agradece.' },
    { name: 'Hidratacao', icon: Droplet, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', desc: 'Cada registro de agua vale 15 pts. Simples e poderoso.' },
    { name: 'Disciplina', icon: Zap, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30', desc: 'Pesagem semanal (50 pts) e planejamento (30 pts).' },
    { name: 'Bem-Estar', icon: Brain, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30', desc: 'Cuide da mente. Check-ins de humor valem 15 pts.' },
];

const storeHighlights = [
    { name: 'Protecao de Streak', cost: '100', icon: '🛡️', tier: 'Comum' },
    { name: 'E-book de Receitas', cost: '1.500', icon: '📚', tier: 'Bronze' },
    { name: 'Cupom 15% Parceiros', cost: '4.000', icon: '🎟️', tier: 'Prata' },
    { name: 'Camiseta Exclusiva', cost: '8.000', icon: '👕', tier: 'Ouro' },
    { name: 'Consultoria VIP', cost: '8.000', icon: '👩‍⚕️', tier: 'Ouro' },
    { name: '50% Desconto Anual', cost: '15.000', icon: '💎', tier: 'Diamante' },
];

export default function HowItWorksPage() {
    return (
        <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-background/50 min-h-screen">
            <div className="max-w-4xl mx-auto space-y-16 pb-16">

                {/* HERO */}
                <div className="text-center space-y-6 pt-8">
                    <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center ring-8 ring-primary/5">
                        <Star className="w-10 h-10 text-primary fill-primary/20" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground leading-tight">
                        Sua saude vale <span className="text-primary">Health Coins</span>
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        Cada habito saudavel que voce pratica se transforma em pontos reais.
                        Acumule, suba de nivel e troque por recompensas que fazem diferenca na sua vida.
                    </p>
                    <div className="flex justify-center gap-4 pt-2">
                        <Button asChild size="lg" className="rounded-xl px-8 shadow-lg shadow-primary/20 hover:scale-105 transition-transform font-bold">
                            <Link href="/portal/journey">
                                Comecar Agora <ArrowRight className="ml-2 w-4 h-4" />
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="lg" className="rounded-xl px-8 font-bold">
                            <Link href="/portal/store">
                                <ShoppingBag className="mr-2 w-4 h-4" /> Ver Loja
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* COMO FUNCIONA - 3 PASSOS */}
                <section className="space-y-8">
                    <div className="text-center">
                        <h2 className="text-2xl font-black text-foreground">Como Funciona</h2>
                        <p className="text-muted-foreground mt-2">Tres passos simples para transformar rotina em recompensa.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="text-center border-primary/10 hover:shadow-lg transition-shadow">
                            <CardContent className="pt-8 pb-6 space-y-4">
                                <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center">
                                    <Target className="w-8 h-8 text-green-600" />
                                </div>
                                <h3 className="text-xl font-black">1. Cuide de Voce</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Responda os check-ins pelo WhatsApp ou registre acoes no portal.
                                    Beba agua, coma bem, se exercite, cuide da mente.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="text-center border-primary/10 hover:shadow-lg transition-shadow">
                            <CardContent className="pt-8 pb-6 space-y-4">
                                <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center">
                                    <TrendingUp className="w-8 h-8 text-amber-600" />
                                </div>
                                <h3 className="text-xl font-black">2. Acumule Pontos</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Cada acao gera Health Coins. Metas semanais, streaks e badges
                                    dao bonus extras. Quanto mais consistente, mais voce ganha.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="text-center border-primary/10 hover:shadow-lg transition-shadow">
                            <CardContent className="pt-8 pb-6 space-y-4">
                                <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center">
                                    <Gift className="w-8 h-8 text-purple-600" />
                                </div>
                                <h3 className="text-xl font-black">3. Resgate Premios</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Troque seus pontos na Loja por e-books, descontos, camisetas,
                                    consultorias VIP e ate 50% no plano anual.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* 5 PERSPECTIVAS */}
                <section className="space-y-8">
                    <div className="text-center">
                        <h2 className="text-2xl font-black text-foreground">5 Pilares do Cuidado</h2>
                        <p className="text-muted-foreground mt-2">Complete 3 acoes por semana em cada pilar e ganhe bonus de 50 pts.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {perspectives.map((p) => (
                            <Card key={p.name} className="hover:shadow-md transition-shadow">
                                <CardContent className="pt-6 pb-5 text-center space-y-3">
                                    <div className={cn("mx-auto w-12 h-12 rounded-xl flex items-center justify-center", p.bg)}>
                                        <p.icon className={cn("w-6 h-6", p.color)} />
                                    </div>
                                    <h3 className="font-bold text-sm">{p.name}</h3>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* STREAKS */}
                <section className="space-y-8">
                    <div className="text-center">
                        <h2 className="text-2xl font-black text-foreground flex items-center justify-center gap-2">
                            <Flame className="w-7 h-7 text-orange-500" /> Streaks e Multiplicadores
                        </h2>
                        <p className="text-muted-foreground mt-2">Consistencia e o superpoder. Quanto mais dias seguidos, mais voce ganha.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200/50">
                            <CardContent className="pt-6 space-y-4">
                                <h3 className="font-black text-lg flex items-center gap-2">
                                    <Flame className="w-5 h-5 text-orange-500" /> Bonus por Marco
                                </h3>
                                <div className="space-y-3">
                                    {[
                                        { days: 7, bonus: 100, label: 'Uma semana' },
                                        { days: 14, bonus: 200, label: 'Duas semanas' },
                                        { days: 30, bonus: 500, label: 'Um mes' },
                                        { days: 60, bonus: '1.000', label: 'Dois meses' },
                                        { days: 90, bonus: '2.000', label: 'Protocolo completo' },
                                    ].map((s) => (
                                        <div key={s.days} className="flex items-center justify-between py-2 border-b border-orange-200/30 last:border-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{'🔥'.repeat(Math.min(Math.ceil(s.days / 30), 3))}</span>
                                                <span className="text-sm font-medium">{s.days} dias — {s.label}</span>
                                            </div>
                                            <span className="font-black text-orange-600 dark:text-orange-400">+{s.bonus} pts</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 border-violet-200/50">
                            <CardContent className="pt-6 space-y-4">
                                <h3 className="font-black text-lg flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-violet-500" /> Multiplicador de Streak
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Seus pontos por acao aumentam automaticamente conforme seu streak cresce.
                                    Nao precisa fazer nada — so manter a consistencia.
                                </p>
                                <div className="space-y-4 pt-2">
                                    {[
                                        { range: '0 - 6 dias', mult: '1.0x', desc: 'Pontuacao normal', color: 'bg-muted' },
                                        { range: '7 - 29 dias', mult: '1.5x', desc: 'Bom ritmo!', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
                                        { range: '30+ dias', mult: '2.0x', desc: 'Imparavel!', color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' },
                                    ].map((m) => (
                                        <div key={m.range} className="flex items-center gap-4">
                                            <span className={cn("text-2xl font-black px-3 py-1 rounded-lg min-w-[70px] text-center", m.color)}>{m.mult}</span>
                                            <div>
                                                <p className="font-bold text-sm">{m.range}</p>
                                                <p className="text-xs text-muted-foreground">{m.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-start gap-2 pt-3 p-3 rounded-lg bg-background/50 border border-border/50">
                                    <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                    <p className="text-xs text-muted-foreground">
                                        <strong className="text-foreground">Protecao de Streak:</strong> Compre na loja por apenas 100 pts e proteja seu streak se precisar faltar um dia. Voce pode ter ate 2 protecoes ativas.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* NIVEIS */}
                <section className="space-y-8">
                    <div className="text-center">
                        <h2 className="text-2xl font-black text-foreground flex items-center justify-center gap-2">
                            <Crown className="w-7 h-7 text-amber-500" /> Niveis e Tiers
                        </h2>
                        <p className="text-muted-foreground mt-2">
                            20 niveis divididos em 4 categorias. Cada level-up da bonus de pontos!
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {tiers.map((tier) => (
                            <Card key={tier.name} className={cn("bg-gradient-to-br border overflow-hidden relative group hover:shadow-lg transition-all", tier.color)}>
                                <CardContent className="pt-6 pb-5 space-y-3 relative z-10">
                                    <div className="text-4xl">{tier.emoji}</div>
                                    <h3 className={cn("text-xl font-black", tier.textColor)}>{tier.name}</h3>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{tier.range} pts</p>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{tier.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="text-center p-4 rounded-xl bg-primary/5 border border-primary/10">
                        <p className="text-sm text-muted-foreground">
                            <strong className="text-foreground">Bonus de Level-Up:</strong> Ao subir de nivel, voce ganha <strong className="text-primary">100 x nivel</strong> em pontos bonus.
                            Exemplo: subir para o nivel 10 = +1.000 pontos extras!
                        </p>
                    </div>
                </section>

                {/* BADGES */}
                <section className="space-y-8">
                    <div className="text-center">
                        <h2 className="text-2xl font-black text-foreground flex items-center justify-center gap-2">
                            <Medal className="w-7 h-7 text-amber-500" /> 20 Conquistas para Desbloquear
                        </h2>
                        <p className="text-muted-foreground mt-2">
                            Badges nao sao so medalhas — cada um da bonus de pontos ao desbloquear.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { rarity: 'Comum', pts: 50, color: 'bg-gray-100 dark:bg-gray-800 border-gray-300', text: 'text-gray-700 dark:text-gray-300', count: 7 },
                            { rarity: 'Raro', pts: 100, color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-300', text: 'text-blue-700 dark:text-blue-300', count: 6 },
                            { rarity: 'Epico', pts: 200, color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-300', text: 'text-purple-700 dark:text-purple-300', count: 4 },
                            { rarity: 'Lendario', pts: 500, color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-300', text: 'text-amber-700 dark:text-amber-300', count: 3 },
                        ].map((r) => (
                            <Card key={r.rarity} className={cn("border text-center", r.color)}>
                                <CardContent className="pt-5 pb-4 space-y-2">
                                    <p className={cn("text-lg font-black", r.text)}>{r.rarity}</p>
                                    <p className="text-2xl font-black text-foreground">+{r.pts} pts</p>
                                    <p className="text-xs text-muted-foreground">{r.count} badges nesta categoria</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <p className="text-center text-sm text-muted-foreground">
                        Exemplos: 🔥 Streaks de 7 a 90 dias, 💧 Mestre da Hidratacao, 🏆 Atingir meta de peso, 👑 Nivel maximo...
                    </p>
                </section>

                {/* LOJA */}
                <section className="space-y-8">
                    <div className="text-center">
                        <h2 className="text-2xl font-black text-foreground flex items-center justify-center gap-2">
                            <ShoppingBag className="w-7 h-7 text-primary" /> Loja de Recompensas
                        </h2>
                        <p className="text-muted-foreground mt-2">Seus pontos viram beneficios reais. Veja o que esta te esperando.</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {storeHighlights.map((item) => (
                            <Card key={item.name} className="hover:shadow-md transition-shadow">
                                <CardContent className="pt-5 pb-4 text-center space-y-2">
                                    <span className="text-4xl">{item.icon}</span>
                                    <h3 className="font-bold text-sm">{item.name}</h3>
                                    <div className="flex items-center justify-center gap-1">
                                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                        <span className="text-sm font-black text-amber-600 dark:text-amber-400">{item.cost}</span>
                                        <span className="text-[10px] text-muted-foreground">pts</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{item.tier}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="text-center">
                        <Button asChild size="lg" className="rounded-xl px-10 shadow-lg shadow-primary/20 hover:scale-105 transition-transform font-bold">
                            <Link href="/portal/store">
                                Explorar Loja Completa <ArrowRight className="ml-2 w-4 h-4" />
                            </Link>
                        </Button>
                    </div>
                </section>

                {/* CTA FINAL */}
                <section className="text-center space-y-6 p-8 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
                    <Sparkles className="w-12 h-12 text-primary mx-auto" />
                    <h2 className="text-3xl font-black text-foreground">
                        Pronto para transformar habitos em recompensas?
                    </h2>
                    <p className="text-muted-foreground max-w-lg mx-auto">
                        Cada copo de agua, cada refeicao saudavel, cada noite bem dormida conta.
                        Comece agora e veja seus pontos crescerem.
                    </p>
                    <Button asChild size="lg" className="rounded-xl px-10 h-14 text-lg shadow-lg shadow-primary/25 hover:scale-105 transition-transform font-bold">
                        <Link href="/portal/journey">
                            Comecar Minha Jornada <ArrowRight className="ml-2 w-5 h-5" />
                        </Link>
                    </Button>
                </section>

            </div>
        </div>
    );
}
