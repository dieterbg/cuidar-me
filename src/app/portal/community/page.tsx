
"use client";

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCommunityTopics, ensureCommunityUsername, createCommunityTopic } from '@/ai/actions';
import type { CommunityTopic } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, ThumbsUp, PlusCircle, Pin, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';


export default function PortalCommunityPage() {
  const [topics, setTopics] = useState<CommunityTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [isPosting, startPosting] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicText, setNewTopicText] = useState('');

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
    const setupCommunityAccess = async () => {
      if (authLoading || !user) return;

      try {
        // 1. Garantir que o paciente tenha um nome de usuário anônimo
        const result = await ensureCommunityUsername(user.id);
        if (result.success && result.username) {
          setUsername(result.username);
        }

        // 2. Buscar os tópicos da comunidade
        await fetchTopics();

      } catch (error: any) {
        console.error("Failed to setup community access", error);
        toast({ variant: 'destructive', title: 'Erro ao acessar a comunidade', description: error.message });
      }
    };
    setupCommunityAccess();
  }, [user, authLoading, toast]);


  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicTitle.trim() || !newTopicText.trim() || !user) {
      toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Título e texto são necessários.' });
      return;
    }

    startPosting(async () => {
      if (!username) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Nome de usuário não disponível.' });
        return;
      }

      const result = await createCommunityTopic(
        user.id,
        username,
        newTopicTitle,
        newTopicText
      );

      if (result.success) {
        toast({ title: 'Tópico Publicado!', description: 'Sua postagem está visível para a comunidade.' });
        setIsDialogOpen(false);
        setNewTopicTitle('');
        setNewTopicText('');
        await fetchTopics(); // Refresh the list
      } else {
        toast({ variant: 'destructive', title: 'Erro ao publicar', description: result.error });
      }
    });
  }


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
          </CardContent>
          <CardFooter className="flex justify-between items-center bg-muted/50 py-2 px-6">
            <div className="flex items-center gap-4 text-muted-foreground text-sm">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-5 w-12" />
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );


  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Círculo de Apoio</h1>
            <p className="text-muted-foreground mt-1">
              Um espaço para conectar, compartilhar e apoiar.
            </p>
            {username && <p className="text-sm text-muted-foreground mt-2">Você está participando como: <span className="font-semibold">{username}</span></p>}
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mt-4 sm:mt-0">
                <PlusCircle className="mr-2 h-4 w-4" />
                Criar Novo Tópico
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateTopic}>
                <DialogHeader>
                  <DialogTitle>Criar Novo Tópico</DialogTitle>
                  <DialogDescription>
                    Compartilhe uma dúvida, uma vitória ou um pensamento com a comunidade. Sua identidade real não será exibida.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div>
                    <Label htmlFor="topic-title" className="sr-only">Título</Label>
                    <Input
                      id="topic-title"
                      placeholder="Qual o título da sua postagem?"
                      value={newTopicTitle}
                      onChange={(e) => setNewTopicTitle(e.target.value)}
                      disabled={isPosting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="topic-text" className="sr-only">Texto</Label>
                    <Textarea
                      id="topic-text"
                      placeholder="Escreva sua mensagem aqui..."
                      className="min-h-[150px]"
                      value={newTopicText}
                      onChange={(e) => setNewTopicText(e.target.value)}
                      disabled={isPosting}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" type="button">Cancelar</Button>
                  </DialogClose>
                  <Button type="submit" disabled={isPosting}>
                    {isPosting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isPosting ? 'Publicando...' : 'Publicar'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Separator />

        {loading || authLoading ? <PageSkeleton /> : (
          <div className="mt-6 space-y-4">
            {topics.length > 0 ? (
              topics.map(topic => (
                <Link key={topic.id} href={`/portal/community/${topic.id}`} className="block group">
                  <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                    <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={`https://placehold.co/40x40/f9a8d4/333?text=${topic.authorUsername.slice(0, 2)}`} />
                          <AvatarFallback>{topic.authorUsername.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{topic.authorUsername}</p>
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
                      <h3 className="font-semibold text-lg">{topic.title}</h3>
                    </CardContent>
                    <CardFooter className="flex justify-start items-center bg-muted/50 py-2 px-6 gap-4 text-muted-foreground text-sm">
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="h-4 w-4" /> {topic.reactions?.length || 0}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" /> {topic.commentCount || 0} {topic.commentCount === 1 ? 'comentário' : 'comentários'}
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              ))
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <p>Nenhuma postagem encontrada na comunidade.</p>
                <p className="text-sm">Seja o primeiro a criar um tópico!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

