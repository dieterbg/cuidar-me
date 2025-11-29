"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, Clock, BookOpen, Filter, Loader2, Lock } from 'lucide-react';
import Image from 'next/image';
import { getVideos } from '@/ai/actions/videos';
import { useAuth } from '@/hooks/use-auth';
import type { Video } from '@/lib/types';
import { VideoPlayer } from '@/components/video-player';
import { cn } from '@/lib/utils';

export default function EducationPage() {
  const { profile } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  useEffect(() => {
    async function loadVideos() {
      try {
        const fetchedVideos = await getVideos();
        setVideos(fetchedVideos);
      } catch (error) {
        console.error("Failed to load videos", error);
      } finally {
        setLoading(false);
      }
    }
    loadVideos();
  }, []);

  // Mapeamento de categorias do banco para os pilares da gamificação
  const gamificationPillars = [
    { id: 'Todos', label: 'Todos', icon: BookOpen, color: 'bg-primary/10 text-primary' },
    { id: 'Alimentação', label: 'Alimentação', icon: Filter, color: 'bg-green-100 text-green-700' }, // Mapear Nutrição -> Alimentação
    { id: 'Movimento', label: 'Movimento', icon: Filter, color: 'bg-orange-100 text-orange-700' }, // Exercícios -> Movimento
    { id: 'Bem-Estar', label: 'Bem-Estar', icon: Filter, color: 'bg-blue-100 text-blue-700' }, // Meditação -> Bem-Estar
    { id: 'Hidratação', label: 'Hidratação', icon: Filter, color: 'bg-cyan-100 text-cyan-700' },
    { id: 'Disciplina', label: 'Disciplina', icon: Filter, color: 'bg-purple-100 text-purple-700' },
  ];

  // Função para normalizar categorias do banco para os pilares
  const normalizeCategory = (dbCategory: string) => {
    const cat = dbCategory.toLowerCase();
    if (cat.includes('nutri') || cat.includes('aliment') || cat.includes('diet')) return 'Alimentação';
    if (cat.includes('exerc') || cat.includes('moviment') || cat.includes('treino') || cat.includes('físico')) return 'Movimento';
    if (cat.includes('ment') || cat.includes('sono') || cat.includes('ansiedade') || cat.includes('bem')) return 'Bem-Estar';
    if (cat.includes('água') || cat.includes('hidrat')) return 'Hidratação';
    if (cat.includes('rotina') || cat.includes('hábito') || cat.includes('disciplina')) return 'Disciplina';
    return 'Geral';
  };

  const filteredVideos = useMemo(() => {
    let filtered = videos;
    if (activeCategory !== 'Todos') {
      filtered = filtered.filter(v => normalizeCategory(v.category || '') === activeCategory);
    }
    return filtered;
  }, [videos, activeCategory]);

  // Check if user has access to the video based on their plan
  const canAccessVideo = (video: Video) => {
    // TODO: Implement plan-based access control properly when profile type is fixed
    // if (!profile || !profile.plan) return false;
    // if (!video.plans || video.plans.length === 0) return true;
    // return video.plans.includes(profile.plan);
    return true;
  };

  if (selectedVideo) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 bg-background min-h-screen">
        <div className="max-w-5xl mx-auto">
          <VideoPlayer
            video={selectedVideo}
            onBack={() => setSelectedVideo(null)}
            showFeedback={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-background/50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-primary" />
              Educação & Gamificação
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Aprenda e evolua em cada um dos pilares da sua saúde.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* GAMIFICATION PILLARS FILTERS */}
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
                  {/* <pillar.icon className="w-4 h-4" /> Icon removido para limpar visual, cor já indica */}
                  {pillar.label}
                </button>
              ))}
            </div>

            {/* VIDEOS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVideos.map((video) => {
                const hasAccess = canAccessVideo(video);
                const pillar = normalizeCategory(video.category || '');
                const pillarColor = gamificationPillars.find(p => p.id === pillar)?.color || 'bg-secondary/10 text-secondary-foreground';

                return (
                  <Card
                    key={video.id}
                    onClick={() => hasAccess && setSelectedVideo(video)}
                    className={cn(
                      "bg-card/80 backdrop-blur-sm border-border/60 shadow-sm transition-all duration-300 group overflow-hidden flex flex-col h-full",
                      hasAccess ? "hover:shadow-lg cursor-pointer hover:border-primary/50" : "opacity-70 grayscale-[0.5]"
                    )}
                  >
                    <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
                      {video.thumbnailUrl ? (
                        <Image
                          src={video.thumbnailUrl}
                          alt={video.title}
                          fill
                          className={cn("object-cover transition-transform duration-500", hasAccess && "group-hover:scale-105")}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/10" />
                      )}

                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />

                      {hasAccess ? (
                        <PlayCircle className="w-12 h-12 text-white/90 drop-shadow-lg group-hover:scale-110 transition-all relative z-10" />
                      ) : (
                        <div className="bg-background/80 backdrop-blur p-2 rounded-full z-10">
                          <Lock className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4 flex-1 flex flex-col">
                      <div className="mb-2 flex justify-between items-start">
                        <Badge variant="secondary" className={cn("text-[10px] px-2 py-0.5 font-normal border-0", pillarColor)}>
                          {pillar}
                        </Badge>
                        {!hasAccess && (
                          <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-700 bg-amber-50">
                            Upgrade
                          </Badge>
                        )}
                      </div>
                      <h3 className={cn("font-bold text-lg leading-tight mb-2 transition-colors", hasAccess && "group-hover:text-primary")}>
                        {video.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
                        {video.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredVideos.length === 0 && (
              <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground">Nenhum conteúdo de {activeCategory}</h3>
                <p className="text-muted-foreground">Em breve teremos vídeos focados neste pilar da sua saúde.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
