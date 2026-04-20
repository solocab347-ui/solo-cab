/**
 * Dashboard admin "Virements bloqués"
 * - Liste tous les failed_transfers non résolus
 * - Filtre par statut
 * - Action : forcer un retry, marquer comme résolu manuellement
 * - Stats globales : nb échecs, montant bloqué total
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, RefreshCw, CheckCircle2, XCircle, Loader2, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

export const AdminFailedTransfers = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState('unresolved');

  const { data: transfers, isLoading } = useQuery({
    queryKey: ['admin-failed-transfers', tab],
    queryFn: async () => {
      let query = supabase
        .from('failed_transfers')
        .select('*, drivers!inner(id, company_name, user_id, profiles(full_name, email))')
        .order('created_at', { ascending: false });

      if (tab === 'unresolved') {
        query = query.in('status', ['pending_retry', 'awaiting_rib_update', 'awaiting_admin_review', 'retrying']);
      } else if (tab === 'permanently_failed') {
        query = query.eq('status', 'permanently_failed');
      } else if (tab === 'resolved') {
        query = query.eq('status', 'resolved').limit(50);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 60_000,
  });

  const retryMutation = useMutation({
    mutationFn: async (failed_transfer_ids: string[]) => {
      const { data, error } = await supabase.functions.invoke('retry-failed-transfers', {
        body: { failed_transfer_ids, trigger: 'admin_manual' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(
        `${data.succeeded} virement(s) réussi(s), ${data.failed} échec(s), ${data.skipped} ignoré(s)`
      );
      qc.invalidateQueries({ queryKey: ['admin-failed-transfers'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const markResolvedMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('failed_transfers')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolution_method: 'admin_manual',
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Marqué comme résolu');
      qc.invalidateQueries({ queryKey: ['admin-failed-transfers'] });
    },
  });

  const totalBlockedCents = (transfers ?? []).reduce((sum, t: any) => sum + (t.amount_cents ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <AlertTriangle className="w-4 h-4" /> Virements en attente
          </div>
          <div className="text-2xl font-bold">{transfers?.length ?? 0}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Building2 className="w-4 h-4" /> Montant bloqué
          </div>
          <div className="text-2xl font-bold">{(totalBlockedCents / 100).toFixed(2)} €</div>
        </Card>
        <Card className="p-4 flex items-center justify-center">
          <Button
            onClick={() => retryMutation.mutate((transfers ?? []).map((t: any) => t.id))}
            disabled={!transfers?.length || retryMutation.isPending}
            className="w-full"
          >
            {retryMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Tout retenter
          </Button>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="unresolved">Non résolus</TabsTrigger>
          <TabsTrigger value="permanently_failed">Échecs définitifs</TabsTrigger>
          <TabsTrigger value="resolved">Résolus</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-2">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : !transfers?.length ? (
            <Card className="p-8 text-center text-muted-foreground">Aucun virement dans cette catégorie</Card>
          ) : (
            transfers.map((t: any) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">
                        {t.drivers?.company_name ?? t.drivers?.profiles?.full_name ?? 'Chauffeur'}
                      </span>
                      <Badge variant="outline" className="text-xs">{statusLabel(t.status)}</Badge>
                    </div>
                    <div className="text-2xl font-bold mb-1">{(t.amount_cents / 100).toFixed(2)} €</div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>Échec : {format(new Date(t.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}</div>
                      {t.failure_code && <div>Code : <code className="text-destructive">{t.failure_code}</code></div>}
                      {t.failure_message && <div className="truncate">Message : {t.failure_message}</div>}
                      <div>Tentatives : {t.retry_count}/5</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {t.status !== 'resolved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => retryMutation.mutate([t.id])}
                        disabled={retryMutation.isPending}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" /> Retenter
                      </Button>
                    )}
                    {t.status !== 'resolved' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markResolvedMutation.mutate(t.id)}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Résoudre
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

function statusLabel(s: string) {
  const m: Record<string, string> = {
    pending_retry: 'En attente',
    awaiting_rib_update: 'RIB à mettre à jour',
    awaiting_admin_review: 'Révision admin',
    retrying: 'En cours',
    resolved: 'Résolu',
    permanently_failed: 'Échec définitif',
    cancelled: 'Annulé',
  };
  return m[s] ?? s;
}
