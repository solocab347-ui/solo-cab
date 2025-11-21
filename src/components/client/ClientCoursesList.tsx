import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  MapPin, 
  Calendar, 
  Users, 
  XCircle, 
  MessageSquare, 
  Car, 
  Clock, 
  CheckCircle, 
  FileText,
  Download,
  Mail,
  Share2
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import jsPDF from "jspdf";

interface ClientCoursesListProps {
  clientId: string;
  defaultTab?: string | null;
}

const ClientCoursesList = ({ clientId, defaultTab }: ClientCoursesListProps) => {
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelCourseId, setCancelCourseId] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
    setupRealtimeSubscription();
  }, [clientId]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          drivers!inner(
            company_name,
            company_address,
            siret,
            vehicle_model,
            vehicle_color,
            profiles:user_id(full_name, phone, profile_photo_url)
          ),
          devis(
            id,
            quote_number,
            amount,
            status,
            base_price,
            distance_price,
            time_price,
            valid_until
          ),
          factures(
            id,
            invoice_number,
            invoice_number_generated,
            amount,
            payment_status,
            payment_method
          )
        `)
        .eq("client_id", clientId)
        .order("scheduled_date", { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error: any) {
      console.error("Error fetching courses:", error);
      toast.error("Erreur lors du chargement des courses");
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("client-courses-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "courses",
          filter: `client_id=eq.${clientId}`,
        },
        () => fetchCourses()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleCancelConfirm = async () => {
    if (!cancelCourseId) return;

    try {
      const { error } = await supabase
        .from("courses")
        .update({ status: "cancelled" })
        .eq("id", cancelCourseId);

      if (error) throw error;
      toast.success("Course annulée");
      setCancelCourseId(null);
      fetchCourses();
    } catch (error: any) {
      console.error("Error cancelling course:", error);
      toast.error("Erreur lors de l'annulation");
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      accepted: "bg-green-500/10 text-green-500 border-green-500/20",
      in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      completed: "bg-premium/10 text-premium border-premium/20",
      cancelled: "bg-destructive/10 text-destructive border-destructive/20",
    };

    const labels = {
      pending: "En attente",
      accepted: "Confirmée",
      in_progress: "En cours",
      completed: "Terminée",
      cancelled: "Annulée",
    };

    return (
      <Badge variant="outline" className={styles[status as keyof typeof styles]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const handleDownloadDevis = (devis: any, course: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // En-tête bleu
    doc.setFillColor(0, 102, 204);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setFontSize(28);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text("DEVIS", pageWidth / 2, 18, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Référence: ${devis.quote_number}`, pageWidth / 2, 26, { align: "center" });
    doc.setTextColor(0, 0, 0);
    
    let yPos = 50;
    
    // Info chauffeur
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("CHAUFFEUR VTC", 20, yPos);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    yPos += 5;
    
    const driverName = course.drivers?.profiles?.full_name || "N/A";
    doc.text(driverName, 20, yPos);
    yPos += 4;
    
    if (course.drivers?.company_name) {
      doc.text(course.drivers.company_name, 20, yPos);
      yPos += 4;
    }
    
    // Détails course
    yPos = 95;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.rect(15, yPos, pageWidth - 30, 40);
    
    yPos += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("DÉTAILS DE LA PRESTATION", 20, yPos);
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    yPos += 6;
    
    doc.text("Départ:", 20, yPos);
    doc.text(course.pickup_address, 45, yPos);
    yPos += 4;
    
    doc.text("Arrivée:", 20, yPos);
    doc.text(course.destination_address, 45, yPos);
    yPos += 4;
    
    doc.text("Date:", 20, yPos);
    doc.text(format(new Date(course.scheduled_date), "dd/MM/yyyy 'à' HH:mm", { locale: fr }), 45, yPos);
    
    // Tarification
    yPos = 155;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("TARIFICATION", 20, yPos);
    
    const totalHT = parseFloat(devis.base_price) + parseFloat(devis.distance_price) + parseFloat(devis.time_price || 0);
    const tvaRate = parseFloat(devis.time_price || 0) > 0 ? 20 : 10;
    const tvaAmount = totalHT * (tvaRate / 100);
    const totalTTC = totalHT + tvaAmount;
    
    yPos += 8;
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    
    doc.text("Montant HT", 20, yPos);
    doc.text(`${totalHT.toFixed(2)} €`, pageWidth - 20, yPos, { align: "right" });
    
    yPos += 6;
    doc.text(`TVA (${tvaRate}%)`, 20, yPos);
    doc.text(`${tvaAmount.toFixed(2)} €`, pageWidth - 20, yPos, { align: "right" });
    
    yPos += 4;
    doc.setDrawColor(200, 200, 200);
    doc.line(15, yPos, pageWidth - 15, yPos);
    
    yPos += 7;
    doc.setFillColor(0, 102, 204);
    doc.rect(15, yPos - 3, pageWidth - 30, 9, 'F');
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL TTC", 20, yPos + 2);
    doc.text(`${totalTTC.toFixed(2)} €`, pageWidth - 20, yPos + 2, { align: "right" });
    doc.setTextColor(0, 0, 0);
    
    doc.save(`devis-${devis.quote_number}.pdf`);
    toast.success("Devis téléchargé");
  };

  const handleDownloadFacture = (facture: any, course: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // En-tête vert pour facture payée, gris pour impayée
    const isPaid = facture.payment_status === 'paid';
    if (isPaid) {
      doc.setFillColor(34, 197, 94); // green
    } else {
      doc.setFillColor(148, 163, 184); // grey
    }
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setFontSize(28);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text("FACTURE", pageWidth / 2, 18, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Numéro: ${facture.invoice_number_generated || facture.invoice_number}`, pageWidth / 2, 26, { align: "center" });
    doc.setTextColor(0, 0, 0);
    
    let yPos = 50;
    
    // Info chauffeur
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("CHAUFFEUR VTC", 20, yPos);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    yPos += 5;
    
    const driverName = course.drivers?.profiles?.full_name || "N/A";
    doc.text(driverName, 20, yPos);
    yPos += 4;
    
    if (course.drivers?.company_name) {
      doc.text(course.drivers.company_name, 20, yPos);
      yPos += 4;
    }
    
    // Détails course
    yPos = 95;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.rect(15, yPos, pageWidth - 30, 40);
    
    yPos += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("DÉTAILS DE LA PRESTATION", 20, yPos);
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    yPos += 6;
    
    doc.text("Départ:", 20, yPos);
    doc.text(course.pickup_address, 45, yPos);
    yPos += 4;
    
    doc.text("Arrivée:", 20, yPos);
    doc.text(course.destination_address, 45, yPos);
    yPos += 4;
    
    doc.text("Date:", 20, yPos);
    doc.text(format(new Date(course.scheduled_date), "dd/MM/yyyy 'à' HH:mm", { locale: fr }), 45, yPos);
    
    // Montant
    yPos = 155;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("MONTANT", 20, yPos);
    
    yPos += 8;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    if (isPaid) {
      doc.setFillColor(34, 197, 94);
    } else {
      doc.setFillColor(148, 163, 184);
    }
    doc.rect(15, yPos - 3, pageWidth - 30, 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL TTC", 20, yPos + 2);
    doc.text(`${facture.amount.toFixed(2)} €`, pageWidth - 20, yPos + 2, { align: "right" });
    doc.setTextColor(0, 0, 0);
    
    doc.save(`facture-${facture.invoice_number_generated || facture.invoice_number}.pdf`);
    toast.success("Facture téléchargée");
  };

  const handleShareDevis = (devis: any, course: any, method: 'whatsapp' | 'sms' | 'email' | 'facebook') => {
    const message = `Devis ${devis.quote_number}\n` +
                   `Trajet: ${course.pickup_address} → ${course.destination_address}\n` +
                   `Date: ${format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}\n` +
                   `Montant: ${devis.amount.toFixed(2)}€`;

    const encodedMessage = encodeURIComponent(message);

    switch (method) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
        break;
      case 'sms':
        window.open(`sms:?body=${encodedMessage}`, '_blank');
        break;
      case 'email':
        window.open(`mailto:?subject=Devis ${devis.quote_number}&body=${encodedMessage}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}&quote=${encodedMessage}`, '_blank');
        break;
    }
    toast.success("Partage ouvert");
  };

  const handleShareFacture = (facture: any, course: any, method: 'whatsapp' | 'sms' | 'email' | 'facebook') => {
    const message = `Facture ${facture.invoice_number_generated || facture.invoice_number}\n` +
                   `Trajet: ${course.pickup_address} → ${course.destination_address}\n` +
                   `Date: ${format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}\n` +
                   `Montant: ${facture.amount.toFixed(2)}€`;

    const encodedMessage = encodeURIComponent(message);

    switch (method) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
        break;
      case 'sms':
        window.open(`sms:?body=${encodedMessage}`, '_blank');
        break;
      case 'email':
        window.open(`mailto:?subject=Facture ${facture.invoice_number_generated || facture.invoice_number}&body=${encodedMessage}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}&quote=${encodedMessage}`, '_blank');
        break;
    }
    toast.success("Partage ouvert");
  };

  const handleAcceptDevis = async (devisId: string, courseId: string) => {
    try {
      // Accepter le devis
      const { error: devisError } = await supabase
        .from("devis")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", devisId);

      if (devisError) throw devisError;

      // Mettre à jour le statut de la course à "accepted"
      const { error: courseError } = await supabase
        .from("courses")
        .update({ status: "accepted" })
        .eq("id", courseId);

      if (courseError) throw courseError;

      toast.success("Devis accepté avec succès !");
      fetchCourses();
    } catch (error: any) {
      console.error("Error accepting devis:", error);
      toast.error("Erreur lors de l'acceptation du devis");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Chargement des courses...</p>
      </div>
    );
  }

  // Filtrer les courses par statut
  const pendingCourses = courses.filter((c) => c.status === "pending");
  const confirmedCourses = courses.filter((c) => c.status === "accepted" || c.status === "in_progress");
  const completedCourses = courses.filter((c) => c.status === "completed");
  const cancelledCourses = courses.filter((c) => c.status === "cancelled");

  const renderCourseCard = (course: any) => {
    const devis = course.devis?.[0];
    const facture = course.factures?.[0];

    return (
      <Card key={course.id} className="p-6 hover:shadow-elegant transition-all">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {course.drivers?.profiles?.profile_photo_url ? (
              <img
                src={course.drivers.profiles.profile_photo_url}
                alt={course.drivers.profiles.full_name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 bg-gradient-dark rounded-full flex items-center justify-center">
                <Car className="w-6 h-6 text-primary-foreground" />
              </div>
            )}
            <div>
              <h3 className="font-bold">{course.drivers?.profiles?.full_name}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{course.drivers?.vehicle_model}</span>
                {course.course_number && (
                  <>
                    <span>•</span>
                    <span className="text-premium">{course.course_number}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          {getStatusBadge(course.status)}
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-premium mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Départ</p>
              <p className="text-muted-foreground">{course.pickup_address}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Arrivée</p>
              <p className="text-muted-foreground">{course.destination_address}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", {
                locale: fr,
              })}
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {course.passengers_count} passager{course.passengers_count > 1 ? "s" : ""}
            </div>
          </div>

          {course.notes && (
            <div className="text-sm bg-secondary p-3 rounded-lg">
              <p className="font-medium mb-1">Notes :</p>
              <p className="text-muted-foreground">{course.notes}</p>
            </div>
          )}
        </div>

        {/* Afficher devis si disponible */}
        {devis && (
          <div className="p-3 bg-orange-500/10 rounded-lg mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Devis {devis.quote_number}</span>
              <span className="text-2xl font-bold text-orange-500">{devis.amount.toFixed(2)}€</span>
            </div>
            
            {/* Bouton accepter pour devis pending dans la section En attente */}
            {course.status === "pending" && devis.status === "pending" && (
              <Button
                onClick={() => handleAcceptDevis(devis.id, course.id)}
                className="w-full mb-2 bg-green-500 hover:bg-green-600"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Accepter le devis
              </Button>
            )}
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadDevis(devis, course)}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShareDevis(devis, course, 'whatsapp')}
                className="flex-1"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShareDevis(devis, course, 'email')}
                className="flex-1"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email
              </Button>
            </div>
          </div>
        )}

        {/* Afficher facture si disponible */}
        {facture && (
          <div className="p-3 bg-green-500/10 rounded-lg mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Facture {facture.invoice_number_generated || facture.invoice_number}</span>
              <span className="text-2xl font-bold text-green-500">{facture.amount.toFixed(2)}€</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadFacture(facture, course)}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShareFacture(facture, course, 'whatsapp')}
                className="flex-1"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShareFacture(facture, course, 'email')}
                className="flex-1"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email
              </Button>
            </div>
          </div>
        )}

        {course.status === "pending" && (
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              onClick={() => toast.info("Messagerie disponible dans l'onglet Messages")}
              variant="outline"
              className="flex-1"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Contacter
            </Button>
            <Button
              onClick={() => setCancelCourseId(course.id)}
              variant="outline"
              className="flex-1 text-destructive hover:text-destructive"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Annuler
            </Button>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger 
            value="pending"
            className="data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-500"
          >
            <Clock className="w-4 h-4 mr-2" />
            En attente
            <Badge className="ml-2 bg-yellow-500/30">{pendingCourses.length}</Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="confirmed"
            className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-500"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Confirmée
            <Badge className="ml-2 bg-blue-500/30">{confirmedCourses.length}</Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="completed"
            className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-500"
          >
            <FileText className="w-4 h-4 mr-2" />
            Terminée
            <Badge className="ml-2 bg-green-500/30">{completedCourses.length}</Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="cancelled"
            className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-500"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Refusé
            <Badge className="ml-2 bg-red-500/30">{cancelledCourses.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-6">
          {pendingCourses.length === 0 ? (
            <Card className="p-8 text-center">
              <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Aucune course en attente</h3>
              <p className="text-muted-foreground">
                Vos demandes de courses apparaîtront ici
              </p>
            </Card>
          ) : (
            pendingCourses.map(renderCourseCard)
          )}
        </TabsContent>

        <TabsContent value="confirmed" className="space-y-4 mt-6">
          {confirmedCourses.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Aucune course confirmée</h3>
              <p className="text-muted-foreground">
                Vos courses confirmées apparaîtront ici
              </p>
            </Card>
          ) : (
            confirmedCourses.map(renderCourseCard)
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-6">
          {completedCourses.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Aucune course terminée</h3>
              <p className="text-muted-foreground">
                Vos courses terminées apparaîtront ici
              </p>
            </Card>
          ) : (
            completedCourses.map(renderCourseCard)
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4 mt-6">
          {cancelledCourses.length === 0 ? (
            <Card className="p-8 text-center">
              <XCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Aucune course annulée</h3>
              <p className="text-muted-foreground">
                Vos courses annulées apparaîtront ici
              </p>
            </Card>
          ) : (
            cancelledCourses.map(renderCourseCard)
          )}
        </TabsContent>
      </Tabs>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancelCourseId} onOpenChange={(open) => !open && setCancelCourseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cette course ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action annulera définitivement votre réservation. Le chauffeur en sera informé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmer l'annulation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClientCoursesList;
