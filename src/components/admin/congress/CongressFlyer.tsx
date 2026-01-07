import { forwardRef, useEffect, useState } from "react";
import { Crown, Car, Users, Smartphone, Shield, Star, CheckCircle, Handshake, Building2, TrendingUp, Palette, Globe, Heart, Zap } from "lucide-react";
import logo from "@/assets/logo-solocab.png";
import QRCode from "qrcode";

interface CongressFlyerProps {
  invitationLink: string;
  trialDays: number;
  monthlyPrice: number;
  format?: "A4" | "A5";
}

const features = [
  { icon: Users, text: "Acquérez des clients facilement via QR code" },
  { icon: Car, text: "Gérez vos clients et courses en toute simplicité" },
  { icon: Handshake, text: "Partenariats entre chauffeurs indépendants" },
  { icon: Building2, text: "Collaborez avec des entreprises B2B" },
  { icon: TrendingUp, text: "Travaillez avec des gestionnaires de flotte" },
  { icon: Palette, text: "Définissez vos propres tarifs librement" },
  { icon: Globe, text: "Soyez visible sur la vitrine publique" },
  { icon: Smartphone, text: "Maîtrisez totalement votre activité" },
];

const values = [
  { icon: Zap, label: "Indépendance", color: "#3b82f6" },
  { icon: Shield, label: "Technologie", color: "#8b5cf6" },
  { icon: Heart, label: "Humanité", color: "#f97316" },
  { icon: Star, label: "Excellence", color: "#22c55e" },
];

