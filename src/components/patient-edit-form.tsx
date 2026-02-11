
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import type { Patient } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Trash2, Upload, MessageSquare } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { updatePatient, deletePatient as deletePatientAction } from '@/ai/actions/patients';
import { unassignProtocolFromPatient } from '@/ai/actions/protocols';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format, parseISO } from 'date-fns';
import { Textarea } from './ui/textarea';

const formSchema = z.object({
  name: z.string().min(3, { message: "O nome deve ter pelo menos 3 caracteres." }),
  whatsappNumber: z.string().min(10, { message: "O número de WhatsApp é obrigatório e deve ter pelo menos 10 dígitos." }).optional().nullable(),
  plan: z.enum(['freemium', 'premium', 'vip']),
  status: z.enum(['active', 'pending']),
  height: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? null : Number(val)),
    z.number().positive('Altura deve ser um número positivo.').optional().nullable()
  ),
  initialWeight: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? null : Number(val)),
    z.number().positive('Peso deve ser um número positivo.').optional().nullable()
  ),
  birthDate: z.string().optional().nullable(),
  gender: z.enum(['masculino', 'feminino', 'outro', '']).optional().nullable(),
  healthConditions: z.string().optional().nullable(),
  allergies: z.string().optional().nullable(),
  goal: z.enum(['lose_weight', 'gain_muscle', 'maintain', '']).optional().nullable(),
  targetWeight: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? null : Number(val)),
    z.number().positive().optional().nullable()
  ),
  waist: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? null : Number(val)),
    z.number().positive().optional().nullable()
  ),
  medications: z.string().optional().nullable(),
  whatsappConsent: z.boolean().optional().nullable(),
});


interface PatientEditFormProps {
  patient: Patient;
  onSave: () => void;
  context: 'admin' | 'patient';
}

