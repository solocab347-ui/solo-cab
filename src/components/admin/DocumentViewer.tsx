import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, FileText, ExternalLink, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";

interface DocumentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: any;
}

interface DocumentDef {
  key: string;
  label: string;
  legacyKey?: string;
  optional?: boolean;
}

interface DocumentGroup {
  groupLabel: string;
  documents: DocumentDef[];
}

// Document configuration with recto/verso support
const DOCUMENT_GROUPS: DocumentGroup[] = [
  { 
    groupLabel: "Carte professionnelle VTC",
    documents: [
      { key: "vtc_card_recto", label: "Recto", legacyKey: "vtc_recto" },
      { key: "vtc_card_verso", label: "Verso", legacyKey: "vtc_verso" },
    ]
  },
  { 
    groupLabel: "Permis de conduire",
    documents: [
      { key: "driving_license_recto", label: "Recto" },
      { key: "driving_license_verso", label: "Verso" },
    ]
  },
  { 
    groupLabel: "Pièce d'identité (CNI ou Passeport)",
    documents: [
      { key: "id_card_recto", label: "Recto", legacyKey: "identity_recto" },
      { key: "id_card_verso", label: "Verso (optionnel si passeport)", legacyKey: "identity_verso", optional: true },
    ]
  },
  { 
    groupLabel: "Carte grise du véhicule",
    documents: [
      { key: "vehicle_registration", label: "Carte grise", legacyKey: "registration" },
    ]
  },
  { 
    groupLabel: "Attestation d'assurance RC Pro VTC",
    documents: [
      { key: "insurance", label: "RC Pro", legacyKey: "vehicle_insurance" },
    ]
  },
  { 
    groupLabel: "Attestation d'assurance RC Circulation",
    documents: [
      { key: "insurance_circulation", label: "RC Circulation" },
    ]
  },
  { 
    groupLabel: "Extrait Kbis ou INSEE",
    documents: [
      { key: "kbis", label: "Kbis/INSEE" },
    ]
  },
];

// Helper to extract the best path from document data (prefers storagePath over url)
const extractDocumentUrl = (docData: any): string | null => {
  if (!docData) return null;
  
  // New format: { storagePath, url, name, uploadedAt }
  if (typeof docData === 'object') {
    // Prefer storagePath (clean file path, never expires)
    if (docData.storagePath) return docData.storagePath;
    if (docData.url) return docData.url;
  }
  
  // Old format: direct URL string
  if (typeof docData === 'string') {
    return docData;
  }
  
  return null;
};

