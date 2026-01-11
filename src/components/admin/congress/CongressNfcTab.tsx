import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Crown, Users, Tag, Loader2, Phone, Mail, Copy, ExternalLink, User, Search } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

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
    nfc_tag_number?: string | null;
    public_profile_enabled?: boolean | null;
    driver_code?: string | null;
  } | null;
  profile?: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

interface CongressNfcTabProps {
  registrations: CongressRegistration[];
  onUpdate: () => void;
}

export const CongressNfcTab = ({ registrations, onUpdate }: CongressNfcTabProps) => {
  const [selectedRegistration, setSelectedRegistration] = useState<CongressRegistration | null>(null);
  const [nfcTagNumber, setNfcTagNumber] = useState("");
  const [isUpdatingNfc, setIsUpdatingNfc] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filtrer les inscriptions par nom, email ou code chauffeur
  const filteredRegistrations = useMemo(() => {
    if (!searchQuery.trim()) return registrations;
    
    const query = searchQuery.toLowerCase().trim();
    return registrations.filter((reg) => {
      const name = reg.profile?.full_name?.toLowerCase() || "";
      const email = (reg.driver?.contact_email || reg.profile?.email || "").toLowerCase();
      const driverCode = (reg.driver?.driver_code || `DRV-${reg.driver_id.slice(0, 6).toUpperCase()}`).toLowerCase();
      const phone = (reg.driver?.contact_phone || reg.profile?.phone || "").toLowerCase();
      const nfcTag = (reg.nfc_tag_number || "").toLowerCase();
      
      return name.includes(query) || 
             email.includes(query) || 
             driverCode.includes(query) ||
             phone.includes(query) ||
             nfcTag.includes(query);
    });
  }, [registrations, searchQuery]);

  const getPublicProfileLink = (driverId: string) => {
    return `${window.location.origin}/chauffeur/${driverId}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copié dans le presse-papiers");
  };

  const updateNfcTag = async () => {
    if (!selectedRegistration) return;
    
    const tagNum = parseInt(nfcTagNumber);
    if (isNaN(tagNum) || tagNum < 1 || tagNum > 999) {
      toast.error("Le numéro doit être entre 1 et 999");
      return;
    }

    const formattedTag = `NFC-${String(tagNum).padStart(3, '0')}`;
    
    setIsUpdatingNfc(true);
    try {
      const { error: regError } = await supabase
        .from("congress_registrations")
        .update({ nfc_tag_number: formattedTag })
        .eq("id", selectedRegistration.id);

      if (regError) throw regError;

      const { error: driverError } = await supabase
        .from("drivers")
        .update({ nfc_tag_number: formattedTag })
        .eq("id", selectedRegistration.driver_id);

      if (driverError) throw driverError;

      toast.success(`Tag ${formattedTag} enregistré avec succès`);
      setDialogOpen(false);
      setSelectedRegistration(null);
      setNfcTagNumber("");
      onUpdate();
    } catch (err) {
      console.error("Error updating NFC tag:", err);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsUpdatingNfc(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Inscriptions Pionniers ({registrations.length})
        </CardTitle>
        <CardDescription>
          Gérez les tags NFC pour chaque chauffeur inscrit - Le lien profil public servira à programmer le badge NFC
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Barre de recherche améliorée */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, email, code chauffeur (DRV-...), téléphone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery("")}
              >
                <span className="sr-only">Effacer</span>
                ×
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Recherche par : nom complet, adresse email, code chauffeur (DRV-XXXXXX), téléphone ou tag NFC
          </p>
        </div>
        
        {filteredRegistrations.length !== registrations.length && (
          <p className="text-sm text-muted-foreground">
            {filteredRegistrations.length} résultat(s) sur {registrations.length}
          </p>
        )}
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code Chauffeur</TableHead>
                <TableHead>Chauffeur</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Lien Profil Public</TableHead>
                <TableHead>Tag NFC</TableHead>
                <TableHead>Inscription</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRegistrations.map((reg) => {
                const profileLink = getPublicProfileLink(reg.driver_id);
                return (
                  <TableRow key={reg.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {reg.driver?.driver_code || `DRV-${reg.driver_id.slice(0, 6).toUpperCase()}`}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {reg.driver?.is_pioneer && (
                          <Crown className="h-4 w-4 text-amber-500" />
                        )}
                        <div>
                          <div className="font-medium flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {reg.profile?.full_name || "Chauffeur"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {reg.driver?.license_number || "N/A"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        {(reg.driver?.contact_email || reg.profile?.email) && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs">{reg.driver?.contact_email || reg.profile?.email}</span>
                          </div>
                        )}
                        {(reg.driver?.contact_phone || reg.profile?.phone) && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs">{reg.driver?.contact_phone || reg.profile?.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-muted px-2 py-1 rounded max-w-[200px] truncate block">
                          {profileLink}
                        </code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(profileLink)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => window.open(profileLink, "_blank")}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {reg.nfc_tag_number ? (
                        <Badge className="gap-1 bg-primary">
                          <Tag className="h-3 w-3" />
                          {reg.nfc_tag_number}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Non assigné</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(reg.registered_at), "dd/MM/yy HH:mm", { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <Dialog open={dialogOpen && selectedRegistration?.id === reg.id} onOpenChange={(open) => {
                        setDialogOpen(open);
                        if (!open) {
                          setSelectedRegistration(null);
                          setNfcTagNumber("");
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRegistration(reg);
                              setNfcTagNumber(reg.nfc_tag_number?.replace("NFC-", "").replace(/^0+/, "") || "");
                              setDialogOpen(true);
                            }}
                          >
                            <Tag className="h-4 w-4 mr-1" />
                            {reg.nfc_tag_number ? "Modifier" : "Assigner"}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Tag className="h-5 w-5" />
                              Assigner un tag NFC
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                              <div className="flex items-center gap-2">
                                <Crown className="h-4 w-4 text-amber-500" />
                                <p className="font-medium">
                                  {reg.profile?.full_name || "Chauffeur"}
                                </p>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {reg.driver?.contact_email || reg.profile?.email}
                              </p>
                              <div className="pt-2 border-t">
                                <p className="text-xs text-muted-foreground mb-1">Lien pour le badge NFC :</p>
                                <div className="flex items-center gap-2">
                                  <code className="text-xs bg-background p-2 rounded flex-1 break-all">
                                    {profileLink}
                                  </code>
                                  <Button 
                                    variant="outline" 
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => copyToClipboard(profileLink)}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="nfc-tag">Numéro du tag NFC (1-999)</Label>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground font-mono">NFC-</span>
                                <Input
                                  id="nfc-tag"
                                  type="number"
                                  min={1}
                                  max={999}
                                  placeholder="Ex: 42"
                                  value={nfcTagNumber}
                                  onChange={(e) => setNfcTagNumber(e.target.value)}
                                  className="font-mono"
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Le numéro sera formaté automatiquement (ex: 42 → NFC-042)
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <DialogClose asChild>
                                <Button variant="outline" className="flex-1">
                                  Annuler
                                </Button>
                              </DialogClose>
                              <Button 
                                onClick={updateNfcTag} 
                                disabled={isUpdatingNfc || !nfcTagNumber.trim()}
                                className="flex-1"
                              >
                                {isUpdatingNfc ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <Tag className="h-4 w-4 mr-2" />
                                )}
                                Enregistrer
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredRegistrations.length === 0 && registrations.length > 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="h-8 w-8 opacity-50" />
                      <p>Aucun résultat pour "{searchQuery}"</p>
                      <p className="text-xs">Essayez avec un nom, email, code chauffeur (DRV-...) ou numéro de téléphone</p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSearchQuery("")}
                        className="mt-2"
                      >
                        Effacer la recherche
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {registrations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Aucune inscription pour le moment
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};