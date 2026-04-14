import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Building2 } from 'lucide-react';

interface ProfileStepProps {
  companyName: string;
  siret: string;
  companyAddress: string;
  onCompanyNameChange: (v: string) => void;
  onSiretChange: (v: string) => void;
  onCompanyAddressChange: (v: string) => void;
}

export function ProfileStep({
  companyName, siret, companyAddress,
  onCompanyNameChange, onSiretChange, onCompanyAddressChange,
}: ProfileStepProps) {
  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Votre activité</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Informations de votre entreprise VTC
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-xs mb-1.5 block">Nom de l'entreprise *</Label>
          <Input
            placeholder="Ex: VTC Premium Paris"
            value={companyName}
            onChange={(e) => onCompanyNameChange(e.target.value)}
            className="h-12 bg-input"
            autoFocus
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Ce nom sera visible par vos clients
          </p>
        </div>

        <div>
          <Label className="text-xs mb-1.5 block">Numéro SIRET *</Label>
          <Input
            placeholder="14 chiffres"
            value={siret}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 14);
              onSiretChange(val);
            }}
            className="h-12 bg-input font-mono"
            inputMode="numeric"
          />
          {siret.length > 0 && siret.length < 14 && (
            <p className="text-[10px] text-destructive mt-1">
              Le SIRET doit contenir 14 chiffres ({siret.length}/14)
            </p>
          )}
        </div>

        <div>
          <Label className="text-xs mb-1.5 block">Adresse professionnelle *</Label>
          <Input
            placeholder="Ex: 15 rue de la Paix, 75002 Paris"
            value={companyAddress}
            onChange={(e) => onCompanyAddressChange(e.target.value)}
            className="h-12 bg-input"
          />
        </div>
      </div>
    </div>
  );
}
