

"use client";

import { useState, useEffect, useTransition, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
    const [isProcessing, startTransition] = useTransition();
    const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setUsers([]); // Clear users before fetching
        try {
            const fetchedUsers = await getSystemUsers();
            // Filter out the current user if they are the owner, so they can't edit themselves
            if (profile?.role === 'admin') {
                setUsers(fetchedUsers.filter(u => u.id !== currentUser?.id));
            } else {
                setUsers(fetchedUsers);
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
            toast({ variant: 'destructive', title: 'Erro ao carregar usuários' });
        } finally {
            setLoading(false);
        }
    }, [toast, currentUser?.id, profile?.role]);


    useEffect(() => {
        if (!authLoading && profile?.role !== 'admin') {
            toast({ variant: 'destructive', title: 'Acesso Negado', description: 'Você não tem permissão para acessar esta página.' });
            router.push('/');
            return;
        }

        if (!authLoading && profile?.role === 'admin') {
            fetchUsers();
        }
    }, [profile, authLoading, router, toast, fetchUsers]);

    const handleRoleChange = (id: string, newRole: UserRole) => {
        setUsers(currentUsers =>
            currentUsers.map(user =>
                user.id === id ? { ...user, role: newRole } : user
            )
        );
    };

    const handleSaveChanges = (id: string) => {
        const userToUpdate = users.find(u => u.id === id);
        if (!userToUpdate) return;

        startTransition(async () => {
            const result = await updateUserRole(id, userToUpdate.role);
            if (result.success) {
                toast({ title: 'Perfil Atualizado!', description: `As alterações para ${userToUpdate.displayName} foram salvas.` });
            } else {
                toast({ variant: 'destructive', title: 'Erro ao Atualizar', description: result.error || 'Falha ao salvar alterações.' });
            }
        });
    };

    const handleDeleteUser = () => {
        if (!userToDelete) return;

        startTransition(async () => {
            const result = await deleteUser(userToDelete.id);
            if (result.success) {
                toast({ title: 'Usuário Excluído!', description: `O usuário ${userToDelete.displayName} foi removido do sistema.` });
                fetchUsers(); // Refresh the user list
            } else {
                toast({ variant: 'destructive', title: 'Erro ao excluir', description: result.error });
            }
            setUserToDelete(null);
        });
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
                            {users.map(user => (
                                <div key={user.id} className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-lg border bg-muted/50 gap-4">
                                    <div className="flex items-center gap-4">
                                        <Avatar>
                                            <AvatarImage src={user.photoURL ?? undefined} />
                                            <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-grow">
                                            <p className="font-semibold">{user.displayName}</p>
                                            <p className="text-sm text-muted-foreground">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <Select
                                            value={user.role}
                                            onValueChange={(newRole) => handleRoleChange(user.id, newRole as UserRole)}
                                            disabled={isProcessing}
                                        >
                                            <SelectTrigger className="w-full sm:w-[180px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableRoles.map((role) => (
                                                    <SelectItem key={role} value={role}>
                                                        {roleLabels[role]}
                                                    </SelectItem>
                                                ))}
                                                <SelectItem value="admin" disabled>{roleLabels.admin}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            size="icon"
                                            onClick={() => handleSaveChanges(user.id)}
                                            disabled={isProcessing}
                                            aria-label="Salvar alterações de perfil"
                                        >
                                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        </Button>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                size="icon"
                                                variant="destructive"
                                                disabled={isProcessing}
                                                onClick={() => setUserToDelete(user)}
                                                aria-label="Excluir usuário"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                    </div>
                                </div>
                            ))}
                            {users.length === 0 && (
                                <p className="text-muted-foreground text-center py-4">Nenhum outro usuário no sistema para gerenciar.</p>
                            )}
                        </CardContent>
                    </Card>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Isso excluirá permanentemente o usuário <span className="font-bold">{userToDelete?.displayName}</span> e revogará seu acesso ao sistema.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setUserToDelete(null)} disabled={isProcessing}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteUser} disabled={isProcessing} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sim, Excluir'}
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
