import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Tag, Percent, Euro, Calendar, Users, Mail, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface DriverCampaignsProps {
  driverProfile: any;
}

interface Promotion {
  id: string;
  code: string;
  description: string;
  type: 'percentage' | 'fixed_amount';
  value: number;
  min_amount: number;
  max_uses: number | null;
  current_uses: number;
  valid_until: string | null;
  active: boolean;
  created_at: string;
}

interface Client {
  id: string;
  user_id: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export const DriverCampaigns = ({ driverProfile }: DriverCampaignsProps) => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    type: 'percentage' as 'percentage' | 'fixed_amount',
    value: '',
    min_amount: '0',
    max_uses: '',
    valid_until: '',
  });
  
  // Recipient selection state
  const [recipientType, setRecipientType] = useState<'all' | 'selected'>('all');
  const [selectedClients, setSelectedClients] = useState<string[]>([]);

  useEffect(() => {
    if (driverProfile?.driver?.id) {
      fetchPromotions();
      fetchClients();
    }
  }, [driverProfile?.driver?.id]);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const driverId = driverProfile?.driver?.id;
      if (!driverId) return;

      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromotions((data || []) as Promotion[]);
    } catch (error) {
      console.error('Erreur lors du chargement des promotions:', error);
      toast.error('Erreur lors du chargement des promotions');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const driverId = driverProfile?.driver?.id;
      if (!driverId) return;

      const { data, error } = await supabase
        .from('clients')
        .select(`
          id,
          user_id,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`);

      if (error) throw error;
      setClients((data || []) as Client[]);
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error);
    }
  };

  const handleCreatePromotion = async () => {
    try {
      const driverId = driverProfile?.driver?.id;
      if (!driverId) return;

      if (!formData.code || !formData.value) {
        toast.error('Code et valeur requis');
        return;
      }

      if (recipientType === 'selected' && selectedClients.length === 0) {
        toast.error('Sélectionnez au moins un client');
        return;
      }

      // Insert promotion
      const { data: newPromo, error } = await supabase
        .from('promotions')
        .insert({
          driver_id: driverId,
          code: formData.code.toUpperCase(),
          description: formData.description,
          type: formData.type,
          value: parseFloat(formData.value),
          min_amount: parseFloat(formData.min_amount) || 0,
          max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
          valid_until: formData.valid_until || null,
          active: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Assign to clients
      const clientsToAssign = recipientType === 'all' 
        ? clients.map(c => c.id) 
        : selectedClients;

      if (clientsToAssign.length > 0) {
        const assignments = clientsToAssign.map(clientId => ({
          promotion_id: newPromo.id,
          client_id: clientId,
        }));

        const { error: assignError } = await supabase
          .from('promotion_assignments')
          .insert(assignments);

        if (assignError) throw assignError;
      }

      toast.success(`Code promo créé et envoyé à ${clientsToAssign.length} client(s)`);
      setShowCreateDialog(false);
      setFormData({
        code: '',
        description: '',
        type: 'percentage',
        value: '',
        min_amount: '0',
        max_uses: '',
        valid_until: '',
      });
      setRecipientType('all');
      setSelectedClients([]);
      fetchPromotions();
    } catch (error: any) {
      console.error('Erreur lors de la création:', error);
      if (error.code === '23505') {
        toast.error('Ce code promo existe déjà');
      } else {
        toast.error('Erreur lors de la création du code promo');
      }
    }
  };

  const toggleClientSelection = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const togglePromotionStatus = async (promoId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('promotions')
        .update({ active: !currentStatus })
        .eq('id', promoId);

      if (error) throw error;

      toast.success(currentStatus ? 'Code promo désactivé' : 'Code promo activé');
      fetchPromotions();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Chargement des promotions...</div>;
  }

  return (
    <div className="space-y-6 p-4">
      {/* Warning légal */}
      <Alert variant="destructive" className="border-destructive/50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Attention :</strong> La vente à perte est interdite. Utilisez les promotions avec mesure et assurez-vous que votre tarification reste rentable après réduction.
        </AlertDescription>
      </Alert>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">🎁 Codes Promo & Campagnes</h2>
          <p className="text-sm text-muted-foreground mt-1">Créez des codes promo pour attirer vos clients</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Créer un code promo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Créer un code promo</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="code">Code promo *</Label>
                <Input
                  id="code"
                  placeholder="Ex: BIENVENUE20"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Ex: Bienvenue - 20% de réduction"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="type">Type de réduction *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                    <SelectItem value="fixed_amount">Montant fixe (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="value">
                  Valeur * {formData.type === 'percentage' ? '(%)' : '(€)'}
                </Label>
                <Input
                  id="value"
                  type="number"
                  placeholder={formData.type === 'percentage' ? "Ex: 20" : "Ex: 10"}
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="min_amount">Montant minimum de course (€)</Label>
                <Input
                  id="min_amount"
                  type="number"
                  placeholder="Ex: 20"
                  value={formData.min_amount}
                  onChange={(e) => setFormData({ ...formData, min_amount: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="max_uses">Nombre max d'utilisations</Label>
                <Input
                  id="max_uses"
                  type="number"
                  placeholder="Ex: 100 (laisser vide pour illimité)"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="valid_until">Valable jusqu'au</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                />
              </div>

              {/* Recipient selection */}
              <div className="space-y-4 pt-4 border-t">
                <Label>Destinataires</Label>
                <RadioGroup value={recipientType} onValueChange={(value: any) => setRecipientType(value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all" className="font-normal cursor-pointer">
                      Tous mes clients ({clients.length})
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="selected" id="selected" />
                    <Label htmlFor="selected" className="font-normal cursor-pointer">
                      Sélection manuelle
                    </Label>
                  </div>
                </RadioGroup>

                {recipientType === 'selected' && (
                  <ScrollArea className="h-[200px] border rounded-md p-4">
                    <div className="space-y-2">
                      {clients.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucun client disponible</p>
                      ) : (
                        clients.map((client) => (
                          <div key={client.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={client.id}
                              checked={selectedClients.includes(client.id)}
                              onCheckedChange={() => toggleClientSelection(client.id)}
                            />
                            <Label
                              htmlFor={client.id}
                              className="font-normal cursor-pointer flex-1"
                            >
                              {client.profiles?.full_name || 'Client'} - {client.profiles?.email || ''}
                            </Label>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                )}
              </div>

              <Button onClick={handleCreatePromotion} className="w-full">
                Créer et envoyer le code promo
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Promotions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {promotions.length === 0 ? (
          <Card className="col-span-full p-8 text-center">
            <Tag className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Aucun code promo créé</p>
            <p className="text-sm text-muted-foreground mt-2">
              Créez votre premier code promo pour attirer des clients
            </p>
          </Card>
        ) : (
          promotions.map((promo) => (
            <Card key={promo.id} className={`p-6 ${promo.active ? 'bg-gradient-success' : 'bg-muted'}`}>
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Tag className={`w-5 h-5 ${promo.active ? 'text-success-foreground' : 'text-muted-foreground'}`} />
                      <h3 className={`text-xl font-bold ${promo.active ? 'text-success-foreground' : 'text-muted-foreground'}`}>
                        {promo.code}
                      </h3>
                    </div>
                    {promo.description && (
                      <p className={`text-sm ${promo.active ? 'text-success-foreground/80' : 'text-muted-foreground'}`}>
                        {promo.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {promo.type === 'percentage' ? (
                      <Percent className={`w-4 h-4 ${promo.active ? 'text-success-foreground' : 'text-muted-foreground'}`} />
                    ) : (
                      <Euro className={`w-4 h-4 ${promo.active ? 'text-success-foreground' : 'text-muted-foreground'}`} />
                    )}
                    <span className={`text-lg font-semibold ${promo.active ? 'text-success-foreground' : 'text-muted-foreground'}`}>
                      {promo.type === 'percentage' ? `${promo.value}%` : `${promo.value}€`}
                    </span>
                  </div>

                  {promo.min_amount > 0 && (
                    <p className={`text-sm ${promo.active ? 'text-success-foreground/80' : 'text-muted-foreground'}`}>
                      Minimum: {promo.min_amount}€
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <Users className={`w-4 h-4 ${promo.active ? 'text-success-foreground' : 'text-muted-foreground'}`} />
                    <span className={`text-sm ${promo.active ? 'text-success-foreground/80' : 'text-muted-foreground'}`}>
                      {promo.current_uses} / {promo.max_uses || '∞'} utilisations
                    </span>
                  </div>

                  {promo.valid_until && (
                    <div className="flex items-center gap-2">
                      <Calendar className={`w-4 h-4 ${promo.active ? 'text-success-foreground' : 'text-muted-foreground'}`} />
                      <span className={`text-sm ${promo.active ? 'text-success-foreground/80' : 'text-muted-foreground'}`}>
                        Jusqu'au {new Date(promo.valid_until).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  variant={promo.active ? "outline" : "default"}
                  size="sm"
                  className="w-full"
                  onClick={() => togglePromotionStatus(promo.id, promo.active)}
                >
                  {promo.active ? 'Désactiver' : 'Activer'}
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Campagnes Email (coming soon) */}
      <Card className="p-8 text-center bg-gradient-trust border-0">
        <Mail className="w-12 h-12 mx-auto mb-4 text-trust-foreground" />
        <h3 className="text-xl font-bold mb-2 text-trust-foreground">Campagnes Email</h3>
        <p className="text-trust-foreground/80">
          Fonctionnalité à venir : envoyez vos codes promo par email à vos clients
        </p>
      </Card>
    </div>
  );
};