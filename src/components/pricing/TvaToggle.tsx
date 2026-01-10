import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";

interface TvaToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  variant?: "default" | "compact";
}

/**
 * Toggle explicite pour indiquer si les prix sont TTC ou HT
 * Affiche clairement l'état actuel avec des badges colorés
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
    <div className={`p-4 rounded-lg border ${checked ? 'bg-green-500/10 border-green-500/30' : 'bg-orange-500/10 border-orange-500/30'} ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Info className="w-4 h-4 text-muted-foreground" />
            <Label className="font-semibold">
              Mode de tarification
            </Label>
          </div>
          {checked ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-600">TTC</Badge>
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  Vos prix incluent la TVA
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Les prix affichés sont les prix finaux que le client paie
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-orange-500 text-orange-600">HT</Badge>
                <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
                  Vos prix sont hors taxes
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                La TVA (10% ou 20%) sera ajoutée automatiquement lors du calcul
              </p>
            </div>
          )}
        </div>
        <Switch
          checked={checked}
          onCheckedChange={onCheckedChange}
        />
      </div>
    </div>
  );
};
