import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DriverPlatform, DEFAULT_PLATFORMS } from './types';
import { toast } from 'sonner';
import { 
  Plus, 
  Trash2, 
  Car, 
  Zap, 
  Music, 
  Briefcase, 
  Navigation, 
  Crown, 
  Star, 
  Users,
  Sparkles,
  Loader2
} from 'lucide-react';

interface PlatformsManagerProps {
  platforms: DriverPlatform[];
  onAdd: (name: string, icon: string) => Promise<any>;
  onRemove: (id: string) => Promise<void>;
}

const ICON_MAP: Record<string, any> = {
  car: Car,
  zap: Zap,
  music: Music,
  briefcase: Briefcase,
  navigation: Navigation,
  crown: Crown,
  star: Star,
  users: Users,
};

export function PlatformsManager({ platforms, onAdd, onRemove }: PlatformsManagerProps) {
  const [newPlatform, setNewPlatform] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('car');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const handleAddPlatform = async () => {
    if (!newPlatform.trim()) {
      toast.error('Entrez un nom de plateforme');
      return;
    }

    if (platforms.some(p => p.platform_name.toLowerCase() === newPlatform.toLowerCase())) {
      toast.error('Cette plateforme existe déjà');
      return;
    }

    setAdding(true);
    try {
      await onAdd(newPlatform.trim(), selectedIcon);
      setNewPlatform('');
      toast.success('Plateforme ajoutée');
    } catch (error) {
      toast.error('Erreur lors de l\'ajout');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    setRemoving(id);
    try {
      await onRemove(id);
      toast.success('Plateforme supprimée');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    } finally {
      setRemoving(null);
    }
  };

  const handleQuickAdd = async (name: string, icon: string) => {
    if (platforms.some(p => p.platform_name.toLowerCase() === name.toLowerCase())) {
      toast.error('Cette plateforme existe déjà');
      return;
    }

    setAdding(true);
    try {
      await onAdd(name, icon);
      toast.success(`${name} ajouté`);
    } catch (error) {
      toast.error('Erreur lors de l\'ajout');
    } finally {
      setAdding(false);
    }
  };

  const availableQuickPlatforms = DEFAULT_PLATFORMS.filter(
    dp => !platforms.some(p => p.platform_name.toLowerCase() === dp.name.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* SoloCab Info */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold">SoloCab</h4>
              <p className="text-sm text-muted-foreground">
                Données récupérées automatiquement depuis vos courses
              </p>
            </div>
            <Badge className="ml-auto bg-primary/20 text-primary">Auto</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Current Platforms */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mes plateformes externes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {platforms.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune plateforme externe configurée
            </p>
          ) : (
            platforms.map((platform) => {
              const Icon = ICON_MAP[platform.platform_icon] || Car;
              return (
                <div 
                  key={platform.id} 
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="font-medium">{platform.platform_name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(platform.id)}
                    disabled={removing === platform.id}
                    className="text-destructive hover:text-destructive"
                  >
                    {removing === platform.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Quick Add */}
      {availableQuickPlatforms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ajout rapide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {availableQuickPlatforms.map((dp) => {
                const Icon = ICON_MAP[dp.icon] || Car;
                return (
                  <Button
                    key={dp.name}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAdd(dp.name, dp.icon)}
                    disabled={adding}
                    className="gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {dp.name}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Add */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ajouter une plateforme personnalisée</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Input
                value={newPlatform}
                onChange={(e) => setNewPlatform(e.target.value)}
                placeholder="Nom de la plateforme"
                onKeyDown={(e) => e.key === 'Enter' && handleAddPlatform()}
              />
            </div>
            <Select value={selectedIcon} onValueChange={setSelectedIcon}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ICON_MAP).map(([key, Icon]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {key}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={handleAddPlatform} 
            className="w-full"
            disabled={adding || !newPlatform.trim()}
          >
            {adding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Ajouter la plateforme
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
