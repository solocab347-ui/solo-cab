import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, Star, Car, Users, Shield } from "lucide-react";

interface PartnerInfo {
  shared_course_id: string;
  shared_status: string;
  partner_driver_id: string;
  partner_name: string;
  partner_photo: string | null;
  partner_company: string | null;
  partner_phone: string | null;
  partner_vehicle_model: string | null;
  partner_vehicle_color: string | null;
  partner_rating: number | null;
  partner_total_rides: number | null;
  show_rating: boolean;
  show_phone: boolean;
}

interface Props {
  courseId: string;
  userId: string;
}

export function SharedCoursePartnerInfo({ courseId, userId }: Props) {
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPartnerInfo();
  }, [courseId, userId]);

  const loadPartnerInfo = async () => {
    try {
      const { data, error } = await supabase.rpc('get_course_partner_info', {
        p_course_id: courseId,
        p_client_user_id: userId
      });

      if (error) {
        console.error('Error loading partner info:', error);
        return;
      }

      if (data && data.length > 0) {
        setPartnerInfo(data[0]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !partnerInfo) {
    return null;
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'En attente de confirmation', color: 'bg-amber-500/10 text-amber-600' };
      case 'accepted':
        return { label: 'Confirmé', color: 'bg-green-500/10 text-green-600' };
      case 'in_progress':
        return { label: 'En route', color: 'bg-blue-500/10 text-blue-600' };
      case 'completed':
        return { label: 'Terminée', color: 'bg-primary/10 text-primary' };
      default:
        return { label: status, color: 'bg-muted text-muted-foreground' };
    }
  };

  const statusInfo = getStatusLabel(partnerInfo.shared_status);

  return (
    <Card className="p-4 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-500/30">
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar className="h-14 w-14 border-2 border-violet-500/30">
            <AvatarImage src={partnerInfo.partner_photo || undefined} />
            <AvatarFallback className="bg-violet-500/20 text-violet-600 text-lg">
              {partnerInfo.partner_name?.charAt(0) || 'P'}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 bg-violet-500 rounded-full p-1">
            <Shield className="h-3 w-3 text-white" />
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-violet-600 uppercase tracking-wide">
              Partenaire de confiance
            </span>
          </div>
          
          <h4 className="font-semibold text-base">{partnerInfo.partner_name}</h4>
          
          {partnerInfo.partner_company && (
            <p className="text-sm text-muted-foreground">{partnerInfo.partner_company}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-2">
            {partnerInfo.show_rating && partnerInfo.partner_rating && (
              <div className="flex items-center gap-1 text-sm">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                <span className="font-medium">{partnerInfo.partner_rating.toFixed(1)}</span>
              </div>
            )}
            
            {partnerInfo.partner_total_rides && partnerInfo.partner_total_rides > 0 && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{partnerInfo.partner_total_rides} courses</span>
              </div>
            )}
            
            {(partnerInfo.partner_vehicle_model || partnerInfo.partner_vehicle_color) && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Car className="h-3 w-3" />
                <span>
                  {/* Affichage: modèle en premier, couleur à la fin */}
                  {[partnerInfo.partner_vehicle_model, partnerInfo.partner_vehicle_color]
                    .filter(Boolean)
                    .join(' ')}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-3">
            <Badge className={statusInfo.color}>
              {statusInfo.label}
            </Badge>

            {partnerInfo.show_phone && partnerInfo.partner_phone && (
              <Button
                size="sm"
                variant="outline"
                className="border-violet-500/30 text-violet-600 hover:bg-violet-500/10"
                onClick={() => window.open(`tel:${partnerInfo.partner_phone}`, '_self')}
              >
                <Phone className="h-4 w-4 mr-1" />
                Appeler
              </Button>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-violet-500/20">
        Votre chauffeur habituel a confié cette course à un partenaire de son réseau de confiance.
      </p>
    </Card>
  );
}
