import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, Loader2, Copy, CheckCircle2, QrCode, Share2, 
  ExternalLink, Euro, CalendarDays, FileText 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SpontaneousPaymentProps {
  driverId: string;
  stripeEnabled: boolean;
}

export function SpontaneousPayment({ driverId, stripeEnabled }: SpontaneousPaymentProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const amountNum = parseFloat(amount);
  const isValid = amountNum >= 1 && amountNum <= 10000 && description.trim().length >= 2;

  const handleGenerate = async () => {
    if (!isValid) return;
    setIsGenerating(true);
    setPaymentLink(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error("Session expirée. Reconnectez-vous.");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-spontaneous-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ amount: amountNum, description: description.trim(), date }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erreur lors de la génération");
      }
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error("Lien non généré");

      setPaymentLink(data.url);
      toast.success("Lien de paiement généré !");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la génération");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!paymentLink) return;
    await navigator.clipboard.writeText(paymentLink);
    setCopied(true);
    toast.success("Lien copié !");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!paymentLink) return;
    const text = `Paiement de ${amountNum.toFixed(2)}€ — ${description}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Paiement SoloCab", text, url: paymentLink });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const handleReset = () => {
    setPaymentLink(null);
    setAmount("");
    setDescription("");
    setDate(new Date().toISOString().split("T")[0]);
    setShowQr(false);
  };

  if (!stripeEnabled) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="py-8 text-center space-y-2">
          <Zap className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">
            Activez Stripe Connect dans vos paramètres d'encaissement pour utiliser cette fonctionnalité.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Link generated state
  if (paymentLink) {
    return (
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Lien de paiement prêt</CardTitle>
          </div>
          <CardDescription>
            {amountNum.toFixed(2)}€ — {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Montant</span>
              <span className="font-bold text-primary">{amountNum.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Motif</span>
              <span className="font-medium truncate max-w-[60%] text-right">{description}</span>
            </div>
            {(() => {
              const stripeFeeEstimate = amountNum * 0.014 + 0.25;
              const solocabFee = 0.80;
              const totalFees = stripeFeeEstimate + solocabFee;
              const netAmount = amountNum - totalFees;
              return (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frais estimés</span>
                    <span className="text-xs">~{totalFees.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span className="text-muted-foreground">Vous recevrez</span>
                    <span className="font-bold text-primary">~{netAmount.toFixed(2)}€</span>
                  </div>
                </>
              );
            })()}
          </div>

          {/* QR Code */}
          {showQr && <QrCodeImage data={paymentLink} />}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={handleCopy} className="gap-1.5">
              {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copié" : "Copier"}
            </Button>
            <Button variant="outline" onClick={handleShare} className="gap-1.5">
              <Share2 className="h-4 w-4" />
              Partager
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowQr(!showQr)} 
              className="gap-1.5"
            >
              <QrCode className="h-4 w-4" />
              {showQr ? "Masquer QR" : "QR Code"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.open(paymentLink, "_blank")}
              className="gap-1.5"
            >
              <ExternalLink className="h-4 w-4" />
              Ouvrir
            </Button>
          </div>

          <Button variant="ghost" onClick={handleReset} className="w-full text-muted-foreground">
            Nouveau paiement
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Form state
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Encaissement spontané</CardTitle>
        </div>
        <CardDescription>
          Générez un lien de paiement sécurisé à partager avec votre client.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Amount */}
        <div className="space-y-1.5">
          <Label htmlFor="sp-amount" className="flex items-center gap-1.5 text-sm">
            <Euro className="h-3.5 w-3.5 text-muted-foreground" />
            Montant TTC
          </Label>
          <div className="relative">
            <Input
              id="sp-amount"
              type="number"
              min="1"
              max="10000"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="text-lg font-semibold pr-8 h-12"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">€</span>
          </div>
          {amountNum > 0 && amountNum < 1 && (
            <p className="text-xs text-destructive">Minimum 1€</p>
          )}
        </div>

        {/* Date */}
        <div className="space-y-1.5">
          <Label htmlFor="sp-date" className="flex items-center gap-1.5 text-sm">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            Date
          </Label>
          <Input
            id="sp-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-10"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="sp-desc" className="flex items-center gap-1.5 text-sm">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            Motif
          </Label>
          <Textarea
            id="sp-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Course aéroport du 04/04, supplément bagages..."
            rows={2}
            className="resize-none"
          />
        </div>

        {/* Fee info */}
        {isValid && (() => {
          const stripeFeeEstimate = amountNum * 0.014 + 0.25;
          const solocabFee = 0.80;
          const totalFees = stripeFeeEstimate + solocabFee;
          const netAmount = amountNum - totalFees;
          return (
            <div className="bg-muted/30 rounded-lg p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Montant client</span>
                <span className="font-bold">{amountNum.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Frais estimés</span>
                <span>~{totalFees.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between border-t pt-1.5">
                <span className="text-muted-foreground">Vous recevrez</span>
                <span className="font-bold text-primary">~{netAmount.toFixed(2)}€</span>
              </div>
              <p className="text-[10px] text-muted-foreground/70 pt-0.5">
                Frais incluant traitement du paiement et services SoloCab
              </p>
            </div>
          );
        })()}

        <Button
          onClick={handleGenerate}
          disabled={!isValid || isGenerating}
          className="w-full h-11 gap-2"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          Générer le lien de paiement
        </Button>

        <p className="text-[11px] text-muted-foreground text-center">
          Le paiement est sécurisé via Stripe. Le client paiera directement depuis le lien.
        </p>
      </CardContent>
    </Card>
  );
}
