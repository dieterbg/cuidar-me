"use client";

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Heart, Share2, Search, Plus, Users, Loader2, Pin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { getCommunityTopics, createCommunityTopic, ensureCommunityUsername } from '@/ai/actions-extended';
import type { CommunityTopic } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function CommunityPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [topics, setTopics] = useState<CommunityTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Create Topic State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('Geral');
  const [isCreating, startCreateTransition] = useTransition();
  const [activeCategory, setActiveCategory] = useState('Todos');

  const gamificationPillars = [
    { id: 'Todos', label: 'Todos', color: 'bg-primary/10 text-primary' },
    { id: 'Alimentação', label: 'Alimentação', color: 'bg-green-100 text-green-700' },
    { id: 'Movimento', label: 'Movimento', color: 'bg-orange-100 text-orange-700' },
    { id: 'Bem-Estar', label: 'Bem-Estar', color: 'bg-blue-100 text-blue-700' },
    { id: 'Hidratação', label: 'Hidratação', color: 'bg-cyan-100 text-cyan-700' },
    { id: 'Disciplina', label: 'Disciplina', color: 'bg-purple-100 text-purple-700' },
    { id: 'Geral', label: 'Geral', color: 'bg-gray-100 text-gray-700' },
  ];

  const fetchTopics = async () => {
    setLoading(true);
    try {
      const fetchedTopics = await getCommunityTopics();
      setTopics(fetchedTopics);
    } catch (error) {
      console.error("Failed to fetch topics", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const handleCreateTopic = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Preencha o título e o conteúdo.' });
      return;
    }

    if (!profile) return;

    startCreateTransition(async () => {
      try {
        // 1. Ensure username
        const usernameResult = await ensureCommunityUsername(profile.id);
        if (!usernameResult.success || !usernameResult.username) {
          throw new Error("Falha ao gerar nome de usuário.");
        }

        // 2. Create topic
        // Prepend category to title as a simple way to store it without schema changes for now
        const finalTitle = `[${newCategory}] ${newTitle}`;

        const result = await createCommunityTopic(
          profile.id,
          usernameResult.username,
          finalTitle,
          newContent
        );

        if (result.success) {
          toast({ title: "Tópico criado!", description: "Sua mensagem foi postada na comunidade." });
          setIsCreateDialogOpen(false);
          setNewTitle('');
          setNewContent('');
          setNewCategory('Geral');
          fetchTopics(); // Refresh list
        } else {
          throw new Error(result.error);
        }
      } catch (error: any) {
        toast({ variant: 'destructive', title: "Erro ao criar tópico", description: error.message });
      }
    });
  };

  // Helper to extract category from title if it exists in [Category] format
  const getCategoryFromTopic = (title: string) => {
    const match = title.match(/^\[(.*?)\]/);
    return match ? match[1] : 'Geral';
  };

  const getCleanTitle = (title: string) => {
    return title.replace(/^\[.*?\]\s*/, '');
  };

  const filteredTopics = topics.filter(topic => {
    const matchesSearch = topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.text.toLowerCase().includes(searchQuery.toLowerCase());

    const category = getCategoryFromTopic(topic.title);
    const matchesCategory = activeCategory === 'Todos' || category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-background/50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Users className="h-8 w-8 text-primary" />
              Círculo de Apoio
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Compartilhe experiências em cada pilar da sua jornada.
            </p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                <Plus className="w-4 h-4 mr-2" />
                Novo Tópico
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Criar Novo Tópico</DialogTitle>
                <DialogDescription>
                  Escolha um tema e compartilhe com a comunidade.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <div className="flex flex-wrap gap-2">
                    {gamificationPillars.filter(p => p.id !== 'Todos').map(p => (
                      <Badge
                        key={p.id}
                        variant={newCategory === p.id ? 'default' : 'outline'}
                        className={`cursor-pointer ${newCategory === p.id ? '' : 'hover:bg-muted'}`}
                        onClick={() => setNewCategory(p.id)}
                      >
                        {p.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    placeholder="Resumo do assunto"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Conteúdo</Label>
                  <Textarea
                    id="content"
                    placeholder="Escreva sua mensagem aqui..."
                    className="min-h-[100px]"
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateTopic} disabled={isCreating}>
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Publicar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* FILTERS */}
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

        {/* SEARCH */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            className="pl-10 bg-card/50 backdrop-blur-sm border-border/60 rounded-xl h-12"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* TOPICS GRID */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTopics.length > 0 ? (
              filteredTopics.map((topic) => {
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
                        {getCleanTitle(topic.title)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 pb-3">
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {topic.text}
                      </p>
                    </CardContent>
                    <CardFooter className="pt-3 border-t border-border/40 flex justify-between text-muted-foreground">
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-xs hover:text-red-500 hover:bg-red-50">
                        <Heart className="w-3.5 h-3.5 mr-1.5" />
                        {topic.reactions?.length || 0}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-xs hover:text-blue-500 hover:bg-blue-50">
                        <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                        {topic.commentCount || 0}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                        <Share2 className="w-3.5 h-3.5" />
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })
            ) : (
              <div className="col-span-full text-center py-12 bg-muted/30 rounded-2xl border border-dashed">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground">Ainda não há tópicos em {activeCategory}</h3>
                <p className="text-muted-foreground mb-4">Seja o primeiro a compartilhar algo!</p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>Criar Primeiro Tópico</Button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
