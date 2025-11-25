

"use client";

import { useState, useEffect, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { getTopicDetails, addCommentToTopic } from '@/ai/actions-extended';
import type { CommunityTopic, CommunityComment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, MessageSquare, ThumbsUp, Pin, Send, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function TopicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const topicId = params.id as string;

  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [topic, setTopic] = useState<CommunityTopic | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);

  const [newComment, setNewComment] = useState("");
  const [isPosting, startPosting] = useTransition();

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const details = await getTopicDetails(topicId);
      if (details) {
        setTopic(details.topic);
        setComments(details.comments);
      } else {
        toast({ variant: 'destructive', title: 'Tópico não encontrado' });
        router.push('/portal/community');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao carregar tópico', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (topicId) {
      fetchDetails();
    }
  }, [topicId]);

  const handlePostComment = async () => {
    if (!newComment.trim() || !user) {
      toast({ variant: 'destructive', title: 'Comentário não pode estar vazio.' });
      return;
    }
    startPosting(async () => {
      // Get username from user metadata or email
      const username = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Usuário';

      const result = await addCommentToTopic(
        topicId,
        user.id,
        username,
        newComment
      );

      if (result.success) {
        setNewComment('');
        toast({ title: 'Comentário publicado!' });
        await fetchDetails(); // Refresh comments
      } else {
        toast({ variant: 'destructive', title: 'Erro ao comentar', description: result.error });
      }
    });
  }

  const PageSkeleton = () => (
    <div className="max-w-4xl mx-auto">
      <Skeleton className="h-8 w-40 mb-8" />
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-3/4 mb-2" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
      </Card>
      <Separator className="my-6" />
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );

  if (loading || authLoading) return <PageSkeleton />;
  if (!topic) return null;

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-background">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => router.push('/portal/community')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para a Comunidade
        </Button>

        {/* Topic Card */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={`https://placehold.co/40x40/f9a8d4/333?text=${topic.authorUsername.slice(0, 2)}`} />
                <AvatarFallback>{topic.authorUsername.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{topic.authorUsername}</p>
                <p className="text-sm text-muted-foreground">Postado {formatDistanceToNow(new Date(topic.timestamp), { addSuffix: true, locale: ptBR })}</p>
              </div>
            </div>
            {topic.isPinned && (
              <Badge variant="secondary">
                <Pin className="h-4 w-4 mr-2" />
                Fixo
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <h1 className="text-2xl font-bold mb-4">{topic.title}</h1>
            <p className="text-foreground whitespace-pre-wrap">{topic.text}</p>
          </CardContent>
          <CardFooter className="flex justify-start items-center bg-muted/50 py-2 px-6 gap-4 text-muted-foreground text-sm">
            <div className="flex items-center gap-1">
              <ThumbsUp className="h-4 w-4" /> {topic.reactions?.length || 0} curtidas
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" /> {comments.length || 0} {comments.length === 1 ? 'comentário' : 'comentários'}
            </div>
          </CardFooter>
        </Card>

        <Separator className="my-6" />

        {/* Add Comment Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Deixe seu comentário</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid w-full gap-2">
              <Textarea
                placeholder="Escreva sua mensagem de apoio ou dúvida aqui..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={isPosting}
              />
              <Button onClick={handlePostComment} disabled={isPosting || !newComment.trim()}>
                {isPosting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {isPosting ? 'Enviando...' : 'Enviar Comentário'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Comments List */}
        <div className="space-y-4">
          {comments.map(comment => (
            <Card key={comment.id} className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://placehold.co/40x40/c4b5fd/333?text=${comment.authorUsername.slice(0, 2)}`} />
                    <AvatarFallback>{comment.authorUsername.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{comment.authorUsername}</p>
                    <p className="text-xs text-muted-foreground">Comentou {formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true, locale: ptBR })}</p>
                  </div>
                </div>
                <p className="text-sm">{comment.text}</p>
              </CardContent>
            </Card>
          ))}
          {comments.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <p>Nenhum comentário ainda. Seja o primeiro a responder!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
