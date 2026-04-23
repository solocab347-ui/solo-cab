import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  Users, 
  Clock, 
  CheckCircle2, 
  Play, 
  XCircle, 
  Loader2, 
  ArrowRight,
  RotateCcw,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CourseShareStatusIndicatorProps {
  courseId: string;
  driverId: string;
  onCancelSuccess?: () => void;
}

interface ShareInfo {
  id: string;
  status: string;
  sharing_mode: string;
  receiver_name: string;
  receiver_photo: string | null;
  receiver_company: string | null;
  receiver_code?: string;
  commission_percentage: number;
  created_at: string;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
}

interface SharingStatus {
  has_sharing: boolean;
  active_share?: {
    id: string;
    status: string;
    receiver_name: string;
    receiver_photo: string | null;
    receiver_company: string | null;
    receiver_code: string;
    accepted_at: string;
    started_at: string | null;
  };
  pending_share?: {
    id: string;
    status: string;
    sharing_mode: string;
    pending_count: number;
    created_at: string;
    receiver_name?: string;
    receiver_photo?: string | null;
    receiver_company?: string | null;
  };
  all_shares: ShareInfo[] | null;
}

export function CourseShareStatusIndicator({ courseId, driverId, onCancelSuccess }: CourseShareStatusIndicatorProps) {
  const [status, setStatus] = useState<SharingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadSharingStatus();
  }, [courseId, driverId]);

  const loadSharingStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('get_course_sharing_status', {
        p_course_id: courseId,
        p_driver_id: driverId
      });

      if (error) throw error;
      setStatus(data as unknown as SharingStatus);
    } catch (error) {
      console.error('Error loading sharing status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSharing = async () => {
    if (!status?.pending_share?.id) return;

    setCancelling(true);
    try {
      const { data, error } = await supabase.rpc('cancel_shared_course', {
        p_shared_course_id: status.pending_share.id,
        p_driver_id: driverId
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; message?: string };
      if (result.success) {
        toast.success('Partage annulé');
        loadSharingStatus();
        onCancelSuccess?.();
      } else {
        toast.error(result.error || '\'Erreur lors de lannulation');
      }
    } catch (error) {
      console.error('Error cancelling share:', error);
      toast.error('\'Erreur lors de lannulation');
    } finally {
      setCancelling(false);
      setShowDetails(false);
    }
  };

  if (loading) return null;
  if (!status?.has_sharing) return null;

  const handleQuickCancel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!status?.pending_share?.id) return;

    setCancelling(true);
    try {
      const { data, error } = await supabase.rpc('cancel_shared_course', {
        p_shared_course_id: status.pending_share.id,
        p_driver_id: driverId
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; message?: string };
      if (result.success) {
        toast.success('Partage annulé - Course récupérée');
        loadSharingStatus();
        onCancelSuccess?.();
      } else {
        toast.error(result.error || '\'Erreur lors de lannulation');
      }
    } catch (error) {
      console.error('Error cancelling share:', error);
      toast.error('\'Erreur lors de lannulation');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = () => {
    if (status.active_share) {
      // Course acceptée ou en cours par un partenaire - AFFICHER LE NOM
      const partnerName = status.active_share.receiver_name;
      const shortName = partnerName.split(' ')[0]; // Premier prénom seulement pour compacité
      
      switch (status.active_share.status) {
        case 'in_progress':
          return (
            <Badge className="bg-blue-500/20 text-blue-600 border-0 cursor-pointer" onClick={() => setShowDetails(true)}>
              <Play className="w-3 h-3 mr-1" />
              En cours par {shortName}
            </Badge>
          );
        case 'accepted':
          return (
            <Badge className="bg-green-500/20 text-green-600 border-0 cursor-pointer" onClick={() => setShowDetails(true)}>
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Acceptée par {shortName}
            </Badge>
          );
      }
    }

    if (status.pending_share) {
      if (status.pending_share.sharing_mode === 'pool') {
        // Envoyée à plusieurs partenaires
        return (
          <div className="flex items-center gap-1 flex-wrap">
            <Badge className="bg-amber-500/20 text-amber-600 border-0 cursor-pointer" onClick={() => setShowDetails(true)}>
              <Users className="w-3 h-3 mr-1" />
              Envoyée à {status.pending_share.pending_count} partenaires
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-destructive hover:bg-destructive/10"
              onClick={handleQuickCancel}
              disabled={cancelling}
            >
              {cancelling ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
            </Button>
          </div>
        );
      }
      
      // Envoyée à un seul partenaire - afficher son nom
      const receiverName = status.pending_share.receiver_name;
      const shortReceiverName = receiverName ? receiverName.split(' ')[0] : 'partenaire';
      
      return (
        <div className="flex items-center gap-1 flex-wrap">
          <Badge className="bg-amber-500/20 text-amber-600 border-0 cursor-pointer" onClick={() => setShowDetails(true)}>
            <Clock className="w-3 h-3 mr-1" />
            Envoyée à {shortReceiverName}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-destructive hover:bg-destructive/10"
            onClick={handleQuickCancel}
            disabled={cancelling}
          >
            {cancelling ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {getStatusBadge()}

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Statut du partage
            </DialogTitle>
            <DialogDescription>
              Suivez l'avancement de la course partagée
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Active share info */}
            {status.active_share && (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={status.active_share.receiver_photo || undefined} />
                    <AvatarFallback>{status.active_share.receiver_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{status.active_share.receiver_name}</p>
                    {status.active_share.receiver_company && (
                      <p className="text-xs text-muted-foreground">{status.active_share.receiver_company}</p>
                    )}
                    <p className="text-xs font-mono text-primary">{status.active_share.receiver_code}</p>
                  </div>
                  <Badge className={status.active_share.status === 'in_progress' ? 'bg-blue-500/20 text-blue-600' : 'bg-green-500/20 text-green-600'}>
                    {status.active_share.status === 'in_progress' ? 'En cours' : 'Acceptée'}
                  </Badge>
                </div>

                {/* Timeline */}
                <div className="space-y-2 text-sm">
                  {status.active_share.accepted_at && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span>Acceptée le {format(new Date(status.active_share.accepted_at), "d MMM 'à' HH:mm", { locale: fr })}</span>
                    </div>
                  )}
                  {status.active_share.started_at && (
                    <div className="flex items-center gap-2">
                      <Play className="w-4 h-4 text-blue-600" />
                      <span>Démarrée le {format(new Date(status.active_share.started_at), "d MMM 'à' HH:mm", { locale: fr })}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pending share info */}
            {status.pending_share && (
              <div className="space-y-3">
                {/* Show partner info for single share */}
                {status.pending_share.sharing_mode === 'single' && status.pending_share.receiver_name && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={status.pending_share.receiver_photo || undefined} />
                      <AvatarFallback>{status.pending_share.receiver_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{status.pending_share.receiver_name}</p>
                      {status.pending_share.receiver_company && (
                        <p className="text-xs text-muted-foreground">{status.pending_share.receiver_company}</p>
                      )}
                    </div>
                    <Badge className="bg-amber-500/20 text-amber-600 border-0">
                      <Clock className="w-3 h-3 mr-1" />
                      En attente
                    </Badge>
                  </div>
                )}
                
                <Alert className="bg-amber-500/10 border-amber-500/30">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <AlertDescription>
                    {status.pending_share.sharing_mode === 'pool' ? (
                      <>Course proposée à <strong>{status.pending_share.pending_count} partenaires</strong>. Le premier à accepter la récupérera.</>
                    ) : (
                      <>En attente de réponse du partenaire depuis le {format(new Date(status.pending_share.created_at), "d MMM 'à' HH:mm", { locale: fr })}</>
                    )}
                  </AlertDescription>
                </Alert>

                <Button
                  variant="outline"
                  className="w-full text-destructive border-destructive/50 hover:bg-destructive/10"
                  onClick={handleCancelSharing}
                  disabled={cancelling}
                >
                  {cancelling ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-2" />
                  )}
                  Annuler le partage et récupérer la course
                </Button>
              </div>
            )}

            {/* All shares history */}
            {status.all_shares && status.all_shares.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Historique des partages</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {status.all_shares.map((share) => (
                    <div
                      key={share.id}
                      className={`p-2 rounded-lg border text-sm flex items-center justify-between ${
                        share.cancelled_at ? 'bg-muted/50 opacity-60' :
                        share.status === 'completed' ? 'bg-green-500/5 border-green-500/20' :
                        share.status === 'declined' ? 'bg-red-500/5 border-red-500/20' :
                        'bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={share.receiver_photo || undefined} />
                          <AvatarFallback className="text-xs">{share.receiver_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{share.receiver_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {share.commission_percentage}% rétribution
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {share.cancelled_at ? 'Annulé' :
                         share.status === 'completed' ? 'Terminé' :
                         share.status === 'declined' ? 'Refusé' :
                         share.status === 'expired' ? 'Expiré' :
                         share.status === 'accepted' ? 'Accepté' :
                         share.status === 'in_progress' ? 'En cours' :
                         'En attente'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
