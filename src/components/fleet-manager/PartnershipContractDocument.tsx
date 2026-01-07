import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Euro,
  Shield,
  Scale,
  MapPin,
  Phone,
  Mail,
  Car,
  Briefcase
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";

interface PartyInfo {
  name: string;
  company?: string;
  siret?: string;
  tvaNumber?: string;
  address?: string;
  phone?: string | null;
  email?: string | null;
}

interface PartnershipContractDocumentProps {
  partnershipId: string;
  fleetManagerName: string;
  fleetManagerCompany: string;
  fleetManagerInfo?: PartyInfo;
  driverName: string;
  driverInfo?: PartyInfo;
  commissionType?: string;
  commissionPercentage: number;
  commissionFixedAmount?: number | null;
  paymentSchedule: string;
  paymentMethods?: string[];
  paymentDay?: number;
  signedAt?: string;
  fleetManagerSignedAt?: string;
  driverSignedAt?: string;
  contractType: "fleet_driver" | "partner";
  status?: string;
}

export const PartnershipContractDocument = ({
  partnershipId,
  fleetManagerName,
  fleetManagerCompany,
  fleetManagerInfo,
  driverName,
  driverInfo,
  commissionType = "percentage",
  commissionPercentage,
  commissionFixedAmount,
  paymentSchedule,
  paymentMethods,
  paymentDay,
  signedAt,
  fleetManagerSignedAt,
  driverSignedAt,
  contractType,
  status = "accepted",
}: PartnershipContractDocumentProps) => {
  const [showPreview, setShowPreview] = useState(false);

  const getPaymentScheduleLabel = (schedule: string) => {
    switch (schedule) {
      case "per_course": return "À chaque course effectuée";
      case "weekly": return "Hebdomadaire (chaque semaine)";
      case "monthly": return "Mensuel (chaque mois)";
      default: return schedule;
    }
  };

  const getPaymentMethodsLabel = (methods: string[] | undefined) => {
    if (!methods || methods.length === 0) return "Selon accord";
    const methodLabels: Record<string, string> = {
      card: "Carte bancaire",
      payment_link: "Lien de paiement",
      cash: "Espèces",
      bank_transfer: "Virement bancaire"
    };
    return methods.map(m => methodLabels[m] || m).join(", ");
  };

  const getContractTypeLabel = () => {
    return contractType === "fleet_driver" 
      ? "Chauffeur Associé avec Matériel du Gestionnaire" 
      : "Partenariat Chauffeur Indépendant avec Commission";
  };

  const getCommissionDisplay = () => {
    if (commissionType === "fixed" && commissionFixedAmount) {
      return `${commissionFixedAmount.toFixed(2)}€ par course`;
    }
    return `${commissionPercentage}%`;
  };

  const isFullySigned = fleetManagerSignedAt && driverSignedAt;
  const isActive = status === "accepted" || status === "active";

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    let yPos = 15;

    const checkNewPage = (neededSpace: number) => {
      if (yPos + neededSpace > pageHeight - 25) {
        doc.addPage();
        yPos = 20;
        return true;
      }
      return false;
    };

    // ========== EN-TÊTE ==========
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, 35, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("CONTRAT DE PARTENARIAT VTC", pageWidth / 2, 15, { align: "center" });
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Gestionnaire de Flotte - Chauffeur Partenaire", pageWidth / 2, 24, { align: "center" });
    
    doc.setFontSize(9);
    doc.text(`Réf: FLEET-${partnershipId.substring(0, 8).toUpperCase()}`, pageWidth / 2, 31, { align: "center" });
    
    doc.setTextColor(0, 0, 0);
    yPos = 45;

    // ========== STATUT DU CONTRAT ==========
    const statusLabel = isFullySigned ? "CONTRAT EN VIGUEUR" : "EN ATTENTE DE SIGNATURE";
    const statusColor = isFullySigned ? [22, 163, 74] : [234, 179, 8];
    
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.roundedRect(margin, yPos - 5, contentWidth, 12, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(statusLabel, pageWidth / 2, yPos + 2, { align: "center" });
    doc.setTextColor(0, 0, 0);
    yPos += 18;

    // ========== INFORMATIONS GÉNÉRALES ==========
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, yPos - 2, contentWidth, 16, "F");
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Date d'établissement: ${format(new Date(signedAt || new Date()), "d MMMM yyyy", { locale: fr })}`, margin + 5, yPos + 5);
    
    if (isFullySigned) {
      const validationDate = new Date(Math.max(
        new Date(fleetManagerSignedAt!).getTime(),
        new Date(driverSignedAt!).getTime()
      ));
      doc.text(`Date de validation: ${format(validationDate, "d MMMM yyyy à HH:mm", { locale: fr })}`, margin + 5, yPos + 12);
    }
    
    yPos += 22;

    // ========== PARTIES CONTRACTANTES ==========
    doc.setDrawColor(100);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("PARTIES CONTRACTANTES", margin, yPos);
    yPos += 10;

    const drawPartyBox = (partyLabel: string, name: string, info: PartyInfo | undefined, xStart: number, boxWidth: number) => {
      const boxHeight = 55;
      doc.setDrawColor(200);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(xStart, yPos, boxWidth, boxHeight, 3, 3, "FD");
      
      doc.setFillColor(30, 41, 59);
      doc.roundedRect(xStart, yPos, boxWidth, 8, 3, 3, "F");
      doc.rect(xStart, yPos + 5, boxWidth, 3, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(partyLabel.toUpperCase(), xStart + boxWidth / 2, yPos + 5.5, { align: "center" });
      doc.setTextColor(0, 0, 0);
      
      let textY = yPos + 14;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(name || "Non renseigné", xStart + 5, textY);
      textY += 5;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      
      if (info?.company) {
        doc.text(`Société: ${info.company}`, xStart + 5, textY);
        textY += 4;
      }
      if (info?.siret) {
        doc.text(`SIRET: ${info.siret}`, xStart + 5, textY);
        textY += 4;
      }
      if (info?.tvaNumber) {
        doc.text(`N° TVA: ${info.tvaNumber}`, xStart + 5, textY);
        textY += 4;
      }
      if (info?.address) {
        const addrLines = doc.splitTextToSize(`Adresse: ${info.address}`, boxWidth - 10);
        doc.text(addrLines, xStart + 5, textY);
        textY += addrLines.length * 3.5;
      }
      if (info?.email) {
        doc.text(`Email: ${info.email}`, xStart + 5, textY);
        textY += 4;
      }
      if (info?.phone) {
        doc.text(`Tél: ${info.phone}`, xStart + 5, textY);
      }
    };

    const boxWidth = (contentWidth - 10) / 2;
    drawPartyBox("Gestionnaire de Flotte", fleetManagerName, fleetManagerInfo || { name: fleetManagerName, company: fleetManagerCompany }, margin, boxWidth);
    drawPartyBox("Chauffeur Partenaire", driverName, driverInfo, margin + boxWidth + 10, boxWidth);
    yPos += 63;

    // ========== CONDITIONS FINANCIÈRES ==========
    checkNewPage(60);
    doc.setDrawColor(100);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("CONDITIONS FINANCIÈRES", margin, yPos);
    yPos += 8;

    doc.setFillColor(239, 246, 255);
    doc.roundedRect(margin, yPos, contentWidth, 36, 3, 3, "F");
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    
    if (contractType === "partner") {
      const commissionLabel = commissionType === "fixed" 
        ? `${commissionFixedAmount?.toFixed(2)}€ par course`
        : `${commissionPercentage}% sur chaque course`;
      doc.text("Commission:", margin + 5, yPos + 8);
      doc.setFont("helvetica", "normal");
      doc.text(commissionLabel, margin + 35, yPos + 8);
    } else {
      doc.text("Type:", margin + 5, yPos + 8);
      doc.setFont("helvetica", "normal");
      doc.text("Chauffeur associé - Véhicule fourni par le gestionnaire", margin + 25, yPos + 8);
    }
    
    doc.setFont("helvetica", "bold");
    doc.text("Fréquence de paiement:", margin + 5, yPos + 16);
    doc.setFont("helvetica", "normal");
    doc.text(getPaymentScheduleLabel(paymentSchedule), margin + 50, yPos + 16);
    
    doc.setFont("helvetica", "bold");
    doc.text("Moyens de paiement:", margin + 5, yPos + 24);
    doc.setFont("helvetica", "normal");
    doc.text(getPaymentMethodsLabel(paymentMethods), margin + 48, yPos + 24);
    
    if (paymentDay) {
      const dayLabel = (paymentSchedule === "weekly") 
        ? ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"][paymentDay]
        : `le ${paymentDay} du mois`;
      doc.text(`(${dayLabel})`, margin + 100, yPos + 16);
    }
    
    yPos += 45;

    // ========== CLAUSES DU CONTRAT ==========
    checkNewPage(100);
    doc.setDrawColor(100);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("CLAUSES ET ENGAGEMENTS", margin, yPos);
    yPos += 8;

    const clauses = [
      {
        title: "Article 1 - Objet du contrat",
        content: contractType === "partner"
          ? `Le présent contrat établit les conditions de partenariat entre le Gestionnaire de Flotte et le Chauffeur Partenaire. Le Gestionnaire s'engage à transmettre des missions de transport au Chauffeur qui les exécute en toute indépendance avec son propre véhicule.`
          : `Le présent contrat établit les conditions d'association entre le Gestionnaire de Flotte et le Chauffeur. Le véhicule utilisé est fourni par le Gestionnaire qui conserve l'intégralité des revenus des courses.`
      },
      {
        title: "Article 2 - Engagements du Gestionnaire",
        content: "Le Gestionnaire s'engage à: (a) proposer des missions au Chauffeur partenaire sans obligation de volume minimum ou maximum, (b) transmettre les demandes de courses dans les meilleurs délais, (c) envoyer des clients respectant le travail du chauffeur et son matériel, (d) respecter le taux de commission convenu sans modification unilatérale, (e) assurer une transparence totale sur les courses effectuées et les montants."
      },
      {
        title: "Article 3 - Engagements du Chauffeur",
        content: "Le Chauffeur s'engage à: (a) respecter scrupuleusement les horaires de prise en charge convenus, (b) fournir un service de qualité irréprochable aux clients, (c) reverser les commissions dues dans les délais convenus, (d) maintenir ses autorisations professionnelles valides (carte VTC, assurance, immatriculation), (e) préserver la confidentialité des informations commerciales."
      },
      {
        title: "Article 4 - PROTECTION DE LA CLIENTÈLE (CLAUSE ESSENTIELLE)",
        content: "Le Chauffeur reconnaît que les clients transmis par le Gestionnaire appartiennent exclusivement à ce dernier. Il est formellement INTERDIT au Chauffeur de solliciter, démarcher ou détourner les clients du Gestionnaire, pendant le partenariat et dans les 24 mois suivant sa résiliation. Toute violation entraînera la résiliation immédiate du partenariat et pourra donner lieu à des poursuites judiciaires pour réparation du préjudice."
      },
      {
        title: "Article 5 - Modalités de paiement",
        content: `Les commissions seront versées ${getPaymentScheduleLabel(paymentSchedule).toLowerCase()} via ${getPaymentMethodsLabel(paymentMethods)}. Tout retard de paiement supérieur à 15 jours pourra entraîner des pénalités de retard et la suspension immédiate du partenariat.`
      },
      {
        title: "Article 6 - Confidentialité",
        content: "Les parties s'engagent à garder confidentielles toutes les informations commerciales, financières et relatives à la clientèle. Cette obligation perdure pendant 5 ans après la fin du partenariat. Sont concernés: coordonnées clients, tarifs, volumes d'activité, et toute donnée personnelle au sens du RGPD."
      },
      {
        title: "Article 7 - Durée et résiliation",
        content: "Le contrat est conclu pour une durée indéterminée. Chaque partie peut résilier avec un préavis de 15 jours après régularisation des sommes dues. En cas de manquement grave (non-paiement, détournement de clientèle), la résiliation peut être immédiate sans préavis."
      },
      {
        title: "Article 8 - Responsabilités",
        content: "Chaque partie reste responsable de ses propres actes professionnels, de sa comptabilité et de ses obligations fiscales et sociales. Le Chauffeur assume l'entière responsabilité de la qualité de service lors des prestations effectuées."
      }
    ];

    for (const clause of clauses) {
      checkNewPage(25);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(clause.title, margin, yPos);
      yPos += 5;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const lines = doc.splitTextToSize(clause.content, contentWidth - 5);
      doc.text(lines, margin + 3, yPos);
      yPos += lines.length * 3.5 + 4;
    }

    // ========== CLAUSE LÉGALE ==========
    checkNewPage(35);
    yPos += 5;
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(margin, yPos, contentWidth, 25, 3, 3, "F");
    doc.setDrawColor(234, 179, 8);
    doc.roundedRect(margin, yPos, contentWidth, 25, 3, 3, "S");
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(146, 64, 14);
    doc.text("VALEUR JURIDIQUE", margin + 5, yPos + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const legalText = "Ce contrat, signé électroniquement par les deux parties, a valeur de contrat au sens de l'article 1366 du Code civil. La signature électronique a la même valeur juridique qu'une signature manuscrite (Règlement eIDAS).";
    const legalLines = doc.splitTextToSize(legalText, contentWidth - 10);
    doc.text(legalLines, margin + 5, yPos + 12);
    doc.setTextColor(0, 0, 0);
    yPos += 32;

    // ========== SIGNATURES ==========
    checkNewPage(60);
    doc.setDrawColor(100);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("SIGNATURES ÉLECTRONIQUES", margin, yPos);
    yPos += 10;

    const drawSignatureBox = (label: string, name: string, signedAt: string | undefined, xStart: number, sBoxWidth: number) => {
      doc.setDrawColor(200);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(xStart, yPos, sBoxWidth, 35, 3, 3, "FD");
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(label.toUpperCase(), xStart + 5, yPos + 8);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(name, xStart + 5, yPos + 16);
      
      if (signedAt) {
        doc.setFillColor(22, 163, 74);
        doc.circle(xStart + sBoxWidth - 15, yPos + 20, 5, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text("✓", xStart + sBoxWidth - 17, yPos + 22);
        doc.setTextColor(0, 0, 0);
        
        doc.setFontSize(7);
        doc.text(`Signé le ${format(new Date(signedAt), "dd/MM/yyyy à HH:mm", { locale: fr })}`, xStart + 5, yPos + 24);
      } else {
        doc.setFillColor(234, 179, 8);
        doc.circle(xStart + sBoxWidth - 15, yPos + 20, 5, "F");
        doc.setFontSize(7);
        doc.setTextColor(146, 64, 14);
        doc.text("En attente de signature", xStart + 5, yPos + 24);
        doc.setTextColor(0, 0, 0);
      }
    };

    const signBoxWidth = (contentWidth - 10) / 2;
    drawSignatureBox("Gestionnaire de Flotte", fleetManagerName, fleetManagerSignedAt, margin, signBoxWidth);
    drawSignatureBox("Chauffeur Partenaire", driverName, driverSignedAt, margin + signBoxWidth + 10, signBoxWidth);
    yPos += 42;

    // ========== PIED DE PAGE ==========
    doc.setFillColor(248, 250, 252);
    doc.rect(0, pageHeight - 20, pageWidth, 20, "F");
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Document généré automatiquement par SoloCab - Ce contrat fait foi de l'accord entre les parties", pageWidth / 2, pageHeight - 12, { align: "center" });
    doc.text(`Référence: FLEET-${partnershipId.substring(0, 8).toUpperCase()} | Date d'émission: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr })}`, pageWidth / 2, pageHeight - 7, { align: "center" });

    // Télécharger
    doc.save(`contrat-partenariat-fleet-${partnershipId.slice(0, 8)}.pdf`);
  };

  return (
    <>
      <div className="flex gap-2">
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Voir le contrat</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] p-0">
            <DialogHeader className="p-6 pb-4 bg-gradient-to-br from-primary/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/20">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-lg">Contrat de Partenariat VTC</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    Réf: FLEET-{partnershipId.slice(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>
            </DialogHeader>

            <ScrollArea className="max-h-[65vh] px-6 pb-6">
              <div className="space-y-6">
                {/* Statut */}
                <div className="flex items-center justify-center">
                  {isFullySigned ? (
                    <Badge className="bg-green-600 text-white px-4 py-1.5">
                      <Check className="w-4 h-4 mr-2" />
                      CONTRAT EN VIGUEUR
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500 text-white px-4 py-1.5">
                      <Clock className="w-4 h-4 mr-2" />
                      EN ATTENTE DE SIGNATURE
                    </Badge>
                  )}
                </div>

                {/* Type de contrat */}
                <Card className="bg-gradient-to-br from-primary/10 to-accent/5 border-primary/20">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-full bg-primary/20">
                        <Handshake className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{getContractTypeLabel()}</CardTitle>
                        <CardDescription>
                          Établi le {format(new Date(signedAt || new Date()), "d MMMM yyyy", { locale: fr })}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Parties */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Briefcase className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold">Gestionnaire de Flotte</span>
                      </div>
                      <p className="font-semibold">{fleetManagerName}</p>
                      {fleetManagerCompany && (
                        <p className="text-sm text-muted-foreground">{fleetManagerCompany}</p>
                      )}
                      {fleetManagerInfo?.siret && (
                        <p className="text-xs text-muted-foreground mt-1">SIRET: {fleetManagerInfo.siret}</p>
                      )}
                      {fleetManagerInfo?.tvaNumber && (
                        <p className="text-xs text-muted-foreground">TVA: {fleetManagerInfo.tvaNumber}</p>
                      )}
                      {fleetManagerInfo?.address && (
                        <p className="text-xs text-muted-foreground flex items-start gap-1 mt-1">
                          <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                          {fleetManagerInfo.address}
                        </p>
                      )}
                      {fleetManagerSignedAt && (
                        <Badge className="mt-2 bg-green-100 text-green-800 border-green-200">
                          <Check className="w-3 h-3 mr-1" />
                          Signé le {format(new Date(fleetManagerSignedAt), "dd/MM/yyyy")}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Car className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold">Chauffeur Partenaire</span>
                      </div>
                      <p className="font-semibold">{driverName}</p>
                      {driverInfo?.company && (
                        <p className="text-sm text-muted-foreground">{driverInfo.company}</p>
                      )}
                      {driverInfo?.siret && (
                        <p className="text-xs text-muted-foreground mt-1">SIRET: {driverInfo.siret}</p>
                      )}
                      {driverInfo?.tvaNumber && (
                        <p className="text-xs text-muted-foreground">TVA: {driverInfo.tvaNumber}</p>
                      )}
                      {driverInfo?.address && (
                        <p className="text-xs text-muted-foreground flex items-start gap-1 mt-1">
                          <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                          {driverInfo.address}
                        </p>
                      )}
                      {driverSignedAt && (
                        <Badge className="mt-2 bg-green-100 text-green-800 border-green-200">
                          <Check className="w-3 h-3 mr-1" />
                          Signé le {format(new Date(driverSignedAt), "dd/MM/yyyy")}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                {/* Conditions financières */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Euro className="w-4 h-4 text-primary" />
                    Conditions Financières
                  </h3>
                  
                  <div className="space-y-3">
                    {contractType === "partner" && (
                      <Card>
                        <CardContent className="pt-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Percent className="w-4 h-4 text-primary" />
                            <span className="text-sm">Commission</span>
                          </div>
                          <Badge variant="outline" className="text-lg font-bold">
                            {getCommissionDisplay()}
                          </Badge>
                        </CardContent>
                      </Card>
                    )}

                    <Card>
                      <CardContent className="pt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary" />
                          <span className="text-sm">Fréquence de paiement</span>
                        </div>
                        <Badge variant="secondary">
                          {getPaymentScheduleLabel(paymentSchedule)}
                        </Badge>
                      </CardContent>
                    </Card>

                    {paymentMethods && paymentMethods.length > 0 && (
                      <Card>
                        <CardContent className="pt-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Euro className="w-4 h-4 text-primary" />
                            <span className="text-sm">Moyens de paiement</span>
                          </div>
                          <Badge variant="secondary">
                            {getPaymentMethodsLabel(paymentMethods)}
                          </Badge>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Engagements clés */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Engagements Clés
                  </h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2 p-2 rounded bg-blue-50 dark:bg-blue-950/30">
                      <Check className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <span>Le Gestionnaire s'engage à transmettre les missions dans les meilleurs délais</span>
                    </div>
                    <div className="flex items-start gap-2 p-2 rounded bg-blue-50 dark:bg-blue-950/30">
                      <Check className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <span>Le Gestionnaire envoie des clients respectueux du chauffeur et de son matériel</span>
                    </div>
                    <div className="flex items-start gap-2 p-2 rounded bg-blue-50 dark:bg-blue-950/30">
                      <Check className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <span>Le Chauffeur s'engage à respecter les horaires et la qualité de service</span>
                    </div>
                    <div className="flex items-start gap-2 p-2 rounded bg-blue-50 dark:bg-blue-950/30">
                      <Check className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <span>Les deux parties respectent les délais de paiement convenus</span>
                    </div>
                  </div>
                </div>

                {/* Clause importante */}
                <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-amber-800 dark:text-amber-200 text-sm">
                          Protection de la clientèle
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                          Les clients transmis par le Gestionnaire lui appartiennent exclusivement. 
                          Toute tentative de détournement est interdite pendant le partenariat et 
                          les 24 mois suivants, sous peine de poursuites judiciaires.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Valeur juridique */}
                <Card className="bg-slate-50 dark:bg-slate-900 border-slate-200">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-2">
                      <Scale className="w-4 h-4 text-slate-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm">Valeur Juridique</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Ce contrat signé électroniquement a valeur de contrat au sens de l'article 1366 
                          du Code civil. La signature électronique a la même valeur juridique qu'une 
                          signature manuscrite (Règlement eIDAS).
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 p-4 border-t bg-muted/20">
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
          <span className="hidden sm:inline">PDF</span>
        </Button>
      </div>
    </>
  );
};
