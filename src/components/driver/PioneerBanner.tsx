import { Trophy, Star, Sparkles } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";
import { differenceInDays, format } from "date-fns";
import { fr, enUS, es } from "date-fns/locale";

interface PioneerBannerProps {
  freeAccessEndDate?: string | null;
  subscriptionStatus?: string;
  freeAccessType?: string;
}

export function PioneerBanner({ 
  freeAccessEndDate, 
  subscriptionStatus,
  freeAccessType 
}: PioneerBannerProps) {
  const { t, locale } = useLocale();
  
  // Calculate days remaining in trial
  const daysRemaining = freeAccessEndDate 
    ? differenceInDays(new Date(freeAccessEndDate), new Date())
    : 0;
  
  const isTrialActive = freeAccessType === "trial" && daysRemaining > 0;
  const isPaidPioneer = subscriptionStatus === "active" && !isTrialActive;
  
  // Get locale for date formatting
  const dateLocale = locale === "fr" ? fr : locale === "es" ? es : enUS;
  
  return (
    <div className="relative overflow-hidden rounded-xl mb-6">
      {/* Background gradient with golden theme */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 opacity-95" />
      
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -right-4 w-32 h-32 bg-yellow-300/30 rounded-full blur-2xl" />
        <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-amber-300/30 rounded-full blur-xl" />
        <Sparkles className="absolute top-2 right-4 w-6 h-6 text-yellow-200/50 animate-pulse" />
        <Sparkles className="absolute bottom-2 left-8 w-4 h-4 text-yellow-200/40 animate-pulse delay-300" />
        <Star className="absolute top-4 left-1/3 w-3 h-3 text-yellow-200/30 fill-yellow-200/30" />
        <Star className="absolute bottom-3 right-1/4 w-4 h-4 text-yellow-200/40 fill-yellow-200/40" />
      </div>
      
      {/* Content */}
      <div className="relative px-4 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Trophy icon with glow effect */}
          <div className="relative">
            <div className="absolute inset-0 bg-yellow-200 rounded-full blur-md animate-pulse" />
            <div className="relative bg-gradient-to-br from-yellow-100 to-amber-200 p-2.5 rounded-full shadow-lg">
              <Trophy className="w-6 h-6 sm:w-7 sm:h-7 text-amber-700" />
            </div>
          </div>
          
          <div className="text-center sm:text-left">
            <h3 className="font-bold text-lg sm:text-xl text-white drop-shadow-md flex items-center gap-2">
              🏆 Pionnier SoloCab
            </h3>
            <p className="text-yellow-100 text-xs sm:text-sm font-medium">
              {isPaidPioneer ? (
                "Membre fondateur • Tarif exclusif à vie 39,99€/mois"
              ) : (
                `Période d'essai • ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} restant${daysRemaining > 1 ? 's' : ''}`
              )}
            </p>
          </div>
        </div>
        
        {/* Trial countdown or status badge */}
        <div className="flex items-center gap-2">
          {isTrialActive ? (
            <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg px-4 py-2 text-center">
              <p className="text-xs text-yellow-100 font-medium">Fin de l'essai</p>
              <p className="text-sm sm:text-base font-bold text-white">
                {freeAccessEndDate && format(new Date(freeAccessEndDate), "dd MMM yyyy", { locale: dateLocale })}
              </p>
            </div>
          ) : (
            <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg px-4 py-2 flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-200 fill-yellow-200" />
              <span className="text-sm font-bold text-white">Membre Fondateur</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
