"use client";

import { useEffect } from 'react';
import { useMySQL } from '@/lib/mysql-provider';
// Removed useCollection - using direct API calls;
// Removed Firebase Firestore imports;
import { useSigmaIntegration } from '@/hooks/use-sigma-integration';
import { useClients } from '@/hooks/use-clients';
import { usePlans } from '@/hooks/use-plans';
import { usePanels } from '@/hooks/use-panels';

interface SigmaAutoSyncProps {
  enabled?: boolean;
  intervalMinutes?: number;
}

export function SigmaAutoSync({ enabled = true, intervalMinutes = 30 }: SigmaAutoSyncProps) {
  const { user } = useMySQL();
  const resellerId = user?.id;
  const sigmaIntegration = useSigmaIntegration();

  // Collections

  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: plans, isLoading: plansLoading } = usePlans();
  const { data: panels, isLoading: panelsLoading } = usePanels();

  useEffect(() => {
    if (!enabled || !clients || !plans || !panels || !resellerId) {
      return;
    }

    const syncAllClients = async () => {
      console.log('🔄 Iniciando sincronização automática com Sigma IPTV...');
      
      let syncCount = 0;
      let updateCount = 0;

      for (const client of clients) {
        // Skip clients without username
        if (!client.username) continue;

        // Find client's panel
        const clientPlan = plans.find((p: any) => p.id === client.plan_id);
        if (!clientPlan) continue;

        const clientPanel = panels.find((p: any) => p.id === clientPlan.panel_id);
        if (!clientPanel?.sigma_connected) continue;

        try {
          const result = await sigmaIntegration.syncFromSigma(
            client,
            clientPanel,
            resellerId
          );

          syncCount++;

          if (result.success && result.data?.updated) {
            updateCount++;
            console.log(`✅ Cliente ${client.username} atualizado: ${result.data.oldDate} → ${result.data.newDate}`);
          } else if (result.success && !result.data?.updated) {
            console.log(`ℹ️ Cliente ${client.username} já sincronizado`);
          } else if (result.error?.includes('não existe no Sigma')) {
            console.log(`⚠️ Cliente ${client.username} não existe no Sigma (ignorando)`);
          } else {
            console.error(`❌ Erro ao sincronizar ${client.username}:`, result.error);
          }

          // Add delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`❌ Erro ao sincronizar ${client.username}:`, error);
        }
      }

      console.log(`🔄 Sincronização concluída: ${syncCount} clientes verificados, ${updateCount} atualizados`);
    };

    // Run initial sync after 5 seconds
    const initialTimeout = setTimeout(syncAllClients, 5000);

    // Set up periodic sync
    const interval = setInterval(syncAllClients, intervalMinutes * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [enabled, clients, plans, panels, resellerId, intervalMinutes, sigmaIntegration]);

  // This component doesn't render anything
  return null;
}

export default SigmaAutoSync;