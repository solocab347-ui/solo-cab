import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Bug, 
  Lightbulb, 
  Upload, 
  X, 
  Image as ImageIcon,
  Send,
  Loader2,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle,
  MessageSquare,
  Camera,
  FileText
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface FeedbackWidgetProps {
  userType: "driver" | "pioneer_driver" | "client" | "fleet_manager" | "company" | "company_employee";
  userName?: string;
  userEmail?: string;
}

interface Attachment {
  file: File;
  preview: string;
}

interface FeedbackItem {
  id: string;
  feedback_type: string;
  priority: string;
  status: string;
  title: string;
  description: string;
  created_at: string;
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

export const FeedbackWidget = ({ userType, userName, userEmail }: FeedbackWidgetProps) => {
  const [activeTab, setActiveTab] = useState<"submit" | "history">("submit");
  const [feedbackType, setFeedbackType] = useState<"bug" | "improvement">("bug");
  const [priority, setPriority] = useState<"urgent" | "medium" | "low">("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch user's feedback history
  const { data: feedbackHistory, isLoading: loadingHistory } = useQuery({
    queryKey: ["user-feedback"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_feedback")
        .select(`
          *,
          user_feedback_responses(id, admin_name, message, created_at),
          user_feedback_attachments(id, file_name, file_url)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as FeedbackItem[];
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const preview = URL.createObjectURL(file);
        newAttachments.push({ file, preview });
      } else {
        toast.error(`${file.name} n'est pas une image valide`);
      }
    });

    setAttachments((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Veuillez remplir le titre et la description");
      return;
    }
    // 🛑 Garde-fou : capture d'écran OBLIGATOIRE pour les bugs
    if (feedbackType === "bug" && attachments.length === 0) {
      toast.error("Une capture d'écran est obligatoire pour signaler un bug. Elle nous permet de le résoudre beaucoup plus vite.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non connecté");

      // Create feedback entry
      const { data: feedback, error: feedbackError } = await supabase
        .from("user_feedback")
        .insert({
          user_id: user.id,
          user_type: userType,
          user_name: userName || user.email?.split("@")[0],
          user_email: userEmail || user.email,
          feedback_type: feedbackType,
          priority,
          title: title.trim(),
          description: description.trim(),
          page_url: window.location.href,
          browser_info: navigator.userAgent
        })
        .select()
        .single();

      if (feedbackError) throw feedbackError;

      // Upload attachments
      if (attachments.length > 0 && feedback) {
        for (const attachment of attachments) {
          const fileExt = attachment.file.name.split(".").pop();
          const fileName = `${feedback.id}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("feedback-attachments")
            .upload(fileName, attachment.file);

          if (uploadError) {
            console.error("Upload error:", uploadError);
            continue;
          }

          // Bucket privé → on stocke le chemin (storage path) ; l'admin
          // génère un signed URL au moment de l'affichage / téléchargement.
          await supabase.from("user_feedback_attachments").insert({
            feedback_id: feedback.id,
            file_name: attachment.file.name,
            // file_url contient le path interne au bucket pour les nouvelles entrées
            file_url: fileName,
            file_type: attachment.file.type,
            file_size: attachment.file.size
          });
        }
      }

      toast.success(
        feedbackType === "bug" 
          ? "Bug signalé avec succès ! Notre équipe va l'analyser." 
          : "Amélioration suggérée avec succès ! Merci pour votre contribution."
      );

      // Reset form
      setTitle("");
      setDescription("");
      setAttachments([]);
      setPriority("medium");
      queryClient.invalidateQueries({ queryKey: ["user-feedback"] });
      setActiveTab("history");

    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      toast.error("Erreur lors de l'envoi. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "urgent":
        return <Badge variant="destructive" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Urgent</Badge>;
      case "medium":
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 text-xs"><Clock className="w-3 h-3 mr-1" />Moyen</Badge>;
      case "low":
        return <Badge variant="outline" className="text-xs">Faible</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "pending":
        return <Badge variant="secondary" className="text-xs"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500 text-xs"><Loader2 className="w-3 h-3 mr-1 animate-spin" />En cours</Badge>;
      case "resolved":
        return <Badge className="bg-green-500 text-xs"><CheckCircle className="w-3 h-3 mr-1" />Résolu</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="text-xs"><X className="w-3 h-3 mr-1" />Rejeté</Badge>;
      default:
        return null;
    }
  };

  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Bouton flottant discret */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="fixed bottom-20 right-4 z-50 rounded-full shadow-lg bg-background/95 backdrop-blur-sm border-muted-foreground/20 hover:bg-accent gap-2 px-3 py-2 text-xs"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Signaler
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Bugs & Améliorations
            </DialogTitle>
            <DialogDescription>
              Aidez-nous à améliorer SoloCab
            </DialogDescription>
          </DialogHeader>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "submit" | "history")}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="submit" className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Signaler
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Historique
              {feedbackHistory && feedbackHistory.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{feedbackHistory.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="submit" className="space-y-4">
            {/* Type selection */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={feedbackType === "bug" ? "default" : "outline"}
                className={`h-auto py-3 flex flex-col items-center gap-2 ${feedbackType === "bug" ? "bg-red-500 hover:bg-red-600" : ""}`}
                onClick={() => setFeedbackType("bug")}
              >
                <Bug className="w-5 h-5" />
                <span className="text-sm">Signaler un bug</span>
              </Button>
              <Button
                type="button"
                variant={feedbackType === "improvement" ? "default" : "outline"}
                className={`h-auto py-3 flex flex-col items-center gap-2 ${feedbackType === "improvement" ? "bg-green-500 hover:bg-green-600" : ""}`}
                onClick={() => setFeedbackType("improvement")}
              >
                <Lightbulb className="w-5 h-5" />
                <span className="text-sm">Suggérer une amélioration</span>
              </Button>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label>Priorité</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as "urgent" | "medium" | "low")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      Urgent - Bloque mon activité
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                      Moyen - Gênant mais contournable
                    </div>
                  </SelectItem>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      Faible - Amélioration de confort
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                placeholder={feedbackType === "bug" ? "Ex: Erreur lors de la création d'une course" : "Ex: Ajouter un filtre par date"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description détaillée *</Label>
              <Textarea
                id="description"
                placeholder={feedbackType === "bug" 
                  ? "Décrivez le bug en détail : que faisiez-vous ? Quel message d'erreur avez-vous vu ? Comment reproduire le problème ?" 
                  : "Décrivez votre suggestion : quel problème cela résoudrait-il ? Comment l'imaginez-vous ?"}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            {/* Screenshots */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                {feedbackType === "bug"
                  ? <>Captures d'écran <span className="text-destructive">*obligatoire</span></>
                  : "Captures d'écran (recommandé)"}
              </Label>
              <div className={`p-4 border-2 border-dashed rounded-lg transition-colors ${
                feedbackType === "bug" && attachments.length === 0
                  ? "border-destructive/50 bg-destructive/5"
                  : "bg-muted/30 hover:bg-muted/50"
              }`}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <div className="text-center">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <Button
                    type="button"
                    variant={feedbackType === "bug" && attachments.length === 0 ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    {feedbackType === "bug" ? "Ajouter une capture d'écran" : "Ajouter des captures d'écran"}
                  </Button>
                  <p className={`text-xs mt-2 ${
                    feedbackType === "bug" && attachments.length === 0 ? "text-destructive" : "text-muted-foreground"
                  }`}>
                    {feedbackType === "bug"
                      ? "Pour traiter votre bug, joignez au moins une capture d'écran montrant le problème."
                      : "Les captures d'écran nous aident à mieux comprendre votre retour."}
                  </p>
                </div>
              </div>

              {/* Preview attachments */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {attachments.map((att, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={att.preview}
                        alt={`Capture ${index + 1}`}
                        className="w-20 h-20 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeAttachment(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit button */}
            <Button
              onClick={handleSubmit}
              disabled={submitting || !title.trim() || !description.trim()}
              className="w-full"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer mon {feedbackType === "bug" ? "signalement" : "suggestion"}
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="history">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : feedbackHistory && feedbackHistory.length > 0 ? (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {feedbackHistory.map((item) => (
                    <Dialog key={item.id}>
                      <DialogTrigger asChild>
                        <Card 
                          className="p-3 cursor-pointer hover:border-primary/50 transition-colors"
                          onClick={() => setSelectedFeedback(item)}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              {item.feedback_type === "bug" ? (
                                <Bug className="w-4 h-4 text-red-500" />
                              ) : (
                                <Lightbulb className="w-4 h-4 text-green-500" />
                              )}
                              <span className="font-medium text-sm truncate max-w-[200px]">
                                {item.title}
                              </span>
                            </div>
                            {getStatusBadge(item.status)}
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{format(new Date(item.created_at), "d MMM yyyy", { locale: fr })}</span>
                            <div className="flex items-center gap-2">
                              {getPriorityBadge(item.priority)}
                              {item.user_feedback_responses?.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  <MessageSquare className="w-3 h-3 mr-1" />
                                  {item.user_feedback_responses.length}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </Card>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            {item.feedback_type === "bug" ? (
                              <Bug className="w-5 h-5 text-red-500" />
                            ) : (
                              <Lightbulb className="w-5 h-5 text-green-500" />
                            )}
                            {item.title}
                          </DialogTitle>
                          <DialogDescription className="flex items-center gap-2 pt-2">
                            {getStatusBadge(item.status)}
                            {getPriorityBadge(item.priority)}
                            <span className="text-xs">
                              {format(new Date(item.created_at), "d MMMM yyyy à HH:mm", { locale: fr })}
                            </span>
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 mt-4">
                          <div>
                            <h4 className="font-medium text-sm mb-2">Description</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {item.description}
                            </p>
                          </div>

                          {item.user_feedback_attachments?.length > 0 && (
                            <div>
                              <h4 className="font-medium text-sm mb-2">Captures d'écran</h4>
                              <div className="flex flex-wrap gap-2">
                                {item.user_feedback_attachments.map((att) => (
                                  <a
                                    key={att.id}
                                    href={att.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <img
                                      src={att.file_url}
                                      alt={att.file_name}
                                      className="w-24 h-24 object-cover rounded-lg border hover:border-primary transition-colors"
                                    />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {item.user_feedback_responses?.length > 0 && (
                            <div>
                              <Separator className="my-4" />
                              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" />
                                Réponses de l'équipe
                              </h4>
                              <div className="space-y-3">
                                {item.user_feedback_responses.map((response) => (
                                  <Card key={response.id} className="p-3 bg-primary/5 border-primary/20">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-medium text-sm">{response.admin_name || "Équipe SoloCab"}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {format(new Date(response.created_at), "d MMM yyyy à HH:mm", { locale: fr })}
                                      </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                      {response.message}
                                    </p>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Aucun retour envoyé pour le moment</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => setActiveTab("submit")}
                >
                  Faire mon premier signalement
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FeedbackWidget;
