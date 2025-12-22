import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";

interface DocumentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: any;
}

const REQUIRED_DOCUMENTS = [
  { key: "vtc_card", label: "Carte professionnelle VTC" },
  { key: "driving_license", label: "Permis de conduire" },
  { key: "id_card", label: "Pièce d'identité (CNI ou Passeport)" },
  { key: "vehicle_registration", label: "Carte grise du véhicule" },
  { key: "insurance", label: "Attestation d'assurance RC Pro VTC" },
  { key: "kbis", label: "Extrait Kbis ou INSEE" },
];

const DocumentViewer = ({ open, onOpenChange, driver }: DocumentViewerProps) => {
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState(false);

  if (!driver) return null;

  const documents = driver.documents || {};

  // Générer des signed URLs pour tous les documents au chargement
  useEffect(() => {
    const generateSignedUrls = async () => {
      if (!open || !driver.id) return;
      
      setLoadingUrls(true);
      const urls: Record<string, string> = {};

      try {
        for (const [key, storagePath] of Object.entries(documents)) {
          if (typeof storagePath === 'string' && storagePath) {
            // Extraire le chemin du fichier depuis l'URL complète
            let filePath = storagePath;
            
            // Si c'est une URL complète, extraire uniquement le chemin
            if (storagePath.includes('/storage/v1/object/')) {
              const parts = storagePath.split('/storage/v1/object/');
              if (parts[1]) {
                // Enlever "public/" ou "sign/" du début
                filePath = parts[1].replace(/^(public|sign)\//, '');
                // Enlever le nom du bucket
                filePath = filePath.replace(/^[^/]+\//, '');
              }
            }

            // Générer une signed URL valide 1 heure
            const { data, error } = await supabase.storage
              .from('driver-documents')
              .createSignedUrl(filePath, 3600);

            if (data?.signedUrl) {
              urls[key] = data.signedUrl;
            } else if (error) {
              console.error(`Erreur génération URL pour ${key}:`, error);
            }
          }
        }

        setSignedUrls(urls);
      } catch (error) {
        console.error('Erreur génération signed URLs:', error);
        toast.error('Erreur lors du chargement des documents');
      } finally {
        setLoadingUrls(false);
      }
    };

    generateSignedUrls();
  }, [open, driver.id, documents]);

  const downloadDocument = async (key: string, name: string) => {
    const signedUrl = signedUrls[key];
    
    if (!signedUrl) {
      toast.error('Document non disponible');
      return;
    }

    try {
      // Télécharger le fichier via fetch pour tous les types
      const response = await fetch(signedUrl);
      if (!response.ok) throw new Error('Erreur téléchargement');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      
      // Nettoyage
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Document téléchargé');
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const getDocumentUrl = (key: string): string | null => {
    if (typeof documents !== 'object') return null;
    return signedUrls[key] || null;
  };

  const isImage = (url: string) => {
    return url && (
      url.includes('.jpg') || 
      url.includes('.jpeg') || 
      url.includes('.png') || 
      url.includes('.webp') ||
      url.includes('.gif') ||
      url.toLowerCase().includes('image')
    );
  };

  const isPDF = (url: string) => {
    return url && (url.includes('.pdf') || url.toLowerCase().includes('pdf'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center justify-between">
            <span>Documents - {driver.profiles?.full_name}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {REQUIRED_DOCUMENTS.map((doc) => {
            const url = getDocumentUrl(doc.key);
            const hasDocument = !!url;

            return (
              <div
                key={doc.key}
                className={`border rounded-lg p-4 ${
                  hasDocument 
                    ? "border-green-500/50 bg-green-500/5" 
                    : "border-red-500/50 bg-red-500/5"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    <div>
                      <h3 className="font-semibold">{doc.label}</h3>
                      <Badge 
                        variant={hasDocument ? "default" : "destructive"}
                        className="mt-1"
                      >
                        {hasDocument ? "Fourni" : "Manquant"}
                      </Badge>
                    </div>
                  </div>
                  {hasDocument && url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadDocument(doc.key, `${doc.label}`)}
                      disabled={loadingUrls}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {loadingUrls ? (
                  <div className="bg-muted rounded-lg p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      Chargement...
                    </p>
                  </div>
                ) : hasDocument && url ? (
                  isImage(url) ? (
                    <img
                      src={url}
                      alt={doc.label}
                      className="w-full h-64 object-contain rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => window.open(url, "_blank")}
                      onError={(e) => {
                        console.error('Erreur chargement image:', doc.key);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : isPDF(url) ? (
                    <div className="bg-muted rounded-lg p-6 text-center">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground mb-3">
                        Document PDF - Cliquez pour ouvrir
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(url, '_blank')}
                      >
                        Ouvrir le PDF
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-muted rounded-lg p-6 text-center">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground mb-3">
                        Document disponible
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(url, '_blank')}
                      >
                        Ouvrir le document
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="bg-muted rounded-lg p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      Document non fourni
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center pt-4 mt-4 border-t">
          <div>
            <Badge variant="outline" className="mr-2">
              {REQUIRED_DOCUMENTS.filter(doc => getDocumentUrl(doc.key)).length} / {REQUIRED_DOCUMENTS.length} documents fournis
            </Badge>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentViewer;
