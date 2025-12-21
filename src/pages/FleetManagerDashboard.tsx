import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NavigationHeader } from "@/components/NavigationHeader";
import {
  Truck,
  Users,
  Car,
  QrCode,
  Send,
  Plus,
  Copy,
  Trash2,
  Loader2,
  Eye,
  BarChart3,
  Settings,
  Mail,
  Globe,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
} from "lucide-react";
import QRCode from "qrcode";
import { FleetManagerDocuments } from "@/components/fleet-manager/FleetManagerDocuments";
import { DocumentWarningBanner } from "@/components/fleet-manager/DocumentWarningBanner";

interface FleetManager {
  id: string;
  company_name: string;
  status: string;
  show_drivers_in_public_storefront: boolean;
  total_drivers: number;
  total_clients: number;
  documents_status: string | null;
  documents_deadline: string | null;
}

interface FleetDriver {
  id: string;
  driver_id: string;
  status: string;
  joined_at: string;
  driver?: {
    id: string;
    vehicle_model: string;
    status: string;
    user_id: string;
    profile?: {
      full_name: string;
      email: string;
      phone: string;
    };
  };
}

interface FleetClient {
  id: string;
  client_id: string;
  registered_at: string;
  client?: {
    id: string;
    user_id: string;
    total_rides: number;
    profile?: {
      full_name: string;
      email: string;
    };
  };
}

interface Invitation {
  id: string;
  token: string;
  email: string | null;
  used: boolean;
  created_at: string;
  expires_at: string | null;
}

const FleetManagerDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fleetManager, setFleetManager] = useState<FleetManager | null>(null);
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);
  const [clients, setClients] = useState<FleetClient[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [qrCodeData, setQrCodeData] = useState<string>("");
  const [newInvitationEmail, setNewInvitationEmail] = useState("");
  const [sendingInvitation, setSendingInvitation] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch fleet manager profile
      const { data: fmData, error: fmError } = await supabase
        .from("fleet_managers")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (fmError) throw fmError;
      setFleetManager(fmData);

      // Fetch drivers
      const { data: driversData } = await supabase
        .from("fleet_manager_drivers")
        .select(`
          *,
          driver:drivers(
            id,
            vehicle_model,
            status,
            user_id
          )
        `)
        .eq("fleet_manager_id", fmData.id);

      if (driversData) {
        // Fetch profiles for drivers
        const driverUserIds = driversData
          .filter((d) => d.driver)
          .map((d) => d.driver.user_id);

        if (driverUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, email, phone")
            .in("id", driverUserIds);

          const driversWithProfiles = driversData.map((d) => ({
            ...d,
            driver: d.driver
              ? {
                  ...d.driver,
                  profile: profiles?.find((p) => p.id === d.driver.user_id),
                }
              : undefined,
          }));

          setDrivers(driversWithProfiles);
        } else {
          setDrivers(driversData);
        }
      }

      // Fetch clients
      const { data: clientsData } = await supabase
        .from("fleet_manager_clients")
        .select(`
          *,
          client:clients(
            id,
            user_id,
            total_rides
          )
        `)
        .eq("fleet_manager_id", fmData.id);

      if (clientsData) {
        const clientUserIds = clientsData
          .filter((c) => c.client)
          .map((c) => c.client.user_id);

        if (clientUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", clientUserIds);

          const clientsWithProfiles = clientsData.map((c) => ({
            ...c,
            client: c.client
              ? {
                  ...c.client,
                  profile: profiles?.find((p) => p.id === c.client.user_id),
                }
              : undefined,
          }));

          setClients(clientsWithProfiles);
        } else {
          setClients(clientsData);
        }
      }

      // Fetch invitations
      const { data: invitationsData } = await supabase
        .from("fleet_manager_invitations")
        .select("*")
        .eq("fleet_manager_id", fmData.id)
        .order("created_at", { ascending: false });

      if (invitationsData) {
        setInvitations(invitationsData);
      }

      // Fetch or generate QR code
      const { data: qrData } = await supabase
        .from("fleet_manager_qr_codes")
        .select("*")
        .eq("fleet_manager_id", fmData.id)
        .single();

      if (qrData) {
        const registrationUrl = `${window.location.origin}/register-client-fleet?fm=${qrData.code}`;
        setQrCodeData(registrationUrl);
        const qr = await QRCode.toDataURL(registrationUrl, { width: 256 });
        setQrCodeUrl(qr);
      } else {
        // Generate new QR code
        const code = crypto.randomUUID();
        await supabase.from("fleet_manager_qr_codes").insert({
          fleet_manager_id: fmData.id,
          code,
        });
        const registrationUrl = `${window.location.origin}/register-client-fleet?fm=${code}`;
        setQrCodeData(registrationUrl);
        const qr = await QRCode.toDataURL(registrationUrl, { width: 256 });
        setQrCodeUrl(qr);
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const generateInvitation = async () => {
    if (!fleetManager) return;

    setSendingInvitation(true);
    try {
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      const { error } = await supabase.from("fleet_manager_invitations").insert({
        fleet_manager_id: fleetManager.id,
        token,
        email: newInvitationEmail || null,
        expires_at: expiresAt.toISOString(),
      });

      if (error) throw error;

      toast.success("Invitation créée avec succès");
      setNewInvitationEmail("");
      fetchData();
    } catch (error: any) {
      console.error("Error creating invitation:", error);
      toast.error("Erreur lors de la création de l'invitation");
    } finally {
      setSendingInvitation(false);
    }
  };

  const copyInvitationLink = (token: string) => {
    const link = `${window.location.origin}/register-driver-fleet?token=${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Lien copié dans le presse-papiers");
  };

  const deleteInvitation = async (id: string) => {
    try {
      const { error } = await supabase
        .from("fleet_manager_invitations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Invitation supprimée");
      setInvitations(invitations.filter((inv) => inv.id !== id));
    } catch (error: any) {
      console.error("Error deleting invitation:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const togglePublicStorefront = async (enabled: boolean) => {
    if (!fleetManager) return;

    try {
      const { error } = await supabase
        .from("fleet_managers")
        .update({ show_drivers_in_public_storefront: enabled })
        .eq("id", fleetManager.id);

      if (error) throw error;

      setFleetManager({ ...fleetManager, show_drivers_in_public_storefront: enabled });
      toast.success(
        enabled
          ? "Vos chauffeurs sont maintenant visibles publiquement"
          : "Vos chauffeurs ne sont plus visibles publiquement"
      );
    } catch (error: any) {
      console.error("Error updating settings:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const copyQrLink = () => {
    navigator.clipboard.writeText(qrCodeData);
    toast.success("Lien copié dans le presse-papiers");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!fleetManager) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Profil non trouvé</p>
      </div>
    );
  }

  if (fleetManager.status === "pending") {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-lg mx-auto">
            <CardHeader className="text-center">
              <Clock className="w-16 h-16 mx-auto text-amber-500 mb-4" />
              <CardTitle>En attente de validation</CardTitle>
              <CardDescription>
                Votre compte gestionnaire de flotte est en cours de vérification.
                Vous recevrez un email dès que votre compte sera validé.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Document Warning Banner - Always visible if documents pending */}
      <DocumentWarningBanner 
        documentsStatus={fleetManager.documents_status || "pending"}
        documentsDeadline={fleetManager.documents_deadline}
      />
      
      <NavigationHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Truck className="w-8 h-8 text-primary" />
            {fleetManager.company_name}
          </h1>
          <p className="text-muted-foreground mt-1">
            Tableau de bord gestionnaire de flotte
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Car className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{drivers.length}</p>
                  <p className="text-muted-foreground text-sm">Chauffeurs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <Users className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{clients.length}</p>
                  <p className="text-muted-foreground text-sm">Clients</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Send className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {invitations.filter((i) => !i.used).length}
                  </p>
                  <p className="text-muted-foreground text-sm">Invitations en attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="drivers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
            <TabsTrigger value="drivers" className="flex items-center gap-2">
              <Car className="w-4 h-4" />
              <span className="hidden sm:inline">Chauffeurs</span>
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Clients</span>
            </TabsTrigger>
            <TabsTrigger value="invitations" className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Invitations</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
            <TabsTrigger value="qrcode" className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">QR Code</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Paramètres</span>
            </TabsTrigger>
          </TabsList>

          {/* Drivers Tab */}
          <TabsContent value="drivers">
            <Card>
              <CardHeader>
                <CardTitle>Mes Chauffeurs</CardTitle>
                <CardDescription>
                  Gérez votre équipe de chauffeurs VTC
                </CardDescription>
              </CardHeader>
              <CardContent>
                {drivers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun chauffeur pour le moment</p>
                    <p className="text-sm mt-2">
                      Envoyez des invitations pour recruter des chauffeurs
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {drivers.map((driver) => (
                      <div
                        key={driver.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Car className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {driver.driver?.profile?.full_name || "Chauffeur"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {driver.driver?.vehicle_model}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            driver.driver?.status === "validated"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {driver.driver?.status === "validated"
                            ? "Validé"
                            : "En attente"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients">
            <Card>
              <CardHeader>
                <CardTitle>Mes Clients</CardTitle>
                <CardDescription>
                  Clients inscrits via votre QR code
                </CardDescription>
              </CardHeader>
              <CardContent>
                {clients.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun client pour le moment</p>
                    <p className="text-sm mt-2">
                      Partagez votre QR code pour recruter des clients
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {clients.map((client) => (
                      <div
                        key={client.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-green-500" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {client.client?.profile?.full_name || "Client"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {client.client?.total_rides || 0} courses
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(client.registered_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invitations Tab */}
          <TabsContent value="invitations">
            <Card>
              <CardHeader>
                <CardTitle>Invitations Chauffeurs</CardTitle>
                <CardDescription>
                  Envoyez des liens d'invitation à vos chauffeurs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Create invitation form */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="invitationEmail">Email du chauffeur (optionnel)</Label>
                    <Input
                      id="invitationEmail"
                      type="email"
                      placeholder="chauffeur@email.com"
                      value={newInvitationEmail}
                      onChange={(e) => setNewInvitationEmail(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={generateInvitation} disabled={sendingInvitation}>
                      {sendingInvitation ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Créer invitation
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Invitations list */}
                <div className="space-y-3">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        {invitation.used ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <Clock className="w-5 h-5 text-amber-500" />
                        )}
                        <div>
                          <p className="font-medium">
                            {invitation.email || "Invitation générique"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Créée le{" "}
                            {new Date(invitation.created_at).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {invitation.used ? (
                          <Badge variant="secondary">Utilisée</Badge>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyInvitationLink(invitation.token)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteInvitation(invitation.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {invitations.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Aucune invitation créée
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* QR Code Tab */}
          <TabsContent value="qrcode">
            <Card>
              <CardHeader>
                <CardTitle>QR Code Client</CardTitle>
                <CardDescription>
                  Partagez ce QR code pour que vos clients s'inscrivent
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-6">
                {qrCodeUrl && (
                  <div className="p-4 bg-white rounded-lg">
                    <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
                  </div>
                )}

                <div className="flex gap-4">
                  <Button variant="outline" onClick={copyQrLink}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copier le lien
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const link = document.createElement("a");
                      link.download = "qr-code-clients.png";
                      link.href = qrCodeUrl;
                      link.click();
                    }}
                  >
                    Télécharger
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Les clients qui scannent ce QR code seront automatiquement
                  associés à votre flotte et auront accès à vos chauffeurs.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Paramètres</CardTitle>
                <CardDescription>
                  Configurez les options de votre flotte
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Globe className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">Visibilité publique</p>
                      <p className="text-sm text-muted-foreground">
                        Afficher vos chauffeurs dans la vitrine publique SoloCab
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={fleetManager.show_drivers_in_public_storefront}
                    onCheckedChange={togglePublicStorefront}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <FleetManagerDocuments 
              fleetManagerId={fleetManager.id} 
              userId={user?.id || ""} 
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default FleetManagerDashboard;
