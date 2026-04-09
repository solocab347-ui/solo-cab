import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Download, Copy, Share2, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { NfcOrderStatus } from "./NfcOrderStatus";

interface QRCodeDisplayProps {
  qrCode: any;
  loadingQR: boolean;
  driverProfile: any;
}

const QRCodeDisplay = ({ qrCode, loadingQR, driverProfile }: QRCodeDisplayProps) => {
  const [copied, setCopied] = useState(false);
  
  const registrationLink = qrCode?.code 
    ? `https://solocab.fr/register-client-qr?qr=${qrCode.code}`
    : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(registrationLink);
    setCopied(true);
    toast.success("Lien copié !");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!qrCode?.qr_code_image) return;
    
    const link = document.createElement("a");
    link.href = qrCode.qr_code_image;
    link.download = `QRCode-SoloCab-${driverProfile?.driver?.company_name || 'Driver'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("QR Code téléchargé !");
  };

  const handleShareWhatsApp = () => {
    const message = encodeURIComponent(`Rejoignez-moi sur SoloCab ! Scannez ce QR code ou utilisez ce lien : ${registrationLink}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const handleShareSMS = () => {
    const message = encodeURIComponent(`Rejoignez-moi sur SoloCab ! ${registrationLink}`);
    window.location.href = `sms:?&body=${message}`;
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent("Rejoignez-moi sur SoloCab");
    const body = encodeURIComponent(`Bonjour,\n\nJe vous invite à rejoindre mon service de VTC sur SoloCab.\n\nVous pouvez vous inscrire en utilisant ce lien : ${registrationLink}\n\nÀ bientôt !`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleShareFacebook = () => {
    const url = encodeURIComponent(registrationLink);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  if (loadingQR) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Chargement du QR Code...</p>
      </Card>
    );
  }

  if (!qrCode) {
    return (
      <Card className="p-8 text-center">
        <QrCode className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">QR Code indisponible</h3>
        <p className="text-muted-foreground">
          Votre QR code sera généré automatiquement après validation de votre compte.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="p-4 sm:p-6 md:p-8 bg-gradient-premium" data-tutorial="qr-code">
        <div className="flex flex-col items-center gap-4 sm:gap-6 md:flex-row md:gap-8">
          <div className="flex-shrink-0">
            {qrCode.qr_code_image && (
              <div className="bg-white p-3 sm:p-4 rounded-lg shadow-elegant">
                <img 
                  src={qrCode.qr_code_image} 
                  alt="QR Code" 
                  className="w-40 h-40 sm:w-52 sm:h-52 md:w-64 md:h-64"
                />
              </div>
            )}
          </div>
          
          <div className="flex-1 text-center md:text-left w-full">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 text-premium-foreground">
              Votre QR Code Personnel
            </h3>
            <p className="text-sm sm:text-base text-premium-foreground/80 mb-3 sm:mb-4">
              Partagez ce QR code pour l'inscription de vos clients exclusifs en 30 secondes !
            </p>
            <div className="flex items-center justify-center md:justify-start gap-2 mb-4 sm:mb-6 flex-wrap">
              <Badge className="bg-premium-foreground text-premium text-xs">
                {qrCode.scans_count || 0} scans
              </Badge>
              <Badge variant="outline" className="bg-premium-foreground/10 text-premium-foreground border-premium-foreground/20 text-xs">
                Actif
              </Badge>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <Button
                onClick={handleDownloadQR}
                className="w-full bg-premium-foreground text-premium hover:bg-premium-foreground/90 text-sm sm:text-base"
              >
                <Download className="w-4 h-4 mr-2" />
                Télécharger (PNG)
              </Button>
              
              <div className="relative">
                <input
                  type="text"
                  value={registrationLink}
                  readOnly
                  className="w-full px-3 sm:px-4 py-2 pr-12 sm:pr-24 bg-premium-foreground/10 border border-premium-foreground/20 rounded-lg text-xs sm:text-sm text-premium-foreground truncate"
                />
                <Button
                  onClick={handleCopyLink}
                  size="sm"
                  variant="ghost"
                  className="absolute right-1 top-1 bg-premium-foreground text-premium hover:bg-premium-foreground/90 h-7 w-7 sm:h-8 sm:w-8 p-0"
                >
                  {copied ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : <Copy className="w-3 h-3 sm:w-4 sm:h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Share Buttons */}
      <Card className="p-4 sm:p-6" data-tutorial="share-button">
        <h4 className="font-bold text-base sm:text-lg mb-3 sm:mb-4 flex items-center gap-2">
          <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
          Partager votre QR Code
        </h4>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <Button
            onClick={handleShareWhatsApp}
            className="bg-[#25D366] hover:bg-[#20BA5A] text-white text-xs sm:text-sm h-9 sm:h-10"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            <span className="truncate">WhatsApp</span>
          </Button>
          
          <Button
            onClick={handleShareSMS}
            className="bg-info hover:bg-info/90 text-info-foreground text-xs sm:text-sm h-9 sm:h-10"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 11H7V9h2v2zm4 0h-2V9h2v2zm4 0h-2V9h2v2z"/>
            </svg>
            <span className="truncate">SMS</span>
          </Button>
          
          <Button
            onClick={handleShareEmail}
            className="bg-premium hover:bg-premium/90 text-premium-foreground text-xs sm:text-sm h-9 sm:h-10"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
            <span className="truncate">Email</span>
          </Button>
          
          <Button
            onClick={handleShareFacebook}
            className="bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs sm:text-sm h-9 sm:h-10"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span className="truncate">Facebook</span>
          </Button>
        </div>

        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-secondary rounded-lg">
          <h5 className="font-semibold mb-1 sm:mb-2 text-sm sm:text-base">💡 Astuce</h5>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Affichez votre QR code dans votre véhicule ou partagez-le par message.
          </p>
        </div>
      </Card>

      {/* Statut de la commande NFC */}
      {driverProfile?.driver?.id && (
        <NfcOrderStatus 
          driverId={driverProfile.driver.id}
          nfcPlateOrderId={driverProfile.driver.nfc_plate_order_id}
        />
      )}
    </div>
  );
};

export default QRCodeDisplay;
