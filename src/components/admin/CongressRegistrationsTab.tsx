import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Link, Tag } from "lucide-react";
import { toast } from "sonner";
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
        .select(`*, driver:drivers(id, license_number, contact_phone, contact_email, is_pioneer, nfc_tag_number, public_profile_enabled, driver_code, shipping_address, shipping_city, shipping_postal_code)`)
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

      <TabsContent value="link">
        <CongressLinkTab invitation={invitations[0] || null} onUpdate={loadData} />
      </TabsContent>

      <TabsContent value="registrations">
        <CongressNfcTab registrations={registrations} onUpdate={loadData} />
      </TabsContent>
    </Tabs>
  );
};