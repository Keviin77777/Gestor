/**
 * Sistema de Variáveis Dinâmicas para Templates de Lembrete WhatsApp
 */

import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Client } from './definitions';

export interface TemplateVariable {
    key: string;
    label: string;
    description: string;
    example: string;
    category: 'client' | 'date' | 'financial' | 'system';
}

export const AVAILABLE_VARIABLES: TemplateVariable[] = [
    // Variáveis do Cliente
    {
        key: 'cliente_nome',
        label: 'Nome do Cliente',
        description: 'Nome completo do cliente',
        example: 'João Silva',
        category: 'client'
    },
    {
        key: 'cliente_telefone',
        label: 'Telefone do Cliente',
        description: 'Número de telefone do cliente',
        example: '(11) 99999-9999',
        category: 'client'
    },
    {
        key: 'cliente_usuario',
        label: 'Usuário/Login',
        description: 'Nome de usuário ou login do cliente',
        example: 'joao.silva',
        category: 'client'
    },
    
    // Variáveis de Data
    {
        key: 'data_vencimento',
        label: 'Data de Vencimento',
        description: 'Data de vencimento formatada (dd/MM/yyyy)',
        example: '15/10/2025',
        category: 'date'
    },
    {
        key: 'data_vencimento_extenso',
        label: 'Data de Vencimento por Extenso',
        description: 'Data de vencimento escrita por extenso',
        example: '15 de outubro de 2025',
        category: 'date'
    },
    {
        key: 'dias_restantes',
        label: 'Dias Restantes',
        description: 'Quantidade de dias até o vencimento (ou desde o vencimento se negativo)',
        example: '3',
        category: 'date'
    },
    {
        key: 'dias_restantes_texto',
        label: 'Dias Restantes (Texto)',
        description: 'Texto descritivo dos dias restantes',
        example: 'em 3 dias',
        category: 'date'
    },
    {
        key: 'mes_vencimento',
        label: 'Mês de Vencimento',
        description: 'Nome do mês de vencimento',
        example: 'Outubro',
        category: 'date'
    },
    {
        key: 'ano_vencimento',
        label: 'Ano de Vencimento',
        description: 'Ano do vencimento',
        example: '2025',
        category: 'date'
    },
    
    // Variáveis Financeiras
    {
        key: 'valor',
        label: 'Valor da Mensalidade',
        description: 'Valor formatado em reais (R$ 00,00)',
        example: 'R$ 49,90',
        category: 'financial'
    },
    {
        key: 'valor_numerico',
        label: 'Valor Numérico',
        description: 'Valor sem formatação (00.00)',
        example: '49.90',
        category: 'financial'
    },
    {
        key: 'desconto',
        label: 'Valor do Desconto',
        description: 'Valor do desconto aplicado',
        example: 'R$ 5,00',
        category: 'financial'
    },
    {
        key: 'valor_final',
        label: 'Valor Final',
        description: 'Valor final após desconto',
        example: 'R$ 44,90',
        category: 'financial'
    },
    
    // Variáveis do Sistema
    {
        key: 'plano',
        label: 'Nome do Plano',
        description: 'Nome do plano contratado pelo cliente',
        example: 'Plano Premium',
        category: 'system'
    },
    {
        key: 'status_cliente',
        label: 'Status do Cliente',
        description: 'Status atual do cliente',
        example: 'Ativo',
        category: 'system'
    },
    {
        key: 'data_hoje',
        label: 'Data de Hoje',
        description: 'Data atual formatada',
        example: '12/10/2025',
        category: 'date'
    },
    {
        key: 'hora_atual',
        label: 'Hora Atual',
        description: 'Hora atual formatada',
        example: '14:30',
        category: 'date'
    }
];

