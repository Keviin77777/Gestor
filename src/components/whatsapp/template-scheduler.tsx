"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, Bell, Save, Settings } from "lucide-react";

interface TemplateSchedulerProps {
  templateId?: string;
  initialSchedule?: {
    useGlobalSchedule: boolean;
    sendHour: number;
    sendMinute: number;
  };
  onScheduleChange?: (schedule: {
    useGlobalSchedule: boolean;
    sendHour: number;
    sendMinute: number;
  }) => void;
  globalSettings?: {
    startHour: number;
    endHour: number;
    workingDays: string;
  };
}

export function TemplateScheduler({
  templateId,
  initialSchedule = {
    useGlobalSchedule: true,
    sendHour: 9,
    sendMinute: 0,
  },
  onScheduleChange,
  globalSettings = {
    startHour: 8,
    endHour: 18,
    workingDays: "Seg-Sáb",
  },
}: TemplateSchedulerProps) {
  const [schedule, setSchedule] = useState(initialSchedule);
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleScheduleChange = (newSchedule: typeof schedule) => {
    setSchedule(newSchedule);
    onScheduleChange?.(newSchedule);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveResult(null);

    try {
      // Em produção, isso seria salvo via API
      // Por enquanto, apenas simula o salvamento
      setSaveResult({
        success: true,
        message: 'Agendamento salvo com sucesso!',
      });

      setTimeout(() => setSaveResult(null), 3000);
    } catch (error) {
      setSaveResult({
        success: false,
        message: 'Erro ao salvar agendamento',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (hour: number, minute: number) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Agendamento do Template
        </CardTitle>
        <CardDescription>
          Configure quando este lembrete deve ser enviado
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {saveResult && (
          <Alert variant={saveResult.success ? "default" : "destructive"}>
            <AlertDescription>{saveResult.message}</AlertDescription>
          </Alert>
        )}

        {/* Toggle Global/Específico */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label className="text-base font-medium">Tipo de Agendamento</Label>
            <p className="text-sm text-muted-foreground">
              {schedule.useGlobalSchedule
                ? "Usar configurações globais do sistema"
                : "Usar horário específico para este template"
              }
            </p>
          </div>
          <Switch
            checked={schedule.useGlobalSchedule}
            onCheckedChange={(checked) =>
              handleScheduleChange({ ...schedule, useGlobalSchedule: checked })
            }
          />
        </div>

        {/* Configuração Global */}
        {schedule.useGlobalSchedule ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-800">Horário Global Ativo</span>
            </div>
            <div className="text-sm text-green-700 space-y-1">
              <p><strong>Horário:</strong> {globalSettings.startHour}:00 às {globalSettings.endHour}:00</p>
              <p><strong>Dias:</strong> {globalSettings.workingDays}</p>
              <p className="text-xs mt-2 opacity-75">
                Este template seguirá as configurações globais definidas nas configurações do sistema.
              </p>
            </div>
          </div>
        ) : (
          /* Configuração Específica */
          <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">Horário Específico</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="send-hour">Hora</Label>
                <Select
                  value={schedule.sendHour.toString()}
                  onValueChange={(value) =>
                    handleScheduleChange({ ...schedule, sendHour: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {i.toString().padStart(2, '0')}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="send-minute">Minuto</Label>
                <Select
                  value={schedule.sendMinute.toString()}
                  onValueChange={(value) =>
                    handleScheduleChange({ ...schedule, sendMinute: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i * 5).map(minute => (
                      <SelectItem key={minute} value={minute.toString()}>
                        :{minute.toString().padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-3 bg-white border border-blue-300 rounded text-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-blue-800">Resumo do Agendamento:</span>
                <span className="text-lg font-mono text-blue-900">
                  {formatTime(schedule.sendHour, schedule.sendMinute)}
                </span>
              </div>
              <div className="text-xs text-blue-600 space-y-1">
                <p>• O lembrete será enviado todos os dias às {formatTime(schedule.sendHour, schedule.sendMinute)}</p>
                <p>• Respeitará os dias da semana configurados globalmente ({globalSettings.workingDays})</p>
                <p>• Será enviado apenas nos dias que o cliente tem vencimento programado</p>
              </div>
            </div>
          </div>
        )}

        {/* Botão Salvar */}
        {templateId && (
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar Agendamento
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Hook para gerenciar agendamentos de templates (usando dados do banco)
export function useTemplateScheduler(templateId?: string) {
  const [schedule, setSchedule] = useState({
    useGlobalSchedule: true,
    sendHour: 9,
    sendMinute: 0,
  });

  const saveSchedule = (newSchedule: typeof schedule) => {
    setSchedule(newSchedule);
    // Em produção, isso salvaria via API
    // A página de templates já faz isso através da API
  };

  const getScheduleForTime = (currentTime: Date) => {
    if (schedule.useGlobalSchedule) {
      return null; // Use global settings
    }

    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const targetTime = schedule.sendHour * 60 + schedule.sendMinute;
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    // Allow sending within 5 minutes of scheduled time
    const timeDiff = Math.abs(currentTimeMinutes - targetTime);
    return timeDiff <= 5;
  };

  return {
    schedule,
    setSchedule: saveSchedule,
    getScheduleForTime,
    canSendNow: (currentTime: Date = new Date()) => getScheduleForTime(currentTime),
  };
}