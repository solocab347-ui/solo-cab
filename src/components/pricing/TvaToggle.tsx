import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Info, AlertTriangle, CheckCircle } from "lucide-react";

interface TvaToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  variant?: "default" | "compact";
}

/**
 * Toggle explicite pour indiquer si les prix sont TTC ou HT
 * - TTC (checked=true): Les prix saisis incluent déjà la TVA
 * - HT (checked=false): Les prix sont hors taxes, la TVA sera ajoutée automatiquement
 *   - 10% pour les courses classiques
 *   - 20% pour les mises à disposition
 */
export const TvaToggle = ({ 
  checked, 
  onCheckedChange, 
  className = "",
  variant = "default" 
}: TvaToggleProps) => {
  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <Switch
          checked={checked}
          onCheckedChange={onCheckedChange}
        />
        <div className="flex items-center gap-2">
          <Label className="cursor-pointer" onClick={() => onCheckedChange(!checked)}>
            {checked ? (
              <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                Prix TTC
              </Badge>
            ) : (
              <Badge variant="outline" className="border-orange-500 text-orange-600">
                Prix HT
              </Badge>
            )}
          </Label>
          <span className="text-xs text-muted-foreground">
            {checked ? "(TVA incluse)" : "(TVA à ajouter)"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-3 sm:p-4 rounded-lg border ${checked ? 'bg-green-500/10 border-green-500/30' : 'bg-orange-500/10 border-orange-500/30'} ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {checked ? (
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 shrink-0" />
            )}
            <Label className="font-semibold text-sm sm:text-base">
              Mode de tarification
            </Label>
          </div>
          
          {checked ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-600 text-white font-bold px-2 sm:px-3 text-xs">TTC</Badge>
                <span className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-400">
                  Vos prix incluent la TVA
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                Les prix que vous saisissez sont les prix finaux affichés au client.
                <br />
                <strong>Exemple:</strong> Vous entrez 50€ → Le client voit 50€ sur le devis
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-orange-500 text-orange-600 font-bold px-2 sm:px-3 text-xs">HT</Badge>
                <span className="text-xs sm:text-sm font-medium text-orange-700 dark:text-orange-400">
                  Vos prix sont hors taxes
                </span>
              </div>
              <div className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed space-y-1">
                <p>La TVA sera ajoutée automatiquement :</p>
                <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 mt-1">
                  <Badge variant="secondary" className="text-[10px] sm:text-xs font-normal w-fit">
                    🚗 Course: +10%
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] sm:text-xs font-normal w-fit">
                    ⏱️ Mise à dispo: +20%
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-center gap-1 shrink-0">
          <Switch
            checked={checked}
            onCheckedChange={onCheckedChange}
            className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-orange-500"
          />
          <span className="text-[10px] text-muted-foreground">
            {checked ? "TTC" : "HT"}
          </span>
        </div>
      </div>
      
      <div className="mt-2 sm:mt-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-[11px] sm:text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
        <Info className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 mt-0.5" />
        <span>
          <strong>Par défaut :</strong> Les prix sont en TTC. Recommandé pour la majorité des chauffeurs.
        </span>
      </div>
    </div>
  );
};