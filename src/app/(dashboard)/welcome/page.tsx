"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import {
  ArrowRight,
  BrainCircuit,
  Users,
  Trophy,
  Zap,
  MessageSquareText,
  LineChart,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { cn } from "@/lib/utils";

export default function WelcomePage() {
  const { profile } = useAuth();

  const features = [
    {
      icon: Zap,
      title: "Eficiência Operacional",
      description: "Gerencie centenas de pacientes com nossa Fila de Atenção inteligente. Foque apenas em quem realmente precisa de suporte agora.",
      color: "bg-amber-100 text-amber-700",
      link: "/patients"
    },
    {
      icon: BrainCircuit,
      title: "Inteligência Artificial",
      description: "Crie protocolos personalizados em segundos. Nossa IA analisa o perfil do paciente e sugere a jornada ideal de emagrecimento.",
      color: "bg-purple-100 text-purple-700",
      link: "/protocols"
    },
    {
      icon: Trophy,
      title: "Gamificação Real",
      description: "Engaje pacientes com desafios de Alimentação, Movimento e Bem-estar. Transforme a jornada de saúde em uma experiência viciante.",
      color: "bg-[#899d5e]/20 text-[#899d5e]",
      link: "/education"
    },
    {
      icon: Users,
      title: "Comunidade Vibrante",
      description: "Um espaço seguro onde pacientes trocam experiências e se motivam, moderado facilmente pela sua equipe.",
      color: "bg-blue-100 text-blue-700",
      link: "/community"
    }
  ];

  return (
    <div className="flex-1 p-8 bg-[#F9FAF6] min-h-screen">
      <div className="max-w-6xl mx-auto space-y-12">

        {/* Hero Section */}
        <div className="text-center space-y-6 py-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#899d5e]/10 text-[#899d5e] font-medium text-sm mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Sparkles className="h-4 w-4" />
            <span>A Revolução no Acompanhamento de Endocrinologia</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-tight">
            Escale seu cuidado sem perder a <span className="text-[#899d5e]">empatia</span>.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Bem-vindo(a), <span className="font-semibold text-foreground">{profile?.display_name}</span>.
            A Cuidar.me combina tecnologia de ponta com calor humano para entregar resultados reais de emagrecimento.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Link href="/overview">
              <Button size="lg" className="h-14 px-8 rounded-full text-lg bg-[#899d5e] hover:bg-[#7a8c53] shadow-xl shadow-[#899d5e]/20 transition-all hover:-translate-y-1">
                Acessar Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <Link href={feature.link} key={index} className="group">
              <Card className="h-full border-none shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white overflow-hidden relative">
                <CardContent className="p-8 flex flex-col h-full relative z-10">
                  <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110", feature.color)}>
                    <feature.icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-foreground group-hover:text-[#899d5e] transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-lg leading-relaxed mb-6 flex-1">
                    {feature.description}
                  </p>
                  <div className="flex items-center text-[#899d5e] font-semibold group-hover:translate-x-2 transition-transform">
                    Explorar <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                </CardContent>
                {/* Decorative Background Blob */}
                <div className={cn("absolute -right-10 -bottom-10 w-40 h-40 rounded-full opacity-10 blur-3xl transition-opacity group-hover:opacity-20", feature.color.split(' ')[0])} />
              </Card>
            </Link>
          ))}
        </div>

        {/* Stats / Trust Section */}
        <div className="grid md:grid-cols-3 gap-8 py-12 border-t border-border/40">
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>
            <h4 className="text-3xl font-bold text-foreground">HIPAA & LGPD</h4>
            <p className="text-muted-foreground">Segurança de dados de nível bancário</p>
          </div>
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                <LineChart className="h-6 w-6" />
              </div>
            </div>
            <h4 className="text-3xl font-bold text-foreground">+40% Adesão</h4>
            <p className="text-muted-foreground">Comparado a métodos tradicionais</p>
          </div>
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                <MessageSquareText className="h-6 w-6" />
              </div>
            </div>
            <h4 className="text-3xl font-bold text-foreground">24/7 Suporte</h4>
            <p className="text-muted-foreground">Chatbot inteligente + Equipe humana</p>
          </div>
        </div>

      </div>
    </div>
  );
}
