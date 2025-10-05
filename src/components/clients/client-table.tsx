"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  MoreHorizontal,
  PlusCircle,
  Search,
  Users,
  AlertTriangle,
  DollarSign,
  Edit,
  Trash2,
  FileText,
  History,
  ChevronDown,
  ChevronRight,
  Calendar as CalendarIcon,
  Wifi,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Smartphone
} from "lucide-react";
import type { Client, Plan, Panel, App } from "@/lib/definitions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFirebase, useMemoFirebase } from "@/firebase";
import { useCollection } from "@/firebase/firestore/use-collection";
import { collection } from "firebase/firestore";
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { PaymentHistory } from "./payment-history";
import { doc } from "firebase/firestore";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, addMonths, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSigmaIntegration } from "@/hooks/use-sigma-integration";
import { validateSigmaPassword, getPasswordStrengthMessage } from "@/lib/password-validation";
import type { Invoice } from "@/lib/definitions";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

const statusMap: { [key in Client['status']]: { text: string; className: string } } = {
  active: { text: "Ativo", className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100" },
  inactive: { text: "Inativo", className: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100" },
  late: { text: "Atrasado", className: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100" },
};

export function ClientTable() {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const { firestore, user } = useFirebase();
  const resellerId = user?.uid;

  const clientsCollection = useMemoFirebase(() => {
    if (!resellerId) return null;
    return collection(firestore, 'resellers', resellerId, 'clients');
  }, [firestore, resellerId]);

  const { data, isLoading } = useCollection<Client>(clientsCollection);

  // Plans and panels
  const plansCollection = useMemoFirebase(() => {
    if (!resellerId) return null;
    return collection(firestore, 'resellers', resellerId, 'plans');
  }, [firestore, resellerId]);

  const panelsCollection = useMemoFirebase(() => {
    if (!resellerId) return null;
    return collection(firestore, 'resellers', resellerId, 'panels');
  }, [firestore, resellerId]);

  const appsCollection = useMemoFirebase(() => {
    if (!resellerId) return null;
    return collection(firestore, 'resellers', resellerId, 'apps');
  }, [firestore, resellerId]);

  const { data: plans } = useCollection<Plan>(plansCollection);
  const { data: panels } = useCollection<Panel>(panelsCollection);
  const { data: apps } = useCollection<App>(appsCollection);

  // Invoices collection
  const invoicesCollection = useMemoFirebase(() => {
    if (!resellerId) return null;
    return collection(firestore, 'resellers', resellerId, 'invoices');
  }, [firestore, resellerId]);

  const { data: invoices } = useCollection<Invoice>(invoicesCollection);

  // Sigma Integration
  const sigmaIntegration = useSigmaIntegration();

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
  const [expandedClient, setExpandedClient] = React.useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editingClient, setEditingClient] = React.useState<Client | null>(null);
  const [paymentHistoryClient, setPaymentHistoryClient] = React.useState<Client | null>(null);
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = React.useState(false);

  // Validation states
  const [phoneError, setPhoneError] = React.useState("");
  const [passwordError, setPasswordError] = React.useState("");

  // Password visibility states
  const [showPassword, setShowPassword] = React.useState(false);
  const [showEditPassword, setShowEditPassword] = React.useState(false);

  // Password warning modal states
  const [passwordWarningOpen, setPasswordWarningOpen] = React.useState(false);
  const [passwordWarningMessage, setPasswordWarningMessage] = React.useState("");

  // Generate invoice modal states
  const [confirmGenerateOpen, setConfirmGenerateOpen] = React.useState(false);
  const [clientToGenerate, setClientToGenerate] = React.useState<Client | null>(null);
  const [nextPeriodToGenerate, setNextPeriodToGenerate] = React.useState("");

  const validatePhoneNumber = (value: string) => {
    // Remove all non-numeric characters except + at the beginning
    let cleaned = value.replace(/[^\d+]/g, '');

    // If it starts with +, keep only the first + and remove others
    if (cleaned.startsWith('+')) {
      cleaned = '+' + cleaned.slice(1).replace(/\+/g, '');
    }

    // Limit to 15 characters (international standard)
    return cleaned.slice(0, 15);
  };

  const resetForm = () => {
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
    setPhoneError("");
    setPasswordError("");
    setShowPassword(false);
    setShowEditPassword(false);
  };

  const isValidBrazilianPhone = (phone: string) => {
    // Remove all non-numeric characters
    const numbersOnly = phone.replace(/\D/g, '');

    // Must have exactly 10 or 11 digits
    if (numbersOnly.length !== 10 && numbersOnly.length !== 11) {
      return false;
    }

    // Extract area code (first 2 digits)
    const areaCode = numbersOnly.substring(0, 2);

    // Valid Brazilian area codes (11-99)
    const validAreaCodes = [
      '11', '12', '13', '14', '15', '16', '17', '18', '19', // São Paulo
      '21', '22', '24', // Rio de Janeiro
      '27', '28', // Espírito Santo
      '31', '32', '33', '34', '35', '37', '38', // Minas Gerais
      '41', '42', '43', '44', '45', '46', // Paraná
      '47', '48', '49', // Santa Catarina
      '51', '53', '54', '55', // Rio Grande do Sul
      '61', // Distrito Federal
      '62', '64', // Goiás
      '63', // Tocantins
      '65', '66', // Mato Grosso
      '67', // Mato Grosso do Sul
      '68', // Acre
      '69', // Rondônia
      '71', '73', '74', '75', '77', // Bahia
      '79', // Sergipe
      '81', '87', // Pernambuco
      '82', // Alagoas
      '83', // Paraíba
      '84', // Rio Grande do Norte
      '85', '88', // Ceará
      '86', '89', // Piauí
      '91', '93', '94', // Pará
      '92', '97', // Amazonas
      '95', // Roraima
      '96', // Amapá
      '98', '99'  // Maranhão
    ];

    if (!validAreaCodes.includes(areaCode)) {
      return false;
    }

    if (numbersOnly.length === 11) {
      // Mobile phone: must start with 9 after area code
      const firstDigit = numbersOnly.substring(2, 3);
      if (firstDigit !== '9') {
        return false;
      }
    }

    // Check for invalid patterns (all same digits, sequential, etc.)
    const phoneNumber = numbersOnly.substring(2);

    // All same digits
    if (/^(\d)\1+$/.test(phoneNumber)) {
      return false;
    }

    return true;
  };

  const isValidInternationalPhone = (phone: string) => {
    // Remove all non-numeric characters
    const numbersOnly = phone.replace(/\D/g, '');

    // Must have at least 7 digits and at most 15 digits (international standard)
    if (numbersOnly.length < 7 || numbersOnly.length > 15) {
      return false;
    }

    // Check for invalid patterns (all same digits)
    if (/^(\d)\1+$/.test(numbersOnly)) {
      return false;
    }

    // Check for obviously invalid patterns
    const invalidPatterns = [
      /^0+$/, // All zeros
      /^1+$/, // All ones
      /^123456/, // Sequential
      /^987654/, // Reverse sequential
    ];

    for (const pattern of invalidPatterns) {
      if (pattern.test(numbersOnly)) {
        return false;
      }
    }

    return true;
  };

  const isValidPhone = (phone: string) => {
    // Try Brazilian validation first
    if (isValidBrazilianPhone(phone)) {
      return true;
    }

    // If not Brazilian, try international validation
    return isValidInternationalPhone(phone);
  };

  const validateDecimalValue = (value: string) => {
    // Allow only numbers and one decimal point
    const cleaned = value.replace(/[^\d.,]/g, '');
    // Replace comma with dot for decimal
    const normalized = cleaned.replace(',', '.');
    // Ensure only one decimal point
    const parts = normalized.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    // Limit decimal places to 2
    if (parts[1] && parts[1].length > 2) {
      return parts[0] + '.' + parts[1].slice(0, 2);
    }
    return normalized;
  };

  const handlePhoneChange = (value: string) => {
    const validPhone = validatePhoneNumber(value);
    setClientPhone(validPhone);

    // Clear error when user starts typing
    if (phoneError && validPhone.length > 0) {
      setPhoneError("");
    }

    // Validate if phone has enough digits
    if (validPhone.length >= 7) {
      if (!isValidPhone(validPhone)) {
        setPhoneError("Número de telefone inválido");
      } else {
        setPhoneError("");
      }
    }
  };

  const handleDiscountChange = (value: string) => {
    const validDiscount = validateDecimalValue(value);
    setDiscountValue(validDiscount);
  };

  const handleFixedValueChange = (value: string) => {
    const validValue = validateDecimalValue(value);
    setFixedValue(validValue);
  };

  const handlePasswordChange = (value: string) => {
    setClientPassword(value);

    // Clear error when user starts typing
    if (passwordError && value.length > 0) {
      setPasswordError("");
    }

    // Check if Sigma validation is needed
    const currentPanel = panels?.find(p => p.id === selectedPanelId);
    if (currentPanel?.sigmaConnected && value.length > 0) {
      const validation = validateSigmaPassword(value);
      if (!validation.isValid) {
        setPasswordError(`Senha fraca para Sigma IPTV. Necessário: ${validation.errors.join(', ')}`);
      } else {
        setPasswordError("");
      }
    }
  };

  const handleSaveClient = () => {
    if (!clientsCollection || !resellerId) {
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
    if (clientPhone.trim() && !isValidPhone(clientPhone)) {
      alert('Número de telefone inválido. Use um número brasileiro válido (ex: 11987654321 ou +5511987654321).');
      return;
    }

    // Check password strength for Sigma IPTV if panel is connected (warning only)
    const panelForSave = panels?.find(p => p.id === selectedPanelId);
    let showPasswordWarning = false;
    if (panelForSave?.sigmaConnected && clientPassword.trim()) {
      const passwordValidation = validateSigmaPassword(clientPassword.trim());
      if (!passwordValidation.isValid) {
        showPasswordWarning = true;
        setPasswordWarningMessage(`⚠️ Recomendação de Segurança:\n\n• ${passwordValidation.errors.join('\n• ')}\n\nPara maior segurança do sistema Sigma IPTV, recomendamos usar uma senha mais forte.`);
      }
    }

    const plan = (plans || []).find(p => p.id === selectedPlanId);
    const basePrice = useFixedValue ? parseFloat(fixedValue) : (plan?.saleValue ?? 0);
    const discount = parseFloat(discountValue || '0');
    const paymentValue = Math.max(0, (isNaN(basePrice) ? 0 : basePrice) - (isNaN(discount) ? 0 : discount));

    const newClient: Partial<Client> & {
      phone?: string;
      username?: string;
      password?: string;
      note?: string;
      panelId?: string;
      discountValue?: number;
      useFixedValue?: boolean;
      fixedValue?: number;
      apps?: string[];
    } = {
      resellerId,
      name: clientName.trim(),
      startDate: format(new Date(), 'yyyy-MM-dd'),
      planId: selectedPlanId,
      paymentValue,
      status: 'active',
      renewalDate: format(dueDate, 'yyyy-MM-dd'),
      phone: clientPhone.trim(),
      username: clientUsername.trim(),
      password: clientPassword.trim(),
      notes: clientNotes.trim(),
      panelId: selectedPanelId,
      discountValue: isNaN(discount) ? 0 : discount,
      useFixedValue,
      fixedValue: isNaN(basePrice) ? 0 : basePrice,
      ...(selectedApps.length > 0 && { apps: selectedApps }),
    };

    // Save client to database
    addDocumentNonBlocking(clientsCollection, newClient);

    // Auto-create in Sigma if panel is connected and client has credentials
    const panelForSigma = panels?.find(p => p.id === selectedPanelId);
    if (panelForSigma?.sigmaConnected && clientUsername.trim() && clientPassword.trim()) {
      const plan = plans?.find(p => p.id === selectedPlanId);
      if (plan) {
        // Create client in Sigma asynchronously
        sigmaIntegration.createClient(panelForSigma, {
          username: clientUsername.trim(),
          password: clientPassword.trim(),
          name: clientName.trim(),
          whatsapp: clientPhone.trim(),
          note: clientNotes.trim(),
          packageId: panelForSigma.sigmaDefaultPackageId || "BV4D3rLaqZ" // Use configured or default package ID
        }).then(result => {
          if (result.success) {
            console.log('✅ Cliente criado automaticamente no Sigma IPTV');
            // You could add a toast notification here if you have a toast system
          } else {
            console.error('❌ Erro ao criar cliente no Sigma:', result.error);
            // You could show an error notification here
          }
        }).catch(error => {
          console.error('❌ Erro ao criar cliente no Sigma:', error);
        });
      }
    }

    resetForm();
    setIsDialogOpen(false);

    // Show password warning after saving if needed
    if (showPasswordWarning) {
      setTimeout(() => {
        setPasswordWarningOpen(true);
      }, 500); // Small delay to let the modal close first
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setClientName(client.name);
    setClientPhone(client.phone || '');
    setClientUsername(client.username || '');
    setClientPassword(client.password || '');
    setClientNotes(client.notes || '');
    setSelectedPlanId(client.planId);
    setSelectedPanelId(client.panelId || '');
    setSelectedApps((client as any).apps || []);
    setIsAppsExpanded(false);
    // Parse date safely to avoid timezone issues
    const [year, month, day] = client.renewalDate.split('-');
    setDueDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
    setDiscountValue(client.discountValue?.toString() || '');
    setUseFixedValue(client.useFixedValue || false);
    setFixedValue(client.fixedValue?.toString() || '');
    setIsEditDialogOpen(true);
  };

  const handleUpdateClient = () => {
    if (!editingClient || !clientsCollection || !resellerId) {
      alert('Erro: dados não encontrados.');
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
    if (clientPhone.trim() && !isValidPhone(clientPhone)) {
      alert('Número de telefone inválido. Use um número brasileiro válido (ex: 11987654321 ou +5511987654321).');
      return;
    }

    // Check password strength for Sigma IPTV if panel is connected (warning only)
    const panelForUpdate = panels?.find(p => p.id === selectedPanelId);
    let showPasswordWarningUpdate = false;
    if (panelForUpdate?.sigmaConnected && clientPassword.trim()) {
      const passwordValidation = validateSigmaPassword(clientPassword.trim());
      if (!passwordValidation.isValid) {
        showPasswordWarningUpdate = true;
        setPasswordWarningMessage(`⚠️ Recomendação de Segurança:\n\n• ${passwordValidation.errors.join('\n• ')}\n\nPara maior segurança do sistema Sigma IPTV, recomendamos usar uma senha mais forte.`);
      }
    }

    const plan = (plans || []).find(p => p.id === selectedPlanId);
    const basePrice = useFixedValue ? parseFloat(fixedValue) : (plan?.saleValue ?? 0);
    const discount = parseFloat(discountValue || '0');
    const paymentValue = Math.max(0, (isNaN(basePrice) ? 0 : basePrice) - (isNaN(discount) ? 0 : discount));

    const updatedClient: Partial<Client> & { apps?: string[] } = {
      name: clientName.trim(),
      planId: selectedPlanId,
      paymentValue,
      renewalDate: format(dueDate, 'yyyy-MM-dd'),
      phone: clientPhone.trim(),
      username: clientUsername.trim(),
      password: clientPassword.trim(),
      notes: clientNotes.trim(),
      panelId: selectedPanelId,
      discountValue: isNaN(discount) ? 0 : discount,
      useFixedValue,
      fixedValue: isNaN(basePrice) ? 0 : basePrice,
      ...(selectedApps.length > 0 && { apps: selectedApps }),
    };

    const clientRef = doc(firestore, 'resellers', resellerId, 'clients', editingClient.id);
    updateDocumentNonBlocking(clientRef, updatedClient);
    resetForm();
    setIsEditDialogOpen(false);
    setEditingClient(null);

    // Show password warning after updating if needed
    if (showPasswordWarningUpdate) {
      setTimeout(() => {
        setPasswordWarningOpen(true);
      }, 500); // Small delay to let the modal close first
    }
  };

  const handleDeleteClient = async (client: Client) => {
    if (!clientsCollection || !resellerId) {
      alert('Erro: usuário não autenticado.');
      return;
    }

    const confirmDelete = window.confirm(`Tem certeza que deseja excluir o cliente "${client.name}"? Esta ação não pode ser desfeita.`);
    if (!confirmDelete) return;

    const clientRef = doc(firestore, 'resellers', resellerId, 'clients', client.id);
    deleteDocumentNonBlocking(clientRef);
  };

  // Sigma IPTV Integration Functions
  const handleRenewClientSigma = async (client: Client) => {
    if (!client.username) {
      alert('Cliente não possui username configurado para sincronização.');
      return;
    }

    const clientPlan = plans?.find(p => p.id === client.planId);
    if (!clientPlan) {
      alert('Plano do cliente não encontrado.');
      return;
    }

    const clientPanel = panels?.find(p => p.id === clientPlan.panelId);
    if (!clientPanel?.sigmaConnected) {
      alert('Painel não está conectado ao Sigma IPTV.');
      return;
    }

    const confirmRenew = window.confirm(`Renovar cliente "${client.name}" no Sigma IPTV?`);
    if (!confirmRenew) return;

    try {
      const result = await sigmaIntegration.renewClient(
        clientPanel,
        client.username,
        clientPlan.id // Using plan ID as package ID
      );

      if (result.success) {
        alert('Cliente renovado com sucesso no Sigma IPTV!');

        // Update client renewal date in local database
        const newRenewalDate = addMonths(parseISO(client.renewalDate), clientPlan.duration).toISOString();
        const clientRef = doc(firestore, 'resellers', resellerId!, 'clients', client.id);
        updateDocumentNonBlocking(clientRef, {
          renewalDate: newRenewalDate,
          status: 'active' as const
        });
      } else {
        alert(`Erro ao renovar cliente: ${result.error}`);
      }
    } catch (error) {
      alert('Erro ao renovar cliente no Sigma IPTV.');
      console.error('Sigma renew error:', error);
    }
  };

  const handleSyncClientStatus = async (client: Client) => {
    if (!client.username) {
      alert('Cliente não possui username configurado para sincronização.');
      return;
    }

    const clientPlan = plans?.find(p => p.id === client.planId);
    if (!clientPlan) {
      alert('Plano do cliente não encontrado.');
      return;
    }

    const clientPanel = panels?.find(p => p.id === clientPlan.panelId);
    if (!clientPanel?.sigmaConnected) {
      alert('Painel não está conectado ao Sigma IPTV.');
      return;
    }

    try {
      const sigmaStatus = client.status === 'active' ? 'ACTIVE' : 'INACTIVE';
      const result = await sigmaIntegration.updateClientStatus(
        clientPanel,
        client.username,
        sigmaStatus
      );

      if (result.success) {
        alert('Status sincronizado com sucesso no Sigma IPTV!');
      } else {
        alert(`Erro ao sincronizar status: ${result.error}`);
      }
    } catch (error) {
      alert('Erro ao sincronizar status no Sigma IPTV.');
      console.error('Sigma sync error:', error);
    }
  };

  const handleCreateClientInSigma = async (client: Client) => {
    if (!client.username || !client.password) {
      alert('Cliente precisa ter username e password configurados.');
      return;
    }

    const clientPlan = plans?.find(p => p.id === client.planId);
    if (!clientPlan) {
      alert('Plano do cliente não encontrado.');
      return;
    }

    const clientPanel = panels?.find(p => p.id === clientPlan.panelId);
    if (!clientPanel?.sigmaConnected) {
      alert('Painel não está conectado ao Sigma IPTV.');
      return;
    }

    try {
      const result = await sigmaIntegration.createClient(clientPanel, {
        username: client.username,
        password: client.password,
        name: client.name,
        whatsapp: client.phone,
        note: client.notes,
        packageId: clientPlan.id // Using plan ID as package ID
      });

      if (result.success) {
        alert('Cliente criado com sucesso no Sigma IPTV!');
      } else {
        alert(`Erro ao criar cliente: ${result.error}`);
      }
    } catch (error) {
      alert('Erro ao criar cliente no Sigma IPTV.');
      console.error('Sigma create error:', error);
    }
  };

  const handleSyncFromSigma = async (client: Client) => {
    if (!client.username) {
      alert('Cliente não possui username configurado para sincronização.');
      return;
    }

    const clientPlan = plans?.find(p => p.id === client.planId);
    if (!clientPlan) {
      alert('Plano do cliente não encontrado.');
      return;
    }

    const clientPanel = panels?.find(p => p.id === clientPlan.panelId);
    if (!clientPanel?.sigmaConnected) {
      alert('Painel não está conectado ao Sigma IPTV.');
      return;
    }

    const confirmSync = window.confirm(`Sincronizar dados do cliente "${client.name}" do Sigma IPTV?`);
    if (!confirmSync) return;

    try {
      const result = await sigmaIntegration.syncFromSigma(
        client,
        clientPanel,
        firestore,
        resellerId!
      );

      if (result.success) {
        if (result.data.updated) {
          alert(`✅ Cliente sincronizado!\nData anterior: ${result.data.oldDate}\nNova data: ${result.data.newDate}`);
        } else {
          alert('ℹ️ Cliente já estava sincronizado com o Sigma.');
        }
      } else {
        // Show user-friendly error messages
        if (result.error.includes('não existe no Sigma')) {
          alert(`⚠️ Cliente "${client.name}" não foi encontrado no Sigma IPTV.\n\nIsso pode acontecer se:\n• O cliente ainda não foi criado no Sigma\n• O username está incorreto\n• O cliente foi removido do Sigma`);
        } else {
          alert(`❌ Erro ao sincronizar: ${result.error}`);
        }
      }
    } catch (error) {
      alert('Erro ao sincronizar cliente do Sigma IPTV.');
      console.error('Sigma sync from error:', error);
    }
  };

  const handleOpenPaymentHistory = (client: Client) => {
    setPaymentHistoryClient(client);
    setIsPaymentHistoryOpen(true);
  };

  const handleClosePaymentHistory = () => {
    setPaymentHistoryClient(null);
    setIsPaymentHistoryOpen(false);
  };

  const handleGenerateInvoice = (client: Client) => {
    if (!resellerId || !firestore) {
      return;
    }

    // Get all invoices for this client
    const allInvoices = invoices?.filter(invoice => invoice.clientId === client.id) || [];

    // Determine the target date for the new invoice
    const getTargetDueDate = () => {
      let currentDate = parseISO(client.renewalDate);

      // Keep checking months until we find one without an invoice
      while (true) {
        const dateString = format(currentDate, 'yyyy-MM-dd');
        const existingInvoice = allInvoices.find(invoice => invoice.dueDate === dateString);

        if (!existingInvoice) {
          // Found a month without an invoice
          return dateString;
        }

        // Move to next month
        currentDate = addMonths(currentDate, 1);

        // Safety check to prevent infinite loop (max 24 months ahead)
        const monthsAhead = differenceInDays(currentDate, parseISO(client.renewalDate)) / 30;
        if (monthsAhead > 24) {
          break;
        }
      }

      // Fallback
      return format(addMonths(parseISO(client.renewalDate), 1), 'yyyy-MM-dd');
    };

    const targetDueDate = getTargetDueDate();
    const targetDate = parseISO(targetDueDate);
    const periodName = format(targetDate, 'MMMM yyyy', { locale: ptBR });

    // Show confirmation modal
    setClientToGenerate(client);
    setNextPeriodToGenerate(periodName);
    setConfirmGenerateOpen(true);
  };

  const confirmGenerateInvoice = async () => {
    if (!resellerId || !firestore || !clientToGenerate) return;

    const invoicesCollection = collection(firestore, 'resellers', resellerId, 'invoices');
    const allInvoices = invoices?.filter(invoice => invoice.clientId === clientToGenerate.id) || [];

    const getTargetDueDate = () => {
      let currentDate = parseISO(clientToGenerate.renewalDate);

      // Keep checking months until we find one without an invoice
      while (true) {
        const dateString = format(currentDate, 'yyyy-MM-dd');
        const existingInvoice = allInvoices.find(invoice => invoice.dueDate === dateString);

        if (!existingInvoice) {
          // Found a month without an invoice
          return dateString;
        }

        // Move to next month
        currentDate = addMonths(currentDate, 1);

        // Safety check to prevent infinite loop (max 24 months ahead)
        const monthsAhead = differenceInDays(currentDate, parseISO(clientToGenerate.renewalDate)) / 30;
        if (monthsAhead > 24) {
          break;
        }
      }

      // Fallback
      return format(addMonths(parseISO(clientToGenerate.renewalDate), 1), 'yyyy-MM-dd');
    };

    const targetDueDate = getTargetDueDate();

    // Generate new invoice
    const newInvoice: Omit<Invoice, 'id'> = {
      clientId: clientToGenerate.id,
      resellerId,
      dueDate: targetDueDate,
      issueDate: format(new Date(), 'yyyy-MM-dd'),
      value: clientToGenerate.paymentValue,
      discount: (clientToGenerate as any).discountValue || 0,
      finalValue: clientToGenerate.paymentValue - ((clientToGenerate as any).discountValue || 0),
      status: 'pending',
      description: `Mensalidade - ${nextPeriodToGenerate}`
    };

    addDocumentNonBlocking(invoicesCollection, newInvoice);
    setConfirmGenerateOpen(false);
    setClientToGenerate(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie seus clientes e acompanhe suas assinaturas
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Input
                placeholder="Buscar clientes..."
                className="pl-10 bg-background/50 backdrop-blur-sm border-border/50"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            <Select>
              <SelectTrigger className="w-full sm:w-[180px] bg-background/50 backdrop-blur-sm border-border/50">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="late">Atrasado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Cliente
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Clientes Ativos</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {data?.filter(c => c.status === 'active').length || 0}
                </p>
              </div>
              <div className="rounded-full bg-green-500/20 p-3">
                <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Em Atraso</p>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                  {data?.filter(c => c.status === 'late').length || 0}
                </p>
              </div>
              <div className="rounded-full bg-orange-500/20 p-3">
                <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Receita Mensal</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  R$ {data?.reduce((sum, c) => sum + c.paymentValue, 0).toFixed(2) || '0,00'}
                </p>
              </div>
              <div className="rounded-full bg-blue-500/20 p-3">
                <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clients Table - Desktop */}
      <Card className="border-0 shadow-lg hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/50">
                  <TableHead className="font-semibold">Cliente</TableHead>
                  <TableHead className="font-semibold">Plano</TableHead>
                  <TableHead className="font-semibold text-center">Status</TableHead>
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      Vencimento
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      Aplicativos
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-right">Valor</TableHead>
                  <TableHead className="font-semibold text-center">Painel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center space-y-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="text-muted-foreground">Carregando clientes...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {data?.map((client) => (
                  <React.Fragment key={client.id}>
                    <TableRow className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setExpandedClient(expandedClient === client.id ? null : client.id)}
                              className="flex items-center space-x-2 hover:bg-muted/50 rounded-md p-1 transition-colors"
                            >
                              {expandedClient === client.id ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              <p className="font-medium">{client.name}</p>
                            </button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {plans?.find(p => p.id === client.planId)?.name || client.planId}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`${statusMap[client.status]?.className} border-0 shadow-sm`}
                        >
                          {statusMap[client.status]?.text}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const renewalDate = new Date(client.renewalDate);
                          const today = new Date();
                          const daysUntilRenewal = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                          const isOverdue = daysUntilRenewal < 0;
                          const isUrgent = daysUntilRenewal >= 0 && daysUntilRenewal <= 3;
                          const isWarning = daysUntilRenewal > 3 && daysUntilRenewal <= 7;

                          const [year, month, day] = client.renewalDate.split('-');
                          const formattedDate = `${day}/${month}/${year}`;

                          return (
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium text-foreground">
                                {formattedDate}
                              </div>
                              <div className="h-1 w-1 rounded-full bg-border"></div>
                              {isOverdue ? (
                                <Badge variant="destructive" className="text-xs px-2 py-0.5 font-medium">
                                  {Math.abs(daysUntilRenewal)}d atraso
                                </Badge>
                              ) : isUrgent ? (
                                <Badge className="text-xs px-2 py-0.5 bg-red-100 text-red-700 border-red-200 hover:bg-red-100 font-medium">
                                  {daysUntilRenewal === 0 ? 'Hoje' : `${daysUntilRenewal}d`}
                                </Badge>
                              ) : isWarning ? (
                                <Badge className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100 font-medium">
                                  {daysUntilRenewal}d
                                </Badge>
                              ) : (
                                <Badge className="text-xs px-2 py-0.5 bg-green-100 text-green-700 border-green-200 hover:bg-green-100 font-medium">
                                  {daysUntilRenewal}d
                                </Badge>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const clientApps = (client as any).apps || [];
                          if (clientApps.length === 0) {
                            return (
                              <div className="text-xs text-muted-foreground italic">
                                Nenhum app
                              </div>
                            );
                          }

                          const appNames = clientApps
                            .map((appId: string) => apps?.find(a => a.id === appId)?.name)
                            .filter(Boolean);

                          if (appNames.length === 0) {
                            return (
                              <div className="text-xs text-muted-foreground italic">
                                Nenhum app
                              </div>
                            );
                          }

                          return (
                            <div className="flex flex-wrap gap-1">
                              {appNames.slice(0, 2).map((name: string, index: number) => (
                                <Badge
                                  key={index}
                                  variant="outline"
                                  className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300"
                                >
                                  {name}
                                </Badge>
                              ))}
                              {appNames.length > 2 && (
                                <Badge
                                  variant="outline"
                                  className="text-xs px-2 py-0.5 bg-muted text-muted-foreground"
                                >
                                  +{appNames.length - 2}
                                </Badge>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                          R$ {client.paymentValue.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                          {panels?.find(p => p.id === plans?.find(pl => pl.id === client.planId)?.panelId)?.name || 'N/A'}
                        </Badge>
                      </TableCell>
                    </TableRow>

                    {/* Expanded Client Details */}
                    {expandedClient === client.id && (
                      <TableRow>
                        <TableCell colSpan={7} className="p-0">
                          <div className="bg-muted/30 p-6 border-t border-border/50">
                            <div className="space-y-6">
                              {/* Informações de Acesso */}
                              <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                  <Users className="h-4 w-4" />
                                  Credenciais de Acesso
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label className="text-sm font-medium text-muted-foreground">Usuário:</Label>
                                    <p className="text-sm font-mono bg-background/50 p-3 rounded-lg border">{(client as any).username || 'Não informado'}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-medium text-muted-foreground">Senha:</Label>
                                    <p className="text-sm font-mono bg-background/50 p-3 rounded-lg border">{(client as any).password || 'Não informado'}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Informações de Contato e Datas */}
                              <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                  <CalendarIcon className="h-4 w-4" />
                                  Informações Gerais
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  <div className="space-y-2">
                                    <Label className="text-sm font-medium text-muted-foreground">WhatsApp:</Label>
                                    <p className="text-sm bg-background/50 p-3 rounded-lg border">{(client as any).phone || 'Não informado'}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-medium text-muted-foreground">Data de Ativação:</Label>
                                    <p className="text-sm bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-3 rounded-lg border border-blue-200/50 dark:border-blue-800/50 text-blue-800 dark:text-blue-200 font-medium">
                                      {(() => {
                                        // Parse da data ISO sem problemas de fuso horário
                                        const [year, month, day] = client.startDate.split('-');
                                        return `${day}/${month}/${year}`;
                                      })()}
                                    </p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-medium text-muted-foreground">Próximo Vencimento:</Label>
                                    <p className="text-sm bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 p-3 rounded-lg border border-green-200/50 dark:border-green-800/50 text-green-800 dark:text-green-200 font-medium">
                                      {(() => {
                                        // Parse da data ISO sem problemas de fuso horário
                                        const [year, month, day] = client.renewalDate.split('-');
                                        return `${day}/${month}/${year}`;
                                      })()}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Informações Financeiras */}
                              <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                  <DollarSign className="h-4 w-4" />
                                  Informações Financeiras
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label className="text-sm font-medium text-muted-foreground">Valor de Desconto:</Label>
                                    <p className="text-sm bg-background/50 p-3 rounded-lg border">R$ {(client as any).discountValue?.toFixed(2) || '0,00'}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm font-medium text-muted-foreground">Valor Fixo:</Label>
                                    <p className="text-sm bg-background/50 p-3 rounded-lg border">{(client as any).useFixedValue ? 'Sim' : 'Não'}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Observações */}
                              <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                  <FileText className="h-4 w-4" />
                                  Observações
                                </h4>
                                <div className="space-y-2">
                                  <p className="text-sm bg-background/50 p-3 rounded-lg border min-h-[60px]">{(client as any).notes || 'Nenhuma observação registrada para este cliente.'}</p>
                                </div>
                              </div>
                            </div>

                            {/* Horizontal Actions */}
                            <div className="mt-6 pt-4 border-t border-border/50">
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                                  onClick={() => handleGenerateInvoice(client)}
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  Gerar Fatura
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                                  onClick={() => handleEditClient(client)}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar Cliente
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                                  onClick={() => handleDeleteClient(client)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir Cliente
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
                                  onClick={() => handleOpenPaymentHistory(client)}
                                >
                                  <History className="mr-2 h-4 w-4" />
                                  Histórico de Pagamentos
                                </Button>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
                {!isLoading && (!data || data.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                          <Users className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-lg font-medium">Nenhum cliente encontrado</p>
                          <p className="text-muted-foreground">Comece adicionando seu primeiro cliente</p>
                        </div>
                        <Button onClick={() => setIsDialogOpen(true)}>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Adicionar Cliente
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Clients Cards - Mobile */}
      <div className="md:hidden space-y-4">
        {isLoading && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col items-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Carregando clientes...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {data?.map((client) => (
          <Card key={client.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Header com Avatar, Nome e Status */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base truncate">{client.name}</h3>
                        {(() => {
                          const clientPlan = plans?.find(p => p.id === client.planId);
                          const clientPanel = clientPlan ? panels?.find(p => p.id === clientPlan.panelId) : null;
                          const sigmaConnected = clientPanel?.sigmaConnected && client.username;

                          if (sigmaConnected) {
                            return (
                              <div className="flex items-center gap-1">
                                <Wifi className="h-3 w-3 text-green-500" />
                                <span className="text-xs text-green-600 font-medium">Sigma</span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs">
                          {plans?.find(p => p.id === client.planId)?.name || client.planId}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${statusMap[client.status]?.className} border-0 shadow-sm flex-shrink-0 ml-2`}
                  >
                    {statusMap[client.status]?.text}
                  </Badge>
                </div>

                {/* Informações principais em grid responsivo */}
                <div className="grid grid-cols-1 gap-3">
                  {/* Vencimento */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          Vencimento
                        </p>
                        <p className="text-sm font-medium">
                          {(() => {
                            const [year, month, day] = client.renewalDate.split('-');
                            return `${day}/${month}/${year}`;
                          })()}
                        </p>
                      </div>
                      <div>
                        {(() => {
                          const renewalDate = new Date(client.renewalDate);
                          const today = new Date();
                          const daysUntilRenewal = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                          const isOverdue = daysUntilRenewal < 0;
                          const isUrgent = daysUntilRenewal >= 0 && daysUntilRenewal <= 3;
                          const isWarning = daysUntilRenewal > 3 && daysUntilRenewal <= 7;

                          if (isOverdue) {
                            return (
                              <Badge variant="destructive" className="text-xs px-2 py-1">
                                {Math.abs(daysUntilRenewal)} dia{Math.abs(daysUntilRenewal) > 1 ? 's' : ''} em atraso
                              </Badge>
                            );
                          } else if (isUrgent) {
                            return (
                              <Badge variant="destructive" className="text-xs px-2 py-1 bg-red-100 text-red-800 border-red-200">
                                {daysUntilRenewal === 0 ? 'Vence hoje' : `${daysUntilRenewal} dia${daysUntilRenewal > 1 ? 's' : ''}`}
                              </Badge>
                            );
                          } else if (isWarning) {
                            return (
                              <Badge variant="outline" className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 border-yellow-200">
                                {daysUntilRenewal} dias
                              </Badge>
                            );
                          } else {
                            return (
                              <Badge variant="outline" className="text-xs px-2 py-1 bg-green-100 text-green-800 border-green-200">
                                {daysUntilRenewal} dias
                              </Badge>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Valor e Painel */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Valor
                      </p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        R$ {client.paymentValue.toFixed(2)}
                      </p>
                    </div>

                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground font-medium">Painel</p>
                      <p className="text-sm font-medium text-purple-700 dark:text-purple-300 truncate">
                        {panels?.find(p => p.id === plans?.find(pl => pl.id === client.planId)?.panelId)?.name || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Informações de contato (se disponível) */}
                {(client as any).phone && (
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground font-medium">WhatsApp</p>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">{(client as any).phone}</p>
                  </div>
                )}

                {/* Ações - Botões em grid para mobile */}
                <div className="pt-3 border-t border-border/50">
                  {(() => {
                    const clientPlan = plans?.find(p => p.id === client.planId);
                    const clientPanel = clientPlan ? panels?.find(p => p.id === clientPlan.panelId) : null;
                    const sigmaConnected = clientPanel?.sigmaConnected;
                    const clientHasCredentials = client.username && client.password;
                    const canCreateInSigma = sigmaConnected && clientHasCredentials && !client.username;

                    return (
                      <div className={`grid gap-2 ${canCreateInSigma ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200 text-xs"
                          onClick={() => handleGenerateInvoice(client)}
                        >
                          <FileText className="mr-1 h-3 w-3" />
                          Fatura
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 text-xs"
                          onClick={() => handleEditClient(client)}
                        >
                          <Edit className="mr-1 h-3 w-3" />
                          Editar
                        </Button>

                        {canCreateInSigma && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200 text-xs"
                            onClick={() => handleCreateClientInSigma(client)}
                            disabled={sigmaIntegration.isLoading}
                          >
                            <Wifi className="mr-1 h-3 w-3" />
                            Criar Sigma
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 text-xs"
                          onClick={() => handleOpenPaymentHistory(client)}
                        >
                          <History className="mr-1 h-3 w-3" />
                          Histórico
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="text-xs">
                              <MoreHorizontal className="h-3 w-3" />
                              Mais
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {/* Sigma IPTV Actions */}
                            {(() => {
                              const clientPlan = plans?.find(p => p.id === client.planId);
                              const clientPanel = clientPlan ? panels?.find(p => p.id === clientPlan.panelId) : null;
                              const sigmaConnected = clientPanel?.sigmaConnected;

                              if (sigmaConnected && client.username) {
                                return (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => handleRenewClientSigma(client)}
                                      disabled={sigmaIntegration.isLoading}
                                    >
                                      <RefreshCw className="mr-2 h-4 w-4" />
                                      Renovar no Sigma
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleSyncClientStatus(client)}
                                      disabled={sigmaIntegration.isLoading}
                                    >
                                      <Wifi className="mr-2 h-4 w-4" />
                                      Sincronizar Status
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleSyncFromSigma(client)}
                                      disabled={sigmaIntegration.isLoading}
                                    >
                                      <RefreshCw className="mr-2 h-4 w-4" />
                                      Sincronizar do Sigma
                                    </DropdownMenuItem>
                                  </>
                                );
                              }
                              return null;
                            })()}

                            <DropdownMenuItem
                              onClick={() => handleDeleteClient(client)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir Cliente
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {!isLoading && (!data || data.length === 0) && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8">
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-medium">Nenhum cliente encontrado</p>
                  <p className="text-muted-foreground">Comece adicionando seu primeiro cliente</p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)} className="w-full">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Adicionar Cliente
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Client Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(o) => { setIsDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <PlusCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">Adicionar Novo Cliente</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Preencha as informações do novo cliente
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info Section - Add Modal */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Informações Básicas</h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-foreground">Nome do Cliente</Label>
                  <Input
                    id="name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Digite o nome completo"
                    autoComplete="off"
                    className="border-2 border-border/60 focus:border-primary/60 bg-background shadow-sm transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-foreground">WhatsApp</Label>
                  <Input
                    id="phone"
                    placeholder="11987654321 ou +5511987654321"
                    value={clientPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    autoComplete="off"
                    className={`border-2 focus:border-primary/60 bg-background shadow-sm transition-colors ${phoneError ? 'border-red-500 focus:border-red-500' : 'border-border/60'
                      }`}
                  />
                  {phoneError && (
                    <p className="text-sm text-red-600 mt-1">{phoneError}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Panel and Plan Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Configuração do Serviço</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Painel</Label>
                  <Select value={selectedPanelId} onValueChange={(value) => { setSelectedPanelId(value); setSelectedPlanId(""); }}>
                    <SelectTrigger className="border-2 border-border/60 focus:border-primary/60 bg-background shadow-sm transition-colors">
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
                  <Label className="text-sm font-medium text-foreground">Plano</Label>
                  <Select value={selectedPlanId} onValueChange={setSelectedPlanId} disabled={!selectedPanelId}>
                    <SelectTrigger className="border-2 border-border/60 focus:border-primary/60 bg-background shadow-sm transition-colors">
                      <SelectValue placeholder={selectedPanelId ? "Selecione um plano" : "Selecione um painel primeiro"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(plans || []).filter(pl => pl.panelId === selectedPanelId).map(pl => (
                        <SelectItem key={pl.id} value={pl.id}>
                          {pl.name} - R$ {pl.saleValue.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Credentials Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Credenciais de Acesso</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium text-foreground">Usuário</Label>
                  <Input
                    id="username"
                    value={clientUsername}
                    onChange={(e) => setClientUsername(e.target.value)}
                    placeholder="Nome de usuário"
                    autoComplete="off"
                    className="border-2 border-border/60 focus:border-primary/60 bg-background shadow-sm transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={clientPassword}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      placeholder="Senha de acesso"
                      autoComplete="new-password"
                      className={`border-2 focus:border-primary/60 bg-background shadow-sm transition-colors pr-10 ${passwordError ? 'border-red-500 focus:border-red-500' : 'border-border/60'
                        }`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {passwordError && (
                    <p className="text-sm text-red-600 mt-1">{passwordError}</p>
                  )}
                  {(() => {
                    const panelForAddPasswordCheck = panels?.find(p => p.id === selectedPanelId);
                    if (panelForAddPasswordCheck?.sigmaConnected && clientPassword.length > 0) {
                      const strengthInfo = getPasswordStrengthMessage(clientPassword);
                      return (
                        <p className={`text-sm mt-1 ${strengthInfo.color}`}>
                          {strengthInfo.message}
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>

            {/* Applications Section */}
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
                      <div className="flex items-center justify-between">
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

                      {/* Grid de aplicativos */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {apps.map((app) => (
                          <div
                            key={app.id}
                            className={`relative p-4 border-2 rounded-lg transition-all cursor-pointer hover:shadow-md ${selectedApps.includes(app.id)
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
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm">{app.name}</div>
                                {app.description && (
                                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {app.description}
                                  </div>
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
                <div className="text-center py-8 text-muted-foreground">
                  <Smartphone className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nenhum aplicativo cadastrado</p>
                  <p className="text-xs mt-1">Cadastre aplicativos na seção "Aplicativos" para selecioná-los aqui</p>
                </div>
              )}
            </div>

            {/* Payment Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Configuração de Pagamento</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Data de Vencimento</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start border-2 border-border/60 focus:border-primary/60 bg-background shadow-sm transition-colors">
                        {dueDate ? format(dueDate, 'dd/MM/yyyy') : 'Escolha uma data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus locale={ptBR} />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Valor de Desconto</Label>
                  <Input
                    type="number"
                    value={discountValue}
                    onChange={(e) => handleDiscountChange(e.target.value)}
                    placeholder="0.00"
                    className="border-2 border-border/60 focus:border-primary/60 bg-background shadow-sm transition-colors"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch checked={useFixedValue} onCheckedChange={setUseFixedValue} />
                    <Label className="text-sm font-medium text-foreground">Usar valor fixo</Label>
                  </div>
                  {useFixedValue && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">Valor Fixo</Label>
                      <Input
                        type="number"
                        value={fixedValue}
                        onChange={(e) => handleFixedValueChange(e.target.value)}
                        placeholder="Valor personalizado"
                        className="border-2 border-border/60 focus:border-primary/60 bg-background shadow-sm transition-colors"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Observações</h3>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Observações Adicionais</Label>
                <Textarea
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder="Informações adicionais sobre o cliente..."
                  className="border-2 border-border/60 focus:border-primary/60 bg-background shadow-sm transition-colors min-h-[80px] resize-none"
                />
              </div>
            </div>


          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveClient}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(o) => { setIsEditDialogOpen(o); if (!o) { resetForm(); setEditingClient(null); } }}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <Edit className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">Editar Cliente</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Edite as informações do cliente {editingClient?.name}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Informações Básicas</h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-sm font-medium text-foreground">Nome do Cliente</Label>
                  <Input
                    id="edit-name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Digite o nome completo"
                    autoComplete="off"
                    className="border-2 border-border/60 focus:border-primary/60 bg-background shadow-sm transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-phone" className="text-sm font-medium text-foreground">WhatsApp</Label>
                  <Input
                    id="edit-phone"
                    placeholder="11987654321 ou +5511987654321"
                    value={clientPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    autoComplete="off"
                    className={`border-2 focus:border-primary/60 bg-background shadow-sm transition-colors ${phoneError ? 'border-red-500 focus:border-red-500' : 'border-border/60'
                      }`}
                  />
                  {phoneError && (
                    <p className="text-sm text-red-600 mt-1">{phoneError}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Panel and Plan Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Configuração do Serviço</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Painel</Label>
                  <Select value={selectedPanelId} onValueChange={(value) => { setSelectedPanelId(value); setSelectedPlanId(""); }}>
                    <SelectTrigger className="border-2 border-border/60 focus:border-primary/60 bg-background shadow-sm transition-colors">
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
                  <Label className="text-sm font-medium text-foreground">Plano</Label>
                  <Select value={selectedPlanId} onValueChange={setSelectedPlanId} disabled={!selectedPanelId}>
                    <SelectTrigger className="border-2 border-border/60 focus:border-primary/60 bg-background shadow-sm transition-colors">
                      <SelectValue placeholder={selectedPanelId ? "Selecione um plano" : "Selecione um painel primeiro"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(plans || []).filter(pl => pl.panelId === selectedPanelId).map(pl => (
                        <SelectItem key={pl.id} value={pl.id}>
                          {pl.name} - R$ {pl.saleValue.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Credentials Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Credenciais de Acesso</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-username" className="text-sm font-medium text-foreground">Usuário</Label>
                  <Input
                    id="edit-username"
                    value={clientUsername}
                    onChange={(e) => setClientUsername(e.target.value)}
                    placeholder="Nome de usuário"
                    autoComplete="off"
                    className="border-2 border-border/60 focus:border-primary/60 bg-background shadow-sm transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-password" className="text-sm font-medium text-foreground">Senha</Label>
                  <div className="relative">
                    <Input
                      id="edit-password"
                      type={showEditPassword ? "text" : "password"}
                      value={clientPassword}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      placeholder="Senha de acesso"
                      autoComplete="new-password"
                      className={`border-2 focus:border-primary/60 bg-background shadow-sm transition-colors pr-10 ${passwordError ? 'border-red-500 focus:border-red-500' : 'border-border/60'
                        }`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                    >
                      {showEditPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {passwordError && (
                    <p className="text-sm text-red-600 mt-1">{passwordError}</p>
                  )}
                  {(() => {
                    const panelForEditPasswordCheck = panels?.find(p => p.id === selectedPanelId);
                    if (panelForEditPasswordCheck?.sigmaConnected && clientPassword.length > 0) {
                      const strengthInfo = getPasswordStrengthMessage(clientPassword);
                      return (
                        <p className={`text-sm mt-1 ${strengthInfo.color}`}>
                          {strengthInfo.message}
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>

            {/* Applications Section */}
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
                      <div className="flex items-center justify-between">
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

                      {/* Grid de aplicativos */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {apps.map((app) => (
                          <div
                            key={app.id}
                            className={`relative p-4 border-2 rounded-lg transition-all cursor-pointer hover:shadow-md ${selectedApps.includes(app.id)
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
                                id={`edit-app-${app.id}`}
                                checked={selectedApps.includes(app.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedApps([...selectedApps, app.id]);
                                  } else {
                                    setSelectedApps(selectedApps.filter(id => id !== app.id));
                                  }
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm">{app.name}</div>
                                {app.description && (
                                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {app.description}
                                  </div>
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
                <div className="text-center py-8 text-muted-foreground">
                  <Smartphone className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nenhum aplicativo cadastrado</p>
                  <p className="text-xs mt-1">Cadastre aplicativos na seção "Aplicativos" para selecioná-los aqui</p>
                </div>
              )}
            </div>

            {/* Payment Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Configuração de Pagamento</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Data de Vencimento</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start border-2 border-border/60 focus:border-primary/60 bg-background shadow-sm transition-colors">
                        {dueDate ? format(dueDate, 'dd/MM/yyyy') : 'Escolha uma data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus locale={ptBR} />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Valor de Desconto</Label>
                  <Input
                    type="number"
                    value={discountValue}
                    onChange={(e) => handleDiscountChange(e.target.value)}
                    placeholder="0.00"
                    className="border-2 border-border/60 focus:border-primary/60 bg-background shadow-sm transition-colors"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch checked={useFixedValue} onCheckedChange={setUseFixedValue} />
                    <Label className="text-sm font-medium text-foreground">Usar valor fixo</Label>
                  </div>
                  {useFixedValue && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">Valor Fixo</Label>
                      <Input
                        type="number"
                        value={fixedValue}
                        onChange={(e) => handleFixedValueChange(e.target.value)}
                        placeholder="Valor personalizado"
                        className="border-2 border-border/60 focus:border-primary/60 bg-background shadow-sm transition-colors"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Observações</h3>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Observações Adicionais</Label>
                <Textarea
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder="Informações adicionais sobre o cliente..."
                  className="border-2 border-border/60 focus:border-primary/60 bg-background shadow-sm transition-colors min-h-[80px] resize-none"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => { setIsEditDialogOpen(false); resetForm(); setEditingClient(null); }}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateClient}
              className="w-full sm:w-auto bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800"
            >
              <Edit className="mr-2 h-4 w-4" />
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      {paymentHistoryClient && (
        <PaymentHistory
          client={paymentHistoryClient}
          isOpen={isPaymentHistoryOpen}
          onClose={handleClosePaymentHistory}
        />
      )}

      {/* Password Warning Modal */}
      <Dialog open={passwordWarningOpen} onOpenChange={setPasswordWarningOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">Dica de Segurança</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Cliente salvo com sucesso! Aqui está uma recomendação
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800 whitespace-pre-line">
                {passwordWarningMessage}
              </p>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              onClick={() => {
                setPasswordWarningOpen(false);
                setPasswordWarningMessage("");
              }}
              className="w-full sm:w-auto bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800"
            >
              ✅ Entendi, obrigado!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal for Generate Invoice */}
      <Dialog open={confirmGenerateOpen} onOpenChange={setConfirmGenerateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar Fatura</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Deseja gerar uma fatura para <span className="font-semibold text-foreground">{nextPeriodToGenerate}</span>?
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmGenerateOpen(false);
                setClientToGenerate(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmGenerateInvoice}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Gerar Fatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
