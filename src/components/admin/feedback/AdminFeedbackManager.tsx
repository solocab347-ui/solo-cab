import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Bug, 
  Lightbulb, 
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle,
  MessageSquare,
  Send,
  Loader2,
  X,
  User,
  Mail,
  Globe,
  Image as ImageIcon,
  FileText,
  Filter,
  Search,
  RefreshCw,
  ArrowUpDown
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FeedbackAttachmentImage } from "@/components/feedback/FeedbackAttachmentImage";

interface FeedbackItem {
  id: string;
  user_id: string;
  user_type: string;
  user_name: string;
  user_email: string;
  feedback_type: string;
  priority: string;
  status: string;
  title: string;
  description: string;
  page_url: string;
  browser_info: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  user_feedback_responses: {
    id: string;
    admin_name: string;
    message: string;
    created_at: string;
  }[];
  user_feedback_attachments: {
    id: string;
    file_name: string;
    file_url: string;
  }[];
}

interface ResponseTemplate {
  id: string;
  title: string;
  message: string;
  category: string;
}

export const AdminFeedbackManager = () => {
  const [activeTab, setActiveTab] = useState<"bugs" | "improvements">("bugs");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [sendingResponse, setSendingResponse] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const queryClient = useQueryClient();

  // Fetch all feedback
  const { data: feedbackList, isLoading, refetch } = useQuery({
    queryKey: ["admin-feedback", activeTab, priorityFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("user_feedback")
        .select(`
          *,
          user_feedback_responses(id, admin_name, message, created_at),
          user_feedback_attachments(id, file_name, file_url)
        `)
        .eq("feedback_type", activeTab === "bugs" ? "bug" : "improvement")
        .order("created_at", { ascending: false });

      if (priorityFilter !== "all") {
        query = query.eq("priority", priorityFilter);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FeedbackItem[];
    }
  });

  // Fetch response templates
  const { data: templates } = useQuery({
    queryKey: ["feedback-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback_response_templates")
        .select("*")
        .eq("is_active", true)
        .order("category");

      if (error) throw error;
      return data as ResponseTemplate[];
    }
  });

  const handleSendResponse = async () => {
    if (!selectedFeedback || !responseMessage.trim()) return;

    setSendingResponse(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get admin name from user metadata or email
      const adminName = user?.user_metadata?.full_name || 
                        user?.user_metadata?.name || 
                        user?.email?.split("@")[0] || 
                        "Admin SoloCab";

      const { error } = await supabase.from("user_feedback_responses").insert({
        feedback_id: selectedFeedback.id,
        admin_id: user?.id,
        admin_name: adminName,
        message: responseMessage.trim()
      });

      if (error) throw error;

      toast.success("Réponse envoyée avec succès");
      setResponseMessage("");
      queryClient.invalidateQueries({ queryKey: ["admin-feedback"] });

      // Refresh selected feedback
      const { data: updated } = await supabase
        .from("user_feedback")
        .select(`
          *,
          user_feedback_responses(id, admin_name, message, created_at),
          user_feedback_attachments(id, file_name, file_url)
        `)
        .eq("id", selectedFeedback.id)
        .single();

      if (updated) setSelectedFeedback(updated as FeedbackItem);

    } catch (error: any) {
      console.error("Error sending response:", error);
      toast.error("Erreur lors de l'envoi de la réponse");
    } finally {
      setSendingResponse(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedFeedback) return;

    setUpdatingStatus(true);
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === "resolved") {
        const { data: { user } } = await supabase.auth.getUser();
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user?.id;
      }

      const { error } = await supabase
        .from("user_feedback")
        .update(updateData)
        .eq("id", selectedFeedback.id);

      if (error) throw error;

      toast.success("Statut mis à jour");
      setSelectedFeedback({ ...selectedFeedback, status: newStatus });
      queryClient.invalidateQueries({ queryKey: ["admin-feedback"] });

    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (!selectedFeedback) return;

    try {
      const { error } = await supabase
        .from("user_feedback")
        .update({ priority: newPriority })
        .eq("id", selectedFeedback.id);

      if (error) throw error;

      toast.success("Priorité mise à jour");
      setSelectedFeedback({ ...selectedFeedback, priority: newPriority });
      queryClient.invalidateQueries({ queryKey: ["admin-feedback"] });

    } catch (error: any) {
      console.error("Error updating priority:", error);
      toast.error("Erreur lors de la mise à jour de la priorité");
    }
  };

  const useTemplate = (template: ResponseTemplate) => {
    setResponseMessage(template.message);
  };

  const filteredFeedback = feedbackList?.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.user_name?.toLowerCase().includes(query) ||
      item.user_email?.toLowerCase().includes(query)
    );
  });

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "urgent":
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Urgent</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Moyen</Badge>;
      case "low":
        return <Badge variant="outline">Faible</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500"><Loader2 className="w-3 h-3 mr-1" />En cours</Badge>;
      case "resolved":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Résolu</Badge>;
      case "rejected":
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" />Rejeté</Badge>;
      case "archived":
        return <Badge variant="outline"><FileText className="w-3 h-3 mr-1" />Archivé</Badge>;
      default:
        return null;
    }
  };

  const getUserTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      driver: "bg-blue-500",
      pioneer_driver: "bg-amber-500",
      client: "bg-green-500",
      fleet_manager: "bg-purple-500",
      company: "bg-indigo-500",
      company_employee: "bg-cyan-500"
    };
    const labels: Record<string, string> = {
      driver: "Chauffeur",
      pioneer_driver: "Pionnier",
      client: "Client",
      fleet_manager: "Gestionnaire",
      company: "Entreprise",
      company_employee: "Collaborateur"
    };
    return <Badge className={colors[type] || "bg-gray-500"}>{labels[type] || type}</Badge>;
  };

  // Stats
  const urgentCount = feedbackList?.filter(f => f.priority === "urgent" && f.status === "pending").length || 0;
  const pendingCount = feedbackList?.filter(f => f.status === "pending").length || 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Gestion des Retours Utilisateurs
              </CardTitle>
              <CardDescription>
                Gérez les bugs signalés et les suggestions d'amélioration
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>

          {/* Stats */}
          <div className="flex gap-4 mt-4">
            {urgentCount > 0 && (
              <Badge variant="destructive" className="text-sm py-1 px-3">
                <AlertTriangle className="w-4 h-4 mr-1" />
                {urgentCount} urgent{urgentCount > 1 ? "s" : ""}
              </Badge>
            )}
            <Badge variant="secondary" className="text-sm py-1 px-3">
              <Clock className="w-4 h-4 mr-1" />
              {pendingCount} en attente
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "bugs" | "improvements")}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="bugs" className="flex items-center gap-2">
                <Bug className="w-4 h-4" />
                Bugs
              </TabsTrigger>
              <TabsTrigger value="improvements" className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Améliorations
              </TabsTrigger>
            </TabsList>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Priorité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes priorités</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="medium">Moyen</SelectItem>
                    <SelectItem value="low">Faible</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous statuts</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="resolved">Résolu</SelectItem>
                    <SelectItem value="rejected">Rejeté</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <TabsContent value="bugs" className="mt-0">
              <FeedbackList
                items={filteredFeedback || []}
                isLoading={isLoading}
                onSelect={setSelectedFeedback}
                getPriorityBadge={getPriorityBadge}
                getStatusBadge={getStatusBadge}
                getUserTypeBadge={getUserTypeBadge}
              />
            </TabsContent>

            <TabsContent value="improvements" className="mt-0">
              <FeedbackList
                items={filteredFeedback || []}
                isLoading={isLoading}
                onSelect={setSelectedFeedback}
                getPriorityBadge={getPriorityBadge}
                getStatusBadge={getStatusBadge}
                getUserTypeBadge={getUserTypeBadge}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-8">
              {selectedFeedback?.feedback_type === "bug" ? (
                <Bug className="w-5 h-5 text-red-500 flex-shrink-0" />
              ) : (
                <Lightbulb className="w-5 h-5 text-green-500 flex-shrink-0" />
              )}
              <span className="truncate">{selectedFeedback?.title}</span>
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-2 pt-2">
              {selectedFeedback && getUserTypeBadge(selectedFeedback.user_type)}
              {selectedFeedback && getStatusBadge(selectedFeedback.status)}
              {selectedFeedback && getPriorityBadge(selectedFeedback.priority)}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            {selectedFeedback && (
              <div className="space-y-4 pb-4">
                {/* User info */}
                <Card className="p-3 bg-muted/50">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedFeedback.user_name || "Anonyme"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate">{selectedFeedback.user_email}</span>
                    </div>
                    <div className="flex items-center gap-2 col-span-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>{format(new Date(selectedFeedback.created_at), "d MMMM yyyy à HH:mm", { locale: fr })}</span>
                    </div>
                    {selectedFeedback.page_url && (
                      <div className="flex items-center gap-2 col-span-2">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs truncate">{selectedFeedback.page_url}</span>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Status & Priority controls */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1 block">Statut</label>
                    <Select 
                      value={selectedFeedback.status} 
                      onValueChange={handleStatusChange}
                      disabled={updatingStatus}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">En attente</SelectItem>
                        <SelectItem value="in_progress">En cours</SelectItem>
                        <SelectItem value="resolved">Résolu</SelectItem>
                        <SelectItem value="rejected">Rejeté</SelectItem>
                        <SelectItem value="archived">Archivé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1 block">Priorité</label>
                    <Select 
                      value={selectedFeedback.priority} 
                      onValueChange={handlePriorityChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="medium">Moyen</SelectItem>
                        <SelectItem value="low">Faible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="font-medium text-sm mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">
                    {selectedFeedback.description}
                  </p>
                </div>

                {/* Attachments */}
                {selectedFeedback.user_feedback_attachments?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Captures d'écran ({selectedFeedback.user_feedback_attachments.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedFeedback.user_feedback_attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={att.file_url}
                            alt={att.file_name}
                            className="w-32 h-32 object-cover rounded-lg border hover:border-primary transition-colors"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Responses */}
                <div>
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Échanges ({selectedFeedback.user_feedback_responses?.length || 0})
                  </h4>

                  {selectedFeedback.user_feedback_responses?.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {selectedFeedback.user_feedback_responses
                        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                        .map((response) => (
                          <Card key={response.id} className="p-3 bg-primary/5 border-primary/20">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">{response.admin_name}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(response.created_at), "d MMM à HH:mm", { locale: fr })}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {response.message}
                            </p>
                          </Card>
                        ))}
                    </div>
                  )}

                  {/* Response templates */}
                  {templates && templates.length > 0 && (
                    <div className="mb-3">
                      <label className="text-xs text-muted-foreground mb-2 block">Messages pré-remplis :</label>
                      <div className="flex flex-wrap gap-1">
                        {templates.map((template) => (
                          <Button
                            key={template.id}
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => useTemplate(template)}
                          >
                            {template.title}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New response */}
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Rédigez votre réponse à l'utilisateur..."
                      value={responseMessage}
                      onChange={(e) => setResponseMessage(e.target.value)}
                      rows={3}
                    />
                    <Button
                      onClick={handleSendResponse}
                      disabled={sendingResponse || !responseMessage.trim()}
                      className="w-full"
                    >
                      {sendingResponse ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Envoyer la réponse
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Sub-component for the feedback list
const FeedbackList = ({
  items,
  isLoading,
  onSelect,
  getPriorityBadge,
  getStatusBadge,
  getUserTypeBadge
}: {
  items: FeedbackItem[];
  isLoading: boolean;
  onSelect: (item: FeedbackItem) => void;
  getPriorityBadge: (p: string) => React.ReactNode;
  getStatusBadge: (s: string) => React.ReactNode;
  getUserTypeBadge: (t: string) => React.ReactNode;
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">Aucun élément à afficher</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-2 pr-4">
        {items.map((item) => (
          <Card
            key={item.id}
            className="p-3 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => onSelect(item)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {item.feedback_type === "bug" ? (
                    <Bug className="w-4 h-4 text-red-500 flex-shrink-0" />
                  ) : (
                    <Lightbulb className="w-4 h-4 text-green-500 flex-shrink-0" />
                  )}
                  <span className="font-medium text-sm truncate">{item.title}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{item.user_name || "Anonyme"}</span>
                  <span>•</span>
                  <span>{format(new Date(item.created_at), "d MMM yyyy HH:mm", { locale: fr })}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1">
                  {getPriorityBadge(item.priority)}
                  {getStatusBadge(item.status)}
                </div>
                <div className="flex items-center gap-1">
                  {getUserTypeBadge(item.user_type)}
                  {item.user_feedback_responses?.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <MessageSquare className="w-3 h-3 mr-1" />
                      {item.user_feedback_responses.length}
                    </Badge>
                  )}
                  {item.user_feedback_attachments?.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <ImageIcon className="w-3 h-3 mr-1" />
                      {item.user_feedback_attachments.length}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
};

export default AdminFeedbackManager;
