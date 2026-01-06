import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { subscriptionManager } from "@/lib/subscriptionManager";
import { toast } from "sonner";
import { FileText, Download, MapPin, Calendar, Euro, CreditCard, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";

interface CompanyFacturesListProps {
  companyId: string;
}

export const CompanyFacturesList = ({ companyId }: CompanyFacturesListProps) => {
  const [factures, setFactures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFactures();
    const unsubscribe = setupRealtimeSubscription();
    return () => unsubscribe?.();
  }, [companyId]);

  const fetchFactures = async () => {
    try {
      const { data, error } = await supabase
        .from("factures")
        .select(`
          *,
          courses!inner(
            pickup_address,
            destination_address,
            scheduled_date,
            distance_km
          ),
          drivers!inner(
            company_name,
            company_address,
            siret,
            siren,
            tva_number,
            profiles:user_id(full_name, phone)
          ),
          companies!factures_company_id_fkey(
            company_name,
            siret,
            siren,
            tva_number,
            address,
            billing_address,
            contact_email,
            contact_phone
          )
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFactures(data || []);
    } catch (error: any) {
      console.error("Error fetching factures:", error);
      toast.error("Erreur lors du chargement des factures");
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!companyId) return () => {};

    return subscriptionManager.subscribe(
      `factures-company-${companyId}`,
      {
        table: "factures",
        event: "*",
        filter: `company_id=eq.${companyId}`,
        debounceMs: 1000
      },
      () => fetchFactures()
    );
  };

  const getStatusBadge = (status: string) => {
    if (status === "paid") {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle className="w-3 h-3 mr-1" />
          Payée
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
        <Clock className="w-3 h-3 mr-1" />
        En attente
      </Badge>
    );
  };

  const handleDownloadFacture = (facture: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    const isPaid = facture.payment_status === 'paid';
    if (isPaid) {
      doc.setFillColor(34, 197, 94);
    } else {
      doc.setFillColor(234, 179, 8);
    }
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setFontSize(28);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text("FACTURE", pageWidth / 2, 18, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`N° ${facture.invoice_number_generated || facture.invoice_number}`, pageWidth / 2, 26, { align: "center" });
    doc.text(`Date: ${format(new Date(facture.created_at), "dd/MM/yyyy", { locale: fr })}`, pageWidth / 2, 32, { align: "center" });
    doc.setTextColor(0, 0, 0);
    
    let yPos = 50;
    
    // Chauffeur / Émetteur (left side)
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("ÉMETTEUR", 20, yPos);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    yPos += 5;
    
    const driverName = facture.drivers?.profiles?.full_name || facture.drivers?.company_name || "N/A";
    doc.text(driverName, 20, yPos);
    yPos += 4;
    
    if (facture.drivers?.company_name && facture.drivers.company_name !== driverName) {
      doc.text(facture.drivers.company_name, 20, yPos);
      yPos += 4;
    }
    
    if (facture.drivers?.company_address) {
      doc.text(facture.drivers.company_address, 20, yPos);
      yPos += 4;
    }
    
    if (facture.drivers?.siret) {
      doc.text(`SIRET: ${facture.drivers.siret}`, 20, yPos);
      yPos += 4;
    } else if (facture.drivers?.siren) {
      doc.text(`SIREN: ${facture.drivers.siren}`, 20, yPos);
      yPos += 4;
    }
    
    if (facture.drivers?.tva_number) {
      doc.text(`TVA: ${facture.drivers.tva_number}`, 20, yPos);
    }
    
    // Entreprise / Destinataire (right side)
    let rightYPos = 50;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("DESTINATAIRE", pageWidth - 20, rightYPos, { align: 'right' });
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    rightYPos += 5;
    
    const company = facture.companies;
    if (company) {
      doc.text(company.company_name || "N/A", pageWidth - 20, rightYPos, { align: 'right' });
      rightYPos += 4;
      
      if (company.siret) {
        doc.text(`SIRET: ${company.siret}`, pageWidth - 20, rightYPos, { align: 'right' });
        rightYPos += 4;
      } else if (company.siren) {
        doc.text(`SIREN: ${company.siren}`, pageWidth - 20, rightYPos, { align: 'right' });
        rightYPos += 4;
      }
      
      if (company.tva_number) {
        doc.text(`TVA: ${company.tva_number}`, pageWidth - 20, rightYPos, { align: 'right' });
        rightYPos += 4;
      }
      
      const companyAddress = company.billing_address || company.address;
      if (companyAddress) {
        const addressLines = doc.splitTextToSize(companyAddress, 75);
        addressLines.forEach((line: string, index: number) => {
          doc.text(line, pageWidth - 20, rightYPos + (index * 4), { align: 'right' });
        });
        rightYPos += addressLines.length * 4;
      }
      
      if (company.contact_email) {
        doc.text(company.contact_email, pageWidth - 20, rightYPos, { align: 'right' });
        rightYPos += 4;
      }
      
      if (company.contact_phone) {
        doc.text(`Tél: ${company.contact_phone}`, pageWidth - 20, rightYPos, { align: 'right' });
      }
    }
    
    // Détails de la course
    yPos = 105;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.rect(15, yPos, pageWidth - 30, 40);
    
    yPos += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("PRESTATION", 20, yPos);
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    yPos += 6;
    
    doc.text("Départ:", 20, yPos);
    const pickupLines = doc.splitTextToSize(facture.courses.pickup_address, pageWidth - 55);
    doc.text(pickupLines, 45, yPos);
    yPos += 4 * pickupLines.length;
    
    doc.text("Arrivée:", 20, yPos);
    const destLines = doc.splitTextToSize(facture.courses.destination_address, pageWidth - 55);
    doc.text(destLines, 45, yPos);
    yPos += 4 * destLines.length + 1;
    
    doc.text("Date:", 20, yPos);
    doc.text(format(new Date(facture.courses.scheduled_date), "dd/MM/yyyy 'à' HH:mm", { locale: fr }), 45, yPos);
    
    // Montant
    yPos = 165;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    
    if (isPaid) {
      doc.setFillColor(34, 197, 94);
    } else {
      doc.setFillColor(234, 179, 8);
    }
    doc.rect(15, yPos - 3, pageWidth - 30, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL TTC", 20, yPos + 3);
    doc.text(`${facture.amount.toFixed(2)} €`, pageWidth - 20, yPos + 3, { align: "right" });
    doc.setTextColor(0, 0, 0);
    
    // Statut de paiement
    yPos += 20;
    doc.setFontSize(10);
    doc.text(`Statut: ${isPaid ? 'PAYÉE' : 'EN ATTENTE DE PAIEMENT'}`, 20, yPos);
    
    if (facture.payment_method) {
      yPos += 5;
      doc.text(`Moyen de paiement: ${facture.payment_method}`, 20, yPos);
    }
    
    if (facture.paid_at) {
      yPos += 5;
      doc.text(`Payée le: ${format(new Date(facture.paid_at), "dd/MM/yyyy", { locale: fr })}`, 20, yPos);
    }
    
    // Pied de page
    doc.setFillColor(245, 245, 245);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text("Merci de votre confiance", pageWidth / 2, pageHeight - 8, { align: "center" });
    
    doc.save(`facture-${facture.invoice_number_generated || facture.invoice_number}.pdf`);
    toast.success("Facture téléchargée");
  };

  const paidFactures = factures.filter(f => f.payment_status === "paid");
  const pendingFactures = factures.filter(f => f.payment_status !== "paid");

  // Calculs statistiques
  const totalPaid = paidFactures.reduce((sum, f) => sum + parseFloat(f.amount), 0);
  const totalPending = pendingFactures.reduce((sum, f) => sum + parseFloat(f.amount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Mes factures</h2>
        <p className="text-sm text-muted-foreground">Consultez et téléchargez vos factures</p>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Euro className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total facturé</span>
            </div>
            <p className="text-2xl font-bold mt-2">{(totalPaid + totalPending).toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Payées</span>
            </div>
            <p className="text-2xl font-bold mt-2 text-green-600">{totalPaid.toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground">En attente</span>
            </div>
            <p className="text-2xl font-bold mt-2 text-yellow-600">{totalPending.toFixed(2)} €</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending">
            En attente ({pendingFactures.length})
          </TabsTrigger>
          <TabsTrigger value="paid">
            Payées ({paidFactures.length})
          </TabsTrigger>
        </TabsList>

        {[
          { key: "pending", data: pendingFactures },
          { key: "paid", data: paidFactures }
        ].map(({ key, data }) => (
          <TabsContent key={key} value={key}>
            {data.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">Aucune facture</h3>
                  <p className="text-muted-foreground">
                    {key === "pending" && "Aucune facture en attente de paiement."}
                    {key === "paid" && "Aucune facture payée."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {data.map((facture) => (
                  <Card key={facture.id}>
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            <span className="font-medium">
                              Facture n°{facture.invoice_number_generated || facture.invoice_number}
                            </span>
                            {getStatusBadge(facture.payment_status)}
                          </div>

                          <div className="grid gap-2 text-sm">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                              <div>
                                <p className="font-medium">{facture.courses.pickup_address}</p>
                                <p className="text-muted-foreground">→ {facture.courses.destination_address}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span>
                                {format(new Date(facture.courses.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t">
                            <span className="text-sm text-muted-foreground">Chauffeur:</span>
                            <span className="text-sm font-medium">
                              {facture.drivers?.profiles?.full_name || facture.drivers?.company_name}
                            </span>
                          </div>

                          {facture.payment_method && (
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{facture.payment_method}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-3">
                          <div className="text-right">
                            <p className="text-2xl font-bold">{facture.amount.toFixed(2)} €</p>
                            <p className="text-xs text-muted-foreground">
                              Émise le {format(new Date(facture.created_at), "d MMM yyyy", { locale: fr })}
                            </p>
                          </div>

                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownloadFacture(facture)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Télécharger
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
