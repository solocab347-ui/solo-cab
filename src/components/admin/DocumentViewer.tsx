import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DocumentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: any;
}

const REQUIRED_DOCUMENTS = [
  { key: "kbis", label: "Kbis" },
  { key: "carte_grise", label: "Carte grise" },
  { key: "assurance", label: "Assurance" },
  { key: "carte_pro_vtc", label: "Carte pro VTC" },
  { key: "attestation_urssaf", label: "Attestation URSSAF" },
  { key: "carte_identite_recto", label: "Carte identité recto" },
  { key: "carte_identite_verso", label: "Carte identité verso / Passeport" },
  { key: "permis_conduire", label: "Permis de conduire" },
];

const DocumentViewer = ({ open, onOpenChange, driver }: DocumentViewerProps) => {
  if (!driver) return null;

  const documents = driver.documents || {};

  const downloadDocument = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDocumentUrl = (key: string): string | null => {
    if (typeof documents !== 'object') return null;
    return documents[key] || null;
  };

  const isImage = (url: string) => {
    return url && (
      url.includes('.jpg') || 
      url.includes('.jpeg') || 
      url.includes('.png') || 
      url.includes('.webp') ||
      url.includes('.gif')
    );
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
                      onClick={() => downloadDocument(url, `${doc.label}`)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {hasDocument && url ? (
                  isImage(url) ? (
                    <img
                      src={url}
                      alt={doc.label}
                      className="w-full h-64 object-contain rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => window.open(url, "_blank")}
                    />
                  ) : (
                    <div className="bg-muted rounded-lg p-6 text-center">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground mb-3">
                        Prévisualisation PDF non disponible
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
