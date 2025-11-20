import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCode, Camera } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const ClientQRScanner = () => {
  const navigate = useNavigate();
  const [qrCode, setQrCode] = useState("");

  const handleScan = () => {
    if (!qrCode.trim()) {
      toast.error("Veuillez entrer un code QR");
      return;
    }

    // Redirect to QR registration page with the code
    navigate(`/register-client-qr?code=${qrCode}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-premium rounded-full flex items-center justify-center">
          <QrCode className="w-10 h-10 text-premium-foreground" />
        </div>
        
        <h2 className="text-2xl font-bold mb-2">Scanner un QR Code</h2>
        <p className="text-muted-foreground mb-6">
          Scannez le QR code d'un chauffeur pour vous inscrire avec lui
        </p>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Code QR du chauffeur"
              value={qrCode}
              onChange={(e) => setQrCode(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleScan}>
              Scanner
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                ou
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => toast.info("Fonctionnalité à venir")}
          >
            <Camera className="w-4 h-4 mr-2" />
            Utiliser la caméra
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-3">Comment ça marche ?</h3>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>1. Demandez le QR code à votre chauffeur</li>
          <li>2. Scannez-le ou entrez le code manuellement</li>
          <li>3. Complétez votre inscription</li>
          <li>4. Commencez à réserver vos courses !</li>
        </ol>
      </Card>
    </div>
  );
};

export default ClientQRScanner;
