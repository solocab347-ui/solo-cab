import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { jsPDF } from 'jspdf';
import { 
  Download, 
  FileText, 
  Users, 
  Building2, 
  Briefcase,
  Calendar,
  Euro,
  Clock,
  CheckCircle,
  Shield,
  Scale,
  Star,
  Car,
  MapPin,
  Phone,
  Mail,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

export type PartnershipType = 
  | 'driver_driver'      // Chauffeur ↔ Chauffeur
  | 'fleet_driver'       // Gestionnaire de flotte ↔ Chauffeur
  | 'company_driver'     // Entreprise ↔ Chauffeur
  | 'company_fleet';     // Entreprise ↔ Gestionnaire de flotte

interface PartyInfo {
  name: string;
  company?: string;
  siret?: string;
  tvaNumber?: string;
  address?: string;
  phone?: string | null;
  email?: string | null;
  photo?: string | null;
  // Optional for display
  rating?: number | null;
  totalRides?: number | null;
  vehicle?: string | null;
  workingSectors?: string[];
  bio?: string | null;
  // Visibility settings
  showRating?: boolean;
  showTotalRides?: boolean;
}

interface ContractTerms {
  paymentSchedule?: string;
  paymentFrequency?: string;
  paymentDay?: number;
  paymentMethods?: string[];
}

interface SignatureStatus {
  party1Signed: boolean;
  party1SignedAt?: string | null;
  party2Signed: boolean;
  party2SignedAt?: string | null;
}

interface UniversalPartnershipContractProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnershipId: string;
  partnershipType: PartnershipType;
  status: string;
  createdAt: string;
  acceptedAt?: string | null;
  terminatedAt?: string | null;
  
  // Party 1 = Current user
  party1: PartyInfo;
  // Party 2 = Partner
  party2: PartyInfo;
  
  terms: ContractTerms;
  signatures: SignatureStatus;
  
  // Optional: show sign button if current user hasn't signed yet
  showSignButton?: boolean;
  onSign?: () => void;
  signing?: boolean;
}

const PARTNERSHIP_LABELS: Record<PartnershipType, { title: string; party1Label: string; party2Label: string }> = {
  driver_driver: {
    title: 'Partenariat entre Chauffeurs VTC',
    party1Label: 'Chauffeur Partie 1',
    party2Label: 'Chauffeur Partie 2'
  },
  fleet_driver: {
    title: 'Partenariat Gestionnaire de Flotte - Chauffeur',
    party1Label: 'Gestionnaire de Flotte',
    party2Label: 'Chauffeur Partenaire'
  },
  company_driver: {
    title: 'Partenariat Entreprise - Chauffeur VTC',
    party1Label: 'Entreprise',
    party2Label: 'Chauffeur VTC'
  },
  company_fleet: {
    title: 'Partenariat Entreprise - Gestionnaire de Flotte',
    party1Label: 'Entreprise',
    party2Label: 'Gestionnaire de Flotte'
  }
};

