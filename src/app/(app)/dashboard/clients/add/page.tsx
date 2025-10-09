"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, PlusCircle, ArrowLeft, Smartphone, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { useMySQL } from '@/lib/mysql-provider';
// Removed useCollection - using direct API calls;
// Removed Firebase Firestore imports;
import { mysqlApi } from '@/lib/mysql-api-client';
import type { Plan, Panel, App } from "@/lib/definitions";
import { Checkbox } from "@/components/ui/checkbox";
import { useClients } from '@/hooks/use-clients';
import { usePlans } from '@/hooks/use-plans';
import { usePanels } from '@/hooks/use-panels';

export default function AddClientPage() {
  const { user } = useMySQL();
  const resellerId = user?.id;
  
  // Force component re-render to prevent autocomplete
  const [formKey, setFormKey] = React.useState(Date.now());

  // Collections

  const { data: plans } = usePlans();
  const { data: panels } = usePanels();
  const { refetch } = useClients();
  const [apps, setApps] = React.useState<any[]>([]);

  React.useEffect(() => {
    const loadApps = async () => {
      if (!resellerId) return;
      try {
        const data = await mysqlApi.getApps();
        setApps(data);
      } catch (e) {
        console.error('Erro ao carregar aplicativos:', e);
        setApps([]);
      }
    };
    loadApps();
  }, [resellerId]);

  // Form state
  const [clientName, setClientName] = React.useState("");
  const [clientPhone, setClientPhone] = React.useState("");
  const [clientUsername, setClientUsername] = React.useState("");
  const [clientPassword, setClientPassword] = React.useState("");
  const [clientNotes, setClientNotes] = React.useState("");
  const [selectedPlanId, setSelectedPlanId] = React.useState("");
  const [selectedPanelId, setSelectedPanelId] = React.useState("");
  const [selectedApps, setSelectedApps] = React.useState<string[]>([]);
  const [isAppsExpanded, setIsAppsExpanded] = React.useState(false);
  const [dueDate, setDueDate] = React.useState<Date | undefined>(undefined);
  const [discountValue, setDiscountValue] = React.useState("");
  const [useFixedValue, setUseFixedValue] = React.useState(false);
  const [fixedValue, setFixedValue] = React.useState("");

  // Function to reset form completely
  const resetForm = React.useCallback(() => {
    setClientName("");
    setClientPhone("");
    setClientUsername("");
    setClientPassword("");
    setClientNotes("");
    setSelectedPlanId("");
    setSelectedPanelId("");
    setSelectedApps([]);
    setIsAppsExpanded(false);
    setDueDate(undefined);
    setDiscountValue("");
    setUseFixedValue(false);
    setFixedValue("");
    setFormKey(Date.now()); // Force re-render
  }, []);

  // Clear form on component mount to prevent autocomplete issues
  React.useEffect(() => {
    resetForm();
  }, [resetForm]);

  const handleSaveClient = async () => {
    if (!resellerId) {
      alert('Erro: usuário não autenticado.');
      return;
    }
    if (!clientName.trim()) {
      alert('Informe o nome do cliente.');
      return;
    }
    if (!selectedPlanId) {
      alert('Selecione o plano do cliente.');
      return;
    }
    if (!selectedPanelId) {
      alert('Selecione o painel.');
      return;
    }
    if (!dueDate) {
      alert('Informe a data de vencimento.');
      return;
    }

    const plan = (plans || []).find(p => p.id === selectedPlanId);
    const basePrice = useFixedValue ? parseFloat(fixedValue) : (plan?.value ?? 0);
    const discount = parseFloat(discountValue || '0');
    const paymentValue = Math.max(0, (isNaN(basePrice) ? 0 : basePrice) - (isNaN(discount) ? 0 : discount));

    const newClient = {
      reseller_id: resellerId,
      name: clientName.trim(),
      start_date: format(new Date(), 'yyyy-MM-dd'),
      plan_id: selectedPlanId,
      value: paymentValue,
      status: 'active' as const,
      renewal_date: format(dueDate, 'yyyy-MM-dd'),
      phone: clientPhone.trim(),
      username: clientUsername.trim(),
      password: clientPassword.trim(),
      notes: clientNotes.trim(),
      panel_id: selectedPanelId,
      discount_value: isNaN(discount) ? 0 : discount,
      use_fixed_value: useFixedValue,
      fixed_value: isNaN(basePrice) ? 0 : basePrice,
      apps: selectedApps.length > 0 ? selectedApps : undefined,
    };

    try {
      await mysqlApi.createClient(newClient);
      await refetch();
      resetForm();
      alert('Cliente adicionado com sucesso!');
    } catch (error) {
      console.error('Error creating client:', error);
      alert('Erro ao criar cliente');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/clients">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Adicionar Cliente</h1>
            <p className="text-muted-foreground">
              Cadastre um novo cliente no sistema
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <Card key={formKey} className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5" />
            Informações do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Informações Básicas
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Cliente</Label>
                <Input
                  id="name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Digite o nome completo"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp</Label>
                <Input
                  id="phone"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="11987654321"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          {/* Service Configuration */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Configuração do Serviço
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Painel</Label>
                <Select value={selectedPanelId} onValueChange={setSelectedPanelId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um painel" />
                  </SelectTrigger>
                  <SelectContent>
                    {(panels || []).map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {(plans || []).map(pl => (
                      <SelectItem key={pl.id} value={pl.id}>
                        {pl.name} - R$ {pl.value.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Credentials */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Credenciais de Acesso
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <Input
                  id="username"
                  value={clientUsername}
                  onChange={(e) => setClientUsername(e.target.value)}
                  placeholder="Nome de usuário"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={clientPassword}
                  onChange={(e) => setClientPassword(e.target.value)}
                  placeholder="Senha de acesso"
                  autoComplete="new-password"
                />
              </div>
            </div>
          </div>

          {/* Applications */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Aplicativos em Uso
            </h3>
            
            {apps && apps.length > 0 ? (
              <div className="space-y-3">
                {/* Botão para expandir/colapsar */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAppsExpanded(!isAppsExpanded)}
                  className="w-full justify-between h-auto p-4 border-2 border-dashed hover:border-solid hover:bg-muted/50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <Smartphone className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">
                        {selectedApps.length > 0 
                          ? `Cliente usa ${selectedApps.length} aplicativo${selectedApps.length !== 1 ? 's' : ''}`
                          : 'Definir aplicativos do cliente'
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {isAppsExpanded 
                          ? 'Clique para ocultar a lista' 
                          : `Selecione quais apps o cliente utiliza`
                        }
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedApps.length > 0 && (
                      <div className="flex -space-x-1">
                        {selectedApps.slice(0, 3).map((_, index) => (
                          <div key={index} className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        ))}
                        {selectedApps.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-muted border-2 border-white flex items-center justify-center">
                            <span className="text-xs font-medium">+{selectedApps.length - 3}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {isAppsExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                </Button>

                {/* Lista expandida */}
                {isAppsExpanded && (
                  <div className="space-y-4">
                    {/* Header com ações rápidas */}
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedApps.length === apps.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedApps(apps.map(app => app.id));
                            } else {
                              setSelectedApps([]);
                            }
                          }}
                        />
                        <span className="text-sm font-medium">
                          {selectedApps.length === apps.length ? 'Desmarcar todos' : 'Selecionar todos'}
                        </span>
                      </div>
                      {selectedApps.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedApps([])}
                          className="text-xs h-7"
                        >
                          Limpar seleção
                        </Button>
                      )}
                    </div>

                    {/* Grid horizontal de aplicativos */}
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {apps.map(app => (
                        <div 
                          key={app.id} 
                          className={`relative p-4 border-2 rounded-lg transition-all cursor-pointer hover:shadow-md ${
                            selectedApps.includes(app.id)
                              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                              : 'border-border hover:border-blue-300'
                          }`}
                          onClick={() => {
                            if (selectedApps.includes(app.id)) {
                              setSelectedApps(selectedApps.filter(id => id !== app.id));
                            } else {
                              setSelectedApps([...selectedApps, app.id]);
                            }
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id={`app-${app.id}`}
                              checked={selectedApps.includes(app.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedApps([...selectedApps, app.id]);
                                } else {
                                  setSelectedApps(selectedApps.filter(id => id !== app.id));
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1 min-w-0">
                              <Label htmlFor={`app-${app.id}`} className="font-medium cursor-pointer block">
                                {app.name}
                              </Label>
                              {app.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {app.description}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* Indicador de seleção */}
                          {selectedApps.includes(app.id) && (
                            <div className="absolute top-2 right-2 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Footer com resumo */}
                    {selectedApps.length > 0 && (
                      <div className="p-3 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm text-blue-700 dark:text-blue-300">
                            Cliente utiliza {selectedApps.length} aplicativo{selectedApps.length !== 1 ? 's' : ''} para assistir IPTV
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 border-2 border-dashed rounded-lg">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                  <Smartphone className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Nenhum aplicativo cadastrado
                </p>
                <Link href="/dashboard/clients/apps">
                  <Button variant="outline" size="sm">
                    Gerenciar Aplicativos
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Payment Configuration */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Configuração de Pagamento
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Data de Vencimento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, 'dd/MM/yyyy') : 'Escolha uma data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus locale={ptBR} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Valor de Desconto</Label>
                <Input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder="0.00"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch checked={useFixedValue} onCheckedChange={setUseFixedValue} />
                <Label>Usar valor fixo</Label>
              </div>
              {useFixedValue && (
                <div className="space-y-2">
                  <Label>Valor Fixo</Label>
                  <Input
                    type="number"
                    value={fixedValue}
                    onChange={(e) => setFixedValue(e.target.value)}
                    placeholder="Valor personalizado"
                    autoComplete="off"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Observações
            </h3>
            <div className="space-y-2">
              <Label>Observações Adicionais</Label>
              <Textarea
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                placeholder="Informações adicionais sobre o cliente..."
                className="min-h-[80px]"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t">
            <Link href="/dashboard/clients">
              <Button variant="outline">Cancelar</Button>
            </Link>
            <Button onClick={handleSaveClient} className="bg-gradient-to-r from-blue-600 to-blue-700">
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Cliente
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}