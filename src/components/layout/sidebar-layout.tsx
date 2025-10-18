'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AreaChart,
  LayoutDashboard,
  LogOut,
  Shield,
  Users,
  Wallet,
  Bell,
  User,
  ChevronDown,
  ChevronRight,
  List,
  Plus,
  Smartphone,
  MessageCircle,
  CreditCard,
  UserCog,
  MessageSquare,
  Calendar,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

import { WhatsAppStatusBadge } from '@/components/whatsapp/whatsapp-status-indicator';
import { SupportIcons } from '@/components/ui/support-icons';
import { useResellerSubscription } from '@/hooks/use-reseller-subscription';
import { useAuth } from '@/hooks/use-auth';
import { useClients } from '@/hooks/use-clients';
import { format, differenceInDays, parseISO, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

// Função para gerar itens do menu baseado no tipo de usuário
const getNavItems = (isAdmin: boolean): NavItem[] => {
  const baseItems: NavItem[] = [
    {
      href: '/dashboard',
      icon: LayoutDashboard,
      label: 'Dashboard',
      description: 'Visão geral do negócio',
      badge: null
    },
  ];

  // Menu exclusivo para ADMIN
  if (isAdmin) {
    baseItems.push({
      href: '/dashboard/admin/resellers',
      icon: UserCog,
      label: 'Revendas',
      description: 'Gerenciar revendas',
      badge: null,
      submenu: [
        {
          href: '/dashboard/admin/resellers',
          label: 'Listar',
          description: 'Ver todas as revendas'
        },
        {
          href: '/dashboard/admin/plans',
          label: 'Planos',
          description: 'Planos de assinatura'
        },
        {
          href: '/dashboard/admin/payments',
          label: 'Pagamentos',
          description: 'Pagamentos de assinaturas'
        }
      ]
    });
  }

  // Menu exclusivo para REVENDA
  if (!isAdmin) {
    baseItems.push({
      href: '/dashboard/subscription',
      icon: RefreshCw,
      label: 'Renovar Acesso',
      description: 'Gerenciar assinatura',
      badge: null
    });
  }

  // Menus comuns para ambos
  baseItems.push(
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
          description: isAdmin ? 'Planos para revendas' : 'Gerenciar planos de serviço'
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
      badge: null,
      submenu: [
        {
          href: '/dashboard/reports',
          label: 'Visão Geral',
          description: 'Overview financeiro'
        },
        {
          href: '/dashboard/reports/clients',
          label: 'Clientes',
          description: 'Análise de clientes'
        },
        {
          href: '/dashboard/reports/financial',
          label: 'Financeiro Avançado',
          description: 'Métricas financeiras'
        },
        {
          href: '/dashboard/reports/defaulters',
          label: 'Inadimplência',
          description: 'Clientes inadimplentes'
        },
        {
          href: '/dashboard/reports/plans',
          label: 'Planos',
          description: 'Rentabilidade por plano'
        },
        {
          href: '/dashboard/reports/expenses',
          label: 'Despesas Detalhadas',
          description: 'Análise de despesas'
        },
        {
          href: '/dashboard/reports/comparative',
          label: 'Comparativo',
          description: 'Comparação entre períodos'
        }
      ]
    },
    {
      href: '/dashboard/whatsapp',
      icon: MessageCircle,
      label: 'WhatsApp',
      description: 'Pareamento e automação',
      badge: null,
      submenu: [
        {
          href: '/dashboard/whatsapp',
          label: 'Conexão',
          description: 'Pareamento e status'
        },
        {
          href: '/dashboard/whatsapp/templates',
          label: 'Templates',
          description: isAdmin ? 'Templates para revendas' : 'Criar e gerenciar templates'
        },
        {
          href: '/dashboard/whatsapp/settings',
          label: 'Configurações',
          description: 'Intervalos e segurança'
        }
      ]
    },
    {
      href: '/dashboard/payment-methods',
      icon: CreditCard,
      label: 'Pagamentos',
      description: isAdmin ? 'Métodos para revendas' : 'Métodos de pagamento',
      badge: null,
      submenu: [
        {
          href: '/dashboard/payment-methods',
          label: 'Métodos',
          description: 'Mercado Pago, Asaas, PIX'
        }
      ]
    }
  );

  return baseItems;
};

