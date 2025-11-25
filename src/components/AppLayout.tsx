
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Home, Users, Video as VideoIcon, LogOut, ClipboardList, PlaySquare, Megaphone, UserCog, MessageSquareText, Trophy, HandCoins, LayoutDashboard, Settings } from 'lucide-react';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CuidarMeLogo } from '@/components/icons';
import { useAuth, type UserRole } from '@/hooks/use-auth';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


const allMenuItems = [
  { href: '/welcome', label: 'Apresentação', icon: Home, roles: ['admin', 'equipe_saude', 'assistente', 'pendente'] },
  { href: '/overview', label: 'Visão Geral', icon: LayoutDashboard, roles: ['admin', 'equipe_saude', 'assistente'] },
  { href: '/patients', label: 'Pacientes', icon: MessageSquareText, roles: ['admin', 'equipe_saude', 'assistente'] },
  { href: '/protocols', label: 'Protocolos', icon: ClipboardList, roles: ['admin'] },
  { href: '/education', label: 'Educação', icon: VideoIcon, roles: ['admin', 'equipe_saude'] },
  { href: '/community', label: 'Comunidade', icon: Users, roles: ['admin', 'equipe_saude'] },
  { href: '/campaigns', label: 'Campanhas', icon: Megaphone, roles: ['admin', 'assistente'] },
  { href: '/plans', label: 'Planos', icon: HandCoins, roles: ['admin', 'equipe_saude'] },
];

const adminMenuItems = [
  { href: '/admin', label: 'Gestão de Equipe', icon: UserCog },
  { href: '/admin/settings', label: 'Credenciais', icon: Settings }
];


const roleLabels: { [key in UserRole]: string } = {
  admin: 'Administrador',
  equipe_saude: 'Equipe de Saúde',
  assistente: 'Assistente',
  paciente: 'Paciente',
  pendente: 'Pendente'
}

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();

  const menuItems = allMenuItems.filter(item =>
    profile?.role && item.roles.includes(profile.role)
  );

  const isAdmin = profile?.role === 'admin';

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <CuidarMeLogo />
            <div className="flex flex-col">
              <SidebarTrigger className="md:hidden -ml-2 h-auto w-auto p-0" />
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(item.href)}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton isActive={pathname.startsWith('/admin')}>
                    <UserCog />
                    <span>Admin</span>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 ml-2">
                  <DropdownMenuLabel>Administração</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {adminMenuItems.map(item => (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link href={item.href}>
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile?.photo_url ?? undefined} alt={profile?.display_name ?? 'Usuário'} data-ai-hint="doctor avatar" />
              <AvatarFallback>{profile?.display_name?.[0] ?? user?.email?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col truncate">
              <span className="font-semibold text-sm truncate">{profile?.display_name ?? 'Usuário'}</span>
              <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
              {profile?.role && <Badge variant={profile.role === 'pendente' ? 'destructive' : 'secondary'} className="w-fit mt-1">{roleLabels[profile.role]}</Badge>}
            </div>
            <Button variant="ghost" size="icon" className="ml-auto flex-shrink-0" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="flex items-center justify-between p-4 border-b md:hidden">
          <div className="flex items-center gap-2">
            <CuidarMeLogo />
          </div>
          <SidebarTrigger />
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
