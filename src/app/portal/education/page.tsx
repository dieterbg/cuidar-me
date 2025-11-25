
"use client";

import { useState, useEffect } from 'react';
import { VideoPlayer } from '@/components/video-player';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { getPatientEducationVideos } from '@/ai/actions';
import type { Video } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function PortalEducationPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    const fetchInitialVideos = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const fetchedVideos = await getPatientEducationVideos(user.id);
        setVideos(fetchedVideos);
      } catch (e) {
        console.error("Erro ao carregar vídeos iniciais", e);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialVideos();
  }, [user, authLoading]);

  const handleSelectVideo = (video: Video) => {
    setSelectedVideo(video);
  };

  if (selectedVideo) {
    return (
      <VideoPlayer
        video={selectedVideo}
        onBack={() => setSelectedVideo(null)}
      />
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Educação em Vídeo</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i}>
              <Skeleton className="aspect-video w-full rounded-t-lg" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))
        ) : (
          videos.map((video) => (
            <Card
              key={video.id}
              className="cursor-pointer hover:border-primary/50 transition-all duration-200 shadow-md flex flex-col"
              onClick={() => handleSelectVideo(video)}
            >
              <CardContent className="p-0">
                <div className="aspect-video bg-gray-200 rounded-t-lg flex items-center justify-center">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover rounded-t-lg"
                    />
                  ) : (
                    <span className="text-2xl">🎬</span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2">{video.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-3">{video.description}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      {!loading && videos.length === 0 && (
        <div className="col-span-full text-center py-10">
          <p className="text-muted-foreground">Nenhum vídeo educativo disponível para seu plano no momento.</p>
        </div>
      )}
    </div>
  );
}