const DocumentViewer = ({ open, onOpenChange, driver }: DocumentViewerProps) => {
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState(false);

  const documents = driver?.documents || {};

  // Get document URL (checks both new key and legacy key)
  const getDocumentData = (key: string, legacyKey?: string): string | null => {
    // Try new key first
    let url = extractDocumentUrl(documents[key]);
    
    // Try legacy key if new key not found
    if (!url && legacyKey) {
      url = extractDocumentUrl(documents[legacyKey]);
    }
    
    return url;
  };

  // Generate signed URLs for all documents on open
  useEffect(() => {
    const generateSignedUrls = async () => {
      if (!open || !driver.id) return;
      
      setLoadingUrls(true);
      const urls: Record<string, string> = {};

      try {
        // Collect all document keys and their URLs
        const allDocs: { key: string; url: string }[] = [];
        
        DOCUMENT_GROUPS.forEach(group => {
          group.documents.forEach(doc => {
            const url = getDocumentData(doc.key, doc.legacyKey);
            if (url) {
              allDocs.push({ key: doc.key, url });
            }
          });
        });

        for (const { key, url } of allDocs) {
          if (!url) continue;

          // If it's already a public URL, use it directly
          if (url.includes('/storage/v1/object/public/')) {
            urls[key] = url;
            continue;
          }

          // Extract file path from URL
          let filePath = url;
          
          if (url.includes('/storage/v1/object/')) {
            const parts = url.split('/storage/v1/object/');
            if (parts[1]) {
              filePath = parts[1].replace(/^(public|sign)\//, '');
              filePath = filePath.replace(/^[^/]+\//, '');
            }
          }

          // Generate signed URL
          const { data, error } = await supabase.storage
            .from('driver-documents')
            .createSignedUrl(filePath, 3600);

          if (data?.signedUrl) {
            urls[key] = data.signedUrl;
          } else if (error) {
            // Fallback to public URL if signing fails
            urls[key] = url;
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
  }, [open, driver.id]);

  const downloadDocument = async (key: string, name: string) => {
    const signedUrl = signedUrls[key];
    
    if (!signedUrl) {
      toast.error('Document non disponible');
      return;
    }

    try {
      const response = await fetch(signedUrl);
      if (!response.ok) throw new Error('Erreur téléchargement');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Document téléchargé');
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const getFinalUrl = (key: string, legacyKey?: string): string | null => {
    // Check signed URL cache first
    if (signedUrls[key]) return signedUrls[key];
    
    // Get raw URL
    return getDocumentData(key, legacyKey);
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

  // Count total and uploaded documents
  const totalDocs = DOCUMENT_GROUPS.flatMap(g => g.documents).filter(d => !d.optional).length;
  const uploadedDocs = DOCUMENT_GROUPS.flatMap(g => g.documents).filter(doc => {
    const url = getDocumentData(doc.key, doc.legacyKey);
    return !!url;
  }).length;

  if (!driver) {
    return null;
  }

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

        <div className="space-y-6 mt-4">
          {DOCUMENT_GROUPS.map((group) => {
            const groupHasAllDocs = group.documents.every(doc => 
              doc.optional || getDocumentData(doc.key, doc.legacyKey)
            );
            
            return (
              <div
                key={group.groupLabel}
                className={`border rounded-lg p-4 ${
                  groupHasAllDocs 
                    ? "border-green-500/50 bg-green-500/5" 
                    : "border-red-500/50 bg-red-500/5"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    <h3 className="font-semibold">{group.groupLabel}</h3>
                  </div>
                  <Badge 
                    variant={groupHasAllDocs ? "default" : "destructive"}
                  >
                    {groupHasAllDocs ? "Complet" : "Incomplet"}
                  </Badge>
                </div>

                <div className={`grid gap-4 ${group.documents.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                  {group.documents.map((doc) => {
                    const url = getFinalUrl(doc.key, doc.legacyKey);
                    const hasDocument = !!url;

                    return (
                      <div
                        key={doc.key}
                        className={`border rounded-lg p-3 ${
                          hasDocument 
                            ? "border-green-500/30 bg-green-500/5" 
                            : doc.optional 
                              ? "border-muted bg-muted/30"
                              : "border-red-500/30 bg-red-500/5"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{doc.label}</span>
                            {doc.optional && (
                              <Badge variant="outline" className="text-xs">Optionnel</Badge>
                            )}
                          </div>
                          {hasDocument && url && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => window.open(url, '_blank')}
                                disabled={loadingUrls}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => downloadDocument(doc.key, `${group.groupLabel}_${doc.label}`)}
                                disabled={loadingUrls}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {loadingUrls ? (
                          <div className="bg-muted rounded-lg p-4 text-center">
                            <p className="text-sm text-muted-foreground">
                              Chargement...
                            </p>
                          </div>
                        ) : hasDocument && url ? (
                          isImage(url) ? (
                            <img
                              src={url}
                              alt={doc.label}
                              className="w-full h-40 object-contain rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(url, "_blank")}
                              onError={(e) => {
                                console.error('Erreur chargement image:', doc.key);
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : isPDF(url) ? (
                            <div className="space-y-2">
                              <iframe
                                src={`${url}#toolbar=1`}
                                className="w-full h-48 rounded-lg border border-border"
                                title={doc.label}
                              />
                              <div className="flex gap-2 justify-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => downloadDocument(doc.key, `${group.groupLabel}_${doc.label}.pdf`)}
                                >
                                  <Download className="w-4 h-4 mr-1" />
                                  Télécharger
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(url, '_blank')}
                                >
                                  <ExternalLink className="w-4 h-4 mr-1" />
                                  Nouvel onglet
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-muted rounded-lg p-4 text-center">
                              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(url, '_blank')}
                              >
                                Ouvrir
                              </Button>
                            </div>
                          )
                        ) : (
                          <div className="bg-muted rounded-lg p-4 text-center">
                            <p className="text-sm text-muted-foreground">
                              {doc.optional ? "Non fourni (optionnel)" : "Document non fourni"}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center pt-4 mt-4 border-t">
          <div>
            <Badge variant="outline" className="mr-2">
              {uploadedDocs} / {totalDocs} documents fournis
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
