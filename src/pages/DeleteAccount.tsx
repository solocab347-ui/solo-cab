import { useEffect, useState } from "react";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import {
  Loader2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Mail,
  Route,
  MapPin,
  CreditCard,
  MessageSquare,
  Bell,
  Star,
  Smartphone,
  UserX,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

type RequestType = "full" | "partial";

type DataCategoryKey =
  | "courses"
  | "addresses"
  | "payments"
  | "messages"
  | "notifications"
  | "ratings"
  | "sessions";

interface DataCategory {
  key: DataCategoryKey;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const DATA_CATEGORIES: DataCategory[] = [
  {
    key: "courses",
    label: "Historique de courses",
    description: "Toutes vos réservations passées, courses effectuées et trajets enregistrés.",
    icon: Route,
  },
  {
    key: "addresses",
    label: "Adresses sauvegardées",
    description: "Vos adresses favorites (domicile, travail, lieux fréquents).",
    icon: MapPin,
  },
  {
    key: "payments",
    label: "Moyens de paiement",
    description: "Cartes bancaires enregistrées et préférences de paiement.",
    icon: CreditCard,
  },
  {
    key: "messages",
    label: "Messages & conversations",
    description: "Historique de chat avec les chauffeurs et conversations passées.",
    icon: MessageSquare,
  },
  {
    key: "notifications",
    label: "Notifications & préférences",
    description: "Historique de notifications, abonnements push et préférences.",
    icon: Bell,
  },
  {
    key: "ratings",
    label: "Évaluations données",
    description: "Notes et avis que vous avez laissés aux chauffeurs.",
    icon: Star,
  },
  {
    key: "sessions",
    label: "Sessions & navigation",
    description: "Historique d'appels, sessions actives et données de navigation.",
    icon: Smartphone,
  },
];

const baseSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "L'adresse e-mail est requise")
    .email("Adresse e-mail invalide")
    .max(255, "Adresse e-mail trop longue"),
  password: z
    .string()
    .min(1, "Mot de passe requis pour confirmer votre identité")
    .max(128, "Mot de passe trop long"),
  reason: z.string().trim().max(1000, "Raison trop longue (1000 caractères maximum)").optional(),
  acknowledged: z.literal(true, {
    errorMap: () => ({ message: "Vous devez confirmer la suppression" }),
  }),
});