export function PatientEditForm({ patient, onSave, context }: PatientEditFormProps) {
  const [isSaving, startSavingTransition] = useTransition();
  const [isDeleting, startDeletingTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const isPatientContext = context === 'patient';
  const isAdminContext = context === 'admin';


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: patient.name,
      whatsappNumber: patient.whatsappNumber ? patient.whatsappNumber.replace(/whatsapp:\+55/g, '') : '',
      plan: patient.subscription.plan,
      status: patient.status || 'pending',
      height: patient.height || undefined,
      initialWeight: patient.initialWeight || undefined,
      birthDate: patient.birthDate ? format(parseISO(patient.birthDate as string), 'yyyy-MM-dd') : undefined,
      gender: patient.gender || undefined,
      healthConditions: patient.healthConditions || undefined,
      allergies: patient.allergies || undefined,
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    startSavingTransition(async () => {
      try {

        // Explicitly unassign protocol if plan is downgraded to freemium
        if (values.plan === 'freemium' && patient.protocol) {
          await unassignProtocolFromPatient(patient.id);
        }

        const updateResult = await updatePatient(patient.id, values as Partial<Patient>);
        if (!updateResult.success) {
          throw new Error(updateResult.error || 'Erro desconhecido ao atualizar paciente.');
        }

        // If patient context and profile is now complete AND consent given, initiate WhatsApp onboarding
        if (isPatientContext) {
          const isComplete = !!(
            values.height &&
            values.initialWeight &&
            values.birthDate &&
            values.gender &&
            values.goal
          );

          if (isComplete && values.whatsappConsent) {
            // Call API to initiate onboarding (fire and forget - don't block UI)
            fetch('/api/onboarding/initiate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ patientId: patient.id }),
            }).catch(err => console.error('Failed to initiate onboarding:', err));
          }
        }

        // Parent component will handle success notification and redirect
        onSave();
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Erro ao salvar',
          description: error.message || 'Não foi possível atualizar os dados do paciente.',
        });
      }
    });
  };

  const handleDelete = () => {
    startDeletingTransition(async () => {
      try {
        const result = await deletePatientAction(patient.id);
        if (result.success) {
          toast({
            title: "Paciente Excluído!",
            description: "O paciente e todos os seus dados foram removidos.",
          });
          router.push('/patients');
        } else {
          throw new Error(result.error || 'Unknown error');
        }
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Erro ao excluir',
          description: `Não foi possível excluir o paciente. (${error})`,
        });
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto pr-2">

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo</FormLabel>
              <FormControl>
                <Input placeholder="Nome completo" {...field} className="rounded-xl border-input/60 focus:border-[#899d5e] focus:ring-[#899d5e]/20" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isAdminContext && (
          <>
            <FormField
              control={form.control}
              name="whatsappNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp (DDD + Número)</FormLabel>
                  <FormControl>
                    <Input placeholder="11999998888" {...field} value={field.value ?? ''} className="rounded-xl border-input/60 focus:border-[#899d5e] focus:ring-[#899d5e]/20" />
                  </FormControl>
                  <FormDescription>
                    O sistema adicionará o código do Brasil (+55) automaticamente.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plano</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-xl border-input/60 focus:ring-[#899d5e]/20">
                        <SelectValue placeholder="Selecione um plano" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="freemium">Freemium</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status do Cadastro</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-xl border-input/60 focus:ring-[#899d5e]/20">
                        <SelectValue placeholder="Selecione um status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Mudar para "Ativo" finaliza o cadastro e pode enviar uma mensagem de boas-vindas.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {isPatientContext && (
          <>
            <FormField
              control={form.control}
              name="birthDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Nascimento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gênero</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um gênero" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="feminino">Feminino</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Altura (em cm)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Ex: 175"
                        {...field}
                        value={field.value ?? ''}
                        onChange={e => field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="initialWeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peso Inicial (kg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Ex: 95.5"
                        step="0.1"
                        {...field}
                        value={field.value ?? ''}
                        onChange={e => field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="healthConditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condições de Saúde</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Hipertensão, Diabetes tipo 2"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="allergies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alergias</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Penicilina, Amendoim"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="goal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objetivo Principal <span className="text-red-600">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="lose_weight">Perder Peso</SelectItem>
                        <SelectItem value="gain_muscle">Ganhar Massa</SelectItem>
                        <SelectItem value="maintain">Manter Peso</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetWeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta de Peso (kg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Ex: 70.0"
                        step="0.1"
                        {...field}
                        value={field.value ?? ''}
                        onChange={e => field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="waist"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cintura (cm)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Ex: 80"
                        {...field}
                        value={field.value ?? ''}
                        onChange={e => field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="medications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medicamentos em uso</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Losartana 50mg, Metformina 850mg"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Exam Upload Section */}
            <div className="space-y-4 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Exames Recentes</h3>
                  <p className="text-sm text-muted-foreground">
                    Envie fotos ou PDFs dos seus exames mais recentes (Opcional)
                  </p>
                </div>
              </div>

              <div className="grid w-full max-w-sm items-center gap-1.5">
                <FormLabel htmlFor="exam-upload">Upload de Arquivo</FormLabel>
                <div className="flex items-center gap-2">
                  <Input id="exam-upload" type="file" accept=".pdf,.jpg,.jpeg,.png" className="cursor-pointer" />
                  <Button type="button" variant="outline" size="icon">
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Formatos aceitos: PDF, JPG, PNG. Máx: 10MB.
                </p>
              </div>
            </div>

            {/* WhatsApp Consent */}
            <div className="space-y-4 pt-4 border-t border-border/50">
              <div className="rounded-2xl bg-[#899d5e]/5 border border-[#899d5e]/15 p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#899d5e]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare className="h-5 w-5 text-[#899d5e]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#2D3B2D]">Comunicação via WhatsApp</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Ao ativar, você receberá mensagens de acompanhamento do seu protocolo de saúde,
                      lembretes e dicas personalizadas via WhatsApp. Você pode cancelar a qualquer momento
                      enviando &quot;SAIR&quot; no WhatsApp.
                    </p>
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="whatsappConsent"
                  render={({ field }) => (
                    <FormItem className="flex items-start gap-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                          className="mt-0.5 data-[state=checked]:bg-[#899d5e] data-[state=checked]:border-[#899d5e]"
                        />
                      </FormControl>
                      <div className="leading-none">
                        <FormLabel className="text-sm font-medium cursor-pointer">
                          Aceito receber mensagens via WhatsApp
                        </FormLabel>
                        <FormDescription className="text-xs mt-1">
                          Li e concordo com a{' '}
                          <a
                            href="/privacidade"
                            target="_blank"
                            className="text-[#899d5e] underline hover:text-[#7a8c53]"
                          >
                            Política de Privacidade
                          </a>.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </>
        )}


        <div className="flex flex-col sm:flex-row gap-2 pt-4">
          <Button type="submit" disabled={isSaving || isDeleting} className="w-full bg-[#899d5e] hover:bg-[#7a8c53] shadow-lg shadow-[#899d5e]/20 rounded-xl">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
          {isAdminContext && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" disabled={isSaving || isDeleting} className="w-full">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir Paciente
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá permanentemente o paciente e todos os seus dados associados, incluindo conversas e métricas de saúde.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-white">
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sim, excluir paciente
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </form>
    </Form>
  );
}

