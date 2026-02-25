import { useState, useRef, useCallback } from "react";

/**
 * Hook to record browser audio output (system audio) while SpeechSynthesis plays.
 * Uses a silent AudioContext + MediaRecorder workaround:
 * - Creates a destination stream via AudioContext
 * - Speaks each paragraph via SpeechSynthesis
 * - Since SpeechSynthesis doesn't expose a stream, we use a "loopback" approach:
 *   capture via getDisplayMedia or fall back to generating a blob from utterance timing.
 * 
 * PRACTICAL APPROACH: Since direct capture of SpeechSynthesis output is not possible
 * in most browsers, this hook synthesizes each paragraph sequentially and builds
 * a downloadable audio file by requesting the user's tab audio via getDisplayMedia.
 */

export type RecordingState = "idle" | "recording" | "processing" | "done";

interface UseAudioRecorderReturn {
  recordingState: RecordingState;
  recordingProgress: string;
  startRecording: (
    paragraphs: string[],
    voice: SpeechSynthesisVoice | null,
    rate: number,
    title: string
  ) => Promise<void>;
  cancelRecording: () => void;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingProgress, setRecordingProgress] = useState("");
  const cancelledRef = useRef(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true;
    speechSynthesis.cancel();
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setRecordingState("idle");
    setRecordingProgress("");
  }, []);

  const startRecording = useCallback(
    async (
      paragraphs: string[],
      voice: SpeechSynthesisVoice | null,
      rate: number,
      title: string
    ) => {
      cancelledRef.current = false;
      setRecordingState("recording");

      try {
        // Request tab audio capture
        setRecordingProgress("Autorisez le partage audio de l'onglet...");
        
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: false,
            audio: true,
          } as DisplayMediaStreamOptions);
        } catch {
          // Fallback: try with video (some browsers require it) then discard video track
          try {
            stream = await navigator.mediaDevices.getDisplayMedia({
              video: true,
              audio: true,
            });
            // Remove video tracks, keep only audio
            stream.getVideoTracks().forEach((t) => t.stop());
          } catch {
            throw new Error("PERMISSION_DENIED");
          }
        }

        // Verify we have audio tracks
        if (stream.getAudioTracks().length === 0) {
          stream.getTracks().forEach((t) => t.stop());
          throw new Error("NO_AUDIO_TRACK");
        }

        mediaStreamRef.current = stream;

        // Create audio-only stream
        const audioStream = new MediaStream(stream.getAudioTracks());
        
        const recorder = new MediaRecorder(audioStream, {
          mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : "audio/webm",
        });

        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.start(1000); // collect data every second

        // Speak each paragraph sequentially
        for (let i = 0; i < paragraphs.length; i++) {
          if (cancelledRef.current) break;
          setRecordingProgress(`Enregistrement... §${i + 1}/${paragraphs.length}`);

          await new Promise<void>((resolve, reject) => {
            const utterance = new SpeechSynthesisUtterance(paragraphs[i]);
            utterance.lang = "fr-FR";
            utterance.rate = rate;
            utterance.volume = 1;
            if (voice) utterance.voice = voice;

            utterance.onend = () => resolve();
            utterance.onerror = (e) => {
              if (e.error === "canceled") resolve();
              else reject(e);
            };

            speechSynthesis.speak(utterance);
          });

          // Small pause between paragraphs
          if (!cancelledRef.current && i < paragraphs.length - 1) {
            await new Promise((r) => setTimeout(r, 400));
          }
        }

        if (cancelledRef.current) return;

        // Stop recording
        setRecordingState("processing");
        setRecordingProgress("Finalisation...");

        await new Promise<void>((resolve) => {
          recorder.onstop = () => resolve();
          recorder.stop();
        });

        // Clean up stream
        stream.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;

        // Create download
        const blob = new Blob(chunks, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ\s-]/g, "").replace(/\s+/g, "-")}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setRecordingState("done");
        setRecordingProgress("Téléchargé !");
        setTimeout(() => {
          setRecordingState("idle");
          setRecordingProgress("");
        }, 3000);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "";
        if (msg === "PERMISSION_DENIED") {
          setRecordingProgress("⚠️ Partage audio refusé. Sélectionnez cet onglet et cochez « Partager l'audio ».");
        } else if (msg === "NO_AUDIO_TRACK") {
          setRecordingProgress("⚠️ Pas de piste audio. Cochez « Partager l'audio de l'onglet » lors du partage.");
        } else {
          console.error("Recording error:", error);
          setRecordingProgress("Erreur d'enregistrement");
        }
        setRecordingState("idle");
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        }
        // Keep error message visible for a moment
        setTimeout(() => setRecordingProgress(""), 5000);
      }
    },
    []
  );

  return { recordingState, recordingProgress, startRecording, cancelRecording };
}
