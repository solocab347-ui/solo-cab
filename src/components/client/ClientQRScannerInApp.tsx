import { useState, useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, X, Loader2, AlertCircle, CheckCircle, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClientQRScannerInAppProps {
  onDriverAdded?: () => void;
}

const ClientQRScannerInApp = ({ onDriverAdded }: ClientQRScannerInAppProps) => {
  const [scanning, setScanning] = useState(false);
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState<{ driverName: string } | null>(null);

  useEffect(() => {
    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [scanner]);

  const handleQRDetected = async (decodedText: string) => {
    if (processing) return;
    setProcessing(true);

    try {
      // Extract QR code ID from URL — supports ?qr=ID or /qr/CODE formats
      let qrCodeId: string | null = null;
      let qrCode: string | null = null;

      try {
        const url = new URL(decodedText);
        qrCodeId = url.searchParams.get("qr");
        // Also support /qr/<code> path format
        const pathMatch = url.pathname.match(/\/qr\/([^/]+)/);
        if (!qrCodeId && pathMatch) {
          qrCode = pathMatch[1];
        }
      } catch {
        // If not a valid URL, treat as raw QR code value
        qrCode = decodedText.trim();
      }

      if (!qrCodeId && !qrCode) {
        toast.error("QR code invalide");
        setProcessing(false);
        return;
      }

      // Stop scanner
      if (scanner) {
        await scanner.clear().catch(console.error);
        setScanner(null);
      }
      setScanning(false);

      // Use register-client-qr edge function which handles QR lookup securely
      // This bypasses RLS issues with qr_codes table
      const { data, error } = await supabase.functions.invoke("register-client-qr", {
        body: { 
          qr_code_id: qrCodeId || undefined,
          qr_code: qrCode || undefined,
        },
      });

      if (error) throw error;

      if (data?.error) {
        if (data.error.includes("déjà inscrit") || data.error.includes("already") || data.error.includes("déjà associé")) {
          toast.info("Vous êtes déjà inscrit avec ce chauffeur !");
        } else {
          toast.error(data.error);
        }
        setProcessing(false);
        return;
      }

      const driverName = data?.driver_name || data?.driverName || "le chauffeur";
      setSuccess({ driverName });
      toast.success(`${driverName} ajouté à vos chauffeurs !`);
      onDriverAdded?.();
    } catch (error: any) {
      console.error("QR scan error:", error);
      toast.error(error.message || "Erreur lors de l'inscription");
    } finally {
      setProcessing(false);
    }
  };

  const startScanning = async () => {
    setCameraError(null);
    setSuccess(null);
    setScanning(true);

    try {
      const html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader-inapp",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
          useBarCodeDetectorIfSupported: true,
          rememberLastUsedCamera: true,
        },
        false
      );

      html5QrcodeScanner.render(
        (decodedText) => handleQRDetected(decodedText),
        (errorMessage) => {
          if (!errorMessage.includes("NotFoundException")) {
            console.debug("Scan error:", errorMessage);
          }
        }
      );

      setScanner(html5QrcodeScanner);
    } catch (error: any) {
      let errorMsg = "Impossible d'initialiser le scanner";
      if (error.name === "NotAllowedError") {
        errorMsg = "Autorisez l'accès à la caméra pour scanner";
      } else if (error.name === "NotFoundError") {
        errorMsg = "Aucune caméra détectée";
      }
      setCameraError(errorMsg);
      toast.error(errorMsg);
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (scanner) {
      scanner.clear().catch(console.error);
      setScanner(null);
    }
    setScanning(false);
    setCameraError(null);
  };

  if (success) {
    return (
      <Card className="p-8 text-center">
        <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Inscription réussie !</h3>
        <p className="text-muted-foreground mb-4">
          <strong>{success.driverName}</strong> a été ajouté à vos chauffeurs.
          Vous pouvez maintenant réserver avec lui.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => { setSuccess(null); onDriverAdded?.(); }}>
            Retour
          </Button>
          <Button variant="outline" onClick={() => { setSuccess(null); startScanning(); }}>
            <Camera className="w-4 h-4 mr-2" />
            Scanner un autre
          </Button>
        </div>
      </Card>
    );
  }

  if (processing) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
        <h3 className="text-lg font-semibold">Inscription en cours...</h3>
        <p className="text-muted-foreground text-sm">Veuillez patienter</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" />
          Ajouter un chauffeur
        </h2>
        <p className="text-sm text-muted-foreground">
          Scannez le QR code d'un chauffeur pour l'ajouter instantanément à vos chauffeurs
        </p>
      </div>

      {cameraError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{cameraError}</AlertDescription>
        </Alert>
      )}

      {!scanning ? (
        <Card className="p-6 text-center">
          <Camera className="w-12 h-12 text-primary mx-auto mb-3" />
          <h3 className="text-lg font-bold mb-1">Scanner un QR Code</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Le chauffeur sera ajouté à votre liste instantanément
          </p>
          <Button onClick={startScanning} className="bg-gradient-premium hover:opacity-90">
            <Camera className="w-5 h-5 mr-2" />
            Ouvrir la caméra
          </Button>
        </Card>
      ) : (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Scan en cours...</h3>
            <Button variant="ghost" size="icon" onClick={stopScanning} className="text-destructive">
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div id="qr-reader-inapp" className="w-full" />
          <div className="mt-3 p-3 bg-muted/50 rounded-lg flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            Placez le QR code devant la caméra
          </div>
        </Card>
      )}
    </div>
  );
};

export default ClientQRScannerInApp;
