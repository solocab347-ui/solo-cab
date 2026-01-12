import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Link, Tag, AlertTriangle, Clock, CreditCard, Mail, Phone, User, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CongressLinkTab } from "./congress/CongressLinkTab";
import { CongressNfcTab } from "./congress/CongressNfcTab";

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
    nfc_tag_number?: string | null;
    public_profile_enabled?: boolean | null;
    driver_code?: string | null;
    subscription_paid?: boolean | null;
    stripe_customer_id?: string | null;
    status?: string | null;
    free_access_type?: string | null;
  } | null;
  profile?: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

export const CongressRegistrationsTab = () => {
  const [invitations, setInvitations] = useState<CongressInvitation[]>([]);
  const [paidRegistrations, setPaidRegistrations] = useState<CongressRegistration[]>([]);
  const [incompleteRegistrations, setIncompleteRegistrations] = useState<CongressRegistration[]>([]);
  const [loading, setLoading] = useState(true);

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

      const { data: registrationsData, error: registrationsError } = await supabase
        .from("congress_registrations")
        .select(`*, driver:drivers(id, license_number, contact_phone, contact_email, is_pioneer, nfc_tag_number, public_profile_enabled, driver_code, shipping_address, shipping_city, shipping_postal_code, subscription_paid, stripe_customer_id, status, free_access_type)`)
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
      })) as CongressRegistration[];

      // LOGIQUE CORRIGÉE: Considérer comme "payé" les chauffeurs qui ont:
      // 1. subscription_paid = true (paiement classique) OU
      // 2. stripe_customer_id existe ET is_pioneer = true ET free_access_type = 'trial' 
      //    (pionnier ayant fait l'empreinte bancaire de 0€)
      const hasCompletedPayment = (driver: CongressRegistration['driver']) => {
        if (!driver) return false;
        
        // Cas 1: Paiement classique validé
        if (driver.subscription_paid === true) return true;
        
        // Cas 2: Pionnier avec empreinte bancaire (stripe_customer_id créé)
        // Pour les pionniers, la présence du stripe_customer_id indique qu'ils ont 
        // complété le checkout Stripe (empreinte de 0€)
        if (driver.stripe_customer_id && driver.is_pioneer) {
          return true;
        }
        
        return false;
      };

      const paid = enrichedRegistrations.filter(reg => hasCompletedPayment(reg.driver));
      const incomplete = enrichedRegistrations.filter(reg => !hasCompletedPayment(reg.driver));

      setPaidRegistrations(paid);
      setIncompleteRegistrations(incomplete);
    } catch (err) {
      console.error("Error loading data:", err);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="link" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="link" className="gap-2">
          <Link className="h-4 w-4" />
          Lien & Flyer
        </TabsTrigger>
        <TabsTrigger value="registrations" className="gap-2">
          <Tag className="h-4 w-4" />
          Inscrits Payés ({paidRegistrations.length})
        </TabsTrigger>
        <TabsTrigger value="incomplete" className="gap-2 relative">
          <AlertTriangle className="h-4 w-4" />
          En attente ({incompleteRegistrations.length})
          {incompleteRegistrations.length > 0 && (
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-orange-500 rounded-full" />
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="link">
        <CongressLinkTab invitation={invitations[0] || null} onUpdate={loadData} />
      </TabsContent>

      <TabsContent value="registrations">
        <CongressNfcTab registrations={paidRegistrations} onUpdate={loadData} />
      </TabsContent>

      <TabsContent value="incomplete">
        <IncompleteRegistrationsCard registrations={incompleteRegistrations} />
      </TabsContent>
    </Tabs>
  );
};

// Composant pour afficher les inscriptions incomplètes
const IncompleteRegistrationsCard = ({ registrations }: { registrations: CongressRegistration[] }) => {
  if (registrations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Aucune inscription en attente
          </CardTitle>
          <CardDescription>
            Toutes les inscriptions ont été finalisées avec paiement
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-orange-500/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Inscriptions en attente de paiement ({registrations.length})
        </CardTitle>
        <CardDescription>
          Ces personnes ont commencé l'inscription mais n'ont pas finalisé le paiement. 
          Elles ne sont <strong>PAS</strong> visibles dans la liste des chauffeurs actifs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-orange-500/10 border-orange-500/30">
          <Clock className="h-4 w-4 text-orange-500" />
          <AlertDescription>
            Ces utilisateurs ont créé un compte mais ont abandonné avant de payer. 
            Si quelqu'un vous dit avoir des problèmes d'inscription, vérifiez ici.
          </AlertDescription>
        </Alert>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code Chauffeur</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Statut Paiement</TableHead>
                <TableHead>Date tentative</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations.map((reg) => {
                const hasStripeCustomer = !!reg.driver?.stripe_customer_id;
                return (
                  <TableRow key={reg.id} className="bg-orange-500/5">
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {reg.driver?.driver_code || `DRV-${reg.driver_id.slice(0, 6).toUpperCase()}`}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {reg.profile?.full_name || "Non renseigné"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        {(reg.driver?.contact_email || reg.profile?.email) && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs">{reg.driver?.contact_email || reg.profile?.email}</span>
                          </div>
                        )}
                        {(reg.driver?.contact_phone || reg.profile?.phone) && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs">{reg.driver?.contact_phone || reg.profile?.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {hasStripeCustomer ? (
                        <Badge variant="outline" className="gap-1 bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                          <CreditCard className="h-3 w-3" />
                          Checkout abandonné
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 bg-red-500/10 text-red-600 border-red-500/30">
                          <XCircle className="h-3 w-3" />
                          Jamais commencé
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(reg.registered_at), "dd/MM/yy HH:mm", { locale: fr })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};