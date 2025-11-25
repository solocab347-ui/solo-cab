import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Download, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import logo from "@/assets/logo-solocab.png";

interface DriverProspectionFlyerProps {
  qrCode: any;
  driverProfile: any;
}

const DriverProspectionFlyer = ({ qrCode, driverProfile }: DriverProspectionFlyerProps) => {
  const [companyName, setCompanyName] = useState(driverProfile?.driver?.company_name || "");
  const [presentation, setPresentation] = useState(
    `Service VTC de qualité professionnelle

• Ponctualité garantie
• Véhicule premium
• Chauffeur expérimenté
• Disponible 24/7

Scannez le QR code pour réserver`
  );
  const [showPreview, setShowPreview] = useState(false);

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

      positions.forEach((pos) => {
        const centerX = pos.x + a6Width / 2;
        
        // Bordure élégante
        pdf.setDrawColor(30, 58, 95);
        pdf.setLineWidth(0.5);
        pdf.rect(pos.x + 3, pos.y + 3, a6Width - 6, a6Height - 6);

        let currentY = pos.y + 12;

        // Logo SoloCab (image)
        const logoWidth = 35;
        const logoHeight = 12;
        const logoX = centerX - (logoWidth / 2);
        pdf.addImage(logo, "PNG", logoX, currentY, logoWidth, logoHeight);
        currentY += logoHeight + 6;

        // Nom de l'entreprise (si renseigné)
        if (companyName.trim()) {
          pdf.setFontSize(12);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(0, 0, 0);
          pdf.text(companyName, centerX, currentY, { 
            align: "center",
            maxWidth: a6Width - 10
          });
          currentY += 8;
        }

        // Titre "Votre chauffeur VTC de proximité"
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(60, 60, 60);
        pdf.text("Votre chauffeur VTC de proximité", centerX, currentY, { align: "center" });
        currentY += 12;

        // QR Code centré
        const qrSize = 55;
        const qrX = centerX - (qrSize / 2);
        pdf.addImage(qrCode.qr_code_image, "PNG", qrX, currentY, qrSize, qrSize);
        currentY += qrSize + 10;

        // Texte de présentation
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(60, 60, 60);
        
        const lines = presentation.split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
          if (currentY < pos.y + a6Height - 8) {
            pdf.text(line, centerX, currentY, { 
              align: "center",
              maxWidth: a6Width - 12
            });
            currentY += 4.5;
          }
        });
      });

      // Télécharger le PDF
      const fileName = `Flyers-SoloCab-${companyName.replace(/\s+/g, '-') || 'VTC'}.pdf`;
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
      <Card className="p-6 bg-gradient-to-br from-[#1e3a5f]/5 to-[#1e3a5f]/10 border-[#1e3a5f]/20">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2 text-[#1e3a5f]">Générateur de Flyers Professionnels</h2>
          <p className="text-muted-foreground">
            Créez un document A4 avec 4 flyers A6 identiques pour promouvoir vos services VTC
          </p>
        </div>

        <div className="space-y-6">
          {/* Nom de l'entreprise */}
          <div className="space-y-2">
            <Label htmlFor="companyName" className="text-sm font-semibold">
              Nom de l'entreprise (optionnel)
            </Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ex: VTC Premium Paris"
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">
              Si renseigné, le nom de votre entreprise apparaîtra sur le flyer
            </p>
          </div>

          {/* Texte de présentation */}
          <div className="space-y-2">
            <Label htmlFor="presentation" className="text-sm font-semibold">
              Texte de présentation
            </Label>
            <Textarea
              id="presentation"
              value={presentation}
              onChange={(e) => setPresentation(e.target.value)}
              rows={7}
              placeholder="Personnalisez votre message..."
              className="bg-background font-sans text-sm"
            />
            <p className="text-xs text-muted-foreground">
              💡 Conseil: Restez concis, 5-6 lignes maximum pour un rendu optimal
            </p>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => setShowPreview(!showPreview)}
              variant="outline"
              className="flex-1 border-[#1e3a5f]/20 hover:bg-[#1e3a5f]/5"
            >
              {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showPreview ? "Masquer l'aperçu" : "Voir l'aperçu"}
            </Button>
            <Button
              onClick={generatePDF}
              className="flex-1 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger le PDF
            </Button>
          </div>
        </div>
      </Card>

      {/* Aperçu professionnel */}
      {showPreview && (
        <Card className="p-6 bg-background border-[#1e3a5f]/20">
          <h3 className="font-bold mb-4 text-lg text-[#1e3a5f]">Aperçu du document (Format A4 avec 4 × A6)</h3>
          <div 
            className="bg-white border-2 border-[#1e3a5f]/20 rounded-lg shadow-lg mx-auto"
            style={{
              width: "100%",
              maxWidth: "210mm",
              aspectRatio: "210/297"
            }}
          >
            <div className="grid grid-cols-2 gap-0 h-full">
              {[0, 1, 2, 3].map((index) => (
                <div 
                  key={index}
                  className="border border-[#1e3a5f]/30 p-3 flex flex-col items-center justify-start"
                  style={{ aspectRatio: "105/148.5" }}
                >
                  <div className="flex flex-col items-center justify-start w-full h-full space-y-2 pt-2">
                    {/* Logo SoloCab */}
                    <div className="flex justify-center">
                      <img 
                        src={logo} 
                        alt="SoloCab" 
                        className="h-6 md:h-8 w-auto object-contain"
                      />
                    </div>

                    {/* Nom de l'entreprise si renseigné */}
                    {companyName.trim() && (
                      <div className="text-center px-2">
                        <div className="text-xs md:text-sm font-bold text-gray-900 line-clamp-2">
                          {companyName}
                        </div>
                      </div>
                    )}

                    {/* Titre */}
                    <div className="text-center">
                      <div className="text-[10px] md:text-xs text-gray-600">
                        Votre chauffeur VTC de proximité
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="flex-shrink-0 my-2">
                      <img 
                        src={qrCode.qr_code_image} 
                        alt="QR Code" 
                        className="w-20 h-20 md:w-24 md:h-24"
                      />
                    </div>

                    {/* Texte de présentation */}
                    <div className="text-center px-2 flex-1">
                      <div className="text-[8px] md:text-[10px] whitespace-pre-wrap text-gray-700 leading-snug">
                        {presentation}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 p-4 bg-[#1e3a5f]/5 rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              💡 <strong>Astuce d'impression :</strong> Imprimez ce document en A4, puis découpez les 4 flyers pour les distribuer à vos clients potentiels
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default DriverProspectionFlyer;
