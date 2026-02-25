import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, GraduationCap, Download, Square, Loader2 } from "lucide-react";
import { guideAudiobookChapters } from "@/lib/audiobook/guideAudiobookContent";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

/**
 * Selects the best available French voice, prioritizing:
 * 1. Google FR voices (best quality on Chrome)
 * 2. Microsoft Online (Neural) voices (best on Edge)
 * 3. Any other French voice
 * 4. Fallback to first available voice
 */
function selectBestFrenchVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;

  const frenchVoices = voices.filter((v) => v.lang.startsWith("fr"));
  if (frenchVoices.length === 0) return voices[0];

  // Prefer Google neural voices
  const google = frenchVoices.find((v) => v.name.toLowerCase().includes("google"));
  if (google) return google;

  // Then Microsoft Online / Neural
  const msNeural = frenchVoices.find(
    (v) => v.name.toLowerCase().includes("online") || v.name.toLowerCase().includes("neural")
  );
  if (msNeural) return msNeural;

  // Prefer female voices (often smoother for long narration)
  const female = frenchVoices.find(
    (v) =>
      v.name.toLowerCase().includes("amelie") ||
      v.name.toLowerCase().includes("marie") ||
      v.name.toLowerCase().includes("female") ||
      v.name.toLowerCase().includes("thomas") ||
      v.name.toLowerCase().includes("audrey")
  );
  if (female) return female;

  return frenchVoices[0];
}

