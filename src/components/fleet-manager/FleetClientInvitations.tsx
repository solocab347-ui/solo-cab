import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  UserPlus,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  Send,
  Loader2,
  Mail,
  Phone,
  User,
  Link2,
  Trash2,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Search,
  Filter,
  SlidersHorizontal,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface FleetClientInvitation {
  id: string;
  fleet_manager_id: string;
  client_name: string;
  email: string | null;
  phone: string | null;
  token: string;
  status: string;
  notes: string | null;
  created_at: string;
  expires_at: string | null;
  used_at: string | null;
  client_id: string | null;
}

interface FleetClientInvitationsProps {
  fleetManagerId: string;
}

export const FleetClientInvitations = ({ fleetManagerId }: FleetClientInvitationsProps) => {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [invitations, setInvitations] = useState<FleetClientInvitation[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    clientName: "",
    email: "",
    phone: "",
    notes: "",
  });
  
  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchInvitations();
  }, [fleetManagerId]);

  const fetchInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from("fleet_client_invitations")
        .select("*")
        .eq("fleet_manager_id", fleetManagerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      toast.error("Erreur lors du chargement des invitations");
    } finally {
      setLoading(false);
    }
  };

  const createInvitation = async () => {
    if (!formData.clientName.trim()) {
      toast.error("Le nom du client est obligatoire");
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("fleet_client_invitations")
        .insert({
          fleet_manager_id: fleetManagerId,
          client_name: formData.clientName.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          notes: formData.notes.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Invitation créée avec succès");
      setInvitations([data, ...invitations]);
      setShowCreateDialog(false);
      setFormData({ clientName: "", email: "", phone: "", notes: "" });
    } catch (error) {
      console.error("Error creating invitation:", error);
      toast.error("Erreur lors de la création de l'invitation");
    } finally {
      setCreating(false);
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/inscription-client-flotte?token=${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Lien copié dans le presse-papier");
  };

  const deleteInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from("fleet_client_invitations")
        .delete()
        .eq("id", invitationId);

      if (error) throw error;

      setInvitations(invitations.filter((inv) => inv.id !== invitationId));
      toast.success("Invitation supprimée");
    } catch (error) {
      console.error("Error deleting invitation:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const getStatusBadge = (invitation: FleetClientInvitation) => {
    if (invitation.status === "used") {
      return (
        <Badge className="bg-success/10 text-success border-success/20 gap-1">
          <CheckCircle className="w-3 h-3" />
          Inscrit
        </Badge>
      );
    }
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="w-3 h-3" />
          Expiré
        </Badge>
      );
    }
    return (
      <Badge className="bg-warning/10 text-warning border-warning/20 gap-1">
        <Clock className="w-3 h-3" />
        En attente
      </Badge>
    );
  };

  // Filter invitations
  const filteredInvitations = invitations.filter((inv) => {
    // Text search
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      const nameMatch = inv.client_name?.toLowerCase().includes(searchLower);
      const emailMatch = inv.email?.toLowerCase().includes(searchLower);
      const phoneMatch = inv.phone?.includes(searchText);
      if (!nameMatch && !emailMatch && !phoneMatch) return false;
    }
    
    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "pending" && inv.status !== "pending") return false;
      if (statusFilter === "used" && inv.status !== "used") return false;
      if (statusFilter === "expired") {
        if (inv.status === "used") return false;
        if (!inv.expires_at || new Date(inv.expires_at) >= new Date()) return false;
      }
    }
    
    return true;
  });

  const pendingCount = invitations.filter(
    (inv) => inv.status === "pending" && (!inv.expires_at || new Date(inv.expires_at) > new Date())
  ).length;
  const usedCount = invitations.filter((inv) => inv.status === "used").length;
  const expiredCount = invitations.filter(
    (inv) => inv.status !== "used" && inv.expires_at && new Date(inv.expires_at) < new Date()
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total invitations</p>
                <p className="text-2xl font-bold">{invitations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/10 via-warning/5 to-transparent border-warning/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-warning/10">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/10 via-success/5 to-transparent border-success/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-success/10">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inscrits</p>
                <p className="text-2xl font-bold">{usedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Invitations clients
            </CardTitle>
            <CardDescription>
              Créez un espace pour vos clients et envoyez-leur un lien d'inscription
            </CardDescription>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="w-4 h-4" />
                Inviter un client
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Créer une invitation client
                </DialogTitle>
                <DialogDescription>
                  Créez un espace pour votre client. Il recevra un lien pour compléter son inscription.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Nom du client *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="clientName"
                      placeholder="Jean Dupont"
                      value={formData.clientName}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email (optionnel)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="jean@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone (optionnel)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="06 12 34 56 78"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optionnel)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Notes internes sur ce client..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button onClick={createInvitation} disabled={creating} className="flex-1 gap-2">
                    {creating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                    Créer l'invitation
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email ou téléphone..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente ({pendingCount})</SelectItem>
                <SelectItem value="used">Inscrits ({usedCount})</SelectItem>
                <SelectItem value="expired">Expirés ({expiredCount})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active filters */}
          {(searchText || statusFilter !== "all") && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Filtres :</span>
              {searchText && (
                <Badge variant="secondary" className="gap-1">
                  "{searchText}"
                  <button onClick={() => setSearchText("")} className="ml-1 hover:text-destructive">×</button>
                </Badge>
              )}
              {statusFilter !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  {statusFilter === "pending" ? "En attente" : statusFilter === "used" ? "Inscrits" : "Expirés"}
                  <button onClick={() => setStatusFilter("all")} className="ml-1 hover:text-destructive">×</button>
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={() => { setSearchText(""); setStatusFilter("all"); }}>
                Réinitialiser
              </Button>
            </div>
          )}

          {invitations.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-medium mb-2">Aucune invitation</h3>
              <p className="text-muted-foreground mb-6">
                Créez une invitation pour permettre à vos clients de s'inscrire
              </p>
              <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                <UserPlus className="w-4 h-4" />
                Créer ma première invitation
              </Button>
            </div>
          ) : filteredInvitations.length === 0 ? (
            <div className="text-center py-8">
              <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">Aucun résultat pour ces critères</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className={`p-4 rounded-xl border transition-all ${
                    invitation.status === "used"
                      ? "bg-success/5 border-success/20"
                      : invitation.expires_at && new Date(invitation.expires_at) < new Date()
                      ? "bg-destructive/5 border-destructive/20 opacity-60"
                      : "bg-card border-border hover:border-primary/30"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Client info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold truncate">{invitation.client_name}</p>
                        {getStatusBadge(invitation)}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {invitation.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {invitation.email}
                          </span>
                        )}
                        {invitation.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {invitation.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Créé le {format(new Date(invitation.created_at), "dd MMM yyyy", { locale: fr })}
                        </span>
                      </div>
                      {invitation.notes && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          {invitation.notes}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {invitation.status === "pending" &&
                        (!invitation.expires_at || new Date(invitation.expires_at) > new Date()) && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyLink(invitation.token)}
                              className="gap-1"
                            >
                              <Copy className="w-3 h-3" />
                              <span className="hidden sm:inline">Copier le lien</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const url = `${window.location.origin}/inscription-client-flotte?token=${invitation.token}`;
                                window.open(url, "_blank");
                              }}
                              className="gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      {invitation.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteInvitation(invitation.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-primary mb-1">Comment ça fonctionne ?</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Créez une invitation avec le nom du client</li>
                <li>Copiez le lien d'inscription généré</li>
                <li>Envoyez le lien à votre client (SMS, email, WhatsApp...)</li>
                <li>Le client complète son inscription avec ses informations</li>
                <li>Il est automatiquement rattaché à votre flotte</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};