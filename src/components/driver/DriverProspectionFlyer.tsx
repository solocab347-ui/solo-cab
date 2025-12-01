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
  const [phone, setPhone] = useState(driverProfile?.phone || "");
  const [email, setEmail] = useState(driverProfile?.email || "");

  const generatePDF = () => {
    if (!qrCode?.qr_code_image) {
      toast.error("QR Code non disponible");
      return;
    }

    try {
      let pdf: jsPDF;
      let flyerWidth: number, flyerHeight: number;
      let positions: { x: number; y: number }[];

      if (flyersPerPage === 1) {
        // 1 flyer = format A4 complet (portrait)
        pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4"
        });
        flyerWidth = 210;
        flyerHeight = 297;
        positions = [{ x: 0, y: 0 }];
      } else if (flyersPerPage === 2) {
        // 2 flyers A5 verticaux sur une page A4 en paysage
        pdf = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: "a4"
        });
        flyerWidth = 148.5;
        flyerHeight = 210;
        positions = [
          { x: 0, y: 0 },
          { x: 148.5, y: 0 }
        ];
      } else {
        // 4 flyers = format A6 (A4 coupé en 4)
        pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4"
        });
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
        const padding = 4;
        
        // Fond dégradé (simulé avec rectangles superposés)
        // Bleu marine en haut
        pdf.setFillColor(30, 58, 95);
        pdf.rect(pos.x, pos.y, flyerWidth, flyerHeight * 0.25, 'F');
        
        // Orange/Corail au milieu
        pdf.setFillColor(255, 107, 53);
        pdf.rect(pos.x, pos.y + flyerHeight * 0.25, flyerWidth, flyerHeight * 0.02, 'F');
        
        // Blanc pour le reste
        pdf.setFillColor(255, 255, 255);
        pdf.rect(pos.x, pos.y + flyerHeight * 0.27, flyerWidth, flyerHeight * 0.73, 'F');
        
        // Bordure élégante dorée
        pdf.setDrawColor(251, 191, 36);
        pdf.setLineWidth(1);
        pdf.rect(pos.x + padding, pos.y + padding, flyerWidth - (padding * 2), flyerHeight - (padding * 2));
        
        // Bordure intérieure bleu marine
        pdf.setDrawColor(30, 58, 95);
        pdf.setLineWidth(0.3);
        pdf.rect(pos.x + padding + 1, pos.y + padding + 1, flyerWidth - (padding * 2) - 2, flyerHeight - (padding * 2) - 2);

        // Ajuster les tailles selon le format
        const scale = flyersPerPage === 1 ? 1 : flyersPerPage === 2 ? 0.7 : 0.5;
        let currentY = pos.y + (18 * scale);

        // Nom de l'entreprise (en blanc sur fond bleu)
        if (companyName.trim()) {
          pdf.setFontSize(Math.round(20 * scale));
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(255, 255, 255);
          pdf.text(companyName, centerX, currentY, { 
            align: "center",
            maxWidth: flyerWidth - 16
          });
          currentY += (10 * scale);
        }

        // Titre (en blanc sur fond bleu) - SANS EMOJI
        pdf.setFontSize(Math.round(14 * scale));
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(255, 255, 255);
        pdf.text("VOTRE CHAUFFEUR VTC", centerX, currentY, { align: "center" });
        currentY += (8 * scale);
        
        pdf.setFontSize(Math.round(11 * scale));
        pdf.setFont("helvetica", "normal");
        pdf.text("DE PROXIMITE", centerX, currentY, { align: "center" });
        currentY += (20 * scale);

        // Zone blanche - QR Code avec fond vert clair
        const qrSize = Math.round(flyersPerPage === 1 ? 65 : flyersPerPage === 2 ? 50 : 45);
        const qrX = centerX - (qrSize / 2);
        const qrY = currentY;
        
        // Fond vert émeraude clair pour le QR
        pdf.setFillColor(209, 250, 229);
        const qrPadding = 4;
        pdf.roundedRect(qrX - qrPadding, qrY - qrPadding, qrSize + (qrPadding * 2), qrSize + (qrPadding * 2), 3, 3, 'F');
        
        pdf.addImage(qrCode.qr_code_image, "PNG", qrX, qrY, qrSize, qrSize);
        currentY += qrSize + (15 * scale);

        // Call to action en orange
        pdf.setFillColor(255, 107, 53);
        const ctaHeight = 8 * scale;
        pdf.roundedRect(pos.x + 10, currentY - (ctaHeight / 2), flyerWidth - 20, ctaHeight, 2, 2, 'F');
        
        pdf.setFontSize(Math.round(11 * scale));
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(255, 255, 255);
        pdf.text("SCANNEZ POUR RÉSERVER", centerX, currentY + (2 * scale), { align: "center" });
        currentY += (12 * scale);

        // Texte de présentation sur fond blanc - SERVICES OPTIMISÉS POUR REMPLIR L'ESPACE
        const lines = presentation.split('\n').filter(line => line.trim());
        const contactSectionHeight = (phone || email) ? (20 * scale) : 0;
        const availableHeight = (pos.y + flyerHeight) - currentY - contactSectionHeight - (8 * scale);
        
        // Séparer les services des autres lignes
        const serviceLines = lines.filter(line => line.includes('•'));
        const otherLines = lines.filter(line => !line.includes('•'));
        
        // Calculer l'espacement optimal pour les services
        const serviceTextHeight = 13 * scale; // Taille du texte des services
        const otherTextHeight = 11 * scale; // Taille du texte des autres lignes
        const totalTextHeight = (serviceLines.length * serviceTextHeight) + (otherLines.length * otherTextHeight);
        const totalSpacing = availableHeight - totalTextHeight;
        const spacingPerLine = Math.max(4 * scale, totalSpacing / (lines.length + 1));
        
        lines.forEach(line => {
          if (currentY < pos.y + flyerHeight - contactSectionHeight - (8 * scale)) {
            if (line.includes('•')) {
              // Services avec taille augmentée et centrage
              pdf.setFontSize(Math.round(13 * scale));
              pdf.setFont("helvetica", "bold");
              pdf.setTextColor(16, 185, 129); // Emerald
              const textWithoutBullet = line.replace('•', '').trim();
              const serviceText = `- ${textWithoutBullet}`;
              pdf.text(serviceText, centerX, currentY, { 
                align: "center",
                maxWidth: flyerWidth - 16
              });
              currentY += serviceTextHeight + spacingPerLine;
            } else {
              // Autres textes centrés
              pdf.setFontSize(Math.round(11 * scale));
              pdf.setFont("helvetica", "bold");
              pdf.setTextColor(60, 60, 60);
              pdf.text(line, centerX, currentY, { 
                align: "center",
                maxWidth: flyerWidth - 16
              });
              currentY += otherTextHeight + spacingPerLine;
            }
          }
        });

        // Section contact en bas avec fond bleu clair - SANS EMOJIS
        if (phone || email) {
          const contactY = pos.y + flyerHeight - (20 * scale);
          pdf.setFillColor(219, 234, 254);
          pdf.rect(pos.x + 8, contactY - 2, flyerWidth - 16, (16 * scale), 'F');
          
          pdf.setFontSize(Math.round(9 * scale));
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(30, 58, 95);
          let contactY2 = contactY + (3 * scale);
          
          if (phone) {
            pdf.text(phone, centerX, contactY2, { align: "center" });
            contactY2 += (6 * scale);
          }
          if (email) {
            pdf.text(email, centerX, contactY2, { align: "center" });
          }
        }
      });

      const formatName = flyersPerPage === 1 ? 'A4' : flyersPerPage === 2 ? '2x-A5' : '4x-A6';
      const fileName = `Flyers-SoloCab-${formatName}-${companyName.replace(/\s+/g, '-') || 'VTC'}.pdf`;
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
      <Card className="p-6 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 border-primary/20">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            Générateur de Flyers Professionnels
          </h2>
          <p className="text-muted-foreground">
            Créez des flyers attractifs et colorés pour promouvoir vos services VTC
          </p>
        </div>

        <div className="space-y-6">
          {/* Nombre de flyers par page */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Format de flyer
            </Label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                type="button"
                variant={flyersPerPage === 1 ? "default" : "outline"}
                onClick={() => setFlyersPerPage(1)}
                className={flyersPerPage === 1 ? "bg-gradient-to-r from-primary to-accent text-white" : "border-primary/20 hover:bg-primary/5"}
              >
                <span className="flex flex-col items-center">
                  <span>1 flyer</span>
                  <span className="text-xs opacity-80">(A4)</span>
                </span>
              </Button>
              <Button
                type="button"
                variant={flyersPerPage === 2 ? "default" : "outline"}
                onClick={() => setFlyersPerPage(2)}
                className={flyersPerPage === 2 ? "bg-gradient-to-r from-accent to-secondary text-white" : "border-accent/20 hover:bg-accent/5"}
              >
                <span className="flex flex-col items-center">
                  <span>2 flyers</span>
                  <span className="text-xs opacity-80">(A5 vertical)</span>
                </span>
              </Button>
              <Button
                type="button"
                variant={flyersPerPage === 4 ? "default" : "outline"}
                onClick={() => setFlyersPerPage(4)}
                className={flyersPerPage === 4 ? "bg-gradient-to-r from-secondary to-primary text-white" : "border-secondary/20 hover:bg-secondary/5"}
              >
                <span className="flex flex-col items-center">
                  <span>4 flyers</span>
                  <span className="text-xs opacity-80">(A6)</span>
                </span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {flyersPerPage === 1 && "Format A4 complet - Idéal pour affichage"}
              {flyersPerPage === 2 && "2 flyers A5 verticaux à découper - Parfait pour distribution"}
              {flyersPerPage === 4 && "4 petits flyers A6 à découper - Économique"}
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
              💡 Conseil: Utilisez des puces • pour les listes. Restez concis pour un rendu optimal
            </p>
          </div>

          {/* Coordonnées */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-semibold">
                Téléphone (optionnel)
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="06 12 34 56 78"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">
                Email (optionnel)
              </Label>
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@votrevtc.fr"
                className="bg-background"
              />
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => setShowPreview(!showPreview)}
              variant="outline"
              className="flex-1 border-primary/20 hover:bg-primary/5"
            >
              {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showPreview ? "Masquer l'aperçu" : "Voir l'aperçu"}
            </Button>
            <Button
              onClick={generatePDF}
              className="flex-1 bg-gradient-to-r from-primary via-accent to-secondary hover:opacity-90 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger le PDF
            </Button>
          </div>

          {/* Indicateur de scroll pour l'aperçu */}
          {showPreview && (
            <div className="mt-4 p-4 bg-orange-500 rounded-lg border-2 border-orange-600 flex items-center justify-center gap-2 animate-bounce shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <span className="text-base font-bold text-white">
                Faites défiler vers le bas pour voir l'aperçu complet
              </span>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          )}
        </div>
      </Card>

      {/* Aperçu professionnel avec couleurs */}
      {showPreview && (
        <Card className="p-6 bg-background border-primary/20">
          <h3 className="font-bold mb-4 text-lg bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            Aperçu du document - {flyersPerPage === 1 ? "1 flyer A4" : flyersPerPage === 2 ? "2 flyers A5 verticaux" : "4 flyers A6"}
          </h3>
          <div 
            className="bg-white border-2 border-primary/30 rounded-lg shadow-xl mx-auto"
            style={{
              width: "100%",
              maxWidth: flyersPerPage === 2 ? "800px" : "600px",
              aspectRatio: flyersPerPage === 2 ? "297/210" : "210/297",
              overflow: "hidden"
            }}
          >
            <div 
              className="w-full h-full"
              style={{
                display: "grid",
                gridTemplateColumns: flyersPerPage === 1 ? "1fr" : flyersPerPage === 2 ? "1fr 1fr" : "1fr 1fr",
                gridTemplateRows: flyersPerPage === 4 ? "1fr 1fr" : "1fr",
                gap: 0
              }}
            >
              {Array.from({ length: flyersPerPage }).map((_, index) => (
                <div 
                  key={index}
                  className="border-2 border-warning/40 flex flex-col bg-white relative overflow-hidden"
                  style={{
                    padding: "2%"
                  }}
                >
                  {/* Header bleu marine */}
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-br from-primary via-primary/90 to-accent" 
                    style={{ 
                      height: flyersPerPage === 1 ? "25%" : flyersPerPage === 2 ? "24%" : "22%"
                    }}
                  >
                    {/* Bande orange */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-accent via-warning to-secondary" 
                      style={{ height: "8%" }}
                    />
                  </div>

                  <div className="relative z-10 flex flex-col h-full">
                    {/* Nom de l'entreprise et titre sur fond bleu - SANS EMOJIS */}
                    <div className="flex flex-col items-center justify-center text-center"
                      style={{ 
                        height: flyersPerPage === 1 ? "23%" : flyersPerPage === 2 ? "22%" : "20%",
                        paddingTop: flyersPerPage === 1 ? "3%" : "2%"
                      }}
                    >
                      {companyName.trim() && (
                        <div 
                          className="font-bold text-white mb-1"
                          style={{
                            fontSize: flyersPerPage === 1 ? "clamp(0.8rem, 2.2vw, 1.3rem)" : flyersPerPage === 2 ? "clamp(0.6rem, 1.5vw, 0.9rem)" : "clamp(0.5rem, 1.2vw, 0.7rem)"
                          }}
                        >
                          {companyName}
                        </div>
                      )}
                      <div 
                        className="font-bold text-white"
                        style={{
                          fontSize: flyersPerPage === 1 ? "clamp(0.7rem, 1.8vw, 1.1rem)" : flyersPerPage === 2 ? "clamp(0.55rem, 1.3vw, 0.8rem)" : "clamp(0.45rem, 1vw, 0.65rem)"
                        }}
                      >
                        VOTRE CHAUFFEUR VTC
                      </div>
                      <div 
                        className="text-white/95"
                        style={{
                          fontSize: flyersPerPage === 1 ? "clamp(0.6rem, 1.5vw, 0.9rem)" : flyersPerPage === 2 ? "clamp(0.5rem, 1.1vw, 0.7rem)" : "clamp(0.4rem, 0.9vw, 0.6rem)"
                        }}
                      >
                        DE PROXIMITE
                      </div>
                    </div>

                    {/* Zone centrale - QR Code */}
                    <div className="flex-1 flex flex-col items-center justify-center py-2">
                      <div 
                        className="bg-gradient-to-br from-success/10 via-success/5 to-success/10 p-2 rounded-xl shadow-md border-2 border-success/30"
                        style={{
                          marginBottom: flyersPerPage === 1 ? "3%" : "2%"
                        }}
                      >
                        <img 
                          src={qrCode.qr_code_image} 
                          alt="QR Code"
                          className="object-contain"
                          style={{
                            width: flyersPerPage === 1 ? "clamp(90px, 22vw, 160px)" : flyersPerPage === 2 ? "clamp(70px, 16vw, 120px)" : "clamp(60px, 13vw, 95px)",
                            height: flyersPerPage === 1 ? "clamp(90px, 22vw, 160px)" : flyersPerPage === 2 ? "clamp(70px, 16vw, 120px)" : "clamp(60px, 13vw, 95px)"
                          }}
                        />
                      </div>

                      {/* Call to action en orange */}
                      <div className="bg-gradient-to-r from-warning via-accent to-warning text-white font-bold px-3 py-1 rounded-full shadow-lg"
                        style={{
                          fontSize: flyersPerPage === 1 ? "clamp(0.6rem, 1.4vw, 0.9rem)" : flyersPerPage === 2 ? "clamp(0.5rem, 1.1vw, 0.7rem)" : "clamp(0.4rem, 0.9vw, 0.6rem)"
                        }}
                      >
                        SCANNEZ POUR RESERVER
                      </div>

                      {/* Texte de présentation - SERVICES CENTRÉS ET AGRANDIS */}
                      <div className="text-center space-y-2 mt-3 px-2">
                        {presentation.split('\n').filter(line => line.trim()).map((line, i) => {
                          const isService = line.includes('•');
                          const text = line.replace('•', '').trim();
                          
                          return (
                            <div 
                              key={i} 
                              className={isService ? "text-success font-bold" : "text-foreground font-bold"}
                              style={{
                                fontSize: isService 
                                  ? (flyersPerPage === 1 ? "clamp(0.75rem, 1.8vw, 1.1rem)" : flyersPerPage === 2 ? "clamp(0.65rem, 1.5vw, 0.9rem)" : "clamp(0.55rem, 1.2vw, 0.75rem)")
                                  : (flyersPerPage === 1 ? "clamp(0.65rem, 1.5vw, 1rem)" : flyersPerPage === 2 ? "clamp(0.55rem, 1.3vw, 0.8rem)" : "clamp(0.5rem, 1.1vw, 0.7rem)")
                              }}
                            >
                              {isService && '- '}{text}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Section contact en bas - SANS EMOJIS */}
                    {(phone || email) && (
                      <div className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 rounded-lg p-1.5 mt-2 border border-primary/20 text-center"
                        style={{
                          fontSize: flyersPerPage === 1 ? "clamp(0.55rem, 1.2vw, 0.8rem)" : flyersPerPage === 2 ? "clamp(0.45rem, 1vw, 0.65rem)" : "clamp(0.4rem, 0.9vw, 0.55rem)"
                        }}
                      >
                        <div className="text-primary">
                          {phone && <div>{phone}</div>}
                          {email && <div>{email}</div>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 p-4 bg-gradient-to-r from-success/5 via-primary/5 to-accent/5 rounded-lg border border-primary/20">
            <p className="text-sm text-muted-foreground text-center">
              💡 <strong>Astuce d'impression :</strong> {
                flyersPerPage === 1 
                  ? "Imprimez ce document en A4 pour obtenir un flyer grand format" 
                  : flyersPerPage === 2 
                    ? "Imprimez ce document en A4 paysage, puis découpez en 2 pour obtenir 2 flyers A5 verticaux"
                    : "Imprimez ce document en A4, puis découpez en 4 pour obtenir 4 flyers A6"
              }
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default DriverProspectionFlyer;
