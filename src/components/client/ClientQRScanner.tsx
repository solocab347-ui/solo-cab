import { useState, useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const ClientQRScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (scanner) {
        scanner.clear();
      }
    };
  }, [scanner]);

  const startScanning = () => {
    setScanning(true);

    const html5QrcodeScanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      },
      false
    );

    html5QrcodeScanner.render(
      (decodedText) => {
        console.log("QR Code détecté:", decodedText);
        
        // Extraire l'ID du QR code depuis l'URL
        try {
          const url = new URL(decodedText);
          const qrCodeId = url.searchParams.get("qr");
          
          if (qrCodeId) {
            // Rediriger vers la page d'inscription avec le QR code
            navigate(`/register-client-qr?qr=${qrCodeId}`);
            toast.success("QR code scanné avec succès !");
          } else {
            toast.error("QR code invalide");
          }
        } catch (error) {
          console.error("Erreur de parsing URL:", error);
          toast.error("Format de QR code non reconnu");
        }

        // Arrêter le scanner
        html5QrcodeScanner.clear();
        setScanning(false);
        setScanner(null);
      },
      (errorMessage) => {
        // Ignorer les erreurs de scan continues
        console.debug("Scan error:", errorMessage);
      }
    );

    setScanner(html5QrcodeScanner);
  };

  const stopScanning = () => {
    if (scanner) {
      scanner.clear();
      setScanner(null);
    }
    setScanning(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Scanner un QR Code</h2>
        <p className="text-muted-foreground">
          Scannez le QR code d'un chauffeur pour vous inscrire avec lui
        </p>
      </div>

      {!scanning ? (
        <Card className="p-8 text-center">
          <Camera className="w-16 h-16 text-primary mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Démarrer le scan</h3>
          <p className="text-muted-foreground mb-6">
            Utilisez votre caméra pour scanner le QR code d'un chauffeur
          </p>
          <Button
            onClick={startScanning}
            className="bg-gradient-premium hover:opacity-90"
            size="lg"
          >
            <Camera className="w-5 h-5 mr-2" />
            Ouvrir la caméra
          </Button>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Scan en cours...</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={stopScanning}
              className="text-destructive"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          <div id="qr-reader" className="w-full" />

          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Placez le QR code devant la caméra</span>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-4 bg-blue-500/10 border-blue-500/20">
        <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">
          Comment utiliser le scanner ?
        </h4>
        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Cliquez sur "Ouvrir la caméra"</li>
          <li>Autorisez l'accès à votre caméra</li>
          <li>Placez le QR code du chauffeur devant la caméra</li>
          <li>Le scan se fera automatiquement</li>
        </ol>
      </Card>
    </div>
  );
};

export default ClientQRScanner;
