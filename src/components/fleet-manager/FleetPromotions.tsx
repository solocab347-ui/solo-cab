import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Trash2, Tag, Percent, Gift, AlertCircle, Users } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface FleetPromotion {
  id: string;
  code: string;
  description: string | null;
  type: 'percentage' | 'fixed' | 'first_order';
  value: number;
  min_amount: number;
  max_uses: number | null;
  current_uses: number;
  valid_until: string | null;
  active: boolean;
  for_new_clients_only: boolean;
  created_at: string;
}

interface FleetPromotionsProps {
  fleetManagerId: string;
}

export default function FleetPromotions({ fleetManagerId }: FleetPromotionsProps) {
  const [promotions, setPromotions] = useState<FleetPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Paramètres première commande
  const [firstOrderSettings, setFirstOrderSettings] = useState({
    discount_percentage: 0,
    discount_fixed: 0,
    commission_reduction: 50
  });
  
  // Nouvelle promotion
  const [newPromo, setNewPromo] = useState({
    code: '',
    description: '',
    type: 'percentage' as 'percentage' | 'fixed' | 'first_order',
    value: 10,
    min_amount: 0,
    max_uses: null as number | null,
    valid_until: '',
    for_new_clients_only: false
  });

  useEffect(() => {
    fetchData();
  }, [fleetManagerId]);

  const fetchData = async () => {
    try {
      // Récupérer les promotions
      const { data: promos, error: promosError } = await supabase
        .from('fleet_promotions')
        .select('*')
        .eq('fleet_manager_id', fleetManagerId)
        .order('created_at', { ascending: false });

      if (promosError) throw promosError;
      setPromotions((promos || []) as FleetPromotion[]);

      // Récupérer les paramètres première commande
      const { data: settings, error: settingsError } = await supabase
        .from('fleet_managers')
        .select('first_order_discount_percentage, first_order_discount_fixed, first_order_commission_reduction')
        .eq('id', fleetManagerId)
        .single();

      if (settingsError) throw settingsError;
      if (settings) {
        setFirstOrderSettings({
          discount_percentage: settings.first_order_discount_percentage || 0,
          discount_fixed: settings.first_order_discount_fixed || 0,
          commission_reduction: settings.first_order_commission_reduction || 50
        });
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePromotion = async () => {
    if (!newPromo.code.trim()) {
      toast.error('Le code promo est requis');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('fleet_promotions')
        .insert({
          fleet_manager_id: fleetManagerId,
          code: newPromo.code.toUpperCase(),
          description: newPromo.description || null,
          type: newPromo.type,
          value: newPromo.value,
          min_amount: newPromo.min_amount,
          max_uses: newPromo.max_uses,
          valid_until: newPromo.valid_until || null,
          for_new_clients_only: newPromo.for_new_clients_only
        });

      if (error) throw error;
      
      toast.success('Promotion créée');
      setShowForm(false);
      setNewPromo({
        code: '',
        description: '',
        type: 'percentage',
        value: 10,
        min_amount: 0,
        max_uses: null,
        valid_until: '',
        for_new_clients_only: false
      });
      fetchData();
    } catch (error: any) {
      console.error('Erreur:', error);
      if (error.code === '23505') {
        toast.error('Ce code promo existe déjà');
      } else {
        toast.error('Erreur lors de la création');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePromotion = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('fleet_promotions')
        .update({ active })
        .eq('id', id);

      if (error) throw error;
      toast.success(active ? 'Promotion activée' : 'Promotion désactivée');
      fetchData();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDeletePromotion = async (id: string) => {
    if (!confirm('Supprimer cette promotion ?')) return;

    try {
      const { error } = await supabase
        .from('fleet_promotions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Promotion supprimée');
      fetchData();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSaveFirstOrderSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('fleet_managers')
        .update({
          first_order_discount_percentage: firstOrderSettings.discount_percentage,
          first_order_discount_fixed: firstOrderSettings.discount_fixed,
          first_order_commission_reduction: firstOrderSettings.commission_reduction
        })
        .eq('id', fleetManagerId);

      if (error) throw error;
      toast.success('Paramètres première commande mis à jour');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Paramètres première commande */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Première Commande - Nouveaux Clients
          </CardTitle>
          <CardDescription>
            Configurez les avantages pour attirer de nouveaux clients. La commission sur la première commande est automatiquement réduite de 50%.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Réduction en % sur la 1ère course</Label>
              <Input
                type="number"
                min="0"
                max="50"
                value={firstOrderSettings.discount_percentage}
                onChange={(e) => setFirstOrderSettings(prev => ({
                  ...prev,
                  discount_percentage: parseFloat(e.target.value) || 0
                }))}
              />
            </div>
            <div>
              <Label>OU Réduction fixe (€)</Label>
              <Input
                type="number"
                min="0"
                value={firstOrderSettings.discount_fixed}
                onChange={(e) => setFirstOrderSettings(prev => ({
                  ...prev,
                  discount_fixed: parseFloat(e.target.value) || 0
                }))}
              />
            </div>
            <div>
              <Label>Réduction commission (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={firstOrderSettings.commission_reduction}
                onChange={(e) => setFirstOrderSettings(prev => ({
                  ...prev,
                  commission_reduction: parseFloat(e.target.value) || 50
                }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Commission réduite de {firstOrderSettings.commission_reduction}% sur la 1ère course
              </p>
            </div>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Fonctionnement automatique :</p>
              <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                <li>Chaque nouveau client bénéficie de cette offre sur sa 1ère course</li>
                <li>Le chauffeur partenaire est notifié qu'il s'agit d'un nouveau client</li>
                <li>La commission prélevée est réduite selon votre paramètre</li>
              </ul>
            </div>
          </div>

          <Button onClick={handleSaveFirstOrderSettings} disabled={saving}>
            Enregistrer les paramètres
          </Button>
        </CardContent>
      </Card>

      {/* Liste des promotions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              Codes Promotionnels
            </CardTitle>
            <CardDescription>
              Créez des codes promo pour vos clients existants
            </CardDescription>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle promotion
          </Button>
        </CardHeader>
        <CardContent>
          {showForm && (
            <Card className="mb-6 border-primary/20">
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Code promo *</Label>
                    <Input
                      placeholder="EX: BIENVENUE10"
                      value={newPromo.code}
                      onChange={(e) => setNewPromo(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    />
                  </div>
                  <div>
                    <Label>Type de réduction</Label>
                    <Select
                      value={newPromo.type}
                      onValueChange={(value: 'percentage' | 'fixed') => 
                        setNewPromo(prev => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                        <SelectItem value="fixed">Montant fixe (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Valeur de la réduction</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newPromo.value}
                      onChange={(e) => setNewPromo(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label>Montant minimum (€)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newPromo.min_amount}
                      onChange={(e) => setNewPromo(prev => ({ ...prev, min_amount: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label>Utilisations max (vide = illimité)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newPromo.max_uses || ''}
                      onChange={(e) => setNewPromo(prev => ({ 
                        ...prev, 
                        max_uses: e.target.value ? parseInt(e.target.value) : null 
                      }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Date d'expiration (optionnel)</Label>
                    <Input
                      type="date"
                      value={newPromo.valid_until}
                      onChange={(e) => setNewPromo(prev => ({ ...prev, valid_until: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Description optionnelle..."
                      value={newPromo.description}
                      onChange={(e) => setNewPromo(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={newPromo.for_new_clients_only}
                    onCheckedChange={(checked) => setNewPromo(prev => ({ ...prev, for_new_clients_only: checked }))}
                  />
                  <Label>Réservé aux nouveaux clients uniquement</Label>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleCreatePromotion} disabled={saving}>
                    Créer la promotion
                  </Button>
                  <Button variant="outline" onClick={() => setShowForm(false)}>
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {promotions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune promotion créée</p>
            </div>
          ) : (
            <div className="space-y-4">
              {promotions.map((promo) => (
                <div 
                  key={promo.id} 
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {promo.type === 'percentage' ? (
                        <Percent className="h-5 w-5 text-primary" />
                      ) : (
                        <Tag className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{promo.code}</span>
                        <Badge variant={promo.active ? 'default' : 'secondary'}>
                          {promo.active ? 'Actif' : 'Inactif'}
                        </Badge>
                        {promo.for_new_clients_only && (
                          <Badge variant="outline" className="gap-1">
                            <Users className="h-3 w-3" />
                            Nouveaux clients
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {promo.type === 'percentage' ? `${promo.value}% de réduction` : `${promo.value}€ de réduction`}
                        {promo.min_amount > 0 && ` (min. ${promo.min_amount}€)`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Utilisé: {promo.current_uses}/{promo.max_uses || '∞'} fois
                        {promo.valid_until && ` • Expire le ${format(new Date(promo.valid_until), 'dd/MM/yyyy', { locale: fr })}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={promo.active}
                      onCheckedChange={(checked) => handleTogglePromotion(promo.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeletePromotion(promo.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
