import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Download, Copy, Share2, Check, Sparkles, Eye, Smartphone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { NfcOrderStatus } from "./NfcOrderStatus";
import { cn } from "@/lib/utils";

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
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 animate-pulse" />
          <Sparkles className="w-5 h-5 text-primary absolute -top-1 -right-1 animate-bounce" />
        </div>
        <p className="text-muted-foreground text-sm">Chargement du QR Code...</p>
      </div>
    );
  }

  if (!qrCode) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-24 h-24 rounded-2xl bg-muted/50 flex items-center justify-center">
          <QrCode className="w-12 h-12 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-bold">QR Code indisponible</h3>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Votre QR code sera généré automatiquement après validation de votre compte.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Hero QR Code Card */}
      <div className="relative overflow-hidden rounded-2xl">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700" />
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="absolute top-1/2 right-4 w-2 h-2 bg-white/30 rounded-full animate-pulse" />
        <div className="absolute top-1/4 left-8 w-1.5 h-1.5 bg-white/20 rounded-full animate-pulse delay-300" />
        <div className="absolute bottom-1/3 right-12 w-1 h-1 bg-white/25 rounded-full animate-pulse delay-700" />
        
        <div className="relative z-10 p-6 sm:p-8 flex flex-col items-center" data-tutorial="qr-code">
          {/* Title */}
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span className="text-xs font-semibold uppercase tracking-widest text-white/70">
              Votre QR Code
            </span>
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-1 text-center">
            Code Personnel
          </h3>
          <p className="text-white/60 text-xs sm:text-sm mb-5 text-center max-w-xs">
            Vos clients s'inscrivent en 30 secondes
          </p>
          
          {/* QR Code with glow */}
          {qrCode.qr_code_image && (
            <div className="relative group mb-5">
              {/* Outer glow */}
              <div className="absolute -inset-3 bg-white/15 rounded-2xl blur-xl group-hover:bg-white/25 transition-all duration-500" />
              {/* Inner frame */}
              <div className="relative bg-white p-4 rounded-xl shadow-2xl ring-1 ring-white/20">
                <img 
                  src={qrCode.qr_code_image} 
                  alt="QR Code" 
                  className="w-44 h-44 sm:w-56 sm:h-56"
                />
              </div>
              {/* Scan hint */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1">
                <Smartphone className="w-3 h-3 text-white/80" />
                <span className="text-[10px] text-white/80 font-medium">Scanner pour s'inscrire</span>
              </div>
            </div>
          )}
          
          {/* Stats badges */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 ring-1 ring-white/10">
              <Eye className="w-3.5 h-3.5 text-white/80" />
              <span className="text-xs font-semibold text-white">
                {qrCode.scans_count || 0} scans
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-500/20 backdrop-blur-sm rounded-full px-3 py-1.5 ring-1 ring-emerald-400/30">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-300">Actif</span>
            </div>
          </div>
          
          {/* Download button */}
          <Button
            onClick={handleDownloadQR}
            className="w-full max-w-xs bg-white text-purple-700 hover:bg-white/90 font-semibold shadow-lg h-11"
          >
            <Download className="w-4 h-4 mr-2" />
            Télécharger (PNG)
          </Button>
        </div>
      </div>
      
      {/* Link copy section */}
      <Card className="p-4 border-border/50">
        <label className="text-xs font-medium text-muted-foreground mb-2 block">
          Lien d'inscription
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 bg-muted/50 rounded-lg px-3 py-2.5 border border-border/50">
            <p className="text-xs text-foreground/80 truncate font-mono">
              {registrationLink}
            </p>
          </div>
          <Button
            onClick={handleCopyLink}
            size="sm"
            variant={copied ? "default" : "outline"}
            className={cn(
              "h-10 w-10 p-0 flex-shrink-0 transition-all",
              copied && "bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
            )}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </Card>

      {/* Share Section */}
      <Card className="p-4 sm:p-5 border-border/50" data-tutorial="share-button">
        <div className="flex items-center gap-2 mb-4">
          <Share2 className="w-4 h-4 text-primary" />
          <h4 className="font-bold text-sm">Partager votre QR Code</h4>
        </div>
        
        <div className="grid grid-cols-2 gap-2.5">
          <Button
            onClick={handleShareWhatsApp}
            className="bg-[#25D366] hover:bg-[#20BA5A] text-white h-11 text-sm font-medium"
          >
            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            WhatsApp
          </Button>
          
          <Button
            onClick={handleShareSMS}
            className="bg-sky-500 hover:bg-sky-600 text-white h-11 text-sm font-medium"
          >
            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 11H7V9h2v2zm4 0h-2V9h2v2zm4 0h-2V9h2v2z"/>
            </svg>
            SMS
          </Button>
          
          <Button
            onClick={handleShareEmail}
            className="bg-violet-600 hover:bg-violet-700 text-white h-11 text-sm font-medium"
          >
            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
            Email
          </Button>
          
          <Button
            onClick={handleShareFacebook}
            className="bg-[#1877F2] hover:bg-[#166FE5] text-white h-11 text-sm font-medium"
          >
            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Facebook
          </Button>
        </div>

        {/* Pro tip */}
        <div className="mt-4 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <div className="flex items-start gap-2.5">
            <span className="text-lg leading-none">💡</span>
            <div>
              <p className="text-xs font-semibold text-amber-200 mb-0.5">Astuce pro</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Affichez votre QR code dans votre véhicule, sur votre carte de visite ou partagez-le directement par message à vos clients.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* NFC Order Status */}
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
