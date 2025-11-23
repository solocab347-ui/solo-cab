import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Lightbulb, Bug, Send, CheckCircle2, Clock, XCircle } from "lucide-react";

const DriverFeedback = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [improvementTitle, setImprovementTitle] = useState("");
  const [improvementDescription, setImprovementDescription] = useState("");
  const [bugTitle, setBugTitle] = useState("");
  const [bugDescription, setBugDescription] = useState("");

  // Récupérer l'ID du chauffeur
  const { data: driverId } = useQuery({
    queryKey: ["driverId"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");
      
      const { data, error } = await supabase
        .from("drivers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (error) throw error;
      return data.id;
    },
  });

  // Récupérer les feedbacks du chauffeur
  const { data: feedbacks = [] } = useQuery({
    queryKey: ["driver-feedbacks", driverId],
    queryFn: async () => {
      if (!driverId) return [];
      
      const { data, error } = await supabase
        .from("driver_feedback")
        .select("*")
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!driverId,
  });

  // Mutation pour créer un feedback
  const createFeedback = useMutation({
    mutationFn: async ({ type, title, description }: { type: "improvement" | "bug"; title: string; description: string }) => {
      if (!driverId) throw new Error("Driver ID non trouvé");
      
      const { error } = await supabase
        .from("driver_feedback")
        .insert({
          driver_id: driverId,
          type,
          title,
          description,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-feedbacks"] });
      toast({
        title: "Envoyé !",
        description: "Votre feedback a été transmis à l'équipe.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer votre feedback.",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  const handleSubmitImprovement = () => {
    if (!improvementTitle || !improvementDescription) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir tous les champs.",
        variant: "destructive",
      });
      return;
    }
    
    createFeedback.mutate({
      type: "improvement",
      title: improvementTitle,
      description: improvementDescription,
    });
    
    setImprovementTitle("");
    setImprovementDescription("");
  };

  const handleSubmitBug = () => {
    if (!bugTitle || !bugDescription) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir tous les champs.",
        variant: "destructive",
      });
      return;
    }
    
    createFeedback.mutate({
      type: "bug",
      title: bugTitle,
      description: bugDescription,
    });
    
    setBugTitle("");
    setBugDescription("");
  };

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

  const getStatusText = (status: string) => {
    switch (status) {
      case "resolved":
        return "Résolu";
      case "in_review":
        return "En cours";
      case "rejected":
        return "Rejeté";
      default:
        return "En attente";
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

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Lightbulb className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Amélioration et Feedback</h2>
            <p className="text-muted-foreground">Aidez-nous à améliorer l'application</p>
          </div>
        </div>

        <Tabs defaultValue="improvement" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="improvement">
              <Lightbulb className="w-4 h-4 mr-2" />
              Améliorations
            </TabsTrigger>
            <TabsTrigger value="bug">
              <Bug className="w-4 h-4 mr-2" />
              Bugs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="improvement" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-4">Proposer une amélioration</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Titre de l'amélioration</label>
                  <Input
                    placeholder="Ex: Ajouter un système de statistiques avancées"
                    value={improvementTitle}
                    onChange={(e) => setImprovementTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Description détaillée</label>
                  <Textarea
                    placeholder="Décrivez votre idée d'amélioration en détail..."
                    value={improvementDescription}
                    onChange={(e) => setImprovementDescription(e.target.value)}
                    rows={5}
                  />
                </div>
                <Button onClick={handleSubmitImprovement} disabled={createFeedback.isPending}>
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer la suggestion
                </Button>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Mes suggestions d'amélioration</h3>
              <div className="space-y-3">
                {feedbacks.filter(f => f.type === "improvement").length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Aucune suggestion envoyée</p>
                ) : (
                  feedbacks.filter(f => f.type === "improvement").map((feedback) => (
                    <Card key={feedback.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{feedback.title}</h4>
                            {getStatusIcon(feedback.status)}
                            <Badge variant={getPriorityColor(feedback.priority || "medium")}>
                              {feedback.priority || "medium"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{feedback.description}</p>
                          {feedback.ai_analysis && (
                            <div className="bg-muted/50 rounded-md p-3 mb-2">
                              <p className="text-xs font-semibold mb-1">Analyse IA:</p>
                              <p className="text-xs">{feedback.ai_analysis}</p>
                            </div>
                          )}
                          {feedback.admin_response && (
                            <div className="bg-primary/10 rounded-md p-3">
                              <p className="text-xs font-semibold mb-1">Réponse admin:</p>
                              <p className="text-xs">{feedback.admin_response}</p>
                            </div>
                          )}
                        </div>
                        <Badge variant="outline">{getStatusText(feedback.status)}</Badge>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bug" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-4">Signaler un bug</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Titre du bug</label>
                  <Input
                    placeholder="Ex: Problème d'affichage des factures"
                    value={bugTitle}
                    onChange={(e) => setBugTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Description du problème</label>
                  <Textarea
                    placeholder="Décrivez le bug en détail, les étapes pour le reproduire, etc..."
                    value={bugDescription}
                    onChange={(e) => setBugDescription(e.target.value)}
                    rows={5}
                  />
                </div>
                <Button onClick={handleSubmitBug} disabled={createFeedback.isPending}>
                  <Send className="w-4 h-4 mr-2" />
                  Signaler le bug
                </Button>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Mes signalements de bugs</h3>
              <div className="space-y-3">
                {feedbacks.filter(f => f.type === "bug").length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Aucun bug signalé</p>
                ) : (
                  feedbacks.filter(f => f.type === "bug").map((feedback) => (
                    <Card key={feedback.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{feedback.title}</h4>
                            {getStatusIcon(feedback.status)}
                            <Badge variant={getPriorityColor(feedback.priority || "medium")}>
                              {feedback.priority || "medium"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{feedback.description}</p>
                          {feedback.ai_analysis && (
                            <div className="bg-muted/50 rounded-md p-3 mb-2">
                              <p className="text-xs font-semibold mb-1">Analyse IA:</p>
                              <p className="text-xs">{feedback.ai_analysis}</p>
                            </div>
                          )}
                          {feedback.admin_response && (
                            <div className="bg-primary/10 rounded-md p-3">
                              <p className="text-xs font-semibold mb-1">Réponse admin:</p>
                              <p className="text-xs">{feedback.admin_response}</p>
                            </div>
                          )}
                        </div>
                        <Badge variant="outline">{getStatusText(feedback.status)}</Badge>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default DriverFeedback;
