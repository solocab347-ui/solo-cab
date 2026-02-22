import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Mic, Play, Pause, Download, Loader2, Radio, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getFullPodcastScript, getChapterPodcastScript, getAllEpisodes, TOTAL_CHAPTERS, type PodcastEpisode } from "@/lib/podcast/podcastScripts";

const SolocabPodcastGenerator = () => {
  const [generating, setGenerating] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState<string | null>(null);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [generatedAudios, setGeneratedAudios] = useState<Record<string, string>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const generateAudio = useCallback(async (episode: PodcastEpisode) => {
    setGenerating(episode.id);
    setProgress(10);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Vous devez être connecté pour générer un podcast");
        return;
      }

      setProgress(20);
      toast.info(`Génération en cours : "${episode.title}"...`, { duration: 10000 });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            text: episode.script,
            voiceId: "onwK4e9ZLuTAKqWW03F9", // Daniel - French voice
          }),
        }
      );

      setProgress(70);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Erreur ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      setGeneratedAudios((prev) => ({ ...prev, [episode.id]: audioUrl }));
      setProgress(100);
      toast.success(`Podcast "${episode.title}" généré avec succès !`);
    } catch (error: any) {
      console.error("Podcast generation error:", error);
      toast.error(`Erreur : ${error.message}`);
    } finally {
      setGenerating(null);
      setProgress(0);
    }
  }, []);

  const handlePlay = (episodeId: string) => {
    const url = generatedAudios[episodeId];
    if (!url) return;

    if (playing === episodeId) {
      audioRef.current?.pause();
      setPlaying(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audio.onended = () => setPlaying(null);
      audio.play();
      audioRef.current = audio;
      setPlaying(episodeId);
    }
  };

  const handleDownload = (episodeId: string, title: string) => {
    const url = generatedAudios[episodeId];
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-zA-ZÀ-ÿ0-9\s-]/g, "").replace(/\s+/g, "-")}.mp3`;
    a.click();
  };

  const fullPodcast = getFullPodcastScript();
  const episodes = getAllEpisodes();

  return (
    <div className="space-y-4">
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
                {fullPodcast.title} — L'intégralité du livre en un seul épisode audio premium via ElevenLabs.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {generating === "full" && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Génération en cours... Cela peut prendre quelques minutes.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            {!generatedAudios["full"] ? (
              <Button
                onClick={() => generateAudio(fullPodcast)}
                disabled={!!generating}
                className="flex-1 gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
              >
                {generating === "full" ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Génération...</>
                ) : (
                  <><Mic className="w-4 h-4" /> Générer le podcast complet</>
                )}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => handlePlay("full")}
                  className="gap-2"
                >
                  {playing === "full" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {playing === "full" ? "Pause" : "Écouter"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDownload("full", fullPodcast.title)}
                  className="gap-2"
                >
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
        {showEpisodes ? "Masquer" : "Afficher"} les {TOTAL_CHAPTERS} épisodes individuels
      </Button>

      {/* Individual episodes */}
      {showEpisodes && (
        <div className="grid gap-3 sm:grid-cols-2">
          {episodes.map((ep, idx) => (
            <Card key={ep.id} className="overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-violet-400 to-purple-500" />
              <CardContent className="p-4 space-y-3">
                <div>
                  <p className="font-medium text-sm">{ep.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ep.description}</p>
                </div>

                {generating === ep.id && (
                  <Progress value={progress} className="h-1.5" />
                )}

                <div className="flex gap-2">
                  {!generatedAudios[ep.id] ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateAudio(ep)}
                      disabled={!!generating}
                      className="gap-1 text-xs flex-1"
                    >
                      {generating === ep.id ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> En cours...</>
                      ) : (
                        <><Mic className="w-3 h-3" /> Générer</>
                      )}
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePlay(ep.id)}
                        className="gap-1 text-xs"
                      >
                        {playing === ep.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(ep.id, ep.title)}
                        className="gap-1 text-xs"
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SolocabPodcastGenerator;
