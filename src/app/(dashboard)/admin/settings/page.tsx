
'use client';

import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { getTwilioCredentials, saveTwilioCredentials } from '@/ai/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Settings, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

const formSchema = z.object({
  accountSid: z.string().min(1, 'Account SID é obrigatório.'),
  authToken: z.string().min(1, 'Auth Token é obrigatório.'),
  phoneNumber: z.string().min(1, 'Número de telefone é obrigatório.'),
});

type TwilioFormValues = z.infer<typeof formSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const { profile, loading: authLoading } = useAuth();
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, startSavingTransition] = useTransition();
  const [showToken, setShowToken] = useState(false);

  const form = useForm<TwilioFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountSid: '',
      authToken: '',
      phoneNumber: '',
    },
  });

  useEffect(() => {
    async function fetchCredentials() {
      if (profile?.role === 'admin') {
        setIsLoadingData(true);
        try {
          const creds = await getTwilioCredentials();
          if (creds) {
            form.reset(creds);
          }
        } catch (error: any) {
          toast({
            variant: 'destructive',
            title: 'Erro ao carregar credenciais',
            description: error.message,
          });
        } finally {
          setIsLoadingData(false);
        }
      }
    }
    if (!authLoading) {
      fetchCredentials();
    }
  }, [profile, authLoading, toast, form]);

  const onSubmit = (values: TwilioFormValues) => {
    startSavingTransition(async () => {
      try {
        const result = await saveTwilioCredentials(values);
        if (result.success) {
          toast({ title: 'Credenciais Salvas!', description: 'As credenciais do Twilio foram atualizadas.' });
        } else {
          throw new Error(result.error);
        }
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Erro ao salvar',
          description: error.message,
        });
      }
    });
  };

  if (authLoading || isLoadingData) {
    return (
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-80 mb-8" />
          <Card>
            <CardHeader>
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-full max-w-sm mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-36" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="h-8 w-8 text-primary" />
            Configurações
          </h1>
          <p className="text-muted-foreground mt-2">Gerencie as integrações e chaves de API da sua plataforma.</p>
        </div>

        <Alert variant="destructive" className="mb-6">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Cuidado!</AlertTitle>
          <AlertDescription>
            As informações nesta página são extremamente sensíveis. Alterações incorretas podem interromper o funcionamento do WhatsApp. Não compartilhe essas chaves com ninguém.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Credenciais do Twilio</CardTitle>
                <CardDescription>
                  Insira as chaves da sua conta Twilio para habilitar o envio e recebimento de mensagens via WhatsApp.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="accountSid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account SID</FormLabel>
                      <FormControl>
                        <Input placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="authToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Auth Token</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type={showToken ? 'text' : 'password'} placeholder="Seu Auth Token secreto" {...field} />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={() => setShowToken(!showToken)}
                          >
                            {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número do Twilio (WhatsApp)</FormLabel>
                      <FormControl>
                        <Input placeholder="+14155238886" {...field} />
                      </FormControl>
                      <FormDescription>
                        Insira o número no formato internacional, incluindo o sinal de `+`.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isSaving ? 'Salvando...' : 'Salvar Credenciais'}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
