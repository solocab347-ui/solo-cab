import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Shield,
  ShieldOff,
  Clock,
  AlertTriangle,
  Loader2,
  CheckCircle,
  XCircle,
  User,
} from "lucide-react";

interface FleetDriverAccessManagerProps {
  fleetManagerDriverId: string;
  driverName: string;
  documentsStatus: string | null;
  temporaryAccessGranted: boolean;
  temporaryAccessReason: string | null;
  temporaryAccessExpiresAt: string | null;
  onAccessChanged: () => void;
}

export const FleetDriverAccessManager = ({
  fleetManagerDriverId,
  driverName,
  documentsStatus,
  temporaryAccessGranted,
  temporaryAccessReason,
  temporaryAccessExpiresAt,
  onAccessChanged,
}: FleetDriverAccessManagerProps) => {
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [accessReason, setAccessReason] = useState("");
  const [accessDays, setAccessDays] = useState(7);

  const handleGrantAccess = async () => {
    if (!accessReason.trim()) {
      toast.error("Veuillez indiquer une raison pour l'accès temporaire");
      return;
    }

    setProcessing(true);
    try {
      const expiresAt = addDays(new Date(), accessDays);
      
      const { error } = await supabase
        .from("fleet_manager_drivers")
        .update({
          temporary_access_granted: true,
          temporary_access_reason: accessReason,
          temporary_access_granted_at: new Date().toISOString(),
          temporary_access_expires_at: expiresAt.toISOString(),
        })
        .eq("id", fleetManagerDriverId);

      if (error) throw error;

      // Notify driver
      const { data: driverData } = await supabase
        .from("fleet_manager_drivers")
        .select("driver:drivers!fleet_manager_drivers_driver_id_fkey(user_id)")
        .eq("id", fleetManagerDriverId)
        .single();

      if (driverData?.driver) {
        const driver = Array.isArray(driverData.driver) ? driverData.driver[0] : driverData.driver;
        await supabase.from("notifications").insert({
          user_id: driver.user_id,
          title: "✅ Accès temporaire accordé",
          message: `Votre gestionnaire vous a accordé un accès temporaire jusqu'au ${format(expiresAt, "d MMMM yyyy", { locale: fr })}. Veuillez soumettre vos documents dès que possible.`,
          type: "success",
          link: "/fleet-driver-dashboard?tab=documents",
        });
      }

      toast.success("Accès temporaire accordé");
      setShowGrantDialog(false);
      setAccessReason("");
      onAccessChanged();
    } catch (error) {
      console.error("Error granting access:", error);
      toast.error("Erreur lors de l'attribution de l'accès");
    } finally {
      setProcessing(false);
    }
  };

  const handleRevokeAccess = async () => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("fleet_manager_drivers")
        .update({
          temporary_access_granted: false,
          temporary_access_reason: null,
          temporary_access_granted_at: null,
          temporary_access_expires_at: null,
        })
        .eq("id", fleetManagerDriverId);

      if (error) throw error;

      toast.success("Accès temporaire révoqué");
      setShowRevokeDialog(false);
      onAccessChanged();
    } catch (error) {
      console.error("Error revoking access:", error);
      toast.error("Erreur lors de la révocation");
    } finally {
      setProcessing(false);
    }
  };

  const isExpired = temporaryAccessExpiresAt && new Date(temporaryAccessExpiresAt) < new Date();

  return (
    <div className="space-y-3">
      {/* Status actuel */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{driverName}</span>
        </div>
        
        {documentsStatus === "validated" ? (
          <Badge className="bg-success"><CheckCircle className="w-3 h-3 mr-1" /> Documents OK</Badge>
        ) : documentsStatus === "rejected" ? (
          <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejetés</Badge>
        ) : documentsStatus === "submitted" ? (
          <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> En attente</Badge>
        ) : (
          <Badge variant="outline"><AlertTriangle className="w-3 h-3 mr-1" /> Non soumis</Badge>
        )}
      </div>

      {/* Accès temporaire */}
      {documentsStatus !== "validated" && (
        <div className="p-3 rounded-lg border bg-muted/30">
          {temporaryAccessGranted && !isExpired ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="w-4 h-4 text-success" />
                  <span className="text-success font-medium">Accès temporaire actif</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRevokeDialog(true)}
                >
                  <ShieldOff className="w-3 h-3 mr-1" />
                  Révoquer
                </Button>
              </div>
              {temporaryAccessExpiresAt && (
                <p className="text-xs text-muted-foreground">
                  Expire le {format(new Date(temporaryAccessExpiresAt), "d MMMM yyyy à HH:mm", { locale: fr })}
                </p>
              )}
              {temporaryAccessReason && (
                <p className="text-xs text-muted-foreground italic">
                  Raison: {temporaryAccessReason}
                </p>
              )}
            </div>
          ) : isExpired ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="w-4 h-4" />
                <span>Accès temporaire expiré</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGrantDialog(true)}
                className="w-full"
              >
                <Shield className="w-3 h-3 mr-1" />
                Renouveler l'accès
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGrantDialog(true)}
              className="w-full"
            >
              <Shield className="w-3 h-3 mr-1" />
              Accorder un accès temporaire
            </Button>
          )}
        </div>
      )}

      {/* Dialog d'attribution */}
      <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-success" />
              Accorder un accès temporaire
            </DialogTitle>
            <DialogDescription>
              Permettez à {driverName} d'accéder à toutes les fonctionnalités malgré des documents en attente.
            </DialogDescription>
          </DialogHeader>

          <Alert className="bg-warning/10 border-warning/30">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-sm">
              L'accès temporaire permet au chauffeur de continuer à travailler, mais il recevra des rappels pour soumettre ses documents.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Durée de l'accès (jours)</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={accessDays}
                onChange={(e) => setAccessDays(parseInt(e.target.value) || 7)}
              />
              <p className="text-xs text-muted-foreground">
                Expire le {format(addDays(new Date(), accessDays), "d MMMM yyyy", { locale: fr })}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Raison de l'accès temporaire *</Label>
              <Textarea
                value={accessReason}
                onChange={(e) => setAccessReason(e.target.value)}
                placeholder="Ex: Documents en cours de renouvellement, chauffeur de confiance..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGrantDialog(false)} disabled={processing}>
              Annuler
            </Button>
            <Button onClick={handleGrantAccess} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Shield className="w-4 h-4 mr-1" />}
              Accorder l'accès
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de révocation */}
      <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Révoquer l'accès temporaire</DialogTitle>
            <DialogDescription>
              {driverName} n'aura plus accès aux fonctionnalités tant que ses documents ne seront pas validés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeDialog(false)} disabled={processing}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleRevokeAccess} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <ShieldOff className="w-4 h-4 mr-1" />}
              Révoquer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