export class MessageProcessor {
    /**
     * Processa um template substituindo as variáveis pelos valores reais
     */
    static processTemplate(
        template: string, 
        client: Client, 
        daysUntilDue: number,
        additionalData?: {
            planName?: string;
            discountValue?: number;
            finalValue?: number;
        }
    ): string {
        const now = new Date();
        const dueDate = parseISO(client.renewal_date);
        
        // Preparar valores das variáveis
        const variables = this.buildVariables(client, daysUntilDue, dueDate, now, additionalData);
        
        // Substituir variáveis no template (aceita {var} ou {{var}})
        let processedMessage = template;
        
        Object.entries(variables).forEach(([key, value]) => {
            // Aceitar tanto {variavel} quanto {{variavel}}
            const regex1 = new RegExp(`{{${key}}}`, 'g');
            const regex2 = new RegExp(`{${key}}`, 'g');
            processedMessage = processedMessage.replace(regex1, value);
            processedMessage = processedMessage.replace(regex2, value);
        });
        
        // Limpar variáveis não encontradas (opcional)
        processedMessage = this.cleanUnusedVariables(processedMessage);
        
        return processedMessage.trim();
    }
    
    /**
     * Constrói o objeto com todas as variáveis disponíveis
     */
    private static buildVariables(
        client: Client,
        daysUntilDue: number,
        dueDate: Date,
        now: Date,
        additionalData?: any
    ): Record<string, string> {
        const discountValue = additionalData?.discountValue || (client as any).discount_value || 0;
        const finalValue = additionalData?.finalValue || (client.value - discountValue);
        
        return {
            // Variáveis do Cliente
            cliente_nome: client.name || 'Cliente',
            cliente_telefone: this.formatPhone(client.phone || ''),
            cliente_usuario: client.username || '',
            
            // Variáveis de Data
            data_vencimento: format(dueDate, 'dd/MM/yyyy'),
            data_vencimento_extenso: format(dueDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
            dias_restantes: Math.abs(daysUntilDue).toString(),
            dias_restantes_texto: this.formatDaysText(daysUntilDue),
            mes_vencimento: format(dueDate, 'MMMM', { locale: ptBR }),
            ano_vencimento: format(dueDate, 'yyyy'),
            
            // Variáveis Financeiras
            valor: this.formatCurrency(client.value),
            valor_numerico: client.value.toFixed(2),
            desconto: this.formatCurrency(discountValue),
            valor_final: this.formatCurrency(finalValue),
            
            // Variáveis do Sistema
            plano: additionalData?.planName || (client as any).plan_name || 'Plano Padrão',
            status_cliente: this.formatStatus(client.status),
            data_hoje: format(now, 'dd/MM/yyyy'),
            hora_atual: format(now, 'HH:mm')
        };
    }
    
    /**
     * Formata número de telefone
     */
    private static formatPhone(phone: string): string {
        if (!phone) return '';
        
        const numbersOnly = phone.replace(/\D/g, '');
        
        if (numbersOnly.length === 11) {
            return `(${numbersOnly.substring(0, 2)}) ${numbersOnly.substring(2, 7)}-${numbersOnly.substring(7)}`;
        } else if (numbersOnly.length === 10) {
            return `(${numbersOnly.substring(0, 2)}) ${numbersOnly.substring(2, 6)}-${numbersOnly.substring(6)}`;
        }
        
        return phone;
    }
    
    /**
     * Formata valor monetário
     */
    private static formatCurrency(value: number): string {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }
    
    /**
     * Formata texto de dias restantes
     */
    private static formatDaysText(daysUntilDue: number): string {
        const absDays = Math.abs(daysUntilDue);
        
        if (daysUntilDue > 0) {
            if (daysUntilDue === 1) {
                return 'amanhã';
            } else {
                return `em ${absDays} dias`;
            }
        } else if (daysUntilDue === 0) {
            return 'hoje';
        } else {
            if (absDays === 1) {
                return 'ontem';
            } else {
                return `há ${absDays} dias`;
            }
        }
    }
    
    /**
     * Formata status do cliente
     */
    private static formatStatus(status: string): string {
        const statusMap: Record<string, string> = {
            'active': 'Ativo',
            'inactive': 'Inativo',
            'suspended': 'Suspenso',
            'expired': 'Expirado'
        };
        
        return statusMap[status] || status;
    }
    
    /**
     * Remove variáveis não utilizadas do template
     */
    private static cleanUnusedVariables(message: string): string {
        // Remove variáveis não substituídas (formato {variavel} ou {{variavel}})
        message = message.replace(/{{[^}]+}}/g, '');
        message = message.replace(/{[^}]+}/g, '');
        return message;
    }
    
    /**
     * Valida se um template contém variáveis válidas
     */
    static validateTemplate(template: string): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
        usedVariables: string[];
    } {
        const errors: string[] = [];
        const warnings: string[] = [];
        const usedVariables: string[] = [];
        
        // Encontrar todas as variáveis no template (aceita {var} ou {{var}})
        const variableMatches1 = template.match(/{{([^}]+)}}/g) || [];
        const variableMatches2 = template.match(/{([^}]+)}/g) || [];
        const allMatches = [...variableMatches1, ...variableMatches2];
        const validVariableKeys = AVAILABLE_VARIABLES.map(v => v.key);
        
        allMatches.forEach(match => {
            // Remove { e } (pode ser 1 ou 2 de cada lado)
            const variableKey = match.replace(/^{{?/, '').replace(/}}?$/, '');
            
            if (validVariableKeys.includes(variableKey)) {
                if (!usedVariables.includes(variableKey)) {
                    usedVariables.push(variableKey);
                }
            } else {
                errors.push(`Variável inválida: ${match}`);
            }
        });
        
        // Verificações adicionais
        if (template.length < 10) {
            errors.push('Template deve ter pelo menos 10 caracteres');
        }
        
        if (template.length > 1000) {
            warnings.push('Template muito longo (mais de 1000 caracteres)');
        }
        
        if (usedVariables.length === 0) {
            warnings.push('Template não utiliza nenhuma variável dinâmica');
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            usedVariables
        };
    }
    
    /**
     * Gera preview de uma mensagem com dados de exemplo
     */
    static generatePreview(template: string): string {
        const exampleClient: Client = {
            id: 'example',
            reseller_id: 'example',
            name: 'João Silva',
            phone: '11999887766',
            username: 'joao.silva',
            plan_id: 'plan1',
            start_date: '2025-01-01',
            renewal_date: '2025-10-15',
            status: 'active',
            value: 49.90,
            notes: '',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z'
        };
        
        const daysUntilDue = 3; // Exemplo: 3 dias até vencer
        
        return this.processTemplate(template, exampleClient, daysUntilDue, {
            planName: 'Plano Premium',
            discountValue: 5.00,
            finalValue: 44.90
        });
    }
}

/**
 * Utilitários para trabalhar com variáveis
 */
export class VariableUtils {
    /**
     * Agrupa variáveis por categoria
     */
    static getVariablesByCategory(): Record<string, TemplateVariable[]> {
        return AVAILABLE_VARIABLES.reduce((acc, variable) => {
            if (!acc[variable.category]) {
                acc[variable.category] = [];
            }
            acc[variable.category].push(variable);
            return acc;
        }, {} as Record<string, TemplateVariable[]>);
    }
    
    /**
     * Busca variáveis por termo
     */
    static searchVariables(term: string): TemplateVariable[] {
        const searchTerm = term.toLowerCase();
        return AVAILABLE_VARIABLES.filter(variable =>
            variable.key.toLowerCase().includes(searchTerm) ||
            variable.label.toLowerCase().includes(searchTerm) ||
            variable.description.toLowerCase().includes(searchTerm)
        );
    }
    
    /**
     * Obtém variável por chave
     */
    static getVariableByKey(key: string): TemplateVariable | undefined {
        return AVAILABLE_VARIABLES.find(variable => variable.key === key);
    }
}