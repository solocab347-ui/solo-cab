import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Lightbulb, Bug, Sparkles, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const AdminFeedback = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [newPriority, setNewPriority] = useState("");

  // Récupérer tous les feedbacks
  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ["all-feedbacks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("driver_feedback")
        .select(`
          *,
          drivers:driver_id (
            user_id,
            profiles:user_id (
              full_name,
              email
            )
          )
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Mutation pour analyser avec l'IA
  const analyzeWithAI = useMutation({
    mutationFn: async (feedbackId: string) => {
      const feedback = feedbacks.find(f => f.id === feedbackId);
      if (!feedback) throw new Error("Feedback non trouvé");

      const { data, error } = await supabase.functions.invoke("analyze-feedback", {
        body: { 
          feedbackId,
          type: feedback.type,
          title: feedback.title,
          description: feedback.description
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-feedbacks"] });
      toast({
        title: "Analyse terminée",
        description: "L'IA a analysé le feedback avec succès.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur d'analyse",
        description: "Impossible d'analyser le feedback.",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  // Mutation pour mettre à jour le feedback
  const updateFeedback = useMutation({
    mutationFn: async () => {
      if (!selectedFeedback) throw new Error("Aucun feedback sélectionné");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const updates: any = {
        admin_id: user.id,
      };

      if (adminResponse) updates.admin_response = adminResponse;
      if (newStatus) {
        updates.status = newStatus;
        if (newStatus === "resolved") {
          updates.resolved_at = new Date().toISOString();
        }
      }
      if (newPriority) updates.priority = newPriority;

      const { error } = await supabase
        .from("driver_feedback")
        .update(updates)
        .eq("id", selectedFeedback.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-feedbacks"] });
      toast({
        title: "Mis à jour",
        description: "Le feedback a été mis à jour avec succès.",
      });
      setSelectedFeedback(null);
      setAdminResponse("");
      setNewStatus("");
      setNewPriority("");
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le feedback.",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "resolved":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "in_review":
        return <Clock className="w-4 h-4 text-amber-500" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "default";
      default:
        return "secondary";
    }
  };

  const improvements = feedbacks.filter(f => f.type === "improvement");
  const bugs = feedbacks.filter(f => f.type === "bug");
  const pending = feedbacks.filter(f => f.status === "pending");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Lightbulb className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Gestion des Feedbacks</h2>
            <p className="text-muted-foreground">
              {pending.length} feedback{pending.length > 1 ? "s" : ""} en attente
            </p>
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">
              Tous ({feedbacks.length})
            </TabsTrigger>
            <TabsTrigger value="improvement">
              <Lightbulb className="w-4 h-4 mr-2" />
              Améliorations ({improvements.length})
            </TabsTrigger>
            <TabsTrigger value="bug">
              <Bug className="w-4 h-4 mr-2" />
              Bugs ({bugs.length})
            </TabsTrigger>
          </TabsList>

          {["all", "improvement", "bug"].map((tab) => (
            <TabsContent key={tab} value={tab} className="space-y-3">
              {(tab === "all" ? feedbacks : tab === "improvement" ? improvements : bugs).map((feedback) => (
                <Card key={feedback.id} className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {feedback.type === "improvement" ? (
                            <Lightbulb className="w-5 h-5 text-purple-500" />
                          ) : (
                            <Bug className="w-5 h-5 text-red-500" />
                          )}
                          <h4 className="font-semibold">{feedback.title}</h4>
                          {getStatusIcon(feedback.status)}
                          <Badge variant={getPriorityColor(feedback.priority || "medium")}>
                            {feedback.priority || "medium"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Par: {feedback.drivers?.profiles?.full_name || "Chauffeur inconnu"}
                        </p>
                        <p className="text-sm mb-2">{feedback.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(feedback.created_at), "PPp", { locale: fr })}
                        </p>
                      </div>
                    </div>

                    {feedback.ai_analysis && (
                      <div className="bg-muted/50 rounded-md p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="w-4 h-4 text-purple-500" />
                          <p className="text-xs font-semibold">Analyse IA:</p>
                        </div>
                        <p className="text-xs">{feedback.ai_analysis}</p>
                        {feedback.ai_suggestion && (
                          <p className="text-xs mt-2 text-primary">💡 {feedback.ai_suggestion}</p>
                        )}
                      </div>
                    )}

                    {feedback.admin_response && (
                      <div className="bg-primary/10 rounded-md p-3">
                        <p className="text-xs font-semibold mb-1">Réponse admin:</p>
                        <p className="text-xs">{feedback.admin_response}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {!feedback.ai_analysis && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => analyzeWithAI.mutate(feedback.id)}
                          disabled={analyzeWithAI.isPending}
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Analyser avec IA
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => setSelectedFeedback(feedback)}
                      >
                        Gérer
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </Card>

      {selectedFeedback && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Gérer le feedback</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Statut</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Changer le statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="in_review">En cours</SelectItem>
                  <SelectItem value="resolved">Résolu</SelectItem>
                  <SelectItem value="rejected">Rejeté</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Priorité</label>
              <Select value={newPriority} onValueChange={setNewPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Changer la priorité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Basse</SelectItem>
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="high">Haute</SelectItem>
                  <SelectItem value="critical">Critique</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Réponse</label>
              <Textarea
                placeholder="Votre réponse au chauffeur..."
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={() => updateFeedback.mutate()} disabled={updateFeedback.isPending}>
                Sauvegarder
              </Button>
              <Button variant="outline" onClick={() => setSelectedFeedback(null)}>
                Annuler
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminFeedback;
