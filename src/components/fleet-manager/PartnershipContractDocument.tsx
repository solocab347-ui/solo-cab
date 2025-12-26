import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  FileText, 
  Download, 
  Eye, 
  Handshake, 
  Calendar, 
  Percent, 
  Clock,
  Check,
  AlertTriangle,
  Building2,
  User,
  Wallet
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";

interface PartnershipContractDocumentProps {
  partnershipId: string;
  fleetManagerName: string;
  fleetManagerCompany: string;
  driverName: string;
  commissionPercentage: number;
  paymentSchedule: string;
  signedAt?: string;
  fleetManagerSignedAt?: string;
  driverSignedAt?: string;
  contractType: "fleet_driver" | "partner"; // fleet_driver = chauffeur associé, partner = indépendant avec commission
}

export const PartnershipContractDocument = ({
  partnershipId,
  fleetManagerName,
  fleetManagerCompany,
  driverName,
  commissionPercentage,
  paymentSchedule,
  signedAt,
  fleetManagerSignedAt,
  driverSignedAt,
  contractType,
}: PartnershipContractDocumentProps) => {
  const [showPreview, setShowPreview] = useState(false);

  const getPaymentScheduleLabel = (schedule: string) => {
    switch (schedule) {
      case "per_course": return "À chaque course (sous 48h)";
      case "weekly": return "Hebdomadaire (chaque lundi)";
      case "monthly": return "Mensuel (le 5 du mois)";
      default: return schedule;
    }
  };

  const getContractTypeLabel = () => {
    return contractType === "fleet_driver" 
      ? "Chauffeur Associé avec Matériel du Gestionnaire" 
      : "Partenariat Chauffeur Indépendant";
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const margin = 20;
    let y = margin;

    // Titre
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("CONTRAT DE PARTENARIAT VTC", 105, y, { align: "center" });
    y += 15;

    // Sous-titre
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(getContractTypeLabel(), 105, y, { align: "center" });
    y += 20;

    // Date et numéro
    doc.setFontSize(10);
    doc.text(`Numéro de contrat: ${partnershipId.slice(0, 8).toUpperCase()}`, margin, y);
    y += 6;
    doc.text(`Date d'établissement: ${format(new Date(signedAt || new Date()), "dd MMMM yyyy", { locale: fr })}`, margin, y);
    y += 15;

    // Parties
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("ENTRE LES PARTIES:", margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Le Gestionnaire de Flotte: ${fleetManagerName}`, margin, y);
    y += 6;
    doc.text(`Société: ${fleetManagerCompany}`, margin, y);
    y += 10;

    doc.text(`Le Chauffeur: ${driverName}`, margin, y);
    y += 15;

    // Conditions
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("CONDITIONS DU PARTENARIAT:", margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    if (contractType === "fleet_driver") {
      doc.text("1. Le Chauffeur utilise le véhicule fourni par le Gestionnaire.", margin, y);
      y += 8;
      doc.text("2. Le Gestionnaire conserve l'intégralité des revenus des courses.", margin, y);
      y += 8;
      doc.text("3. Le Chauffeur est rémunéré selon les conditions convenues séparément.", margin, y);
    } else {
      doc.text(`1. Taux de commission: ${commissionPercentage}% sur chaque course effectuée.`, margin, y);
      y += 8;
      doc.text(`2. Période de versement: ${getPaymentScheduleLabel(paymentSchedule)}`, margin, y);
      y += 8;
      doc.text("3. Le Chauffeur utilise son propre véhicule et encaisse directement les clients.", margin, y);
      y += 8;
      doc.text("4. Le Chauffeur s'engage à reverser la commission au Gestionnaire.", margin, y);
    }
    y += 15;

    // Engagements
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("ENGAGEMENTS:", margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const engagements = [
      "Le Chauffeur s'engage à respecter les délais de paiement convenus.",
      "Le Gestionnaire s'engage à fournir les courses selon les conditions du partenariat.",
      "Les deux parties s'engagent à communiquer tout changement de situation.",
      "Le non-respect des délais peut entraîner la suspension du partenariat.",
    ];

    engagements.forEach((eng, i) => {
      doc.text(`${i + 1}. ${eng}`, margin, y);
      y += 8;
    });
    y += 10;

    // Signatures
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("SIGNATURES:", margin, y);
    y += 15;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    // Gestionnaire
    doc.text("Le Gestionnaire:", margin, y);
    y += 8;
    if (fleetManagerSignedAt) {
      doc.text(`Signé le: ${format(new Date(fleetManagerSignedAt), "dd/MM/yyyy à HH:mm", { locale: fr })}`, margin, y);
      y += 6;
      doc.text(`Nom: ${fleetManagerName}`, margin, y);
    } else {
      doc.text("En attente de signature", margin, y);
    }
    y += 15;

    // Chauffeur
    doc.text("Le Chauffeur:", margin, y);
    y += 8;
    if (driverSignedAt) {
      doc.text(`Signé le: ${format(new Date(driverSignedAt), "dd/MM/yyyy à HH:mm", { locale: fr })}`, margin, y);
      y += 6;
      doc.text(`Nom: ${driverName}`, margin, y);
    } else {
      doc.text("En attente de signature", margin, y);
    }
    y += 20;

    // Footer
    doc.setFontSize(8);
    doc.text("Ce document fait foi de l'accord entre les parties.", 105, 280, { align: "center" });
    doc.text("Document généré automatiquement par SoloCab", 105, 285, { align: "center" });

    // Télécharger
    doc.save(`contrat-partenariat-${partnershipId.slice(0, 8)}.pdf`);
  };

  return (
    <>
      <div className="flex gap-2">
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Eye className="w-4 h-4" />
              Voir le contrat
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Contrat de Partenariat
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* En-tête */}
              <Card className="bg-gradient-to-br from-primary/10 to-accent/5 border-primary/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-primary/20">
                      <Handshake className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{getContractTypeLabel()}</CardTitle>
                      <CardDescription>
                        N° {partnershipId.slice(0, 8).toUpperCase()}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Parties */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Gestionnaire de Flotte</span>
                    </div>
                    <p className="font-semibold">{fleetManagerName}</p>
                    <p className="text-sm text-muted-foreground">{fleetManagerCompany}</p>
                    {fleetManagerSignedAt && (
                      <Badge className="mt-2 bg-success/20 text-success border-success/30">
                        <Check className="w-3 h-3 mr-1" />
                        Signé le {format(new Date(fleetManagerSignedAt), "dd/MM/yyyy")}
                      </Badge>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Chauffeur</span>
                    </div>
                    <p className="font-semibold">{driverName}</p>
                    {driverSignedAt && (
                      <Badge className="mt-2 bg-success/20 text-success border-success/30">
                        <Check className="w-3 h-3 mr-1" />
                        Signé le {format(new Date(driverSignedAt), "dd/MM/yyyy")}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* Conditions */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Conditions Financières
                </h3>
                
                {contractType === "fleet_driver" ? (
                  <Card className="bg-accent/10 border-accent/20">
                    <CardContent className="pt-4">
                      <p className="text-sm">
                        <strong>Chauffeur Associé avec Matériel du Gestionnaire</strong>
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <li>• Le gestionnaire fournit le véhicule</li>
                        <li>• Le gestionnaire conserve l'intégralité des revenus</li>
                        <li>• La rémunération du chauffeur est définie séparément</li>
                      </ul>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    <Card>
                      <CardContent className="pt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Percent className="w-4 h-4 text-primary" />
                          <span className="text-sm">Taux de commission</span>
                        </div>
                        <Badge variant="outline" className="text-lg font-bold">
                          {commissionPercentage}%
                        </Badge>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary" />
                          <span className="text-sm">Période de versement</span>
                        </div>
                        <Badge variant="secondary">
                          {getPaymentScheduleLabel(paymentSchedule)}
                        </Badge>
                      </CardContent>
                    </Card>

                    <Card className="bg-warning/10 border-warning/20">
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-warning">Engagement du Chauffeur</p>
                            <p className="text-muted-foreground mt-1">
                              Le chauffeur s'engage à reverser {commissionPercentage}% du montant de chaque course 
                              au gestionnaire selon la période convenue. Le non-respect répété des délais 
                              peut entraîner la suspension du partenariat.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              <Separator />

              {/* Date */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Date d'établissement</span>
                </div>
                <span>{format(new Date(signedAt || new Date()), "dd MMMM yyyy", { locale: fr })}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Fermer
              </Button>
              <Button onClick={generatePDF} className="gap-2">
                <Download className="w-4 h-4" />
                Télécharger PDF
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="ghost" size="sm" onClick={generatePDF} className="gap-1">
          <Download className="w-4 h-4" />
          PDF
        </Button>
      </div>
    </>
  );
};
