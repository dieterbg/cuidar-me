

"use client";

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, Trash2, Sparkles, Target, CalendarDays, Bot, BotMessageSquare, ForkKnife, HeartPulse, Droplet, Zap, Brain } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Protocol, ProtocolStep, Perspective } from '@/lib/types';
import { generateProtocol, getProtocols, addProtocol, addProtocolStep, removeProtocolStep, deleteProtocol } from '@/ai/actions';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { mandatoryGamificationSteps } from '@/lib/data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type GeneratedProtocolData = {
    name: string;
    description: string;
    goals: string[];
    steps: ProtocolStep[];
}

const perspectiveConfig: Record<Perspective, { icon: React.ElementType, colorClasses: string }> = {
    alimentacao: { icon: ForkKnife, colorClasses: "bg-green-100 text-green-700 border-green-200" },
    movimento: { icon: HeartPulse, colorClasses: "bg-red-100 text-red-700 border-red-200" },
    hidratacao: { icon: Droplet, colorClasses: "bg-blue-100 text-blue-700 border-blue-200" },
    disciplina: { icon: Zap, colorClasses: "bg-purple-100 text-purple-700 border-purple-200" },
    bemEstar: { icon: Brain, colorClasses: "bg-orange-100 text-orange-700 border-orange-200" },
};


function ProtocolStepCard({ step, onRemove }: { step: ProtocolStep & {isGamification?: boolean, perspective?: Perspective}, onRemove?: () => void }) {
    const isGamification = step.isGamification ?? false;
    const config = isGamification && step.perspective ? perspectiveConfig[step.perspective] : null;
    const Icon = config ? config.icon : Bot;

    return (
        <div className={cn(
            "flex items-start p-3 rounded-md border group", 
            isGamification && config ? `${config.colorClasses} border-dashed` : "bg-muted/50"
        )}>
            <div className={cn(
                "flex items-center justify-center h-10 w-10 rounded-full mr-4 shrink-0", 
                isGamification && config ? config.colorClasses.replace('border-', 'bg-').replace('text-', 'text-') : "bg-primary/10 text-primary"
            )}>
                 <span className="font-bold text-sm">Dia {step.day}</span>
            </div>
            <div className="flex-grow">
                <p className="font-semibold text-sm flex items-center gap-2">
                    {isGamification && config ? <Icon className="h-4 w-4" /> : null}
                    {step.title}
                </p>
                <p className="text-sm text-muted-foreground">{step.message}</p>
            </div>
            {onRemove && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={onRemove}
                >
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <span className="sr-only">Excluir etapa</span>
                </Button>
            )}
        </div>
    );
}


