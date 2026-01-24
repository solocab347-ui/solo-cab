import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Check, 
  Plus,
  Car,
  Zap,
  Music,
  Briefcase,
  Navigation,
  Crown,
  Star,
  Users
} from 'lucide-react';
import type { OnboardingData } from '../OnboardingWizard';

interface StepPlatformsProps {
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
}

const COMMON_PLATFORMS = [
  { id: 'uber', name: 'Uber', icon: Car },
  { id: 'bolt', name: 'Bolt', icon: Zap },
  { id: 'heetch', name: 'Heetch', icon: Music },
  { id: 'marcel', name: 'Marcel', icon: Briefcase },
  { id: 'freenow', name: 'FreeNow', icon: Navigation },
  { id: 'lecab', name: 'LeCab', icon: Crown },
  { id: 'kapten', name: 'Kapten', icon: Star },
  { id: 'clients_directs', name: 'Clients directs', icon: Users },
];

export function StepPlatforms({ data, onUpdate }: StepPlatformsProps) {
  const [customPlatform, setCustomPlatform] = useState('');

  const togglePlatform = (platformId: string) => {
    const current = data.platformsUsed;
    if (current.includes(platformId)) {
      onUpdate({ platformsUsed: current.filter(p => p !== platformId) });
    } else {
      onUpdate({ platformsUsed: [...current, platformId] });
    }
  };

  const addCustomPlatform = () => {
    if (customPlatform.trim() && !data.platformsUsed.includes(customPlatform.trim().toLowerCase())) {
      onUpdate({ platformsUsed: [...data.platformsUsed, customPlatform.trim().toLowerCase()] });
      setCustomPlatform('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold mb-2">Vos sources de revenus</h2>
        <p className="text-muted-foreground">
          Sur quelles plateformes travaillez-vous actuellement ?
        </p>
      </div>

      <div className="space-y-6 max-w-md mx-auto">
        {/* Platform Grid */}
        <div className="grid grid-cols-2 gap-3">
          {COMMON_PLATFORMS.map((platform) => {
            const Icon = platform.icon;
            const isSelected = data.platformsUsed.includes(platform.id);
            
            return (
              <button
                key={platform.id}
                onClick={() => togglePlatform(platform.id)}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isSelected ? 'bg-primary/10' : 'bg-muted'
                }`}>
                  {isSelected ? (
                    <Check className="w-5 h-5 text-primary" />
                  ) : (
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <span className={`font-medium ${isSelected ? 'text-primary' : ''}`}>
                  {platform.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Add Custom Platform */}
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm font-medium mb-3">Autre plateforme ?</p>
            <div className="flex gap-2">
              <Input
                placeholder="Nom de la plateforme..."
                value={customPlatform}
                onChange={(e) => setCustomPlatform(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCustomPlatform()}
              />
              <Button onClick={addCustomPlatform} size="icon" variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Selected Platforms Summary */}
        {data.platformsUsed.length > 0 && (
          <Card className="bg-muted/50">
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground mb-2">
                {data.platformsUsed.length} plateforme(s) sélectionnée(s)
              </p>
              <div className="flex flex-wrap gap-2">
                {data.platformsUsed.map((p) => {
                  const platform = COMMON_PLATFORMS.find(cp => cp.id === p);
                  return (
                    <Badge 
                      key={p} 
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive/20 hover:text-destructive"
                      onClick={() => togglePlatform(p)}
                    >
                      {platform?.name || p}
                      <span className="ml-1">×</span>
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <p className="text-sm">
              <strong>💡 Conseil:</strong> Notre objectif est de vous aider à réduire 
              progressivement votre dépendance aux plateformes et à développer votre 
              clientèle directe pour plus d'indépendance et de revenus.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
