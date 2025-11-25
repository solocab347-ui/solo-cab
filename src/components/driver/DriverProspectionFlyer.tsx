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
  const [flyersPerPage, setFlyersPerPage] = useState<1 | 2 | 4>(4);
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
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      // Calcul des dimensions selon le nombre de flyers
      let flyerWidth: number, flyerHeight: number;
      let positions: { x: number; y: number }[];

      if (flyersPerPage === 1) {
        // 1 flyer = format A4 complet
        flyerWidth = 210;
        flyerHeight = 297;
        positions = [{ x: 0, y: 0 }];
      } else if (flyersPerPage === 2) {
        // 2 flyers = format A5 (A4 coupé en 2 horizontalement)
        flyerWidth = 210;
        flyerHeight = 148.5;
        positions = [
          { x: 0, y: 0 },
          { x: 0, y: 148.5 }
        ];
      } else {
        // 4 flyers = format A6 (A4 coupé en 4)
        flyerWidth = 105;
        flyerHeight = 148.5;
        positions = [
          { x: 0, y: 0 },
          { x: 105, y: 0 },
          { x: 0, y: 148.5 },
          { x: 105, y: 148.5 }
        ];
      }

      positions.forEach((pos) => {
        const centerX = pos.x + flyerWidth / 2;
        
        // Bordure élégante
        pdf.setDrawColor(30, 58, 95);
        pdf.setLineWidth(0.5);
        pdf.rect(pos.x + 3, pos.y + 3, flyerWidth - 6, flyerHeight - 6);

        // Ajuster les tailles selon le format
        const scale = flyersPerPage === 1 ? 2 : flyersPerPage === 2 ? 1.5 : 1;
        let currentY = pos.y + (15 * scale);

        // Logo SoloCab
        const logoWidth = 35 * scale;
        const logoHeight = 12 * scale;
        const logoX = centerX - (logoWidth / 2);
        pdf.addImage(logo, "PNG", logoX, currentY, logoWidth, logoHeight);
        currentY += logoHeight + (6 * scale);

        // Nom de l'entreprise
        if (companyName.trim()) {
          pdf.setFontSize(12 * scale);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(0, 0, 0);
          pdf.text(companyName, centerX, currentY, { 
            align: "center",
            maxWidth: flyerWidth - 10
          });
          currentY += (8 * scale);
        }

        // Titre
        pdf.setFontSize(11 * scale);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(60, 60, 60);
        pdf.text("Votre chauffeur VTC de proximité", centerX, currentY, { align: "center" });
        currentY += (12 * scale);

        // QR Code
        const qrSize = 55 * scale;
        const qrX = centerX - (qrSize / 2);
        pdf.addImage(qrCode.qr_code_image, "PNG", qrX, currentY, qrSize, qrSize);
        currentY += qrSize + (10 * scale);

        // Texte de présentation
        pdf.setFontSize(8 * scale);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(60, 60, 60);
        
        const lines = presentation.split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
          if (currentY < pos.y + flyerHeight - (8 * scale)) {
            pdf.text(line, centerX, currentY, { 
              align: "center",
              maxWidth: flyerWidth - 12
            });
            currentY += (4.5 * scale);
          }
        });
      });

      const fileName = `Flyers-SoloCab-${flyersPerPage}x-${companyName.replace(/\s+/g, '-') || 'VTC'}.pdf`;
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
          {/* Nombre de flyers par page */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Nombre de flyers par page
            </Label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                type="button"
                variant={flyersPerPage === 1 ? "default" : "outline"}
                onClick={() => setFlyersPerPage(1)}
                className={flyersPerPage === 1 ? "bg-[#1e3a5f] text-white" : "border-[#1e3a5f]/20"}
              >
                1 flyer
                <span className="text-xs ml-1">(A4)</span>
              </Button>
              <Button
                type="button"
                variant={flyersPerPage === 2 ? "default" : "outline"}
                onClick={() => setFlyersPerPage(2)}
                className={flyersPerPage === 2 ? "bg-[#1e3a5f] text-white" : "border-[#1e3a5f]/20"}
              >
                2 flyers
                <span className="text-xs ml-1">(A5)</span>
              </Button>
              <Button
                type="button"
                variant={flyersPerPage === 4 ? "default" : "outline"}
                onClick={() => setFlyersPerPage(4)}
                className={flyersPerPage === 4 ? "bg-[#1e3a5f] text-white" : "border-[#1e3a5f]/20"}
              >
                4 flyers
                <span className="text-xs ml-1">(A6)</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Choisissez le nombre de flyers à imprimer sur une page A4
            </p>
          </div>

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
          <h3 className="font-bold mb-4 text-lg text-[#1e3a5f]">
            Aperçu du document ({flyersPerPage === 1 ? "1 flyer A4" : flyersPerPage === 2 ? "2 flyers A5" : "4 flyers A6"})
          </h3>
          <div 
            className="bg-white border-2 border-[#1e3a5f]/20 rounded-lg shadow-lg mx-auto overflow-hidden"
            style={{
              width: "100%",
              maxWidth: "210mm",
              aspectRatio: "210/297"
            }}
          >
            <div 
              className="h-full"
              style={{
                display: "grid",
                gridTemplateColumns: flyersPerPage === 1 ? "1fr" : flyersPerPage === 2 ? "1fr" : "1fr 1fr",
                gridTemplateRows: flyersPerPage === 1 ? "1fr" : flyersPerPage === 2 ? "1fr 1fr" : "1fr 1fr"
              }}
            >
              {Array.from({ length: flyersPerPage }).map((_, index) => (
                <div 
                  key={index}
                  className="border border-[#1e3a5f]/30 flex flex-col items-center justify-start overflow-hidden"
                  style={{
                    padding: flyersPerPage === 1 ? "2rem" : flyersPerPage === 2 ? "1.5rem" : "0.75rem"
                  }}
                >
                  <div className="flex flex-col items-center justify-start w-full h-full space-y-1">
                    {/* Logo SoloCab */}
                    <div className="flex justify-center flex-shrink-0">
                      <img 
                        src={logo} 
                        alt="SoloCab" 
                        style={{
                          height: flyersPerPage === 1 ? "3rem" : flyersPerPage === 2 ? "2rem" : "1.5rem",
                          width: "auto",
                          objectFit: "contain"
                        }}
                      />
                    </div>

                    {/* Nom de l'entreprise */}
                    {companyName.trim() && (
                      <div className="text-center px-2 flex-shrink-0">
                        <div 
                          className="font-bold text-gray-900 line-clamp-2"
                          style={{
                            fontSize: flyersPerPage === 1 ? "1rem" : flyersPerPage === 2 ? "0.875rem" : "0.75rem"
                          }}
                        >
                          {companyName}
                        </div>
                      </div>
                    )}

                    {/* Titre */}
                    <div className="text-center flex-shrink-0">
                      <div 
                        className="text-gray-600"
                        style={{
                          fontSize: flyersPerPage === 1 ? "0.875rem" : flyersPerPage === 2 ? "0.75rem" : "0.625rem"
                        }}
                      >
                        Votre chauffeur VTC de proximité
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="flex-shrink-0 my-2">
                      <img 
                        src={qrCode.qr_code_image} 
                        alt="QR Code"
                        style={{
                          width: flyersPerPage === 1 ? "8rem" : flyersPerPage === 2 ? "6rem" : "5rem",
                          height: flyersPerPage === 1 ? "8rem" : flyersPerPage === 2 ? "6rem" : "5rem"
                        }}
                      />
                    </div>

                    {/* Texte de présentation */}
                    <div className="text-center px-2 flex-1 overflow-hidden">
                      <div 
                        className="whitespace-pre-wrap text-gray-700 leading-tight"
                        style={{
                          fontSize: flyersPerPage === 1 ? "0.875rem" : flyersPerPage === 2 ? "0.75rem" : "0.625rem"
                        }}
                      >
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
              💡 <strong>Astuce d'impression :</strong> {flyersPerPage === 1 
                ? "Imprimez ce document en A4 pour obtenir un flyer grand format" 
                : flyersPerPage === 2
                  ? "Imprimez ce document en A4, puis découpez en 2 pour obtenir 2 flyers A5"
                  : "Imprimez ce document en A4, puis découpez en 4 pour obtenir 4 flyers A6"}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default DriverProspectionFlyer;
