import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Crown, 
  Users, 
  Copy, 
  ExternalLink, 
  Tag, 
  Plus,
  Loader2,
  RefreshCw,
  QrCode,
  Phone,
  Mail
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface CongressInvitation {
  id: string;
  name: string;
  slug: string;
  max_uses: number;
  current_uses: number;
  is_active: boolean;
  trial_days: number;
  monthly_price: number;
}

interface CongressRegistration {
  id: string;
  driver_id: string;
  user_id: string;
  nfc_tag_number: string | null;
  registered_at: string;
  subscription_status: string | null;
  driver?: {
    id: string;
    license_number: string | null;
    contact_phone: string | null;
    contact_email: string | null;
    is_pioneer: boolean | null;
  } | null;
  profile?: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

export const CongressRegistrationsTab = () => {
  const [invitations, setInvitations] = useState<CongressInvitation[]>([]);
  const [registrations, setRegistrations] = useState<CongressRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegistration, setSelectedRegistration] = useState<CongressRegistration | null>(null);
  const [nfcTagNumber, setNfcTagNumber] = useState("");
  const [isUpdatingNfc, setIsUpdatingNfc] = useState(false);
  const [newMaxUses, setNewMaxUses] = useState<number>(0);
  const [isUpdatingMax, setIsUpdatingMax] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from("congress_invitations")
        .select("*")
        .order("created_at", { ascending: false });

      if (invitationsError) throw invitationsError;
      setInvitations(invitationsData || []);
      if (invitationsData?.[0]) {
        setNewMaxUses(invitationsData[0].max_uses);
      }

      // Load registrations with driver and profile info
      const { data: registrationsData, error: registrationsError } = await supabase
        .from("congress_registrations")
        .select(`
          *,
          driver:drivers(id, license_number, contact_phone, contact_email, is_pioneer),
          profile:profiles(full_name, email, phone)
        `)
        .order("registered_at", { ascending: false });

      if (registrationsError) throw registrationsError;
      setRegistrations(registrationsData || []);
    } catch (err) {
      console.error("Error loading data:", err);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copié dans le presse-papiers");
  };

  const updateNfcTag = async () => {
    if (!selectedRegistration) return;
    
    setIsUpdatingNfc(true);
    try {
      // Update both congress_registrations and drivers tables
      await Promise.all([
        supabase
          .from("congress_registrations")
          .update({ nfc_tag_number: nfcTagNumber })
          .eq("id", selectedRegistration.id),
        supabase
          .from("drivers")
          .update({ nfc_tag_number: nfcTagNumber })
          .eq("id", selectedRegistration.driver_id)
      ]);

      toast.success("Numéro de tag NFC enregistré");
      setSelectedRegistration(null);
      setNfcTagNumber("");
      loadData();
    } catch (err) {
      console.error("Error updating NFC tag:", err);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsUpdatingNfc(false);
    }
  };

  const updateMaxUses = async (invitationId: string) => {
    setIsUpdatingMax(true);
    try {
      const { error } = await supabase
        .from("congress_invitations")
        .update({ max_uses: newMaxUses })
        .eq("id", invitationId);

      if (error) throw error;
      toast.success("Nombre maximum de places mis à jour");
      loadData();
    } catch (err) {
      console.error("Error updating max uses:", err);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setIsUpdatingMax(false);
    }
  };

  const mainInvitation = invitations[0];
  const invitationLink = mainInvitation 
    ? `${window.location.origin}/inscription-congres?ref=${mainInvitation.slug}`
    : "";

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Invitation Link Card */}
      {mainInvitation && (
        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              {mainInvitation.name}
            </CardTitle>
            <CardDescription>
              Lien d'inscription exclusif pour le salon
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Link */}
            <div className="flex items-center gap-2">
              <Input 
                value={invitationLink} 
                readOnly 
                className="font-mono text-sm"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => copyToClipboard(invitationLink)}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => window.open(invitationLink, "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{mainInvitation.current_uses}</div>
                <div className="text-sm text-muted-foreground">Inscrits</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-amber-500">
                  {mainInvitation.max_uses - mainInvitation.current_uses}
                </div>
                <div className="text-sm text-muted-foreground">Places restantes</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center gap-2">
                  <Input
                    type="number"
                    value={newMaxUses}
                    onChange={(e) => setNewMaxUses(parseInt(e.target.value) || 0)}
                    className="w-20 text-center"
                  />
                  <Button 
                    size="sm" 
                    onClick={() => updateMaxUses(mainInvitation.id)}
                    disabled={isUpdatingMax || newMaxUses === mainInvitation.max_uses}
                  >
                    {isUpdatingMax ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground mt-1">Max places</div>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between">
              <Badge variant={mainInvitation.is_active ? "default" : "secondary"}>
                {mainInvitation.is_active ? "Actif" : "Inactif"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Tarif: {mainInvitation.monthly_price}€/mois • Essai: {mainInvitation.trial_days} jours
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Registrations Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Inscriptions Congrès ({registrations.length})
            </CardTitle>
            <CardDescription>
              Liste des chauffeurs inscrits via le lien congrès
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Date inscription</TableHead>
                <TableHead>Date inscription</TableHead>
                <TableHead>Tag NFC</TableHead>
                <TableHead>QR Code</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations.map((reg) => (
                <TableRow key={reg.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {reg.driver_id.slice(0, 8)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {reg.driver?.is_pioneer && <Crown className="h-4 w-4 text-amber-500" />}
                      <span className="font-medium">
                        {reg.profile?.full_name || "N/A"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>{reg.profile?.phone || reg.driver?.contact_phone || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span>{reg.profile?.email || reg.driver?.contact_email || "N/A"}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(reg.registered_at), "dd MMM yyyy HH:mm", { locale: fr })}
                  </TableCell>
                  <TableCell>
                    {reg.nfc_tag_number ? (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                        <Tag className="h-3 w-3 mr-1" />
                        {reg.nfc_tag_number}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Non attribué</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRegistration(reg);
                            setNfcTagNumber(reg.nfc_tag_number || "");
                          }}
                        >
                          <Tag className="h-4 w-4 mr-1" />
                          NFC
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Attribuer un tag NFC</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Chauffeur</Label>
                            <div className="font-medium">
                              {reg.profile?.full_name || "Chauffeur"}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="nfc">Numéro du tag NFC</Label>
                            <Input
                              id="nfc"
                              placeholder="Ex: NFC-001"
                              value={nfcTagNumber}
                              onChange={(e) => setNfcTagNumber(e.target.value)}
                            />
                          </div>
                          <Button 
                            className="w-full" 
                            onClick={updateNfcTag}
                            disabled={isUpdatingNfc || !nfcTagNumber}
                          >
                            {isUpdatingNfc ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Tag className="h-4 w-4 mr-2" />
                            )}
                            Enregistrer
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
                          <div className="space-y-2">
                            <Label htmlFor="nfc">Numéro du tag NFC</Label>
                            <Input
                              id="nfc"
                              placeholder="Ex: NFC-001"
                              value={nfcTagNumber}
                              onChange={(e) => setNfcTagNumber(e.target.value)}
                            />
                          </div>
                          <Button 
                            className="w-full" 
                            onClick={updateNfcTag}
                            disabled={isUpdatingNfc || !nfcTagNumber}
                          >
                            {isUpdatingNfc ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Tag className="h-4 w-4 mr-2" />
                            )}
                            Enregistrer
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
              {registrations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Aucune inscription pour le moment
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};