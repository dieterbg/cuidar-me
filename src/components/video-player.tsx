
"use client";

import type { Video, SentVideo } from '@/lib/types';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { ArrowLeft, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateSentVideoFeedback } from '@/ai/actions/videos';
import { useAuth } from '@/hooks/use-auth';

// O vídeo pode ser um Video (do catálogo) ou um SentVideo (com feedback)
type VideoPlayerProps = {
  video: Video & Partial<SentVideo>;
  onBack: () => void;
  showFeedback?: boolean;
}

export function VideoPlayer({ video, onBack, showFeedback = true }: VideoPlayerProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFeedback = async (feedback: 'liked' | 'disliked') => {
    // A função de feedback só deve ser chamada se for um vídeo enviado (que tem um ID de `SentVideo`)
    if (!user?.id || !video.id) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível registrar o feedback. Usuário não autenticado ou vídeo inválido.",
      });
      return;
    }

    try {
      await updateSentVideoFeedback(user.id, video.id, feedback);
      toast({
        title: "Feedback Registrado!",
        description: `Obrigado! Você marcou o vídeo como "${feedback === 'liked' ? 'Gostei' : 'Não Gostei'}".`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao registrar feedback",
        description: error.message,
      });
    }
  }

  // Extrai o ID do vídeo de uma URL do YouTube
  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const videoId = getYouTubeId(video.videoUrl);

  const embedUrl = videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0` : '';

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-background">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para a lista
        </Button>
        <Card className="overflow-hidden">
          <CardHeader className="p-0">
            <div className="aspect-video bg-black">
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  title={video.title}
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                ></iframe>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <p className="text-muted-foreground">URL do vídeo inválida.</p>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <CardTitle className="text-2xl mb-2">{video.title}</CardTitle>
            <CardDescription>{video.description}</CardDescription>
          </CardContent>
          {showFeedback && video.sentAt && (
            <CardFooter className="bg-muted/50 p-4 flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-semibold text-sm mb-1">Este conteúdo foi útil?</h3>
                <p className="text-xs text-muted-foreground">Seu feedback nos ajuda a selecionar os melhores vídeos para você.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" onClick={() => handleFeedback('liked')}>
                  <ThumbsUp className="mr-2 h-4 w-4" />
                  Gostei
                </Button>
                <Button variant="outline" onClick={() => handleFeedback('disliked')}>
                  <ThumbsDown className="mr-2 h-4 w-4" />
                  Não Gostei
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}

