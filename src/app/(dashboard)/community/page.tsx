
"use client";

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThumbsUp, Trash2, Check, MessageSquare, Pin, PinOff, Loader2 } from 'lucide-react';
import { getCommunityTopics, togglePinStatus, deleteTopic } from '@/ai/actions';
import type { CommunityTopic } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
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

export default function CommunityPage() {
  const [topics, setTopics] = useState<CommunityTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, startTransition] = useTransition();
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();

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

  const PageSkeleton = () => (
    <div className="mt-6 space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pb-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </CardContent>
          <CardFooter className="flex justify-between items-center bg-muted/50 py-2 px-6">
            <div className="flex items-center gap-4 text-muted-foreground text-sm">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-5 w-12" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-background">
      <AlertDialog onOpenChange={(open) => !open && setTopicToDelete(null)}>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Moderação da Comunidade</h1>
          <p className="text-muted-foreground mb-6">
            Modere as conversas, ofereça suporte e cultive um ambiente positivo para os pacientes.
          </p>

          <Separator />

          {loading || authLoading ? <PageSkeleton /> : (
            <div className="mt-6 space-y-4">
              {topics.length > 0 ? (
                topics.map(topic => (
                  <Card key={topic.id} className={topic.isPinned ? 'border-primary' : ''}>
                    <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={`https://placehold.co/40x40/f9a8d4/333?text=${(topic.authorUsername || 'AN').slice(0, 2)}`} />
                          <AvatarFallback>{(topic.authorUsername || 'AN').slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{topic.authorUsername || 'Anônimo'}</p>
                          <p className="text-sm text-muted-foreground">{new Date(topic.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                      {topic.isPinned && (
                        <Badge variant="secondary">
                          <Pin className="h-4 w-4 mr-2" />
                          Fixo
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent className="pb-4">
                      <Link href={`/community/${topic.id}`} className="hover:underline">
                        <h3 className="font-semibold text-lg mb-2">{topic.title}</h3>
                      </Link>
                      <p className="text-foreground">{topic.text}</p>
                    </CardContent>
                    <CardFooter className="flex justify-between items-center bg-muted/50 py-2 px-6">
                      <div className="flex items-center gap-4 text-muted-foreground text-sm">
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="h-4 w-4" /> {topic.reactions?.length || 0}
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" /> {topic.commentCount || 0} {topic.commentCount === 1 ? 'comentário' : 'comentários'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handlePin(topic)} disabled={isProcessing}>
                          {topic.isPinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
                          {topic.isPinned ? 'Desafixar' : 'Fixar'}
                        </Button>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" onClick={() => setTopicToDelete(topic)} disabled={isProcessing}>
                            <Trash2 className="mr-2 h-4 w-4" /> Remover
                          </Button>
                        </AlertDialogTrigger>
                      </div>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <p>Nenhuma postagem encontrada na comunidade.</p>
                  <p className="text-sm">Clique em "Popular Dados de Exemplo" na página de Pacientes para ver a comunidade em ação.</p>
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

