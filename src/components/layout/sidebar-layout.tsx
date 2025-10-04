'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AreaChart,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  Users,
  Wallet,
  Tv,
  Bell,
  User,
  ChevronDown,
  ChevronRight,
  List,
  Plus,
  Smartphone,
} from 'lucide-react';
import { ThemeToggle } from "@/components/ui/theme-toggle";
import SigmaAutoSync from "@/components/sigma-auto-sync";

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  href: string;
  icon: any;
  label: string;
  description: string;
  badge?: string | null;
  submenu?: {
    href: string;
    label: string;
    description: string;
  }[];
}

const navItems: NavItem[] = [
  { 
    href: '/dashboard', 
    icon: LayoutDashboard, 
    label: 'Dashboard',
    description: 'Visão geral do negócio',
    badge: null
  },
  { 
    href: '/dashboard/clients', 
    icon: Users, 
    label: 'Clientes',
    description: 'Gerenciar clientes',
    badge: null,
    submenu: [
      {
        href: '/dashboard/clients',
        label: 'Listar',
        description: 'Ver todos os clientes'
      },
      {
        href: '/dashboard/clients/add',
        label: 'Adicionar',
        description: 'Cadastrar novo cliente'
      },
      {
        href: '/dashboard/plans',
        label: 'Planos',
        description: 'Gerenciar planos de serviço'
      },
      {
        href: '/dashboard/clients/apps',
        label: 'Aplicativos',
        description: 'Gerenciar aplicativos'
      }
    ]
  },
  { 
    href: '/dashboard/servers', 
    icon: Shield, 
    label: 'Servidores',
    description: 'Gerenciar servidores',
    badge: null
  },
  { 
    href: '/dashboard/expenses', 
    icon: Wallet, 
    label: 'Despesas',
    description: 'Controle financeiro',
    badge: null
  },
  { 
    href: '/dashboard/reports', 
    icon: AreaChart, 
    label: 'Relatórios',
    description: 'Análises e insights',
    badge: null
  },
];

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = React.useState<string[]>([]);

  const toggleSubmenu = (label: string) => {
    setExpandedMenus(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  return (
    <SidebarProvider>
      <Sidebar className="border-r-0 shadow-xl bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <SidebarHeader className="border-b border-slate-200/50 dark:border-slate-800/50 pb-4 pt-4">
          <div className="flex items-center gap-2 px-2">
            <div className="flex-shrink-0">
              <img 
                src="/images/gestplay-logo.png" 
                alt="GestPlay Logo" 
                className="w-20 h-20 object-contain"
                onError={(e) => {
                  // Fallback para o ícone original se a imagem não carregar
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-2xl shadow-lg hidden">
                <Tv className="text-white size-7" />
              </div>
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-headline font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                GestPlay
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Gestão Inteligente
              </p>
            </div>
          </div>
        </SidebarHeader>
        
        <SidebarContent className="px-3 py-2">
          <div className="space-y-2">
            <div className="px-3 mb-4">
              <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Menu Principal
              </h2>
            </div>
            <SidebarMenu className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.submenu && item.submenu.some(sub => pathname === sub.href));
                const isExpanded = expandedMenus.includes(item.label);
                const hasSubmenu = item.submenu && item.submenu.length > 0;
                
                return (
                  <SidebarMenuItem key={item.href}>
                    <div>
                      {hasSubmenu ? (
                        <button
                          onClick={() => toggleSubmenu(item.label)}
                          className={`
                            group relative h-auto p-0 hover:bg-transparent w-full
                            ${isActive ? 'bg-transparent' : ''}
                          `}
                        >
                          <div className={`
                            flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200
                            ${isActive 
                              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25' 
                              : 'hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                            }
                          `}>
                            <div className={`
                              p-2 rounded-lg transition-all duration-200
                              ${isActive 
                                ? 'bg-white/20' 
                                : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                              }
                            `}>
                              <item.icon className={`size-5 ${isActive ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className={`font-semibold text-sm ${isActive ? 'text-white' : ''}`}>
                                  {item.label}
                                </span>
                                <div className="flex items-center gap-2">
                                  {item.badge && (
                                    <Badge 
                                      variant={isActive ? "secondary" : "outline"} 
                                      className={`
                                        text-xs px-2 py-0.5 font-medium
                                        ${isActive 
                                          ? 'bg-white/20 text-white border-white/30' 
                                          : 'bg-gradient-to-r from-orange-400 to-pink-500 text-white border-0'
                                        }
                                      `}
                                    >
                                      {item.badge}
                                    </Badge>
                                  )}
                                  {isExpanded ? (
                                    <ChevronDown className={`size-4 ${isActive ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`} />
                                  ) : (
                                    <ChevronRight className={`size-4 ${isActive ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`} />
                                  )}
                                </div>
                              </div>
                              <div className="w-full">
                                <p className={`text-xs mt-0.5 text-left leading-tight ${isActive ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                                  {item.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        </button>
                      ) : (
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className={`
                            group relative h-auto p-0 hover:bg-transparent
                            ${isActive ? 'bg-transparent' : ''}
                          `}
                        >
                          <Link href={item.href} className="w-full">
                            <div className={`
                              flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200
                              ${isActive 
                                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25' 
                                : 'hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                              }
                            `}>
                              <div className={`
                                p-2 rounded-lg transition-all duration-200
                                ${isActive 
                                  ? 'bg-white/20' 
                                  : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                                }
                              `}>
                                <item.icon className={`size-5 ${isActive ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className={`font-semibold text-sm ${isActive ? 'text-white' : ''}`}>
                                    {item.label}
                                  </span>
                                  {item.badge && (
                                    <Badge 
                                      variant={isActive ? "secondary" : "outline"} 
                                      className={`
                                        text-xs px-2 py-0.5 font-medium
                                        ${isActive 
                                          ? 'bg-white/20 text-white border-white/30' 
                                          : 'bg-gradient-to-r from-orange-400 to-pink-500 text-white border-0'
                                        }
                                      `}
                                    >
                                      {item.badge}
                                    </Badge>
                                  )}
                                </div>
                                <div className="w-full">
                                  <p className={`text-xs mt-0.5 text-left leading-tight ${isActive ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                                    {item.description}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </Link>
                        </SidebarMenuButton>
                      )}
                      
                      {/* Submenu */}
                      {hasSubmenu && isExpanded && (
                        <div className="ml-6 mt-2 space-y-1">
                          {item.submenu?.map((subItem) => {
                            const isSubActive = pathname === subItem.href;
                            const getSubIcon = (label: string) => {
                              switch (label) {
                                case 'Listar': return List;
                                case 'Adicionar': return Plus;
                                case 'Planos': return Shield;
                                case 'Aplicativos': return Smartphone;
                                default: return List;
                              }
                            };
                            const SubIcon = getSubIcon(subItem.label);
                            
                            return (
                              <Link
                                key={subItem.href}
                                href={subItem.href}
                                className={`
                                  flex items-center gap-3 p-2 rounded-lg transition-all duration-200
                                  ${isSubActive 
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                                  }
                                `}
                              >
                                <SubIcon className="size-4" />
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium">{subItem.label}</span>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {subItem.description}
                                  </p>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </div>
        </SidebarContent>
        
        <SidebarFooter className="border-t border-slate-200/50 dark:border-slate-800/50 pt-6 pb-8 px-3">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/50 dark:to-blue-950/50 border border-emerald-200/50 dark:border-emerald-800/50">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                <Bell className="size-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                  Sistema Ativo
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Tudo funcionando
                </p>
              </div>
            </div>
            
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  className="group h-auto p-0 hover:bg-transparent"
                >
                  <Link href="/login" className="w-full">
                    <div className="flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400">
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-red-100 dark:group-hover:bg-red-900/50 transition-all duration-200">
                        <LogOut className="size-5 text-slate-600 dark:text-slate-400 group-hover:text-red-600 dark:group-hover:text-red-400" />
                      </div>
                      <div className="flex-1">
                        <span className="font-semibold text-sm">Sair</span>
                        <p className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-red-500 dark:group-hover:text-red-400">
                          Encerrar sessão
                        </p>
                      </div>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-slate-50/50 dark:bg-slate-950/50">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <SidebarTrigger className="md:hidden hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors" />
            <div className="hidden md:block">
              <h1 className="text-2xl font-headline font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                {navItems.find(item => pathname.startsWith(item.href))?.label || "Dashboard"}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {navItems.find(item => pathname.startsWith(item.href))?.description || "Visão geral do sistema"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200"
            >
              <Bell className="size-5 text-slate-600 dark:text-slate-400" />
              <div className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full w-3 h-3 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              </div>
            </Button>
            
            <ThemeToggle />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-auto p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200">
                  <div className="flex items-center gap-3 px-2 py-1">
                    <Avatar className="ring-2 ring-slate-200 dark:ring-slate-700">
                      <AvatarImage src="https://picsum.photos/seed/user/40/40" data-ai-hint="person portrait" alt="Revendedor" />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                        RV
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Revendedor
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        admin@gestplay.com
                      </p>
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2">
                <DropdownMenuLabel className="p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="ring-2 ring-slate-200 dark:ring-slate-700">
                      <AvatarImage src="https://picsum.photos/seed/user/40/40" data-ai-hint="person portrait" alt="Revendedor" />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                        RV
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        Revendedor GestPlay
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        admin@gestplay.com
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">
                  <User className="mr-3 h-4 w-4" />
                  <div>
                    <p className="font-medium">Meu Perfil</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Gerenciar conta</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">
                  <Settings className="mr-3 h-4 w-4" />
                  <div>
                    <p className="font-medium">Configurações</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Preferências do sistema</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/login" className="p-3 cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg text-red-600 dark:text-red-400">
                    <LogOut className="mr-3 h-4 w-4" />
                    <div>
                      <p className="font-medium">Sair</p>
                      <p className="text-xs opacity-75">Encerrar sessão</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        <main className="flex-1 p-6 md:p-8 lg:p-10 space-y-8">
          {children}
        </main>
        
        {/* Sigma Auto Sync - runs in background */}
        <SigmaAutoSync enabled={true} intervalMinutes={30} />
      </SidebarInset>
    </SidebarProvider>
  );
}
