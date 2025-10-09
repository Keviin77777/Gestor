"use client";

import { useEffect } from 'react';
import { useAutoReminders } from '@/hooks/use-auto-reminders';

/**
 * Componente invisível que processa lembretes automáticos em background
 * Deve ser incluído no layout principal para funcionar em todas as páginas
 */
export function AutoReminderProcessor() {
  const { isProcessing, getStatus } = useAutoReminders({
    enabled: false, // ✅ DESABILITADO - Agora usa cron job no backend (api/cron/auto-process-reminders.php)
    onReminderSent: (client, template, log) => {
      console.log(`✅ Lembrete enviado: ${client.name} - ${template.name}`);
    },
    onReminderFailed: (client, template, error) => {
      console.error(`❌ Falha ao enviar lembrete: ${client.name} - ${template.name}`, error);
    },
    onError: (error) => {
      console.error('❌ Erro no processamento de lembretes:', error);
    }
  });

  useEffect(() => {
    const status = getStatus();
    console.log('🔄 Auto Reminder Processor iniciado:', {
      enabled: status.enabled,
      canSendNow: status.canSendNow,
      checkInterval: status.checkInterval,
      dailyLimit: status.dailyLimit,
      processedToday: status.processedTodayCount
    });
  }, []);

  // Componente invisível - não renderiza nada
  return null;
}