const GuideAudiobookPlayer = () => {
  const [currentChapter, setCurrentChapter] = useState(0);
  const [currentParagraph, setCurrentParagraph] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [allVoices, setAllVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const isPlayingRef = useRef(false);
  const { recordingState, recordingProgress, startRecording, cancelRecording } = useAudioRecorder();
  // Load voices and auto-select best one
  useEffect(() => {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length === 0) return;
      setAllVoices(voices);
      const best = selectBestFrenchVoice(voices);
      setSelectedVoice(best);
    };
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
    return () => { speechSynthesis.onvoiceschanged = null; };
  }, []);

  const stopSpeaking = useCallback(() => {
    speechSynthesis.cancel();
    isPlayingRef.current = false;
    setIsPlaying(false);
  }, []);

  const speakParagraph = useCallback((chapterIdx: number, paraIdx: number) => {
    const chapter = guideAudiobookChapters[chapterIdx];
    if (!chapter || paraIdx >= chapter.paragraphs.length) {
      if (chapterIdx + 1 < guideAudiobookChapters.length) {
        setCurrentChapter(chapterIdx + 1);
        setCurrentParagraph(0);
        speakParagraph(chapterIdx + 1, 0);
      } else {
        stopSpeaking();
      }
      return;
    }

    const text = paraIdx === 0
      ? `${chapter.title}. ${chapter.subtitle ? chapter.subtitle + ". " : ""}${chapter.paragraphs[0]}`
      : chapter.paragraphs[paraIdx];

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.rate = rate;
    utterance.volume = isMuted ? 0 : 1;
    utterance.pitch = 1.05; // Slightly higher pitch for more natural sound
    if (selectedVoice) utterance.voice = selectedVoice;

    utterance.onend = () => {
      if (isPlayingRef.current) {
        const nextPara = paraIdx + 1;
        setCurrentParagraph(nextPara);
        speakParagraph(chapterIdx, nextPara);
      }
    };

    utterance.onerror = (e) => {
      if (e.error !== "canceled") {
        console.error("Speech error:", e.error);
        stopSpeaking();
      }
    };

    speechSynthesis.speak(utterance);
  }, [rate, isMuted, selectedVoice, stopSpeaking]);

  const handlePlayPause = () => {
    if (isPlaying) {
      stopSpeaking();
    } else {
      isPlayingRef.current = true;
      setIsPlaying(true);
      speakParagraph(currentChapter, currentParagraph);
    }
  };

  const handlePrevChapter = () => {
    stopSpeaking();
    setCurrentChapter((c) => Math.max(0, c - 1));
    setCurrentParagraph(0);
  };

  const handleNextChapter = () => {
    stopSpeaking();
    setCurrentChapter((c) => Math.min(guideAudiobookChapters.length - 1, c + 1));
    setCurrentParagraph(0);
  };

  const handleChapterSelect = (idx: number) => {
    stopSpeaking();
    setCurrentChapter(idx);
    setCurrentParagraph(0);
  };

  useEffect(() => {
    return () => { speechSynthesis.cancel(); };
  }, []);

  const chapter = guideAudiobookChapters[currentChapter];
  const progress = chapter ? ((currentParagraph / chapter.paragraphs.length) * 100) : 0;

  const frenchVoices = allVoices.filter((v) => v.lang.startsWith("fr"));
  const voiceOptions = frenchVoices.length > 0 ? frenchVoices : allVoices.slice(0, 8);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-500" />
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10">
              <GraduationCap className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg">🎧 Audio — Le Guide du Chauffeur Indépendant</CardTitle>
              <p className="text-sm text-muted-foreground mt-1 truncate">
                {chapter?.title}{chapter?.subtitle ? ` — ${chapter.subtitle}` : ""}
              </p>
              {selectedVoice && (
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  Voix : {selectedVoice.name}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress */}
          <div className="space-y-1">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>§{currentParagraph + 1} / {chapter?.paragraphs.length ?? 0}</span>
              <span>Chapitre {currentChapter + 1} / {guideAudiobookChapters.length}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <Button variant="ghost" size="icon" onClick={handlePrevChapter} disabled={currentChapter === 0}>
              <SkipBack className="w-5 h-5" />
            </Button>
            <Button
              size="icon"
              className="w-14 h-14 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
              onClick={handlePlayPause}
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNextChapter} disabled={currentChapter === guideAudiobookChapters.length - 1}>
              <SkipForward className="w-5 h-5" />
            </Button>
          </div>

          {/* Record & Download */}
          <div className="flex items-center gap-2">
            {recordingState === "idle" ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 flex-1"
                  onClick={() => {
                    const chapter = guideAudiobookChapters[currentChapter];
                    if (chapter) {
                      const allText = [`${chapter.title}. ${chapter.subtitle || ""}`, ...chapter.paragraphs];
                      startRecording(allText, selectedVoice, rate, `Guide-${chapter.title}`);
                    }
                  }}
                >
                  <Download className="w-3.5 h-3.5" />
                  Enregistrer ce chapitre
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 flex-1"
                  onClick={() => {
                    const allParagraphs: string[] = [];
                    guideAudiobookChapters.forEach((ch) => {
                      allParagraphs.push(`${ch.title}. ${ch.subtitle || ""}`);
                      allParagraphs.push(...ch.paragraphs);
                    });
                    startRecording(allParagraphs, selectedVoice, rate, "Guide-Chauffeur-Independant-Complet");
                  }}
                >
                  <Download className="w-3.5 h-3.5" />
                  Tout enregistrer
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2 w-full">
                <div className="flex-1 text-xs text-muted-foreground">
                  {recordingState === "recording" && <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1.5" />}
                  {recordingProgress}
                </div>
                {recordingState === "recording" && (
                  <Button variant="destructive" size="sm" className="gap-1.5" onClick={cancelRecording}>
                    <Square className="w-3 h-3" /> Arrêter
                  </Button>
                )}
              </div>
            )}
          </div>
          {/* Speed, volume & voice selector */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)}>
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <div className="flex-1 space-y-1">
              <p className="text-xs text-muted-foreground">Vitesse : {rate}x</p>
              <Slider
                value={[rate]}
                onValueChange={([v]) => setRate(v)}
                min={0.5}
                max={2}
                step={0.1}
                className="w-full"
              />
            </div>
            {voiceOptions.length > 1 && (
              <select
                className="text-xs border rounded px-2 py-1 bg-background max-w-[140px]"
                value={selectedVoice?.name ?? ""}
                onChange={(e) => {
                  const v = allVoices.find((voice) => voice.name === e.target.value);
                  if (v) setSelectedVoice(v);
                }}
              >
                {voiceOptions.map((v) => (
                  <option key={v.name} value={v.name}>{v.name.slice(0, 28)}</option>
                ))}
              </select>
            )}
          </div>

          {/* Text preview */}
          {chapter && currentParagraph < chapter.paragraphs.length && (
            <div className="p-3 bg-muted/50 rounded-lg border-l-4 border-emerald-500/50">
              <p className="text-sm italic text-muted-foreground leading-relaxed">
                "{chapter.paragraphs[currentParagraph]}"
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chapter list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Chapitres</CardTitle>
        </CardHeader>
        <CardContent className="max-h-60 overflow-y-auto space-y-1">
          {guideAudiobookChapters.map((ch, idx) => (
            <button
              key={ch.id}
              onClick={() => handleChapterSelect(idx)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                idx === currentChapter
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium"
                  : "hover:bg-muted/60 text-muted-foreground"
              }`}
            >
              {ch.title}
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default GuideAudiobookPlayer;
