"use client";

import { useEffect } from 'react';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection } from 'firebase/firestore';
import { useSigmaIntegration } from '@/hooks/use-sigma-integration';

interface SigmaAutoSyncProps {
  enabled?: boolean;
  intervalMinutes?: number;
}

export function SigmaAutoSync({ enabled = true, intervalMinutes = 30 }: SigmaAutoSyncProps) {
  const { firestore, user } = useFirebase();
  const resellerId = user?.uid;
  const sigmaIntegration = useSigmaIntegration();

  // Collections
  const clientsCollection = useMemoFirebase(() => {
    if (!resellerId) return null;
    return collection(firestore, 'resellers', resellerId, 'clients');
  }, [firestore, resellerId]);

  const plansCollection = useMemoFirebase(() => {
    if (!resellerId) return null;
    return collection(firestore, 'resellers', resellerId, 'plans');
  }, [firestore, resellerId]);

  const panelsCollection = useMemoFirebase(() => {
    if (!resellerId) return null;
    return collection(firestore, 'resellers', resellerId, 'panels');
  }, [firestore, resellerId]);

  const { data: clients } = useCollection(clientsCollection);
  const { data: plans } = useCollection(plansCollection);
  const { data: panels } = useCollection(panelsCollection);

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
        const clientPlan = plans.find((p: any) => p.id === client.planId);
        if (!clientPlan) continue;

        const clientPanel = panels.find((p: any) => p.id === clientPlan.panelId);
        if (!clientPanel?.sigmaConnected) continue;

        try {
          const result = await sigmaIntegration.syncFromSigma(
            client,
            clientPanel,
            firestore,
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