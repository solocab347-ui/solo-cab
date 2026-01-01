import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  XCircle,
  User,
  Globe,
  Monitor,
  Calendar,
  MessageSquare,
  Eye,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

interface ErrorReport {
  id: string;
  user_id: string | null;
  user_role: string | null;
  user_email: string | null;
  user_name: string | null;
  error_message: string;
  error_stack: string | null;
  page_url: string | null;
  page_route: string | null;
  user_agent: string | null;
  screen_size: string | null;
  browser_info: string | null;
  additional_context: Record<string, any> | null;
  status: string;
  admin_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  new: { 
    label: 'Nouveau', 
    color: 'bg-destructive/20 text-destructive border-destructive/30',
    icon: <AlertTriangle className="w-4 h-4" />
  },
  in_progress: { 
    label: 'En cours', 
    color: 'bg-warning/20 text-warning border-warning/30',
    icon: <Clock className="w-4 h-4" />
  },
  resolved: { 
    label: 'Résolu', 
    color: 'bg-success/20 text-success border-success/30',
    icon: <CheckCircle className="w-4 h-4" />
  },
  ignored: { 
    label: 'Ignoré', 
    color: 'bg-muted text-muted-foreground border-muted-foreground/30',
    icon: <XCircle className="w-4 h-4" />
  }
};

const roleLabels: Record<string, string> = {
  client: 'Client',
  driver: 'Chauffeur',
  fleet_manager: 'Gestionnaire',
  company: 'Entreprise',
  admin: 'Admin',
  anonymous: 'Anonyme',
  unknown: 'Inconnu'
};

export const AdminErrorReports = () => {
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<ErrorReport | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { data: reports, isLoading } = useQuery({
    queryKey: ['error-reports', filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('error_reports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ErrorReport[];
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const updateData: Record<string, any> = { status };
      if (notes !== undefined) updateData.admin_notes = notes;
      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('error_reports')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-reports'] });
      toast.success('Rapport mis à jour');
      setSelectedReport(null);
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    }
  });

  const handleUpdateStatus = (status: string) => {
    if (!selectedReport) return;
    updateMutation.mutate({ 
      id: selectedReport.id, 
      status, 
      notes: adminNotes || selectedReport.admin_notes || undefined 
    });
  };

  const countByStatus = (status: string) => {
    return reports?.filter(r => r.status === status).length || 0;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-destructive/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{countByStatus('new')}</p>
                <p className="text-sm text-muted-foreground">Nouveaux</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-warning/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-warning" />
              <div>
                <p className="text-2xl font-bold">{countByStatus('in_progress')}</p>
                <p className="text-sm text-muted-foreground">En cours</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-success/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              <div>
                <p className="text-2xl font-bold">{countByStatus('resolved')}</p>
                <p className="text-sm text-muted-foreground">Résolus</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{reports?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rapports</SelectItem>
            <SelectItem value="new">Nouveaux</SelectItem>
            <SelectItem value="in_progress">En cours</SelectItem>
            <SelectItem value="resolved">Résolus</SelectItem>
            <SelectItem value="ignored">Ignorés</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Liste des rapports */}
      <div className="space-y-3">
        {reports?.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-success" />
              <p>Aucun rapport d'erreur pour le moment.</p>
            </CardContent>
          </Card>
        ) : (
          reports?.map((report) => {
            const config = statusConfig[report.status] || statusConfig.new;
            return (
              <Card 
                key={report.id} 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => {
                  setSelectedReport(report);
                  setAdminNotes(report.admin_notes || '');
                }}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={config.color}>
                          {config.icon}
                          <span className="ml-1">{config.label}</span>
                        </Badge>
                        <Badge variant="secondary">
                          {roleLabels[report.user_role || 'unknown']}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(report.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </span>
                      </div>
                      <p className="font-mono text-sm text-destructive truncate">
                        {report.error_message}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {report.user_name && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {report.user_name}
                          </span>
                        )}
                        {report.page_route && (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {report.page_route}
                          </span>
                        )}
                        {report.screen_size && (
                          <span className="flex items-center gap-1">
                            <Monitor className="w-3 h-3" />
                            {report.screen_size}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Modal de détail */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Détail du rapport
            </DialogTitle>
            <DialogDescription>
              Rapport #{selectedReport?.id.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              {/* Infos utilisateur */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Utilisateur</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedReport.user_name || 'Anonyme'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Email</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedReport.user_email || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Rôle</p>
                  <Badge variant="secondary">
                    {roleLabels[selectedReport.user_role || 'unknown']}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Date</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedReport.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                  </p>
                </div>
              </div>

              {/* Erreur */}
              <div>
                <p className="text-sm font-medium mb-1">Message d'erreur</p>
                <div className="bg-destructive/5 border border-destructive/20 rounded p-3">
                  <p className="text-sm font-mono text-destructive break-words">
                    {selectedReport.error_message}
                  </p>
                </div>
              </div>

              {selectedReport.error_stack && (
                <div>
                  <p className="text-sm font-medium mb-1">Stack trace</p>
                  <div className="bg-muted rounded p-3 max-h-40 overflow-y-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {selectedReport.error_stack}
                    </pre>
                  </div>
                </div>
              )}

              {/* Contexte */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Page</p>
                  <p className="text-sm text-muted-foreground break-all">
                    {selectedReport.page_route || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Écran</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedReport.screen_size || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Notes admin */}
              <div>
                <p className="text-sm font-medium mb-1">Notes de l'administrateur</p>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Ajouter des notes sur la résolution..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={() => handleUpdateStatus('ignored')}
              disabled={updateMutation.isPending}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Ignorer
            </Button>
            <Button 
              variant="outline"
              onClick={() => handleUpdateStatus('in_progress')}
              disabled={updateMutation.isPending}
              className="border-warning/50 text-warning hover:bg-warning/10"
            >
              <Clock className="w-4 h-4 mr-2" />
              En cours
            </Button>
            <Button 
              onClick={() => handleUpdateStatus('resolved')}
              disabled={updateMutation.isPending}
              className="bg-success hover:bg-success/90"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Marquer résolu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminErrorReports;
