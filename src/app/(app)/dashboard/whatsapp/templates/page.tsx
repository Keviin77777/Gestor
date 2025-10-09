"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Edit,
  Copy,
  Trash2,
  Eye,
  Power,
  PowerOff,
} from "lucide-react";
import { useTemplates, WhatsAppTemplate } from "@/hooks/use-templates";
import { getTypeLabel, getTypeIcon, getTypeColor } from "@/lib/template-constants";
import { TemplateEditorModal } from "@/components/whatsapp/template-editor-modal";

export default function TemplatesPage() {
  const {
    templates,
    isLoading,
    error,
    stats,
    createTemplate,
    updateTemplate,
    toggleTemplate,
    deleteTemplate,
    duplicateTemplate,
    getPreview,
  } = useTemplates();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<{ template: WhatsAppTemplate; preview: string } | null>(null);

  // Filtrar templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || template.type === filterType;
    const matchesStatus = filterStatus === "all" || 
                         (filterStatus === "active" && template.is_active) ||
                         (filterStatus === "inactive" && !template.is_active);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleToggle = async (id: string, currentStatus: boolean) => {
    const result = await toggleTemplate(id, !currentStatus);
    if (result.success) {
      setSaveResult({
        success: true,
        message: `Template ${currentStatus ? 'desativado' : 'ativado'} com sucesso!`,
      });
    } else {
      setSaveResult({
        success: false,
        message: result.error || 'Erro ao alterar status',
      });
    }
    setTimeout(() => setSaveResult(null), 3000);
  };

  const handleDelete = async (id: string, name: string, isDefault: boolean) => {
    if (isDefault) {
      setSaveResult({
        success: false,
        message: 'Templates padrão não podem ser deletados. Desative-os se não quiser usar.',
      });
      setTimeout(() => setSaveResult(null), 3000);
      return;
    }

    if (window.confirm(`Tem certeza que deseja excluir o template "${name}"?`)) {
      const result = await deleteTemplate(id);
      if (result.success) {
        setSaveResult({
          success: true,
          message: 'Template excluído com sucesso!',
        });
      } else {
        setSaveResult({
          success: false,
          message: result.error || 'Erro ao excluir template',
        });
      }
      setTimeout(() => setSaveResult(null), 3000);
    }
  };

  const handleDuplicate = async (id: string) => {
    const result = await duplicateTemplate(id);
    if (result.success) {
      setSaveResult({
        success: true,
        message: 'Template duplicado com sucesso!',
      });
    } else {
      setSaveResult({
        success: false,
        message: result.error || 'Erro ao duplicar template',
      });
    }
    setTimeout(() => setSaveResult(null), 3000);
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (template: WhatsAppTemplate) => {
    setEditingTemplate(template);
    setIsEditorOpen(true);
  };

  const handleSave = async (data: any) => {
    const result = editingTemplate
      ? await updateTemplate(editingTemplate.id, data)
      : await createTemplate(data);

    if (result.success) {
      setSaveResult({
        success: true,
        message: editingTemplate ? 'Template atualizado com sucesso!' : 'Template criado com sucesso!',
      });
      setTimeout(() => setSaveResult(null), 3000);
    } else {
      setSaveResult({
        success: false,
        message: result.error || 'Erro ao salvar template',
      });
      setTimeout(() => setSaveResult(null), 3000);
    }

    return result;
  };

  const handlePreview = async (template: WhatsAppTemplate) => {
    const result = await getPreview(template.id);
    if (result.success) {
      setPreviewTemplate({ template, preview: result.preview || '' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Templates WhatsApp
          </h1>
          <p className="text-muted-foreground">
            Gerencie templates de mensagens automáticas e manuais
          </p>
        </div>
        
        <Button className="gap-2" onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          Novo Template
        </Button>
      </div>

      {/* Resultado das ações */}
      {saveResult && (
        <Alert variant={saveResult.success ? "default" : "destructive"}>
          {saveResult.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertDescription>{saveResult.message}</AlertDescription>
        </Alert>
      )}

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">templates cadastrados</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">em uso</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Padrão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.default}</div>
            <p className="text-xs text-muted-foreground">do sistema</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Personalizados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.custom}</div>
            <p className="text-xs text-muted-foreground">criados por você</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Busca */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Filtro por Tipo */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">Todos os tipos</option>
              <option value="welcome">Boas-vindas</option>
              <option value="invoice">Fatura</option>
              <option value="renewal">Renovação</option>
              <option value="reminder_before">Lembrete (Antes)</option>
              <option value="reminder_due">Vencimento</option>
              <option value="reminder_after">Lembrete (Após)</option>
              <option value="custom">Personalizado</option>
            </select>
            
            {/* Filtro por Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Templates ({filteredTemplates.length})</CardTitle>
          <CardDescription>
            Gerencie seus templates de mensagens
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando templates...</p>
              </div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterType !== "all" || filterStatus !== "all"
                  ? "Nenhum template encontrado com os filtros aplicados"
                  : "Nenhum template cadastrado"}
              </p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Template
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Nome</th>
                    <th className="text-left p-3 font-medium">Tipo</th>
                    <th className="text-center p-3 font-medium">Mídia</th>
                    <th className="text-center p-3 font-medium">Padrão</th>
                    <th className="text-center p-3 font-medium">Status</th>
                    <th className="text-right p-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTemplates.map((template) => (
                    <tr key={template.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{getTypeIcon(template.type)}</span>
                          <div>
                            <div className="font-medium">{template.name}</div>
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {template.message.substring(0, 60)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={`bg-${getTypeColor(template.type)}-50`}>
                          {getTypeLabel(template.type)}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={template.has_media ? "default" : "secondary"}>
                          {template.has_media ? "SIM" : "NÃO"}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        {template.is_default ? (
                          <Badge variant="outline" className="bg-blue-50">✓</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggle(template.id, template.is_active)}
                          className="h-8 w-8 p-0"
                        >
                          {template.is_active ? (
                            <Power className="h-4 w-4 text-green-600" />
                          ) : (
                            <PowerOff className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handlePreview(template)}
                            title="Visualizar preview"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEdit(template)}
                            title="Editar template"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleDuplicate(template.id)}
                            title="Duplicar template"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(template.id, template.name, template.is_default)}
                            title="Excluir template"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criação/Edição */}
      <TemplateEditorModal
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        template={editingTemplate}
        onSave={handleSave}
      />

      {/* Modal de Preview */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Preview: {previewTemplate.template.name}</DialogTitle>
              <DialogDescription>
                Visualização com dados de exemplo
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="whitespace-pre-wrap">{previewTemplate.preview}</div>
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Tipo:</strong> {getTypeLabel(previewTemplate.template.type)}
                <br />
                <strong>Evento:</strong> {previewTemplate.template.trigger_event}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
                Fechar
              </Button>
              <Button onClick={() => {
                setPreviewTemplate(null);
                handleEdit(previewTemplate.template);
              }}>
                Editar Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
