import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, RefreshCw, Trash2, Link2, Plus, Gift, Clock, Infinity } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type AccessDuration = "1_month" | "2_months" | "3_months" | "6_months" | "unlimited";

const DURATION_OPTIONS: { value: AccessDuration; label: string; days: number | null }[] = [
  { value: "1_month", label: "1 mois", days: 30 },
  { value: "2_months", label: "2 mois", days: 60 },
  { value: "3_months", label: "3 mois", days: 90 },
  { value: "6_months", label: "6 mois", days: 180 },
  { value: "unlimited", label: "Illimité", days: null },
];

const AdminInvitationLinks = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [linkCount, setLinkCount] = useState(1);
  const [duration, setDuration] = useState<AccessDuration>("1_month");

  const { data: tokens, refetch } = useQuery({
    queryKey: ["invitation-tokens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitation_tokens")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleGenerateLinks = async () => {
    if (linkCount < 1 || linkCount > 50) {
      toast.error("Le nombre de liens doit être entre 1 et 50");
      return;
    }

    setIsGenerating(true);
    try {
      const adminId = (await supabase.auth.getUser()).data.user?.id;
      const durationOption = DURATION_OPTIONS.find(d => d.value === duration);
      const expiresAt = durationOption?.days
        ? new Date(Date.now() + durationOption.days * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const newTokens = [];
      for (let i = 0; i < linkCount; i++) {
        const token = `FREE-${crypto.randomUUID().split("-").slice(0, 2).join("")}`;
        newTokens.push({
          token,
          used: false,
          expires_at: expiresAt,
          skip_documents: false, // Documents toujours requis
          created_by_admin_id: adminId,
        });
      }

      const { error } = await supabase.from("invitation_tokens").insert(newTokens);
      if (error) throw error;

      toast.success(`${linkCount} lien(s) d'accès gratuit généré(s)`);
      refetch();
    } catch (error: any) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la génération");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteToken = async (tokenId: string) => {
    try {
      const { error } = await supabase.from("invitation_tokens").delete().eq("id", tokenId);
      if (error) throw error;
      toast.success("Lien supprimé");
      refetch();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleDeleteAllUnused = async () => {
    try {
      const { error } = await supabase.from("invitation_tokens").delete().eq("used", false);
      if (error) throw error;
      toast.success("Tous les liens non utilisés ont été supprimés");
      refetch();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const copyInvitationLink = (token: string) => {
    const link = `${window.location.origin}/register-driver?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    toast.success("Lien copié !");
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const unusedTokens = tokens?.filter(t => !t.used) || [];
  const usedTokens = tokens?.filter(t => t.used) || [];

  const getDurationLabel = (token: any) => {
    if (!token.expires_at) return "Illimité";
    const days = Math.ceil((new Date(token.expires_at).getTime() - new Date(token.created_at).getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 31) return "1 mois";
    if (days <= 62) return "2 mois";
    if (days <= 93) return "3 mois";
    if (days <= 183) return "6 mois";
    return `${days}j`;
  };

  return (
    <div className="space-y-6">
      {/* Génération de liens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Générer des liens d'accès gratuit
          </CardTitle>
          <CardDescription>
            Créez des liens d'inscription uniques. Les utilisateurs suivront le parcours classique 
            (documents, onboarding) mais bénéficieront d'un accès gratuit pendant la durée choisie.
            Après expiration, ils conservent l'accès gratuit. Premium disponible à 19,99€/mois.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Nombre de liens</Label>
              <Input
                type="number"
                min="1"
                max="50"
                value={linkCount}
                onChange={(e) => setLinkCount(parseInt(e.target.value) || 1)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Durée d'accès gratuit</Label>
              <Select value={duration} onValueChange={(v) => setDuration(v as AccessDuration)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleGenerateLinks}
                disabled={isGenerating}
                className="w-full gap-2"
              >
                {isGenerating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Générer {linkCount} lien{linkCount > 1 ? "s" : ""}
              </Button>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            <p>📋 <strong>Parcours utilisateur :</strong> Inscription → Documents → Onboarding → Accès gratuit ({DURATION_OPTIONS.find(d => d.value === duration)?.label})</p>
            <p className="mt-1">💳 Après la période gratuite → Accès de base gratuit, Premium à 19,99€/mois</p>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{unusedTokens.length}</p>
          <p className="text-xs text-muted-foreground">Disponibles</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{usedTokens.length}</p>
          <p className="text-xs text-muted-foreground">Utilisés</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{(tokens?.length || 0)}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </Card>
      </div>

      {/* Liens disponibles */}
      {unusedTokens.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Gift className="w-4 h-4" />
                Liens disponibles ({unusedTokens.length})
              </CardTitle>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive">
                    <Trash2 className="w-3 h-3 mr-1" />
                    Tout supprimer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer tous les liens non utilisés ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action supprimera les {unusedTokens.length} liens d'accès gratuit non utilisés.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAllUnused} className="bg-destructive text-destructive-foreground">
                      Supprimer tout
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {unusedTokens.map((token) => (
                <div
                  key={token.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <code className="text-xs font-mono truncate block">{token.token}</code>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {token.expires_at ? (
                          <><Clock className="w-3 h-3 mr-1" />{getDurationLabel(token)}</>
                        ) : (
                          <><Infinity className="w-3 h-3 mr-1" />Illimité</>
                        )}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Créé le {format(new Date(token.created_at), "dd/MM/yyyy", { locale: fr })}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => copyInvitationLink(token.token)}>
                    {copiedToken === token.token ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteToken(token.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liens utilisés */}
      {usedTokens.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              Liens utilisés ({usedTokens.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {usedTokens.map((token) => (
                <div
                  key={token.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <code className="text-xs font-mono truncate block text-muted-foreground">{token.token}</code>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">Utilisé</Badge>
                      {token.used_at && (
                        <span className="text-xs text-muted-foreground">
                          le {format(new Date(token.used_at), "dd/MM/yyyy", { locale: fr })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminInvitationLinks;
