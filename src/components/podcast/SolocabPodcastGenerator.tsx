import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Mic, Play, Pause, Download, Loader2, Radio, ChevronDown, ChevronUp, CheckCircle2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getAllEpisodes, TOTAL_CHAPTERS, type PodcastEpisode } from "@/lib/podcast/podcastScripts";
import { usePodcastPersistence } from "@/hooks/usePodcastPersistence";
import PodcastRecovery from "./PodcastRecovery";

const SolocabPodcastGenerator = () => {
  const [generating, setGenerating] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState<string | null>(null);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [localAudios, setLocalAudios] = useState<Record<string, string>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { savedSegments, loading: loadingSegments, saveSegment, isSegmentSaved, reload } = usePodcastPersistence();

  const getAudioUrl = useCallback((episodeId: string): string | null => {
    return savedSegments[episodeId] || localAudios[episodeId] || null;
  }, [savedSegments, localAudios]);

  const generateSingleAudio = useCallback(async (text: string, session: any): Promise<Blob> => {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ text, voiceId: "cjVigY5qzO86Huf0OWal" }),
      }
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || `Erreur ${response.status}`);
    }
    return await response.blob();
  }, []);

  const generateEpisodeAudio = useCallback(async (episode: PodcastEpisode) => {
    if (isSegmentSaved(episode.id)) {
      toast.info("Cet épisode est déjà généré !");
      return;
    }
    setGenerating(episode.id);
    setProgress(10);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Vous devez être connecté"); return; }
      setProgress(20);
      toast.info(`Génération : "${episode.title}"...`, { duration: 10000 });
      const audioBlob = await generateSingleAudio(episode.script, session);
      setProgress(80);
      const url = await saveSegment(episode.id, audioBlob);
      if (url) {
        toast.success(`"${episode.title}" généré et sauvegardé !`);
      } else {
        const localUrl = URL.createObjectURL(audioBlob);
        setLocalAudios(prev => ({ ...prev, [episode.id]: localUrl }));
        toast.success(`"${episode.title}" généré !`);
      }
      setProgress(100);
    } catch (error: any) {
      console.error("Podcast generation error:", error);
      toast.error(`Erreur : ${error.message}`);
    } finally {
      setGenerating(null);
      setProgress(0);
    }
  }, [generateSingleAudio, isSegmentSaved, saveSegment]);

  const generateFullPodcast = useCallback(async () => {
    setGenerating("full");
    setProgress(5);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Vous devez être connecté"); return; }
      const episodes = getAllEpisodes();
      const totalEpisodes = episodes.length;
      const chapterBlobs: Blob[] = [];
      let skipped = 0;
      toast.info(`Génération du podcast complet (${totalEpisodes} chapitres)...`, { duration: 30000 });
      for (let i = 0; i < totalEpisodes; i++) {
        const ep = episodes[i];
        setProgress(Math.round(10 + (80 * i) / totalEpisodes));
        if (isSegmentSaved(ep.id)) {
          skipped++;
          const res = await fetch(savedSegments[ep.id]);
          chapterBlobs.push(await res.blob());
          continue;
        }
        const blob = await generateSingleAudio(ep.script, session);
        chapterBlobs.push(blob);
        await saveSegment(ep.id, blob);
      }
      if (skipped > 0) toast.info(`${skipped} chapitres déjà générés, reprise effectuée.`);
      const fullBlob = new Blob(chapterBlobs, { type: "audio/mpeg" });
      await saveSegment("full", fullBlob);
      setProgress(100);
      toast.success("Podcast complet généré et sauvegardé !");
    } catch (error: any) {
      console.error("Full podcast generation error:", error);
      toast.error(`Erreur : ${error.message}. Les chapitres déjà générés sont sauvegardés — vous pouvez reprendre.`);
    } finally {
      setGenerating(null);
      setProgress(0);
    }
  }, [generateSingleAudio, savedSegments, isSegmentSaved, saveSegment]);

  const handlePlay = (episodeId: string) => {
    const url = getAudioUrl(episodeId);
    if (!url) return;
    if (playing === episodeId) {
      audioRef.current?.pause();
      setPlaying(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(url);
      audio.onended = () => setPlaying(null);
      audio.play();
      audioRef.current = audio;
      setPlaying(episodeId);
    }
  };

  const handleDownload = (episodeId: string, title: string) => {
    const url = getAudioUrl(episodeId);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-zA-ZÀ-ÿ0-9\s-]/g, "").replace(/\s+/g, "-")}.mp3`;
    a.click();
  };

  const episodes = getAllEpisodes();
  const savedCount = episodes.filter(ep => isSegmentSaved(ep.id)).length;
  const hasFullPodcast = !!getAudioUrl("full");

  if (loadingSegments) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Chargement des podcasts sauvegardés...
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Recovery banner if no episodes saved */}
      {savedCount === 0 && !showRecovery && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <RotateCcw className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Des podcasts ont déjà été générés ?</p>
                <p className="text-xs text-muted-foreground">Récupérez les audios depuis l'historique ElevenLabs sans dépenser de crédits.</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowRecovery(true)} className="gap-1 shrink-0">
                <RotateCcw className="w-3 h-3" /> Récupérer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showRecovery && (
        <PodcastRecovery
          onComplete={() => { setShowRecovery(false); reload(); }}
          onClose={() => setShowRecovery(false)}
        />
      )}

      {/* Full Podcast */}
      <Card className="overflow-hidden border-2 border-primary/20">
        <div className="h-2 bg-gradient-to-r from-violet-500 to-purple-600" />
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-violet-500/10">
              <Radio className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">🎙️ Podcast Complet</CardTitle>
              <CardDescription className="mt-1">
                {savedCount > 0 && savedCount < TOTAL_CHAPTERS && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {savedCount}/{TOTAL_CHAPTERS} chapitres sauvegardés — la reprise est automatique.{" "}
                  </span>
                )}
                {savedCount === TOTAL_CHAPTERS && !hasFullPodcast && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Tous les chapitres sont prêts — cliquez pour assembler sans crédits.{" "}
                  </span>
                )}
                {savedCount === 0 && "Génère tous les chapitres. Chaque épisode sera sauvegardé individuellement — zéro doublon."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {generating === "full" && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Génération chapitre par chapitre... Les chapitres déjà générés sont ignorés.
              </p>
            </div>
          )}
          <div className="flex gap-2">
            {!hasFullPodcast ? (
              <Button
                onClick={generateFullPodcast}
                disabled={!!generating}
                className="flex-1 gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
              >
                {generating === "full" ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Génération...</>
                ) : savedCount > 0 ? (
                  <><Mic className="w-4 h-4" /> Reprendre ({savedCount}/{TOTAL_CHAPTERS})</>
                ) : (
                  <><Mic className="w-4 h-4" /> Générer le podcast complet</>
                )}
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => handlePlay("full")} className="gap-2">
                  {playing === "full" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {playing === "full" ? "Pause" : "Écouter"}
                </Button>
                <Button variant="outline" onClick={() => handleDownload("full", "Podcast-Complet-SoloCab")} className="gap-2">
                  <Download className="w-4 h-4" /> Télécharger MP3
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Toggle episodes */}
      <Button
        variant="ghost"
        onClick={() => setShowEpisodes(!showEpisodes)}
        className="w-full gap-2 text-muted-foreground"
      >
        {showEpisodes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {showEpisodes ? "Masquer" : "Afficher"} les {TOTAL_CHAPTERS} épisodes
        {savedCount > 0 && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">
            ({savedCount} sauvegardés)
          </span>
        )}
      </Button>

      {showEpisodes && (
        <div className="grid gap-3 sm:grid-cols-2">
          {episodes.map((ep) => {
            const isSaved = isSegmentSaved(ep.id);
            const audioUrl = getAudioUrl(ep.id);
            return (
              <Card key={ep.id} className="overflow-hidden">
                <div className={`h-1 bg-gradient-to-r ${isSaved ? "from-emerald-400 to-green-500" : "from-violet-400 to-purple-500"}`} />
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    {isSaved && <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />}
                    <div>
                      <p className="font-medium text-sm">{ep.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ep.description}</p>
                    </div>
                  </div>
                  {generating === ep.id && <Progress value={progress} className="h-1.5" />}
                  <div className="flex gap-2">
                    {!audioUrl ? (
                      <Button size="sm" variant="outline" onClick={() => generateEpisodeAudio(ep)} disabled={!!generating} className="gap-1 text-xs flex-1">
                        {generating === ep.id ? <><Loader2 className="w-3 h-3 animate-spin" /> En cours...</> : <><Mic className="w-3 h-3" /> Générer</>}
                      </Button>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handlePlay(ep.id)} className="gap-1 text-xs">
                          {playing === ep.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDownload(ep.id, ep.title)} className="gap-1 text-xs">
                          <Download className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SolocabPodcastGenerator;
