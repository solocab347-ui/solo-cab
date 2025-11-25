import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Check, RefreshCw, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";

export const AdminInvitationTokens = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [tokenCount, setTokenCount] = useState(50);
  const [skipDocuments, setSkipDocuments] = useState(false);
  const [deletingTokens, setDeletingTokens] = useState<Set<string>>(new Set());

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

  const handleGenerateTokens = async () => {
    if (tokenCount < 1 || tokenCount > 500) {
      toast.error("Le nombre de tokens doit être entre 1 et 500");
      return;
    }

    setIsGenerating(true);
    try {
      const adminId = (await supabase.auth.getUser()).data.user?.id;
      const newTokens = [];

      for (let i = 0; i < tokenCount; i++) {
        // Générer un token unique sécurisé
        const token = `UNLIMITED-${Math.random().toString(36).substring(2, 15)}-${Date.now()}-${i}`;
        newTokens.push({
          token,
          used: false,
          expires_at: null, // Aucune expiration - accès illimité
          skip_documents: skipDocuments,
          created_by_admin_id: adminId,
        });
      }

      const { error } = await supabase
        .from("invitation_tokens")
        .insert(newTokens);

      if (error) throw error;

      toast.success(`✅ ${tokenCount} tokens d'accès illimité générés avec succès`);
      refetch();
    } catch (error: any) {
      console.error("Erreur génération tokens:", error);
      toast.error("Erreur lors de la génération des tokens");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteToken = async (tokenId: string, tokenValue: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ce token ?\n${tokenValue}`)) {
      return;
    }

    setDeletingTokens(prev => new Set(prev).add(tokenId));
    try {
      const { error } = await supabase
        .from("invitation_tokens")
        .delete()
        .eq("id", tokenId);

      if (error) throw error;

      toast.success("Token supprimé avec succès");
      refetch();
    } catch (error: any) {
      console.error("Erreur suppression token:", error);
      toast.error("Erreur lors de la suppression du token");
    } finally {
      setDeletingTokens(prev => {
        const newSet = new Set(prev);
        newSet.delete(tokenId);
        return newSet;
      });
    }
  };

  const handleDeleteAllUnused = async () => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer TOUS les ${unusedTokens.length} tokens non utilisés ?`)) {
      return;
    }

    setIsGenerating(true);
    try {
      const { error } = await supabase
        .from("invitation_tokens")
        .delete()
        .eq("used", false);

      if (error) throw error;

      toast.success(`${unusedTokens.length} tokens supprimés avec succès`);
      refetch();
    } catch (error: any) {
      console.error("Erreur suppression tokens:", error);
      toast.error("Erreur lors de la suppression des tokens");
    } finally {
      setIsGenerating(false);
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

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">🎁 Gestion des Tokens d'Accès Gratuit Illimité</h2>
          <p className="text-muted-foreground">
            Générez des liens d'inscription uniques donnant accès <strong className="text-green-600">GRATUIT et ILLIMITÉ</strong> à la plateforme
          </p>
          <p className="text-sm text-amber-600 mt-2">
            ⚠️ Ces tokens ne peuvent JAMAIS être révoqués - l'accès reste permanent
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="tokenCount">Nombre de tokens à générer</Label>
              <Input
                id="tokenCount"
                type="number"
                min="1"
                max="500"
                value={tokenCount}
                onChange={(e) => setTokenCount(parseInt(e.target.value) || 1)}
                placeholder="Ex: 50"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Entre 1 et 500 tokens</p>
            </div>
            <Button
              onClick={handleGenerateTokens}
              disabled={isGenerating}
              size="lg"
              className="bg-green-600 hover:bg-green-700"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Génération...
                </>
              ) : (
                `🎯 Générer ${tokenCount} token${tokenCount > 1 ? 's' : ''}`
              )}
            </Button>
          </div>
          
          <div className="flex items-center space-x-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <input
              type="checkbox"
              id="skipDocuments"
              checked={skipDocuments}
              onChange={(e) => setSkipDocuments(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <Label htmlFor="skipDocuments" className="text-sm font-medium cursor-pointer">
              Sauter l'étape des documents
            </Label>
            <p className="text-xs text-amber-700">
              (Si coché: ni documents ni paiement • Si décoché: documents requis mais pas de paiement)
            </p>
          </div>
        </div>
      </div>

      {(unusedTokens.length + usedTokens.length > 0) && (
        <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-green-900">
                📊 Statistiques des tokens
              </p>
              <p className="text-sm text-green-700">
                {usedTokens.length} utilisés • {unusedTokens.length} disponibles • {unusedTokens.length + usedTokens.length} total
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">{usedTokens.length}</p>
              <p className="text-xs text-muted-foreground">chauffeurs inscrits</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Tokens non utilisés */}
        <Card className="p-6 border-green-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">
                ✨ Tokens disponibles ({unusedTokens.length})
              </h3>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                Accès illimité
              </span>
            </div>
            {unusedTokens.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteAllUnused}
                disabled={isGenerating}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer tous
              </Button>
            )}
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {unusedTokens.map((token) => (
              <div
                key={token.id}
                className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <code className="text-sm font-mono truncate flex-1 text-green-900">
                  {token.token}
                </code>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyInvitationLink(token.token)}
                    className="hover:bg-green-100"
                  >
                    {copiedToken === token.token ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-green-700" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteToken(token.id, token.token)}
                    disabled={deletingTokens.has(token.id)}
                    className="hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
            {unusedTokens.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                Aucun token disponible. Générez-en de nouveaux.
              </p>
            )}
          </div>
        </Card>

        {/* Tokens utilisés */}
        <Card className="p-6 border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold">
              ✅ Tokens utilisés ({usedTokens.length})
            </h3>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
              Chauffeurs actifs
            </span>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {usedTokens.map((token) => (
              <div
                key={token.id}
                className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg"
              >
                <div className="flex-1">
                  <code className="text-sm font-mono block truncate text-blue-900">
                    {token.token}
                  </code>
                  {token.used_at && (
                    <span className="text-xs text-blue-700 font-medium">
                      ✓ Utilisé le {new Date(token.used_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {usedTokens.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                Aucun token utilisé pour le moment.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
