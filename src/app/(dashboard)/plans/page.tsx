
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Check, Star, Shield, Bot, MessageCircle, ClipboardCheck, AreaChart, Users, Video, ShieldAlert } from "lucide-react";
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
              <CardDescription>O ponto de entrada para o nosso ecossistema de cuidado.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-3xl font-bold mb-6">Grátis</p>
              <ul className="space-y-4 text-sm">
                <PlanFeature>Acesso ao Portal do Paciente</PlanFeature>
                <PlanFeature>Acesso à Comunidade de Apoio</PlanFeature>
                <PlanFeature>Acesso a vídeos educativos selecionados</PlanFeature>
                <PlanFeature>Gamificação para motivação</PlanFeature>
                <PlanFeature included={false}>Assistente de IA via WhatsApp</PlanFeature>
                <PlanFeature included={false}>Protocolos de acompanhamento</PlanFeature>
                <PlanFeature included={false}>Análise de Risco por IA</PlanFeature>
              </ul>
            </CardContent>
            <CardFooter>
                 <Badge variant="secondary">Ideal para Captura e Ativação de Leads</Badge>
            </CardFooter>
          </Card>

          {/* Plano Premium */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Star /> Premium
              </CardTitle>
              <CardDescription>O acompanhamento inteligente para resultados consistentes.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
               <p className="text-3xl font-bold mb-6">R$ 197<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
               <p className="text-sm font-semibold mb-2">Tudo do Freemium, mais:</p>
               <ul className="space-y-4 text-sm">
                <PlanFeature>
                    <Bot className="h-4 w-4 inline-block mr-1 text-primary"/>
                    **Assistente de IA 24/7** via WhatsApp para dúvidas e agendamentos.
                </PlanFeature>
                 <PlanFeature>
                    <ClipboardCheck className="h-4 w-4 inline-block mr-1 text-primary"/>
                    Atribuição de **Protocolos de Acompanhamento** Padrão (Fundamentos, Evolução).
                </PlanFeature>
                 <PlanFeature>
                    <MessageCircle className="h-4 w-4 inline-block mr-1 text-primary"/>
                    **Escalonamento Padrão** para a equipe humana quando necessário.
                </PlanFeature>
                 <PlanFeature>
                    <AreaChart className="h-4 w-4 inline-block mr-1 text-primary"/>
                    **Gráficos e Análise** de Métricas de Saúde.
                </PlanFeature>
                 <PlanFeature>
                    <Video className="h-4 w-4 inline-block mr-1 text-primary"/>
                    Acesso a **todo o catálogo** de vídeos educativos.
                </PlanFeature>
                <PlanFeature included={false}>Análise de Risco e Resumo por IA</PlanFeature>
                <PlanFeature included={false}>Protocolos de Performance</PlanFeature>
              </ul>
            </CardContent>
             <CardFooter>
                 <Badge variant="default">Foco em Engajamento e Retenção</Badge>
             </CardFooter>
          </Card>

          {/* Plano VIP */}
          <Card className="border-primary border-2 flex flex-col relative shadow-xl">
             <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Cuidado de Elite</Badge>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl text-primary">
                <Star className="text-amber-400 fill-amber-400" /> VIP
              </CardTitle>
              <CardDescription>Cuidado de elite com acesso direto à equipe e IA avançada.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
               <p className="text-3xl font-bold mb-6">R$ 397<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
               <p className="text-sm font-semibold mb-2">Tudo do Premium, mais:</p>
               <ul className="space-y-4 text-sm">
                 <PlanFeature>
                    <ShieldAlert className="h-4 w-4 inline-block mr-1 text-amber-500"/>
                    **Análise de Risco e Resumo por IA** para um cuidado proativo.
                </PlanFeature>
                 <PlanFeature>
                    <MessageCircle className="h-4 w-4 inline-block mr-1 text-amber-500"/>
                    **Prioridade Máxima** na fila de atendimento da equipe humana.
                </PlanFeature>
                 <PlanFeature>
                    <ClipboardCheck className="h-4 w-4 inline-block mr-1 text-amber-500"/>
                    Acesso a **Protocolos de Performance** exclusivos e mais intensivos.
                </PlanFeature>
                <PlanFeature>
                    <Users className="h-4 w-4 inline-block mr-1 text-amber-500"/>
                    **1 Check-in semanal direto** com um membro da equipe de saúde.
                </PlanFeature>
              </ul>
            </CardContent>
             <CardFooter>
                 <Badge variant="outline" className="border-amber-500 text-amber-500">Resultados Acelerados e Exclusividade</Badge>
            </CardFooter>
          </Card>

        </div>
      </div>
    </div>
  );
}

