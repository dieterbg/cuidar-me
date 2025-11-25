
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
import { Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updatePatient, deletePatient as deletePatientAction, unassignProtocolFromPatient } from '@/ai/actions';
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

        toast({
          title: isPatientContext ? "Perfil Atualizado!" : "Paciente Atualizado!",
          description: "Os dados foram salvos com sucesso.",
        });

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
                <Input placeholder="Nome completo" {...field} />
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
                    <Input placeholder="11999998888" {...field} value={field.value ?? ''} />
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
                      <SelectTrigger>
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
                      <SelectTrigger>
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
          </>
        )}


        <div className="flex flex-col sm:flex-row gap-2 pt-4">
          <Button type="submit" disabled={isSaving || isDeleting} className="w-full">
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

