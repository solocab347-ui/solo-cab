import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, RotateCcw, CheckCircle2, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getAllEpisodes } from "@/lib/podcast/podcastScripts";

interface PodcastRecoveryProps {
  onComplete: () => void;
  onClose: () => void;
}

const PodcastRecovery = ({ onComplete, onClose }: PodcastRecoveryProps) => {
  const [recovering, setRecovering] = useState(false);
  const [result, setResult] = useState<{
    total_history_items: number;
    matched: number;
    recovered: string[];
    already_saved: string[];
    errors: string[];
  } | null>(null);

  const episodes = getAllEpisodes();

  // Extract multiple unique short snippets from each episode for better matching
  const getSnippets = (script: string): string[] => {
    const parts = script.split("\n\n");
    const snippets: string[] = [];
    for (const part of parts) {
      const trimmed = part.trim();
      // Skip common intro/outro
      if (trimmed.length < 30) continue;
      if (trimmed.startsWith("Bienvenue dans")) continue;
      if (trimmed.startsWith("C'était l'épisode")) continue;
      if (trimmed.startsWith("Merci d'avoir écouté")) continue;
      // Take a 60-char slice from the middle of each paragraph
      const mid = Math.floor(trimmed.length / 3);
      const snippet = trimmed.slice(mid, mid + 80);
      if (snippet.length >= 30) {
        snippets.push(snippet);
      }
      if (snippets.length >= 5) break; // 5 snippets is enough
    }
    return snippets;
  };

  const recoverAll = useCallback(async () => {
    setRecovering(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Vous devez être connecté"); return; }

      const episodeData = episodes.map(ep => ({
        id: ep.id,
        snippets: getSnippets(ep.script),
      }));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-recover`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: "recover_all", episodes: episodeData }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Erreur lors de la récupération");
      }

      const data = await response.json();
      setResult(data);

      if (data.recovered.length > 0) {
        toast.success(`${data.recovered.length} épisode(s) récupéré(s) avec succès !`);
        onComplete();
      } else if (data.already_saved.length > 0) {
        toast.info(`${data.already_saved.length} épisode(s) déjà enregistré(s).`);
        onComplete();
      } else {
        toast.info(`${data.total_history_items} audio(s) trouvé(s) dans l'historique, mais aucune correspondance avec les épisodes.`);
      }
    } catch (error: any) {
      console.error("Recovery error:", error);
      toast.error(error.message);
    } finally {
      setRecovering(false);
    }
  }, [episodes, onComplete]);

  return (
    <Card className="border-amber-500/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Récupération des audios existants
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Récupère les audios déjà générés depuis l'historique ElevenLabs — <strong>sans dépenser de crédits</strong>. Le système cherche automatiquement les correspondances.
        </p>

        {result && (
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>🔍 {result.total_history_items} audio(s) trouvé(s) dans l'historique</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>🔗 {result.matched} correspondance(s) trouvée(s)</span>
            </div>
            {result.recovered.length > 0 && (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="w-3 h-3" />
                <span>{result.recovered.length} épisode(s) récupéré(s)</span>
              </div>
            )}
            {result.already_saved.length > 0 && (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="w-3 h-3" />
                <span>{result.already_saved.length} épisode(s) déjà enregistré(s)</span>
              </div>
            )}
            {result.errors.length > 0 && (
              <div className="space-y-1">
                {result.errors.map((err, i) => (
                  <div key={i} className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <Button
          onClick={recoverAll}
          disabled={recovering}
          className="w-full gap-2"
        >
          {recovering ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Récupération en cours (peut prendre 1-2 min)...</>
          ) : result ? (
            <><RotateCcw className="w-4 h-4" /> Relancer la récupération</>
          ) : (
            <><RotateCcw className="w-4 h-4" /> Récupérer les audios existants</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PodcastRecovery;