// Componente de Notificações em Popover
function NotificationPopover() {
  const { data: clients } = useClients();
  const [notifications, setNotifications] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (clients) {
      const today = new Date();
      const newNotifications: any[] = [];

      clients.forEach((client) => {
        if (!client.renewal_date) return;

        const renewalDate = parseISO(client.renewal_date);
        const daysUntilRenewal = differenceInDays(renewalDate, today);
        const isOverdue = isAfter(today, renewalDate);

        if (isOverdue) {
          const daysOverdue = Math.abs(daysUntilRenewal);
          newNotifications.push({
            id: `overdue-${client.id}`,
            type: 'urgent',
            title: 'Cliente em Atraso',
            message: `${client.name} está ${daysOverdue} dia${daysOverdue > 1 ? 's' : ''} em atraso`,
            clientName: client.name,
            daysUntilExpiry: daysUntilRenewal,
          });
        } else if (daysUntilRenewal <= 7) {
          newNotifications.push({
            id: `warning-${client.id}`,
            type: daysUntilRenewal <= 3 ? 'urgent' : 'warning',
            title: daysUntilRenewal <= 3 ? 'Vencimento Urgente' : 'Vencimento Próximo',
            message: `${client.name} vence ${daysUntilRenewal === 0 ? 'hoje' : `em ${daysUntilRenewal} dia${daysUntilRenewal > 1 ? 's' : ''}`}`,
            clientName: client.name,
            daysUntilExpiry: daysUntilRenewal,
          });
        }
      });

      setNotifications(newNotifications.sort((a, b) => (a.daysUntilExpiry || 0) - (b.daysUntilExpiry || 0)));
    }
  }, [clients]);

  const urgentCount = notifications.filter(n => n.type === 'urgent').length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200"
          aria-label="Notificações"
        >
          <Bell className="size-5 text-slate-600 dark:text-slate-400" />
          {notifications.length > 0 && (
            <div className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full w-5 h-5 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">{notifications.length > 9 ? '9+' : notifications.length}</span>
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Notificações</h3>
            {urgentCount > 0 && (
              <Badge variant="destructive" className="bg-gradient-to-r from-red-500 to-orange-500">
                {urgentCount} urgente{urgentCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length > 0 ? (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${notification.type === 'urgent'
                      ? 'bg-red-50/50 dark:bg-red-950/20'
                      : ''
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${notification.type === 'urgent'
                        ? 'bg-red-100 dark:bg-red-900/50'
                        : 'bg-yellow-100 dark:bg-yellow-900/50'
                      }`}>
                      {notification.type === 'urgent' ? (
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      ) : (
                        <Calendar className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {notification.title}
                        </h4>
                        {notification.daysUntilExpiry !== undefined && (
                          <Badge variant="outline" className="text-xs">
                            {notification.daysUntilExpiry < 0
                              ? `${Math.abs(notification.daysUntilExpiry)}d atraso`
                              : notification.daysUntilExpiry === 0
                                ? 'Hoje'
                                : `${notification.daysUntilExpiry}d`
                            }
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {notifications.length > 10 && (
                <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400">
                  +{notifications.length - 10} notificações adicionais
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-3">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Tudo em ordem! 🎉
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                Nenhum cliente próximo do vencimento
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: subscriptionData } = useResellerSubscription();
  const { isAdmin: isAdminFromAuth, loading: authLoading, user } = useAuth();

  // Fallback: usar dados da subscription se auth falhar
  const userEmail = user?.email || subscriptionData?.subscription?.email;
  const userId = user?.reseller_id || subscriptionData?.subscription?.id;

  // Detectar admin por múltiplas fontes
  const isAdmin = isAdminFromAuth ||
    userEmail === 'admin@admin.com' ||
    userId === 'admin-user-001';

  const navItems = React.useMemo(() => getNavItems(isAdmin), [isAdmin]);

  // Debug log
  React.useEffect(() => {
    console.log('[SidebarLayout] isAdmin:', isAdmin);
    console.log('[SidebarLayout] user:', user);
    console.log('[SidebarLayout] userEmail:', userEmail);
    console.log('[SidebarLayout] userId:', userId);
    console.log('[SidebarLayout] authLoading:', authLoading);
  }, [isAdmin, user, userEmail, userId, authLoading]);

  const [expandedMenus, setExpandedMenus] = React.useState<string[]>(() => {
    // Auto-expand submenu if we're on a clients page
    if (pathname.startsWith('/dashboard/clients')) {
      return ['Clientes'];
    }
    if (pathname.startsWith('/dashboard/admin/resellers')) {
      return ['Revendas'];
    }
    return [];
  });

  // Update expanded menus when pathname changes
  React.useEffect(() => {
    if (pathname.startsWith('/dashboard/clients')) {
      setExpandedMenus(prev =>
        prev.includes('Clientes') ? prev : [...prev, 'Clientes']
      );
    }
    if (pathname.startsWith('/dashboard/admin/resellers')) {
      setExpandedMenus(prev =>
        prev.includes('Revendas') ? prev : [...prev, 'Revendas']
      );
    }
  }, [pathname]);

  const toggleSubmenu = (label: string) => {
    console.log('Toggling submenu for:', label);
    setExpandedMenus(prev => {
      const newState = prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label];
      console.log('New expanded menus:', newState);
      return newState;
    });
  };

  return (
    <SidebarProvider>
      <Sidebar className="border-r-0 shadow-xl bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <SidebarHeader className="border-b border-slate-200/50 dark:border-slate-800/50 pb-3 pt-4">
          <div className="flex items-center justify-center gap-2">
            <img
              src="/logo-icon.png"
              alt="UltraGestor"
              className="h-11 w-11 object-contain flex-shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <h1 className="text-[28px] font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent tracking-tight" style={{ fontFamily: "'Poppins', 'Inter', sans-serif" }}>
              UltraGestor
            </h1>
          </div>

          {/* Card de Vencimento - Apenas para revendas em mobile */}
          {!isAdmin && subscriptionData?.subscription?.subscription_expiry_date && (
            <div className="mt-3 px-3 md:hidden">
              <div className={`
                p-3 rounded-xl transition-all duration-200 border
                ${subscriptionData.subscription.subscription_health === 'expired'
                  ? 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/30 border-red-200 dark:border-red-800'
                  : subscriptionData.subscription.subscription_health === 'expiring_soon'
                    ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/50 dark:to-yellow-900/30 border-yellow-200 dark:border-yellow-800'
                    : 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 border-green-200 dark:border-green-800'
                }
              `}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${subscriptionData.subscription.subscription_health === 'expired'
                      ? 'bg-red-200 dark:bg-red-900/50'
                      : subscriptionData.subscription.subscription_health === 'expiring_soon'
                        ? 'bg-yellow-200 dark:bg-yellow-900/50'
                        : 'bg-green-200 dark:bg-green-900/50'
                    }`}>
                    <Calendar className={`h-5 w-5 ${subscriptionData.subscription.subscription_health === 'expired'
                        ? 'text-red-700 dark:text-red-300'
                        : subscriptionData.subscription.subscription_health === 'expiring_soon'
                          ? 'text-yellow-700 dark:text-yellow-300'
                          : 'text-green-700 dark:text-green-300'
                      }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold uppercase tracking-wide ${subscriptionData.subscription.subscription_health === 'expired'
                        ? 'text-red-700 dark:text-red-300'
                        : subscriptionData.subscription.subscription_health === 'expiring_soon'
                          ? 'text-yellow-700 dark:text-yellow-300'
                          : 'text-green-700 dark:text-green-300'
                      }`}>
                      {subscriptionData.subscription.subscription_health === 'expired'
                        ? 'Assinatura Vencida'
                        : subscriptionData.subscription.subscription_health === 'expiring_soon'
                          ? 'Vence em Breve'
                          : 'Assinatura Ativa'
                      }
                    </p>
                    <p className={`text-lg font-bold mt-0.5 ${subscriptionData.subscription.subscription_health === 'expired'
                        ? 'text-red-900 dark:text-red-100'
                        : subscriptionData.subscription.subscription_health === 'expiring_soon'
                          ? 'text-yellow-900 dark:text-yellow-100'
                          : 'text-green-900 dark:text-green-100'
                      }`}>
                      {format(new Date(subscriptionData.subscription.subscription_expiry_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Sistema ativo
                    </p>

                    {/* Botões de Suporte */}
                    <div className="flex gap-2 mt-2">
                      <a
                        href="https://wa.me/5514997349352"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-xs font-medium"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                      </a>
                      <a
                        href="https://t.me/+qLvYloISL-gyY2Yx"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-xs font-medium"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Telegram
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
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
                                case 'Criar': return Plus;
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
      <SidebarInset className="bg-slate-50/50 dark:bg-slate-950/50 max-w-full overflow-x-hidden">
        <header className="sticky top-0 z-40 flex h-14 sm:h-16 items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl px-2 sm:px-3 md:px-6 lg:px-8 max-w-full gap-2">
          <div className="flex items-center gap-2 sm:gap-4 md:gap-6 min-w-0 flex-1">
            <SidebarTrigger className="md:hidden hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 sm:p-2 rounded-lg transition-colors flex-shrink-0" />
            <div className="hidden md:block min-w-0">
              <h1 className="text-xl lg:text-2xl font-headline font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent truncate">
                {navItems.find(item => pathname.startsWith(item.href))?.label || "Dashboard"}
              </h1>
              <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {navItems.find(item => pathname.startsWith(item.href))?.description || "Visão geral do sistema"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
            {/* Data de Vencimento - Apenas para revendas */}
            {!isAdmin && subscriptionData?.subscription?.subscription_expiry_date && (
              <Link href="/dashboard/subscription" className="hidden sm:block">
                <div className={`
                  flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-all duration-200 cursor-pointer
                  ${subscriptionData.subscription.subscription_health === 'expired'
                    ? 'bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800'
                    : subscriptionData.subscription.subscription_health === 'expiring_soon'
                      ? 'bg-yellow-50 dark:bg-yellow-950/50 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-800'
                      : 'bg-green-50 dark:bg-green-950/50 hover:bg-green-100 dark:hover:bg-green-900/50 border border-green-200 dark:border-green-800'
                  }
                `}>
                  <Calendar className={`size-3 sm:size-4 flex-shrink-0 ${subscriptionData.subscription.subscription_health === 'expired'
                    ? 'text-red-600 dark:text-red-400'
                    : subscriptionData.subscription.subscription_health === 'expiring_soon'
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-green-600 dark:text-green-400'
                    }`} />
                  <div className="text-left min-w-0">
                    <p className={`text-[10px] sm:text-xs font-medium leading-tight ${subscriptionData.subscription.subscription_health === 'expired'
                      ? 'text-red-700 dark:text-red-300'
                      : subscriptionData.subscription.subscription_health === 'expiring_soon'
                        ? 'text-yellow-700 dark:text-yellow-300'
                        : 'text-green-700 dark:text-green-300'
                      }`}>
                      Vence em
                    </p>
                    <p className={`text-xs sm:text-sm font-bold leading-tight ${subscriptionData.subscription.subscription_health === 'expired'
                      ? 'text-red-900 dark:text-red-100'
                      : subscriptionData.subscription.subscription_health === 'expiring_soon'
                        ? 'text-yellow-900 dark:text-yellow-100'
                        : 'text-green-900 dark:text-green-100'
                      }`}>
                      {format(new Date(subscriptionData.subscription.subscription_expiry_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </Link>
            )}

            <div className="hidden sm:block">
              <SupportIcons />
            </div>

            {/* Separador - Hidden on mobile */}
            <div className="hidden md:block h-6 w-px bg-slate-200 dark:bg-slate-700"></div>

            <NotificationPopover />

            <ThemeToggle />

            {/* WhatsApp Status Indicator */}
            <div className="hidden sm:block">
              <WhatsAppStatusBadge />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-auto p-0.5 sm:p-1 rounded-lg sm:rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200">
                  <div className="flex items-center gap-2 sm:gap-3 px-1 sm:px-2 py-0.5 sm:py-1">
                    <Avatar className="ring-1 sm:ring-2 ring-slate-200 dark:ring-slate-700 h-8 w-8 sm:h-10 sm:w-10">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-xs sm:text-sm">
                        {isAdmin
                          ? 'AD'
                          : (subscriptionData?.subscription?.display_name || user?.display_name || 'U')
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)
                        }
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden lg:block text-left min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {isAdmin
                          ? 'Administrador'
                          : subscriptionData?.subscription?.display_name || user?.display_name || 'Usuário'
                        }
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {userEmail || 'admin@UltraGestor.com'}
                      </p>
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2">
                <DropdownMenuLabel className="p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="ring-2 ring-slate-200 dark:ring-slate-700">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                        {isAdmin
                          ? 'AD'
                          : (subscriptionData?.subscription?.display_name || user?.display_name || 'U')
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)
                        }
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {isAdmin
                          ? 'Administrador'
                          : subscriptionData?.subscription?.display_name || user?.display_name || 'Usuário'
                        }
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {userEmail || 'admin@UltraGestor.com'}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">
                    <User className="mr-3 h-4 w-4" />
                    <div>
                      <p className="font-medium">Meu Perfil</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Gerenciar conta</p>
                    </div>
                  </Link>
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

        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10 space-y-4 sm:space-y-6 md:space-y-8 max-w-full overflow-x-hidden">
          <div className="max-w-full overflow-x-hidden">
            {children}
          </div>
        </main>

        {/* Sigma Auto Sync - runs in background */}
        <SigmaAutoSync enabled={true} intervalMinutes={30} />
      </SidebarInset>
    </SidebarProvider>
  );
}
