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
  Eye,
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

interface PartnerProfile {
  name: string;
  company?: string;
  photo?: string | null;
  phone?: string | null;
  email?: string | null;
  rating?: number | null;
  totalRides?: number | null;
  vehicle?: string | null;
  workingSectors?: string[];
  bio?: string | null;
}

interface ContractTerms {
  commissionPercentage?: number;
  commissionFixedAmount?: number;
  commissionType?: 'percentage' | 'fixed';
  paymentSchedule?: string;
  paymentFrequency?: string;
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
  
  // Party 1 = Current user
  party1: PartnerProfile;
  // Party 2 = Partner
  party2: PartnerProfile;
  
  terms: ContractTerms;
  signatures: SignatureStatus;
  
  // Optional: show sign button if current user hasn't signed yet
  showSignButton?: boolean;
  onSign?: () => void;
  signing?: boolean;
}

const PARTNERSHIP_LABELS: Record<PartnershipType, { title: string; party1Label: string; party2Label: string }> = {
  driver_driver: {
    title: 'Partenariat entre Chauffeurs',
    party1Label: 'Chauffeur',
    party2Label: 'Chauffeur Partenaire'
  },
  fleet_driver: {
    title: 'Partenariat Gestionnaire - Chauffeur',
    party1Label: 'Gestionnaire de Flotte',
    party2Label: 'Chauffeur Partenaire'
  },
  company_driver: {
    title: 'Partenariat Entreprise - Chauffeur',
    party1Label: 'Entreprise',
    party2Label: 'Chauffeur'
  },
  company_fleet: {
    title: 'Partenariat Entreprise - Gestionnaire',
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
  party1,
  party2,
  terms,
  signatures,
  showSignButton,
  onSign,
  signing
}: UniversalPartnershipContractProps) {
  const [generating, setGenerating] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

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
    const labels: Record<string, string> = {
      per_course: 'Par course',
      weekly: 'Hebdomadaire',
      monthly: 'Mensuel',
      custom: 'Personnalisé',
      mixed: 'Mixte'
    };
    return labels[schedule] || schedule;
  };

  const getCommissionDisplay = () => {
    if (terms.commissionType === 'fixed' && terms.commissionFixedAmount) {
      return `${terms.commissionFixedAmount}€ par course`;
    }
    if (terms.commissionPercentage) {
      return `${terms.commissionPercentage}%`;
    }
    return 'Non définie';
  };

  const isFullySigned = () => signatures.party1Signed && signatures.party2Signed;

  const isActive = () => 
    status === 'accepted' || status === 'active';

  const generateContractPDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;
      let yPos = 20;

      const addCenteredText = (text: string, size: number, style: 'normal' | 'bold' = 'normal') => {
        doc.setFontSize(size);
        doc.setFont('helvetica', style);
        doc.text(text, pageWidth / 2, yPos, { align: 'center' });
        yPos += size * 0.5;
      };

      const addText = (text: string, size: number = 10, style: 'normal' | 'bold' = 'normal') => {
        doc.setFontSize(size);
        doc.setFont('helvetica', style);
        const lines = doc.splitTextToSize(text, contentWidth);
        doc.text(lines, margin, yPos);
        yPos += lines.length * size * 0.4;
      };

      const addLine = () => {
        doc.setDrawColor(200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;
      };

      // Header
      addCenteredText('CONTRAT DE PARTENARIAT VTC', 18, 'bold');
      yPos += 5;
      addCenteredText(labels.title.toUpperCase(), 12, 'normal');
      yPos += 10;

      // Contract info
      doc.setFontSize(10);
      doc.text(`Référence: PART-${partnershipId.substring(0, 8).toUpperCase()}`, margin, yPos);
      doc.text(`Date: ${format(new Date(), "d MMMM yyyy", { locale: fr })}`, pageWidth - margin - 50, yPos);
      yPos += 15;

      addLine();
      yPos += 5;

      // Parties
      addText('ENTRE LES PARTIES:', 12, 'bold');
      yPos += 5;

      addText(`${labels.party1Label}:`, 10, 'bold');
      addText(`Nom/Raison sociale: ${party1.name}${party1.company ? ` - ${party1.company}` : ''}`, 10);
      yPos += 5;

      addText(`${labels.party2Label}:`, 10, 'bold');
      addText(`Nom/Raison sociale: ${party2.name}${party2.company ? ` - ${party2.company}` : ''}`, 10);
      yPos += 10;

      addLine();
      yPos += 5;

      // Conditions
      addText('CONDITIONS DU PARTENARIAT', 12, 'bold');
      yPos += 5;

      addText('Article 1 - Objet du contrat', 10, 'bold');
      addText('Le présent contrat établit les conditions de partenariat entre les deux parties pour le partage de courses VTC et la collaboration professionnelle dans le cadre de leur activité de transport.', 10);
      yPos += 5;

      addText('Article 2 - Commission', 10, 'bold');
      if (terms.commissionPercentage) {
        addText(`Le taux de commission convenu entre les parties est de ${terms.commissionPercentage}% du montant total de chaque course partagée.`, 10);
      } else if (terms.commissionFixedAmount) {
        addText(`Le montant de commission fixe convenu est de ${terms.commissionFixedAmount}€ par course partagée.`, 10);
      } else {
        addText('Les conditions de rémunération sont définies séparément entre les parties.', 10);
      }
      yPos += 5;

      addText('Article 3 - Modalités de paiement', 10, 'bold');
      addText(`Les règlements des commissions seront effectués selon la fréquence suivante: ${getPaymentScheduleLabel(terms.paymentSchedule || terms.paymentFrequency)}.`, 10);
      yPos += 5;

      addText('Article 4 - Obligations des parties', 10, 'bold');
      addText('Chaque partie s\'engage à:', 10);
      addText('• Respecter les termes du présent contrat', 10);
      addText('• Fournir un service de qualité aux clients', 10);
      addText('• Effectuer les paiements des commissions dans les délais convenus', 10);
      addText('• Respecter la confidentialité des informations commerciales', 10);
      yPos += 5;

      addText('Article 5 - Durée et résiliation', 10, 'bold');
      addText('Le présent contrat est conclu pour une durée indéterminée. Chaque partie peut résilier le contrat avec un préavis raisonnable et après régularisation de toutes les commissions dues.', 10);
      yPos += 10;

      // Check if we need a new page
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }

      addLine();
      yPos += 5;

      // Legal clause
      addText('CLAUSE LÉGALE', 12, 'bold');
      yPos += 3;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      const legalText = 'En cas de non-respect des termes du présent contrat par l\'une des parties, ce document pourra être utilisé comme preuve pour faire valoir les droits de la partie lésée auprès des juridictions compétentes. La signature électronique de ce contrat via la plateforme SoloCab a valeur de signature manuscrite conformément à la réglementation en vigueur (eIDAS).';
      const legalLines = doc.splitTextToSize(legalText, contentWidth);
      doc.text(legalLines, margin, yPos);
      yPos += legalLines.length * 4 + 10;

      addLine();
      yPos += 5;

      // Signatures section
      addText('SIGNATURES', 12, 'bold');
      yPos += 10;

      const signatureBoxWidth = (contentWidth - 20) / 2;
      
      // Partie 1
      doc.setDrawColor(150);
      doc.rect(margin, yPos, signatureBoxWidth, 45);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(labels.party1Label + ':', margin + 5, yPos + 8);
      doc.setFont('helvetica', 'normal');
      doc.text(party1.name, margin + 5, yPos + 16);
      
      if (signatures.party1Signed) {
        doc.setTextColor(0, 128, 0);
        doc.text('✓ Signé électroniquement', margin + 5, yPos + 28);
        if (signatures.party1SignedAt) {
          doc.setFontSize(8);
          doc.text(`Le ${format(new Date(signatures.party1SignedAt), 'dd/MM/yyyy à HH:mm')}`, margin + 5, yPos + 36);
        }
        doc.setTextColor(0);
      } else {
        doc.setTextColor(200, 100, 0);
        doc.text('En attente de signature', margin + 5, yPos + 28);
        doc.setTextColor(0);
      }

      // Partie 2
      doc.rect(margin + signatureBoxWidth + 20, yPos, signatureBoxWidth, 45);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(labels.party2Label + ':', margin + signatureBoxWidth + 25, yPos + 8);
      doc.setFont('helvetica', 'normal');
      doc.text(party2.name, margin + signatureBoxWidth + 25, yPos + 16);
      
      if (signatures.party2Signed) {
        doc.setTextColor(0, 128, 0);
        doc.text('✓ Signé électroniquement', margin + signatureBoxWidth + 25, yPos + 28);
        if (signatures.party2SignedAt) {
          doc.setFontSize(8);
          doc.text(`Le ${format(new Date(signatures.party2SignedAt), 'dd/MM/yyyy à HH:mm')}`, margin + signatureBoxWidth + 25, yPos + 36);
        }
        doc.setTextColor(0);
      } else {
        doc.setTextColor(200, 100, 0);
        doc.text('En attente de signature', margin + signatureBoxWidth + 25, yPos + 28);
        doc.setTextColor(0);
      }

      yPos += 60;

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(100);
      if (acceptedAt) {
        doc.text(`Contrat validé le ${format(new Date(acceptedAt), "d MMMM yyyy à HH:mm", { locale: fr })}`, margin, yPos);
      }
      
      doc.text('Document généré par SoloCab - Plateforme VTC', pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

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
                  <Avatar className="h-16 w-16 border-2 border-primary/20">
                    <AvatarImage src={party2.photo || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                      {party2.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-lg">{party2.name}</p>
                        {party2.company && (
                          <p className="text-sm text-muted-foreground">{party2.company}</p>
                        )}
                      </div>
                      <Badge 
                        className={
                          isActive()
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        }
                      >
                        {isActive() ? 'Actif' : 'En attente'}
                      </Badge>
                    </div>
                    
                    {/* Partner badges */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {party2.rating && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                          {party2.rating.toFixed(1)}
                        </Badge>
                      )}
                      {party2.totalRides !== undefined && party2.totalRides !== null && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Car className="h-3 w-3" />
                          {party2.totalRides} courses
                        </Badge>
                      )}
                      {party2.vehicle && (
                        <Badge variant="outline" className="text-xs">
                          {party2.vehicle}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bio and contact */}
                {party2.bio && (
                  <p className="mt-3 text-sm text-muted-foreground line-clamp-2 italic">
                    "{party2.bio}"
                  </p>
                )}

                {(party2.phone || party2.email) && (
                  <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-border/50">
                    {party2.phone && (
                      <a 
                        href={`tel:${party2.phone}`} 
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <Phone className="h-3 w-3" />
                        {party2.phone}
                      </a>
                    )}
                    {party2.email && (
                      <a 
                        href={`mailto:${party2.email}`} 
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <Mail className="h-3 w-3" />
                        {party2.email}
                      </a>
                    )}
                  </div>
                )}

                {party2.workingSectors && party2.workingSectors.length > 0 && (
                  <div className="flex items-start gap-1.5 mt-3 pt-3 border-t border-border/50">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex flex-wrap gap-1">
                      {party2.workingSectors.slice(0, 3).map((sector, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs py-0.5">
                          {sector}
                        </Badge>
                      ))}
                      {party2.workingSectors.length > 3 && (
                        <Badge variant="outline" className="text-xs py-0.5 bg-muted">
                          +{party2.workingSectors.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Separator />

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

            {/* Contract terms */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                Conditions du partenariat
              </h4>
              
              <div className="grid gap-3">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Euro className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Commission</span>
                  </div>
                  <span className="font-semibold text-primary">
                    {getCommissionDisplay()}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Paiement</span>
                  </div>
                  <span className="font-medium">
                    {getPaymentScheduleLabel(terms.paymentSchedule || terms.paymentFrequency)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Créé le</span>
                  </div>
                  <span className="font-medium">
                    {format(new Date(createdAt), 'dd/MM/yyyy', { locale: fr })}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Signatures status */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                État des signatures
              </h4>
              
              <div className="grid gap-2">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <span className="text-sm font-medium">{party1.name}</span>
                    <p className="text-xs text-muted-foreground">{labels.party1Label}</p>
                  </div>
                  {signatures.party1Signed ? (
                    <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Signé
                    </Badge>
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
                    <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Signé
                    </Badge>
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
                    Ce contrat signé électroniquement via SoloCab a valeur légale 
                    conformément au règlement eIDAS. En cas de non-respect des termes, 
                    ce document peut être utilisé pour faire valoir vos droits 
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
