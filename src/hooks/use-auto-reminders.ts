import { useEffect, useCallback, useState } from 'react';
import { useClients } from './use-clients';
import { useTemplates, type WhatsAppTemplate } from './use-templates';
import { useReminderSettings } from './use-reminder-settings';
import { differenceInDays, parseISO, format, isToday, isBefore, isAfter } from 'date-fns';
import { MessageProcessor } from '@/lib/whatsapp-reminder-variables';
import { mysqlApi } from '@/lib/mysql-api-client';
import type { Client } from '@/lib/definitions';
import type { ReminderLog } from './use-reminder-history';

// Type alias for reminder templates
type ReminderTemplate = WhatsAppTemplate;

interface AutoReminderOptions {
    enabled?: boolean;
    onReminderSent?: (client: Client, template: ReminderTemplate, log: ReminderLog) => void;
    onReminderFailed?: (client: Client, template: ReminderTemplate, error: string) => void;
    onError?: (error: string) => void;
}

interface ReminderToSend {
    client: Client;
    template: ReminderTemplate;
    daysUntilDue: number;
    scheduledDate: string;
    message: string;
}

export function useAutoReminders(options: AutoReminderOptions = {}) {
    const {
        enabled = true,
        onReminderSent,
        onReminderFailed,
        onError
    } = options;

    const { data: clients } = useClients();
    const { templates, getActiveTemplates } = useTemplates();
    const { settings, canSendReminder, getNextValidTime, isWorkingDay } = useReminderSettings();
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastProcessTime, setLastProcessTime] = useState<number>(0);
    const [processedToday, setProcessedToday] = useState<Set<string>>(new Set());

    const checkExistingLog = useCallback(async (clientId: string, templateId: string, scheduledDate: string): Promise<boolean> => {
        try {
            const params = new URLSearchParams({
                client_id: clientId,
                template_id: templateId,
                date_from: scheduledDate,
                date_to: scheduledDate,
                limit: '1'
            });

            const response = await mysqlApi.getReminderLogs(Object.fromEntries(params));
            return response.logs.length > 0;
        } catch (error) {
            console.error('Error checking existing log:', error);
            return false; // Assume no log exists if check fails
        }
    }, []);

    const createReminderLog = useCallback(async (reminder: ReminderToSend): Promise<ReminderLog | null> => {
        try {
            const logData = {
                client_id: reminder.client.id,
                template_id: reminder.template.id,
                message_content: reminder.message,
                scheduled_date: reminder.scheduledDate,
                status: 'pending' as const
            };

            const log = await mysqlApi.createReminderLog(logData);

            return log;
        } catch (error) {
            console.error('Error creating reminder log:', error);
            return null;
        }
    }, []);

    const updateLogStatus = useCallback(async (logId: string, status: ReminderLog['status'], errorMessage?: string, whatsappMessageId?: string) => {
        try {
            const updateData: any = { status };
            
            if (errorMessage) {
                updateData.error_message = errorMessage;
            }
            
            if (whatsappMessageId) {
                updateData.whatsapp_message_id = whatsappMessageId;
            }
            
            if (status === 'sent') {
                updateData.sent_at = new Date().toISOString();
            }

            await mysqlApi.updateReminderLog(logId, updateData);
        } catch (error) {
            console.error('Error updating log status:', error);
        }
    }, []);

    const sendReminder = useCallback(async (reminder: ReminderToSend): Promise<{ success: boolean; error?: string; messageId?: string }> => {
        try {
            // Create log entry first
            const log = await createReminderLog(reminder);
            if (!log) {
                return { success: false, error: 'Failed to create log entry' };
            }

            // Send WhatsApp message
            if (reminder.client.phone && reminder.client.phone.trim()) {
                try {
                    // Format phone number
                    const formatPhone = (phone: string): string => {
                        const cleaned = phone.replace(/\D/g, '');
                        let number = cleaned;
                        if (number.startsWith('55') && number.length > 11) {
                            number = number.substring(2);
                        }
                        if (number.length > 11) {
                            number = number.substring(number.length - 11);
                        }
                        if (number.length === 11 || number.length === 10) {
                            return '55' + number;
                        }
                        return cleaned;
                    };

                    const formattedPhone = formatPhone(reminder.client.phone);

                    // Send direct text message (not billing template)
                    const response = await fetch(
                        `${process.env.NEXT_PUBLIC_WHATSAPP_API_URL}/message/sendText/gestplay-instance`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': process.env.NEXT_PUBLIC_WHATSAPP_API_KEY || 'gestplay-api-key-2024',
                            },
                            body: JSON.stringify({
                                number: formattedPhone,
                                text: reminder.message,
                            }),
                        }
                    );

                    if (!response.ok) {
                        throw new Error(`WhatsApp API error: ${response.status}`);
                    }

                    const result = await response.json();
                    const messageId = result?.key?.id || result?.messageId;

                    // Update log as sent
                    await updateLogStatus(log.id, 'sent', undefined, messageId);
                    
                    onReminderSent?.(reminder.client, reminder.template, log);
                    
                    return { success: true, messageId };
                } catch (whatsappError) {
                    const errorMessage = whatsappError instanceof Error ? whatsappError.message : 'WhatsApp send failed';
                    
                    // Update log as failed
                    await updateLogStatus(log.id, 'failed', errorMessage);
                    
                    onReminderFailed?.(reminder.client, reminder.template, errorMessage);
                    
                    return { success: false, error: errorMessage };
                }
            } else {
                const errorMessage = 'Client has no phone number';
                
                // Update log as failed
                await updateLogStatus(log.id, 'failed', errorMessage);
                
                onReminderFailed?.(reminder.client, reminder.template, errorMessage);
                
                return { success: false, error: errorMessage };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            onReminderFailed?.(reminder.client, reminder.template, errorMessage);
            return { success: false, error: errorMessage };
        }
    }, [createReminderLog, updateLogStatus, onReminderSent, onReminderFailed]);

    const calculateRemindersToSend = useCallback(async (): Promise<ReminderToSend[]> => {
        if (!clients || !templates || !settings) {
            console.log('Missing data:', { clients: !!clients, templates: !!templates, settings: !!settings });
            return [];
        }

        const activeTemplates = getActiveTemplates();
        if (activeTemplates.length === 0) {
            console.log('No active templates found');
            return [];
        }

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const todayString = format(now, 'yyyy-MM-dd');
        const remindersToSend: ReminderToSend[] = [];

        console.log(`Calculating reminders: ${activeTemplates.length} active templates, ${clients.length} clients, current time: ${currentHour}:${currentMinute}`);

        for (const client of clients) {
            if (client.status !== 'active') {
                continue;
            }

            const renewalDate = parseISO(client.renewal_date);
            // Use date-only comparison to match MySQL DATEDIFF behavior
            const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const renewalDateOnly = new Date(renewalDate.getFullYear(), renewalDate.getMonth(), renewalDate.getDate());
            const daysUntilDue = differenceInDays(renewalDateOnly, todayDate);

            for (const template of activeTemplates) {
                let shouldSend = false;
                let scheduledDate = todayString;

                // Check if this reminder should be sent today
                if (template.type === 'reminder_before' && daysUntilDue === template.days_offset) {
                    shouldSend = true;
                } else if (template.type === 'reminder_due' && daysUntilDue === 0) {
                    shouldSend = true;
                } else if (template.type === 'reminder_after' && daysUntilDue === template.days_offset) {
                    shouldSend = true; // days_offset is negative for 'after' type
                }

                console.log(`Client ${client.name}, Template ${template.name}: daysUntilDue=${daysUntilDue}, offset=${template.days_offset}, type=${template.type}, shouldSend=${shouldSend}`);

                if (shouldSend) {
                    // Check if it's the right time to send this template
                    let canSendNow = false;
                    
                    if (template.use_global_schedule ?? true) {
                        // Use global schedule settings
                        canSendNow = canSendReminder(now);
                        console.log(`Template ${template.name} using global schedule: canSend=${canSendNow}`);
                    } else {
                        // Use template-specific schedule from database
                        if (template.send_hour !== null && template.send_hour !== undefined) {
                            const templateHour = template.send_hour;
                            const templateMinute = template.send_minute || 0;
                            
                            // Check if current time matches template schedule (within 5 minutes window)
                            const targetTime = templateHour * 60 + templateMinute;
                            const currentTime = currentHour * 60 + currentMinute;
                            
                            // Allow sending within 5 minutes of scheduled time
                            const isAfterTarget = currentTime >= targetTime;
                            const timeDiff = currentTime - targetTime;
                            canSendNow = isAfterTarget && timeDiff <= 5;
                            
                            console.log(`Template ${template.name}: targetTime=${templateHour}:${templateMinute.toString().padStart(2, '0')}, currentTime=${currentHour}:${currentMinute.toString().padStart(2, '0')}, timeDiff=${timeDiff}min, canSend=${canSendNow}`);
                        } else {
                            // If no specific hour set, fall back to global schedule
                            canSendNow = canSendReminder(now);
                            console.log(`Template ${template.name} fallback to global: canSend=${canSendNow}`);
                        }
                    }
                    
                    if (canSendNow) {
                        // Check if we already have a log for this client/template/date
                        const hasExistingLog = await checkExistingLog(client.id, template.id, scheduledDate);
                        
                        console.log(`Client ${client.name}, Template ${template.name}: hasExistingLog=${hasExistingLog}`);
                        
                        if (!hasExistingLog) {
                            // Process template message
                            const processedMessage = MessageProcessor.processTemplate(
                                template.message,
                                client,
                                daysUntilDue,
                                {
                                    planName: (client as any).plan_name,
                                    discountValue: (client as any).discount_value || 0,
                                    finalValue: client.value - ((client as any).discount_value || 0)
                                }
                            );

                            remindersToSend.push({
                                client,
                                template,
                                daysUntilDue,
                                scheduledDate,
                                message: processedMessage
                            });
                            
                            console.log(`Added reminder to send: ${client.name} - ${template.name}`);
                        }
                    }
                }
            }
        }

        console.log(`Total reminders to send: ${remindersToSend.length}`);
        return remindersToSend;
    }, [clients, templates, settings, getActiveTemplates, checkExistingLog, canSendReminder]);

    const processReminders = useCallback(async () => {
        if (!enabled || !settings?.is_enabled || isProcessing) {
            return;
        }

        // Check if we can send reminders at this time OR if there are templates with specific schedules
        const hasSpecificScheduleTemplates = templates?.some(t => 
            t.is_active && !t.use_global_schedule && t.send_hour !== null
        );
        
        const globalCanSend = canSendReminder();
        
        if (!globalCanSend && !hasSpecificScheduleTemplates) {
            console.log('Outside working hours and no specific schedule templates');
            return;
        }
        
        if (!globalCanSend && hasSpecificScheduleTemplates) {
            console.log('Outside working hours but checking specific schedule templates');
        }
        
        console.log(`Processing reminders: globalCanSend=${globalCanSend}, hasSpecificSchedule=${hasSpecificScheduleTemplates}, templatesCount=${templates?.length || 0}`);

        // Prevent too frequent execution (minimum 30 seconds)
        const now = Date.now();
        if (now - lastProcessTime < 30 * 1000) {
            return;
        }

        setIsProcessing(true);
        setLastProcessTime(now);

        try {
            const remindersToSend = await calculateRemindersToSend();
            
            if (remindersToSend.length === 0) {
                return;
            }

            // Check daily limit
            const todayKey = format(new Date(), 'yyyy-MM-dd');
            const todayProcessedCount = Array.from(processedToday).filter(key => key.startsWith(todayKey)).length;
            
            if (todayProcessedCount >= (settings.max_daily_reminders || 100)) {
                console.warn('Daily reminder limit reached');
                return;
            }

            let sentCount = 0;
            let failedCount = 0;

            for (const reminder of remindersToSend) {
                // Check daily limit again
                if (sentCount + todayProcessedCount >= (settings.max_daily_reminders || 100)) {
                    break;
                }

                const result = await sendReminder(reminder);
                
                if (result.success) {
                    sentCount++;
                    
                    // Mark as processed today
                    const processKey = `${todayKey}_${reminder.client.id}_${reminder.template.id}`;
                    setProcessedToday(prev => new Set([...prev, processKey]));
                } else {
                    failedCount++;
                }

                // Small delay between sends to avoid overwhelming the system
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            if (sentCount > 0 || failedCount > 0) {
                console.log(`Reminders processed: ${sentCount} sent, ${failedCount} failed`);
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error in reminder processing';
            console.error('Error processing reminders:', errorMessage);
            onError?.(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    }, [
        enabled,
        settings,
        isProcessing,
        canSendReminder,
        lastProcessTime,
        calculateRemindersToSend,
        sendReminder,
        processedToday,
        onError
    ]);

    // Reset processed today set at midnight
    useEffect(() => {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const msUntilMidnight = tomorrow.getTime() - now.getTime();
        
        const timeout = setTimeout(() => {
            setProcessedToday(new Set());
            
            // Set up daily reset
            const dailyReset = setInterval(() => {
                setProcessedToday(new Set());
            }, 24 * 60 * 60 * 1000);
            
            return () => clearInterval(dailyReset);
        }, msUntilMidnight);
        
        return () => clearTimeout(timeout);
    }, []);

    // Main processing loop - DESABILITADO (agora usa processador backend)
    // O processamento automático agora é feito pelo reminder-processor.js
    useEffect(() => {
        // Frontend não processa mais automaticamente
        // Use o processador backend: scripts/reminder-processor.js
        console.log('ℹ️ Processamento automático desabilitado no frontend');
        console.log('✅ Use o processador backend: scripts/reminder-processor.js');
        
        return () => {
            // Cleanup
        };
    }, []);

    // Force check function for manual triggering
    const forceCheck = useCallback(async () => {
        setIsProcessing(false);
        setLastProcessTime(0);
        await processReminders();
    }, [processReminders]);

    // Get status information
    const getStatus = useCallback(() => {
        const nextValidTime = getNextValidTime();
        
        return {
            enabled: enabled && (settings?.is_enabled || false),
            isProcessing,
            canSendNow: canSendReminder(),
            nextValidTime,
            lastProcessTime: lastProcessTime > 0 ? new Date(lastProcessTime) : null,
            processedTodayCount: Array.from(processedToday).filter(key => 
                key.startsWith(format(new Date(), 'yyyy-MM-dd'))
            ).length,
            dailyLimit: settings?.max_daily_reminders || 100,
            checkInterval: settings?.check_interval_minutes || 60
        };
    }, [
        enabled,
        settings,
        isProcessing,
        canSendReminder,
        getNextValidTime,
        lastProcessTime,
        processedToday
    ]);

    return {
        // Status
        isProcessing,
        getStatus,
        
        // Actions
        processReminders,
        forceCheck,
        
        // Utilities
        calculateRemindersToSend,
        sendReminder,
    };
}