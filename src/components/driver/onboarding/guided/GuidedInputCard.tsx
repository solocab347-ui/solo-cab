import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NumericInput } from '@/components/ui/numeric-input';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface QuickOption {
  label: string;
  value: string;
}

interface GuidedInputCardProps {
  /** Type d'input */
  type: 'numeric' | 'text' | 'switch' | 'select';
  /** Label du champ */
  label: string;
  /** Icône */
  icon?: LucideIcon;
  /** Valeur actuelle */
  value: string | boolean;
  /** Callback de changement */
  onChange: (value: string | boolean) => void;
  /** Placeholder */
  placeholder?: string;
  /** Suffixe (€, €/km, etc.) */
  suffix?: string;
  /** Options rapides (badges cliquables) */
  quickOptions?: QuickOption[];
  /** Calcul d'exemple à afficher */
  example?: {
    label: string;
    value: string;
  };
  /** Afficher le bouton continuer ? */
  showContinue?: boolean;
  /** Label du bouton continuer */
  continueLabel?: string;
  /** Callback du bouton continuer */
  onContinue?: () => void;
  /** Désactiver le bouton continuer */
  continueDisabled?: boolean;
  /** Afficher un bouton "Passer" ? */
  showSkip?: boolean;
  /** Callback du bouton passer */
  onSkip?: () => void;
  /** Description du switch */
  switchDescription?: string;
  /** Champ optionnel ? */
  optional?: boolean;
}

export function GuidedInputCard({
  type,
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  suffix,
  quickOptions,
  example,
  showContinue = true,
  continueLabel = 'Continuer',
  onContinue,
  continueDisabled = false,
  showSkip = false,
  onSkip,
  switchDescription,
  optional = false
}: GuidedInputCardProps) {
  return (
    <Card className="border-primary/20 bg-card/80 backdrop-blur-sm shadow-lg overflow-hidden">
      <CardContent className="p-4 space-y-4">
        {/* Label avec icône */}
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-primary" />}
          <Label className="text-base font-semibold">{label}</Label>
          {optional && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              Optionnel
            </Badge>
          )}
        </div>

        {/* Input selon le type */}
        {type === 'numeric' && (
          <div className="relative">
            <NumericInput
              value={value as string}
              onChange={(v) => onChange(v)}
              placeholder={placeholder}
              className="h-14 text-xl font-medium pr-12 bg-background"
            />
            {suffix && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                {suffix}
              </span>
            )}
          </div>
        )}

        {type === 'text' && (
          <Input
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="h-14 text-lg bg-background"
          />
        )}

        {type === 'switch' && (
          <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">{label}</span>
              {switchDescription && (
                <p className="text-xs text-muted-foreground">{switchDescription}</p>
              )}
            </div>
            <Switch
              checked={value as boolean}
              onCheckedChange={(v) => onChange(v)}
            />
          </div>
        )}

        {/* Options rapides */}
        {quickOptions && quickOptions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {quickOptions.map((option) => (
              <motion.div
                key={option.value}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Badge
                  variant={value === option.value ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer px-4 py-2 text-sm transition-all",
                    value === option.value && "ring-2 ring-primary/50"
                  )}
                  onClick={() => onChange(option.value)}
                >
                  {option.label}
                </Badge>
              </motion.div>
            ))}
          </div>
        )}

        {/* Exemple calculé */}
        {example && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-3 border border-primary/20"
          >
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">{example.label}</span>
              <strong className="text-primary text-lg ml-auto">{example.value}</strong>
            </div>
          </motion.div>
        )}

        {/* Boutons */}
        {(showContinue || showSkip) && (
          <div className={cn("flex gap-2 pt-2", showSkip ? "flex-row" : "flex-col")}>
            {showSkip && (
              <Button
                variant="outline"
                onClick={onSkip}
                className="flex-1 h-12"
              >
                Passer
              </Button>
            )}
            {showContinue && (
              <Button
                onClick={onContinue}
                disabled={continueDisabled}
                className={cn(
                  "h-12 gap-2 font-semibold",
                  showSkip ? "flex-1" : "w-full"
                )}
              >
                {continueLabel}
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
