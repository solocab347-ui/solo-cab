import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DocumentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: any;
}

const DocumentViewer = ({ open, onOpenChange, driver }: DocumentViewerProps) => {
  if (!driver || !driver.documents) return null;

  const documents = driver.documents;
  const documentLabels: { [key: string]: string } = {
    id_recto: "Pièce d'identité - Recto",
    id_verso: "Pièce d'identité - Verso",
    vtc_recto: "Carte VTC - Recto",
    vtc_verso: "Carte VTC - Verso",
    carte_grise: "Carte grise",
    assurance: "Attestation d'assurance",
  };

  const downloadDocument = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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

        <div className="space-y-6 mt-4">
          {Object.entries(documents).map(([key, url]) => {
            if (!url) return null;
            
            const isImage = typeof url === 'string' && (
              url.includes('.jpg') || 
              url.includes('.jpeg') || 
              url.includes('.png') || 
              url.includes('.webp')
            );

            return (
              <div key={key} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {documentLabels[key] || key}
                    </h3>
                    <Badge variant="outline" className="mt-1">
                      {isImage ? "Image" : "PDF"}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadDocument(url as string, `${documentLabels[key]}.${isImage ? 'jpg' : 'pdf'}`)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger
                  </Button>
                </div>

                {isImage ? (
                  <img
                    src={url as string}
                    alt={documentLabels[key]}
                    className="w-full rounded-lg border border-border"
                  />
                ) : (
                  <div className="bg-muted rounded-lg p-8 text-center">
                    <p className="text-muted-foreground mb-4">
                      Prévisualisation PDF non disponible
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => window.open(url as string, '_blank')}
                    >
                      Ouvrir dans un nouvel onglet
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {Object.keys(documents).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Aucun document disponible
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentViewer;
