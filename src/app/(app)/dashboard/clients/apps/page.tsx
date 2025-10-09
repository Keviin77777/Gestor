"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft, 
  Smartphone, 
  PlusCircle, 
  Edit, 
  Trash2, 
  Search, 
  Grid, 
  List, 
  Eye,
  MoreVertical
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useMySQL } from '@/lib/mysql-provider';
import { mysqlApi } from '@/lib/mysql-api-client';
import type { App } from "@/lib/definitions";

export default function AppsPage() {
  const { user } = useMySQL();
  const resellerId = user?.id;

  // Show loading state if user is not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  // Collections

  const [apps, setApps] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    const load = async () => {
      if (!resellerId) return;
      setIsLoading(true);
      try {
        const data = await mysqlApi.getApps();
        setApps(data);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [resellerId]);

  // View states
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<App | null>(null);
  const [appName, setAppName] = useState('');
  const [appDescription, setAppDescription] = useState('');

  const resetForm = () => {
    setAppName('');
    setAppDescription('');
  };

  // Filtered apps
  const filteredApps = useMemo(() => {
    if (!apps) return [];
    return apps.filter((app: any) => 
      app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.description && app.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [apps, searchTerm]);

  const handleAddApp = async () => {
    if (!resellerId) {
      alert('Erro: usuário não autenticado.');
      return;
    }
    if (!appName.trim()) {
      alert('Informe o nome do aplicativo.');
      return;
    }

    const payload = { name: appName.trim(), description: appDescription.trim() || undefined };
    const created = await mysqlApi.createApp(payload);
    // Garantir que descrição esteja presente no objeto local
    const normalized = { ...created, description: created.description ?? created.notes ?? payload.description };
    setApps(prev => [normalized, ...prev]);
    resetForm();
    setIsAddDialogOpen(false);
  };

  const handleEditApp = (app: App) => {
    setEditingApp(app);
    setAppName(app.name);
    setAppDescription(app.description || '');
    setIsEditDialogOpen(true);
  };

  const handleUpdateApp = async () => {
    if (!resellerId) {
      alert('Erro: dados não encontrados.');
      return;
    }
    if (!appName.trim()) {
      alert('Informe o nome do aplicativo.');
      return;
    }

    const updatedApp: any = {
      name: appName.trim(),
    };

    // Só adiciona descrição se não estiver vazia
    if (appDescription.trim()) {
      updatedApp.description = appDescription.trim();
    }

    if (!editingApp) return;
    await mysqlApi.updateApp(editingApp.id as any, updatedApp);
    setApps(prev => prev.map(a => a.id === (editingApp as any).id ? { ...a, ...updatedApp } : a));
    resetForm();
    setIsEditDialogOpen(false);
    setEditingApp(null);
  };

  const handleDeleteApp = async (app: App) => {
    if (!resellerId) {
      alert('Erro: usuário não autenticado.');
      return;
    }

    const confirmDelete = window.confirm(`Tem certeza que deseja excluir o aplicativo "${app.name}"? Esta ação não pode ser desfeita.`);
    if (!confirmDelete) return;

    await mysqlApi.deleteApp((app as any).id);
    setApps(prev => prev.filter(a => a.id !== (app as any).id));
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
            <h1 className="text-3xl font-bold tracking-tight">Aplicativos IPTV</h1>
            <p className="text-muted-foreground">
              Cadastre os aplicativos que seus clientes utilizam para assistir IPTV
            </p>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Seus Aplicativos
                {filteredApps.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filteredApps.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Cadastre os aplicativos que seus clientes utilizam</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-lg">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="rounded-r-none"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-l-none"
                >
                  <Grid className="h-4 w-4" />
                </Button>
              </div>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Novo App
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar aplicativos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">Carregando aplicativos...</span>
            </div>
          )}

          {/* Table View */}
          {!isLoading && viewMode === 'table' && (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aplicativo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApps.map((app: any) => (
                    <TableRow key={app.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <Smartphone className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="font-medium">{app.name}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate text-sm text-muted-foreground">
                          {app.description || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditApp(app)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteApp(app)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Grid View */}
          {!isLoading && viewMode === 'grid' && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredApps.map((app: any) => (
                <Card key={app.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                          <Smartphone className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{app.name}</CardTitle>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditApp(app)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteApp(app)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {app.description && (
                      <p className="text-sm text-muted-foreground">
                        {app.description}
                      </p>
                    )}
                    
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditApp(app)}
                        className="flex-1"
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteApp(app)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredApps.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Smartphone className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {apps && apps.length > 0 ? 'Nenhum aplicativo encontrado' : 'Nenhum aplicativo cadastrado'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {apps && apps.length > 0 
                  ? 'Tente ajustar os filtros de busca' 
                  : 'Cadastre os aplicativos que seus clientes utilizam'
                }
              </p>
              {(!apps || apps.length === 0) && (
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Adicionar Aplicativo
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add App Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Adicionar Aplicativo</DialogTitle>
            <DialogDescription>
              Cadastre aplicativos que seus clientes utilizam para assistir IPTV
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="app-name">Nome do Aplicativo</Label>
              <Input
                id="app-name"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="Ex: IPTV Smarters Pro"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="app-description">Descrição (opcional)</Label>
              <Textarea
                id="app-description"
                value={appDescription}
                onChange={(e) => setAppDescription(e.target.value)}
                placeholder="Breve descrição do aplicativo..."
                className="min-h-[80px]"
                autoComplete="off"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleAddApp}>
              Adicionar Aplicativo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit App Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Aplicativo</DialogTitle>
            <DialogDescription>
              Edite as informações do aplicativo {editingApp?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-app-name">Nome do Aplicativo</Label>
              <Input
                id="edit-app-name"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="Ex: IPTV Smarters Pro"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-app-description">Descrição (opcional)</Label>
              <Textarea
                id="edit-app-description"
                value={appDescription}
                onChange={(e) => setAppDescription(e.target.value)}
                placeholder="Breve descrição do aplicativo..."
                className="min-h-[80px]"
                autoComplete="off"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); resetForm(); setEditingApp(null); }}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateApp}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

