
"use client";

import Image from 'next/image';
import type { Video } from '@/lib/types';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Send, EyeOff, PlayCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogTrigger } from './ui/alert-dialog';

interface VideoCardProps {
  video: Video;
  onSend: () => void;
  onPreview: () => void;
  onDelete: () => void;
  isSending: boolean;
  isAvailable: boolean;
  sendDisabled: boolean;
}

export function VideoCard({ video, onSend, onPreview, onDelete, isSending, isAvailable, sendDisabled }: VideoCardProps) {
  const effectiveSendDisabled = isSending || sendDisabled;

  return (
    <Card className={cn("flex flex-col h-full shadow-md transition-all duration-300", !isAvailable && "bg-muted/50")}>
      <CardHeader className="p-0">
        <div className="aspect-video relative group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className={cn("rounded-t-lg object-cover w-full h-full", !isAvailable && "grayscale opacity-60")}
            data-ai-hint="health education"
          />
          <div 
            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            onClick={onPreview}
          >
            <PlayCircle className="h-16 w-16 text-white" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 flex-grow">
        <CardTitle className="mb-2 leading-tight">{video.title}</CardTitle>
        <CardDescription>{video.description}</CardDescription>
      </CardContent>
      <CardFooter className="grid grid-cols-2 gap-2">
        <Button
          onClick={onSend}
          disabled={effectiveSendDisabled}
          className="w-full"
          variant={isAvailable ? "outline" : "secondary"}
        >
          {!sendDisabled && isAvailable ? <Send className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
          {isSending ? "Enviando..." : (isAvailable ? "Enviar" : "Indisponível")}
        </Button>
         <AlertDialogTrigger asChild>
            <Button
                variant="destructive"
                className="w-full"
                onClick={onDelete}
            >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
            </Button>
        </AlertDialogTrigger>
      </CardFooter>
    </Card>
  );
}
