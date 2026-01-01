import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  QrCode,
  Copy,
  Download,
  RefreshCw,
  Loader2,
  Share2,
  Check,
  ExternalLink,
  Handshake,
  Eye,
  Building2,
} from "lucide-react";
import QRCode from "qrcode";

interface CompanyPartnershipQRCodeProps {
  companyId: string;
  companyName: string;
}

export function CompanyPartnershipQRCode({ companyId, companyName }: CompanyPartnershipQRCodeProps) {
  const queryClient = useQueryClient();
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch or create QR code
  const { data: qrCode, isLoading, refetch } = useQuery({
    queryKey: ["company-qr-code", companyId],
    queryFn: async () => {
      // First try to get existing QR code
      const { data: existing, error: fetchError } = await supabase
        .from("company_qr_codes")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .maybeSingle();

      if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

      if (existing) return existing;

      // Create new QR code if none exists
      const code = `CMP-${companyId.substring(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      
      const { data: newQr, error: insertError } = await supabase
        .from("company_qr_codes")
        .insert({
          company_id: companyId,
          code,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return newQr;
    },
  });

  // Generate QR code image
  useEffect(() => {
    if (qrCode?.code) {
      const partnershipUrl = `${window.location.origin}/company-partnership/${qrCode.code}`;
      QRCode.toDataURL(partnershipUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#1e293b",
          light: "#ffffff",
        },
      }).then(setQrCodeDataUrl);
    }
  }, [qrCode?.code]);

  // Regenerate QR code
  const regenerateMutation = useMutation({
    mutationFn: async () => {
      // Deactivate current QR code
      if (qrCode) {
        await supabase
          .from("company_qr_codes")
          .update({ is_active: false })
          .eq("id", qrCode.id);
      }

      // Create new QR code
      const code = `CMP-${companyId.substring(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      
      const { data, error } = await supabase
        .from("company_qr_codes")
        .insert({
          company_id: companyId,
          code,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-qr-code", companyId] });
      toast.success("QR code régénéré avec succès");
    },
    onError: (error: any) => {
      toast.error("Erreur: " + error.message);
    },
  });

  const partnershipUrl = qrCode?.code
    ? `${window.location.origin}/company-partnership/${qrCode.code}`
    : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(partnershipUrl);
      setCopied(true);
      toast.success("Lien copié !");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erreur lors de la copie");
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeDataUrl) return;
    
    const link = document.createElement("a");
    link.download = `qr-partenariat-${companyName.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.href = qrCodeDataUrl;
    link.click();
    toast.success("QR code téléchargé");
  };

  const shareOnSocialMedia = (platform: string) => {
    const text = encodeURIComponent(
      `Rejoignez ${companyName} en tant que partenaire VTC ! Scannez notre QR code ou visitez :`
    );
    const url = encodeURIComponent(partnershipUrl);

    let shareUrl = "";
    switch (platform) {
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${text}%20${url}`;
        break;
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`;
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
        break;
      case "email":
        shareUrl = `mailto:?subject=${encodeURIComponent(`Partenariat VTC - ${companyName}`)}&body=${text}%20${url}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, "_blank");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            QR Code Partenariat
          </CardTitle>
          <CardDescription>
            Partagez ce QR code avec les chauffeurs VTC et gestionnaires de flotte 
            pour faciliter les demandes de partenariat
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* QR Code Display */}
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="bg-white p-4 rounded-2xl shadow-lg">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code Partenariat"
                  className="w-48 h-48"
                />
              ) : (
                <div className="w-48 h-48 bg-muted animate-pulse rounded-lg" />
              )}
            </div>

            <div className="flex-1 space-y-4 text-center md:text-left">
              <div>
                <Badge variant="outline" className="mb-2">
                  <Handshake className="w-3 h-3 mr-1" />
                  Partenariat B2B
                </Badge>
                <h3 className="font-semibold text-lg">{companyName}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Les chauffeurs et gestionnaires de flotte peuvent scanner ce code 
                  pour vous proposer un partenariat
                </p>
              </div>

              {qrCode && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Eye className="w-3 h-3" />
                  <span>{qrCode.scans_count || 0} scan{(qrCode.scans_count || 0) > 1 ? "s" : ""}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={copyLink} variant="outline" className="gap-2">
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  Copié !
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy link
                </>
              )}
            </Button>
            <Button onClick={downloadQRCode} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Download
            </Button>
            <Button
              onClick={() => regenerateMutation.mutate()}
              variant="outline"
              className="gap-2"
              disabled={regenerateMutation.isPending}
            >
              {regenerateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Regenerate
            </Button>
          </div>

          {/* Link Preview */}
          <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-2 overflow-hidden">
            <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground truncate">{partnershipUrl}</span>
          </div>
        </CardContent>
      </Card>

      {/* Share on Social Media */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Share2 className="w-4 h-4" />
            Share on Social Media
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => shareOnSocialMedia("whatsapp")}
              variant="outline"
              className="gap-2 hover:bg-green-500/10 hover:text-green-600 hover:border-green-500/30"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              WhatsApp
            </Button>
            <Button
              onClick={() => shareOnSocialMedia("facebook")}
              variant="outline"
              className="gap-2 hover:bg-blue-500/10 hover:text-blue-600 hover:border-blue-500/30"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </Button>
            <Button
              onClick={() => shareOnSocialMedia("twitter")}
              variant="outline"
              className="gap-2 hover:bg-sky-500/10 hover:text-sky-600 hover:border-sky-500/30"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              X (Twitter)
            </Button>
            <Button
              onClick={() => shareOnSocialMedia("linkedin")}
              variant="outline"
              className="gap-2 hover:bg-blue-700/10 hover:text-blue-700 hover:border-blue-700/30"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              LinkedIn
            </Button>
            <Button
              onClick={() => shareOnSocialMedia("email")}
              variant="outline"
              className="gap-2 hover:bg-orange-500/10 hover:text-orange-600 hover:border-orange-500/30"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
              Email
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-1">
              <h4 className="font-medium">Comment ça marche ?</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Les chauffeurs VTC et gestionnaires de flotte scannent votre QR code</li>
                <li>• Ils accèdent à votre profil entreprise et peuvent vous proposer un partenariat</li>
                <li>• Vous recevez les propositions dans votre espace "Mes accords"</li>
                <li>• Négociez les conditions et validez pour établir le partenariat</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
