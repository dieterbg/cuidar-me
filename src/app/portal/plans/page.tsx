
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Check, Star, Shield, Bot, MessageCircle, ClipboardCheck, AreaChart, Users, Video, ShieldAlert, BadgeInfo } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const PlanFeature = ({ children, included = true }: { children: React.ReactNode; included?: boolean }) => (
    <li className={`flex items-start gap-3 ${included ? '' : 'text-muted-foreground'}`}>
        <div className="w-5 h-5 flex-shrink-0 mt-1">
            {included ? <Check className="text-green-500" /> : <Check className="text-gray-400" />}
        </div>
        <span>{children}</span>
    </li>
);

export default function PatientPlansPage() {
  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
                Evolua na Sua Jornada
            </h1>
            <p className="text-xl text-muted-foreground mt-2 max-w-3xl mx-auto">
                Conheça os planos que oferecem um acompanhamento mais próximo e ferramentas para acelerar seus resultados.
            </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Shield /> Freemium
              </CardTitle>
              <CardDescription>Seu plano atual. O ponto de partida para sua jornada.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-3xl font-bold mb-6">Grátis</p>
              <ul className="space-y-4 text-sm">
                <PlanFeature>Acesso ao Portal do Paciente</PlanFeature>
                <PlanFeature>Acesso à Comunidade de Apoio</PlanFeature>
                <PlanFeature>Acesso a vídeos educativos selecionados</PlanFeature>
                <PlanFeature included={false}>Assistente de IA via WhatsApp</PlanFeature>
                <PlanFeature included={false}>Protocolos de acompanhamento</PlanFeature>
                <PlanFeature included={false}>Análise de Risco por IA</PlanFeature>
              </ul>
            </CardContent>
            <CardFooter>
                 <Badge variant="secondary">Seu Plano Atual</Badge>
            </CardFooter>
          </Card>

          <Card className="border-primary border-2 flex flex-col relative shadow-xl">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Mais Popular</Badge>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl text-primary">
                <Star /> Premium
              </CardTitle>
              <CardDescription>Acompanhamento inteligente para resultados consistentes.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
               <p className="text-3xl font-bold mb-6">R$ 197<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
               <p className="text-sm font-semibold mb-2">Tudo do Freemium, mais:</p>
               <ul className="space-y-4 text-sm">
                <PlanFeature>
                    <Bot className="h-4 w-4 inline-block mr-1 text-primary"/>
                    **Assistente de IA 24/7** via WhatsApp para dúvidas.
                </PlanFeature>
                 <PlanFeature>
                    <ClipboardCheck className="h-4 w-4 inline-block mr-1 text-primary"/>
                   **Protocolos de Acompanhamento** para te guiar.
                </PlanFeature>
                 <PlanFeature>
                    <AreaChart className="h-4 w-4 inline-block mr-1 text-primary"/>
                    **Gráficos e Análise** da sua evolução.
                </PlanFeature>
                 <PlanFeature>
                    <Video className="h-4 w-4 inline-block mr-1 text-primary"/>
                    Acesso a **todo o catálogo** de vídeos educativos.
                </PlanFeature>
              </ul>
            </CardContent>
             <CardFooter className="flex-col items-start gap-2">
                <Button className="w-full" disabled>Upgrade via WhatsApp</Button>
                <p className="text-xs text-muted-foreground text-center w-full">Para fazer o upgrade, fale com nossa equipe.</p>
             </CardFooter>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
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
                    **Análise de Risco e Resumo por IA** para um cuidado proativo da equipe.
                </PlanFeature>
                 <PlanFeature>
                    <MessageCircle className="h-4 w-4 inline-block mr-1 text-amber-500"/>
                    **Prioridade Máxima** na fila de atendimento da equipe humana.
                </PlanFeature>
                 <PlanFeature>
                    <Users className="h-4 w-4 inline-block mr-1 text-amber-500"/>
                    **Check-ins semanais diretos** com um membro da equipe de saúde.
                </PlanFeature>
              </ul>
            </CardContent>
             <CardFooter className="flex-col items-start gap-2">
                 <Button className="w-full" disabled>Upgrade via WhatsApp</Button>
                 <p className="text-xs text-muted-foreground text-center w-full">Para fazer o upgrade, fale com nossa equipe.</p>
            </CardFooter>
          </Card>

        </div>

         <Card className="mt-12 bg-muted/50">
            <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                    <BadgeInfo className="h-6 w-6 text-primary" />
                    Como fazer o upgrade?
                </CardTitle>
                <CardDescription>
                    Nosso processo de upgrade é pessoal e consultivo.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-center text-muted-foreground">
                    Para mudar seu plano para Premium ou VIP, basta enviar uma mensagem para nossa equipe no WhatsApp informando seu interesse. Cuidaremos de tudo para você!
                </p>
            </CardContent>
        </Card>

      </div>
    </div>
  );
}