export function UniversalPartnershipContract({
  open,
  onOpenChange,
  partnershipId,
  partnershipType,
  status,
  createdAt,
  acceptedAt,
  terminatedAt,
  party1,
  party2,
  terms,
  signatures,
  showSignButton,
  onSign,
  signing
}: UniversalPartnershipContractProps) {
  const [generating, setGenerating] = useState(false);

  const labels = PARTNERSHIP_LABELS[partnershipType];

  const getPartnershipIcon = () => {
    switch (partnershipType) {
      case 'driver_driver': return <Users className="h-5 w-5" />;
      case 'fleet_driver': return <Briefcase className="h-5 w-5" />;
      case 'company_driver': return <Building2 className="h-5 w-5" />;
      case 'company_fleet': return <Building2 className="h-5 w-5" />;
    }
  };

  const getPaymentScheduleLabel = (schedule: string | undefined) => {
    if (!schedule) return 'Non défini';
    const scheduleLabels: Record<string, string> = {
      per_course: 'À chaque course effectuée',
      weekly: 'Hebdomadaire (chaque semaine)',
      monthly: 'Mensuel (chaque mois)',
      custom: 'Personnalisé selon accord',
      mixed: 'Mixte selon accord'
    };
    return scheduleLabels[schedule] || schedule;
  };

  const getPaymentMethodsLabel = (methods: string[] | undefined) => {
    if (!methods || methods.length === 0) return 'Non défini';
    const methodLabels: Record<string, string> = {
      card: 'Carte bancaire',
      payment_link: 'Lien de paiement',
      cash: 'Espèces',
      bank_transfer: 'Virement bancaire'
    };
    return methods.map(m => methodLabels[m] || m).join(', ');
  };

  const isFullySigned = () => signatures.party1Signed && signatures.party2Signed;
  const isActive = () => status === 'accepted' || status === 'active';
  const isTerminated = () => status === 'terminated' || status === 'suspended';

  const generateContractPDF = async () => {
    setGenerating(true);
    try {
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

      const addCenteredText = (text: string, size: number, style: 'normal' | 'bold' = 'normal') => {
        doc.setFontSize(size);
        doc.setFont('helvetica', style);
        doc.text(text, pageWidth / 2, yPos, { align: 'center' });
        yPos += size * 0.5;
      };

      const addText = (text: string, size: number = 10, style: 'normal' | 'bold' = 'normal', indent: number = 0) => {
        doc.setFontSize(size);
        doc.setFont('helvetica', style);
        const lines = doc.splitTextToSize(text, contentWidth - indent);
        doc.text(lines, margin + indent, yPos);
        yPos += lines.length * size * 0.4;
      };

      const addLine = (color: number = 200) => {
        doc.setDrawColor(color);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;
      };

      // ========== EN-TÊTE ==========
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('CONTRAT DE PARTENARIAT VTC', pageWidth / 2, 15, { align: 'center' });
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(labels.title, pageWidth / 2, 24, { align: 'center' });
      
      doc.setFontSize(9);
      doc.text(`Réf: PART-${partnershipId.substring(0, 8).toUpperCase()}`, pageWidth / 2, 31, { align: 'center' });
      
      doc.setTextColor(0, 0, 0);
      yPos = 45;

      // ========== STATUT DU CONTRAT ==========
      const statusLabel = isTerminated() ? 'CONTRAT RÉSILIÉ' : isActive() ? 'CONTRAT EN VIGUEUR' : 'EN ATTENTE DE SIGNATURE';
      const statusColor = isTerminated() ? [220, 38, 38] : isActive() ? [22, 163, 74] : [234, 179, 8];
      
      doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.roundedRect(margin, yPos - 5, contentWidth, 12, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(statusLabel, pageWidth / 2, yPos + 2, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      yPos += 18;

      // ========== INFORMATIONS GÉNÉRALES ==========
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, yPos - 2, contentWidth, 22, 'F');
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Date d'établissement: ${format(new Date(createdAt), "d MMMM yyyy", { locale: fr })}`, margin + 5, yPos + 5);
      
      if (acceptedAt) {
        doc.text(`Date de validation: ${format(new Date(acceptedAt), "d MMMM yyyy à HH:mm", { locale: fr })}`, margin + 5, yPos + 12);
      }
      
      if (terminatedAt) {
        doc.setTextColor(220, 38, 38);
        doc.text(`Date de résiliation: ${format(new Date(terminatedAt), "d MMMM yyyy", { locale: fr })}`, margin + 5, yPos + 19);
        doc.setTextColor(0, 0, 0);
      }
      
      yPos += 28;

      // ========== PARTIES CONTRACTANTES ==========
      addLine(100);
      yPos += 3;
      addText('PARTIES CONTRACTANTES', 12, 'bold');
      yPos += 8;

      const drawPartyBox = (partyLabel: string, party: PartyInfo, xStart: number, boxWidth: number) => {
        const boxHeight = 50;
        doc.setDrawColor(200);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(xStart, yPos, boxWidth, boxHeight, 3, 3, 'FD');
        
        doc.setFillColor(30, 41, 59);
        doc.roundedRect(xStart, yPos, boxWidth, 8, 3, 3, 'F');
        doc.rect(xStart, yPos + 5, boxWidth, 3, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(partyLabel.toUpperCase(), xStart + boxWidth / 2, yPos + 5.5, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        
        let textY = yPos + 14;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(party.name || 'Non renseigné', xStart + 5, textY);
        textY += 5;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        
        if (party.company) {
          doc.text(`Société: ${party.company}`, xStart + 5, textY);
          textY += 4;
        }
        if (party.siret) {
          doc.text(`SIRET: ${party.siret}`, xStart + 5, textY);
          textY += 4;
        }
        if (party.tvaNumber) {
          doc.text(`N° TVA: ${party.tvaNumber}`, xStart + 5, textY);
          textY += 4;
        }
        if (party.address) {
          const addrLines = doc.splitTextToSize(`Adresse: ${party.address}`, boxWidth - 10);
          doc.text(addrLines, xStart + 5, textY);
          textY += addrLines.length * 3.5;
        }
        if (party.email) {
          doc.text(`Email: ${party.email}`, xStart + 5, textY);
          textY += 4;
        }
        if (party.phone) {
          doc.text(`Tél: ${party.phone}`, xStart + 5, textY);
        }
      };

      const boxWidth = (contentWidth - 10) / 2;
      drawPartyBox(labels.party1Label, party1, margin, boxWidth);
      drawPartyBox(labels.party2Label, party2, margin + boxWidth + 10, boxWidth);
      yPos += 58;

      // ========== CONDITIONS FINANCIÈRES ==========
      checkNewPage(60);
      addLine(100);
      yPos += 3;
      addText('CONDITIONS FINANCIÈRES', 12, 'bold');
      yPos += 5;

      doc.setFillColor(239, 246, 255);
      doc.roundedRect(margin, yPos, contentWidth, 36, 3, 3, 'F');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Rémunération:', margin + 5, yPos + 8);
      doc.setFont('helvetica', 'normal');
      doc.text('Selon les tarifs de facturation du chauffeur VTC', margin + 40, yPos + 8);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Fréquence de paiement:', margin + 5, yPos + 16);
      doc.setFont('helvetica', 'normal');
      doc.text(getPaymentScheduleLabel(terms.paymentSchedule || terms.paymentFrequency), margin + 50, yPos + 16);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Moyens de paiement:', margin + 5, yPos + 24);
      doc.setFont('helvetica', 'normal');
      doc.text(getPaymentMethodsLabel(terms.paymentMethods), margin + 48, yPos + 24);
      
      if (terms.paymentDay) {
        const dayLabel = (terms.paymentSchedule === 'weekly') 
          ? ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'][terms.paymentDay]
          : `le ${terms.paymentDay} du mois`;
        doc.text(`(${dayLabel})`, margin + 100, yPos + 16);
      }
      
      yPos += 43;

      // ========== CLAUSES DU CONTRAT ==========
      checkNewPage(100);
      addLine(100);
      yPos += 3;
      addText('CLAUSES ET ENGAGEMENTS', 12, 'bold');
      yPos += 5;

      const clauses = [
        {
          title: 'Article 1 - Objet du contrat',
          content: `Le présent contrat établit les conditions de partenariat entre ${labels.party1Label} et ${labels.party2Label} pour la fourniture de services de transport VTC. L'entreprise confie au chauffeur la réalisation de courses pour ses employés et/ou clients selon les modalités définies ci-après.`
        },
        {
          title: 'Article 2 - Rémunération du chauffeur',
          content: `Le chauffeur VTC facture ses prestations selon sa grille tarifaire en vigueur. L'entreprise s'engage à régler les factures émises par le chauffeur dans les délais et selon les modalités de paiement convenus dans le présent contrat.`
        },
        {
          title: 'Article 3 - Modalités de paiement',
          content: `Les règlements des factures seront effectués ${getPaymentScheduleLabel(terms.paymentSchedule || terms.paymentFrequency).toLowerCase()}. Tout retard de paiement supérieur à 15 jours pourra entraîner des pénalités de retard (taux légal + 10%) et la suspension immédiate du partenariat.`
        },
        {
          title: 'Article 4 - PROTECTION DE LA CLIENTÈLE (CLAUSE ESSENTIELLE)',
          content: 'CLAUSE DE NON-SOLLICITATION ET DE NON-DÉTOURNEMENT : Chaque partie reconnaît expressément que les clients acquis par l\'autre partie lui appartiennent exclusivement. Il est formellement INTERDIT de solliciter, démarcher, contacter directement ou indirectement, ou tenter de détourner les clients de son partenaire, que ce soit pendant la durée du partenariat ou dans les 24 mois suivant sa résiliation. Cette interdiction s\'applique à tout client dont les coordonnées ont été obtenues dans le cadre du partenariat. En cas de violation de cette clause, la partie lésée pourra engager toute action judiciaire qu\'elle estimera nécessaire pour faire valoir ses droits et obtenir réparation du préjudice subi devant les juridictions compétentes (Art. 1240 du Code civil).'
        },
        {
          title: 'Article 5 - Obligations des parties',
          content: 'Chaque partie s\'engage à: (a) respecter scrupuleusement les termes du présent contrat, (b) fournir un service de qualité irréprochable, (c) régler les factures dans les délais convenus sans aucun retard, (d) respecter strictement la confidentialité des informations commerciales (tarifs, coordonnées, conditions), (e) maintenir ses autorisations professionnelles en cours de validité (carte VTC, assurance, immatriculation), (f) respecter les horaires de prise en charge convenus.'
        },
        {
          title: 'Article 6 - Confidentialité des informations',
          content: 'Les parties s\'engagent à garder strictement confidentielles toutes les informations commerciales, financières et relatives à la clientèle échangées dans le cadre du partenariat. Cette obligation de confidentialité perdure pendant 5 ans après la fin du partenariat. Sont notamment concernés: les coordonnées des clients, les conditions tarifaires, les volumes d\'activité, et toute information à caractère personnel au sens du RGPD.'
        },
        {
          title: 'Article 7 - Durée et résiliation',
          content: 'Le présent contrat est conclu pour une durée indéterminée. Chaque partie peut résilier le contrat avec un préavis de 15 jours et après régularisation complète de toutes les factures en cours. En cas de manquement grave (non-paiement, détournement de clientèle, atteinte à la réputation), la résiliation peut être immédiate et sans préavis. La partie fautive s\'expose à des poursuites judiciaires.'
        },
        {
          title: 'Article 8 - Recours en cas de litige',
          content: 'En cas de non-respect des obligations du présent contrat, la partie lésée pourra: (a) suspendre immédiatement la collaboration, (b) résilier le contrat sans préavis pour faute grave. En cas de litige persistant (non-paiement des factures, détournement de clientèle, non-respect des engagements), la partie lésée pourra saisir les juridictions compétentes pour faire valoir ses droits et obtenir réparation du préjudice subi conformément aux dispositions légales en vigueur.'
        },
        {
          title: 'Article 9 - Responsabilités',
          content: 'Chaque partie reste responsable de ses propres actes professionnels, de sa comptabilité et de ses obligations fiscales et sociales. Le chauffeur VTC assume l\'entière responsabilité de la qualité de service fournie lors des prestations effectuées.'
        }
      ];

      for (const clause of clauses) {
        checkNewPage(25);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(clause.title, margin, yPos);
        yPos += 5;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const lines = doc.splitTextToSize(clause.content, contentWidth - 5);
        doc.text(lines, margin + 3, yPos);
        yPos += lines.length * 3.5 + 4;
      }

      // ========== CLAUSE LÉGALE ==========
      checkNewPage(35);
      yPos += 5;
      doc.setFillColor(254, 243, 199);
      doc.roundedRect(margin, yPos, contentWidth, 25, 3, 3, 'F');
      doc.setDrawColor(234, 179, 8);
      doc.roundedRect(margin, yPos, contentWidth, 25, 3, 3, 'S');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(146, 64, 14);
      doc.text('VALEUR JURIDIQUE', margin + 5, yPos + 6);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(7);
      const legalText = 'En cas de non-respect des termes du présent contrat par l\'une des parties, ce document pourra être utilisé comme preuve pour faire valoir les droits de la partie lésée auprès des juridictions compétentes. La signature électronique de ce contrat via la plateforme SoloCab a valeur de signature manuscrite conformément au règlement européen eIDAS (n°910/2014) et au Code civil français (art. 1366 et 1367).';
      const legalLines = doc.splitTextToSize(legalText, contentWidth - 10);
      doc.text(legalLines, margin + 5, yPos + 12);
      yPos += 33;

      // ========== SIGNATURES ==========
      checkNewPage(60);
      addLine(100);
      yPos += 3;
      addText('SIGNATURES DES PARTIES', 12, 'bold');
      yPos += 8;

      const signBoxWidth = (contentWidth - 15) / 2;
      const signBoxHeight = 45;

      // Signature Partie 1
      doc.setDrawColor(150);
      doc.roundedRect(margin, yPos, signBoxWidth, signBoxHeight, 3, 3, 'S');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(labels.party1Label.toUpperCase(), margin + 5, yPos + 7);
      
      doc.setFont('helvetica', 'normal');
      doc.text(party1.name, margin + 5, yPos + 14);
      if (party1.company) {
        doc.setFontSize(7);
        doc.text(party1.company, margin + 5, yPos + 19);
      }
      
      if (signatures.party1Signed) {
        doc.setTextColor(22, 163, 74);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('✓ SIGNÉ ÉLECTRONIQUEMENT', margin + 5, yPos + 30);
        if (signatures.party1SignedAt) {
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.text(`Le ${format(new Date(signatures.party1SignedAt), 'dd/MM/yyyy à HH:mm')}`, margin + 5, yPos + 36);
        }
        doc.setTextColor(0, 0, 0);
      } else {
        doc.setTextColor(200, 100, 0);
        doc.setFontSize(8);
        doc.text('En attente de signature...', margin + 5, yPos + 30);
        doc.setTextColor(0, 0, 0);
      }

      // Signature Partie 2
      doc.roundedRect(margin + signBoxWidth + 15, yPos, signBoxWidth, signBoxHeight, 3, 3, 'S');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(labels.party2Label.toUpperCase(), margin + signBoxWidth + 20, yPos + 7);
      
      doc.setFont('helvetica', 'normal');
      doc.text(party2.name, margin + signBoxWidth + 20, yPos + 14);
      if (party2.company) {
        doc.setFontSize(7);
        doc.text(party2.company, margin + signBoxWidth + 20, yPos + 19);
      }
      
      if (signatures.party2Signed) {
        doc.setTextColor(22, 163, 74);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('✓ SIGNÉ ÉLECTRONIQUEMENT', margin + signBoxWidth + 20, yPos + 30);
        if (signatures.party2SignedAt) {
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.text(`Le ${format(new Date(signatures.party2SignedAt), 'dd/MM/yyyy à HH:mm')}`, margin + signBoxWidth + 20, yPos + 36);
        }
        doc.setTextColor(0, 0, 0);
      } else {
        doc.setTextColor(200, 100, 0);
        doc.setFontSize(8);
        doc.text('En attente de signature...', margin + signBoxWidth + 20, yPos + 30);
        doc.setTextColor(0, 0, 0);
      }

      yPos += signBoxHeight + 10;

      // ========== PIED DE PAGE ==========
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(128);
        doc.text(
          `Contrat PART-${partnershipId.substring(0, 8).toUpperCase()} | Page ${i}/${totalPages} | Généré par SoloCab`,
          pageWidth / 2,
          pageHeight - 8,
          { align: 'center' }
        );
      }

      // Download
      const filename = `contrat-partenariat-${party2.name.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(filename);
      toast.success('Contrat téléchargé avec succès');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la génération du contrat');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Contrat de Partenariat
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-80px)]">
          <div className="p-6 pt-4 space-y-6">
            {/* Header with partner info */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-14 w-14 border-2 border-primary/20">
                    <AvatarImage src={party2.photo || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                      {party2.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-base">{party2.name}</p>
                        {party2.company && (
                          <p className="text-sm text-muted-foreground">{party2.company}</p>
                        )}
                      </div>
                      <Badge 
                        className={
                          isTerminated()
                            ? 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30'
                            : isActive()
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        }
                      >
                        {isTerminated() ? 'Résilié' : isActive() ? 'Actif' : 'En attente'}
                      </Badge>
                    </div>
                    
                    {/* SIRET and info */}
                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                      {party2.siret && (
                        <span className="bg-muted px-2 py-0.5 rounded">SIRET: {party2.siret}</span>
                      )}
                      {party2.showRating !== false && party2.rating && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                          {party2.rating.toFixed(1)}
                          {party2.showTotalRides !== false && party2.totalRides && (
                            <span className="text-muted-foreground ml-1">({party2.totalRides})</span>
                          )}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {party2.address && (
                  <div className="flex items-start gap-2 mt-3 pt-3 border-t border-border/50">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-xs text-muted-foreground">{party2.address}</span>
                  </div>
                )}

                {(party2.phone || party2.email) && (
                  <div className="flex flex-wrap gap-3 mt-2">
                    {party2.phone && (
                      <a href={`tel:${party2.phone}`} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                        <Phone className="h-3 w-3" />
                        {party2.phone}
                      </a>
                    )}
                    {party2.email && (
                      <a href={`mailto:${party2.email}`} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                        <Mail className="h-3 w-3" />
                        {party2.email}
                      </a>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Partnership type */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                {getPartnershipIcon()}
              </div>
              <div>
                <p className="font-medium text-sm">{labels.title}</p>
                <p className="text-xs text-muted-foreground">
                  Réf: PART-{partnershipId.substring(0, 8).toUpperCase()}
                </p>
              </div>
            </div>

            <Separator />

            {/* Contract terms */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                Conditions du contrat
              </h4>
              
              <div className="grid gap-3">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Euro className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Rémunération</span>
                  </div>
                  <span className="font-semibold text-primary text-sm">
                    Selon tarifs du chauffeur
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Fréquence de paiement</span>
                  </div>
                  <span className="font-medium text-sm">
                    {getPaymentScheduleLabel(terms.paymentSchedule || terms.paymentFrequency)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Date du contrat</span>
                  </div>
                  <span className="font-medium text-sm">
                    {format(new Date(createdAt), 'dd/MM/yyyy', { locale: fr })}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Critical obligations summary */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                Clauses essentielles
              </h4>
              
              <div className="space-y-2">
                <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">
                    Protection de la clientèle
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Il est strictement interdit de solliciter ou détourner les clients de son partenaire, 
                    pendant le partenariat et les 24 mois suivant sa fin. Toute violation est une faute grave.
                  </p>
                </div>
                
                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">
                    Obligations de paiement
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Les factures doivent être réglées dans les délais convenus. 
                    Tout retard supérieur à 15 jours entraîne des pénalités et la suspension du partenariat.
                  </p>
                </div>
                
                <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                    Qualité de service
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Chaque partie s'engage à fournir un service irréprochable et à respecter 
                    les horaires de prise en charge convenus avec les clients.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Signatures status */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                Signatures
              </h4>
              
              <div className="grid gap-2">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <span className="text-sm font-medium">{party1.name}</span>
                    <p className="text-xs text-muted-foreground">{labels.party1Label}</p>
                  </div>
                  {signatures.party1Signed ? (
                    <div className="text-right">
                      <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Signé
                      </Badge>
                      {signatures.party1SignedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(signatures.party1SignedAt), 'dd/MM/yyyy HH:mm')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <Badge variant="secondary">En attente</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <span className="text-sm font-medium">{party2.name}</span>
                    <p className="text-xs text-muted-foreground">{labels.party2Label}</p>
                  </div>
                  {signatures.party2Signed ? (
                    <div className="text-right">
                      <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Signé
                      </Badge>
                      {signatures.party2SignedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(signatures.party2SignedAt), 'dd/MM/yyyy HH:mm')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <Badge variant="secondary">En attente</Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Legal notice */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex gap-3">
                <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                    Valeur juridique
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ce contrat signé électroniquement via SoloCab a valeur légale conformément au règlement eIDAS. 
                    En cas de non-respect des termes, ce document peut être utilisé pour faire valoir vos droits 
                    auprès des juridictions compétentes.
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2">
              {showSignButton && onSign && !isFullySigned() && (
                <Button 
                  className="w-full gap-2" 
                  onClick={onSign}
                  disabled={signing}
                >
                  <CheckCircle className="h-4 w-4" />
                  {signing ? 'Signature en cours...' : 'Signer le contrat'}
                </Button>
              )}
              
              <Button 
                variant={showSignButton ? "outline" : "default"}
                className="w-full gap-2" 
                onClick={generateContractPDF}
                disabled={generating}
              >
                <Download className="h-4 w-4" />
                {generating ? 'Génération en cours...' : 'Télécharger le contrat PDF'}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
