import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Image as ImageIcon } from "lucide-react";

interface Props {
  /** Soit un storage path interne (`<feedback_id>/<ts>.png`), soit une URL absolue (legacy public URL). */
  fileUrl: string;
  fileName: string;
  className?: string;
}

const BUCKET = "feedback-attachments";
const SIGNED_TTL_SECONDS = 60 * 30; // 30 min

/**
 * Affiche une pièce jointe stockée dans le bucket privé `feedback-attachments`.
 * Génère un signed URL à la volée pour les nouveaux enregistrements (path interne)
 * et utilise tel quel les anciens enregistrements (URL absolue legacy).
 */
export function FeedbackAttachmentImage({ fileUrl, fileName, className }: Props) {
  const [resolved, setResolved] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      // Legacy : URL absolue
      if (/^https?:\/\//i.test(fileUrl)) {
        if (!cancelled) setResolved(fileUrl);
        return;
      }
      // Nouveau : storage path → signed URL
      const { data, error: e } = await supabase
        .storage.from(BUCKET).createSignedUrl(fileUrl, SIGNED_TTL_SECONDS);
      if (cancelled) return;
      if (e || !data?.signedUrl) {
        setError(true);
        return;
      }
      setResolved(data.signedUrl);
    };
    run();
    return () => { cancelled = true; };
  }, [fileUrl]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-muted/40 border rounded-lg p-3 text-xs text-destructive ${className}`}>
        <ImageIcon className="w-4 h-4 mr-2" /> Pièce jointe inaccessible
      </div>
    );
  }
  if (!resolved) {
    return (
      <div className={`flex items-center justify-center bg-muted/40 border rounded-lg ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <a href={resolved} target="_blank" rel="noopener noreferrer" download={fileName} className="block">
      <img
        src={resolved}
        alt={fileName}
        className={`object-cover rounded-lg border hover:border-primary transition-colors ${className}`}
      />
    </a>
  );
}
