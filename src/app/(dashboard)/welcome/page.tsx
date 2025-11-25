
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CuidarMeLogo } from '@/components/icons';
import {
  MessageSquareText,
  ClipboardList,
  Video,
  Users,
  Megaphone,
  UserCog,
  PlaySquare,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';


export default function WelcomePage() {
  const { profile } = useAuth();

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-background">
      <div className="max-w-4xl mx-auto">

        <div className="text-center mb-12">

          <h2 className="text-4xl font-bold tracking-tight text-foreground">
            Bem-vindo(a) à Cuidar.me, {profile?.display_name || ''}!
          </h2>
          <p className="text-xl text-muted-foreground mt-2 max-w-2xl mx-auto">
            Sua plataforma de endocrinologia para acompanhamento inteligente e perda de peso sustentável.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Funcionalidades da Plataforma</CardTitle>
            <CardDescription>
              Um guia rápido sobre as ferramentas que potencializam seu cuidado ao paciente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">

              <AccordionItem value="item-1">
                <AccordionTrigger className="text-lg font-semibold">
                  <div className="flex items-center gap-3">
                    <MessageSquareText className="h-6 w-6 text-primary" />
                    Gestão e Comunicação com Pacientes
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <p className="font-semibold">Painel de Pacientes:</p>
                  <p className="text-muted-foreground pl-4 border-l-2 border-primary">
                    Visão central de todos os pacientes com filtros por "Fila de Atenção" e "Pendentes". Indicadores visuais mostram o nível de risco e prioridade de cada um.
                  </p>
                  <p className="font-semibold">Perfil do Paciente:</p>
                  <p className="text-muted-foreground pl-4 border-l-2 border-primary">
                    Área detalhada com histórico de conversas, gráficos de métricas de saúde, gestão de protocolos e análise de IA. O chat é atualizado em tempo real e permite o envio de mensagens diretamente via WhatsApp.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger className="text-lg font-semibold">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="h-6 w-6 text-primary" />
                    Protocolos e Automação
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <p className="font-semibold">Gerador de Protocolos com IA:</p>
                  <p className="text-muted-foreground pl-4 border-l-2 border-primary">
                    Cria protocolos de acompanhamento completos a partir de uma simples descrição em texto. A IA gera o nome, metas e todas as mensagens diárias, que podem ser editadas.
                  </p>
                  <p className="font-semibold">Gestão de Protocolos:</p>
                  <p className="text-muted-foreground pl-4 border-l-2 border-primary">
                    Interface para criar, visualizar e editar as etapas de cada protocolo, definindo o dia e o conteúdo da mensagem a ser enviada.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="text-lg font-semibold">
                  <div className="flex items-center gap-3">
                    <Video className="h-6 w-6 text-primary" />
                    Conteúdo e Engajamento
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <p className="font-semibold">Biblioteca de Educação:</p>
                  <p className="text-muted-foreground pl-4 border-l-2 border-primary">
                    Catálogo de vídeos educativos do YouTube. Permite adicionar novos vídeos, categorizá-los e definir para quais planos de pacientes eles ficam disponíveis. É possível enviar um vídeo para um paciente específico com um clique.
                  </p>
                  <p className="font-semibold">Moderação da Comunidade:</p>
                  <p className="text-muted-foreground pl-4 border-l-2 border-primary">
                    Espaço para a equipe visualizar todas as postagens da comunidade de pacientes, fixar tópicos importantes e remover conteúdo inadequado.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger className="text-lg font-semibold">
                  <div className="flex items-center gap-3">
                    <UserCog className="h-6 w-6 text-primary" />
                    Administração e Estratégia
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <p className="font-semibold">Gestão de Planos:</p>
                  <p className="text-muted-foreground pl-4 border-l-2 border-primary">
                    Página que detalha os serviços e benefícios de cada plano (Freemium, Premium, VIP), servindo como guia para a equipe de vendas e gestão.
                  </p>
                  <p className="font-semibold">Gestão de Equipe:</p>
                  <p className="text-muted-foreground pl-4 border-l-2 border-primary">
                    Painel administrativo (acessível apenas pelo "Médico Dono") para gerenciar os perfis de acesso dos membros da equipe (Assistente, Equipe de Saúde) e aprovar novos cadastros.
                  </p>
                  <p className="font-semibold">Campanhas:</p>
                  <p className="text-muted-foreground pl-4 border-l-2 border-primary">
                    Ferramenta para enviar mensagens em massa via WhatsApp para segmentos de pacientes com base em seus planos.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
