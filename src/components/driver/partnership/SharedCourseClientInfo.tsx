import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, User, Clock, Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ClientInfo {
  client_name: string;
  client_phone: string | null;
  client_photo: string | null;
}

interface Props {
  sharedCourseId: string;
  driverId: string;
  sharedStatus: string;
}

export function SharedCourseClientInfo({ sharedCourseId, driverId, sharedStatus }: Props) {
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    loadClientInfo();
  }, [sharedCourseId, driverId, sharedStatus]);

  const loadClientInfo = async () => {
    // Si la course est terminée ou refusée, pas d'accès aux infos client
    if (sharedStatus === 'completed' || sharedStatus === 'declined') {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_shared_course_client_info', {
        p_shared_course_id: sharedCourseId,
        p_receiver_driver_id: driverId
      });

      if (error) {
        console.error('Error loading client info:', error);
        setAccessDenied(true);
        return;
      }

      if (data && data.length > 0) {
        setClientInfo(data[0]);
      } else {
        setAccessDenied(true);
      }
    } catch (error) {
      console.error('Error:', error);
      setAccessDenied(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-muted/50 h-20 rounded-lg" />
    );
  }

  if (accessDenied) {
    return (
      <Alert className="bg-muted/30 border-muted">
        <Clock className="h-4 w-4" />
        <AlertDescription className="text-sm">
          {sharedStatus === 'completed' 
            ? "Les informations du client ne sont plus accessibles après la fin de la course."
            : "Accès aux informations client restreint."}
        </AlertDescription>
      </Alert>
    );
  }

  if (!clientInfo) {
    return null;
  }

  return (
    <Card className="p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar className="h-12 w-12 border-2 border-blue-500/30">
            <AvatarImage src={clientInfo.client_photo || undefined} />
            <AvatarFallback className="bg-blue-500/20 text-blue-600">
              {clientInfo.client_name?.charAt(0) || 'C'}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
            <User className="h-3 w-3 text-white" />
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">
              Client
            </span>
            <Shield className="h-3 w-3 text-blue-500" />
          </div>
          <h4 className="font-semibold">{clientInfo.client_name}</h4>
        </div>

        {clientInfo.client_phone && (
          <Button
            size="sm"
            className="bg-blue-500 hover:bg-blue-600 text-white"
            onClick={() => window.open(`tel:${clientInfo.client_phone}`, '_self')}
          >
            <Phone className="h-4 w-4 mr-1" />
            Appeler
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-blue-500/20 flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Accès temporaire - Les informations client ne seront plus visibles après la course.
      </p>
    </Card>
  );
}
