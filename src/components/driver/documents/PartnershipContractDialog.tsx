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
  Scale
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

interface PartnershipContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: {
    id: string;
    status: string;
    commission_percentage?: number;
    commission_fixed_amount?: number;
    commission_type?: string;
    payment_schedule?: string;
    payment_frequency?: string;
    created_at: string;
    accepted_at?: string;
    partnerName: string;
    partnerId?: string;
    driver_a_signed?: boolean;
    driver_b_signed?: boolean;
    fleet_manager_signed?: boolean;
    driver_signed?: boolean;
    company_signed?: boolean;
  } | null;
  partnershipType: 'driver' | 'company' | 'fleet';
  currentUserName: string;
  currentUserCompany?: string;
}

export function PartnershipContractDialog({
  open,
  onOpenChange,
  contract,
  partnershipType,
  currentUserName,
  currentUserCompany
}: PartnershipContractDialogProps) {
  const [generating, setGenerating] = useState(false);

  if (!contract) return null;

  const getPartnershipTypeLabel = () => {
    switch (partnershipType) {
      case 'driver': return 'Partenariat Chauffeur';
      case 'company': return 'Partenariat Entreprise';
      case 'fleet': return 'Partenariat Gestionnaire de Flotte';
    }
  };

  const getPartnerTypeIcon = () => {
    switch (partnershipType) {
      case 'driver': return <Users className="h-5 w-5" />;
      case 'company': return <Building2 className="h-5 w-5" />;
      case 'fleet': return <Briefcase className="h-5 w-5" />;
    }
  };

  const getPaymentScheduleLabel = (schedule: string | undefined) => {
    if (!schedule) return 'Non défini';
    const labels: Record<string, string> = {
      per_course: 'Par course',
      weekly: 'Hebdomadaire',
      monthly: 'Mensuel',
      custom: 'Personnalisé'
    };
    return labels[schedule] || schedule;
  };

  const isFullySigned = () => {
    if (partnershipType === 'driver') {
      return contract.driver_a_signed && contract.driver_b_signed;
    } else if (partnershipType === 'fleet') {
      return contract.fleet_manager_signed && contract.driver_signed;
    } else if (partnershipType === 'company') {
      return contract.company_signed && contract.driver_signed;
    }
    return contract.status === 'accepted' || contract.status === 'active';
  };

  const generateContractPDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;
      let yPos = 20;

      // Helper functions
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
      addCenteredText(getPartnershipTypeLabel().toUpperCase(), 12, 'normal');
      yPos += 10;

      // Contract info
      doc.setFontSize(10);
      doc.text(`Référence: PART-${contract.id.substring(0, 8).toUpperCase()}`, margin, yPos);
      doc.text(`Date: ${format(new Date(), "d MMMM yyyy", { locale: fr })}`, pageWidth - margin - 50, yPos);
      yPos += 15;

      addLine();
      yPos += 5;

      // Parties
      addText('ENTRE LES PARTIES:', 12, 'bold');
      yPos += 5;

      addText('PARTIE 1 (Le Titulaire):', 10, 'bold');
      addText(`Nom/Raison sociale: ${currentUserName}${currentUserCompany ? ` - ${currentUserCompany}` : ''}`, 10);
      yPos += 5;

      addText('PARTIE 2 (Le Partenaire):', 10, 'bold');
      addText(`Nom/Raison sociale: ${contract.partnerName}`, 10);
      yPos += 10;

      addLine();
      yPos += 5;

      // Conditions
      addText('CONDITIONS DU PARTENARIAT', 12, 'bold');
      yPos += 5;

      addText('Article 1 - Objet du contrat', 10, 'bold');
      addText('Le présent contrat établit les conditions de partenariat entre les deux parties pour le partage de courses VTC et la collaboration professionnelle dans le cadre de leur activité de transport.', 10);
      yPos += 5;

      addText('Article 2 - Frais de transaction', 10, 'bold');
      if (contract.commission_percentage) {
        addText(`Le taux de frais de transaction convenu entre les parties est de ${contract.frais de transaction_percentage}% du montant total de chaque course partagée.`, 10);
      } else if (contract.commission_fixed_amount) {
        addText(`Le montant de frais de transaction fixe convenu est de ${contract.frais de transaction_fixed_amount}€ par course partagée.`, 10);
      }
      yPos += 5;

      addText('Article 3 - Modalités de paiement', 10, 'bold');
      addText(`Les règlements des frais de transaction seront effectués selon la fréquence suivante: ${getPaymentScheduleLabel(contract.payment_schedule || contract.payment_frequency)}.`, 10);
      yPos += 5;

      addText('Article 4 - Obligations des parties', 10, 'bold');
      addText('\'Chaque partie sengage à:', 10);
      addText('• Respecter les termes du présent contrat', 10);
      addText('• Fournir un service de qualité aux clients', 10);
      addText('• Effectuer les paiements des frais de transaction dans les délais convenus', 10);
      addText('• Respecter la confidentialité des informations commerciales', 10);
      yPos += 5;

      addText('Article 5 - Durée et résiliation', 10, 'bold');
      addText('Le présent contrat est conclu pour une durée indéterminée. Chaque partie peut résilier le contrat avec un préavis raisonnable et après régularisation de toutes les frais de transaction dues.', 10);
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
      const legalText = '\'En cas de non-respect des termes du présent contrat par lune des parties, ce document pourra être utilisé comme preuve pour faire valoir les droits de la partie lésée auprès des juridictions compétentes. La signature électronique de ce contrat via la plateforme SoloCab a valeur de signature manuscrite conformément à la réglementation en vigueur.';
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
      doc.rect(margin, yPos, signatureBoxWidth, 40);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Partie 1:', margin + 5, yPos + 8);
      doc.setFont('helvetica', 'normal');
      doc.text(currentUserName, margin + 5, yPos + 16);
      
      if (isFullySigned()) {
        doc.setTextColor(0, 128, 0);
        doc.text('✓ Signé électroniquement', margin + 5, yPos + 30);
        doc.setTextColor(0);
      }

      // Partie 2
      doc.rect(margin + signatureBoxWidth + 20, yPos, signatureBoxWidth, 40);
      doc.setFont('helvetica', 'bold');
      doc.text('Partie 2:', margin + signatureBoxWidth + 25, yPos + 8);
      doc.setFont('helvetica', 'normal');
      doc.text(contract.partnerName, margin + signatureBoxWidth + 25, yPos + 16);
      
      if (isFullySigned()) {
        doc.setTextColor(0, 128, 0);
        doc.text('✓ Signé électroniquement', margin + signatureBoxWidth + 25, yPos + 30);
        doc.setTextColor(0);
      }

      yPos += 55;

      // Footer
      if (contract.accepted_at) {
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`Contrat validé le ${format(new Date(contract.accepted_at), "d MMMM yyyy à HH:mm", { locale: fr })}`, margin, yPos);
      }

      yPos += 10;
      doc.setFontSize(8);
      doc.text('Document généré par SoloCab - Plateforme VTC', pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

      // Download
      const filename = `\scontrat-partenariat-${contract.partnerName.replace(/+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
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
            Détails du Contrat
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-80px)]">
          <div className="p-6 pt-4 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                {getPartnerTypeIcon()}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{contract.partnerName}</p>
                <p className="text-sm text-muted-foreground">{getPartnershipTypeLabel()}</p>
              </div>
              <Badge 
                className={
                  contract.status === 'active' || contract.status === 'accepted'
                    ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-500 border-amber-500/30'
                }
              >
                {contract.status === 'active' || contract.status === 'accepted' ? 'Actif' : 'En attente'}
              </Badge>
            </div>

            <Separator />

            {/* Conditions */}
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
                  <span className="font-medium">
                    {contract.commission_percentage 
                      ? `${contract.frais de transaction_percentage}%`
                      : contract.commission_fixed_amount 
                        ? `${contract.frais de transaction_fixed_amount}€`
                        : 'Non définie'
                    }
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Paiement</span>
                  </div>
                  <span className="font-medium">
                    {getPaymentScheduleLabel(contract.payment_schedule || contract.payment_frequency)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Depuis le</span>
                  </div>
                  <span className="font-medium">
                    {format(new Date(contract.created_at), 'dd/MM/yyyy', { locale: fr })}
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
                  <span className="text-sm">{currentUserName}</span>
                  <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Signé
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <span className="text-sm">{contract.partnerName}</span>
                  {isFullySigned() ? (
                    <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30">
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
                <Shield className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                    Valeur juridique
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ce contrat signé électroniquement via SoloCab a valeur légale. 
                    En cas de non-respect, il peut être utilisé pour faire valoir vos droits 
                    auprès des juridictions compétentes.
                  </p>
                </div>
              </div>
            </div>

            {/* Download button */}
            <Button 
              className="w-full gap-2" 
              onClick={generateContractPDF}
              disabled={generating}
            >
              <Download className="h-4 w-4" />
              {generating ? 'Génération en cours...' : 'Télécharger le contrat PDF'}
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}