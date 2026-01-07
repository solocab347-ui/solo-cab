import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Ban, 
  Loader2, 
  AlertTriangle,
  UserX,
  Check,
  Building2,
  User
} from 'lucide-react';

interface BlockedEntity {
  id: string;
  block_id: string;
  name: string;
  avatar?: string | null;
  blocked_at: string;
  block_reason?: string | null;
  type: 'fleet_manager' | 'driver';
}

interface FleetDriverBlockManagerProps {
  entityId: string; // fleet_manager_id or driver_id
  entityType: 'fleet_manager' | 'driver';
  onBlockChange?: () => void;
}

// Dialog pour bloquer
interface BlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetName: string;
  targetType: 'fleet_manager' | 'driver';
  onConfirmBlock: (reason: string) => Promise<void>;
  blocking: boolean;
}

export function BlockDialog({
  open,
  onOpenChange,
  targetName,
  targetType,
  onConfirmBlock,
  blocking,
}: BlockDialogProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = async () => {
    await onConfirmBlock(reason);
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Ban className="h-5 w-5" />
            Bloquer {targetType === 'fleet_manager' ? 'ce gestionnaire' : 'ce chauffeur'}
          </DialogTitle>
          <DialogDescription>
            Bloquer <strong>{targetName}</strong>
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-sm">
            En bloquant {targetType === 'fleet_manager' ? 'ce gestionnaire' : 'ce chauffeur'} :
            <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
              <li>Vous ne verrez plus son profil dans les recherches</li>
              <li>Il ne verra plus votre profil dans ses recherches</li>
              <li>Aucune nouvelle demande de partenariat ne sera possible</li>
              <li>Vous pourrez le débloquer à tout moment</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label>Motif du blocage (optionnel)</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Expliquez pourquoi vous bloquez ce profil..."
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            Ce motif reste privé et ne sera pas communiqué.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={blocking}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={blocking}>
            {blocking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Blocage...
              </>
            ) : (
              <>
                <Ban className="h-4 w-4 mr-2" />
                Confirmer le blocage
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook pour gérer les blocages
export function useFleetDriverBlocks(entityId: string, entityType: 'fleet_manager' | 'driver') {
  const [blockedEntities, setBlockedEntities] = useState<BlockedEntity[]>([]);
  const [loading, setLoading] = useState(false);

  const loadBlocks = async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('fleet_driver_blocks')
        .select('*');

      if (entityType === 'fleet_manager') {
        query = query.eq('fleet_manager_id', entityId).eq('blocked_by', 'fleet_manager');
      } else {
        query = query.eq('driver_id', entityId).eq('blocked_by', 'driver');
      }

      const { data: blocks, error } = await query;
      if (error) throw error;

      // Load names for blocked entities
      const entities: BlockedEntity[] = [];
      for (const block of blocks || []) {
        if (entityType === 'fleet_manager') {
          // Fleet manager blocked a driver
          const { data: driver } = await supabase
            .from('drivers')
            .select('id, company_name, user_id')
            .eq('id', block.driver_id)
            .single();
          
          if (driver) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', driver.user_id)
              .single();

            entities.push({
              id: block.driver_id,
              block_id: block.id,
              name: profile?.full_name || driver.company_name || 'Chauffeur',
              avatar: profile?.avatar_url,
              blocked_at: block.blocked_at,
              block_reason: block.block_reason,
              type: 'driver',
            });
          }
        } else {
          // Driver blocked a fleet manager
          const { data: fleet } = await supabase
            .from('fleet_managers')
            .select('id, company_name, logo_url')
            .eq('id', block.fleet_manager_id)
            .single();

          if (fleet) {
            entities.push({
              id: block.fleet_manager_id,
              block_id: block.id,
              name: fleet.company_name || 'Gestionnaire',
              avatar: fleet.logo_url,
              blocked_at: block.blocked_at,
              block_reason: block.block_reason,
              type: 'fleet_manager',
            });
          }
        }
      }

      setBlockedEntities(entities);
    } catch (error) {
      console.error('Error loading blocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const blockEntity = async (
    targetId: string,
    reason: string
  ): Promise<boolean> => {
    try {
      const insertData = entityType === 'fleet_manager'
        ? {
            fleet_manager_id: entityId,
            driver_id: targetId,
            blocked_by: 'fleet_manager',
            block_reason: reason || null,
          }
        : {
            fleet_manager_id: targetId,
            driver_id: entityId,
            blocked_by: 'driver',
            block_reason: reason || null,
          };

      const { error } = await supabase
        .from('fleet_driver_blocks')
        .insert(insertData);

      if (error) throw error;
      
      await loadBlocks();
      return true;
    } catch (error) {
      console.error('Error blocking:', error);
      return false;
    }
  };

  const unblockEntity = async (blockId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('fleet_driver_blocks')
        .delete()
        .eq('id', blockId);

      if (error) throw error;
      
      await loadBlocks();
      return true;
    } catch (error) {
      console.error('Error unblocking:', error);
      return false;
    }
  };

  return {
    blockedEntities,
    loading,
    loadBlocks,
    blockEntity,
    unblockEntity,
  };
}

// Liste des profils bloqués
export function BlockedEntitiesList({
  entityId,
  entityType,
  onBlockChange,
}: FleetDriverBlockManagerProps) {
  const { blockedEntities, loading, loadBlocks, unblockEntity } = useFleetDriverBlocks(entityId, entityType);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  useEffect(() => {
    loadBlocks();
  }, [entityId]);

  const handleUnblock = async (entity: BlockedEntity) => {
    setUnblocking(entity.block_id);
    const success = await unblockEntity(entity.block_id);
    if (success) {
      toast.success(`${entity.name} a été débloqué`);
      onBlockChange?.();
    } else {
      toast.error('Erreur lors du déblocage');
    }
    setUnblocking(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (blockedEntities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <UserX className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Aucun profil bloqué</p>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[400px]">
      <div className="space-y-2">
        {blockedEntities.map((entity) => (
          <div
            key={entity.block_id}
            className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={entity.avatar || undefined} />
              <AvatarFallback className="bg-destructive/10 text-destructive">
                {entity.type === 'fleet_manager' ? (
                  <Building2 className="h-4 w-4" />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{entity.name}</p>
              <p className="text-xs text-muted-foreground">
                Bloqué le {new Date(entity.blocked_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUnblock(entity)}
              disabled={unblocking === entity.block_id}
            >
              {unblocking === entity.block_id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Débloquer
                </>
              )}
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

// Card complète pour gérer les blocages
export function FleetDriverBlockManager({
  entityId,
  entityType,
  onBlockChange,
}: FleetDriverBlockManagerProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Ban className="h-4 w-4 text-destructive" />
          Profils bloqués
        </CardTitle>
      </CardHeader>
      <CardContent>
        <BlockedEntitiesList
          entityId={entityId}
          entityType={entityType}
          onBlockChange={onBlockChange}
        />
      </CardContent>
    </Card>
  );
}
