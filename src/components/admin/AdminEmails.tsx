import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Mail, Users, UserCheck, Send, Save, Trash2, Clock, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  created_at: string;
}

interface EmailHistory {
  id: string;
  subject: string;
  content: string;
  recipient_type: string;
  recipients_count: number;
  sent_at: string;
}

const AdminEmails = () => {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [recipientType, setRecipientType] = useState<string | null>(null);
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  
  // Templates
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  // History
  const [history, setHistory] = useState<EmailHistory[]>([]);

  // Statistiques
  const [driversCount, setDriversCount] = useState(0);
  const [clientsCount, setClientsCount] = useState(0);

  useEffect(() => {
    fetchStatistics();
    fetchTemplates();
    fetchHistory();
  }, []);

  const fetchStatistics = async () => {
    try {
      const { count: drivers } = await supabase
        .from("drivers")
        .select("*", { count: "exact", head: true })
        .eq("status", "validated");

      const { count: clients } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true });

      setDriversCount(drivers || 0);
      setClientsCount(clients || 0);
    } catch (error: any) {
      console.error("Error fetching statistics:", error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
      toast.error("Erreur lors du chargement des templates");
    }
  };

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("email_history")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory(data || []);
    } catch (error: any) {
      console.error("Error fetching history:", error);
      toast.error("Erreur lors du chargement de l'historique");
    }
  };

  const handleSendEmails = async () => {
    if (!subject || !content) {
      toast.error("Veuillez remplir le sujet et le contenu");
      return;
    }

    if (!recipientType) {
      toast.error("Veuillez sélectionner les destinataires");
      return;
    }

    if (
      (recipientType === "specific_drivers" && selectedDriverIds.length === 0) ||
      (recipientType === "specific_clients" && selectedClientIds.length === 0)
    ) {
      toast.error("Veuillez sélectionner au moins un destinataire");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-bulk-email", {
        body: {
          subject,
          content,
          recipient_type: recipientType,
          recipient_ids:
            recipientType === "specific_drivers"
              ? selectedDriverIds
              : recipientType === "specific_clients"
              ? selectedClientIds
              : [],
        },
      });

      if (error) throw error;

      toast.success(`${data.sent_count} email(s) envoyé(s) avec succès`);
      
      // Réinitialiser le formulaire
      setSubject("");
      setContent("");
      setRecipientType(null);
      setSelectedDriverIds([]);
      setSelectedClientIds([]);
      
      // Recharger l'historique
      fetchHistory();
    } catch (error: any) {
      console.error("Error sending emails:", error);
      toast.error("Erreur lors de l'envoi des emails");
    } finally {
      setSending(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName || !subject || !content) {
      toast.error("Veuillez remplir tous les champs du template");
      return;
    }

    setSavingTemplate(true);
    try {
      const { error } = await supabase.from("email_templates").insert({
        name: templateName,
        subject,
        content,
      });

      if (error) throw error;

      toast.success("Template enregistré avec succès");
      setTemplateName("");
      setTemplateDialogOpen(false);
      fetchTemplates();
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast.error("Erreur lors de l'enregistrement du template");
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleLoadTemplate = (template: EmailTemplate) => {
    setSubject(template.subject);
    setContent(template.content);
    toast.success("Template chargé");
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from("email_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Template supprimé");
      fetchTemplates();
    } catch (error: any) {
      console.error("Error deleting template:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const getRecipientTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      all_drivers: "Tous les chauffeurs",
      all_clients: "Tous les clients",
      specific_drivers: "Chauffeurs spécifiques",
      specific_clients: "Clients spécifiques",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="send" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="send">
            <Mail className="w-4 h-4 mr-2" />
            Envoyer un email
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Save className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="w-4 h-4 mr-2" />
            Historique
          </TabsTrigger>
        </TabsList>

        {/* Onglet Envoi */}
        <TabsContent value="send">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Send className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Envoi d'emails en masse</h2>
                <p className="text-muted-foreground">Communiquer avec les chauffeurs et clients</p>
              </div>
            </div>

            {/* Sélection des destinataires */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Destinataires :</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card
                  className={`p-6 cursor-pointer transition-all ${
                    recipientType === "all_drivers"
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setRecipientType("all_drivers")}
                >
                  <div className="flex flex-col items-center text-center">
                    <Users className="w-12 h-12 mb-3 text-primary" />
                    <h4 className="font-bold text-lg mb-1">Tous les chauffeurs</h4>
                    <p className="text-2xl font-bold text-primary">{driversCount} chauffeurs</p>
                  </div>
                </Card>

                <Card
                  className={`p-6 cursor-pointer transition-all ${
                    recipientType === "all_clients"
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setRecipientType("all_clients")}
                >
                  <div className="flex flex-col items-center text-center">
                    <UserCheck className="w-12 h-12 mb-3 text-primary" />
                    <h4 className="font-bold text-lg mb-1">Tous les clients</h4>
                    <p className="text-2xl font-bold text-primary">{clientsCount} clients</p>
                  </div>
                </Card>

                <Card
                  className={`p-6 cursor-pointer transition-all ${
                    recipientType === "specific_drivers"
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setRecipientType("specific_drivers")}
                >
                  <div className="flex flex-col items-center text-center">
                    <Users className="w-12 h-12 mb-3 text-muted-foreground" />
                    <h4 className="font-bold text-lg mb-1">Chauffeurs spécifiques</h4>
                    <p className="text-sm text-muted-foreground">Sélection manuelle</p>
                  </div>
                </Card>

                <Card
                  className={`p-6 cursor-pointer transition-all ${
                    recipientType === "specific_clients"
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setRecipientType("specific_clients")}
                >
                  <div className="flex flex-col items-center text-center">
                    <UserCheck className="w-12 h-12 mb-3 text-muted-foreground" />
                    <h4 className="font-bold text-lg mb-1">Clients spécifiques</h4>
                    <p className="text-sm text-muted-foreground">Sélection manuelle</p>
                  </div>
                </Card>
              </div>
            </div>

            {/* Sujet */}
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">Sujet de l'email :</label>
              <Input
                placeholder="Sujet de l'email..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            {/* Contenu */}
            <div className="mb-6">
              <label className="text-sm font-medium mb-2 block">Contenu (HTML supporté) :</label>
              <Textarea
                placeholder="Contenu de l'email... Vous pouvez utiliser du HTML."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
              <div>
                <p className="font-medium">
                  Prêt à envoyer à{" "}
                  {recipientType === "all_drivers"
                    ? `${driversCount} destinataire(s)`
                    : recipientType === "all_clients"
                    ? `${clientsCount} destinataire(s)`
                    : "0 destinataire(s)"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {recipientType ? getRecipientTypeLabel(recipientType) : "Sélectionnez les destinataires"}
                </p>
              </div>
              <div className="flex gap-2">
                <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" disabled={!subject || !content}>
                      <Save className="w-4 h-4 mr-2" />
                      Sauvegarder template
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Enregistrer comme template</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Nom du template :</label>
                        <Input
                          placeholder="Ex: Email de bienvenue"
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                        />
                      </div>
                      <Button onClick={handleSaveTemplate} disabled={savingTemplate} className="w-full">
                        {savingTemplate ? "Enregistrement..." : "Enregistrer"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button onClick={handleSendEmails} disabled={sending || !recipientType || !subject || !content}>
                  <Send className="w-4 h-4 mr-2" />
                  {sending ? "Envoi..." : "Envoyer les emails"}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Onglet Templates */}
        <TabsContent value="templates">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-6">Templates enregistrés</h2>
            {templates.length === 0 ? (
              <div className="text-center py-12">
                <Save className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun template enregistré</p>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <Card key={template.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{template.name}</h3>
                        <p className="text-sm text-muted-foreground mb-1">{template.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          Créé le {format(new Date(template.created_at), "dd/MM/yyyy à HH:mm", { locale: fr })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleLoadTemplate(template)}>
                          Charger
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer ce template ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteTemplate(template.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Onglet Historique */}
        <TabsContent value="history">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-6">Historique des envois</h2>
            {history.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun envoi dans l'historique</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <Card key={item.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <h3 className="font-bold">{item.subject}</h3>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <Badge variant="outline">{getRecipientTypeLabel(item.recipient_type)}</Badge>
                          <span>{item.recipients_count} destinataire(s)</span>
                          <span>•</span>
                          <span>{format(new Date(item.sent_at), "dd/MM/yyyy à HH:mm", { locale: fr })}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminEmails;
