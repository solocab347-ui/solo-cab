import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, Trash2, AlertTriangle, CheckCircle2, ShieldAlert, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const deletionSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "L'adresse e-mail est requise")
    .email("Adresse e-mail invalide")
    .max(255, "Adresse e-mail trop longue"),
  confirmEmail: z.string().trim().min(1, "Veuillez confirmer votre e-mail"),
  reason: z.string().trim().max(1000, "Raison trop longue (1000 caractères maximum)").optional(),
  acknowledged: z.literal(true, {
    errorMap: () => ({ message: "Vous devez confirmer la suppression" }),
  }),
}).refine((data) => data.email.toLowerCase() === data.confirmEmail.toLowerCase(), {
  message: "Les adresses e-mail ne correspondent pas",
  path: ["confirmEmail"],
});

const DeleteAccount = () => {
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [reason, setReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = deletionSchema.safeParse({
      email,
      confirmEmail,
      reason: reason || undefined,
      acknowledged,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0]?.toString() ?? "form";
        fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("account_deletion_requests").insert({
        email: result.data.email.toLowerCase(),
        reason: result.data.reason ?? null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success("Demande envoyée. Nous vous contacterons sous 30 jours.");
    } catch (err: any) {
      console.error("Deletion request error:", err);
      toast.error(err.message || "Erreur lors de l'envoi de la demande");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12 px-4">
      <Helmet>
        <title>Supprimer mon compte SoloCab | Demande de suppression</title>
        <meta
          name="description"
          content="Demandez la suppression définitive de votre compte SoloCab et de toutes vos données personnelles. Conforme RGPD."
        />
        <link rel="canonical" href="https://solocab.fr/delete-account" />
      </Helmet>

      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
            <Trash2 className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Supprimer mon compte SoloCab</h1>
          <p className="text-muted-foreground text-lg">
            Demandez la suppression définitive de votre compte et de toutes vos données personnelles.
          </p>
        </div>

        {submitted ? (
          <Card className="p-8 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">Demande enregistrée</h2>
            <p className="text-muted-foreground">
              Nous avons bien reçu votre demande de suppression pour <strong>{email}</strong>.
            </p>
            <div className="text-sm text-muted-foreground space-y-2 max-w-md mx-auto">
              <p>📧 Un e-mail de confirmation vous sera envoyé sous 48 heures.</p>
              <p>🗑️ Votre compte et toutes vos données seront supprimés définitivement sous 30 jours maximum, conformément au RGPD.</p>
              <p>❓ Pour toute question, contactez-nous à <a href="mailto:contact@solocab.fr" className="text-primary underline">contact@solocab.fr</a>.</p>
            </div>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/">Retour à l'accueil</Link>
            </Button>
          </Card>
        ) : (
          <>
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Action irréversible.</strong> La suppression de votre compte entraîne la perte définitive de :
                votre profil, votre historique de courses, vos paiements enregistrés, vos évaluations et toutes vos données.
              </AlertDescription>
            </Alert>

            <Card className="p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Adresse e-mail du compte <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@exemple.com"
                    disabled={loading}
                    autoComplete="email"
                    required
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmEmail">
                    Confirmez votre adresse e-mail <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="confirmEmail"
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder="vous@exemple.com"
                    disabled={loading}
                    autoComplete="email"
                    required
                  />
                  {errors.confirmEmail && (
                    <p className="text-sm text-destructive">{errors.confirmEmail}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Raison de la suppression (optionnel)</Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Aidez-nous à nous améliorer en partageant la raison de votre départ..."
                    rows={4}
                    maxLength={1000}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground text-right">{reason.length}/1000</p>
                  {errors.reason && <p className="text-sm text-destructive">{errors.reason}</p>}
                </div>

                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="text-sm space-y-2">
                      <p className="font-semibold">Données qui seront supprimées :</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Votre profil utilisateur (nom, e-mail, téléphone)</li>
                        <li>Votre historique de courses et réservations</li>
                        <li>Vos moyens de paiement enregistrés</li>
                        <li>Vos messages, évaluations et notifications</li>
                        <li>Toutes vos préférences et paramètres</li>
                      </ul>
                      <p className="text-xs italic mt-2">
                        Certaines données peuvent être conservées pour des obligations légales (factures,
                        comptabilité) pour une durée maximum de 10 ans, conformément au Code de commerce.
                      </p>
                    </div>
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                    disabled={loading}
                    className="mt-1 h-4 w-4 rounded border-input"
                  />
                  <span className="text-sm">
                    Je comprends que cette action est <strong>irréversible</strong> et que toutes mes
                    données seront définitivement supprimées.
                  </span>
                </label>
                {errors.acknowledged && (
                  <p className="text-sm text-destructive">{errors.acknowledged}</p>
                )}

                <Button
                  type="submit"
                  variant="destructive"
                  size="lg"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Demander la suppression de mon compte
                    </>
                  )}
                </Button>
              </form>
            </Card>

            <Card className="p-6 mt-6 bg-muted/30">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-sm space-y-1">
                  <p className="font-semibold">Besoin d'aide ?</p>
                  <p className="text-muted-foreground">
                    Contactez notre équipe à{" "}
                    <a href="mailto:contact@solocab.fr" className="text-primary underline">
                      contact@solocab.fr
                    </a>{" "}
                    pour toute question concernant la suppression de votre compte ou vos données personnelles.
                  </p>
                </div>
              </div>
            </Card>

            <p className="text-center text-xs text-muted-foreground mt-6">
              Conformément au RGPD (Règlement Général sur la Protection des Données),
              votre demande sera traitée dans un délai maximum de 30 jours.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteAccount;
