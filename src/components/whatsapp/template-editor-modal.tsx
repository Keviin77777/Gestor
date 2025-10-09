"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Eye, ChevronDown } from "lucide-react";
import { WhatsAppTemplate } from "@/hooks/use-templates";
import { TEMPLATE_TYPES, TRIGGER_EVENTS, AVAILABLE_VARIABLES, insertVariable, extractVariables } from "@/lib/template-constants";

interface TemplateEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: WhatsAppTemplate | null;
  onSave: (data: any) => Promise<{ success: boolean; error?: string }>;
}

export function TemplateEditorModal({
  open,
  onOpenChange,
  template,
  onSave,
}: TemplateEditorModalProps) {
  const isEditing = !!template;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showVariables, setShowVariables] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    type: "custom" as WhatsAppTemplate["type"],
    trigger_event: "manual" as WhatsAppTemplate["trigger_event"],
    message: "",
    is_active: true,
    days_offset: null as number | null,
    send_hour: null as number | null,
    send_minute: 0,
    use_global_schedule: true,
  });

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        type: template.type,
        trigger_event: template.trigger_event,
        message: template.message,
        is_active: template.is_active,
        days_offset: template.days_offset,
        send_hour: template.send_hour,
        send_minute: template.send_minute,
        use_global_schedule: template.use_global_schedule,
      });
    } else {
      setFormData({
        name: "",
        type: "custom",
        trigger_event: "manual",
        message: "",
        is_active: true,
        days_offset: null,
        send_hour: null,
        send_minute: 0,
        use_global_schedule: true,
      });
    }
  }, [template, open]);

  const handleInsertVariable = (variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const { text, newPosition } = insertVariable(formData.message, cursorPosition, variable);
    
    setFormData(prev => ({ ...prev, message: text }));
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
    
    setShowVariables(false);
  };

  const generatePreview = () => {
    let preview = formData.message;
    
    const sampleData: Record<string, string> = {
      cliente_nome: "João Silva",
      cliente_usuario: "joao123",
      cliente_telefone: "(11) 98765-4321",
      data_vencimento: "15/11/2025",
      data_vencimento_extenso: "15 de novembro de 2025",
      dias_restantes: "7",
      dias_restantes_texto: "em 7 dias",
      ano_vencimento: "2025",
      mes_vencimento: "novembro",
      valor: "49,90",
      valor_numerico: "49.90",
      desconto: "5,00",
      valor_final: "44,90",
      plano: "Premium",
      status_cliente: "Ativo",
      data_hoje: new Date().toLocaleDateString("pt-BR"),
      hora_atual: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      senha: "******",
      link_acesso: "https://exemplo.com/acesso",
      link_pagamento: "https://exemplo.com/pagar",
    };

    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "gi");
      preview = preview.replace(regex, value);
      const simpleRegex = new RegExp(`\\{${key}\\}`, "gi");
      preview = preview.replace(simpleRegex, value);
    });

    return preview;
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    const result = await onSave(formData);
    
    setIsSaving(false);
    
    if (result.success) {
      onOpenChange(false);
    }
  };

  const detectedVariables = extractVariables(formData.message);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Template" : "Novo Template"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Edite as informações do template"
              : "Crie um novo template de mensagem"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Nome e Tipo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Template</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Lembrete Personalizado"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={formData.type}
                onValueChange={(value: WhatsAppTemplate["type"]) =>
                  setFormData(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TEMPLATE_TYPES).map(([key, { label, icon }]) => (
                    <SelectItem key={key} value={key}>
                      {icon} {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Evento */}
          <div className="space-y-2">
            <Label htmlFor="trigger">Evento Disparador</Label>
            <Select
              value={formData.trigger_event}
              onValueChange={(value: WhatsAppTemplate["trigger_event"]) =>
                setFormData(prev => ({ ...prev, trigger_event: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TRIGGER_EVENTS).map(([key, { label, description }]) => (
                  <SelectItem key={key} value={key}>
                    <div>
                      <div>{label}</div>
                      <div className="text-xs text-muted-foreground">{description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mensagem */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="message">Mensagem</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="h-7"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  {showPreview ? "Ocultar" : "Preview"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowVariables(!showVariables)}
                  className="h-7"
                >
                  Tags <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>

            <Textarea
              ref={textareaRef}
              id="message"
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Digite a mensagem do template..."
              rows={8}
              className="resize-none font-mono text-sm"
            />

            {/* Dropdown de Variáveis */}
            {showVariables && (
              <div className="border rounded-lg p-3 bg-gray-50 max-h-48 overflow-y-auto">
                <div className="text-sm font-medium mb-2">Clique para inserir:</div>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_VARIABLES.map((variable) => (
                    <button
                      key={variable.key}
                      type="button"
                      onClick={() => handleInsertVariable(variable.key)}
                      className="text-left p-2 hover:bg-white rounded border border-transparent hover:border-blue-300 transition-colors"
                    >
                      <div className="font-mono text-xs text-blue-600">
                        {`{{${variable.key}}}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {variable.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Variáveis Detectadas */}
            {detectedVariables.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-muted-foreground">Variáveis:</span>
                {detectedVariables.map((variable) => (
                  <Badge key={variable} variant="outline" className="text-xs">
                    {variable}
                  </Badge>
                ))}
              </div>
            )}

            {/* Preview */}
            {showPreview && (
              <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                <div className="text-sm font-medium mb-2 text-green-800">Preview:</div>
                <div className="whitespace-pre-wrap text-sm">{generatePreview()}</div>
              </div>
            )}
          </div>

          {/* Agendamento (para lembretes) */}
          {(formData.type.includes("reminder") || formData.trigger_event === "scheduled") && (
            <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center justify-between">
                <Label>Agendamento</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Horário Global</span>
                  <Switch
                    checked={formData.use_global_schedule}
                    onCheckedChange={(checked) =>
                      setFormData(prev => ({ ...prev, use_global_schedule: checked }))
                    }
                  />
                </div>
              </div>

              {formData.type.includes("reminder") && (
                <div className="space-y-2">
                  <Label>Dias antes/depois do vencimento</Label>
                  <Input
                    type="number"
                    value={formData.days_offset ?? ""}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        days_offset: e.target.value ? parseInt(e.target.value) : null,
                      }))
                    }
                    placeholder="Ex: 7 (antes) ou -2 (depois)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Positivo = antes do vencimento, Negativo = após vencimento, 0 = no dia
                  </p>
                </div>
              )}

              {!formData.use_global_schedule && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hora</Label>
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      value={formData.send_hour ?? ""}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          send_hour: e.target.value ? parseInt(e.target.value) : null,
                        }))
                      }
                      placeholder="0-23"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Minuto</Label>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={formData.send_minute}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          send_minute: parseInt(e.target.value) || 0,
                        }))
                      }
                      placeholder="0-59"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label>Status do Template</Label>
              <p className="text-sm text-muted-foreground">
                {formData.is_active ? "Template ativo e pronto para uso" : "Template inativo"}
              </p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData(prev => ({ ...prev, is_active: checked }))
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? "Salvar Alterações" : "Criar Template"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
