import { forwardRef } from "react";
import { Crown, Car, Users, Smartphone, Shield, Star, CheckCircle, Handshake, Building2, TrendingUp, Palette, Globe, Heart, Zap } from "lucide-react";
import logo from "@/assets/logo-solocab.png";

interface CongressFlyerProps {
  invitationLink: string;
  trialDays: number;
  monthlyPrice: number;
}

const features = [
  { icon: Users, text: "Acquérez des clients facilement via QR code" },
  { icon: Car, text: "Gérez vos clients et courses en toute simplicité" },
  { icon: Handshake, text: "Partenariats entre chauffeurs indépendants" },
  { icon: Building2, text: "Collaborez avec des entreprises B2B" },
  { icon: TrendingUp, text: "Travaillez avec des gestionnaires de flotte" },
  { icon: Palette, text: "Définissez vos propres tarifs librement" },
  { icon: Globe, text: "Soyez visible sur la vitrine publique" },
  { icon: Smartphone, text: "Application intuitive et professionnelle" },
];

const values = [
  { icon: Zap, label: "Indépendance", color: "#22c55e" },
  { icon: Shield, label: "Technologie", color: "#3b82f6" },
  { icon: Heart, label: "Humanité", color: "#f97316" },
  { icon: Star, label: "Excellence", color: "#eab308" },
];

export const CongressFlyer = forwardRef<HTMLDivElement, CongressFlyerProps>(
  ({ invitationLink, trialDays, monthlyPrice }, ref) => {
    return (
      <div
        ref={ref}
        className="w-[794px] h-[1123px] p-6 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 25%, #d1fae5 50%, #a7f3d0 75%, #6ee7b7 100%)",
        }}
      >
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#22c55e]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#3b82f6]/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/30 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <img src={logo} alt="SoloCab" className="h-14 object-contain" />
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full px-5 py-2 shadow-lg">
              <Crown className="h-5 w-5 text-white" />
              <span className="text-white font-bold text-lg">OFFRE PIONNIER</span>
            </div>
          </div>

          {/* Congress banner */}
          <div className="bg-white/80 backdrop-blur-sm border-2 border-[#22c55e] rounded-2xl p-4 mb-4 text-center shadow-lg">
            <p className="text-[#166534] font-bold text-xl">🎉 CONGRÈS NATIONAL DES VTC 2026 🎉</p>
            <p className="text-[#166534]/70 text-sm mt-1">Offre exclusive réservée aux participants</p>
          </div>

          {/* Title */}
          <div className="text-center mb-4">
            <h1 className="text-3xl font-bold mb-2 text-[#166534]">
              Rejoignez les Pionniers
            </h1>
            <h2 className="text-4xl font-extrabold text-[#22c55e] mb-2">SoloCab</h2>
            <p className="text-[#166534]/80 text-base max-w-lg mx-auto">
              La plateforme complète pour chauffeurs VTC indépendants
            </p>
          </div>

          {/* Trial offer */}
          <div className="bg-white/90 backdrop-blur-sm border-2 border-amber-400 rounded-2xl p-4 mb-4 text-center shadow-xl">
            <p className="text-[#166534]/70 text-sm mb-1">Essai gratuit</p>
            <p className="text-5xl font-extrabold text-amber-500 mb-1">{trialDays} JOURS</p>
            <p className="text-[#166534]/60 text-xs mb-2">Sans engagement, sans carte bancaire</p>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-[#166534]/60 text-sm">puis</span>
              <span className="text-2xl font-bold text-[#166534]">{monthlyPrice}€</span>
              <span className="text-[#166534]/60 text-sm">/mois</span>
            </div>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-[#22c55e]/30 rounded-xl p-3 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-[#22c55e] flex items-center justify-center flex-shrink-0 shadow">
                  <feature.icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-[#166534] text-xs font-medium">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Values section */}
          <div className="flex justify-center gap-4 mb-4">
            {values.map((value, index) => (
              <div key={index} className="flex flex-col items-center gap-1">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: value.color }}
                >
                  <value.icon className="h-6 w-6 text-white" />
                </div>
                <span className="text-[#166534] text-xs font-semibold">{value.label}</span>
              </div>
            ))}
          </div>

          {/* Pioneer badge section */}
          <div className="bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 border-2 border-amber-300 rounded-2xl p-4 mb-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-amber-700 font-bold text-base mb-1">Badge Pionnier Exclusif</h3>
                <p className="text-amber-800/70 text-xs">
                  En tant que membre fondateur, bénéficiez du badge Pionnier visible sur votre profil. 
                  Distinguez-vous et montrez votre engagement envers l'excellence VTC.
                </p>
              </div>
            </div>
          </div>

          {/* Footer with link */}
          <div className="mt-auto">
            <div className="bg-white/90 backdrop-blur-sm border-2 border-[#22c55e] rounded-2xl p-4 text-center shadow-xl">
              <p className="text-[#166534]/70 text-sm mb-2">Inscrivez-vous dès maintenant</p>
              <div className="bg-[#22c55e]/10 border border-[#22c55e] rounded-xl px-4 py-2 inline-block">
                <p className="text-[#166534] font-mono text-xs break-all font-bold">{invitationLink}</p>
              </div>
              <div className="flex items-center justify-center gap-2 mt-3">
                <CheckCircle className="h-4 w-4 text-[#22c55e]" />
                <span className="text-[#22c55e] text-sm font-semibold">Activation immédiate • Badge NFC personnalisé</span>
              </div>
            </div>
            <div className="mt-3 text-center">
              <p className="text-[#166534]/50 text-xs">SoloCab © 2026 - Votre partenaire de confiance pour la gestion VTC</p>
              <p className="text-[#166534]/40 text-xs mt-1">Indépendance • Technologie • Connexion • Humanité</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

CongressFlyer.displayName = "CongressFlyer";