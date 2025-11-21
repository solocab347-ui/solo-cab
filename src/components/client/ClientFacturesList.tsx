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
import jsPDF from "jspdf";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ClientFacturesListProps {
  clientId: string;
}

const ClientFacturesList = ({ clientId }: ClientFacturesListProps) => {
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
      const { data, error } = await supabase
        .from("factures")
        .select(`
          *,
          drivers!inner(
            id,
            company_name,
            siret,
            company_address,
            profiles:user_id(full_name, phone)
          ),
          courses!inner(
            pickup_address,
            destination_address,
            scheduled_date,
            distance_km,
            duration_minutes,
            passengers_count
          ),
          devis(
            base_price,
            distance_price,
            time_price
          ),
          clients!inner(
            profiles:user_id(full_name, phone, email)
          )
        `)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFactures(data || []);
      setFilteredFactures(data || []);
    } catch (error: any) {
      console.error("Error fetching factures:", error);
      toast.error("Erreur lors du chargement des factures");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (facture: any) => {
    const jsPDF = (await import("jspdf")).default;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Green header for invoices
    const headerColor: [number, number, number] = [46, 204, 113];

    // Header
    doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.text("FACTURE", pageWidth / 2, 25, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`N°: ${facture.invoice_number_generated || facture.invoice_number}`, pageWidth / 2, 35, { align: "center" });
    doc.text(`Date: ${format(new Date(facture.created_at), "dd/MM/yyyy", { locale: fr })}`, pageWidth / 2, 42, { align: "center" });

    // Driver info (left side)
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("CHAUFFEUR VTC", 20, 65);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    const driverName = facture.drivers?.profiles?.full_name || facture.drivers?.company_name || "N/A";
    doc.text(driverName, 20, 71);
    if (facture.drivers?.company_name && facture.drivers.company_name !== driverName) {
      doc.text(facture.drivers.company_name, 20, 76);
    }
    if (facture.drivers?.siret) {
      doc.text(`SIRET: ${facture.drivers.siret}`, 20, 81);
    } else if (facture.drivers?.siren) {
      doc.text(`SIREN: ${facture.drivers.siren}`, 20, 81);
    }
    doc.text(`Tél: ${facture.drivers?.profiles?.phone || 'N/A'}`, 20, 86);
    
    if (facture.drivers?.company_address) {
      const addressLines = doc.splitTextToSize(facture.drivers.company_address, 75);
      doc.text(addressLines, 20, 91);
    }

    // Client info (right side)
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("CLIENT", pageWidth - 20, 65, { align: 'right' });
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    const clientName = facture.clients?.profiles?.full_name || "N/A";
    doc.text(clientName, pageWidth - 20, 71, { align: 'right' });
    
    if (facture.clients?.profiles?.email) {
      doc.text(facture.clients.profiles.email, pageWidth - 20, 76, { align: 'right' });
    }
    
    if (facture.clients?.profiles?.phone) {
      doc.text(`Tél: ${facture.clients.profiles.phone}`, pageWidth - 20, 81, { align: 'right' });
    }

    // Service details box
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, 110, 170, 55);
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("DÉTAILS DE LA PRESTATION", 25, 118);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    const pickupLines = doc.splitTextToSize(facture.courses.pickup_address, 140);
    const destLines = doc.splitTextToSize(facture.courses.destination_address, 140);
    
    doc.text("Départ:", 25, 126);
    doc.text(pickupLines, 50, 126);
    
    let currentY = 126 + (pickupLines.length * 5);
    doc.text("Arrivée:", 25, currentY);
    doc.text(destLines, 50, currentY);
    
    currentY += (destLines.length * 5);
    doc.text(`Date: ${format(new Date(facture.courses.scheduled_date), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`, 25, currentY);
    doc.text(`Passagers: ${facture.courses.passengers_count}`, 25, currentY + 5);
    doc.text(`Distance: ${facture.courses.distance_km} km`, 105, currentY + 5);

    // Payment info
    let yPos = 175;
    doc.text(`Mode de paiement: ${facture.payment_method || 'N/A'}`, 20, yPos);

    // Pricing table - client version (simplified)
    yPos += 5;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("TARIFICATION", 20, yPos);
    yPos += 8;

    const amount = facture.amount;
    const tvaRate = facture.devis?.time_price && facture.devis.time_price > 0 ? 20 : 10;
    const subtotalHT = amount / (1 + tvaRate / 100);
    const tvaAmount = amount - subtotalHT;

    doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.rect(20, yPos, 170, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text("Description", 25, yPos + 5.5);
    doc.text("Montant", 175, yPos + 5.5, { align: 'right' });
    
    yPos += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    doc.setFillColor(245, 245, 245);
    doc.rect(20, yPos, 170, 7, 'F');
    doc.text("Sous-total HT", 25, yPos + 5);
    doc.text(`${subtotalHT.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
    
    yPos += 7;
    doc.text(`TVA (${tvaRate}%)`, 25, yPos + 5);
    doc.text(`${tvaAmount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
    
    yPos += 9;
    doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.rect(20, yPos, 170, 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.text("TOTAL TTC", 25, yPos + 6);
    doc.text(`${amount.toFixed(2)} €`, 175, yPos + 6, { align: 'right' });

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFillColor(240, 240, 240);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text("Merci de votre confiance", pageWidth / 2, pageHeight - 8, { align: "center" });

    doc.save(`facture-${facture.invoice_number_generated || facture.invoice_number}-client.pdf`);
    toast.success("Facture téléchargée");
  };

  const handleShareFacture = (facture: any, channel: 'whatsapp' | 'email') => {
    const message = `Facture ${facture.invoice_number_generated || facture.invoice_number}\nMontant: ${facture.amount}€\nDate: ${format(new Date(facture.created_at), "dd/MM/yyyy", { locale: fr })}`;
    
    if (channel === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    } else if (channel === 'email') {
      window.location.href = `mailto:?subject=Facture ${facture.invoice_number_generated || facture.invoice_number}&body=${encodeURIComponent(message)}`;
    }
    
    toast.success("Facture partagée");
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
                      <DropdownMenuItem onClick={() => handleShareFacture(facture, 'email')}>
                        Email
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
