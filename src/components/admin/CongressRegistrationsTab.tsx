import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Crown, 
  Users, 
  Copy, 
  ExternalLink, 
  Tag, 
  Plus,
  Loader2,
  RefreshCw,
  Phone,
  Mail,
  Download,
  FileText,
  Link,
  CheckCircle,
  Smartphone,
  Star,
  Shield,
  Car
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import logo from "@/assets/logo-solocab.png";

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

interface CongressRegistration {
  id: string;
  driver_id: string;
  user_id: string;
  nfc_tag_number: string | null;
  registered_at: string;
  subscription_status: string | null;
  driver?: {
    id: string;
    license_number: string | null;
    contact_phone: string | null;
    contact_email: string | null;
    is_pioneer: boolean | null;
  } | null;
  profile?: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

export const CongressRegistrationsTab = () => {
  const [invitations, setInvitations] = useState<CongressInvitation[]>([]);
  const [registrations, setRegistrations] = useState<CongressRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegistration, setSelectedRegistration] = useState<CongressRegistration | null>(null);
  const [nfcTagNumber, setNfcTagNumber] = useState("");
  const [isUpdatingNfc, setIsUpdatingNfc] = useState(false);
  const [newMaxUses, setNewMaxUses] = useState<number>(0);
  const [isUpdatingMax, setIsUpdatingMax] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const flyerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: invitationsData, error: invitationsError } = await supabase
        .from("congress_invitations")
        .select("*")
        .order("created_at", { ascending: false });

      if (invitationsError) throw invitationsError;
      setInvitations(invitationsData || []);
      if (invitationsData?.[0]) {
        setNewMaxUses(invitationsData[0].max_uses);
      }

      const { data: registrationsData, error: registrationsError } = await supabase
        .from("congress_registrations")
        .select(`*, driver:drivers(id, license_number, contact_phone, contact_email, is_pioneer)`)
        .order("registered_at", { ascending: false });

      if (registrationsError) throw registrationsError;

      const userIds = registrationsData?.map(r => r.user_id).filter(Boolean) || [];
      let profilesMap: Record<string, { full_name: string | null; email: string | null; phone: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", userIds);
        
        if (profilesData) {
          profilesMap = profilesData.reduce((acc, p) => {
            acc[p.id] = { full_name: p.full_name, email: p.email, phone: p.phone };
            return acc;
          }, {} as Record<string, { full_name: string | null; email: string | null; phone: string | null }>);
        }
      }

      const enrichedRegistrations = (registrationsData || []).map(reg => ({
        ...reg,
        profile: reg.user_id ? profilesMap[reg.user_id] || null : null
      }));

      setRegistrations(enrichedRegistrations as CongressRegistration[]);
    } catch (err) {
      console.error("Error loading data:", err);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copié dans le presse-papiers");
  };

  const updateNfcTag = async () => {
    if (!selectedRegistration) return;
    
    setIsUpdatingNfc(true);
    try {
      await Promise.all([
        supabase
          .from("congress_registrations")
          .update({ nfc_tag_number: nfcTagNumber })
          .eq("id", selectedRegistration.id),
        supabase
          .from("drivers")
          .update({ nfc_tag_number: nfcTagNumber })
          .eq("id", selectedRegistration.driver_id)
      ]);

      toast.success("Numéro de tag NFC enregistré");
      setSelectedRegistration(null);
      setNfcTagNumber("");
      loadData();
    } catch (err) {
      console.error("Error updating NFC tag:", err);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsUpdatingNfc(false);
    }
  };

  const updateMaxUses = async (invitationId: string) => {
    setIsUpdatingMax(true);
    try {
      const { error } = await supabase
        .from("congress_invitations")
        .update({ max_uses: newMaxUses })
        .eq("id", invitationId);

      if (error) throw error;
      toast.success("Nombre maximum de places mis à jour");
      loadData();
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

  const mainInvitation = invitations[0];
  const invitationLink = mainInvitation 
    ? `${window.location.origin}/inscription-congres?ref=${mainInvitation.slug}`
    : "";

  const features = [
    { icon: Car, text: "Gérez vos courses et devis facilement" },
    { icon: Users, text: "Développez votre clientèle fidèle" },
    { icon: Smartphone, text: "Appli intuitive et professionnelle" },
    { icon: Shield, text: "Données sécurisées et RGPD" },
    { icon: Star, text: "Badge Pionnier exclusif" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="link" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="link" className="gap-2">
          <Link className="h-4 w-4" />
          Lien & Flyer
        </TabsTrigger>
        <TabsTrigger value="registrations" className="gap-2">
          <Tag className="h-4 w-4" />
          Inscriptions NFC ({registrations.length})
        </TabsTrigger>
      </TabsList>

      {/* TAB 1: Link & Flyer */}
      <TabsContent value="link" className="space-y-6">
        {mainInvitation && (
          <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                {mainInvitation.name}
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
                  <div className="text-2xl font-bold text-primary">{mainInvitation.current_uses}</div>
                  <div className="text-sm text-muted-foreground">Inscrits</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-amber-500">
                    {mainInvitation.max_uses - mainInvitation.current_uses}
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
                      onClick={() => updateMaxUses(mainInvitation.id)}
                      disabled={isUpdatingMax || newMaxUses === mainInvitation.max_uses}
                    >
                      {isUpdatingMax ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Max places</div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Badge variant={mainInvitation.is_active ? "default" : "secondary"}>
                  {mainInvitation.is_active ? "Actif" : "Inactif"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Tarif: {mainInvitation.monthly_price}€/mois • Essai: {mainInvitation.trial_days} jours
                </span>
              </div>
            </CardContent>
          </Card>
        )}

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
              <div
                ref={flyerRef}
                className="w-[794px] h-[1123px] bg-gradient-to-b from-[#0a0a14] via-[#0f1420] to-[#0a0a14] text-white p-8 relative overflow-hidden"
              >
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute top-20 -right-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
                  <div className="absolute bottom-40 -left-20 w-60 h-60 bg-[#22c55e]/10 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <img src={logo} alt="SoloCab" className="h-16 object-contain" />
                    <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 rounded-full px-4 py-2">
                      <Crown className="h-5 w-5 text-amber-400" />
                      <span className="text-amber-400 font-bold text-lg">OFFRE PIONNIER</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-[#22c55e]/20 via-[#22c55e]/10 to-[#22c55e]/20 border border-[#22c55e]/30 rounded-2xl p-4 mb-6 text-center">
                    <p className="text-[#22c55e] font-semibold text-xl">🎉 CONGRÈS NATIONAL DES VTC 2026 🎉</p>
                    <p className="text-white/70 text-sm mt-1">Offre exclusive réservée aux participants</p>
                  </div>

                  <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white via-amber-100 to-white bg-clip-text text-transparent">
                      Rejoignez les Pionniers
                    </h1>
                    <h2 className="text-3xl font-bold text-amber-400 mb-4">SoloCab</h2>
                    <p className="text-white/70 text-lg max-w-lg mx-auto">
                      L'application de gestion complète pour chauffeurs VTC indépendants
                    </p>
                  </div>

                  {mainInvitation && (
                    <div className="bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-amber-500/20 border-2 border-amber-500/40 rounded-3xl p-6 mb-6 text-center">
                      <p className="text-white/80 text-lg mb-2">Essai gratuit</p>
                      <p className="text-6xl font-bold text-amber-400 mb-2">{mainInvitation.trial_days} JOURS</p>
                      <p className="text-white/60 text-sm mb-4">Sans engagement, sans carte bancaire</p>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-white/60">puis</span>
                        <span className="text-3xl font-bold text-white">{mainInvitation.monthly_price}€</span>
                        <span className="text-white/60">/mois</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                        <div className="w-10 h-10 rounded-full bg-[#22c55e]/20 flex items-center justify-center flex-shrink-0">
                          <feature.icon className="h-5 w-5 text-[#22c55e]" />
                        </div>
                        <span className="text-white/90 text-sm">{feature.text}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-gradient-to-r from-amber-900/30 via-amber-800/20 to-amber-900/30 border border-amber-500/30 rounded-2xl p-5 mb-6">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/30">
                        <Crown className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-amber-400 font-bold text-lg mb-1">Badge Pionnier Exclusif</h3>
                        <p className="text-white/70 text-sm">
                          En tant que membre fondateur, vous bénéficiez du badge Pionnier visible sur votre profil. 
                          Distinguez-vous et montrez votre engagement envers l'excellence.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
                      <p className="text-white/60 text-sm mb-3">Inscrivez-vous dès maintenant</p>
                      <div className="bg-[#22c55e]/20 border border-[#22c55e]/30 rounded-xl px-4 py-3 inline-block">
                        <p className="text-[#22c55e] font-mono text-sm break-all">{invitationLink}</p>
                      </div>
                      <div className="flex items-center justify-center gap-2 mt-4">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span className="text-green-400 text-sm">Activation immédiate de votre compte</span>
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <p className="text-white/40 text-xs">SoloCab © 2026 - Votre partenaire de confiance pour la gestion VTC</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* TAB 2: Registrations & NFC */}
      <TabsContent value="registrations" className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Inscriptions Congrès ({registrations.length})
              </CardTitle>
              <CardDescription>
                Gérez les chauffeurs inscrits et attribuez les tags NFC
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Date inscription</TableHead>
                  <TableHead>Tag NFC</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.map((reg) => (
                  <TableRow key={reg.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {reg.driver_id.slice(0, 8)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {reg.driver?.is_pioneer && (
                          <Crown className="h-4 w-4 text-amber-500" />
                        )}
                        <span className="font-medium">
                          {reg.profile?.full_name || "N/A"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span>{reg.profile?.phone || reg.driver?.contact_phone || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span>{reg.profile?.email || reg.driver?.contact_email || "N/A"}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(reg.registered_at), "dd MMM yyyy HH:mm", { locale: fr })}
                    </TableCell>
                    <TableCell>
                      {reg.nfc_tag_number ? (
                        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                          <Tag className="h-3 w-3 mr-1" />
                          {reg.nfc_tag_number}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Non attribué</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRegistration(reg);
                              setNfcTagNumber(reg.nfc_tag_number || "");
                            }}
                          >
                            <Tag className="h-4 w-4 mr-1" />
                            NFC
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Attribuer un tag NFC</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Chauffeur</Label>
                              <div className="font-medium">{reg.profile?.full_name || "Chauffeur"}</div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="nfc">Numéro du tag NFC</Label>
                              <Input
                                id="nfc"
                                placeholder="Ex: NFC-001"
                                value={nfcTagNumber}
                                onChange={(e) => setNfcTagNumber(e.target.value)}
                              />
                            </div>
                            <Button 
                              className="w-full" 
                              onClick={updateNfcTag}
                              disabled={isUpdatingNfc || !nfcTagNumber}
                            >
                              {isUpdatingNfc ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Tag className="h-4 w-4 mr-2" />
                              )}
                              Enregistrer
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
                {registrations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Aucune inscription pour le moment
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
