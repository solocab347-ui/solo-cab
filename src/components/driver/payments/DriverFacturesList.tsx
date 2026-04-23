import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Search, Download, Euro, CheckCircle, CreditCard, Share2, MessageSquare, Mail, Send, Facebook, Building2, Phone, User } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { generateUnifiedInvoicePDF } from "@/lib/invoice/generateUnifiedInvoicePDF";
import { generateFactureShareMessage } from "@/lib/courseMessageGenerator";

interface DriverFacturesListProps {
  driverId: string;
}

const DriverFacturesList = ({ driverId }: DriverFacturesListProps) => {
  const [factures, setFactures] = useState<any[]>([]);
  const [filteredFactures, setFilteredFactures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [clients, setClients] = useState<any[]>([]);
  const [driverInfo, setDriverInfo] = useState<any>(null);

  useEffect(() => {
    fetchFactures();
    fetchDriverInfo();
  }, [driverId]);

  useEffect(() => {
    let filtered = factures;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((facture) => facture.payment_status === statusFilter);
    }

    // Filter by client/company
    if (clientFilter !== "all") {
      filtered = filtered.filter((facture) => 
        facture.clients?.id === clientFilter || 
        facture.companyInfo?.id === clientFilter ||
        (clientFilter.startsWith('guest-') && `guest-${facture.id}` === clientFilter)
      );
    }

    // Filter by date
    if (dateFilter !== "all") {
      const now = new Date();
      let startDate: Date;
      let endDate: Date = now;

      switch (dateFilter) {
        case "this_week":
          startDate = startOfWeek(now, { weekStartsOn: 1 });
          endDate = endOfWeek(now, { weekStartsOn: 1 });
          break;
        case "this_month":
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case "last_month":
          startDate = startOfMonth(subMonths(now, 1));
          endDate = endOfMonth(subMonths(now, 1));
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter((facture) => {
        const factureDate = new Date(facture.created_at);
        return factureDate >= startDate && factureDate <= endDate;
      });
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (facture) =>
          facture.invoice_number?.toLowerCase().includes(term) ||
          facture.invoice_number_generated?.toLowerCase().includes(term) ||
          facture.clients?.profiles?.full_name?.toLowerCase().includes(term) ||
          facture.companyInfo?.company_name?.toLowerCase().includes(term) ||
          facture.courses?.guest_name?.toLowerCase().includes(term)
      );
    }

    setFilteredFactures(filtered);
  }, [searchTerm, statusFilter, clientFilter, dateFilter, factures]);

  const fetchDriverInfo = async () => {
    try {
      const { data: driverData } = await supabase
        .from("drivers")
        .select(`
          *,
          profiles:user_id(full_name, phone)
        `)
        .eq("id", driverId)
        .single();
      
      setDriverInfo(driverData);
    } catch (error) {
      console.error("Error fetching driver info:", error);
    }
  };

  const fetchFactures = async () => {
    const maxRetries = 4;
    
    const attemptFetch = async (attempt: number): Promise<void> => {
      try {
        // Fetch regular factures (with client)
        const { data: regularFactures, error: regularError } = await supabase
          .from("factures")
          .select(`
            *,
            clients(
              id,
              profiles:user_id(full_name, email, phone, profile_photo_url)
            ),
            courses(
              pickup_address,
              destination_address,
              scheduled_date,
              distance_km,
              duration_minutes,
              passengers_count,
              is_guest_booking,
              guest_name,
              guest_phone
            ),
            devis(
              base_price,
              distance_price,
              time_price,
              discount_amount,
              promo_code,
              evening_surcharge_amount,
              weekend_surcharge_amount,
              peak_hours_surcharge_amount,
              tva_rate,
              tva_amount,
              airport_fee
            )
          `)
          .eq("driver_id", driverId)
          .order("created_at", { ascending: false })
          .limit(200);

        if (regularError) throw regularError;

        // Fetch company course info for factures including employee info
        const courseIds = (regularFactures || []).map(f => f.course_id);
        let companyCoursesMap = new Map();
        let companyCourseRequestsMap = new Map();
        let directCompaniesMap = new Map();
        
        // Also gather company_ids directly from factures for direct company lookup
        const directCompanyIds = (regularFactures || [])
          .filter(f => f.company_id)
          .map(f => f.company_id);
        
        if (directCompanyIds.length > 0) {
          const { data: directCompanyData } = await supabase
            .from("companies")
            .select("id, company_name, logo_url, contact_email, contact_phone, siret, siren, tva_number, address, billing_address")
            .in("id", [...new Set(directCompanyIds)]);
          
          directCompanyData?.forEach(company => {
            directCompaniesMap.set(company.id, company);
          });
        }
        
        if (courseIds.length > 0) {
          // Fetch company_courses with company info
          const { data: companyData, error: companyDataError } = await supabase
            .from("company_courses")
            .select(`
              course_id,
              employee_id,
              company_id,
              companies!company_courses_company_id_fkey(id, company_name, logo_url, contact_email, contact_phone, siret, siren, tva_number, address, billing_address),
              company_employees!company_courses_employee_id_fkey(
                id,
                user_id,
                profiles:user_id(full_name, phone, email)
              )
            `)
            .in("course_id", courseIds);
          
          if (companyDataError) {
            console.error("Error fetching company courses:", companyDataError);
          }
          
          companyData?.forEach(cc => {
            companyCoursesMap.set(cc.course_id, {
              company: cc.companies,
              employee: cc.company_employees
            });
          });

          // Fetch company_course_requests for guest employees
          const { data: requestsData } = await supabase
            .from("company_course_requests")
            .select(`
              final_course_id,
              is_guest_employee,
              guest_employee_name,
              guest_employee_phone,
              guest_employee_email,
              employee_id,
              company_employees(
                id,
                user_id,
                profiles:user_id(full_name, phone, email)
              )
            `)
            .in("final_course_id", courseIds);
          
          requestsData?.forEach(req => {
            companyCourseRequestsMap.set(req.final_course_id, req);
          });
        }

        // Enrich factures with company info and employee info
        const enrichedFactures = (regularFactures || []).map(f => {
          const companyInfo = companyCoursesMap.get(f.course_id);
          const requestInfo = companyCourseRequestsMap.get(f.course_id);
          // Direct company from facture.company_id takes priority
          const directCompany = f.company_id ? directCompaniesMap.get(f.company_id) : null;
          
          let employeeName = null;
          let employeePhone = null;
          let employeeEmail = null;
          let isGuestEmployee = false;
          
          if (requestInfo) {
            isGuestEmployee = requestInfo.is_guest_employee || false;
            if (isGuestEmployee) {
              employeeName = requestInfo.guest_employee_name;
              employeePhone = requestInfo.guest_employee_phone;
              employeeEmail = requestInfo.guest_employee_email;
            } else if (requestInfo.company_employees?.profiles) {
              employeeName = requestInfo.company_employees.profiles.full_name;
              employeePhone = requestInfo.company_employees.profiles.phone;
              employeeEmail = requestInfo.company_employees.profiles.email;
            }
          } else if (companyInfo?.employee?.profiles) {
            employeeName = companyInfo.employee.profiles.full_name;
            employeePhone = companyInfo.employee.profiles.phone;
            employeeEmail = companyInfo.employee.profiles.email;
          }
          
          // Use direct company from facture.company_id, fallback to company_courses
          const finalCompanyInfo = directCompany || companyInfo?.company || null;
          
          return {
            ...f,
            companyInfo: finalCompanyInfo,
            employeeName,
            employeePhone,
            employeeEmail,
            isGuestEmployee
          };
        });

        setFactures(enrichedFactures);
        setFilteredFactures(enrichedFactures);

        // Extract unique clients/companies for filter
        const uniqueEntities = new Map();
        enrichedFactures.forEach((f) => {
          if (f.clients?.id) {
            uniqueEntities.set(f.clients.id, { 
              id: f.clients.id, 
              name: f.clients.profiles?.full_name || 'Client',
              type: 'client'
            });
          }
          if (f.companyInfo?.id) {
            uniqueEntities.set(f.companyInfo.id, {
              id: f.companyInfo.id,
              name: `🏢 ${f.companyInfo.company_name}`,
              type: 'company'
            });
          }
          // For guest bookings without company
          if (f.courses?.is_guest_booking && f.courses?.guest_name && !f.companyInfo) {
            uniqueEntities.set(`guest-${f.id}`, {
              id: `guest-${f.id}`,
              name: `${f.courses.guest_name} (Non inscrit)`,
              type: 'guest'
            });
          }
        });
        setClients(Array.from(uniqueEntities.values()));
        setLoading(false);
        
      } catch (error: any) {
        console.error(`Erreur chargement factures (tentative ${attempt + 1}/${maxRetries}):`, error);
        
        if (attempt < maxRetries - 1) {
          // Retry avec délai exponentiel
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          return attemptFetch(attempt + 1);
        }
        
        // Échec final - afficher liste vide sans bloquer
        setFactures([]);
        setFilteredFactures([]);
        setLoading(false);
        toast.error("Impossible de charger les factures. Réessayez plus tard.");
      }
    };
    
    await attemptFetch(0);
  };

  const handleDownloadPDF = async (facture: any, forClient: boolean = false) => {
    if (!driverInfo) {
      toast.error("Informations chauffeur manquantes");
      return;
    }

    if (!driverInfo.company_name || (!driverInfo.siret && !driverInfo.siren)) {
      toast.error(
        "Informations de l'entreprise incomplètes. Veuillez compléter vos paramètres (Nom d'entreprise, SIRET ou SIREN, Adresse)"
      );
      return;
    }

    try {
      await generateUnifiedInvoicePDF(
        {
          facture: {
            ...facture,
            companyInfo: facture.companyInfo,
            employeeName: facture.employeeName,
            employeePhone: facture.employeePhone,
          },
          course: {
            pickup_address: facture.courses?.pickup_address || "",
            destination_address: facture.courses?.destination_address || "",
            scheduled_date: facture.courses?.scheduled_date || facture.created_at,
            passengers_count: facture.courses?.passengers_count,
            distance_km: facture.courses?.distance_km,
            duration_minutes: facture.courses?.duration_minutes,
            guest_name: facture.courses?.guest_name,
            guest_phone: facture.courses?.guest_phone,
          },
          driver: driverInfo,
          client: facture.clients,
          variant: forClient ? "client" : "driver",
        },
        { download: true }
      );
      toast.success("Facture téléchargée");
    } catch (e) {
      console.error("Erreur génération facture", e);
      toast.error("Erreur lors de la génération de la facture");
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      paid: "bg-gradient-success text-white border-0 shadow-md",
      pending: "bg-gradient-trust text-white border-0 shadow-md",
      failed: "bg-destructive/90 text-white border-0 shadow-md",
      refunded: "bg-muted/90 text-white border-0 shadow-md",
    };

    const labels = {
      paid: "Payée",
      pending: "En attente",
      failed: "Échec",
      refunded: "Remboursée",
    };

    return (
      <Badge className={styles[status as keyof typeof styles]}>
        <CheckCircle className="w-3 h-3 mr-1" />
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Chargement des factures...</p>
      </div>
    );
  }

  const stats = {
    total: factures.length,
    paid: factures.filter((f) => f.payment_status === "paid").length,
    pending: factures.filter((f) => f.payment_status === "pending").length,
    failed: factures.filter((f) => f.payment_status === "failed").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats - Horizontal on all screens */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <Card className="p-3 sm:p-4 bg-gradient-to-br from-primary/40 via-primary/25 to-primary/10 border border-primary/30 shadow-elegant hover:shadow-primary/50 transition-all">
          <div className="text-center">
            <h3 className="text-xl sm:text-3xl font-bold text-white">{stats.total}</h3>
            <p className="text-xs sm:text-sm text-white/80">Factures totales</p>
          </div>
        </Card>
        <Card className="p-3 sm:p-4 bg-gradient-to-br from-success/40 via-success/25 to-success/10 border border-success/30 shadow-elegant hover:shadow-success/50 transition-all">
          <div className="text-center">
            <h3 className="text-xl sm:text-3xl font-bold text-white">{stats.paid}</h3>
            <p className="text-xs sm:text-sm text-white/80">Payées</p>
          </div>
        </Card>
        <Card className="p-3 sm:p-4 bg-gradient-to-br from-warning/40 via-warning/25 to-warning/10 border border-warning/30 shadow-elegant hover:shadow-warning/50 transition-all">
          <div className="text-center">
            <h3 className="text-xl sm:text-3xl font-bold text-white">{stats.pending}</h3>
            <p className="text-xs sm:text-sm text-white/80">En attente</p>
          </div>
        </Card>
        <Card className="p-3 sm:p-4 bg-gradient-to-br from-destructive/40 via-destructive/25 to-destructive/10 border border-destructive/30 shadow-elegant hover:shadow-destructive/50 transition-all">
          <div className="text-center">
            <h3 className="text-xl sm:text-3xl font-bold text-white">{stats.failed}</h3>
            <p className="text-xs sm:text-sm text-white/80">Échecs</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-card/80 backdrop-blur-sm border-primary/10">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-primary" />
            <Input
              placeholder="Rechercher par numéro ou client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="paid">Payées</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="failed">Échec</SelectItem>
            <SelectItem value="refunded">Remboursées</SelectItem>
          </SelectContent>
        </Select>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les clients</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Période" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les dates</SelectItem>
            <SelectItem value="this_week">Cette semaine</SelectItem>
            <SelectItem value="this_month">Ce mois</SelectItem>
            <SelectItem value="last_month">Mois dernier</SelectItem>
          </SelectContent>
        </Select>
        </div>
      </Card>

      {/* Factures List */}
      {filteredFactures.length === 0 ? (
        <Card className="p-8 text-center bg-gradient-success border-0">
          <FileText className="w-16 h-16 text-white mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2 text-white">Aucune facture</h3>
          <p className="text-white">
            {searchTerm || statusFilter !== "all" || clientFilter !== "all" || dateFilter !== "all"
              ? "Aucune facture ne correspond à vos critères"
              : "Vos factures apparaîtront ici"}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredFactures.map((facture, index) => {
            const gradients = ['bg-gradient-success', 'bg-gradient-premium', 'bg-gradient-trust'];
            const gradient = gradients[index % 3];
            return (
            <Card key={facture.id} className={`p-6 hover:shadow-elegant transition-all ${facture.companyInfo ? 'bg-gradient-to-br from-amber-600/80 to-orange-700/80' : gradient} border-0`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {facture.companyInfo ? (
                    facture.companyInfo.logo_url ? (
                      <img
                        src={facture.companyInfo.logo_url}
                        alt={facture.companyInfo.company_name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white/30"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white border-2 border-white/30">
                        <Building2 className="w-6 h-6" />
                      </div>
                    )
                  ) : facture.clients?.profiles?.profile_photo_url ? (
                    <img
                      src={facture.clients.profiles.profile_photo_url}
                      alt={facture.clients.profiles.full_name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white/30"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold border-2 border-white/30">
                      {facture.clients?.profiles?.full_name?.[0] || facture.courses?.guest_name?.[0] || "?"}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-white">
                        {facture.invoice_number_generated || facture.invoice_number}
                      </h3>
                      {facture.companyInfo && (
                        <Badge className="bg-amber-500/80 text-white border-0 text-xs">
                          <Building2 className="w-3 h-3 mr-1" />
                          Entreprise
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-white/80">
                      {facture.companyInfo?.company_name || 
                       facture.clients?.profiles?.full_name || 
                       facture.courses?.guest_name || 
                       "Client"}
                    </p>
                  </div>
                </div>
                {getStatusBadge(facture.payment_status)}
              </div>

              {/* Company/Employee Info Section */}
              {facture.companyInfo && (
                <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/10 backdrop-blur-sm rounded-lg p-4 mb-4 border border-amber-400/30">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {facture.employeeName || facture.courses?.guest_name || "Collaborateur non spécifié"}
                          {(facture.isGuestEmployee || (facture.courses?.is_guest_booking && !facture.employeeName)) && (
                            <Badge variant="outline" className="ml-2 text-xs border-white/30 text-white/80">
                              Non inscrit
                            </Badge>
                          )}
                        </p>
                        {facture.employeeEmail && (
                          <p className="text-xs text-white/70">{facture.employeeEmail}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {(facture.employeePhone || facture.courses?.guest_phone) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-emerald-500/20 border-emerald-400/40 text-white hover:bg-emerald-500/40"
                          onClick={() => window.open(`tel:${facture.employeePhone || facture.courses?.guest_phone}`, '_self')}
                        >
                          <Phone className="w-3 h-3 mr-1" />
                          Appeler
                        </Button>
                      )}
                      {facture.companyInfo.contact_phone && !(facture.employeePhone || facture.courses?.guest_phone) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-blue-500/20 border-blue-400/40 text-white hover:bg-blue-500/40"
                          onClick={() => window.open(`tel:${facture.companyInfo.contact_phone}`, '_self')}
                        >
                          <Phone className="w-3 h-3 mr-1" />
                          Entreprise
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Course info */}
              <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm rounded-lg p-4 mb-4 space-y-2 text-sm border border-white/20">
                <div>
                  <span className="font-medium text-white">Course :</span>
                  <span className="text-white/80 ml-2">
                    {facture.courses.pickup_address} → {facture.courses.destination_address}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-white">Date course :</span>
                  <span className="text-white/80 ml-2">
                    {format(new Date(facture.courses.scheduled_date), "d MMMM yyyy", {
                      locale: fr,
                    })}
                  </span>
                </div>
                {facture.payment_method && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-purple-300" />
                    <span className="text-white/80">
                      Paiement : <span className="capitalize">{facture.payment_method}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Price */}
              <div className="bg-gradient-to-br from-emerald-500/40 to-green-500/20 backdrop-blur-sm border-2 border-emerald-400/50 rounded-lg p-4 mb-4 shadow-lg shadow-emerald-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-emerald-300 drop-shadow-glow" />
                    <span className="font-bold text-lg text-white drop-shadow-md">Montant TTC</span>
                  </div>
                  <span className="text-3xl font-black text-emerald-300 drop-shadow-glow">
                    {parseFloat(facture.amount).toFixed(2)} €
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="text-xs text-white">
                  Créée le {format(new Date(facture.created_at), "d MMMM yyyy", { locale: fr })}
                  {facture.paid_at && (
                    <> • Payée le {format(new Date(facture.paid_at), "d MMMM yyyy", { locale: fr })}</>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadPDF(facture, false)}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    PDF Détaillé
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadPDF(facture, true)}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    PDF Client
                  </Button>
                  
                  {/* Social Share Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Partager
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() => {
                          const message = generateFactureShareMessage(
                            facture,
                            facture.courses,
                            { company_name: driverInfo?.company_name, profiles: driverInfo?.profiles },
                            facture.clients,
                            true // isDriver
                          );
                          window.open(`sms:?body=${encodeURIComponent(message)}`, '_blank');
                        }}
                        className="gap-2 cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                        SMS
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          const message = generateFactureShareMessage(
                            facture,
                            facture.courses,
                            { company_name: driverInfo?.company_name, profiles: driverInfo?.profiles },
                            facture.clients,
                            true
                          );
                          window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                        }}
                        className="gap-2 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        WhatsApp
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          const message = generateFactureShareMessage(
                            facture,
                            facture.courses,
                            { company_name: driverInfo?.company_name, profiles: driverInfo?.profiles },
                            facture.clients,
                            true
                          );
                          window.open(`mailto:?subject=Facture ${facture.invoice_number_generated || facture.invoice_number}&body=${encodeURIComponent(message)}`, '_blank');
                        }}
                        className="gap-2 cursor-pointer"
                      >
                        <Mail className="w-4 h-4" />
                        Email
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          const message = generateFactureShareMessage(
                            facture,
                            facture.courses,
                            { company_name: driverInfo?.company_name, profiles: driverInfo?.profiles },
                            facture.clients,
                            true
                          );
                          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(message)}`, '_blank');
                        }}
                        className="gap-2 cursor-pointer"
                      >
                        <Facebook className="w-4 h-4" />
                        Facebook
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          )})}
        </div>
      )}
    </div>
  );
};

export default DriverFacturesList;
