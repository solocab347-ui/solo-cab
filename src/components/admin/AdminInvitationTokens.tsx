import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Check, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export const AdminInvitationTokens = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

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
    setIsGenerating(true);
    try {
      const tokensToGenerate = 50;
      const adminId = (await supabase.auth.getUser()).data.user?.id;
      const newTokens = [];

      for (let i = 0; i < tokensToGenerate; i++) {
        // Générer un token unique sécurisé
        const token = `UNLIMITED-${Math.random().toString(36).substring(2, 15)}-${Date.now()}-${i}`;
        newTokens.push({
          token,
          used: false,
          expires_at: null, // Aucune expiration - accès illimité
          created_by_admin_id: adminId,
        });
      }

      const { error } = await supabase
        .from("invitation_tokens")
        .insert(newTokens);

      if (error) throw error;

      toast.success(`✅ ${tokensToGenerate} tokens d'accès illimité générés avec succès`);
      refetch();
    } catch (error: any) {
      console.error("Erreur génération tokens:", error);
      toast.error("Erreur lors de la génération des tokens");
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">🎁 Campagne Test - 50 Chauffeurs</h2>
          <p className="text-muted-foreground">
            Générez 50 liens d'inscription uniques donnant accès <strong className="text-green-600">GRATUIT et ILLIMITÉ</strong> à la plateforme
          </p>
          <p className="text-sm text-amber-600 mt-2">
            ⚠️ Ces tokens ne peuvent JAMAIS être révoqués - l'accès reste permanent
          </p>
        </div>
        <Button
          onClick={handleGenerateTokens}
          disabled={isGenerating || (unusedTokens.length + usedTokens.length >= 50)}
          size="lg"
          className="bg-green-600 hover:bg-green-700"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Génération...
            </>
          ) : (
            "🎯 Générer 50 tokens illimités"
          )}
        </Button>
      </div>

      {(unusedTokens.length + usedTokens.length > 0) && (
        <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-green-900">
                📊 Progression de la campagne
              </p>
              <p className="text-sm text-green-700">
                {usedTokens.length} / 50 chauffeurs inscrits
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">{usedTokens.length}</p>
              <p className="text-xs text-muted-foreground">inscrits</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Tokens non utilisés */}
        <Card className="p-6 border-green-200">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold">
              ✨ Tokens disponibles ({unusedTokens.length})
            </h3>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
              Accès illimité
            </span>
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
