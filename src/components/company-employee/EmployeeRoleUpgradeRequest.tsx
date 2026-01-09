import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowUpCircle, Clock, CheckCircle, XCircle, Loader2, Send, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface EmployeeRoleUpgradeRequestProps {
  employeeId: string;
  companyId: string;
  userId: string;
  canCreateCourses: boolean;
  canViewInvoices: boolean;
  canInviteDrivers: boolean;
}

export function EmployeeRoleUpgradeRequest({
  employeeId,
  companyId,
  userId,
  canCreateCourses,
  canViewInvoices,
  canInviteDrivers,
}: EmployeeRoleUpgradeRequestProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();

  // Check if already has full permissions (autonome)
  const isAutonome = canCreateCourses && canViewInvoices;

  // Fetch existing upgrade requests
  const { data: existingRequest, isLoading } = useQuery({
    queryKey: ["employee-upgrade-request", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_role_upgrade_requests")
        .select("*")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Submit upgrade request mutation
  const submitRequestMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("employee_role_upgrade_requests")
        .insert({
          employee_id: employeeId,
          company_id: companyId,
          user_id: userId,
          request_message: message || null,
          status: "pending",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Demande envoyée avec succès !");
      setIsOpen(false);
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["employee-upgrade-request", employeeId] });
    },
    onError: (error: any) => {
      console.error("Error submitting upgrade request:", error);
      toast.error("Erreur lors de l'envoi de la demande");
    },
  });

  if (isLoading) {
    return null;
  }

  // If already autonome, show status badge
  if (isAutonome) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-700">Collaborateur Autonome</p>
              <p className="text-xs text-muted-foreground">
                Vous avez accès à toutes les fonctionnalités
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If there's a pending request
  if (existingRequest?.status === "pending") {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600" />
            <div className="flex-1">
              <p className="font-medium text-amber-700">Demande en attente</p>
              <p className="text-xs text-muted-foreground">
                Votre demande de promotion a été envoyée le{" "}
                {format(new Date(existingRequest.created_at), "d MMMM yyyy", { locale: fr })}
              </p>
            </div>
            <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">
              En attente
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If request was rejected, allow to request again
  if (existingRequest?.status === "rejected") {
    return (
      <Card className="border-red-500/30 bg-red-500/5">
        <CardContent className="pt-4 pb-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-600" />
              <div className="flex-1">
                <p className="font-medium text-red-700">Demande refusée</p>
                {existingRequest.response_message && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Motif : {existingRequest.response_message}
                  </p>
                )}
              </div>
            </div>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <ArrowUpCircle className="w-4 h-4 mr-2" />
                  Faire une nouvelle demande
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Demande de promotion</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    Expliquez pourquoi vous souhaitez devenir <strong>Collaborateur Autonome</strong>.
                    Cela vous permettra de créer vos propres réservations de courses.
                  </p>
                  <Textarea
                    placeholder="Je souhaite pouvoir réserver mes propres courses car..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    Annuler
                  </Button>
                  <Button
                    onClick={() => submitRequestMutation.mutate()}
                    disabled={submitRequestMutation.isPending}
                  >
                    {submitRequestMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Envoyer la demande
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If approved, show success message
  if (existingRequest?.status === "approved") {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-700">Demande approuvée</p>
              <p className="text-xs text-muted-foreground">
                Votre demande a été approuvée. Déconnectez-vous et reconnectez-vous pour voir les changements.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default: Show option to request upgrade
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowUpCircle className="w-5 h-5 text-primary" />
          Devenir Collaborateur Autonome
        </CardTitle>
        <CardDescription>
          En tant que collaborateur géré, vous ne recevez que les courses assignées par votre entreprise.
          Demandez à devenir autonome pour pouvoir créer vos propres réservations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Send className="w-4 h-4 mr-2" />
              Faire une demande de promotion
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Demande de promotion</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                En devenant <strong>Collaborateur Autonome</strong>, vous pourrez :
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Créer vos propres réservations de courses</li>
                <li>Consulter les factures</li>
                <li>Gérer votre historique de déplacements</li>
              </ul>
              <Textarea
                placeholder="Message optionnel : expliquez pourquoi vous souhaitez cette promotion..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={() => submitRequestMutation.mutate()}
                disabled={submitRequestMutation.isPending}
              >
                {submitRequestMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Envoyer la demande
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