export default function ProtocolsPage() {
    const { toast } = useToast();
    const [protocols, setProtocols] = useState<Protocol[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isGenerating, startGenerationTransition] = useTransition();

    // State for Dialogs
    const [openAddStepDialog, setOpenAddStepDialog] = useState(false);
    const [openNewProtocolDialog, setOpenNewProtocolDialog] = useState(false);
    const [openGenerateDialog, setOpenGenerateDialog] = useState(false);
    const [selectedProtocolId, setSelectedProtocolId] = useState<string | null>(null);

    // State for AI Generation
    const [generationPrompt, setGenerationPrompt] = useState('');
    const [generatedData, setGeneratedData] = useState<GeneratedProtocolData | null>(null);

    // State for Delete Confirmation Dialog
    const [showDeleteAlert, setShowDeleteAlert] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ type: 'protocol' | 'step'; protocolId: string; step?: ProtocolStep } | null>(null);


    const fetchProtocols = async () => {
        setLoading(true);
        try {
            const fetchedProtocols = await getProtocols();
            setProtocols(fetchedProtocols);
        } catch (error) {
             toast({ variant: 'destructive', title: 'Erro ao carregar protocolos' });
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchProtocols();
    }, [toast]);
    
    // Effect to pre-fill the new protocol form when AI generation is complete
    useEffect(() => {
        if (generatedData) {
            setOpenNewProtocolDialog(true);
        }
    }, [generatedData]);

    const handleOpenAddDialog = (protocolId: string) => {
        setSelectedProtocolId(protocolId);
        setOpenAddStepDialog(true);
    }

    const confirmDeletion = (type: 'protocol' | 'step', protocolId: string, step?: ProtocolStep) => {
        setItemToDelete({ type, protocolId, step: step ? { ...step } : undefined });
        setShowDeleteAlert(true);
    };


    const handleAddStep = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedProtocolId) return;

        setIsSaving(true);
        const formData = new FormData(e.currentTarget);
        const newStep: ProtocolStep = {
            day: parseInt(formData.get('day') as string, 10),
            title: formData.get('title') as string,
            message: formData.get('message') as string,
        };

        try {
            await addProtocolStep(selectedProtocolId, newStep);
            toast({
                title: "Etapa Salva!",
                description: "A nova etapa foi adicionada ao protocolo.",
            });
            fetchProtocols(); // Refetch
            setOpenAddStepDialog(false);
            e.currentTarget.reset();
        } catch (error) {
             toast({
                variant: 'destructive',
                title: "Erro ao salvar",
                description: "Não foi possível adicionar a nova etapa.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateProtocol = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSaving(true);
        
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const description = formData.get('description') as string;
        
        const messages: ProtocolStep[] = [];
        if (generatedData) {
             generatedData.steps.forEach((_, index) => {
                messages.push({
                    day: parseInt(formData.get(`step-day-${index}`) as string),
                    title: formData.get(`step-title-${index}`) as string,
                    message: formData.get(`step-message-${index}`) as string,
                });
            });
        }
        
        const duration = messages.length > 0 ? Math.max(...messages.map(m => m.day)) : 0;
        
        const newProtocolData = {
            name,
            description,
            messages,
            durationDays: duration,
            eligiblePlans: ['premium', 'vip'] as ('premium' | 'vip')[],
        }

        try {
            await addProtocol(newProtocolData);
            toast({
                title: "Protocolo Criado!",
                description: "O novo protocolo está pronto e já com as etapas.",
            });
            fetchProtocols(); // Refetch
            setOpenNewProtocolDialog(false);
            e.currentTarget.reset();
            setGeneratedData(null); // Clear generated data
        } catch (error) {
            toast({
                variant: 'destructive',
                title: "Erro ao criar protocolo",
                description: "Não foi possível criar o novo protocolo.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerateProtocol = async () => {
        if (!generationPrompt) {
            toast({variant: 'destructive', title: 'Por favor, descreva o protocolo.'});
            return;
        }
        startGenerationTransition(async () => {
            try {
                const result = await generateProtocol({prompt: generationPrompt});
                setGeneratedData({
                    name: result.name,
                    description: result.description,
                    goals: result.goals,
                    steps: result.steps.map(s => ({ day: s.day, message: s.description, title: s.title }))
                });
                setOpenGenerateDialog(false);
                setGenerationPrompt('');
                toast({
                    title: "Protocolo Gerado!",
                    description: "Revise os detalhes abaixo e salve o novo protocolo."
                });
            } catch (error) {
                toast({
                    variant: 'destructive',
                    title: "Erro ao Gerar com IA",
                    description: "Não foi possível gerar o protocolo. Tente novamente.",
                });
            }
        });
    }

    const handleDelete = async () => {
        if (!itemToDelete) return;

        setIsDeleting(true);
        const { type, protocolId, step } = itemToDelete;

        try {
            if (type === 'protocol') {
                await deleteProtocol(protocolId);
                toast({ title: "Protocolo Excluído", description: "O protocolo foi removido com sucesso." });
            } else if (type === 'step' && step) {
                await removeProtocolStep(protocolId, step);
                toast({ title: "Etapa Excluída", description: "A etapa foi removida do protocolo." });
            }
            fetchProtocols(); // Refetch
        } catch (error) {
            toast({
                variant: 'destructive',
                title: "Erro ao excluir",
                description: `Não foi possível realizar a exclusão. Tente novamente.`,
            });
        } finally {
            setIsDeleting(false);
            setShowDeleteAlert(false);
            setItemToDelete(null);
        }
    }


  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Protocolos de Emagrecimento
                </h1>
                <p className="text-muted-foreground mt-2">
                Crie, edite e gerencie as jornadas de acompanhamento para seus pacientes.
                </p>
            </div>
             <div className="flex gap-2">
                <Dialog open={openGenerateDialog} onOpenChange={setOpenGenerateDialog}>
                    <DialogTrigger asChild>
                         <Button variant="outline">
                            <Sparkles className="mr-2 h-4 w-4" />
                            Gerar com IA
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Gerar Protocolo de Emagrecimento</DialogTitle>
                            <DialogDescription>
                                Descreva o programa de emagrecimento que você deseja. A IA irá gerar o nome, descrição, metas e etapas para você.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Label htmlFor="generation-prompt" className="sr-only">Prompt</Label>
                            <Textarea
                                id="generation-prompt"
                                value={generationPrompt}
                                onChange={(e) => setGenerationPrompt(e.target.value)}
                                placeholder="Ex: Crie um protocolo de 30 dias para iniciantes, com foco em hidratação e caminhadas. A pesagem deve ser semanal."
                                className="min-h-[120px]"
                                disabled={isGenerating}
                            />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline" type="button">Cancelar</Button>
                            </DialogClose>
                            <Button onClick={handleGenerateProtocol} disabled={isGenerating}>
                                {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isGenerating ? 'Gerando...' : 'Gerar Protocolo'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                <Dialog open={openNewProtocolDialog} onOpenChange={(isOpen) => {
                    setOpenNewProtocolDialog(isOpen);
                    if (!isOpen) setGeneratedData(null); // Clear data when closing
                }}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Criar Novo Protocolo
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                        <form onSubmit={handleCreateProtocol}>
                            <DialogHeader>
                            <DialogTitle>{generatedData ? "Revisar Protocolo Gerado" : "Criar Novo Protocolo"}</DialogTitle>
                            <DialogDescription>
                                {generatedData ? "Ajuste os detalhes gerados pela IA e salve." : "Dê um nome e uma descrição para seu novo protocolo."}
                            </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nome do Protocolo</Label>
                                    <Input name="name" id="name" required placeholder="Ex: Protocolo Start: 30 dias para Mudar" defaultValue={generatedData?.name}/>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Descrição</Label>
                                    <Textarea name="description" id="description" required placeholder="Ex: Acompanhamento de 30 dias focado em criar hábitos básicos..." defaultValue={generatedData?.description} />
                                </div>
                                 {generatedData && generatedData.goals.length > 0 && (
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2"><Target className="h-4 w-4"/> Metas Geradas pela IA</Label>
                                        <div className="p-4 bg-muted border rounded-md space-y-2">
                                            {generatedData.goals.map((goal, index) => (
                                                <p key={index} className="text-sm text-muted-foreground list-item ml-4">{goal}</p>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {generatedData && generatedData.steps.length > 0 && (
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2"><CalendarDays className="h-4 w-4"/> Etapas Geradas pela IA</Label>
                                        <ScrollArea className="h-64 w-full rounded-md border p-4">
                                            <div className="space-y-4">
                                            {generatedData.steps.map((step, index) => (
                                                <div key={index} className="space-y-2">
                                                    <div className="flex gap-4">
                                                        <div className="flex-1">
                                                            <Label htmlFor={`step-day-${index}`}>Dia</Label>
                                                            <Input name={`step-day-${index}`} id={`step-day-${index}`} type="number" defaultValue={step.day} />
                                                        </div>
                                                         <div className="flex-[3]">
                                                            <Label htmlFor={`step-title-${index}`}>Título da Etapa</Label>
                                                            <Input name={`step-title-${index}`} id={`step-title-${index}`} defaultValue={step.title} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Label htmlFor={`step-message-${index}`}>Mensagem</Label>
                                                        <Textarea name={`step-message-${index}`} id={`step-message-${index}`} defaultValue={step.message} rows={3}/>
                                                    </div>
                                                </div>
                                            ))}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">Cancelar</Button>
                                </DialogClose>
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Salvar Protocolo
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>

        <Tabs defaultValue="clinic" className="w-full mt-6">
            <TabsList>
                <TabsTrigger value="clinic">Protocolos da Clínica</TabsTrigger>
                <TabsTrigger value="gamification">Mensagens Automáticas (Gamificação)</TabsTrigger>
            </TabsList>
            <TabsContent value="clinic">
                {loading && (
                    <div className="space-y-8 mt-8">
                        {[...Array(2)].map((_, i) => (
                            <Card key={i}>
                                <CardHeader>
                                    <Skeleton className="h-7 w-1/2" />
                                    <Skeleton className="h-4 w-3/4" />
                                </CardHeader>
                                <CardContent>
                                    <Skeleton className="h-4 w-1/4 mb-4" />
                                    <div className="space-y-4">
                                        <Skeleton className="h-16 w-full" />
                                        <Skeleton className="h-16 w-full" />
                                    </div>
                                </CardContent>
                                <CardFooter className="border-t pt-6">
                                    <Skeleton className="h-10 w-44" />
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
                <div className="space-y-8 mt-8">
                {!loading && protocols.map((protocol) => {
                    const combinedSteps = [
                        ...protocol.messages,
                        ...mandatoryGamificationSteps.map(step => ({...step, isGamification: true, perspective: step.perspective}))
                    ].sort((a,b) => a.day - b.day);

                    return (
                        <Card key={protocol.id}>
                            <CardHeader>
                                <CardTitle>{protocol.name}</CardTitle>
                                <CardDescription>{protocol.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Accordion type="single" collapsible>
                                    <AccordionItem value="steps">
                                        <AccordionTrigger>
                                             Visualizar {combinedSteps.length} Etapas do Protocolo
                                        </AccordionTrigger>
                                        <AccordionContent className="pt-4">
                                            <div className="text-sm text-muted-foreground mb-4">
                                                A visualização abaixo combina as mensagens personalizadas deste protocolo com as mensagens de gamificação (coloridas), que são injetadas automaticamente.
                                            </div>
                                            <div className="space-y-4">
                                                {combinedSteps.length > 0 ? (
                                                    combinedSteps.map((step, index) => (
                                                        <ProtocolStepCard 
                                                            key={index}
                                                            step={step}
                                                            onRemove={step.isGamification ? undefined : () => confirmDeletion('step', protocol.id, step)}
                                                        />
                                                    ))
                                                ) : (
                                                    <p className="text-sm text-muted-foreground text-center py-4">
                                                        Nenhuma etapa definida para este protocolo. Apenas as mensagens de gamificação serão injetadas.
                                                    </p>
                                                )}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </CardContent>
                            <CardFooter className="border-t pt-6 flex justify-between">
                                <Button variant="outline" onClick={() => handleOpenAddDialog(protocol.id)}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Adicionar Nova Etapa
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => confirmDeletion('protocol', protocol.id)}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir Protocolo
                                </Button>
                            </CardFooter>
                        </Card>
                    )
                })}
                </div>
            </TabsContent>
            <TabsContent value="gamification">
                 <Card className="mt-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <BotMessageSquare /> Mensagens Automáticas Obrigatórias
                        </CardTitle>
                        <CardDescription>
                            Estas mensagens são adicionadas a todos os protocolos no momento da atribuição para garantir o funcionamento da gamificação e a coleta de dados essenciais. Atualmente, elas são apenas para visualização.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         {mandatoryGamificationSteps.sort((a, b) => a.day - b.day).map((step, index) => (
                            <ProtocolStepCard key={index} step={{...step, isGamification: true}} />
                         ))}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
        


        {/* DIALOG: Adicionar Etapa */}
        <Dialog open={openAddStepDialog} onOpenChange={setOpenAddStepDialog}>
            <DialogContent className="sm:max-w-[425px]">
                 <form onSubmit={handleAddStep}>
                    <DialogHeader>
                    <DialogTitle>Adicionar Nova Etapa</DialogTitle>
                    <DialogDescription>
                        Configure a nova mensagem automática para este protocolo.
                    </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="day" className="text-right">
                            Dia
                            </Label>
                            <Input name="day" id="day" type="number" required className="col-span-3" />
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="title" className="text-right">
                            Título
                            </Label>
                            <Input name="title" id="title" placeholder="Ex: Dica de Hidratação" required className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="message" className="text-right">
                            Mensagem
                            </Label>
                            <Textarea name="message" id="message" placeholder="Ex: Olá, como estão seus níveis de glicose hoje?" required className="col-span-3" />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">Cancelar</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Etapa
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

        {/* ALERT DIALOG: Confirmar Exclusão */}
        <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Isso irá excluir permanentemente
                        {itemToDelete?.type === 'protocol' ? ' o protocolo e todas as suas etapas.' : ' esta etapa do protocolo.'}
                        {itemToDelete?.type === 'protocol' && ' Pacientes atualmente neste protocolo serão desvinculados dele.'}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                         {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sim, Excluir
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      </div>
    </div>
  );
}
