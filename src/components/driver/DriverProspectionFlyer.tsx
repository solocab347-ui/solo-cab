import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Download, Eye } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

interface DriverProspectionFlyerProps {
  qrCode: any;
  driverProfile: any;
}

const DriverProspectionFlyer = ({ qrCode, driverProfile }: DriverProspectionFlyerProps) => {
  const [presentation, setPresentation] = useState(
    `🚗 ${driverProfile?.full_name || 'Chauffeur VTC Professionnel'}

📞 Réservez dès maintenant !
✨ Service de qualité
🎯 Ponctualité garantie
💼 Véhicule premium

Scannez le QR code pour réserver facilement !`
  );
  const [showPreview, setShowPreview] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const generatePDF = () => {
    if (!qrCode?.qr_code_image) {
      toast.error("QR Code non disponible");
      return;
    }

    try {
      // Format A4 en mm: 210 x 297
      // Format A6 en mm: 105 x 148.5 (1/4 d'un A4)
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const a6Width = 105;
      const a6Height = 148.5;
      
      // Positions des 4 cartes A6 sur la page A4
      const positions = [
        { x: 0, y: 0 },           // Haut gauche
        { x: a6Width, y: 0 },     // Haut droite
        { x: 0, y: a6Height },    // Bas gauche
        { x: a6Width, y: a6Height } // Bas droite
      ];

      positions.forEach((pos, index) => {
        // Bordure de la carte
        pdf.setDrawColor(200, 200, 200);
        pdf.rect(pos.x + 2, pos.y + 2, a6Width - 4, a6Height - 4);

        // Logo SoloCab (si disponible)
        pdf.setFontSize(20);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(30, 58, 95); // Couleur SoloCab
        pdf.text("SoloCab", pos.x + a6Width / 2, pos.y + 15, { align: "center" });

        // Nom du chauffeur
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(0, 0, 0);
        const driverName = driverProfile?.full_name || "Chauffeur VTC";
        pdf.text(driverName, pos.x + a6Width / 2, pos.y + 25, { align: "center" });

        // QR Code centré
        const qrSize = 60;
        const qrX = pos.x + (a6Width - qrSize) / 2;
        const qrY = pos.y + 35;
        pdf.addImage(qrCode.qr_code_image, "PNG", qrX, qrY, qrSize, qrSize);

        // Texte de présentation
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(60, 60, 60);
        
        const lines = presentation.split('\n').filter(line => line.trim());
        let textY = qrY + qrSize + 8;
        
        lines.forEach(line => {
          if (textY < pos.y + a6Height - 5) {
            pdf.text(line, pos.x + a6Width / 2, textY, { 
              align: "center",
              maxWidth: a6Width - 10
            });
            textY += 5;
          }
        });
      });

      // Télécharger le PDF
      const fileName = `Flyers-SoloCab-${driverProfile?.full_name?.replace(/\s+/g, '-') || 'Driver'}.pdf`;
      pdf.save(fileName);
      toast.success("PDF généré avec succès !");
    } catch (error) {
      console.error("Erreur génération PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  if (!qrCode?.qr_code_image) {
    return (
      <Card className="p-8 text-center">
        <h3 className="text-xl font-bold mb-2">QR Code requis</h3>
        <p className="text-muted-foreground">
          Votre QR code doit être généré avant de créer des flyers de prospection.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10">
        <h2 className="text-2xl font-bold mb-2">Générateur de Flyers de Prospection</h2>
        <p className="text-muted-foreground mb-6">
          Créez un document A4 avec 4 flyers A6 identiques pour promouvoir vos services
        </p>

        <div className="space-y-4">
          <div>
            <Label htmlFor="presentation">Texte de présentation</Label>
            <Textarea
              id="presentation"
              value={presentation}
              onChange={(e) => setPresentation(e.target.value)}
              rows={8}
              placeholder="Personnalisez votre message..."
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Conseil: Restez concis, 4-5 lignes maximum pour un meilleur rendu
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setShowPreview(!showPreview)}
              variant="outline"
              className="flex-1"
            >
              <Eye className="w-4 h-4 mr-2" />
              {showPreview ? "Masquer" : "Voir"} l'aperçu
            </Button>
            <Button
              onClick={generatePDF}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger le PDF
            </Button>
          </div>
        </div>
      </Card>

      {/* Aperçu */}
      {showPreview && (
        <Card className="p-6 bg-background">
          <h3 className="font-bold mb-4 text-lg">Aperçu du flyer (Format A4 avec 4 × A6)</h3>
          <div 
            ref={previewRef}
            className="bg-white border-2 border-dashed border-border rounded-lg"
            style={{
              width: "100%",
              maxWidth: "794px", // A4 width in pixels at 96 DPI
              aspectRatio: "210/297",
              margin: "0 auto"
            }}
          >
            <div className="grid grid-cols-2 gap-0 h-full">
              {[0, 1, 2, 3].map((index) => (
                <div 
                  key={index}
                  className="border border-gray-300 p-4 flex flex-col items-center justify-between"
                  style={{ aspectRatio: "105/148.5" }}
                >
                  {/* Header */}
                  <div className="text-center space-y-2">
                    <div className="text-xl font-bold text-[#1e3a5f]">SoloCab</div>
                    <div className="text-sm font-semibold">
                      {driverProfile?.full_name || "Chauffeur VTC"}
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="flex-shrink-0 bg-white p-2 rounded-lg shadow-sm">
                    <img 
                      src={qrCode.qr_code_image} 
                      alt="QR Code" 
                      className="w-24 h-24 md:w-32 md:h-32"
                    />
                  </div>

                  {/* Présentation */}
                  <div className="text-center">
                    <pre className="text-[8px] md:text-xs whitespace-pre-wrap font-sans text-gray-700 leading-tight">
                      {presentation}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">
            💡 Imprimez ce document et découpez les 4 flyers pour les distribuer à vos clients
          </p>
        </Card>
      )}
    </div>
  );
};

export default DriverProspectionFlyer;
