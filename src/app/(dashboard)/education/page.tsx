"use client";

import { useState, useEffect, useMemo, useTransition } from 'react';
import type { Patient, Video, PatientPlan } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addMessage } from '@/ai/actions/messages';
import { addSentVideo, getVideos, addVideo, deleteVideo } from '@/ai/actions/videos';
import { getPatients } from '@/ai/actions/patients';
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
import { Loader2, PlusCircle, PlayCircle, Trash2, Send, Filter, BookOpen } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { VideoPlayer } from '@/components/video-player';
import { cn } from '@/lib/utils';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from 'next/image';

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
    const [activeCategory, setActiveCategory] = useState('Todos');

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
            toast({ variant: 'destructive', title: 'Erro ao carregar dados', description: 'Não foi possível buscar pacientes e vídeos.' });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchData();
    }, []);

    const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

    // Gamification Pillars Logic
    const gamificationPillars = [
        { id: 'Todos', label: 'Todos', icon: BookOpen, color: 'bg-primary/10 text-primary' },
        { id: 'Alimentação', label: 'Alimentação', icon: Filter, color: 'bg-green-100 text-green-700' },
        { id: 'Movimento', label: 'Movimento', icon: Filter, color: 'bg-orange-100 text-orange-700' },
        { id: 'Bem-Estar', label: 'Bem-Estar', icon: Filter, color: 'bg-blue-100 text-blue-700' },
        { id: 'Hidratação', label: 'Hidratação', icon: Filter, color: 'bg-cyan-100 text-cyan-700' },
        { id: 'Disciplina', label: 'Disciplina', icon: Filter, color: 'bg-purple-100 text-purple-700' },
        { id: 'Geral', label: 'Geral', icon: Filter, color: 'bg-gray-100 text-gray-700' },
    ];

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
        let filtered = allVideos;
        if (activeCategory !== 'Todos') {
            filtered = filtered.filter(v => normalizeCategory(v.category || '') === activeCategory);
        }
        return filtered;
    }, [allVideos, activeCategory]);

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
            toast({ variant: 'destructive', title: 'URL Inválida', description: 'Por favor, insira uma URL válida do YouTube.' });
            return;
        }
        if (!newVideoTitle || !newVideoCategory || newVideoPlans.length === 0) {
            toast({ variant: 'destructive', title: 'Campos Obrigatórios', description: 'Título, categoria e ao menos um plano são necessários.' });
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
                toast({ title: 'Vídeo Adicionado!', description: 'O novo vídeo já está disponível no catálogo.' });
                setIsVideoDialogOpen(false);
                // Reset form
                setNewVideoUrl('');
                setNewVideoTitle('');
                setNewVideoCategory('');
                setNewVideoDescription('');
                setNewVideoPlans(['premium', 'vip']);
                fetchData(); // Refresh video list
            } else {
                toast({ variant: 'destructive', title: 'Erro ao Salvar', description: result.error });
            }
        });
    };

    const handleDeleteVideo = () => {
        if (!videoToDelete) return;

        startDeletingTransition(async () => {
            const result = await deleteVideo(videoToDelete.id);
            if (result.success) {
                toast({ title: "Vídeo excluído!", description: `"${videoToDelete.title}" foi removido do catálogo.` });
                fetchData();
            } else {
                toast({ variant: 'destructive', title: 'Erro ao excluir', description: result.error });
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
                <div className="max-w-7xl mx-auto space-y-8">

                    {/* Header Section */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                <BookOpen className="h-8 w-8 text-primary" />
                                Gestão de Educação
                            </h1>
                            <p className="text-muted-foreground mt-2 max-w-xl">
                                Gerencie o catálogo de vídeos e envie conteúdo educativo para seus pacientes.
                            </p>
                        </div>
                        <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="shadow-lg shadow-primary/20">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Adicionar Vídeo
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px]">
                                <form onSubmit={handleAddVideo}>
                                    <DialogHeader>
                                        <DialogTitle>Adicionar Novo Vídeo</DialogTitle>
                                        <DialogDescription>
                                            Cole a URL do YouTube e preencha os detalhes.
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
                                            <Label htmlFor="video-category">Categoria (Pilar)</Label>
                                            <Select value={newVideoCategory} onValueChange={setNewVideoCategory}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione um pilar" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {gamificationPillars.filter(p => p.id !== 'Todos').map(p => (
                                                        <SelectItem key={p.id} value={p.label}>{p.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="video-desc">Descrição</Label>
                                            <Textarea id="video-desc" placeholder="Breve descrição do conteúdo." value={newVideoDescription} onChange={(e) => setNewVideoDescription(e.target.value)} disabled={isSavingVideo} />
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
                                            {isSavingVideo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Salvar Vídeo
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Patient Selection & Filters */}
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-end justify-between bg-card/50 p-4 rounded-xl border border-border/50">
                        <div className="w-full md:w-1/3 space-y-2">
                            <Label htmlFor="patient-select">Enviar para Paciente</Label>
                            <Select onValueChange={setSelectedPatientId} value={selectedPatientId}>
                                <SelectTrigger id="patient-select" className="bg-background">
                                    <SelectValue placeholder="Selecione para habilitar envio..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {patients.map((patient) => (
                                        <SelectItem key={patient.id} value={patient.id}>
                                            {patient.name} ({patient.subscription?.plan})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide w-full md:w-auto">
                            {gamificationPillars.map(pillar => (
                                <button
                                    key={pillar.id}
                                    onClick={() => setActiveCategory(pillar.id)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border",
                                        activeCategory === pillar.id
                                            ? `${pillar.color} border-transparent shadow-sm ring-1 ring-primary/20`
                                            : 'bg-background hover:bg-muted border-border text-muted-foreground'
                                    )}
                                >
                                    {pillar.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Videos Grid */}
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredVideos.map((video) => {
                                const pillar = normalizeCategory(video.category || '');
                                const pillarColor = gamificationPillars.find(p => p.id === pillar)?.color || 'bg-secondary/10 text-secondary-foreground';
                                const isAvailableForPatient = selectedPatient?.subscription ? video.plans.includes(selectedPatient.subscription.plan) : false;

                                return (
                                    <Card
                                        key={video.id}
                                        className="bg-card/80 backdrop-blur-sm border-border/60 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden flex flex-col h-full"
                                    >
                                        <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => setVideoToPreview(video)}>
                                            {video.thumbnailUrl ? (
                                                <Image
                                                    src={video.thumbnailUrl}
                                                    alt={video.title}
                                                    fill
                                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/10" />
                                            )}
                                            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                                            <PlayCircle className="w-12 h-12 text-white/90 drop-shadow-lg group-hover:scale-110 transition-all relative z-10" />
                                        </div>

                                        <CardContent className="p-4 flex-1 flex flex-col">
                                            <div className="mb-2 flex justify-between items-start">
                                                <Badge variant="secondary" className={cn("text-[10px] px-2 py-0.5 font-normal border-0", pillarColor)}>
                                                    {pillar}
                                                </Badge>
                                                <div className="flex gap-1">
                                                    {(video.plans || []).map(plan => (
                                                        <Badge key={plan} variant="outline" className="text-[9px] uppercase px-1 py-0 h-4 border-muted-foreground/30 text-muted-foreground">
                                                            {plan}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>

                                            <h3 className="font-bold text-base leading-tight mb-2 line-clamp-1" title={video.title}>
                                                {video.title}
                                            </h3>
                                            <p className="text-sm text-muted-foreground line-clamp-2 flex-1 mb-4">
                                                {video.description}
                                            </p>

                                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2"
                                                    onClick={() => setVideoToDelete(video)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>

                                                <Button
                                                    size="sm"
                                                    className={cn("h-8 text-xs gap-1", !selectedPatient && "opacity-50")}
                                                    disabled={!selectedPatient || !isAvailableForPatient || isSending}
                                                    onClick={() => handleSendVideo(video.id)}
                                                >
                                                    {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                                    {selectedPatient ? (isAvailableForPatient ? 'Enviar' : 'Plano Incompatível') : 'Selecione Paciente'}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
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
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </div>
        </AlertDialog>
    );
}
