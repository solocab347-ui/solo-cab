import { AlertTriangle, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface BillingWarningBannerProps {
  company: {
    siret: string;
    siren?: string | null;
    tva_number?: string | null;
    address: string;
    billing_address?: string | null;
  };
  onNavigateToSettings: () => void;
}

export const BillingWarningBanner = ({ company, onNavigateToSettings }: BillingWarningBannerProps) => {
  const [dismissed, setDismissed] = useState(false);

  // Check if billing settings are incomplete
  const isMissingSiret = !company.siret || company.siret.trim() === "";
  const isMissingAddress = !company.address || company.address.trim() === "";
  
  // Consider billing incomplete if SIRET or address is missing
  const isBillingIncomplete = isMissingSiret || isMissingAddress;

  if (!isBillingIncomplete || dismissed) {
    return null;
  }

  const getMissingFields = () => {
    const missing = [];
    if (isMissingSiret) missing.push("SIRET");
    if (isMissingAddress) missing.push("adresse");
    return missing;
  };

  const missingFields = getMissingFields();

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/10 border border-amber-500/30 p-4">
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5" />
      
      <div className="relative z-10 flex items-start gap-4">
        <div className="shrink-0 w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-amber-200 mb-1">
            Paramètres de facturation incomplets
          </h3>
          <p className="text-sm text-amber-200/80 mb-3">
            Pour générer des devis et factures, veuillez compléter vos informations de facturation
            {missingFields.length > 0 && (
              <span className="text-amber-300 font-medium">
                {" "}(manquant : {missingFields.join(", ")})
              </span>
            )}
          </p>
          
          <Button 
            size="sm" 
            onClick={onNavigateToSettings}
            className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
          >
            <Settings className="w-4 h-4 mr-2" />
            Compléter maintenant
          </Button>
        </div>

        <button 
          onClick={() => setDismissed(true)}
          className="shrink-0 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Fermer"
        >
          <X className="w-4 h-4 text-amber-200/60" />
        </button>
      </div>
    </div>
  );
};
