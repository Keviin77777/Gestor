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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Settings,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageCircle,
  Zap,
} from "lucide-react";

interface WhatsAppSettings {
  autoSendBilling: boolean;
  autoSendReminders: boolean;
  reminderDaysBefore: number;
  rateLimitPerMinute: number;
  defaultCountryCode: string;
  businessHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export default function WhatsAppSettingsPage() {
  const [settings, setSettings] = useState<WhatsAppSettings>({
    autoSendBilling: true,
    autoSendReminders: true,
    reminderDaysBefore: 3,
    rateLimitPerMinute: 10,
    defaultCountryCode: '55',
    businessHours: {
      enabled: false,
      start: '09:00',
      end: '18:00',
    },
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveResult(null);

    try {
      // Simular salvamento das configurações
      // Em produção, isso salvaria no banco de dados ou localStorage
      localStorage.setItem('whatsapp-settings', JSON.stringify(settings));
      
      setSaveResult({
        success: true,
        message: 'Configurações salvas com sucesso!',
      });

      // Limpar mensagem após 3 segundos
      setTimeout(() => {
        setSaveResult(null);
      }, 3000);
    } catch (error) {
      setSaveResult({
        success: false,
        message: 'Erro ao salvar configurações',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const defaultSettings: WhatsAppSettings = {
      autoSendBilling: true,
      autoSendReminders: true,
      reminderDaysBefore: 3,
      rateLimitPerMinute: 10,
      defaultCountryCode: '55',
      businessHours: {
        enabled: false,
        start: '09:00',
        end: '18:00',
      },
    };
    setSettings(defaultSettings);
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
          Configurações do WhatsApp
        </h1>
        <p className="text-muted-foreground">
          Configure as opções de automação e integração do WhatsApp
        </p>
      </div>

      {/* Resultado do salvamento */}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configurações de Automação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              Automação
            </CardTitle>
            <CardDescription>
              Configure o envio automático de mensagens
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Envio Automático de Cobranças</Label>
                <p className="text-sm text-muted-foreground">
                  Enviar cobrança automaticamente ao gerar fatura
                </p>
              </div>
              <Switch
                checked={settings.autoSendBilling}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({ ...prev, autoSendBilling: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Lembretes Automáticos</Label>
                <p className="text-sm text-muted-foreground">
                  Enviar lembretes antes do vencimento
                </p>
              </div>
              <Switch
                checked={settings.autoSendReminders}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({ ...prev, autoSendReminders: checked }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reminderDays">Dias antes do vencimento</Label>
              <Select
                value={settings.reminderDaysBefore.toString()}
                onValueChange={(value) =>
                  setSettings(prev => ({ ...prev, reminderDaysBefore: parseInt(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 dia</SelectItem>
                  <SelectItem value="2">2 dias</SelectItem>
                  <SelectItem value="3">3 dias</SelectItem>
                  <SelectItem value="5">5 dias</SelectItem>
                  <SelectItem value="7">7 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rateLimit">Limite de mensagens por minuto</Label>
              <Input
                id="rateLimit"
                type="number"
                min="1"
                max="60"
                value={settings.rateLimitPerMinute}
                onChange={(e) =>
                  setSettings(prev => ({ ...prev, rateLimitPerMinute: parseInt(e.target.value) || 10 }))
                }
              />
            </div>
          </CardContent>
        </Card>



        {/* Configurações Regionais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-purple-600" />
              Configurações Regionais
            </CardTitle>
            <CardDescription>
              Configure opções específicas da região
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="countryCode">Código do País Padrão</Label>
              <Select
                value={settings.defaultCountryCode}
                onValueChange={(value) =>
                  setSettings(prev => ({ ...prev, defaultCountryCode: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="55">🇧🇷 Brasil (+55)</SelectItem>
                  <SelectItem value="1">🇺🇸 Estados Unidos (+1)</SelectItem>
                  <SelectItem value="34">🇪🇸 Espanha (+34)</SelectItem>
                  <SelectItem value="351">🇵🇹 Portugal (+351)</SelectItem>
                  <SelectItem value="44">🇬🇧 Reino Unido (+44)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Horário Comercial */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              Horário Comercial
            </CardTitle>
            <CardDescription>
              Configure horários para envio de mensagens
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Respeitar Horário Comercial</Label>
                <p className="text-sm text-muted-foreground">
                  Enviar mensagens apenas no horário configurado
                </p>
              </div>
              <Switch
                checked={settings.businessHours.enabled}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({
                    ...prev,
                    businessHours: { ...prev.businessHours, enabled: checked }
                  }))
                }
              />
            </div>

            {settings.businessHours.enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Início</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={settings.businessHours.start}
                    onChange={(e) =>
                      setSettings(prev => ({
                        ...prev,
                        businessHours: { ...prev.businessHours, start: e.target.value }
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">Fim</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={settings.businessHours.end}
                    onChange={(e) =>
                      setSettings(prev => ({
                        ...prev,
                        businessHours: { ...prev.businessHours, end: e.target.value }
                      }))
                    }
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ações */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={isSaving}
        >
          Restaurar Padrões
        </Button>
        
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="gap-2"
        >
          {isSaving ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
}