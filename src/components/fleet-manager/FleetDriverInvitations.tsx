import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Copy, Trash2, Loader2, AlertTriangle, CheckCircle, Euro, Users, Percent, Briefcase, UserCheck } from "lucide-react";

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
  const [driverType, setDriverType] = useState<"salaried" | "independent">("salaried");
  const [commissionPercentage, setCommissionPercentage] = useState(10);

  const freeDriversRemaining = Math.max(0, maxFreeDrivers - currentDriversCount);
  const pendingInvitations = invitations.filter((i) => !i.used);
  const pendingFreeInvitations = pendingInvitations.filter((i) => !i.is_paid);
  const effectiveFreeRemaining = Math.max(0, freeDriversRemaining - pendingFreeInvitations.length);
  const nextDriverIsPaid = effectiveFreeRemaining === 0;

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
      setInvitations(data || []);
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

      const { error } = await supabase.from("fleet_driver_invitations").insert({
        fleet_manager_id: fleetManagerId,
        token,
        email: newEmail || null,
        expires_at: expiresAt.toISOString(),
        is_paid: isPaid,
        driver_cost: driverCost,
        driver_type: driverType,
        commission_percentage: driverType === "independent" ? commissionPercentage : 0,
      });

      if (error) throw error;

      const typeLabel = driverType === "salaried" ? "salarié/équipement gestionnaire" : `indépendant (${commissionPercentage}% commission)`;
      toast.success(`Invitation créée pour chauffeur ${typeLabel}`);
      setNewEmail("");
      setDriverType("salaried");
      setCommissionPercentage(10);
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
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quota Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Chauffeurs gratuits restants</p>
                <p className="text-2xl font-bold">
                  {effectiveFreeRemaining} / {maxFreeDrivers}
                </p>
              </div>
            </div>
            
            {nextDriverIsPaid && (
              <Alert className="max-w-md bg-yellow-500/10 border-yellow-500/30">
                <Euro className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-yellow-700">
                  Votre quota gratuit est atteint. Le prochain chauffeur coûtera <strong>10€/mois</strong> supplémentaires.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Invitation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Créer une invitation
          </CardTitle>
          <CardDescription>
            Définissez le type de relation avec le chauffeur et générez un lien d'invitation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Driver Type Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Type de relation avec le chauffeur</Label>
            <RadioGroup
              value={driverType}
              onValueChange={(value) => setDriverType(value as "salaried" | "independent")}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <Label
                htmlFor="salaried"
                className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                  driverType === "salaried"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value="salaried" id="salaried" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    <Briefcase className="w-4 h-4 text-primary" />
                    Salarié / Équipement gestionnaire
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Le chauffeur utilise votre matériel de paiement. Pas de commission à reverser.
                  </p>
                </div>
              </Label>

              <Label
                htmlFor="independent"
                className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                  driverType === "independent"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value="independent" id="independent" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    <UserCheck className="w-4 h-4 text-primary" />
                    Chauffeur indépendant
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Le chauffeur encaisse directement. Une commission vous sera reversée.
                  </p>
                </div>
              </Label>
            </RadioGroup>
          </div>

          {/* Commission Settings (only for independent) */}
          {driverType === "independent" && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <Label htmlFor="commission" className="flex items-center gap-2">
                <Percent className="w-4 h-4" />
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
                  className="w-24"
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Le chauffeur devra accepter ce taux lors de son inscription pour pouvoir travailler avec vous.
              </p>
            </div>
          )}

          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email">Email du chauffeur (optionnel)</Label>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  id="email"
                  type="email"
                  placeholder="jean@email.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <Button onClick={createInvitation} disabled={creating}>
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Créer l'invitation
                  </>
                )}
              </Button>
            </div>
          </div>

          {nextDriverIsPaid && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Euro className="w-3 h-3" />
              Cette invitation ajoutera 10€/mois à votre abonnement
            </p>
          )}
        </CardContent>
      </Card>

      {/* Invitations List */}
      <Card>
        <CardHeader>
          <CardTitle>Invitations envoyées</CardTitle>
          <CardDescription>
            {invitations.length} invitation(s) au total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Aucune invitation pour le moment
            </p>
          ) : (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {invitation.used ? (
                      <CheckCircle className="w-5 h-5 text-success" />
                    ) : (
                      <Send className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">
                        {invitation.email || "Invitation générique"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {invitation.driver_type === "salaried" ? (
                            <><Briefcase className="w-3 h-3 mr-1" /> Salarié</>
                          ) : (
                            <><UserCheck className="w-3 h-3 mr-1" /> Indépendant {invitation.commission_percentage}%</>
                          )}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Créée le {new Date(invitation.created_at).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {invitation.is_paid && (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-500/30">
                        <Euro className="w-3 h-3 mr-1" />
                        10€/mois
                      </Badge>
                    )}
                    
                    {invitation.used ? (
                      <Badge variant="default" className="bg-success">
                        Utilisée
                      </Badge>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyInvitationLink(invitation.token)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteInvitation(invitation.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
