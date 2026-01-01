import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import logo from "@/assets/logo-solocab.png";
import {
  Building2,
  Loader2,
  MapPin,
  Users,
  Briefcase,
  Phone,
  Mail,
  Handshake,
  ArrowRight,
  LogIn,
  Car,
  Truck,
  CheckCircle,
  Star,
} from "lucide-react";

interface Company {
  id: string;
  company_name: string;
  address: string;
  contact_email: string;
  contact_phone: string | null;
  notes: string | null;
  logo_url: string | null;
  preferred_vehicle_types: string[] | null;
  employee_count: number | null;
  visible_to_drivers: boolean | null;
  accepting_proposals: boolean | null;
  show_phone: boolean | null;
}

export default function CompanyPartnership() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userType, setUserType] = useState<"driver" | "fleet_manager" | null>(null);

  useEffect(() => {
    fetchCompanyFromQR();
  }, [code]);

  useEffect(() => {
    if (user) {
      checkUserType();
    }
  }, [user]);

  const fetchCompanyFromQR = async () => {
    if (!code) {
      setError("Code QR invalide");
      setLoading(false);
      return;
    }

    try {
      // Get QR code and update scan count
      const { data: qrData, error: qrError } = await supabase
        .from("company_qr_codes")
        .select("company_id, scans_count")
        .eq("code", code)
        .eq("is_active", true)
        .maybeSingle();

      if (qrError) throw qrError;
      if (!qrData) {
        setError("Ce QR code n'est plus valide");
        setLoading(false);
        return;
      }

      // Update scan count
      await supabase
        .from("company_qr_codes")
        .update({ scans_count: (qrData.scans_count || 0) + 1 })
        .eq("code", code);

      // Fetch company profile
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("*")
        .eq("id", qrData.company_id)
        .single();

      if (companyError) throw companyError;
      setCompany(companyData);
    } catch (err: any) {
      console.error("Erreur:", err);
      setError("Erreur lors du chargement du profil");
    } finally {
      setLoading(false);
    }
  };

  const checkUserType = async () => {
    if (!user) return;

    // Check if driver
    const { data: driver } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (driver) {
      setUserType("driver");
      return;
    }

    // Check if fleet manager
    const { data: fleetManager } = await supabase
      .from("fleet_managers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (fleetManager) {
      setUserType("fleet_manager");
    }
  };

  const handleProposePartnership = () => {
    if (!user) {
      toast.info("Connectez-vous pour proposer un partenariat");
      return;
    }

    if (userType === "driver") {
      navigate(`/driver-dashboard?tab=partnerships&companyId=${company?.id}`);
    } else if (userType === "fleet_manager") {
      navigate(`/fleet-dashboard?tab=partnerships&companyId=${company?.id}`);
    } else {
      toast.error("Seuls les chauffeurs et gestionnaires de flotte peuvent proposer des partenariats");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="max-w-md w-full bg-card/50 backdrop-blur border-destructive/30">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/20 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold mb-2">Profil non trouvé</h2>
            <p className="text-muted-foreground mb-4">{error || "Ce lien n'est plus valide"}</p>
            <Button onClick={() => navigate("/")} variant="outline">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="SoloCab" className="w-10 h-10" />
            <span className="font-bold text-white">SoloCab</span>
          </Link>
          {!user && (
            <Button variant="outline" onClick={() => navigate("/login")} className="gap-2">
              <LogIn className="w-4 h-4" />
              Se connecter
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card className="bg-card/50 backdrop-blur border-white/10">
          <CardHeader className="space-y-6">
            {/* Company Header */}
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden flex-shrink-0 border border-primary/20">
                {company.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt={company.company_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="w-10 h-10 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-2xl font-bold text-white">{company.company_name}</h1>
                  {company.accepting_proposals && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      <Star className="w-3 h-3 mr-1" />
                      Accepte les propositions
                    </Badge>
                  )}
                </div>
                {company.address && (
                  <p className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{company.address}</span>
                  </p>
                )}
                {company.employee_count && (
                  <p className="text-muted-foreground flex items-center gap-1 mt-1">
                    <Users className="w-4 h-4" />
                    {company.employee_count} collaborateurs
                  </p>
                )}
              </div>
            </div>

            {/* Partnership Invite Banner */}
            <div className="p-4 bg-gradient-to-r from-primary/20 via-violet-500/10 to-transparent rounded-xl border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Handshake className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">Proposition de partenariat</h3>
                  <p className="text-sm text-muted-foreground">
                    {company.company_name} recherche des partenaires VTC pour ses besoins de transport
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Description */}
            {company.notes && (
              <div className="bg-muted/30 rounded-xl p-4">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  À propos de l'entreprise
                </h3>
                <p className="text-muted-foreground leading-relaxed">{company.notes}</p>
              </div>
            )}

            {/* Services Needed */}
            {company.preferred_vehicle_types && company.preferred_vehicle_types.length > 0 && (
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Services recherchés
                </h3>
                <div className="flex flex-wrap gap-2">
                  {company.preferred_vehicle_types.map((service) => (
                    <Badge key={service} variant="secondary">
                      {service}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Info */}
            <div className="grid sm:grid-cols-2 gap-4">
              {company.show_phone && company.contact_phone && (
                <a
                  href={`tel:${company.contact_phone}`}
                  className="flex items-center gap-3 p-4 bg-green-500/10 rounded-xl border border-green-500/20 hover:bg-green-500/20 transition-colors"
                >
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Phone className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Téléphone</p>
                    <p className="font-medium text-green-400">{company.contact_phone}</p>
                  </div>
                </a>
              )}
              <a
                href={`mailto:${company.contact_email}`}
                className="flex items-center gap-3 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
              >
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Mail className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium text-blue-400 truncate">{company.contact_email}</p>
                </div>
              </a>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-white/10 space-y-4">
              {company.accepting_proposals ? (
                <>
                  {user ? (
                    <Button
                      onClick={handleProposePartnership}
                      className="w-full gap-2"
                      size="lg"
                      disabled={!userType}
                    >
                      <Handshake className="w-5 h-5" />
                      Proposer un partenariat
                      <ArrowRight className="w-4 h-4 ml-auto" />
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-center text-muted-foreground">
                        Connectez-vous pour proposer un partenariat
                      </p>
                      <div className="flex gap-3">
                        <Button
                          onClick={() => navigate("/login")}
                          variant="outline"
                          className="flex-1 gap-2"
                        >
                          <LogIn className="w-4 h-4" />
                          Se connecter
                        </Button>
                        <Button
                          onClick={() => navigate("/register-driver")}
                          className="flex-1 gap-2"
                        >
                          <Car className="w-4 h-4" />
                          S'inscrire
                        </Button>
                      </div>
                    </div>
                  )}

                  {user && !userType && (
                    <p className="text-center text-sm text-amber-400">
                      Seuls les chauffeurs VTC et gestionnaires de flotte peuvent proposer des partenariats
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center p-4 bg-muted/30 rounded-xl">
                  <p className="text-muted-foreground">
                    Cette entreprise n'accepte pas les propositions de partenariat pour le moment
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <Card className="bg-card/30 backdrop-blur border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Car className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-medium">Chauffeurs VTC</h4>
                  <p className="text-sm text-muted-foreground">
                    Proposez vos services de transport à cette entreprise
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/30 backdrop-blur border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-violet-500/20 rounded-lg">
                  <Truck className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h4 className="font-medium">Gestionnaires de flotte</h4>
                  <p className="text-sm text-muted-foreground">
                    Proposez votre flotte pour les besoins de transport
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
