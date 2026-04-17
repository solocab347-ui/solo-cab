import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, X, Loader2, AlertCircle, CheckCircle, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClientQRScannerInAppProps {
  onDriverAdded?: () => void;
}

const SCANNER_ELEMENT_ID = "qr-reader-inapp";

const ClientQRScannerInApp = ({ onDriverAdded }: ClientQRScannerInAppProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState<{ driverName: string } | null>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
      try {
        scannerRef.current?.clear();
      } catch (error) {
        console.error(error);
      }
      scannerRef.current = null;
    };
  }, []);

  const stopScanning = async () => {
    setCameraError(null);
    setScanning(false);

    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (error) {
        console.error("Stop scanner error:", error);
      } finally {
        scannerRef.current = null;
      }
    }
  };

  const handleQRDetected = async (decodedText: string) => {
    if (processing) return;
    setProcessing(true);

    try {
      let qrCodeId: string | null = null;
      let qrCode: string | null = null;

      try {
        const url = new URL(decodedText);
        qrCodeId = url.searchParams.get("qr");
        const pathMatch = url.pathname.match(/\/qr\/([^/]+)/);
        if (!qrCodeId && pathMatch) {
          qrCode = pathMatch[1];
        }
      } catch {
        qrCode = decodedText.trim();
      }

      if (!qrCodeId && !qrCode) {
        toast.error("QR code invalide");
        return;
      }

      await stopScanning();

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

    if (typeof window !== "undefined" && !window.isSecureContext) {
      const msg = "La caméra nécessite une connexion HTTPS sécurisée.";
      setCameraError(msg);
      toast.error(msg);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      const msg = "Votre navigateur ne supporte pas l'accès caméra.";
      setCameraError(msg);
      toast.error(msg);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      stream.getTracks().forEach((track) => track.stop());
    } catch (permErr: any) {
      let errorMsg = "Impossible d'accéder à la caméra";
      if (permErr.name === "NotAllowedError" || permErr.name === "PermissionDeniedError") {
        errorMsg = "Autorisez l'accès à la caméra dans votre navigateur";
      } else if (permErr.name === "NotFoundError" || permErr.name === "DevicesNotFoundError") {
        errorMsg = "Aucune caméra détectée sur cet appareil";
      } else if (permErr.name === "NotReadableError") {
        errorMsg = "La caméra est utilisée par une autre application";
      }
      setCameraError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setScanning(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 50));

      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
        verbose: false,
      });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1,
          disableFlip: false,
        },
        (decodedText) => {
          void handleQRDetected(decodedText);
        },
        (errorMessage) => {
          if (!errorMessage.includes("NotFoundException") && !errorMessage.includes("No MultiFormat Readers")) {
            console.debug("Scan warning:", errorMessage);
          }
        }
      );
    } catch (error: any) {
      console.error("Scanner start error:", error);
      await stopScanning();
      const errorMsg = "Le vrai scan caméra n'a pas pu démarrer. Réessayez après avoir autorisé la caméra.";
      setCameraError(errorMsg);
      toast.error(errorMsg);
    }
  };

  if (success) {
    return (
      <Card className="p-8 text-center">
        <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Inscription réussie !</h3>
        <p className="text-muted-foreground mb-4">
          <strong>{success.driverName}</strong> a été ajouté à vos chauffeurs.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => { setSuccess(null); onDriverAdded?.(); }}>
            Retour
          </Button>
          <Button variant="outline" onClick={() => { setSuccess(null); void startScanning(); }}>
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
        <h3 className="text-lg font-semibold">Lecture du QR code...</h3>
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
          <h3 className="text-lg font-bold mb-1">Ouvrir le vrai scanner</h3>
          <p className="text-sm text-muted-foreground mb-4">
            La caméra s'ouvre directement et scanne en continu
          </p>
          <Button onClick={() => void startScanning()} className="bg-gradient-premium hover:opacity-90">
            <Camera className="w-5 h-5 mr-2" />
            Démarrer le scan
          </Button>
        </Card>
      ) : (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Scan caméra en direct</h3>
            <Button variant="ghost" size="icon" onClick={() => void stopScanning()} className="text-destructive">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border bg-muted/20">
            <div id={SCANNER_ELEMENT_ID} className="min-h-[320px] w-full" />
            <div className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-2xl border-2 border-primary/80 shadow-[0_0_0_9999px_hsl(var(--background)/0.45)] h-60" />
            <div className="pointer-events-none absolute inset-x-10 bottom-4 rounded-xl bg-background/85 px-3 py-2 text-center text-xs text-muted-foreground backdrop-blur-sm">
              Cadrez le QR code dans le carré, la lecture est automatique
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ClientQRScannerInApp;
