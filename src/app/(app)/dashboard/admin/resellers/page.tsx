'use client';

import { useState, useEffect } from 'react';
import { useAdminResellers, type Reseller, type CreateResellerData, type UpdateResellerData } from '@/hooks/use-admin-resellers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Pencil, Trash2, Users, Calendar, AlertCircle } from 'lucide-react';
// import { toast } from 'sonner';
const toast = {
  success: (msg: string) => alert(msg),
  error: (msg: string) => alert(msg),
};

interface Plan {
  id: string;
  name: string;
  price: string;
  duration_days: number;
}

export default function AdminResellersPage() {
  const { resellers, loading, createReseller, updateReseller, deleteReseller } = useAdminResellers();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedReseller, setSelectedReseller] = useState<Reseller | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);

  const [formData, setFormData] = useState<CreateResellerData>({
    email: '',
    password: '',
    display_name: '',
    phone: '',
    is_active: true,
    is_admin: false,
    subscription_expiry_date: '',
    subscription_plan_id: '',
  });

  // Buscar planos disponíveis na inicialização
  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreate = async () => {
    try {
      setIsSubmitting(true);
      // Garantir que novas revendas nunca sejam criadas como admin
      const dataToCreate = { ...formData, is_admin: false };
      await createReseller(dataToCreate);
      toast.success('Revenda criada com sucesso!');
      setIsCreateModalOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar revenda');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedReseller) return;

    try {
      setIsSubmitting(true);
      const updateData: UpdateResellerData = {
        id: selectedReseller.id,
        email: formData.email,
        display_name: formData.display_name,
        phone: formData.phone || undefined,
        is_active: formData.is_active,
        // Preservar o is_admin original - não permitir alteração
        is_admin: selectedReseller.is_admin,
        subscription_expiry_date: formData.subscription_expiry_date || undefined,
        subscription_plan_id: formData.subscription_plan_id || undefined,
      };

      if (formData.password) {
        updateData.password = formData.password;
      }

      await updateReseller(updateData);
      toast.success('Revenda atualizada com sucesso!');
      setIsEditModalOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar revenda');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja deletar a revenda "${name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await deleteReseller(id);
      toast.success('Revenda deletada com sucesso!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao deletar revenda');
    }
  };

  const fetchPlans = async () => {
    try {
      console.log('Buscando planos...');
      const response = await fetch('/api/reseller-subscription-plans');
      
      if (response.ok) {
        const data = await response.json();
        console.log('Planos recebidos:', data);
        
        if (data.plans && data.plans.length > 0) {
          setPlans(data.plans);
          return;
        }
      }
      
      // Fallback para planos padrão se a API falhar ou não retornar dados
      console.log('Usando planos fallback');
      setPlans([
        { id: 'plan_trial', name: 'Trial 3 Dias', price: '0.00', duration_days: 3 },
        { id: 'plan_monthly', name: 'Plano Mensal', price: '39.90', duration_days: 30 },
        { id: 'plan_semester', name: 'Plano Semestral', price: '200.00', duration_days: 180 },
        { id: 'plan_annual', name: 'Plano Anual', price: '380.00', duration_days: 365 }
      ]);
    } catch (error) {
      console.error('Erro ao buscar planos:', error);
      // Fallback para planos padrão
      setPlans([
        { id: 'plan_trial', name: 'Trial 3 Dias', price: '0.00', duration_days: 3 },
        { id: 'plan_monthly', name: 'Plano Mensal', price: '39.90', duration_days: 30 },
        { id: 'plan_semester', name: 'Plano Semestral', price: '200.00', duration_days: 180 },
        { id: 'plan_annual', name: 'Plano Anual', price: '380.00', duration_days: 365 }
      ]);
    }
  };

  const openCreateModal = () => {
    fetchPlans(); // Recarregar planos ao abrir modal de criação
    setIsCreateModalOpen(true);
  };

  const openEditModal = (reseller: Reseller) => {
    fetchPlans(); // Recarregar planos ao abrir modal de edição
    setSelectedReseller(reseller);
    setFormData({
      email: reseller.email,
      password: '',
      display_name: reseller.display_name,
      phone: reseller.phone || '',
      is_active: reseller.is_active,
      is_admin: reseller.is_admin,
      subscription_expiry_date: reseller.subscription_expiry_date || '',
      subscription_plan_id: reseller.subscription_plan_id || '',
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      display_name: '',
      phone: '',
      is_active: true,
      is_admin: false,
      subscription_expiry_date: '',
      subscription_plan_id: '',
    });
    setSelectedReseller(null);
  };

  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'active':
        return <Badge className="bg-green-500">Ativa</Badge>;
      case 'expiring_soon':
        return <Badge className="bg-yellow-500">Vence em breve</Badge>;
      case 'expired':
        return <Badge className="bg-red-500">Vencida</Badge>;
      case 'no_subscription':
        return <Badge variant="outline">Sem assinatura</Badge>;
      default:
        return <Badge variant="outline">{health}</Badge>;
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Não definido';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Revendas</h1>
          <p className="text-muted-foreground">Administre todas as revendas do sistema</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Revenda
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Revendas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resellers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revendas Ativas</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {resellers.filter(r => r.is_active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinaturas Vencendo</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {resellers.filter(r => r.subscription_health === 'expiring_soon' || r.subscription_health === 'expired').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Revendas</CardTitle>
          <CardDescription>Visualize e gerencie todas as revendas cadastradas</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plano Atual</TableHead>
                <TableHead>Assinatura</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Clientes</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resellers.map((reseller) => (
                <TableRow key={reseller.id}>
                  <TableCell className="font-medium">{reseller.display_name}</TableCell>
                  <TableCell>{reseller.email}</TableCell>
                  <TableCell>{reseller.phone || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={reseller.is_active ? 'default' : 'secondary'}>
                      {reseller.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {reseller.plan_name ? (
                      <div className="flex flex-col">
                        <span className="font-medium">{reseller.plan_name}</span>
                        <span className="text-sm text-muted-foreground">
                          R$ {reseller.plan_price} • {reseller.plan_duration} dias
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Sem plano</span>
                    )}
                  </TableCell>
                  <TableCell>{getHealthBadge(reseller.subscription_health)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {formatDate(reseller.subscription_expiry_date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{reseller.active_clients} ativos</div>
                      <div className="text-muted-foreground">{reseller.total_clients} total</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {reseller.is_admin && <Badge variant="outline">Admin</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditModal(reseller)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!reseller.is_admin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(reseller.id, reseller.display_name)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Criar */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Revenda</DialogTitle>
            <DialogDescription>Crie uma nova revenda no sistema</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="display_name">Nome *</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="Nome da revenda"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Senha forte"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone (WhatsApp)</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="5511999999999"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subscription_plan_id">Plano de Assinatura</Label>
                <Select
                  value={formData.subscription_plan_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, subscription_plan_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem plano</SelectItem>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - R$ {plan.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subscription_expiry_date">Data de Vencimento</Label>
                <Input
                  id="subscription_expiry_date"
                  type="date"
                  value={formData.subscription_expiry_date}
                  onChange={(e) => setFormData({ ...formData, subscription_expiry_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Ativo</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Revenda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Revenda</DialogTitle>
            <DialogDescription>Atualize os dados da revenda</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_display_name">Nome</Label>
                <Input
                  id="edit_display_name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_email">Email</Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_password">Nova Senha (deixe vazio para não alterar)</Label>
                <Input
                  id="edit_password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Nova senha"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_phone">Telefone (WhatsApp)</Label>
                <Input
                  id="edit_phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_subscription_plan_id">Plano de Assinatura</Label>
                <Select
                  value={formData.subscription_plan_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, subscription_plan_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem plano</SelectItem>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - R$ {plan.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_subscription_expiry_date">Data de Vencimento</Label>
                <Input
                  id="edit_subscription_expiry_date"
                  type="date"
                  value={formData.subscription_expiry_date}
                  onChange={(e) => setFormData({ ...formData, subscription_expiry_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit_is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="edit_is_active">Ativo</Label>
              </div>
              {selectedReseller?.is_admin && (
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="bg-blue-50">
                    Administrador do Sistema
                  </Badge>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
