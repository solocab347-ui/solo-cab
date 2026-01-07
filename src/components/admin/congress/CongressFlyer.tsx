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
  { icon: Users, text: "Acquérez des clients facilement" },
  { icon: Car, text: "Gérez vos clients et courses" },
  { icon: Handshake, text: "Partenariats entre chauffeurs" },
  { icon: Building2, text: "Collaborez avec les entreprises" },
  { icon: TrendingUp, text: "Gestionnaires de flotte" },
  { icon: Palette, text: "Vos propres tarifs" },
  { icon: Globe, text: "Vitrine publique" },
  { icon: Smartphone, text: "Maîtrisez votre activité" },
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
          const size = format === "A5" ? 180 : 280;
          const url = await QRCode.toDataURL(invitationLink, {
            width: size,
            margin: 1,
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
    }, [invitationLink, format]);

    const isA5 = format === "A5";

    if (isA5) {
      return (
        <div
          ref={ref}
          className="w-[420px] h-[595px] p-4 relative overflow-hidden flex flex-col"
          style={{
            background: "linear-gradient(180deg, #ffffff 0%, #f0f7ff 100%)",
          }}
        >
          {/* Offre badge - top center */}
          <div className="flex justify-center mb-2">
            <div className="bg-gradient-to-r from-[#f97316] to-[#ea580c] rounded-full px-4 py-1.5">
              <span className="text-white font-bold text-xs tracking-wide">OFFRE PIONNIER</span>
            </div>
          </div>

          {/* Congress banner */}
          <div className="bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] rounded-xl py-2 px-3 mb-3 text-center">
            <p className="text-white font-bold text-sm">🎉 CONGRÈS VTC 2026 🎉</p>
          </div>

          {/* Main title */}
          <div className="text-center mb-3">
            <h1 className="text-xl font-bold text-[#1e3a5f] italic">Rejoignez les Pionniers</h1>
          </div>

          {/* QR Code - CENTRAL & LARGE */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="bg-white p-4 rounded-2xl shadow-xl border-4 border-[#3b82f6] mb-3">
              {qrCodeUrl && (
                <img src={qrCodeUrl} alt="QR Code" className="w-36 h-36" />
              )}
            </div>
            <p className="text-[#1e3a5f] font-bold text-sm tracking-wide">
              SCANNEZ POUR VOUS INSCRIRE
            </p>
          </div>

          {/* Trial offer box */}
          <div className="bg-gradient-to-r from-[#dbeafe] to-[#ede9fe] rounded-xl py-3 px-4 mb-4 text-center border border-[#8b5cf6]/30">
            <span className="text-[#f97316] font-extrabold text-2xl">{trialDays} JOURS</span>
            <span className="text-[#1e3a5f] text-sm font-semibold ml-2">d'essai gratuit</span>
            <span className="text-[#1e3a5f]/60 text-xs ml-1">puis {monthlyPrice}€/mois</span>
          </div>

          {/* Features - 2 columns x 4 rows compact */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-3">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-3 w-3 text-white" />
                </div>
                <span className="text-[#1e3a5f] text-[10px] font-medium leading-tight">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Values row */}
          <div className="flex justify-center gap-4 pt-2 border-t border-[#3b82f6]/20">
            {values.map((value, index) => (
              <div key={index} className="flex items-center gap-1">
                <div 
                  className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: value.color }}
                >
                  <value.icon className="h-3 w-3 text-white" />
                </div>
                <span className="text-[#1e3a5f] text-[9px] font-semibold">{value.label}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Format A4
    return (
      <div
        ref={ref}
        className="w-[794px] h-[1123px] p-8 relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #ffffff 0%, #f0f4ff 40%, #e0e8ff 100%)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <img src={logo} alt="SoloCab" className="h-16 object-contain" />
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#f97316] to-[#ea580c] rounded-full px-6 py-3 shadow-lg">
            <Crown className="h-6 w-6 text-white" />
            <span className="text-white font-bold text-xl">OFFRE PIONNIER</span>
          </div>
        </div>

        {/* Congress banner */}
        <div className="bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] rounded-2xl p-4 mb-6 text-center shadow-lg">
          <p className="text-white font-bold text-2xl">🎉 CONGRÈS NATIONAL DES VTC 2026 🎉</p>
          <p className="text-white/80 text-base mt-1">Offre exclusive réservée aux participants</p>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-[#1e3a5f] mb-2">Rejoignez les Pionniers</h1>
          <h2 className="text-5xl font-extrabold bg-gradient-to-r from-[#3b82f6] via-[#8b5cf6] to-[#f97316] bg-clip-text text-transparent">
            SoloCab
          </h2>
          <p className="text-[#1e3a5f]/70 text-lg mt-2">
            La plateforme complète pour chauffeurs VTC indépendants
          </p>
        </div>

        {/* QR Code - CENTRAL & PROMINENT */}
        <div className="flex justify-center mb-6">
          <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-[#3b82f6]">
            {qrCodeUrl && (
              <img src={qrCodeUrl} alt="QR Code inscription" className="w-44 h-44" />
            )}
          </div>
        </div>
        <p className="text-center text-[#1e3a5f] font-bold text-2xl mb-6">
          📱 SCANNEZ POUR VOUS INSCRIRE
        </p>

        {/* Trial offer */}
        <div className="bg-white rounded-2xl p-5 mb-6 text-center shadow-xl border-2 border-[#8b5cf6]">
          <div className="flex items-center justify-center gap-4">
            <div>
              <span className="text-[#f97316] font-extrabold text-5xl">{trialDays}</span>
              <span className="text-[#1e3a5f] font-bold text-2xl ml-2">JOURS D'ESSAI GRATUIT</span>
            </div>
          </div>
          <p className="text-[#1e3a5f]/60 text-lg mt-2">puis seulement {monthlyPrice}€/mois</p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {features.map((feature, index) => (
            <div key={index} className="flex flex-col items-center gap-2 bg-white/90 rounded-xl p-3 shadow">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center shadow">
                <feature.icon className="h-5 w-5 text-white" />
              </div>
              <span className="text-[#1e3a5f] text-xs font-medium text-center">{feature.text}</span>
            </div>
          ))}
        </div>

        {/* Values section */}
        <div className="flex justify-center gap-8 mb-6">
          {values.map((value, index) => (
            <div key={index} className="flex flex-col items-center gap-2">
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
                style={{ backgroundColor: value.color }}
              >
                <value.icon className="h-7 w-7 text-white" />
              </div>
              <span className="text-[#1e3a5f] font-semibold text-sm">{value.label}</span>
            </div>
          ))}
        </div>

        {/* Link backup */}
        <div className="bg-[#3b82f6]/10 rounded-xl p-4 text-center mb-4">
          <p className="text-[#1e3a5f]/70 text-sm mb-1">Lien direct :</p>
          <p className="text-[#1e3a5f] font-mono text-base font-bold">{invitationLink}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2">
          <CheckCircle className="h-5 w-5 text-[#22c55e]" />
          <span className="text-[#22c55e] font-semibold">Activation immédiate • Badge NFC personnalisé</span>
        </div>
        <p className="text-center text-[#1e3a5f]/40 text-xs mt-4">
          SoloCab © 2026 - Indépendance • Technologie • Connexion • Humanité
        </p>
      </div>
    );
  }
);

CongressFlyer.displayName = "CongressFlyer";
