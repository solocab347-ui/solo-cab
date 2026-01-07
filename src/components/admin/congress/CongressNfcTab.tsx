import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Crown, Users, Tag, Loader2, Phone, Mail } from "lucide-react";
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

  const updateNfcTag = async () => {
    if (!selectedRegistration) return;
    
    setIsUpdatingNfc(true);
    try {
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
          Gérez les tags NFC pour chaque chauffeur inscrit
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Chauffeur</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Inscription</TableHead>
              <TableHead>Tag NFC</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrations.map((reg) => (
              <TableRow key={reg.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {reg.driver?.is_pioneer && (
                      <Crown className="h-4 w-4 text-amber-500" />
                    )}
                    <div>
                      <div className="font-medium">
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
                        <Mail className="h-3 w-3" />
                        {reg.driver?.contact_email || reg.profile?.email}
                      </div>
                    )}
                    {(reg.driver?.contact_phone || reg.profile?.phone) && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {reg.driver?.contact_phone || reg.profile?.phone}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {format(new Date(reg.registered_at), "dd MMM yyyy HH:mm", { locale: fr })}
                </TableCell>
                <TableCell>
                  {reg.nfc_tag_number ? (
                    <Badge variant="outline" className="gap-1">
                      <Tag className="h-3 w-3" />
                      {reg.nfc_tag_number}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">Non assigné</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={reg.subscription_status === "active" ? "default" : "secondary"}>
                    {reg.subscription_status || "En attente"}
                  </Badge>
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
                        {reg.nfc_tag_number ? "Modifier" : "Assigner"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          Assigner un tag NFC
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="font-medium">
                            {reg.profile?.full_name || "Chauffeur"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {reg.driver?.contact_email || reg.profile?.email}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nfc-tag">Numéro du tag NFC</Label>
                          <Input
                            id="nfc-tag"
                            placeholder="Ex: NFC-001"
                            value={nfcTagNumber}
                            onChange={(e) => setNfcTagNumber(e.target.value)}
                          />
                        </div>
                        <Button 
                          onClick={updateNfcTag} 
                          disabled={isUpdatingNfc || !nfcTagNumber.trim()}
                          className="w-full"
                        >
                          {isUpdatingNfc ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
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
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Aucune inscription pour le moment
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