export const CongressFlyer = forwardRef<HTMLDivElement, CongressFlyerProps>(
  ({ invitationLink, trialDays, monthlyPrice, format = "A4" }, ref) => {
    const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

    useEffect(() => {
      const generateQR = async () => {
        try {
          const url = await QRCode.toDataURL(invitationLink, {
            width: 200,
            margin: 2,
            color: {
              dark: "#1e3a5f",
              light: "#ffffff",
            },
          });
          setQrCodeUrl(url);
        } catch (err) {
          console.error("Error generating QR code:", err);
        }
      };
      if (invitationLink) {
        generateQR();
      }
    }, [invitationLink]);

    const isA5 = format === "A5";
    const containerClass = isA5 
      ? "w-[420px] h-[595px] p-4" 
      : "w-[794px] h-[1123px] p-6";
    const textScale = isA5 ? 0.7 : 1;

    return (
      <div
        ref={ref}
        className={`${containerClass} relative overflow-hidden`}
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #f0f4ff 25%, #e8efff 50%, #dde8ff 75%, #d0dfff 100%)",
        }}
      >
        {/* Background decorations - SoloCab colors */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#3b82f6]/15 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#8b5cf6]/15 rounded-full blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-[#f97316]/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/50 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <img src={logo} alt="SoloCab" className={isA5 ? "h-10 object-contain" : "h-14 object-contain"} />
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#f97316] to-[#ea580c] rounded-full px-4 py-2 shadow-lg">
              <Crown className={isA5 ? "h-4 w-4 text-white" : "h-5 w-5 text-white"} />
              <span className={`text-white font-bold ${isA5 ? "text-sm" : "text-lg"}`}>OFFRE PIONNIER</span>
            </div>
          </div>

          {/* Congress banner */}
          <div className="bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] rounded-2xl p-3 mb-3 text-center shadow-lg">
            <p className={`text-white font-bold ${isA5 ? "text-base" : "text-xl"}`}>🎉 CONGRÈS NATIONAL DES VTC 2026 🎉</p>
            <p className={`text-white/80 ${isA5 ? "text-xs" : "text-sm"} mt-1`}>Offre exclusive réservée aux participants</p>
          </div>

          {/* Title */}
          <div className="text-center mb-3">
            <h1 className={`font-bold mb-1 text-[#1e3a5f] ${isA5 ? "text-xl" : "text-3xl"}`}>
              Rejoignez les Pionniers
            </h1>
            <h2 className={`font-extrabold bg-gradient-to-r from-[#3b82f6] via-[#8b5cf6] to-[#f97316] bg-clip-text text-transparent ${isA5 ? "text-2xl" : "text-4xl"}`}>
              SoloCab
            </h2>
            <p className={`text-[#1e3a5f]/80 max-w-lg mx-auto ${isA5 ? "text-xs" : "text-base"}`}>
              La plateforme complète pour chauffeurs VTC indépendants
            </p>
          </div>

          {/* Trial offer */}
          <div className="bg-white border-2 border-[#8b5cf6] rounded-2xl p-3 mb-3 text-center shadow-xl">
            <p className={`text-[#1e3a5f]/70 ${isA5 ? "text-xs" : "text-sm"} mb-1`}>Essai gratuit</p>
            <p className={`font-extrabold text-[#f97316] ${isA5 ? "text-3xl" : "text-5xl"}`}>{trialDays} JOURS</p>
            <div className="flex items-baseline justify-center gap-1 mt-1">
              <span className={`text-[#1e3a5f]/60 ${isA5 ? "text-xs" : "text-sm"}`}>puis</span>
              <span className={`font-bold text-[#1e3a5f] ${isA5 ? "text-lg" : "text-2xl"}`}>{monthlyPrice}€</span>
              <span className={`text-[#1e3a5f]/60 ${isA5 ? "text-xs" : "text-sm"}`}>/mois</span>
            </div>
          </div>

          {/* Features grid */}
          <div className={`grid grid-cols-2 gap-2 mb-3 ${isA5 ? "text-xs" : ""}`}>
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 bg-white/90 border border-[#3b82f6]/30 rounded-xl p-2 shadow-sm">
                <div className={`rounded-full bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center flex-shrink-0 shadow ${isA5 ? "w-6 h-6" : "w-8 h-8"}`}>
                  <feature.icon className={`text-white ${isA5 ? "h-3 w-3" : "h-4 w-4"}`} />
                </div>
                <span className={`text-[#1e3a5f] font-medium ${isA5 ? "text-[10px]" : "text-xs"}`}>{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Values section */}
          <div className="flex justify-center gap-4 mb-3">
            {values.map((value, index) => (
              <div key={index} className="flex flex-col items-center gap-1">
                <div 
                  className={`rounded-full flex items-center justify-center shadow-lg ${isA5 ? "w-10 h-10" : "w-12 h-12"}`}
                  style={{ backgroundColor: value.color }}
                >
                  <value.icon className={`text-white ${isA5 ? "h-5 w-5" : "h-6 w-6"}`} />
                </div>
                <span className={`text-[#1e3a5f] font-semibold ${isA5 ? "text-[10px]" : "text-xs"}`}>{value.label}</span>
              </div>
            ))}
          </div>

          {/* QR Code and Link section */}
          <div className="mt-auto">
            <div className="bg-white border-2 border-[#3b82f6] rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-center gap-4">
                {/* QR Code */}
                {qrCodeUrl && (
                  <div className="flex-shrink-0">
                    <div className="bg-white p-2 rounded-xl border-2 border-[#8b5cf6] shadow-lg">
                      <img 
                        src={qrCodeUrl} 
                        alt="QR Code inscription" 
                        className={isA5 ? "w-24 h-24" : "w-32 h-32"}
                      />
                    </div>
                    <p className={`text-center text-[#1e3a5f]/70 font-medium mt-1 ${isA5 ? "text-[9px]" : "text-xs"}`}>
                      Scannez pour vous inscrire
                    </p>
                  </div>
                )}
                
                {/* Link */}
                <div className="flex-1 text-center">
                  <p className={`text-[#1e3a5f]/70 mb-2 ${isA5 ? "text-xs" : "text-sm"}`}>Ou rendez-vous sur :</p>
                  <div className="bg-gradient-to-r from-[#3b82f6]/10 to-[#8b5cf6]/10 border-2 border-[#3b82f6] rounded-xl px-3 py-2">
                    <p className={`text-[#1e3a5f] font-mono break-all font-bold ${isA5 ? "text-xs" : "text-sm"}`}>
                      {invitationLink}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <CheckCircle className={`text-[#22c55e] ${isA5 ? "h-3 w-3" : "h-4 w-4"}`} />
                    <span className={`text-[#22c55e] font-semibold ${isA5 ? "text-[10px]" : "text-sm"}`}>
                      Activation immédiate • Badge NFC personnalisé
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-2 text-center">
              <p className={`text-[#1e3a5f]/50 ${isA5 ? "text-[9px]" : "text-xs"}`}>
                SoloCab © 2026 - Votre partenaire de confiance pour la gestion VTC
              </p>
              <p className={`text-[#1e3a5f]/40 mt-1 ${isA5 ? "text-[8px]" : "text-xs"}`}>
                Indépendance • Technologie • Connexion • Humanité
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

CongressFlyer.displayName = "CongressFlyer";
