import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Download, FileText, Table, Shield } from "lucide-react";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const RGPDData = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    fetchUserData();
  }, [user, userRole]);

  const fetchUserData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Récupérer le profil
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      let specificData: any = {};

      if (userRole === "driver") {
        // Données chauffeur
        const { data: driver } = await supabase
          .from("drivers")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (driver) {
          // Clients
          const { data: clients } = await supabase
            .from("clients")
            .select(`*, profiles:user_id(full_name, email, phone)`)
            .or(`driver_id.eq.${driver.id},driver_ids.cs.{${driver.id}}`);

          // Courses
          const { data: courses } = await supabase
            .from("courses")
            .select("*")
            .or(`driver_id.eq.${driver.id},driver_ids.cs.{${driver.id}}`);

          // Devis
          const { data: devis } = await supabase
            .from("devis")
            .select("*")
            .eq("driver_id", driver.id);

          // Factures
          const { data: factures } = await supabase
            .from("factures")
            .select("*")
            .eq("driver_id", driver.id);

          // Promotions
          const { data: promotions } = await supabase
            .from("promotions")
            .select("*")
            .eq("driver_id", driver.id);

          // QR Code
          const { data: qrCode } = await supabase
            .from("qr_codes")
            .select("*")
            .eq("driver_id", driver.id)
            .maybeSingle();

          specificData = {
            driver,
            clients,
            courses,
            devis,
            factures,
            promotions,
            qrCode,
          };
        }
      } else if (userRole === "client") {
        // Données client
        const { data: client } = await supabase
          .from("clients")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (client) {
          // Courses
          const { data: courses } = await supabase
            .from("courses")
            .select("*")
            .eq("client_id", client.id);

          // Devis
          const { data: devis } = await supabase
            .from("devis")
            .select("*")
            .eq("client_id", client.id);

          // Factures
          const { data: factures } = await supabase
            .from("factures")
            .select("*")
            .eq("client_id", client.id);

          specificData = {
            client,
            courses,
            devis,
            factures,
          };
        }
      }

      // Messages
      const { data: conversations } = await supabase
        .from("conversations")
        .select("*, messages(*)")
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`);

      // Notifications
      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id);

      setUserData({
        profile,
        ...specificData,
        conversations,
        notifications,
      });
    } catch (error: any) {
      console.error("Error fetching user data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!userData) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    
    // En-tête
    csvContent += "EXPORT RGPD - SOLOCAB\n";
    csvContent += `Date d'export: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr })}\n\n`;

    // Profil
    csvContent += "PROFIL\n";
    csvContent += `Nom,${userData.profile?.full_name || ""}\n`;
    csvContent += `Email,${userData.profile?.email || ""}\n`;
    csvContent += `Téléphone,${userData.profile?.phone || ""}\n`;
    csvContent += `Adresse,${userData.profile?.address || ""}\n`;
    csvContent += `Date d'inscription,${userData.profile?.created_at ? format(new Date(userData.profile.created_at), "dd/MM/yyyy", { locale: fr }) : ""}\n\n`;

    if (userRole === "driver" && userData.driver) {
      csvContent += "INFORMATIONS CHAUFFEUR\n";
      csvContent += `Statut,${userData.driver.status}\n`;
      csvContent += `Véhicule,${userData.driver.vehicle_model || ""}\n`;
      csvContent += `Immatriculation,${userData.driver.vehicle_plate || ""}\n`;
      csvContent += `Couleur,${userData.driver.vehicle_color || ""}\n`;
      csvContent += `Entreprise,${userData.driver.company_name || ""}\n`;
      csvContent += `SIRET,${userData.driver.siret || ""}\n`;
      csvContent += `Note moyenne,${userData.driver.rating || "0"}\n`;
      csvContent += `Courses totales,${userData.driver.total_rides || "0"}\n\n`;
      
      if (userData.clients?.length > 0) {
        csvContent += "CLIENTS\n";
        csvContent += "Nom,Email,Téléphone,Type,Date d'inscription\n";
        userData.clients.forEach((c: any) => {
          csvContent += `${c.profiles?.full_name || ""},${c.profiles?.email || ""},${c.profiles?.phone || ""},${c.is_exclusive ? "Exclusif" : "Libre"},${format(new Date(c.created_at), "dd/MM/yyyy", { locale: fr })}\n`;
        });
        csvContent += "\n";
      }
    }

    if (userRole === "client" && userData.client) {
      csvContent += "INFORMATIONS CLIENT\n";
      csvContent += `Type,${userData.client.is_exclusive ? "Exclusif" : "Libre"}\n`;
      csvContent += `Courses totales,${userData.client.total_rides || "0"}\n`;
      csvContent += `Total dépensé,${userData.client.total_spent || "0"}€\n\n`;
    }

    // Courses
    if (userData.courses?.length > 0) {
      csvContent += "COURSES\n";
      csvContent += "Numéro,Départ,Arrivée,Date,Statut,Distance,Passagers\n";
      userData.courses.forEach((c: any) => {
        csvContent += `${c.course_number || ""},${c.pickup_address},${c.destination_address},${format(new Date(c.scheduled_date), "dd/MM/yyyy HH:mm", { locale: fr })},${c.status},${c.distance_km || "0"} km,${c.passengers_count}\n`;
      });
      csvContent += "\n";
    }

    // Devis
    if (userData.devis?.length > 0) {
      csvContent += "DEVIS\n";
      csvContent += "Numéro,Montant,Statut,Date de création,Valide jusqu'au\n";
      userData.devis.forEach((d: any) => {
        csvContent += `${d.quote_number || ""},${d.amount}€,${d.status},${format(new Date(d.created_at), "dd/MM/yyyy", { locale: fr })},${format(new Date(d.valid_until), "dd/MM/yyyy", { locale: fr })}\n`;
      });
      csvContent += "\n";
    }

    // Factures
    if (userData.factures?.length > 0) {
      csvContent += "FACTURES\n";
      csvContent += "Numéro,Montant,Statut paiement,Date\n";
      userData.factures.forEach((f: any) => {
        csvContent += `${f.invoice_number || ""},${f.amount}€,${f.payment_status},${format(new Date(f.created_at), "dd/MM/yyyy", { locale: fr })}\n`;
      });
      csvContent += "\n";
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `donnees_rgpd_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Export CSV téléchargé avec succès");
  };

  const exportToPDF = () => {
    if (!userData) return;

    const doc = new jsPDF();
    let yPos = 20;

    // Titre
    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246);
    doc.text("Export RGPD - SoloCab", 20, yPos);
    
    yPos += 10;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Date d'export: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr })}`, 20, yPos);
    
    yPos += 15;
    doc.setDrawColor(59, 130, 246);
    doc.line(20, yPos, 190, yPos);
    
    // Profil
    yPos += 10;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("PROFIL", 20, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.text(`Nom: ${userData.profile?.full_name || ""}`, 25, yPos);
    yPos += 6;
    doc.text(`Email: ${userData.profile?.email || ""}`, 25, yPos);
    yPos += 6;
    doc.text(`Téléphone: ${userData.profile?.phone || ""}`, 25, yPos);
    yPos += 6;
    doc.text(`Adresse: ${userData.profile?.address || ""}`, 25, yPos);
    yPos += 6;
    doc.text(`Date d'inscription: ${userData.profile?.created_at ? format(new Date(userData.profile.created_at), "dd/MM/yyyy", { locale: fr }) : ""}`, 25, yPos);

    if (userRole === "driver" && userData.driver) {
      yPos += 15;
      doc.setFontSize(14);
      doc.text("INFORMATIONS CHAUFFEUR", 20, yPos);
      
      yPos += 8;
      doc.setFontSize(10);
      doc.text(`Statut: ${userData.driver.status}`, 25, yPos);
      yPos += 6;
      doc.text(`Véhicule: ${userData.driver.vehicle_model || ""}`, 25, yPos);
      yPos += 6;
      doc.text(`Immatriculation: ${userData.driver.vehicle_plate || ""}`, 25, yPos);
      yPos += 6;
      doc.text(`Entreprise: ${userData.driver.company_name || ""}`, 25, yPos);
      yPos += 6;
      doc.text(`SIRET: ${userData.driver.siret || ""}`, 25, yPos);
      yPos += 6;
      doc.text(`Note moyenne: ${userData.driver.rating || "0"}`, 25, yPos);
      yPos += 6;
      doc.text(`Courses totales: ${userData.driver.total_rides || "0"}`, 25, yPos);
    }

    if (userRole === "client" && userData.client) {
      yPos += 15;
      doc.setFontSize(14);
      doc.text("INFORMATIONS CLIENT", 20, yPos);
      
      yPos += 8;
      doc.setFontSize(10);
      doc.text(`Type: ${userData.client.is_exclusive ? "Exclusif" : "Libre"}`, 25, yPos);
      yPos += 6;
      doc.text(`Courses totales: ${userData.client.total_rides || "0"}`, 25, yPos);
      yPos += 6;
      doc.text(`Total dépensé: ${userData.client.total_spent || "0"}€`, 25, yPos);
    }

    // Statistiques rapides
    yPos += 15;
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.text("STATISTIQUES", 20, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.text(`Courses: ${userData.courses?.length || 0}`, 25, yPos);
    yPos += 6;
    doc.text(`Devis: ${userData.devis?.length || 0}`, 25, yPos);
    yPos += 6;
    doc.text(`Factures: ${userData.factures?.length || 0}`, 25, yPos);
    yPos += 6;
    doc.text(`Notifications: ${userData.notifications?.length || 0}`, 25, yPos);

    // Note de bas de page
    yPos += 20;
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Ce document contient un résumé de vos données personnelles.", 20, yPos);
    yPos += 5;
    doc.text("Pour plus de détails, utilisez l'export CSV ou contactez le support.", 20, yPos);

    doc.save(`donnees_rgpd_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`);
    toast.success("Export PDF téléchargé avec succès");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Chargement de vos données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Button
          variant="default"
          onClick={() => {
            // Rediriger vers le bon dashboard selon le rôle
            if (userRole === "driver") {
              navigate("/driver-dashboard");
            } else if (userRole === "client") {
              navigate("/client-dashboard");
            } else {
              navigate(-1);
            }
          }}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>

        <Card className="p-8 bg-card border-primary/10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Mes Données RGPD</h1>
              <p className="text-muted-foreground">
                Exportez toutes vos données personnelles conformément au RGPD
              </p>
            </div>
          </div>

          {/* Informations RGPD */}
          <div className="mb-8 p-6 bg-muted/50 rounded-lg border border-primary/20">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Vos droits RGPD
            </h2>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>✓ Droit d'accès à vos données personnelles</p>
              <p>✓ Droit à la portabilité de vos données</p>
              <p>✓ Droit de rectification et de suppression</p>
              <p>✓ Droit d'opposition au traitement</p>
            </div>
          </div>

          {/* Résumé des données */}
          {userData && (
            <div className="mb-8 grid md:grid-cols-2 gap-4">
              <Card className="p-6 bg-gradient-freedom border-0 shadow-success">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">{userData.courses?.length || 0}</h3>
                    <p className="text-sm text-white/80">Courses</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-independence border-0 shadow-trust">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">{userData.devis?.length || 0}</h3>
                    <p className="text-sm text-white/80">Devis</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-renewal border-0 shadow-premium">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">{userData.factures?.length || 0}</h3>
                    <p className="text-sm text-white/80">Factures</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-success border-0 shadow-elegant">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">{userData.notifications?.length || 0}</h3>
                    <p className="text-sm text-white/80">Notifications</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Boutons d'export */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Exporter mes données</h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              <Button
                onClick={exportToCSV}
                size="lg"
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg h-auto py-6"
              >
                <Table className="w-6 h-6 mr-3" />
                <div className="text-left">
                  <div className="font-bold">Exporter en Excel (CSV)</div>
                  <div className="text-xs text-white/80 font-normal">
                    Format tableur avec toutes les données détaillées
                  </div>
                </div>
              </Button>

              <Button
                onClick={exportToPDF}
                size="lg"
                className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow-lg h-auto py-6"
              >
                <Download className="w-6 h-6 mr-3" />
                <div className="text-left">
                  <div className="font-bold">Exporter en PDF</div>
                  <div className="text-xs text-white/80 font-normal">
                    Document récapitulatif de vos données
                  </div>
                </div>
              </Button>
            </div>
          </div>

          {/* Note importante */}
          <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note importante :</strong> Ces exports contiennent vos données personnelles. 
              Veuillez les conserver en lieu sûr et ne les partagez pas avec des tiers non autorisés.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RGPDData;
