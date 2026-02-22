import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, BookOpen } from "lucide-react";
import { audiobookChapters } from "@/lib/audiobook/solocabAudiobookContent";

const SolocabAudiobookPlayer = () => {
  const [currentChapter, setCurrentChapter] = useState(0);
  const [currentParagraph, setCurrentParagraph] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isPlayingRef = useRef(false);

  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      const frenchVoices = voices.filter((v) => v.lang.startsWith("fr"));
      const fallback = frenchVoices.length > 0 ? frenchVoices : voices.slice(0, 5);
      setAvailableVoices(fallback);
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
    const chapter = audiobookChapters[chapterIdx];
    if (!chapter || paraIdx >= chapter.paragraphs.length) {
      // Move to next chapter
      if (chapterIdx + 1 < audiobookChapters.length) {
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
    if (availableVoices[selectedVoiceIndex]) {
      utterance.voice = availableVoices[selectedVoiceIndex];
    }

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

    utteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
  }, [rate, isMuted, availableVoices, selectedVoiceIndex, stopSpeaking]);

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
    const prev = Math.max(0, currentChapter - 1);
    setCurrentChapter(prev);
    setCurrentParagraph(0);
  };

  const handleNextChapter = () => {
    stopSpeaking();
    const next = Math.min(audiobookChapters.length - 1, currentChapter + 1);
    setCurrentChapter(next);
    setCurrentParagraph(0);
  };

  const handleChapterSelect = (idx: number) => {
    stopSpeaking();
    setCurrentChapter(idx);
    setCurrentParagraph(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => { speechSynthesis.cancel(); };
  }, []);

  const chapter = audiobookChapters[currentChapter];
  const progress = chapter ? ((currentParagraph / chapter.paragraphs.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Player card */}
      <Card className="overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-rose-500 to-pink-500" />
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-rose-500/10">
              <BookOpen className="w-6 h-6 text-rose-500" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg">🎧 Livre Audio — L'Illusion des Applications</CardTitle>
              <p className="text-sm text-muted-foreground mt-1 truncate">
                {chapter?.title}{chapter?.subtitle ? ` — ${chapter.subtitle}` : ""}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-1">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>§{currentParagraph + 1} / {chapter?.paragraphs.length ?? 0}</span>
              <span>Chapitre {currentChapter + 1} / {audiobookChapters.length}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <Button variant="ghost" size="icon" onClick={handlePrevChapter} disabled={currentChapter === 0}>
              <SkipBack className="w-5 h-5" />
            </Button>
            <Button
              size="icon"
              className="w-14 h-14 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white"
              onClick={handlePlayPause}
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNextChapter} disabled={currentChapter === audiobookChapters.length - 1}>
              <SkipForward className="w-5 h-5" />
            </Button>
          </div>

          {/* Speed & volume */}
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
            {availableVoices.length > 1 && (
              <select
                className="text-xs border rounded px-2 py-1 bg-background"
                value={selectedVoiceIndex}
                onChange={(e) => setSelectedVoiceIndex(Number(e.target.value))}
              >
                {availableVoices.map((v, i) => (
                  <option key={i} value={i}>{v.name.slice(0, 25)}</option>
                ))}
              </select>
            )}
          </div>

          {/* Current text preview */}
          {chapter && currentParagraph < chapter.paragraphs.length && (
            <div className="p-3 bg-muted/50 rounded-lg border-l-4 border-rose-500/50">
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
          {audiobookChapters.map((ch, idx) => (
            <button
              key={ch.id}
              onClick={() => handleChapterSelect(idx)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                idx === currentChapter
                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 font-medium"
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

export default SolocabAudiobookPlayer;
