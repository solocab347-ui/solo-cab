import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  ArrowUpCircle, Check, X, Clock, Loader2, User, 
  Building2, MessageSquare, Calendar, Sparkles 
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface UpgradeRequest {
  id: string;
  employee_id: string;
  company_id: string;
  user_id: string;
  request_message: string | null;
  status: string;
  response_message: string | null;
  responded_at: string | null;
  created_at: string;
  employee?: {
    id: string;
    department: string | null;
    job_title: string | null;
    user_id: string;
  };
  profile?: {
    full_name: string | null;
    email: string | null;
    profile_photo_url: string | null;
  };
}

interface EmployeeUpgradeRequestsManagerProps {
  companyId: string;
}

export function EmployeeUpgradeRequestsManager({ companyId }: EmployeeUpgradeRequestsManagerProps) {
  const [selectedRequest, setSelectedRequest] = useState<UpgradeRequest | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [responseType, setResponseType] = useState<"approve" | "reject" | null>(null);
  const queryClient = useQueryClient();

  // Fetch all upgrade requests for this company
  const { data: requests, isLoading } = useQuery({
    queryKey: ["employee-upgrade-requests", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_role_upgrade_requests")
        .select(`
          id,
          employee_id,
          company_id,
          user_id,
          request_message,
          status,
          response_message,
          responded_at,
          created_at
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Enrich with employee and profile data
      const enrichedRequests = await Promise.all(
        (data || []).map(async (req) => {
          // Get employee info
          const { data: employeeData } = await supabase
            .from("company_employees")
            .select("id, department, job_title, user_id")
            .eq("id", req.employee_id)
            .maybeSingle();

          // Get profile info
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name, email, profile_photo_url")
            .eq("id", req.user_id)
            .maybeSingle();

          return {
            ...req,
            employee: employeeData,
            profile: profileData,
          } as UpgradeRequest;
        })
      );

      return enrichedRequests;
    },
  });

  // Respond to request mutation
  const respondMutation = useMutation({
    mutationFn: async ({ requestId, approved }: { requestId: string; approved: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Update request status
      const { error: updateError } = await supabase
        .from("employee_role_upgrade_requests")
        .update({
          status: approved ? "approved" : "rejected",
          response_message: responseMessage || null,
          responded_by: user.id,
          responded_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // If approved, update employee permissions
      if (approved && selectedRequest) {
        const { error: employeeError } = await supabase
          .from("company_employees")
          .update({
            can_create_courses: true,
            can_view_invoices: true,
          })
          .eq("id", selectedRequest.employee_id);

        if (employeeError) throw employeeError;
      }
    },
    onSuccess: (_, { approved }) => {
      toast.success(approved ? "Demande approuvée !" : "Demande refusée");
      setSelectedRequest(null);
      setResponseMessage("");
      setResponseType(null);
      queryClient.invalidateQueries({ queryKey: ["employee-upgrade-requests", companyId] });
    },
    onError: (error: any) => {
      console.error("Error responding to request:", error);
      toast.error("Erreur lors du traitement de la demande");
    },
  });

  const pendingRequests = requests?.filter((r) => r.status === "pending") || [];
  const processedRequests = requests?.filter((r) => r.status !== "pending") || [];

  const openResponseDialog = (request: UpgradeRequest, type: "approve" | "reject") => {
    setSelectedRequest(request);
    setResponseType(type);
    setResponseMessage("");
  };

  const handleRespond = () => {
    if (!selectedRequest || !responseType) return;
    respondMutation.mutate({
      requestId: selectedRequest.id,
      approved: responseType === "approve",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <ArrowUpCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            Aucune demande de promotion pour le moment
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Demandes de promotion
        </h2>
        {pendingRequests.length > 0 && (
          <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">
            {pendingRequests.length} en attente
          </Badge>
        )}
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-4 h-4" />
            En attente ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="processed" className="gap-2">
            <Check className="w-4 h-4" />
            Traitées ({processedRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 mt-4">
          {pendingRequests.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Aucune demande en attente
            </p>
          ) : (
            pendingRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onApprove={() => openResponseDialog(request, "approve")}
                onReject={() => openResponseDialog(request, "reject")}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="processed" className="space-y-3 mt-4">
          {processedRequests.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Aucune demande traitée
            </p>
          ) : (
            processedRequests.map((request) => (
              <ProcessedRequestCard key={request.id} request={request} />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Response Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {responseType === "approve" ? "Approuver la demande" : "Refuser la demande"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedRequest && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar>
                  <AvatarImage src={selectedRequest.profile?.profile_photo_url || undefined} />
                  <AvatarFallback>
                    {selectedRequest.profile?.full_name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedRequest.profile?.full_name || "Collaborateur"}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedRequest.employee?.job_title || selectedRequest.employee?.department || ""}
                  </p>
                </div>
              </div>
            )}

            {responseType === "approve" && (
              <p className="text-sm text-muted-foreground">
                En approuvant cette demande, le collaborateur pourra :
              </p>
            )}
            {responseType === "approve" && (
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Créer ses propres réservations de courses</li>
                <li>Consulter les factures</li>
              </ul>
            )}

            <Textarea
              placeholder={
                responseType === "approve"
                  ? "Message optionnel pour le collaborateur..."
                  : "Expliquez la raison du refus..."
              }
              value={responseMessage}
              onChange={(e) => setResponseMessage(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Annuler
            </Button>
            <Button
              variant={responseType === "approve" ? "default" : "destructive"}
              onClick={handleRespond}
              disabled={respondMutation.isPending}
            >
              {respondMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : responseType === "approve" ? (
                <Check className="w-4 h-4 mr-2" />
              ) : (
                <X className="w-4 h-4 mr-2" />
              )}
              {responseType === "approve" ? "Approuver" : "Refuser"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RequestCard({
  request,
  onApprove,
  onReject,
}: {
  request: UpgradeRequest;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start gap-4">
          <Avatar>
            <AvatarImage src={request.profile?.profile_photo_url || undefined} />
            <AvatarFallback>
              {request.profile?.full_name?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">{request.profile?.full_name || "Collaborateur"}</p>
                <p className="text-sm text-muted-foreground">
                  {request.employee?.job_title || request.employee?.department || request.profile?.email}
                </p>
              </div>
              <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30 flex-shrink-0">
                <Clock className="w-3 h-3 mr-1" />
                En attente
              </Badge>
            </div>

            {request.request_message && (
              <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                <MessageSquare className="w-3 h-3 inline mr-1 text-muted-foreground" />
                {request.request_message}
              </div>
            )}

            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(request.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onReject}>
                  <X className="w-4 h-4 mr-1" />
                  Refuser
                </Button>
                <Button size="sm" onClick={onApprove}>
                  <Check className="w-4 h-4 mr-1" />
                  Approuver
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProcessedRequestCard({ request }: { request: UpgradeRequest }) {
  const isApproved = request.status === "approved";

  return (
    <Card className={isApproved ? "border-green-500/30" : "border-red-500/30"}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-4">
          <Avatar>
            <AvatarImage src={request.profile?.profile_photo_url || undefined} />
            <AvatarFallback>
              {request.profile?.full_name?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">{request.profile?.full_name || "Collaborateur"}</p>
                <p className="text-sm text-muted-foreground">
                  {request.employee?.job_title || request.employee?.department}
                </p>
              </div>
              <Badge
                className={
                  isApproved
                    ? "bg-green-500/20 text-green-700 border-green-500/30"
                    : "bg-red-500/20 text-red-700 border-red-500/30"
                }
              >
                {isApproved ? (
                  <>
                    <Check className="w-3 h-3 mr-1" />
                    Approuvée
                  </>
                ) : (
                  <>
                    <X className="w-3 h-3 mr-1" />
                    Refusée
                  </>
                )}
              </Badge>
            </div>

            {request.response_message && (
              <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                <MessageSquare className="w-3 h-3 inline mr-1 text-muted-foreground" />
                {request.response_message}
              </div>
            )}

            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              Traitée le {format(new Date(request.responded_at || request.created_at), "d MMM yyyy", { locale: fr })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
