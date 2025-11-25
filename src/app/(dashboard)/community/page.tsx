"use client";

import { useState, useEffect, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThumbsUp, Trash2, MessageSquare, Pin, PinOff, Loader2, Users, Filter } from 'lucide-react';
import { getCommunityTopics, togglePinStatus, deleteTopic } from '@/ai/actions-extended';
import type { CommunityTopic } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function CommunityPage() {
  const [topics, setTopics] = useState<CommunityTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, startTransition] = useTransition();
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState('Todos');

  const [topicToDelete, setTopicToDelete] = useState<CommunityTopic | null>(null);

  const fetchTopics = async () => {
    setLoading(true);
    try {
      const fetchedTopics = await getCommunityTopics();
      setTopics(fetchedTopics);
    } catch (error: any) {
      console.error("Failed to fetch community topics", error);
      toast({ variant: 'destructive', title: 'Erro ao buscar tópicos', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user && profile) {
      fetchTopics();
    } else if (!authLoading && !user) {
      toast({ variant: 'destructive', title: 'Não autenticado', description: 'Você precisa estar logado para ver a comunidade.' });
      setLoading(false);
    }
  }, [user, profile, authLoading, toast]);

  const handleRemove = () => {
    if (!topicToDelete) return;

    startTransition(async () => {
      const result = await deleteTopic(topicToDelete.id);
      if (result.success) {
        toast({ title: "Tópico removido com sucesso" });
        fetchTopics(); // Refresh
      } else {
        toast({ variant: 'destructive', title: "Erro ao remover tópico", description: result.error });
      }
      setTopicToDelete(null);
    });
  };

  const handlePin = (topic: CommunityTopic) => {
    startTransition(async () => {
      const result = await togglePinStatus(topic.id, topic.isPinned);
      if (result.success) {
        toast({ title: `Tópico ${topic.isPinned ? 'desafixado' : 'fixado'} com sucesso` });
        fetchTopics(); // Refresh
      } else {
        toast({ variant: 'destructive', title: "Erro ao alterar status", description: result.error });
      }
    });
  };

  // Gamification Pillars
  const gamificationPillars = [
    { id: 'Todos', label: 'Todos', color: 'bg-primary/10 text-primary' },
    { id: 'Alimentação', label: 'Alimentação', color: 'bg-green-100 text-green-700' },
    { id: 'Movimento', label: 'Movimento', color: 'bg-orange-100 text-orange-700' },
    { id: 'Bem-Estar', label: 'Bem-Estar', color: 'bg-blue-100 text-blue-700' },
    { id: 'Hidratação', label: 'Hidratação', color: 'bg-cyan-100 text-cyan-700' },
    { id: 'Disciplina', label: 'Disciplina', color: 'bg-purple-100 text-purple-700' },
    { id: 'Geral', label: 'Geral', color: 'bg-gray-100 text-gray-700' },
  ];

  const getCategoryFromTopic = (title: string) => {
    const match = title.match(/^\[(.*?)\]/);
    return match ? match[1] : 'Geral';
  };

  const getCleanTitle = (title: string) => {
    return title.replace(/^\[.*?\]\s*/, '');
  };

  const filteredTopics = useMemo(() => {
    return topics.filter(topic => {
      const category = getCategoryFromTopic(topic.title);
      return activeCategory === 'Todos' || category === activeCategory;
    });
  }, [topics, activeCategory]);

  const PageSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="bg-card/80 backdrop-blur-sm border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-2 w-12" />
              </div>
            </div>
            <Skeleton className="h-5 w-3/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-background">
      <AlertDialog onOpenChange={(open) => !open && setTopicToDelete(null)}>
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Users className="h-8 w-8 text-primary" />
                Moderação da Comunidade
              </h1>
              <p className="text-muted-foreground mt-2 max-w-xl">
                Acompanhe e modere as interações dos pacientes em cada pilar.
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide">
            {gamificationPillars.map(pillar => (
              <button
                key={pillar.id}
                onClick={() => setActiveCategory(pillar.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap border",
                  activeCategory === pillar.id
                    ? `${pillar.color} border-transparent shadow-md ring-2 ring-offset-2 ring-primary/20`
                    : 'bg-card hover:bg-muted border-border text-muted-foreground'
                )}
              >
                {pillar.label}
              </button>
            ))}
          </div>

          {loading || authLoading ? <PageSkeleton /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTopics.length > 0 ? (
                filteredTopics.map(topic => {
                  const category = getCategoryFromTopic(topic.title);
                  const pillarColor = gamificationPillars.find(p => p.id === category)?.color || 'bg-secondary/10 text-secondary-foreground';

                  return (
                    <Card key={topic.id} className={`bg-card/80 backdrop-blur-sm border-border/60 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col ${topic.isPinned ? 'border-primary/50 bg-primary/5' : ''}`}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8 border border-border">
                              <AvatarImage src={`https://placehold.co/40x40/f9a8d4/333?text=${(topic.authorUsername || 'AN').slice(0, 2)}`} />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">{(topic.authorUsername || 'AN').slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-foreground">{topic.authorUsername || 'Anônimo'}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(new Date(topic.timestamp), { addSuffix: true, locale: ptBR })}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="secondary" className={cn("text-[10px] px-2 py-0.5 font-normal border-0", pillarColor)}>
                              {category}
                            </Badge>
                            {topic.isPinned && (
                              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-normal bg-primary/20 text-primary hover:bg-primary/30 gap-1">
                                <Pin className="h-3 w-3" /> Fixo
                              </Badge>
                            )}
                          </div>
                        </div>
                        <CardTitle className="text-base leading-tight group-hover:text-primary transition-colors">
                          <Link href={`/community/${topic.id}`} className="hover:underline">
                            {getCleanTitle(topic.title)}
                          </Link>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 pb-3">
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {topic.text}
                        </p>
                      </CardContent>
                      <CardFooter className="pt-3 border-t border-border/40 flex justify-between items-center bg-muted/30">
                        <div className="flex items-center gap-3 text-muted-foreground text-xs">
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" /> {topic.reactions?.length || 0}
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> {topic.commentCount || 0}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePin(topic)} disabled={isProcessing} title={topic.isPinned ? "Desafixar" : "Fixar"}>
                            {topic.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                          </Button>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setTopicToDelete(topic)} disabled={isProcessing} title="Remover">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                        </div>
                      </CardFooter>
                    </Card>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-12 bg-muted/30 rounded-2xl border border-dashed">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-foreground">Nenhum tópico em {activeCategory}</h3>
                  <p className="text-muted-foreground">Aguarde novas interações da comunidade.</p>
                </div>
              )}
            </div>
          )}
        </div>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o tópico <span className="font-bold">"{topicToDelete?.title}"</span> e todos os seus comentários.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} disabled={isProcessing} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sim, Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
