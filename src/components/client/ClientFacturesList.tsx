import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Search, Download, CheckCircle, Share2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { generateUnifiedInvoicePDF } from "@/lib/invoice/generateUnifiedInvoicePDF";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ClientFacturesListProps {
  clientId: string;
  userEmail?: string | null;
  userPhone?: string | null;
}

const ClientFacturesList = ({ clientId, userEmail, userPhone }: ClientFacturesListProps) => {
  const [factures, setFactures] = useState<any[]>([]);
  const [filteredFactures, setFilteredFactures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchFactures();
  }, [clientId]);

  useEffect(() => {
    const filtered = factures.filter(
      (facture) =>
        facture.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        facture.drivers?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredFactures(filtered);
  }, [searchTerm, factures]);

  const fetchFactures = async () => {
    try {
      const factureSelect = `
        *,
        drivers(
          id,
          company_name,
          siret,
          company_address,
          profiles:user_id(full_name, phone)
        ),
        courses!inner(
          id,
          pickup_address,
          destination_address,
          scheduled_date,
          distance_km,
          duration_minutes,
          passengers_count,
          guest_name,
          guest_email,
          guest_phone
        ),
        devis(
          amount,
          time_price,
          distance_price,
          tva_rate,
          tva_amount,
          airport_fee
        ),
        clients(
          profiles:user_id(full_name, phone, email)
        )
      `;

      const merged = new Map<string, any>();

      const { data: clientFactures, error: clientError } = await supabase
        .from("factures")
        .select(factureSelect)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (clientError) throw clientError;
      (clientFactures || []).forEach((facture) => merged.set(facture.id, facture));

      const guestCourseFilters: string[] = [];
      if (userEmail) guestCourseFilters.push(`guest_email.ilike.${userEmail}`);
      if (userPhone) guestCourseFilters.push(`guest_phone.eq.${userPhone}`);

      if (guestCourseFilters.length > 0) {
        const { data: guestCourses, error: guestCoursesError } = await supabase
          .from("courses")
          .select("id")
          .or(guestCourseFilters.join(","));

        if (guestCoursesError) throw guestCoursesError;

        const guestCourseIds = (guestCourses || []).map((course) => course.id);
        if (guestCourseIds.length > 0) {
          const { data: guestFactures, error: guestFacturesError } = await supabase
            .from("factures")
            .select(factureSelect)
            .in("course_id", guestCourseIds)
            .order("created_at", { ascending: false });

          if (guestFacturesError) throw guestFacturesError;
          (guestFactures || []).forEach((facture) => merged.set(facture.id, facture));
        }
      }

      const allFactures = Array.from(merged.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setFactures(allFactures);
      setFilteredFactures(allFactures);
    } catch (error: any) {
      console.error("Error fetching factures:", error);
      toast.error("Erreur lors du chargement des factures");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (facture: any) => {
    try {
      await generateUnifiedInvoicePDF(
        {
          facture,
          course: {
            pickup_address: facture.courses?.pickup_address || "",
            destination_address: facture.courses?.destination_address || "",
            scheduled_date: facture.courses?.scheduled_date || facture.created_at,
            passengers_count: facture.courses?.passengers_count,
            distance_km: facture.courses?.distance_km,
            duration_minutes: facture.courses?.duration_minutes,
            guest_name: facture.courses?.guest_name,
            guest_email: facture.courses?.guest_email,
            guest_phone: facture.courses?.guest_phone,
          },
          driver: facture.drivers || {},
          client: facture.clients,
          variant: "client",
        },
        { download: true }
      );
      toast.success("Facture téléchargée");
    } catch (e) {
      console.error("Erreur génération facture", e);
      toast.error("Erreur lors de la génération de la facture");
    }
  };

  const handleShareFacture = (facture: any, channel: 'whatsapp' | 'email' | 'sms' | 'facebook') => {
    // Génération de message contextuel avec formules de politesse
    const { generateFactureShareMessage } = require("@/lib/courseMessageGenerator");
    
    const message = generateFactureShareMessage(
      facture,
      facture.courses,
      facture.drivers,
      facture.clients,
      false // Client partage la facture
    );
    
    const encodedMessage = encodeURIComponent(message);
    
    switch (channel) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
        break;
      case 'sms':
        window.open(`sms:?body=${encodedMessage}`, '_blank');
        break;
      case 'email':
        window.location.href = `mailto:?subject=Facture ${facture.invoice_number_generated || facture.invoice_number}&body=${encodedMessage}`;
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}&quote=${encodedMessage}`, '_blank');
        break;
    }
    
    toast.success("Message préparé pour partage");
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      paid: "bg-gradient-success text-white border-0 shadow-md",
      pending: "bg-gradient-trust text-white border-0 shadow-md",
      failed: "bg-destructive/90 text-white border-0 shadow-md",
      refunded: "bg-muted/90 text-white border-0 shadow-md",
    };

    const labels = {
      paid: "Payée",
      pending: "En attente",
      failed: "Échec",
      refunded: "Remboursée",
    };

    return (
      <Badge className={styles[status as keyof typeof styles]}>
        <CheckCircle className="w-3 h-3 mr-1" />
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Chargement des factures...</p>
      </div>
    );
  }

  const totalPaid = factures
    .filter((f) => f.payment_status === "paid")
    .reduce((sum, f) => sum + parseFloat(f.amount), 0);

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="p-6 bg-gradient-success border-0 shadow-elegant">
        <div className="text-center">
          <h3 className="text-3xl font-bold text-white mb-2">{totalPaid.toFixed(2)} €</h3>
          <p className="text-white/80">Total facturé</p>
        </div>
      </Card>

      {/* Search */}
      <Card className="p-4 bg-card/80 backdrop-blur-sm border-primary/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-primary" />
          <Input
            placeholder="Rechercher par numéro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background/50"
          />
        </div>
      </Card>

      {/* Factures List */}
      {filteredFactures.length === 0 ? (
        <Card className="p-8 text-center bg-gradient-success border-0">
          <FileText className="w-16 h-16 text-white mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2 text-white">Aucune facture</h3>
          <p className="text-white">
            {searchTerm
              ? "Aucune facture ne correspond à votre recherche"
              : "Vos factures apparaîtront ici"}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredFactures.map((facture) => (
            <Card key={facture.id} className="p-6 bg-gradient-success border-0 hover:shadow-elegant transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">
                      {facture.invoice_number_generated || facture.invoice_number}
                    </h3>
                    <p className="text-sm text-white/70">
                      {format(new Date(facture.created_at), "dd/MM/yyyy", { locale: fr })}
                    </p>
                  </div>
                </div>
                {getStatusBadge(facture.payment_status)}
              </div>

              <div className="space-y-2 mb-4 text-white/90">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold">Chauffeur:</span>
                  <span>{facture.drivers?.profiles?.full_name || facture.drivers?.company_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold">Trajet:</span>
                  <span className="truncate">{facture.courses.pickup_address} → {facture.courses.destination_address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold">Mode de paiement:</span>
                  <span>{facture.payment_method || "N/A"}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/20">
                <span className="text-2xl font-bold text-white">{facture.amount.toFixed(2)} €</span>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleDownloadPDF(facture)}
                    variant="secondary"
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 text-white border-0"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="bg-white/20 hover:bg-white/30 text-white border-0"
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleShareFacture(facture, 'whatsapp')}>
                        WhatsApp
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShareFacture(facture, 'sms')}>
                        SMS
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShareFacture(facture, 'email')}>
                        Email
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShareFacture(facture, 'facebook')}>
                        Facebook
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientFacturesList;
