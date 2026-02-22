import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, RotateCcw, CheckCircle2, X, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getAllEpisodes } from "@/lib/podcast/podcastScripts";

interface HistoryItem {
  history_item_id: string;
  text_preview: string;
  date_unix: number;
  character_count: number;
}

interface PodcastRecoveryProps {
  onComplete: () => void;
  onClose: () => void;
}

const PodcastRecovery = ({ onComplete, onClose }: PodcastRecoveryProps) => {
  const [loading, setLoading] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [existingEpisodes, setExistingEpisodes] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [recovered, setRecovered] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  const episodes = getAllEpisodes();

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Vous devez être connecté"); return; }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-recover`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: "list" }),
        }
      );

      if (!response.ok) throw new Error("Erreur lors de la récupération");
      const data = await response.json();

      setHistoryItems(data.history_items || []);
      setExistingEpisodes(data.existing_episodes || []);

      // Auto-map: try matching history items to episodes by text content
      const autoMappings: Record<string, string> = {};
      for (const item of data.history_items || []) {
        for (const ep of episodes) {
          const epStart = ep.script.slice(0, 100).toLowerCase();
          const itemText = (item.text_preview || "").toLowerCase();
          if (itemText && epStart.includes(itemText.slice(0, 50)) || itemText.includes(epStart.slice(0, 50))) {
            if (!Object.values(autoMappings).includes(item.history_item_id)) {
              autoMappings[ep.id] = item.history_item_id;
              break;
            }
          }
        }
      }
      setMappings(autoMappings);

      if ((data.history_items || []).length === 0) {
        toast.info("Aucun audio trouvé dans l'historique ElevenLabs.");
      } else {
        toast.success(`${data.history_items.length} audios trouvés dans l'historique !`);
      }
    } catch (error: any) {
      console.error("Recovery fetch error:", error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [episodes]);

  const recoverAll = useCallback(async () => {
    const toRecover = Object.entries(mappings).filter(
      ([epId]) => !existingEpisodes.includes(epId) && !recovered.includes(epId)
    );

    if (toRecover.length === 0) {
      toast.info("Rien à récupérer !");
      return;
    }

    setRecovering(true);
    setProgress(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      for (let i = 0; i < toRecover.length; i++) {
        const [episodeId, historyItemId] = toRecover[i];
        setProgress(Math.round((i / toRecover.length) * 100));

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-recover`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              action: "recover",
              history_item_id: historyItemId,
              episode_id: episodeId,
            }),
          }
        );

        if (response.ok) {
          setRecovered(prev => [...prev, episodeId]);
        } else {
          const err = await response.json().catch(() => ({}));
          console.error(`Failed to recover ${episodeId}:`, err);
        }
      }

      setProgress(100);
      toast.success(`${toRecover.length} épisode(s) récupéré(s) avec succès !`);
      onComplete();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setRecovering(false);
    }
  }, [mappings, existingEpisodes, recovered, onComplete]);

  const toggleMapping = (episodeId: string, historyItemId: string) => {
    setMappings(prev => {
      const next = { ...prev };
      if (next[episodeId] === historyItemId) {
        delete next[episodeId];
      } else {
        next[episodeId] = historyItemId;
      }
      return next;
    });
  };

  const mappedCount = Object.keys(mappings).filter(
    epId => !existingEpisodes.includes(epId)
  ).length;

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
        {historyItems.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Cette fonctionnalité récupère les audios déjà générés depuis l'historique ElevenLabs et les sauvegarde — <strong>sans dépenser de crédits</strong>.
            </p>
            <Button onClick={fetchHistory} disabled={loading} className="w-full gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Recherche...</> : <><RotateCcw className="w-4 h-4" /> Chercher dans l'historique</>}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {historyItems.length} audio(s) trouvé(s). Associez-les aux épisodes puis cliquez "Récupérer".
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {episodes.map(ep => {
                const isExisting = existingEpisodes.includes(ep.id);
                const isRecovered = recovered.includes(ep.id);
                const mapped = mappings[ep.id];

                return (
                  <div key={ep.id} className={`p-2 rounded-lg text-xs border ${isExisting || isRecovered ? "bg-emerald-500/10 border-emerald-500/30" : mapped ? "bg-amber-500/10 border-amber-500/30" : "border-border"}`}>
                    <div className="flex items-center gap-2">
                      {(isExisting || isRecovered) && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />}
                      <span className="font-medium flex-1">{ep.title}</span>
                    </div>
                    {!isExisting && !isRecovered && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {historyItems.map(item => (
                          <button
                            key={item.history_item_id}
                            onClick={() => toggleMapping(ep.id, item.history_item_id)}
                            className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                              mapped === item.history_item_id
                                ? "bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300"
                                : "border-border hover:border-amber-500/50"
                            }`}
                          >
                            {new Date(item.date_unix * 1000).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} — {item.character_count} chars
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {recovering && (
              <div className="space-y-1">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">Récupération en cours...</p>
              </div>
            )}

            <Button
              onClick={recoverAll}
              disabled={recovering || mappedCount === 0}
              className="w-full gap-2"
            >
              {recovering ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Récupération...</>
              ) : (
                <><Download className="w-4 h-4" /> Récupérer {mappedCount} épisode(s)</>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PodcastRecovery;