const DeleteAccount = () => {
  const [requestType, setRequestType] = useState<RequestType>("full");
  const [selectedCategories, setSelectedCategories] = useState<Set<DataCategoryKey>>(new Set());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [reason, setReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedType, setSubmittedType] = useState<RequestType>("full");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Supprimer mes données SoloCab | Demande de suppression";
    const metaDesc = document.querySelector('meta[name="description"]');
    const desc =
      "Supprimez votre compte SoloCab ou seulement certaines données (courses, paiements, messages...). Conforme RGPD.";
    if (metaDesc) metaDesc.setAttribute("content", desc);
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", "https://solocab.fr/delete-account");

    // Pré-remplir et verrouiller l'email si l'utilisateur est déjà connecté
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setSessionEmail(session.user.email);
        setEmail(session.user.email);
      }
    });
  }, []);

  const toggleCategory = (key: DataCategoryKey) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAllCategories = () => {
    setSelectedCategories(new Set(DATA_CATEGORIES.map((c) => c.key)));
  };

  const clearAllCategories = () => {
    setSelectedCategories(new Set());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = baseSchema.safeParse({
      email,
      password,
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

    if (requestType === "partial" && selectedCategories.size === 0) {
      setErrors({ categories: "Sélectionnez au moins une catégorie de données à supprimer" });
      return;
    }

    setLoading(true);
    try {
      // 🔐 Étape 1 : Vérification d'identité par mot de passe
      // Empêche n'importe qui de demander la suppression du compte d'un tiers.
      const normalizedEmail = result.data.email.toLowerCase().trim();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: result.data.password,
      });

      if (authError) {
        setErrors({
          password:
            "Identifiants invalides. Vérifiez votre adresse e-mail et votre mot de passe.",
        });
        toast.error("Vérification d'identité échouée");
        setLoading(false);
        return;
      }

      // 🗑️ Étape 2 : Enregistrement de la demande
      const { error } = await supabase.from("account_deletion_requests").insert({
        email: normalizedEmail,
        reason: result.data.reason ?? null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        request_type: requestType,
        data_categories:
          requestType === "partial" ? Array.from(selectedCategories) : ["all"],
      });

      if (error) throw error;

      setSubmittedType(requestType);
      setSubmitted(true);
      toast.success(
        requestType === "full"
          ? "Demande de suppression complète envoyée."
          : "Demande de suppression partielle envoyée.",
      );

      // Si suppression complète, déconnecter immédiatement
      if (requestType === "full") {
        await supabase.auth.signOut();
      }
    } catch (err: any) {
      console.error("Deletion request error:", err);
      toast.error(err.message || "Erreur lors de l'envoi de la demande");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
            <Trash2 className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Supprimer mes données SoloCab
          </h1>
          <p className="text-muted-foreground text-lg">
            Choisissez de supprimer votre compte entièrement ou seulement certaines catégories de
            données.
          </p>
        </div>

        {submitted ? (
          <Card className="p-8 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Demande enregistrée</h2>
            <p className="text-muted-foreground">
              Nous avons bien reçu votre demande de{" "}
              <strong>
                {submittedType === "full"
                  ? "suppression complète du compte"
                  : "suppression partielle"}
              </strong>{" "}
              pour <strong>{email}</strong>.
            </p>
            <div className="text-sm text-muted-foreground space-y-2 max-w-md mx-auto">
              <p>📧 Un e-mail de confirmation vous sera envoyé sous 48 heures.</p>
              <p>
                🗑️ Le traitement sera effectué dans un délai maximum de 30 jours, conformément au
                RGPD.
              </p>
              <p>
                ❓ Pour toute question, contactez-nous à{" "}
                <a href="mailto:contact@solocab.fr" className="text-primary underline">
                  contact@solocab.fr
                </a>
                .
              </p>
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
                <strong>Action irréversible.</strong> Les données supprimées ne pourront pas être
                récupérées.
              </AlertDescription>
            </Alert>

            <Alert className="mb-6 border-primary/30 bg-primary/5">
              <Lock className="h-4 w-4 text-primary" />
              <AlertDescription>
                <strong>Vérification d'identité requise.</strong> Pour protéger votre compte, vous
                devez confirmer votre <strong>mot de passe</strong> avant toute suppression.
                Personne d'autre ne peut demander la suppression de votre compte.
              </AlertDescription>
            </Alert>

            <Card className="p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Type de demande */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Que souhaitez-vous faire ?</Label>
                  <RadioGroup
                    value={requestType}
                    onValueChange={(v) => setRequestType(v as RequestType)}
                    className="space-y-3"
                  >
                    <label
                      htmlFor="type-full"
                      className={`flex items-start gap-3 cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                        requestType === "full"
                          ? "border-destructive bg-destructive/5"
                          : "border-border hover:border-muted-foreground/50"
                      }`}
                    >
                      <RadioGroupItem value="full" id="type-full" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 font-semibold">
                          <UserX className="h-4 w-4 text-destructive" />
                          Supprimer tout mon compte
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Suppression définitive du compte et de toutes les données associées.
                        </p>
                      </div>
                    </label>

                    <label
                      htmlFor="type-partial"
                      className={`flex items-start gap-3 cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                        requestType === "partial"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/50"
                      }`}
                    >
                      <RadioGroupItem value="partial" id="type-partial" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 font-semibold">
                          <Trash2 className="h-4 w-4 text-primary" />
                          Supprimer seulement certaines données
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Conservez votre compte et choisissez précisément ce qui doit être effacé.
                        </p>
                      </div>
                    </label>
                  </RadioGroup>
                </div>

                {/* Sélecteur de catégories */}
                {requestType === "partial" && (
                  <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <Label className="text-base font-semibold">
                        Données à supprimer <span className="text-destructive">*</span>
                      </Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={selectAllCategories}
                          disabled={loading}
                        >
                          Tout sélectionner
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearAllCategories}
                          disabled={loading}
                        >
                          Effacer
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {DATA_CATEGORIES.map((cat) => {
                        const Icon = cat.icon;
                        const checked = selectedCategories.has(cat.key);
                        return (
                          <label
                            key={cat.key}
                            htmlFor={`cat-${cat.key}`}
                            className={`flex items-start gap-3 cursor-pointer rounded-md border p-3 transition-colors ${
                              checked
                                ? "border-primary bg-background"
                                : "border-border bg-background/50 hover:border-muted-foreground/50"
                            }`}
                          >
                            <Checkbox
                              id={`cat-${cat.key}`}
                              checked={checked}
                              onCheckedChange={() => toggleCategory(cat.key)}
                              disabled={loading}
                              className="mt-0.5"
                            />
                            <Icon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{cat.label}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {cat.description}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    {errors.categories && (
                      <p className="text-sm text-destructive">{errors.categories}</p>
                    )}
                    <p className="text-xs text-muted-foreground italic">
                      ℹ️ Votre profil et vos identifiants de connexion seront conservés. Vous
                      pourrez continuer à utiliser SoloCab.
                    </p>
                  </div>
                )}

                {/* Email */}
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
                    disabled={loading || !!sessionEmail}
                    autoComplete="email"
                    readOnly={!!sessionEmail}
                    required
                  />
                  {sessionEmail && (
                    <p className="text-xs text-muted-foreground">
                      ✅ Connecté en tant que {sessionEmail}
                    </p>
                  )}
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                {/* Mot de passe — vérification d'identité */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5 text-primary" />
                    Mot de passe <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Votre mot de passe SoloCab"
                      disabled={loading}
                      autoComplete="current-password"
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                      aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    🔐 Nous vérifions votre identité avant toute suppression. Aucune action n'est
                    possible sans le mot de passe du compte.
                  </p>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Raison de la demande (optionnel)</Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Aidez-nous à nous améliorer en partageant la raison de votre demande..."
                    rows={3}
                    maxLength={1000}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground text-right">{reason.length}/1000</p>
                  {errors.reason && <p className="text-sm text-destructive">{errors.reason}</p>}
                </div>

                {/* Avertissement RGPD */}
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="text-sm space-y-2">
                      <p className="font-semibold">À savoir :</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>La suppression est <strong>définitive et irréversible</strong>.</li>
                        <li>
                          Certaines données peuvent être conservées pour des obligations légales
                          (factures, comptabilité) jusqu'à 10 ans, conformément au Code de commerce.
                        </li>
                        <li>
                          Si vous avez des courses en cours ou des paiements non finalisés, ils
                          devront être réglés avant la suppression.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <Checkbox
                    checked={acknowledged}
                    onCheckedChange={(c) => setAcknowledged(c === true)}
                    disabled={loading}
                    className="mt-0.5"
                  />
                  <span className="text-sm">
                    Je comprends que cette action est <strong>irréversible</strong> et confirme ma
                    demande de suppression.
                  </span>
                </label>
                {errors.acknowledged && (
                  <p className="text-sm text-destructive">{errors.acknowledged}</p>
                )}

                <Button
                  type="submit"
                  variant={requestType === "full" ? "destructive" : "default"}
                  size="lg"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Vérification & envoi...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      {requestType === "full"
                        ? "Confirmer et supprimer mon compte"
                        : `Confirmer la suppression de ${selectedCategories.size} catégorie${
                            selectedCategories.size > 1 ? "s" : ""
                          }`}
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
                    pour toute question concernant la suppression de votre compte ou de vos données
                    personnelles.
                  </p>
                </div>
              </div>
            </Card>

            <p className="text-center text-xs text-muted-foreground mt-6">
              Conformément au RGPD, votre demande sera traitée dans un délai maximum de 30 jours.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteAccount;
