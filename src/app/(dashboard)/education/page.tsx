
"use client";

import { useState, useEffect, useMemo, useTransition } from 'react';
import type { Patient, Video, PatientPlan } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addMessage, addSentVideo, getPatients, getVideos, addVideo, deleteVideo } from '@/ai/actions';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogClose, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { VideoCard } from '@/components/video-card';
import { Loader2, PlusCircle, RefreshCw } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { VideoPlayer } from '@/components/video-player';
import { cn } from '@/lib/utils';


const planOptions: { id: PatientPlan, label: string }[] = [
    { id: 'freemium', label: 'Freemium' },
    { id: 'premium', label: 'Premium' },
    { id: 'vip', label: 'VIP' },
];

// Helper to extract YouTube video ID from URL
const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};


export default function EducationPage() {
  const [selectedPatientId, setSelectedPatientId] = useState<string | undefined>();
  const [isSending, startSendingTransition] = useTransition();
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  // State for the "Add Video" dialog
  const [isSavingVideo, startSavingVideoTransition] = useTransition();
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoCategory, setNewVideoCategory] = useState('');
  const [newVideoDescription, setNewVideoDescription] = useState('');
  const [newVideoPlans, setNewVideoPlans] = useState<PatientPlan[]>(['premium', 'vip']);

  // State for video preview
  const [videoToPreview, setVideoToPreview] = useState<Video | null>(null);
  
  // State for delete confirmation
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
  const [isDeleting, startDeletingTransition] = useTransition();


  const fetchData = async () => {
    setLoading(true);
    try {
        const [fetchedPatients, fetchedVideos] = await Promise.all([
            getPatients(),
            getVideos(),
        ]);
        const activePatients = fetchedPatients.filter(p => p.status === 'active');
        setPatients(activePatients);
        setAllVideos(fetchedVideos);
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Erro ao carregar dados', description: 'Não foi possível buscar pacientes e vídeos.'});
    } finally {
        setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

  const videosByCategory = useMemo(() => {
    return allVideos.reduce((acc, video) => {
        const category = video.category || 'Outros';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(video);
        return acc;
    }, {} as Record<string, typeof allVideos>);
  }, [allVideos]);

  const existingCategories = useMemo(() => {
    const categories = new Set(allVideos.map(v => v.category).filter(Boolean));
    return Array.from(categories);
  }, [allVideos]);


  const handleSendVideo = (videoId: string) => {
    if (!selectedPatient) return;
    
    const video = allVideos.find(v => v.id === videoId);
    if (!video) return;

    startSendingTransition(async () => {
       try {
        const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}/portal/education` : '/portal/education';
        const messageText = `Olá, ${selectedPatient.name}! Temos um novo vídeo educativo para você: "${video.title}".\n\nAssista agora em nosso portal: ${portalUrl}`;

        await addMessage(selectedPatient.id, {
            sender: 'me',
            text: messageText,
        });

        await addSentVideo(selectedPatient.id, video.id);

        toast({
          title: "Vídeo Enviado!",
          description: `O vídeo "${video.title}" foi enviado para ${selectedPatient.name}.`,
        });

      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erro ao enviar vídeo",
          description: "Não foi possível registrar o envio do vídeo.",
        });
      }
    });
  }

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    const videoId = getYouTubeId(newVideoUrl);
    
    if (!videoId) {
        toast({ variant: 'destructive', title: 'URL Inválida', description: 'Por favor, insira uma URL válida do YouTube.'});
        return;
    }
    if (!newVideoTitle || !newVideoCategory || newVideoPlans.length === 0) {
        toast({ variant: 'destructive', title: 'Campos Obrigatórios', description: 'Título, categoria e ao menos um plano são necessários.'});
        return;
    }
    
    const newVideoData: Omit<Video, 'id'> = {
        title: newVideoTitle,
        description: newVideoDescription,
        category: newVideoCategory,
        videoUrl: newVideoUrl,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        plans: newVideoPlans
    };

    startSavingVideoTransition(async () => {
        const result = await addVideo(newVideoData);
        if (result.success) {
            toast({ title: 'Vídeo Adicionado!', description: 'O novo vídeo já está disponível no catálogo.'});
            setIsVideoDialogOpen(false);
            // Reset form
            setNewVideoUrl('');
            setNewVideoTitle('');
            setNewVideoCategory('');
            setNewVideoDescription('');
            setNewVideoPlans(['premium', 'vip']);
            fetchData(); // Refresh video list
        } else {
            toast({ variant: 'destructive', title: 'Erro ao Salvar', description: result.error});
        }
    });
  };
  
  const handleDeleteVideo = () => {
    if (!videoToDelete) return;
    
    startDeletingTransition(async () => {
        const result = await deleteVideo(videoToDelete.id);
        if(result.success) {
            toast({ title: "Vídeo excluído!", description: `"${videoToDelete.title}" foi removido do catálogo.`});
            fetchData();
        } else {
             toast({ variant: 'destructive', title: 'Erro ao excluir', description: result.error});
        }
        setVideoToDelete(null); // Close dialog
    })
  }

  const handlePlanChange = (plan: PatientPlan) => {
    setNewVideoPlans(prev =>
        prev.includes(plan)
            ? prev.filter(p => p !== plan)
            : [...prev, plan]
    );
  };
  
  if (videoToPreview) {
    return (
        <VideoPlayer 
            video={videoToPreview}
            onBack={() => setVideoToPreview(null)}
            showFeedback={false}
        />
    )
  }


  return (
    <AlertDialog onOpenChange={(open) => !open && setVideoToDelete(null)}>
    <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-background">
       <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
                Educação em Vídeo
                </h1>
                <p className="text-muted-foreground">
                Navegue pelo catálogo, adicione novos vídeos e envie conteúdo relevante para seus pacientes.
                </p>
            </div>
            <div className="flex items-center gap-2">
                <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Adicionar Novo Vídeo
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <form onSubmit={handleAddVideo}>
                            <DialogHeader>
                                <DialogTitle>Adicionar Novo Vídeo Educativo</DialogTitle>
                                <DialogDescription>
                                    Cole a URL do vídeo do YouTube e preencha as informações para adicioná-lo ao catálogo.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 grid gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="video-url">URL do YouTube</Label>
                                    <Input id="video-url" placeholder="https://www.youtube.com/watch?v=..." value={newVideoUrl} onChange={(e) => setNewVideoUrl(e.target.value)} required disabled={isSavingVideo} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="video-title">Título</Label>
                                    <Input id="video-title" placeholder="Título do vídeo" value={newVideoTitle} onChange={(e) => setNewVideoTitle(e.target.value)} required disabled={isSavingVideo} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="video-category">Categoria</Label>
                                    <Input id="video-category" list="category-suggestions" placeholder="Ex: Nutrição, Hábitos, Exercícios" value={newVideoCategory} onChange={(e) => setNewVideoCategory(e.target.value)} required disabled={isSavingVideo} />
                                    <datalist id="category-suggestions">
                                        {existingCategories.map(cat => <option key={cat} value={cat} />)}
                                    </datalist>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="video-desc">Descrição</Label>
                                    <Textarea id="video-desc" placeholder="Breve descrição do conteúdo do vídeo." value={newVideoDescription} onChange={(e) => setNewVideoDescription(e.target.value)} disabled={isSavingVideo} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Disponível para os planos:</Label>
                                    <div className="flex items-center space-x-4 pt-2">
                                        {planOptions.map(plan => (
                                            <div key={plan.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`plan-${plan.id}`}
                                                    checked={newVideoPlans.includes(plan.id)}
                                                    onCheckedChange={() => handlePlanChange(plan.id)}
                                                    disabled={isSavingVideo}
                                                />
                                                <Label htmlFor={`plan-${plan.id}`} className="font-normal">
                                                    {plan.label}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">Cancelar</Button>
                                </DialogClose>
                                <Button type="submit" disabled={isSavingVideo}>
                                    {isSavingVideo && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Salvar Vídeo
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>


        <div className="max-w-xs mb-8">
            <Label htmlFor="patient-select" className="mb-2 block">Selecione um Paciente Ativo</Label>
            <Select onValueChange={setSelectedPatientId} value={selectedPatientId}>
                <SelectTrigger id="patient-select">
                    <SelectValue placeholder="Escolha um paciente..." />
                </SelectTrigger>
                <SelectContent>
                    {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                            {patient.name} ({patient.subscription?.plan})
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
             <p className="text-sm text-muted-foreground mt-2">A seleção de um paciente habilita o botão "Enviar" para os vídeos disponíveis no plano dele.</p>
        </div>

        <Accordion type="multiple" defaultValue={Object.keys(videosByCategory)} className="w-full">
          {Object.entries(videosByCategory).map(([category, videos]) => (
            <AccordionItem value={category} key={category}>
              <AccordionTrigger className="text-xl font-semibold">{category}</AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                    {videos.map((video) => {
                        const isAvailableForPatient = selectedPatient?.subscription ? video.plans.includes(selectedPatient.subscription.plan) : false;
                        return (
                             <VideoCard
                                key={video.id}
                                video={video}
                                onSend={() => handleSendVideo(video.id)}
                                onPreview={() => setVideoToPreview(video)}
                                onDelete={() => setVideoToDelete(video)}
                                isSending={isSending}
                                isAvailable={isAvailableForPatient}
                                sendDisabled={!selectedPatient || !isAvailableForPatient}
                            />
                        );
                    })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
      <AlertDialogContent>
        <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
                Esta ação não pode ser desfeita. O vídeo <span className="font-bold">"{videoToDelete?.title}"</span> será excluído permanentemente do catálogo.
            </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setVideoToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVideo} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Excluir
            </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </div>
    </AlertDialog>
  );
}
