"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Home, Users, Video as VideoIcon, LogOut, ClipboardList, Megaphone, UserCog, MessageSquareText, HandCoins, LayoutDashboard, Settings, Sparkles, Trophy, ShoppingBag } from 'lucide-react';
import Image from 'next/image';

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
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from '@/components/ui/progress';


const allMenuItems = [
  { href: '/welcome', label: 'Apresentação', icon: Home, roles: ['admin', 'equipe_saude', 'assistente', 'pendente'] },
  { href: '/overview', label: 'Visão Geral', icon: LayoutDashboard, roles: ['admin', 'equipe_saude', 'assistente'] },
  { href: '/patients', label: 'Pacientes', icon: MessageSquareText, roles: ['admin', 'equipe_saude', 'assistente'] },
  { href: '/protocols', label: 'Protocolos', icon: ClipboardList, roles: ['admin'] },
  { href: '/education', label: 'Educação', icon: VideoIcon, roles: ['admin', 'equipe_saude'] },
  { href: '/community', label: 'Comunidade', icon: Users, roles: ['admin', 'equipe_saude'] },
  { href: '/campaigns', label: 'Campanhas', icon: Megaphone, roles: ['admin', 'assistente'] },
  { href: '/plans', label: 'Planos', icon: HandCoins, roles: ['admin', 'equipe_saude'] },
  { href: '/portal/achievements', label: 'Conquistas', icon: Trophy, roles: ['paciente'] },
  { href: '/portal/store', label: 'Loja', icon: ShoppingBag, roles: ['paciente'] },
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
      <Sidebar className="border-r-0 bg-white/50">
        <SidebarHeader className="h-24 flex justify-center pb-0">
          <div className="flex items-center justify-between px-6 w-full h-full">
            <div className="relative h-20 w-48">
              <Image
                src="/logo.svg"
                alt="Cuidar.me Logo"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
            <SidebarTrigger className="md:hidden" />
          </div>
        </SidebarHeader>

        <SidebarContent className="px-4 space-y-6">
          {/* Profile Card - Replicating the Patient Portal Style */}
          <div className="bg-[#F9FAF6] rounded-3xl p-4 border border-[#EBECE8] shadow-sm mx-2 mt-2">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                <AvatarImage src={profile?.photo_url ?? undefined} alt={profile?.display_name ?? 'Usuário'} />
                <AvatarFallback className="bg-[#B49C7E] text-white font-bold text-lg">
                  {profile?.display_name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-bold text-foreground text-sm truncate max-w-[120px]">
                  {profile?.display_name?.split(' ')[0] ?? 'Usuário'}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  {profile?.role ? roleLabels[profile.role] : 'Membro'}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <Progress value={isAdmin ? 100 : 30} className="h-1.5 bg-black/5" />
              <div className="flex justify-end">
                <span className="text-[10px] font-medium text-muted-foreground">
                  {isAdmin ? 'Acesso Total' : 'Nível 1'}
                </span>
              </div>
            </div>
          </div>

          <SidebarMenu className="px-2 space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    className={cn(
                      "h-12 px-4 rounded-xl transition-all duration-300 font-medium text-base group relative overflow-hidden",
                      isActive
                        ? "bg-[#899d5e] text-white hover:bg-[#7a8c53] shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                        : "text-muted-foreground hover:text-foreground hover:bg-[#F4F5F0]"
                    )}
                  >
                    <Link href={item.href} className="flex items-center w-full">
                      <item.icon className={cn("mr-3 h-5 w-5", isActive ? "text-white" : "text-muted-foreground group-hover:text-[#899d5e]")} />
                      <span>{item.label}</span>
                      {isActive && <Sparkles className="ml-auto h-4 w-4 text-white/70 animate-pulse" />}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}

            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    isActive={pathname.startsWith('/admin')}
                    className={cn(
                      "h-12 px-4 rounded-xl transition-all duration-300 font-medium text-base group mt-4",
                      pathname.startsWith('/admin')
                        ? "bg-[#899d5e] text-white hover:bg-[#7a8c53] shadow-md"
                        : "text-muted-foreground hover:text-foreground hover:bg-[#F4F5F0]"
                    )}
                  >
                    <UserCog className={cn("mr-3 h-5 w-5", pathname.startsWith('/admin') ? "text-white" : "text-muted-foreground group-hover:text-[#899d5e]")} />
                    <span>Admin</span>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 ml-2 rounded-xl border-[#EBECE8] shadow-lg">
                  <DropdownMenuLabel className="text-[#899d5e]">Administração</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {adminMenuItems.map(item => (
                    <DropdownMenuItem key={item.href} asChild className="rounded-lg focus:bg-[#F4F5F0] cursor-pointer">
                      <Link href={item.href}>
                        <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="p-6">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl h-12 px-4"
            onClick={signOut}
          >
            <LogOut className="mr-3 h-5 w-5" />
            <span className="font-medium">Sair</span>
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-[#F9FAF6]/50">
        <div className="flex items-center justify-between p-4 border-b md:hidden bg-white">
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
