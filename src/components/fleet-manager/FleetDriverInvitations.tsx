import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Send, 
  Copy, 
  Trash2, 
  Loader2, 
  CheckCircle, 
  Euro, 
  Users, 
  Percent, 
  Briefcase, 
  UserCheck,
  Link2,
  Clock,
  Plus,
  Sparkles,
} from "lucide-react";

interface FleetDriverInvitationsProps {
  fleetManagerId: string;
  maxFreeDrivers: number;
  currentDriversCount: number;
  onInvitationCreated?: () => void;
}

interface Invitation {
  id: string;
  token: string;
  email: string | null;
  used: boolean;
  is_paid: boolean;
  driver_cost: number;
  driver_type: string;
  commission_percentage: number;
  created_at: string;
  expires_at: string | null;
}

export const FleetDriverInvitations = ({
  fleetManagerId,
  maxFreeDrivers,
  currentDriversCount,
  onInvitationCreated,
}: FleetDriverInvitationsProps) => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [driverType, setDriverType] = useState<"partner_with_equipment" | "independent">("partner_with_equipment");
  const [commissionPercentage, setCommissionPercentage] = useState(0);
  const [enableCommission, setEnableCommission] = useState(false);

  const freeDriversRemaining = Math.max(0, maxFreeDrivers - currentDriversCount);
  const pendingInvitations = invitations.filter((i) => !i.used);
  const pendingFreeInvitations = pendingInvitations.filter((i) => !i.is_paid);
  const effectiveFreeRemaining = Math.max(0, freeDriversRemaining - pendingFreeInvitations.length);
  const nextDriverIsPaid = effectiveFreeRemaining === 0;

  const usedInvitations = invitations.filter((i) => i.used);

  useEffect(() => {
    fetchInvitations();
  }, [fleetManagerId]);

  const fetchInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from("fleet_driver_invitations")
        .select("*")
        .eq("fleet_manager_id", fleetManagerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Filtrer les invitations expirées non utilisées
      const now = new Date();
      const validInvitations = (data || []).filter(inv => {
        // Garder les invitations utilisées
        if (inv.used) return true;
        // Garder les invitations sans date d'expiration
        if (!inv.expires_at) return true;
        // Garder les invitations non expirées
        return new Date(inv.expires_at) > now;
      });
      
      // Supprimer les invitations expirées de la base de données
      const expiredInvitations = (data || []).filter(inv => {
        if (inv.used) return false;
        if (!inv.expires_at) return false;
        return new Date(inv.expires_at) <= now;
      });
      
      if (expiredInvitations.length > 0) {
        const expiredIds = expiredInvitations.map(inv => inv.id);
        await supabase
          .from("fleet_driver_invitations")
          .delete()
          .in("id", expiredIds);
      }
      
      setInvitations(validInvitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
    } finally {
      setLoading(false);
    }
  };

  const createInvitation = async () => {
    setCreating(true);
    try {
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const isPaid = nextDriverIsPaid;
      const driverCost = isPaid ? 10 : 0;

      const effectiveCommission = driverType === "independent" 
        ? commissionPercentage 
        : (enableCommission ? commissionPercentage : 0);

      const { error } = await supabase.from("fleet_driver_invitations").insert({
        fleet_manager_id: fleetManagerId,
        token,
        email: newEmail || null,
        expires_at: expiresAt.toISOString(),
        is_paid: isPaid,
        driver_cost: driverCost,
        driver_type: driverType,
        commission_percentage: effectiveCommission,
      });

      if (error) throw error;

      const typeLabel = driverType === "partner_with_equipment" 
        ? `partenaire avec équipement${enableCommission ? ` (${commissionPercentage}%)` : ''}` 
        : `indépendant (${commissionPercentage}%)`;
      toast.success(`Invitation créée pour chauffeur ${typeLabel}`);
      setNewEmail("");
      setDriverType("partner_with_equipment");
      setCommissionPercentage(0);
      setEnableCommission(false);
      fetchInvitations();
      onInvitationCreated?.();
    } catch (error: any) {
      console.error("Error creating invitation:", error);
      toast.error("Erreur lors de la création de l'invitation");
    } finally {
      setCreating(false);
    }
  };

  const copyInvitationLink = (token: string) => {
    const link = `${window.location.origin}/register-driver-fleet?token=${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Lien copié dans le presse-papiers");
  };

  const deleteInvitation = async (id: string) => {
    try {
      const { error } = await supabase
        .from("fleet_driver_invitations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Invitation supprimée");
      setInvitations(invitations.filter((inv) => inv.id !== id));
    } catch (error: any) {
      console.error("Error deleting invitation:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Quota gratuit</p>
              <p className="text-3xl font-bold text-foreground">
                {effectiveFreeRemaining} <span className="text-lg text-muted-foreground">/ {maxFreeDrivers}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-success/10 via-success/5 to-transparent border border-success/20 p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-success to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Utilisées</p>
              <p className="text-3xl font-bold text-foreground">{usedInvitations.length}</p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-warning/10 via-warning/5 to-transparent border border-warning/20 p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-warning to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <Clock className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">En attente</p>
              <p className="text-3xl font-bold text-foreground">{pendingInvitations.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Création d'invitation */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent" />
        
        <div className="relative p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Nouvelle invitation</h3>
              <p className="text-sm text-muted-foreground">Définissez le type de chauffeur à inviter</p>
            </div>
          </div>

          {/* Type de chauffeur */}
          <RadioGroup
            value={driverType}
            onValueChange={(value) => {
              setDriverType(value as "partner_with_equipment" | "independent");
              if (value === "independent") {
                setEnableCommission(true);
                if (commissionPercentage === 0) setCommissionPercentage(10);
              }
            }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <Label
              htmlFor="partner_with_equipment"
              className={`relative overflow-hidden flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all ${
                driverType === "partner_with_equipment"
                  ? "bg-primary/10 border-2 border-primary"
                  : "bg-muted/30 border-2 border-transparent hover:border-primary/30"
              }`}
            >
              <RadioGroupItem value="partner_with_equipment" id="partner_with_equipment" className="mt-1 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <Briefcase className="w-4 h-4 text-primary" />
                  Partenaire avec matériel
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Utilise votre matériel de paiement. Commission optionnelle.
                </p>
              </div>
            </Label>

            <Label
              htmlFor="independent"
              className={`relative overflow-hidden flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all ${
                driverType === "independent"
                  ? "bg-primary/10 border-2 border-primary"
                  : "bg-muted/30 border-2 border-transparent hover:border-primary/30"
              }`}
            >
              <RadioGroupItem value="independent" id="independent" className="mt-1 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <UserCheck className="w-4 h-4 text-primary" />
                  Indépendant
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Encaisse directement. Commission reversée.
                </p>
              </div>
            </Label>
          </RadioGroup>

          {/* Commission settings */}
          <div className="p-4 bg-accent/10 rounded-xl border border-accent/20 space-y-4">
            {driverType === "partner_with_equipment" && (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="enable-commission"
                  checked={enableCommission}
                  onChange={(e) => {
                    setEnableCommission(e.target.checked);
                    if (e.target.checked && commissionPercentage === 0) {
                      setCommissionPercentage(10);
                    }
                  }}
                  className="w-4 h-4 rounded border-border"
                />
                <Label htmlFor="enable-commission" className="cursor-pointer">
                  Définir une commission pour ce partenaire
                </Label>
              </div>
            )}

            {(driverType === "independent" || enableCommission) && (
              <div className="space-y-3">
                <Label htmlFor="commission" className="flex items-center gap-2 font-medium">
                  <Percent className="w-4 h-4 text-accent" />
                  Taux de commission
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="commission"
                    type="number"
                    min={0}
                    max={50}
                    value={commissionPercentage}
                    onChange={(e) => setCommissionPercentage(Number(e.target.value))}
                    className="w-24 bg-background"
                  />
                  <span className="text-muted-foreground">%</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    Le chauffeur devra accepter ce taux
                  </span>
                </div>
              </div>
            )}

            {!enableCommission && driverType === "partner_with_equipment" && (
              <p className="text-sm text-muted-foreground">
                Pas de commission définie. Le partenaire utilise votre matériel sans frais supplémentaires.
              </p>
            )}
          </div>

          {/* Email et bouton */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                type="email"
                placeholder="Email du chauffeur (optionnel)"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="bg-background/50"
              />
            </div>
            <Button 
              onClick={createInvitation} 
              disabled={creating}
              className="gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Créer l'invitation
                </>
              )}
            </Button>
          </div>

          {nextDriverIsPaid && (
            <div className="flex items-center gap-2 p-3 bg-warning/10 rounded-lg border border-warning/30">
              <Euro className="w-4 h-4 text-warning shrink-0" />
              <span className="text-sm text-warning">
                Quota gratuit atteint. Cette invitation ajoutera <strong>10€/mois</strong> à votre abonnement.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Liste des invitations */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border border-white/10">
        <div className="p-4 border-b border-border/50">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Invitations envoyées
            <Badge variant="secondary" className="ml-2">{invitations.length}</Badge>
          </h3>
        </div>

        <div className="p-4">
          {invitations.length === 0 ? (
            <div className="text-center py-12">
              <Send className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">Aucune invitation pour le moment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className={`relative overflow-hidden rounded-xl border p-4 transition-all ${
                    invitation.used
                      ? "bg-success/5 border-success/30"
                      : "bg-muted/20 border-border/50 hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        invitation.used 
                          ? "bg-success/20" 
                          : "bg-muted"
                      }`}>
                        {invitation.used ? (
                          <CheckCircle className="w-5 h-5 text-success" />
                        ) : (
                          <Send className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {invitation.email || "Invitation générique"}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-xs shrink-0">
                            {invitation.driver_type === "partner_with_equipment" || invitation.driver_type === "salaried" ? (
                              <>
                                <Briefcase className="w-3 h-3 mr-1" /> 
                                Partenaire
                                {invitation.commission_percentage > 0 && ` ${invitation.commission_percentage}%`}
                              </>
                            ) : (
                              <><UserCheck className="w-3 h-3 mr-1" /> Indép. {invitation.commission_percentage}%</>
                            )}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(invitation.created_at).toLocaleDateString("fr-FR")}
                          </span>
                          {!invitation.used && invitation.expires_at && (
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${
                                new Date(invitation.expires_at) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                                  ? "bg-warning/20 text-warning border-warning/30"
                                  : ""
                              }`}
                            >
                              <Clock className="w-3 h-3 mr-1" />
                              Expire le {new Date(invitation.expires_at).toLocaleDateString("fr-FR")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {invitation.is_paid && (
                        <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10">
                          <Euro className="w-3 h-3 mr-1" />
                          10€
                        </Badge>
                      )}
                      
                      {invitation.used ? (
                        <Badge className="bg-success text-success-foreground">
                          Utilisée
                        </Badge>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => copyInvitationLink(invitation.token)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => deleteInvitation(invitation.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
