import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, Send, Star, Car, AlertTriangle, Hash, Phone, UserCheck, Wrench, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Partner {
  id: string;
  driver_id: string;
  commission_percentage: number;
  commission_type: string;
  commission_fixed_amount: number | null;
  status: string;
  default_equipment_type: string;
  partner_name: string;
  partner_photo: string | null;
  partner_company_name: string | null;
  partner_rating: number;
  partner_rides: number;
  partner_phone: string | null;
}

interface FleetShareCourseWithPartnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: {
    id: string;
    pickup_address: string;
    destination_address: string;
    scheduled_date: string;
    client_id?: string;
    price?: number;
  } | null;
  fleetManagerId: string;
  onSuccess: () => void;
}

type ShareMode = 'choose' | 'specific' | 'all';
type EquipmentType = 'driver_owned' | 'fleet_provided';

export function FleetShareCourseWithPartnerDialog({
  open,
  onOpenChange,
  course,
  fleetManagerId,
  onSuccess,
}: FleetShareCourseWithPartnerDialogProps) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [shareMode, setShareMode] = useState<ShareMode>('choose');
  const [equipmentType, setEquipmentType] = useState<EquipmentType>('driver_owned');

  useEffect(() => {
    if (open && fleetManagerId) {
      loadPartners();
      setShareMode('choose');
      setSelectedPartner(null);
    }
  }, [open, fleetManagerId]);

  useEffect(() => {
    if (selectedPartner) {
      setEquipmentType(selectedPartner.default_equipment_type as EquipmentType || 'driver_owned');
    }
  }, [selectedPartner]);

  const loadPartners = async () => {
    setLoading(true);
    try {
      const { data: partnershipsData, error } = await supabase
        .from('fleet_driver_partnerships')
        .select('*')
        .eq('fleet_manager_id', fleetManagerId)
        .eq('status', 'accepted');

      if (error) throw error;

      const enrichedPartners: Partner[] = [];
      for (const p of partnershipsData || []) {
        const { data: driverData } = await supabase
          .from('drivers')
          .select('rating, total_rides, user_id, company_name, contact_phone')
          .eq('id', p.driver_id)
          .single();

        if (driverData) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, profile_photo_url, phone')
            .eq('id', driverData.user_id)
            .single();

          enrichedPartners.push({
            ...p,
            partner_name: profileData?.full_name || 'Partenaire',
            partner_photo: profileData?.profile_photo_url,
            partner_company_name: driverData.company_name,
            partner_rating: driverData.rating || 0,
            partner_rides: driverData.total_rides || 0,
            partner_phone: driverData.contact_phone || profileData?.phone,
          });
        }
      }
      setPartners(enrichedPartners);
    } catch (error) {
      console.error('Error loading partners:', error);
      toast.error('Erreur lors du chargement des partenaires');
    } finally {
      setLoading(false);
    }
  };

  const calculateEarnings = (amount: number, partner: Partner) => {
    if (partner.commission_type === 'fixed' && partner.commission_fixed_amount) {
      return amount - partner.commission_fixed_amount;
    }
    return amount * (1 - partner.commission_percentage / 100);
  };

  const calculateCommission = (amount: number, partner: Partner) => {
    if (partner.commission_type === 'fixed' && partner.commission_fixed_amount) {
      return partner.commission_fixed_amount;
    }
    return amount * (partner.commission_percentage / 100);
  };

  const handleSendCourse = async () => {
    if (shareMode === 'specific' && !selectedPartner) {
      toast.error('Veuillez sélectionner un partenaire');
      return;
    }
    if (!course) return;
    
    // Vérifier si la course est déjà partagée
    const { data: lockStatus } = await supabase.rpc('is_fleet_course_shared_locked', {
      p_course_id: course.id
    });
    
    const lockResult = lockStatus as { is_locked?: boolean } | null;
    if (lockResult?.is_locked) {
      toast.error('Cette course est déjà partagée et en attente de réponse');
      return;
    }

    setSending(true);
    try {
      const poolGroupId = shareMode === 'all' ? crypto.randomUUID() : null;
      const courseAmount = course.price || 0;

      if (shareMode === 'all') {
        // Envoyer à tous les partenaires
        for (const partner of partners) {
          const commissionAmount = calculateCommission(courseAmount, partner);
          const earningsForDriver = calculateEarnings(courseAmount, partner);
          
          await supabase.from('fleet_partner_courses').insert({
            course_id: course.id,
            partnership_id: partner.id,
            fleet_manager_id: fleetManagerId,
            driver_id: partner.driver_id,
            course_amount: courseAmount,
            commission_percentage: partner.commission_percentage,
            commission_amount: commissionAmount,
            earnings_for_driver: earningsForDriver,
            equipment_type: partner.default_equipment_type || 'driver_owned',
            status: 'pending',
            sharing_mode: 'pool',
            pool_group_id: poolGroupId,
          });

          // Notifier le chauffeur
          const { data: driverData } = await supabase
            .from('drivers')
            .select('user_id')
            .eq('id', partner.driver_id)
            .single();

          if (driverData?.user_id) {
            await supabase.from('notifications').insert({
              user_id: driverData.user_id,
              title: '🚗 Nouvelle mission disponible',
              message: `Une mission est disponible pour le ${format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}`,
              type: 'info',
              link: '/driver-dashboard',
            });
          }
        }

        toast.success(`Course envoyée à ${partners.length} partenaires !`);
      } else if (shareMode === 'specific' && selectedPartner) {
        const commissionAmount = calculateCommission(courseAmount, selectedPartner);
        const earningsForDriver = calculateEarnings(courseAmount, selectedPartner);

        const { error } = await supabase.from('fleet_partner_courses').insert({
          course_id: course.id,
          partnership_id: selectedPartner.id,
          fleet_manager_id: fleetManagerId,
          driver_id: selectedPartner.driver_id,
          course_amount: courseAmount,
          commission_percentage: selectedPartner.commission_percentage,
          commission_amount: commissionAmount,
          earnings_for_driver: earningsForDriver,
          equipment_type: equipmentType,
          status: 'pending',
          sharing_mode: 'single',
        });

        if (error) throw error;

        // Notifier le chauffeur
        const { data: driverData } = await supabase
          .from('drivers')
          .select('user_id')
          .eq('id', selectedPartner.driver_id)
          .single();

        if (driverData?.user_id) {
          await supabase.from('notifications').insert({
            user_id: driverData.user_id,
            title: '🚗 Nouvelle mission assignée',
            message: `Une mission vous a été assignée pour le ${format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}`,
            type: 'info',
            link: '/driver-dashboard',
          });
        }

        toast.success(`Course envoyée à ${selectedPartner.partner_name} !`);
      }

      onOpenChange(false);
      setSelectedPartner(null);
      setShareMode('choose');
      onSuccess();
    } catch (error: any) {
      console.error('Error sending course:', error);
      toast.error(`Erreur lors de l'envoi: ${error?.message || 'Erreur inconnue'}`);
    } finally {
      setSending(false);
    }
  };

  if (!course) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Assigner à un partenaire
          </DialogTitle>
          <DialogDescription>
            Envoyez cette course à un chauffeur partenaire indépendant.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Course info */}
          <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
            <p className="text-muted-foreground text-xs">
              {format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
            </p>
            <p className="text-xs text-muted-foreground truncate">{course.pickup_address}</p>
            <p className="text-xs text-muted-foreground truncate">→ {course.destination_address}</p>
            {course.price && (
              <p className="text-primary font-semibold mt-2">{course.price.toFixed(2)}€</p>
            )}
          </div>

          {/* Share mode selection */}
          {shareMode === 'choose' && (
            <div className="space-y-3">
              <Label>Comment souhaitez-vous assigner ?</Label>
              {loading ? (
                <p className="text-sm text-muted-foreground">Chargement...</p>
              ) : partners.length === 0 ? (
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                  <p className="text-sm text-warning font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Aucun partenaire actif
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Créez un partenariat depuis l'onglet "Partenariats".
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-3"
                    onClick={() => setShareMode('specific')}
                  >
                    <UserCheck className="w-5 h-5 mr-3 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">Choisir un partenaire</p>
                      <p className="text-xs text-muted-foreground">
                        Sélectionnez un partenaire spécifique
                      </p>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-3"
                    onClick={() => setShareMode('all')}
                  >
                    <Users className="w-5 h-5 mr-3 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">Envoyer à tous ({partners.length})</p>
                      <p className="text-xs text-muted-foreground">
                        Le premier à accepter prend la course
                      </p>
                    </div>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Partner selection */}
          {shareMode === 'specific' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Sélectionner un partenaire</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setShareMode('choose');
                    setSelectedPartner(null);
                  }}
                >
                  Retour
                </Button>
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {partners.map((partner) => (
                  <div
                    key={partner.id}
                    onClick={() => setSelectedPartner(partner)}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedPartner?.id === partner.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={partner.partner_photo || undefined} />
                        <AvatarFallback>{partner.partner_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{partner.partner_name}</p>
                        {partner.partner_company_name && (
                          <p className="text-xs text-muted-foreground truncate">{partner.partner_company_name}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {partner.commission_type === 'fixed' 
                              ? `${partner.commission_fixed_amount}€` 
                              : `${partner.commission_percentage}%`}
                          </Badge>
                          {partner.partner_rating > 0 && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                              {partner.partner_rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Equipment type selection */}
              {selectedPartner && (
                <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                  <Label className="text-sm">Type d'équipement</Label>
                  <RadioGroup
                    value={equipmentType}
                    onValueChange={(v) => setEquipmentType(v as EquipmentType)}
                    className="grid grid-cols-2 gap-2"
                  >
                    <div className={`flex items-center space-x-2 p-2 border rounded-lg cursor-pointer ${equipmentType === 'driver_owned' ? 'border-primary bg-primary/5' : ''}`}>
                      <RadioGroupItem value="driver_owned" id="driver_owned" />
                      <Label htmlFor="driver_owned" className="flex items-center gap-1 cursor-pointer text-xs">
                        <User className="w-3 h-3" />
                        Son véhicule
                      </Label>
                    </div>
                    <div className={`flex items-center space-x-2 p-2 border rounded-lg cursor-pointer ${equipmentType === 'fleet_provided' ? 'border-primary bg-primary/5' : ''}`}>
                      <RadioGroupItem value="fleet_provided" id="fleet_provided" />
                      <Label htmlFor="fleet_provided" className="flex items-center gap-1 cursor-pointer text-xs">
                        <Wrench className="w-3 h-3" />
                        Véhicule flotte
                      </Label>
                    </div>
                  </RadioGroup>
                  
                  {/* Earnings preview */}
                  {course.price && (
                    <div className="mt-2 p-2 bg-background rounded text-xs">
                      <div className="flex justify-between">
                        <span>Montant course:</span>
                        <span className="font-medium">{course.price.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Commission flotte:</span>
                        <span>-{calculateCommission(course.price, selectedPartner).toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between text-success font-medium border-t mt-1 pt-1">
                        <span>Gains chauffeur:</span>
                        <span>{calculateEarnings(course.price, selectedPartner).toFixed(2)}€</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* All partners mode */}
          {shareMode === 'all' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Envoi groupé</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShareMode('choose')}
                >
                  Retour
                </Button>
              </div>
              <div className="p-4 bg-info/10 border border-info/20 rounded-lg">
                <p className="text-sm">
                  La course sera envoyée à <strong>{partners.length} partenaires</strong>.
                  Le premier à accepter prendra la mission.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSendCourse}
            disabled={sending || (shareMode === 'specific' && !selectedPartner) || shareMode === 'choose'}
            className="gap-2"
          >
            {sending ? (
              <>Envoi en cours...</>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Envoyer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
