import { forwardRef } from "react";
import { Crown, Car, Users, Smartphone, Shield, Star, CheckCircle } from "lucide-react";
import logo from "@/assets/logo-solocab.png";

interface CongressFlyerProps {
  invitationLink: string;
  trialDays: number;
  monthlyPrice: number;
}

const features = [
  { icon: Car, text: "Gérez vos courses et devis facilement" },
  { icon: Users, text: "Développez votre clientèle fidèle" },
  { icon: Smartphone, text: "Appli intuitive et professionnelle" },
  { icon: Shield, text: "Données sécurisées et RGPD" },
  { icon: Star, text: "Badge Pionnier exclusif" },
];

export const CongressFlyer = forwardRef<HTMLDivElement, CongressFlyerProps>(
  ({ invitationLink, trialDays, monthlyPrice }, ref) => {
    return (
      <div
        ref={ref}
        className="w-[794px] h-[1123px] bg-gradient-to-b from-[#0a0a14] via-[#0f1420] to-[#0a0a14] text-white p-8 relative overflow-hidden"
      >
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 -right-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-40 -left-20 w-60 h-60 bg-[#22c55e]/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <img src={logo} alt="SoloCab" className="h-16 object-contain" />
            <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 rounded-full px-4 py-2">
              <Crown className="h-5 w-5 text-amber-400" />
              <span className="text-amber-400 font-bold text-lg">OFFRE PIONNIER</span>
            </div>
          </div>

          {/* Congress banner */}
          <div className="bg-gradient-to-r from-[#22c55e]/20 via-[#22c55e]/10 to-[#22c55e]/20 border border-[#22c55e]/30 rounded-2xl p-4 mb-6 text-center">
            <p className="text-[#22c55e] font-semibold text-xl">🎉 CONGRÈS NATIONAL DES VTC 2026 🎉</p>
            <p className="text-white/70 text-sm mt-1">Offre exclusive réservée aux participants</p>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white via-amber-100 to-white bg-clip-text text-transparent">
              Rejoignez les Pionniers
            </h1>
            <h2 className="text-3xl font-bold text-amber-400 mb-4">SoloCab</h2>
            <p className="text-white/70 text-lg max-w-lg mx-auto">
              L'application de gestion complète pour chauffeurs VTC indépendants
            </p>
          </div>

          {/* Trial offer */}
          <div className="bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-amber-500/20 border-2 border-amber-500/40 rounded-3xl p-6 mb-6 text-center">
            <p className="text-white/80 text-lg mb-2">Essai gratuit</p>
            <p className="text-6xl font-bold text-amber-400 mb-2">{trialDays} JOURS</p>
            <p className="text-white/60 text-sm mb-4">Sans engagement, sans carte bancaire</p>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-white/60">puis</span>
              <span className="text-3xl font-bold text-white">{monthlyPrice}€</span>
              <span className="text-white/60">/mois</span>
            </div>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="w-10 h-10 rounded-full bg-[#22c55e]/20 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-5 w-5 text-[#22c55e]" />
                </div>
                <span className="text-white/90 text-sm">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Pioneer badge section */}
          <div className="bg-gradient-to-r from-amber-900/30 via-amber-800/20 to-amber-900/30 border border-amber-500/30 rounded-2xl p-5 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/30">
                <Crown className="h-7 w-7 text-white" />
              </div>
              <div>
                <h3 className="text-amber-400 font-bold text-lg mb-1">Badge Pionnier Exclusif</h3>
                <p className="text-white/70 text-sm">
                  En tant que membre fondateur, vous bénéficiez du badge Pionnier visible sur votre profil. 
                  Distinguez-vous et montrez votre engagement envers l'excellence.
                </p>
              </div>
            </div>
          </div>

          {/* Footer with link */}
          <div className="mt-auto">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
              <p className="text-white/60 text-sm mb-3">Inscrivez-vous dès maintenant</p>
              <div className="bg-[#22c55e]/20 border border-[#22c55e]/30 rounded-xl px-4 py-3 inline-block">
                <p className="text-[#22c55e] font-mono text-sm break-all">{invitationLink}</p>
              </div>
              <div className="flex items-center justify-center gap-2 mt-4">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-green-400 text-sm">Activation immédiate de votre compte</span>
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-white/40 text-xs">SoloCab © 2026 - Votre partenaire de confiance pour la gestion VTC</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

CongressFlyer.displayName = "CongressFlyer";
