import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  UserPlus, 
  User, 
  Phone, 
  Mail, 
  CheckCircle, 
  AlertCircle,
  Loader2 
} from "lucide-react";

interface GuestBooking {
  id: string;
  guest_name: string;
  guest_phone: string;
  guest_email?: string;
}

interface RegisterGuestClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guestBooking: GuestBooking | null;
  driverId: string;
  onSuccess?: () => void;
}

export const RegisterGuestClientDialog = ({
  open,
  onOpenChange,
  guestBooking,
  driverId,
  onSuccess,
}: RegisterGuestClientDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"form" | "success">("form");

  // Pre-fill email from guest booking if available
  useState(() => {
    if (guestBooking?.guest_email) {
      setEmail(guestBooking.guest_email);
    }
  });

  const handleRegister = async () => {
    if (!guestBooking) return;

    if (!email.trim()) {
      toast.error("L'email est requis");
      return;
    }

    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setLoading(true);

    try {
      // 1. Créer le compte utilisateur via edge function
      const { data: registerData, error: registerError } = await supabase.functions.invoke(
        "register-client-driver",
        {
          body: {
            email: email.trim().toLowerCase(),
            password,
            full_name: guestBooking.guest_name,
            phone: guestBooking.guest_phone,
            driver_id: driverId,
            is_exclusive: true, // Client exclusif au chauffeur
          },
        }
      );

      if (registerError) {
        console.error("Registration error:", registerError);
        toast.error("Erreur lors de l'inscription");
        return;
      }

      if (!registerData?.success) {
        toast.error(registerData?.error || "Erreur lors de l'inscription");
        return;
      }

      // 2. Mettre à jour la course pour lier le client
      if (registerData.client_id) {
        await supabase
          .from("courses")
          .update({
            client_id: registerData.client_id,
            is_guest_booking: false, // Plus un invité maintenant
          })
          .eq("id", guestBooking.id);
      }

      setStep("success");
      toast.success("Client inscrit avec succès !");
      
      setTimeout(() => {
        onOpenChange(false);
        onSuccess?.();
        // Reset form
        setStep("form");
        setEmail("");
        setPassword("");
      }, 2000);

    } catch (error) {
      console.error("Registration exception:", error);
      toast.error("Une erreur inattendue est survenue");
    } finally {
      setLoading(false);
    }
  };

  if (!guestBooking) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Inscrire le client
          </DialogTitle>
          <DialogDescription>
            Créez un compte pour ce client afin qu'il puisse accéder à ses courses et réserver facilement
          </DialogDescription>
        </DialogHeader>

        {step === "form" ? (
          <div className="space-y-4 py-4">
            {/* Informations pré-remplies */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{guestBooking.guest_name}</span>
                <Badge variant="secondary" className="text-xs">Non inscrit</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>{guestBooking.guest_phone}</span>
              </div>
            </div>

            <Alert className="border-primary/30 bg-primary/5">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                Le client recevra un email de bienvenue avec ses identifiants de connexion.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email du client *
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@email.com"
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Mot de passe temporaire *
              </Label>
              <Input
                id="password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 caractères"
                className="bg-background"
              />
              <p className="text-xs text-muted-foreground">
                Le client pourra le modifier après connexion
              </p>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Client inscrit !</h3>
              <p className="text-muted-foreground text-sm">
                {guestBooking.guest_name} est maintenant lié à votre compte
              </p>
            </div>
          </div>
        )}

        {step === "form" && (
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleRegister}
              disabled={loading || !email.trim() || password.length < 6}
              className="bg-primary"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Inscription...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Inscrire le client
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
