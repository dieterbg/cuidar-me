

"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getSystemUsers, updateUserRole, deleteUser } from '@/ai/actions/system';
import type { UserProfile, UserRole } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, UserCog, Save, ShieldAlert, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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


const roleLabels: { [key in UserRole]: string } = {
    admin: 'Administrador',
    equipe_saude: 'Equipe de Saúde',
    assistente: 'Assistente',
    paciente: 'Paciente',
    pendente: 'Pendente'
};

const availableRoles: UserRole[] = ['equipe_saude', 'assistente', 'pendente'];


export default function AdminPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { user: currentUser, profile, loading: authLoading } = useAuth();

    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [reload, setReload] = useState(0);
    const [draftRoles, setDraftRoles] = useState<Partial<Record<string, UserRole>>>({});
    const [savingUserId, setSavingUserId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
    const currentUserId = currentUser?.id;
    const role = profile?.role;
    const isProcessing = savingUserId !== null || isDeleting;

    useEffect(() => {
        if (authLoading) return;
        if (role !== 'admin') {
            router.replace(role ? '/overview' : '/paciente');
            return;
        }

        let active = true;
        setLoading(true);
        setLoadFailed(false);

        getSystemUsers()
            .then((fetchedUsers) => {
                if (!active) return;
                setUsers(fetchedUsers.filter(user => user.id !== currentUserId));
                setDraftRoles({});
            })
            .catch(() => {
                if (active) setLoadFailed(true);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => { active = false; };
    }, [authLoading, currentUserId, reload, role, router]);

    const reloadUsers = () => {
        setLoading(true);
        setReload(previous => previous + 1);
    };

    const handleRoleChange = (user: UserProfile, newRole: UserRole) => {
        setDraftRoles(previous => ({
            ...previous,
            [user.id]: newRole === user.role ? undefined : newRole,
        }));
    };

    const handleSaveChanges = async (user: UserProfile) => {
        const newRole = draftRoles[user.id];
        if (isProcessing || !newRole) return;

        setSavingUserId(user.id);
        try {
            const result = await updateUserRole(user.id, newRole);
            if (!result.success) {
                toast({ variant: 'destructive', title: 'Erro ao atualizar', description: result.error });
                return;
            }

            setUsers(previous => previous.map(account =>
                account.id === user.id ? { ...account, role: result.role } : account,
            ));
            setDraftRoles(previous => ({ ...previous, [user.id]: undefined }));
            toast({
                title: 'Perfil atualizado',
                description: (user.displayName?.trim() || user.email || 'A conta') + ' está com o perfil ' + roleLabels[result.role] + '.',
            });
        } catch {
            toast({ variant: 'destructive', title: 'Não foi possível confirmar a alteração', description: 'Recarregue a página e confira o perfil.' });
        } finally {
            setSavingUserId(null);
        }
    };

    const handleDeleteUser = async () => {
        if (isProcessing || !userToDelete) return;

        setIsDeleting(true);
        try {
            const result = await deleteUser(userToDelete.id);
            if (result.success) {
                toast({ title: 'Usuário excluído' });
                reloadUsers();
            } else {
                toast({ variant: 'destructive', title: 'Erro ao excluir', description: result.error });
            }
        } catch {
            toast({ variant: 'destructive', title: 'Não foi possível confirmar a exclusão' });
        } finally {
            setIsDeleting(false);
            setUserToDelete(null);
        }
    };

    if (authLoading || loading) {
        return <AdminPageSkeleton />;
    }

    if (!profile || profile.role !== 'admin') {
        return null; // Redirect is handled in useEffect
    }

    return (
        <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-background">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <UserCog className="h-8 w-8 text-primary" />
                        Administração
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Gerencie os perfis de acesso e remova membros da sua equipe. Aprove novos cadastros alterando o perfil de "Pendente" para uma função ativa.
                    </p>
                </div>

                <Alert className="mb-6 bg-amber-50 border-amber-200 text-amber-900">
                    <ShieldAlert className="h-4 w-4 !text-amber-600" />
                    <AlertTitle>Atenção</AlertTitle>
                    <AlertDescription>
                        A exclusão de um usuário é permanente e removerá seu acesso. Você não pode alterar ou excluir seu próprio perfil de "Médico Dono".
                    </AlertDescription>
                </Alert>

                <AlertDialog>
                    <Card>
                        <CardHeader>
                            <CardTitle>Usuários do Sistema</CardTitle>
                            <CardDescription>
                                Altere o perfil ou remova um membro da equipe.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {loadFailed ? (
                                <Alert variant="destructive">
                                    <ShieldAlert className="h-4 w-4" />
                                    <AlertTitle>Não foi possível carregar as contas</AlertTitle>
                                    <AlertDescription>
                                        <Button variant="outline" size="sm" className="mt-2" onClick={reloadUsers}>
                                            Tentar novamente
                                        </Button>
                                    </AlertDescription>
                                </Alert>
                            ) : users.length === 0 ? (
                                <p className="text-muted-foreground text-center py-4">Nenhum outro usuário no sistema para gerenciar.</p>
                            ) : users.map(user => {
                                const draft = draftRoles[user.id];
                                const account = user.displayName?.trim() || user.email || 'Conta sem nome';

                                return (
                                    <div key={user.id} className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-lg border bg-muted/50 gap-4">
                                        <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
                                            <Avatar>
                                                <AvatarImage src={user.photoURL ?? undefined} />
                                                <AvatarFallback>{account.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 break-words">
                                                <p className="font-semibold">{account}</p>
                                                {user.email && user.email !== account && (
                                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                                )}
                                                {draft && (
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Perfil confirmado: {roleLabels[user.role]}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 w-full sm:w-auto sm:shrink-0">
                                            <Select
                                                value={draft ?? user.role}
                                                onValueChange={(newRole) => handleRoleChange(user, newRole as UserRole)}
                                                disabled={isProcessing}
                                            >
                                                <SelectTrigger className="w-full sm:w-[180px]" aria-label={'Perfil de ' + account}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableRoles.map((role) => (
                                                        <SelectItem key={role} value={role}>
                                                            {roleLabels[role]}
                                                        </SelectItem>
                                                    ))}
                                                    <SelectItem value="admin" disabled>{roleLabels.admin}</SelectItem>
                                                    <SelectItem value="paciente" disabled>{roleLabels.paciente}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                size="icon"
                                                className="shrink-0"
                                                onClick={() => handleSaveChanges(user)}
                                                disabled={isProcessing || !draft}
                                                aria-label={'Salvar perfil de ' + account}
                                            >
                                                {savingUserId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                            </Button>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    size="icon"
                                                    variant="destructive"
                                                    className="shrink-0"
                                                    disabled={isProcessing}
                                                    onClick={() => setUserToDelete(user)}
                                                    aria-label={'Excluir usuário ' + account}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Isso excluirá permanentemente o usuário <span className="font-bold">{userToDelete?.displayName?.trim() || userToDelete?.email}</span> e revogará seu acesso ao sistema.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setUserToDelete(null)} disabled={isProcessing}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteUser} disabled={isProcessing} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sim, Excluir'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}


function AdminPageSkeleton() {
    return (
        <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-background">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-5 w-80 mt-2" />
                </div>
                <Skeleton className="h-20 w-full mb-6" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-7 w-48" />
                        <Skeleton className="h-5 w-full max-w-sm mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
                                <div className="flex items-center gap-4">
                                    <Skeleton className="h-12 w-12 rounded-full" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-5 w-32" />
                                        <Skeleton className="h-4 w-48" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-10 w-44" />
                                    <Skeleton className="h-10 w-10" />
                                    <Skeleton className="h-10 w-10" />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
