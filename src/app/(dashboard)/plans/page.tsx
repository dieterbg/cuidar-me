
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Check, Star, Shield, Bot, MessageCircle, ClipboardCheck, AreaChart, Users, Video, ShieldAlert, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const PlanFeature = ({ children, included = true }: { children: React.ReactNode; included?: boolean }) => (
  <li className={`flex items-start gap-3 ${included ? '' : 'text-muted-foreground'}`}>
    <div className="w-5 h-5 flex-shrink-0 mt-1">
      {included ? <Check className="text-green-500" /> : <Check className="text-gray-400" />}
    </div>
    <span>{children}</span>
  </li>
);

export default function PlansPage() {
  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Nossos Planos de Acompanhamento
          </h1>
          <p className="text-xl text-muted-foreground mt-2 max-w-3xl mx-auto">
            Oferecemos uma estrutura de planos flexível, projetada para atender diferentes necessidades dos pacientes e otimizar o foco da nossa equipe.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">

          {/* Plano Freemium */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Shield /> Freemium
              </CardTitle>
              <CardDescription>Acesso inicial focado em aquisição e dicas básicas.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-3xl font-bold mb-6">Grátis</p>
              <ul className="space-y-4 text-sm">
                <PlanFeature>Cadastro rápido via IA (Nome e Peso)</PlanFeature>
                <PlanFeature>1 Dica Diária genérica via WhatsApp</PlanFeature>
                <PlanFeature>Limite de **5 mensagens/dia** com a IA</PlanFeature>
                <PlanFeature included={false}>Respostas personalizadas (Modo Vendedor)</PlanFeature>
                <PlanFeature included={false}>Protocolos Clínicos Interativos</PlanFeature>
                <PlanFeature included={false}>Sistema de Gamificação e Recompensas</PlanFeature>
              </ul>
            </CardContent>
            <CardFooter>
              <Badge variant="secondary">Aquisição e Ativação de Leads</Badge>
            </CardFooter>
          </Card>

          {/* Plano Premium */}
          <Card className="flex flex-col border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Star className="text-primary fill-primary/20" /> Premium
              </CardTitle>
              <CardDescription>Educação e mudança de comportamento com suporte de IA.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-3xl font-bold mb-6">R$ 197<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
              <p className="text-sm font-semibold mb-2">Tudo do Freemium, mais:</p>
              <ul className="space-y-4 text-sm">
                <PlanFeature>
                  <Bot className="h-4 w-4 inline-block mr-1 text-primary" />
                  **Consultor IA 24h** (Até 30 mensagens/dia).
                </PlanFeature>
                <PlanFeature>
                  <ClipboardCheck className="h-4 w-4 inline-block mr-1 text-primary" />
                  Acesso a **Protocolos Clínicos** (Fundamentos e Evolução).
                </PlanFeature>
                <PlanFeature>
                  <Trophy className="h-4 w-4 inline-block mr-1 text-primary" />
                  Sistema de **Gamificação e Recompensas** (bronze a diamante).
                </PlanFeature>
                <PlanFeature>
                  <AreaChart className="h-4 w-4 inline-block mr-1 text-primary" />
                  Captura de dados (Peso, Alimentação, Água e Sono).
                </PlanFeature>
                <PlanFeature included={false}>Intervenção Humana Direta</PlanFeature>
                <PlanFeature included={false}>Protocolos de Performance (Alta Intensidade)</PlanFeature>
              </ul>
            </CardContent>
            <CardFooter>
              <Badge variant="default">Equilíbrio, Engajamento e Hábito</Badge>
            </CardFooter>
          </Card>

          {/* Plano VIP */}
          <Card className="border-primary border-2 flex flex-col relative shadow-xl bg-white">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 hover:bg-amber-600">Alta Performance</Badge>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl text-primary">
                <Star className="text-amber-500 fill-amber-500" /> VIP
              </CardTitle>
              <CardDescription>Hiper-personalização e cuidado médico direto.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-3xl font-bold mb-6">R$ 397<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
              <p className="text-sm font-semibold mb-2">Tudo do Premium, mais:</p>
              <ul className="space-y-4 text-sm">
                <PlanFeature>
                  <MessageCircle className="h-4 w-4 inline-block mr-1 text-amber-500" />
                  **Chat Ilimitado** (∞ mensagens/dia).
                </PlanFeature>
                <PlanFeature>
                  <ShieldAlert className="h-4 w-4 inline-block mr-1 text-amber-500" />
                  **Intervenção Humana**: Equipe médica real interage no chat.
                </PlanFeature>
                <PlanFeature>
                  <Star className="h-4 w-4 inline-block mr-1 text-amber-500" />
                  **Prioridade Máxima** no atendimento e bypass de fila.
                </PlanFeature>
                <PlanFeature>
                  <ClipboardCheck className="h-4 w-4 inline-block mr-1 text-amber-500" />
                  Acesso exclusivo aos **Protocolos de Performance**.
                </PlanFeature>
              </ul>
            </CardContent>
            <CardFooter>
              <Badge variant="outline" className="border-amber-500 text-amber-500">Exclusividade e Suporte High-Ticket</Badge>
            </CardFooter>
          </Card>

        </div>
      </div>
    </div>
  );
}

