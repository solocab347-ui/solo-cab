import { useState, useEffect, useCallback, memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useFleetDispatch } from "@/hooks/useFleetDispatch";
import {
  Loader2,
  MapPin,
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Bell,
  Building,
  Users,
  AlertTriangle,
  Timer,
  Zap,
} from "lucide-react";

interface DriverDispatchRequestsProps {
  driverId: string;
}

interface DispatchRequest {
  id: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  passengers_count: number;
  notes: string | null;
  timeout_at: string | null;
  fleet_manager?: {
    id: string;
    company_name: string;
    logo_url: string | null;
  };
  client?: {
    profile?: {
      full_name: string;
    };
  };
  response?: {
    notified_at: string;
    response: string | null;
  };
}

const DispatchRequestCard = memo(({ 
  request, 
  onAccept, 
  onDecline,
  loading 
}: { 
  request: DispatchRequest; 
  onAccept: () => void; 
  onDecline: () => void;
  loading: boolean;
}) => {
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    if (!request.timeout_at) return;

    const updateTimer = () => {
      const now = new Date();
      const timeout = new Date(request.timeout_at!);
      const diff = timeout.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining("Expiré");
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, "0")}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [request.timeout_at]);

  const isExpired = timeRemaining === "Expiré";

  return (
    <Card className={`overflow-hidden transition-all ${isExpired ? "opacity-60" : "border-primary/50 shadow-lg"}`}>
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/10 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-primary/30">
              <AvatarImage src={request.fleet_manager?.logo_url || undefined} />
              <AvatarFallback className="bg-primary/20">
                <Building className="w-5 h-5" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">
                {request.fleet_manager?.company_name || "Gestionnaire de flotte"}
              </CardTitle>
              <CardDescription className="flex items-center gap-1">
                <Bell className="w-3 h-3" />
                Nouvelle mission
              </CardDescription>
            </div>
          </div>
          
          {request.timeout_at && (
            <Badge 
              variant={isExpired ? "destructive" : "outline"} 
              className={`gap-1 ${!isExpired && "bg-warning/10 text-warning border-warning/30"}`}
            >
              <Timer className="w-3 h-3" />
              {timeRemaining}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Client info */}
        <div className="flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">
            Client : {request.client?.profile?.full_name || "Non spécifié"}
          </span>
        </div>

        {/* Addresses */}
        <div className="space-y-2 p-3 rounded-lg bg-muted/50">
          <div className="flex items-start gap-2">
            <div className="mt-1">
              <div className="w-3 h-3 rounded-full bg-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Départ</p>
              <p className="font-medium">{request.pickup_address}</p>
            </div>
          </div>
          <div className="border-l-2 border-dashed border-muted-foreground/30 ml-1.5 h-4" />
          <div className="flex items-start gap-2">
            <div className="mt-1">
              <div className="w-3 h-3 rounded-full bg-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Arrivée</p>
              <p className="font-medium">{request.destination_address}</p>
            </div>
          </div>
        </div>

        {/* Date & passengers */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span>{format(new Date(request.scheduled_date), "EEEE dd MMMM", { locale: fr })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span>{format(new Date(request.scheduled_date), "HH:mm")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span>{request.passengers_count} passager{request.passengers_count > 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Notes */}
        {request.notes && (
          <div className="p-2 rounded bg-muted text-sm">
            <p className="text-muted-foreground">{request.notes}</p>
          </div>
        )}

        {/* Actions */}
        {!isExpired && (
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 gap-2 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={onDecline}
              disabled={loading}
            >
              <XCircle className="w-4 h-4" />
              Refuser
            </Button>
            <Button
              className="flex-1 gap-2 bg-success hover:bg-success/90"
              onClick={onAccept}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Accepter
            </Button>
          </div>
        )}

        {isExpired && (
          <div className="flex items-center justify-center gap-2 py-2 text-muted-foreground">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">Cette demande a expiré</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

DispatchRequestCard.displayName = "DispatchRequestCard";

export const DriverDispatchRequests = ({ driverId }: DriverDispatchRequestsProps) => {
  const [requests, setRequests] = useState<DispatchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const { respondToDispatch, loading: responding } = useFleetDispatch();

  const fetchRequests = useCallback(async () => {
    try {
      // Récupérer les dispatches où ce chauffeur est notifié et n'a pas encore répondu
      const { data: responses, error: respError } = await supabase
        .from("fleet_dispatch_responses")
        .select(`
          dispatch_id,
          notified_at,
          response,
          dispatch:fleet_dispatch_queue(
            id,
            pickup_address,
            destination_address,
            scheduled_date,
            passengers_count,
            notes,
            timeout_at,
            status,
            fleet_manager_id,
            client_id
          )
        `)
        .eq("driver_id", driverId)
        .is("response", null);

      if (respError) throw respError;

      const validResponses = (responses || []).filter(
        (r: any) => r.dispatch && ["dispatching", "pending"].includes(r.dispatch.status)
      );

      if (validResponses.length > 0) {
        const fleetManagerIds = [...new Set(validResponses.map((r: any) => r.dispatch.fleet_manager_id))];
        const clientIds = [...new Set(validResponses.map((r: any) => r.dispatch.client_id).filter(Boolean))];

        const [{ data: fleetManagers }, { data: clients }] = await Promise.all([
          supabase
            .from("fleet_managers")
            .select("id, company_name, logo_url")
            .in("id", fleetManagerIds),
          clientIds.length > 0
            ? supabase
                .from("clients")
                .select("id, user_id")
                .in("id", clientIds)
            : { data: [] },
        ]);

        const clientUserIds = (clients || []).map((c: any) => c.user_id);
        const { data: profiles } = clientUserIds.length > 0
          ? await supabase.from("profiles").select("id, full_name").in("id", clientUserIds)
          : { data: [] };

        const enrichedRequests = validResponses.map((r: any) => ({
          id: r.dispatch.id,
          pickup_address: r.dispatch.pickup_address,
          destination_address: r.dispatch.destination_address,
          scheduled_date: r.dispatch.scheduled_date,
          passengers_count: r.dispatch.passengers_count,
          notes: r.dispatch.notes,
          timeout_at: r.dispatch.timeout_at,
          fleet_manager: fleetManagers?.find((fm) => fm.id === r.dispatch.fleet_manager_id),
          client: r.dispatch.client_id
            ? {
                profile: profiles?.find(
                  (p) => p.id === clients?.find((c: any) => c.id === r.dispatch.client_id)?.user_id
                ),
              }
            : null,
          response: {
            notified_at: r.notified_at,
            response: r.response,
          },
        }));

        setRequests(enrichedRequests);
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error("Error fetching dispatch requests:", error);
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    fetchRequests();

    // Realtime subscription pour les nouvelles demandes
    const channel = supabase
      .channel("driver-dispatch-requests")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fleet_dispatch_responses",
          filter: `driver_id=eq.${driverId}`,
        },
        () => fetchRequests()
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "fleet_dispatch_queue",
        },
        () => fetchRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId, fetchRequests]);

  const handleAccept = async (dispatchId: string) => {
    const result = await respondToDispatch(dispatchId, driverId, "accepted");
    if (result.success) {
      fetchRequests();
    }
  };

  const handleDecline = (dispatchId: string) => {
    setSelectedRequest(dispatchId);
    setDeclineDialogOpen(true);
  };

  const confirmDecline = async () => {
    if (!selectedRequest) return;
    
    const result = await respondToDispatch(selectedRequest, driverId, "declined", declineReason || undefined);
    if (result.success) {
      setDeclineDialogOpen(false);
      setSelectedRequest(null);
      setDeclineReason("");
      fetchRequests();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative">
          <Zap className="w-5 h-5 text-primary" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-pulse" />
        </div>
        <h3 className="font-semibold">
          Nouvelles missions ({requests.length})
        </h3>
      </div>

      <div className="space-y-4">
        {requests.map((request) => (
          <DispatchRequestCard
            key={request.id}
            request={request}
            onAccept={() => handleAccept(request.id)}
            onDecline={() => handleDecline(request.id)}
            loading={responding}
          />
        ))}
      </div>

      {/* Dialog de refus */}
      <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser la mission</DialogTitle>
            <DialogDescription>
              Indiquez la raison de votre refus (optionnel)
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Raison du refus..."
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDecline}
              disabled={responding}
            >
              {responding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
