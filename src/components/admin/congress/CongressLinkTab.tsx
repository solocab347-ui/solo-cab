import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Crown, Copy, ExternalLink, Plus, Loader2, Download, FileText, Link } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CongressFlyer } from "./CongressFlyer";

interface CongressInvitation {
  id: string;
  name: string;
  slug: string;
  max_uses: number;
  current_uses: number;
  is_active: boolean;
  trial_days: number;
  monthly_price: number;
}

interface CongressLinkTabProps {
  invitation: CongressInvitation | null;
  onUpdate: () => void;
}

export const CongressLinkTab = ({ invitation, onUpdate }: CongressLinkTabProps) => {
  const [newMaxUses, setNewMaxUses] = useState<number>(invitation?.max_uses || 0);
  const [isUpdatingMax, setIsUpdatingMax] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const flyerRef = useRef<HTMLDivElement>(null);

  const invitationLink = invitation 
    ? `${window.location.origin}/inscription-congres?ref=${invitation.slug}`
    : "";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copié dans le presse-papiers");
  };

  const updateMaxUses = async () => {
    if (!invitation) return;
    setIsUpdatingMax(true);
    try {
      const { error } = await supabase
        .from("congress_invitations")
        .update({ max_uses: newMaxUses })
        .eq("id", invitation.id);

      if (error) throw error;
      toast.success("Nombre maximum de places mis à jour");
      onUpdate();
    } catch (err) {
      console.error("Error updating max uses:", err);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setIsUpdatingMax(false);
    }
  };

  const handleDownloadFlyer = async () => {
    if (!flyerRef.current) return;
    setIsDownloading(true);
    
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { default: jsPDF } = await import("jspdf");

      const canvas = await html2canvas(flyerRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#0a0a14",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("SoloCab-Offre-Pionnier-Congres-VTC.pdf");
      toast.success("Flyer téléchargé !");
    } catch (err) {
      console.error("Error downloading flyer:", err);
      toast.error("Erreur lors du téléchargement");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!invitation) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Aucune invitation configurée
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            {invitation.name}
          </CardTitle>
          <CardDescription>
            Lien d'inscription exclusif pour le congrès
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input value={invitationLink} readOnly className="font-mono text-sm" />
            <Button variant="outline" size="icon" onClick={() => copyToClipboard(invitationLink)}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => window.open(invitationLink, "_blank")}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{invitation.current_uses}</div>
              <div className="text-sm text-muted-foreground">Inscrits</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-amber-500">
                {invitation.max_uses - invitation.current_uses}
              </div>
              <div className="text-sm text-muted-foreground">Places restantes</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2">
                <Input
                  type="number"
                  value={newMaxUses}
                  onChange={(e) => setNewMaxUses(parseInt(e.target.value) || 0)}
                  className="w-20 text-center"
                />
                <Button 
                  size="sm" 
                  onClick={updateMaxUses}
                  disabled={isUpdatingMax || newMaxUses === invitation.max_uses}
                >
                  {isUpdatingMax ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
              <div className="text-sm text-muted-foreground mt-1">Max places</div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Badge variant={invitation.is_active ? "default" : "secondary"}>
              {invitation.is_active ? "Actif" : "Inactif"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Tarif: {invitation.monthly_price}€/mois • Essai: {invitation.trial_days} jours
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Flyer Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Flyer A4 - Offre Pionnier
          </CardTitle>
          <CardDescription>
            Téléchargez le flyer pour présenter l'offre au congrès
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleDownloadFlyer} disabled={isDownloading} className="gap-2">
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Télécharger le flyer PDF
          </Button>

          <div className="overflow-auto max-h-[70vh] border border-border rounded-lg">
            <CongressFlyer
              ref={flyerRef}
              invitationLink={invitationLink}
              trialDays={invitation.trial_days}
              monthlyPrice={invitation.monthly_price}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
