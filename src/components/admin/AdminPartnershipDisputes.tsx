import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Flag, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  Search,
  Ban,
  Unlock
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Dispute {
  id: string;
  partnership_id: string;
  reporter_driver_id: string;
  reported_driver_id: string;
  reason: string;
  amount_owed: number;
  description: string;
  status: string;
  admin_notes: string | null;
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
  reporter_name?: string;
  reporter_photo?: string;
  reported_name?: string;
  reported_photo?: string;
}

export function AdminPartnershipDisputes() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [resolution, setResolution] = useState('');
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    loadDisputes();
  }, []);

  const loadDisputes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('partnership_disputes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with driver names
      const enrichedDisputes: Dispute[] = [];
      for (const d of data || []) {
        // Get reporter info
        const { data: reporterDriver } = await supabase
          .from('drivers')
          .select('user_id')
          .eq('id', d.reporter_driver_id)
          .single();

        const { data: reporterProfile } = reporterDriver 
          ? await supabase
              .from('profiles')
              .select('full_name, profile_photo_url')
              .eq('id', reporterDriver.user_id)
              .single()
          : { data: null };

        // Get reported info
        const { data: reportedDriver } = await supabase
          .from('drivers')
          .select('user_id')
          .eq('id', d.reported_driver_id)
          .single();

        const { data: reportedProfile } = reportedDriver 
          ? await supabase
              .from('profiles')
              .select('full_name, profile_photo_url')
              .eq('id', reportedDriver.user_id)
              .single()
          : { data: null };

        enrichedDisputes.push({
          ...d,
          reporter_name: reporterProfile?.full_name || 'Chauffeur',
          reporter_photo: reporterProfile?.profile_photo_url,
          reported_name: reportedProfile?.full_name || 'Chauffeur',
          reported_photo: reportedProfile?.profile_photo_url,
        });
      }
      
      setDisputes(enrichedDisputes);
    } catch (error) {
      console.error('Error loading disputes:', error);
      toast.error('Erreur lors du chargement des signalements');
    } finally {
      setLoading(false);
    }
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'non_payment': return 'Non-paiement';
      case 'late_payment': return 'Retard de paiement';
      case 'partial_payment': return 'Paiement partiel';
      default: return 'Autre';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" /> En attente
        </Badge>;
      case 'investigating':
        return <Badge variant="default" className="flex items-center gap-1">
          <Search className="h-3 w-3" /> En cours
        </Badge>;
      case 'resolved':
        return <Badge variant="outline" className="flex items-center gap-1 text-green-600">
          <CheckCircle className="h-3 w-3" /> Résolu
        </Badge>;
      case 'dismissed':
        return <Badge variant="outline" className="flex items-center gap-1 text-muted-foreground">
          <XCircle className="h-3 w-3" /> Rejeté
        </Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const openDisputeDetails = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setAdminNotes(dispute.admin_notes || '');
    setResolution(dispute.resolution || '');
    setNewStatus(dispute.status);
    setDialogOpen(true);
  };

  const updateDispute = async () => {
    if (!selectedDispute) return;

    try {
      const { error } = await supabase
        .from('partnership_disputes')
        .update({
          status: newStatus,
          admin_notes: adminNotes,
          resolution: resolution,
          resolved_at: ['resolved', 'dismissed'].includes(newStatus) ? new Date().toISOString() : null,
        })
        .eq('id', selectedDispute.id);

      if (error) throw error;

      toast.success('Signalement mis à jour');
      setDialogOpen(false);
      loadDisputes();
    } catch (error) {
      console.error('Error updating dispute:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const blockDriverSharing = async (driverId: string, partnershipId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('driver_partnerships')
        .update({
          sharing_blocked: true,
          blocked_reason: reason,
          blocked_at: new Date().toISOString(),
        })
        .eq('id', partnershipId);

      if (error) throw error;

      toast.success('Partage bloqué pour ce chauffeur');
      loadDisputes();
    } catch (error) {
      console.error('Error blocking driver:', error);
      toast.error('Erreur lors du blocage');
    }
  };

  const unblockDriverSharing = async (partnershipId: string) => {
    try {
      const { error } = await supabase
        .from('driver_partnerships')
        .update({
          sharing_blocked: false,
          blocked_reason: null,
          blocked_at: null,
        })
        .eq('id', partnershipId);

      if (error) throw error;

      toast.success('Partage débloqué');
      loadDisputes();
    } catch (error) {
      console.error('Error unblocking driver:', error);
      toast.error('Erreur lors du déblocage');
    }
  };

  const pendingCount = disputes.filter(d => d.status === 'pending').length;
  const investigatingCount = disputes.filter(d => d.status === 'investigating').length;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Flag className="h-6 w-6" />
            Litiges de partenariat
          </h2>
          <p className="text-muted-foreground">
            Gérez les signalements de non-paiement entre chauffeurs
          </p>
        </div>
        <div className="flex gap-2">
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-sm">
              {pendingCount} en attente
            </Badge>
          )}
          {investigatingCount > 0 && (
            <Badge variant="default" className="text-sm">
              {investigatingCount} en cours
            </Badge>
          )}
        </div>
      </div>

      {disputes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun litige signalé</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {disputes.map((dispute) => (
            <Card 
              key={dispute.id} 
              className={`cursor-pointer hover:shadow-md transition-shadow ${
                dispute.status === 'pending' ? 'border-amber-500/50' : ''
              }`}
              onClick={() => openDisputeDetails(dispute)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={dispute.reporter_photo || undefined} />
                          <AvatarFallback>{dispute.reporter_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{dispute.reporter_name}</span>
                        <span className="text-muted-foreground">signale</span>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={dispute.reported_photo || undefined} />
                          <AvatarFallback>{dispute.reported_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{dispute.reported_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">{getReasonLabel(dispute.reason)}</Badge>
                        <span className="text-muted-foreground">•</span>
                        <span className="font-medium text-destructive">
                          {dispute.amount_owed.toFixed(2)}€ impayés
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">
                          {format(new Date(dispute.created_at), 'dd/MM/yyyy', { locale: fr })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {dispute.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(dispute.status)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dispute Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5" />
              Détails du signalement
            </DialogTitle>
          </DialogHeader>

          {selectedDispute && (
            <div className="space-y-6">
              {/* Parties involved */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Signalé par</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={selectedDispute.reporter_photo || undefined} />
                      <AvatarFallback>{selectedDispute.reporter_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{selectedDispute.reporter_name}</span>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Chauffeur signalé</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={selectedDispute.reported_photo || undefined} />
                      <AvatarFallback>{selectedDispute.reported_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{selectedDispute.reported_name}</span>
                  </CardContent>
                </Card>
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Raison</Label>
                    <p className="font-medium">{getReasonLabel(selectedDispute.reason)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Montant impayé</Label>
                    <p className="font-medium text-destructive">{selectedDispute.amount_owed.toFixed(2)}€</p>
                  </div>
                </div>
                
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="mt-1 p-3 bg-muted rounded-lg">{selectedDispute.description}</p>
                </div>
              </div>

              {/* Admin Actions */}
              <div className="space-y-4 border-t pt-4">
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="investigating">En cours d'investigation</SelectItem>
                      <SelectItem value="resolved">Résolu</SelectItem>
                      <SelectItem value="dismissed">Rejeté</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Notes admin</Label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Notes internes..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Résolution</Label>
                  <Textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="Description de la résolution..."
                    rows={2}
                  />
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Vous pouvez bloquer l'accès au partage pour le chauffeur signalé.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Button 
                    variant="destructive" 
                    className="flex-1"
                    onClick={() => blockDriverSharing(
                      selectedDispute.reported_driver_id, 
                      selectedDispute.partnership_id,
                      `Signalement: ${selectedDispute.reason}`
                    )}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Bloquer le partage
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => unblockDriverSharing(selectedDispute.partnership_id)}
                  >
                    <Unlock className="h-4 w-4 mr-2" />
                    Débloquer
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={updateDispute}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}