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
      const newTokens = [];

      for (let i = 0; i < tokensToGenerate; i++) {
        // Générer un token unique
        const token = `TEST-${Math.random().toString(36).substring(2, 15)}-${Date.now()}-${i}`;
        newTokens.push({
          token,
          used: false,
          created_by_admin_id: (await supabase.auth.getUser()).data.user?.id,
        });
      }

      const { error } = await supabase
        .from("invitation_tokens")
        .insert(newTokens);

      if (error) throw error;

      toast.success(`${tokensToGenerate} tokens générés avec succès`);
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
          <h2 className="text-2xl font-bold">Campagne Test - 50 Chauffeurs</h2>
          <p className="text-muted-foreground">
            Générez et gérez les liens d'inscription uniques pour la campagne test
          </p>
        </div>
        <Button
          onClick={handleGenerateTokens}
          disabled={isGenerating}
          size="lg"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Génération...
            </>
          ) : (
            "Générer 50 tokens"
          )}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Tokens non utilisés */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Tokens disponibles ({unusedTokens.length})
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {unusedTokens.map((token) => (
              <div
                key={token.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <code className="text-sm font-mono truncate flex-1">
                  {token.token}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyInvitationLink(token.token)}
                >
                  {copiedToken === token.token ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
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
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Tokens utilisés ({usedTokens.length})
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {usedTokens.map((token) => (
              <div
                key={token.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex-1">
                  <code className="text-sm font-mono block truncate opacity-50">
                    {token.token}
                  </code>
                  {token.used_at && (
                    <span className="text-xs text-muted-foreground">
                      Utilisé le {new Date(token.used_at).toLocaleDateString()}
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
