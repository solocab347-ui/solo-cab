import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Search, Download, MapPin, Calendar, Euro, Share2, MessageSquare, Mail, Send, Facebook, Building2, Check, X, Loader2, Phone, User } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import { generateDevisShareMessage } from "@/lib/courseMessageGenerator";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface DriverDevisListProps {
  driverId: string;
}

// Unified quote type to handle both regular devis and company quotes
interface UnifiedQuote {
  id: string;
  quote_number: string | null;
  amount: number;
  status: string;
  created_at: string;
  valid_until: string;
  base_price: number;
  distance_price: number;
  time_price: number | null;
  evening_surcharge_amount: number | null;
  weekend_surcharge_amount: number | null;
  discount_amount: number;
  promo_code: string | null;
  // Course info
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  distance_km: number | null;
  duration_minutes: number | null;
  // Client info (null for company quotes)
  client_id: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_photo_url: string | null;
  // Company info (null for regular devis)
  company_id: string | null;
  company_name: string | null;
  company_logo_url: string | null;
  company_contact_email: string | null;
  company_contact_phone: string | null;
  company_siret: string | null;
  company_siren: string | null;
  company_tva_number: string | null;
  company_address: string | null;
  company_billing_address: string | null;
  // Employee/collaborator info
  employee_name: string | null;
  employee_phone: string | null;
  employee_email: string | null;
  is_guest_employee: boolean;
  is_company_quote: boolean;
  request_id: string | null;
}

const DriverDevisList = ({ driverId }: DriverDevisListProps) => {
  const queryClient = useQueryClient();
  const [devisList, setDevisList] = useState<UnifiedQuote[]>([]);
  const [filteredDevis, setFilteredDevis] = useState<UnifiedQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [clients, setClients] = useState<any[]>([]);
  const [driverInfo, setDriverInfo] = useState<any>(null);
  
  // Dialog for company quote actions
  const [selectedCompanyQuote, setSelectedCompanyQuote] = useState<UnifiedQuote | null>(null);
  const [actionType, setActionType] = useState<'accept' | 'refuse' | null>(null);

  useEffect(() => {
    fetchDevis();
    fetchDriverInfo();
  }, [driverId]);

  useEffect(() => {
    let filtered = devisList;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((devis) => devis.status === statusFilter);
    }

    // Filter by client/company
    if (clientFilter !== "all") {
      filtered = filtered.filter((devis) => 
        devis.client_id === clientFilter || devis.company_id === clientFilter
      );
    }

    // Filter by type (client/company)
    if (typeFilter !== "all") {
      filtered = filtered.filter((devis) => 
        typeFilter === "company" ? devis.is_company_quote : !devis.is_company_quote
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

      filtered = filtered.filter((devis) => {
        const devisDate = new Date(devis.created_at);
        return devisDate >= startDate && devisDate <= endDate;
      });
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (devis) =>
          devis.quote_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          devis.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          devis.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredDevis(filtered);
  }, [searchTerm, statusFilter, clientFilter, dateFilter, typeFilter, devisList]);

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

  const fetchDevis = async () => {
    try {
      // Fetch regular devis (with client)
      const { data: regularDevis, error: devisError } = await supabase
        .from("devis")
        .select(`
          *,
          courses(
            id,
            pickup_address,
            destination_address,
            scheduled_date,
            distance_km,
            duration_minutes
          ),
          clients(
            id,
            profiles:user_id(full_name, email, phone, profile_photo_url)
          )
        `)
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false });

      if (devisError) throw devisError;

      // Fetch company course quotes - include all relevant statuses
      const { data: companyQuotes, error: companyError } = await supabase
        .from("company_course_quotes")
        .select(`
          *,
          company_course_requests!inner(
            id,
            pickup_address,
            destination_address,
            scheduled_date,
            company_id,
            is_guest_employee,
            guest_employee_name,
            guest_employee_phone,
            guest_employee_email,
            employee_id,
            companies!inner(
              id,
              company_name,
              logo_url,
              contact_email,
              contact_phone,
              siret,
              siren,
              tva_number,
              address,
              billing_address
            )
          )
        `)
        .eq("driver_id", driverId)
        .in("status", ["sent", "accepted", "refused", "taken_by_other"])
        .order("created_at", { ascending: false });

      if (companyError) throw companyError;

      // Fetch company info for regular devis that have company_id or company_employee_id
      const devisWithCompany = (regularDevis || []).filter((d: any) => d.company_id || d.company_employee_id);
      const companyIds = [...new Set(devisWithCompany.map((d: any) => d.company_id).filter(Boolean))];
      const employeeIdsFromDevis = [...new Set(devisWithCompany.map((d: any) => d.company_employee_id).filter(Boolean))];
      
      let companyInfoMap = new Map();
      if (companyIds.length > 0) {
        const { data: companies } = await supabase
          .from("companies")
          .select("id, company_name, logo_url, contact_email, contact_phone, siret, siren, tva_number, address, billing_address")
          .in("id", companyIds);
        
        companies?.forEach(c => companyInfoMap.set(c.id, c));
      }

      // Fetch employee profiles using RPC function for all employee IDs
      const employeeIdsFromQuotes = (companyQuotes || [])
        .map((q: any) => q.company_course_requests?.employee_id)
        .filter(Boolean);
      
      const allEmployeeIds = [...new Set([...employeeIdsFromQuotes, ...employeeIdsFromDevis])];
      
      let employeeProfiles = new Map();
      if (allEmployeeIds.length > 0) {
        // Use RPC function to bypass RLS
        const employeePromises = allEmployeeIds.map(async (empId) => {
          const { data } = await supabase.rpc('get_employee_profile_for_course', { 
            p_employee_id: empId 
          });
          if (data && data.length > 0) {
            return { 
              id: empId, 
              full_name: data[0].full_name, 
              phone: data[0].phone 
            };
          }
          return null;
        });
        
        const employeeResults = await Promise.all(employeePromises);
        employeeResults.forEach(result => {
          if (result) {
            employeeProfiles.set(result.id, result);
          }
        });
      }

      // Transform regular devis to unified format
      const transformedRegularDevis: UnifiedQuote[] = (regularDevis || []).map((d: any) => {
        // Check if this is a company devis
        const companyInfo = d.company_id ? companyInfoMap.get(d.company_id) : null;
        const employeeInfo = d.company_employee_id ? employeeProfiles.get(d.company_employee_id) : null;
        const isCompanyDevis = !!(d.company_id || d.company_employee_id);
        
        return {
          id: d.id,
          quote_number: d.quote_number,
          amount: d.amount,
          status: d.status,
          created_at: d.created_at,
          valid_until: d.valid_until,
          base_price: d.base_price,
          distance_price: d.distance_price,
          time_price: d.time_price,
          evening_surcharge_amount: d.evening_surcharge_amount,
          weekend_surcharge_amount: d.weekend_surcharge_amount,
          discount_amount: d.discount_amount,
          promo_code: d.promo_code,
          pickup_address: d.courses?.pickup_address || "",
          destination_address: d.courses?.destination_address || "",
          scheduled_date: d.courses?.scheduled_date || d.created_at,
          distance_km: d.courses?.distance_km,
          duration_minutes: d.courses?.duration_minutes,
          client_id: isCompanyDevis ? null : d.clients?.id,
          client_name: isCompanyDevis ? null : d.clients?.profiles?.full_name,
          client_email: isCompanyDevis ? null : d.clients?.profiles?.email,
          client_phone: isCompanyDevis ? null : d.clients?.profiles?.phone,
          client_photo_url: isCompanyDevis ? null : d.clients?.profiles?.profile_photo_url,
          company_id: d.company_id || (employeeInfo ? d.company_employee_id : null),
          company_name: companyInfo?.company_name || null,
          company_logo_url: companyInfo?.logo_url || null,
          company_contact_email: companyInfo?.contact_email || null,
          company_contact_phone: companyInfo?.contact_phone || null,
          company_siret: companyInfo?.siret || null,
          company_siren: companyInfo?.siren || null,
          company_tva_number: companyInfo?.tva_number || null,
          company_address: companyInfo?.address || null,
          company_billing_address: companyInfo?.billing_address || null,
          employee_name: employeeInfo?.full_name || null,
          employee_phone: employeeInfo?.phone || null,
          employee_email: null,
          is_guest_employee: false,
          is_company_quote: isCompanyDevis,
          request_id: null,
        };
      });

      // Transform company quotes to unified format - map statuses correctly
      const transformedCompanyQuotes: UnifiedQuote[] = (companyQuotes || []).map((q: any) => {
        // Map company quote status to unified status
        let mappedStatus = "pending";
        if (q.status === "sent") mappedStatus = "pending";
        else if (q.status === "accepted") mappedStatus = "accepted";
        else if (q.status === "refused") mappedStatus = "refused";
        else if (q.status === "taken_by_other") mappedStatus = "expired"; // Map to expired for display
        
        // Get employee info - either guest or registered (using fetched profiles)
        const req = q.company_course_requests;
        const isGuest = req.is_guest_employee || false;
        const empProfile = req.employee_id ? employeeProfiles.get(req.employee_id) : null;
        const employeeName = isGuest 
          ? req.guest_employee_name 
          : empProfile?.full_name || null;
        const employeePhone = isGuest 
          ? req.guest_employee_phone 
          : empProfile?.phone || null;
        const employeeEmail = isGuest 
          ? req.guest_employee_email 
          : empProfile?.email || null;
        
        return {
          id: q.id,
          quote_number: `ENT-${q.id.slice(0, 8).toUpperCase()}`,
          amount: q.total_price,
          status: mappedStatus,
          created_at: q.created_at,
          valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days validity
          base_price: q.base_price,
          distance_price: q.distance_price,
          time_price: q.time_price,
          evening_surcharge_amount: q.evening_surcharge,
          weekend_surcharge_amount: q.weekend_surcharge,
          discount_amount: 0,
          promo_code: null,
          pickup_address: req.pickup_address,
          destination_address: req.destination_address,
          scheduled_date: req.scheduled_date,
          distance_km: q.distance_km,
          duration_minutes: q.duration_minutes,
          client_id: null,
          client_name: null,
          client_email: null,
          client_phone: null,
          client_photo_url: null,
          company_id: req.company_id,
          company_name: req.companies.company_name,
          company_logo_url: req.companies.logo_url,
          company_contact_email: req.companies.contact_email,
          company_contact_phone: req.companies.contact_phone,
          company_siret: req.companies.siret || null,
          company_siren: req.companies.siren || null,
          company_tva_number: req.companies.tva_number || null,
          company_address: req.companies.address || null,
          company_billing_address: req.companies.billing_address || null,
          employee_name: employeeName || null,
          employee_phone: employeePhone || null,
          employee_email: employeeEmail || null,
          is_guest_employee: isGuest,
          is_company_quote: true,
          request_id: q.request_id,
        };
      });

      // Combine and sort by date
      const allQuotes = [...transformedRegularDevis, ...transformedCompanyQuotes].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setDevisList(allQuotes);
      setFilteredDevis(allQuotes);

      // Extract unique clients/companies for filter
      const uniqueEntities = new Map();
      allQuotes.forEach((d) => {
        if (d.client_id && d.client_name) {
          uniqueEntities.set(d.client_id, { id: d.client_id, name: d.client_name, type: 'client' });
        }
        if (d.company_id && d.company_name) {
          uniqueEntities.set(d.company_id, { id: d.company_id, name: `🏢 ${d.company_name}`, type: 'company' });
        }
      });
      setClients(Array.from(uniqueEntities.values()));
    } catch (error: any) {
      console.error("Error fetching devis:", error);
      toast.error("Erreur lors du chargement des devis");
    } finally {
      setLoading(false);
    }
  };

  // Mutation for accepting/refusing company quotes
  const respondToQuoteMutation = useMutation({
    mutationFn: async ({ quoteId, accept }: { quoteId: string; accept: boolean }) => {
      const { data, error } = await supabase.functions.invoke('accept-company-course-quote', {
        body: { quote_id: quoteId, accept }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, variables) => {
      if (variables.accept) {
        if (data?.status === 'already_taken') {
          toast.info("Cette course a déjà été attribuée à un autre chauffeur");
        } else {
          toast.success("Devis accepté ! La course a été ajoutée à votre planning");
        }
      } else {
        toast.success("Devis refusé");
      }
      queryClient.invalidateQueries({ queryKey: ['driver-courses'] });
      fetchDevis();
      setSelectedCompanyQuote(null);
      setActionType(null);
    },
    onError: (error: any) => {
      console.error("Error responding to quote:", error);
      toast.error(error.message || "Erreur lors de la réponse au devis");
    }
  });

  const handleCompanyQuoteAction = (quote: UnifiedQuote, action: 'accept' | 'refuse') => {
    setSelectedCompanyQuote(quote);
    setActionType(action);
  };

  const confirmCompanyQuoteAction = () => {
    if (!selectedCompanyQuote) return;
    respondToQuoteMutation.mutate({
      quoteId: selectedCompanyQuote.id,
      accept: actionType === 'accept'
    });
  };

  const handleDownloadPDF = async (devis: UnifiedQuote, forClient: boolean = false) => {
    if (!driverInfo) {
      toast.error("Informations chauffeur manquantes");
      return;
    }

    const jsPDF = (await import("jspdf")).default;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header with blue background
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.text("DEVIS", pageWidth / 2, 25, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`Référence: ${devis.quote_number}`, pageWidth / 2, 35, { align: "center" });
    doc.text(`Date: ${format(new Date(devis.created_at), "dd/MM/yyyy", { locale: fr })}`, pageWidth / 2, 42, { align: "center" });

    // Driver info (left side)
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("CHAUFFEUR VTC", 20, 65);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    const driverName = driverInfo.profiles?.full_name || driverInfo.company_name || "N/A";
    doc.text(driverName, 20, 71);
    if (driverInfo.company_name && driverInfo.company_name !== driverName) {
      doc.text(driverInfo.company_name, 20, 76);
    }
    let infoY = 81;
    if (driverInfo.siret) {
      doc.text(`SIRET: ${driverInfo.siret}`, 20, infoY);
      infoY += 5;
    } else if (driverInfo.siren) {
      doc.text(`SIREN: ${driverInfo.siren}`, 20, infoY);
      infoY += 5;
    }
    if (driverInfo.tva_number) {
      doc.text(`TVA: ${driverInfo.tva_number}`, 20, infoY);
      infoY += 5;
    }
    doc.text(`Tél: ${driverInfo.profiles?.phone || 'N/A'}`, 20, infoY);
    
    if (driverInfo.company_address) {
      const addressLines = doc.splitTextToSize(driverInfo.company_address, 75);
      doc.text(addressLines, 20, infoY + 5);
    }

    // Client/Company info (right side)
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    
    const isCompanyQuote = devis.is_company_quote && devis.company_name;
    
    if (isCompanyQuote) {
      // Display company information
      doc.text("ENTREPRISE", pageWidth - 20, 65, { align: 'right' });
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      
      doc.text(devis.company_name || "N/A", pageWidth - 20, 71, { align: 'right' });
      
      let companyInfoY = 76;
      
      if (devis.company_siret) {
        doc.text(`SIRET: ${devis.company_siret}`, pageWidth - 20, companyInfoY, { align: 'right' });
        companyInfoY += 5;
      } else if (devis.company_siren) {
        doc.text(`SIREN: ${devis.company_siren}`, pageWidth - 20, companyInfoY, { align: 'right' });
        companyInfoY += 5;
      }
      
      if (devis.company_tva_number) {
        doc.text(`TVA: ${devis.company_tva_number}`, pageWidth - 20, companyInfoY, { align: 'right' });
        companyInfoY += 5;
      }
      
      const companyAddress = devis.company_billing_address || devis.company_address;
      if (companyAddress) {
        const addressLines = doc.splitTextToSize(companyAddress, 75);
        addressLines.forEach((line: string, index: number) => {
          doc.text(line, pageWidth - 20, companyInfoY + (index * 4), { align: 'right' });
        });
        companyInfoY += addressLines.length * 4;
      }
      
      if (devis.company_contact_email) {
        doc.text(devis.company_contact_email, pageWidth - 20, companyInfoY, { align: 'right' });
        companyInfoY += 5;
      }
      
      if (devis.company_contact_phone) {
        doc.text(`Tél: ${devis.company_contact_phone}`, pageWidth - 20, companyInfoY, { align: 'right' });
        companyInfoY += 5;
      }
      
      // Display collaborator info
      if (devis.employee_name) {
        companyInfoY += 2;
        doc.setFont(undefined, 'bold');
        doc.text("COLLABORATEUR", pageWidth - 20, companyInfoY, { align: 'right' });
        doc.setFont(undefined, 'normal');
        companyInfoY += 5;
        doc.text(devis.employee_name, pageWidth - 20, companyInfoY, { align: 'right' });
        if (devis.employee_phone) {
          companyInfoY += 4;
          doc.text(`Tél: ${devis.employee_phone}`, pageWidth - 20, companyInfoY, { align: 'right' });
        }
      }
    } else {
      // Regular client
      doc.text("CLIENT", pageWidth - 20, 65, { align: 'right' });
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      
      const clientName = devis.client_name || "N/A";
      doc.text(clientName, pageWidth - 20, 71, { align: 'right' });
      
      if (devis.client_email) {
        doc.text(devis.client_email, pageWidth - 20, 76, { align: 'right' });
      }
      
      if (devis.client_phone) {
        doc.text(`Tél: ${devis.client_phone}`, pageWidth - 20, 81, { align: 'right' });
      }
    }

    // Service details box
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, 110, 170, 55);
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("DÉTAILS DE LA PRESTATION", 25, 118);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    const pickupLines = doc.splitTextToSize(devis.pickup_address, 140);
    const destLines = doc.splitTextToSize(devis.destination_address, 140);
    
    doc.text("Départ:", 25, 126);
    doc.text(pickupLines, 50, 126);
    
    let currentY = 126 + (pickupLines.length * 5);
    doc.text("Arrivée:", 25, currentY);
    doc.text(destLines, 50, currentY);
    
    currentY += (destLines.length * 5);
    doc.text(`Date: ${format(new Date(devis.scheduled_date), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`, 25, currentY);
    doc.text(`Distance: ${devis.distance_km || 0} km`, 105, currentY + 5);

    // Pricing table
    let yPos = 180;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("TARIFICATION", 20, yPos);
    yPos += 8;

    const subtotal = (devis.base_price || 0) + (devis.distance_price || 0) + (devis.time_price || 0);
    const tvaRate = devis.time_price > 0 ? 20 : 10;
    const tvaAmount = subtotal * (tvaRate / 100);
    
    // Déterminer le type de course
    const isMiseADisposition = devis.time_price > 0 && devis.distance_price === 0;

    if (!forClient) {
      // Driver version - detailed breakdown
      doc.setFillColor(41, 128, 185);
      doc.rect(20, yPos, 170, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text("Description", 25, yPos + 5.5);
      doc.text("Montant HT", 175, yPos + 5.5, { align: 'right' });
      
      yPos += 8;
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      
      if (isMiseADisposition) {
        // Mise à disposition - afficher durée et tarif horaire
        const hours = (devis.duration_minutes || 60) / 60;
        const hourlyRate = (devis.time_price || 0) / hours;
        
        doc.setFillColor(245, 245, 245);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.text(`Mise à disposition (${hours}h à ${hourlyRate.toFixed(2)}€/h)`, 25, yPos + 5);
        doc.text(`${(devis.time_price || 0).toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        
        yPos += 9;
      } else {
        // Course classique - afficher base + distance
        doc.setFillColor(245, 245, 245);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.text("Forfait de base", 25, yPos + 5);
        doc.text(`${devis.base_price.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        
        yPos += 7;
        // Calculer le prix/km pour afficher le détail
        const distanceKm = devis.distance_km || 0;
        const perKmRate = distanceKm > 0 ? (devis.distance_price / distanceKm) : 0;
        const priceLabel = distanceKm > 0 && perKmRate > 0 
          ? `Prix au kilomètre (${distanceKm.toFixed(2)} km × ${perKmRate.toFixed(2)} €/km)`
          : "Prix au kilomètre";
        doc.text(priceLabel, 25, yPos + 5);
        doc.text(`${devis.distance_price.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        
        yPos += 9;
      }
      
      // Afficher les augmentations soir/weekend si présentes (version chauffeur uniquement)
      if (devis.evening_surcharge_amount && devis.evening_surcharge_amount > 0) {
        doc.setFillColor(255, 245, 220); // Couleur légèrement ambrée
        doc.rect(20, yPos, 170, 7, 'F');
        doc.setTextColor(204, 102, 0); // Orange pour l'augmentation
        doc.text("Augmentation Soir", 25, yPos + 5);
        doc.text(`+${devis.evening_surcharge_amount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        yPos += 7;
        doc.setTextColor(0, 0, 0);
      }
      
      if (devis.weekend_surcharge_amount && devis.weekend_surcharge_amount > 0) {
        doc.setFillColor(255, 245, 220); // Couleur légèrement ambrée
        doc.rect(20, yPos, 170, 7, 'F');
        doc.setTextColor(204, 102, 0); // Orange pour l'augmentation
        doc.text("Augmentation Weekend", 25, yPos + 5);
        doc.text(`+${devis.weekend_surcharge_amount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        yPos += 7;
        doc.setTextColor(0, 0, 0);
      }
      
      doc.setFillColor(240, 240, 240);
      doc.rect(20, yPos, 170, 7, 'F');
      doc.setFont(undefined, 'bold');
      doc.text("Sous-total HT", 25, yPos + 5);
      doc.text(`${subtotal.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      
      yPos += 7;
      
      // Afficher la réduction si code promo appliqué
      if (devis.promo_code && devis.discount_amount > 0) {
        doc.setFont(undefined, 'normal');
        doc.setTextColor(46, 125, 50); // Vert pour la réduction
        doc.text(`Réduction (${devis.promo_code})`, 25, yPos + 5);
        doc.text(`-${devis.discount_amount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        yPos += 7;
        doc.setTextColor(0, 0, 0);
      }
      
      doc.setFont(undefined, 'normal');
      doc.text(`TVA (${tvaRate}%)`, 25, yPos + 5);
      doc.text(`${tvaAmount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      
      yPos += 9;
      doc.setFillColor(41, 128, 185);
      doc.rect(20, yPos, 170, 9, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.text("TOTAL TTC", 25, yPos + 6);
      doc.text(`${devis.amount.toFixed(2)} €`, 175, yPos + 6, { align: 'right' });
      
      yPos += 15;
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont(undefined, 'italic');
      const noteLines = doc.splitTextToSize("Note: Le client reçoit une version simplifiée sans le détail des tarifs.", 170);
      doc.text(noteLines, 20, yPos);
    } else {
      // Client version - simplified
      doc.setFillColor(41, 128, 185);
      doc.rect(20, yPos, 170, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text("Description", 25, yPos + 5.5);
      doc.text("Montant", 175, yPos + 5.5, { align: 'right' });
      
      yPos += 8;
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      doc.setFillColor(245, 245, 245);
      doc.rect(20, yPos, 170, 7, 'F');
      doc.text("Sous-total HT", 25, yPos + 5);
      doc.text(`${subtotal.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      
      yPos += 7;
      
      // Afficher la réduction si code promo appliqué
      if (devis.promo_code && devis.discount_amount > 0) {
        doc.setTextColor(46, 125, 50); // Vert pour la réduction
        doc.text(`Réduction (${devis.promo_code})`, 25, yPos + 5);
        doc.text(`-${devis.discount_amount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        yPos += 7;
        doc.setTextColor(0, 0, 0);
      }
      
      doc.text(`TVA (${tvaRate}%)`, 25, yPos + 5);
      doc.text(`${tvaAmount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      
      yPos += 9;
      doc.setFillColor(41, 128, 185);
      doc.rect(20, yPos, 170, 9, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.text("TOTAL TTC", 25, yPos + 6);
      doc.text(`${devis.amount.toFixed(2)} €`, 175, yPos + 6, { align: 'right' });
    }

    // Validity
    yPos += 15;
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont(undefined, 'italic');
    doc.text(`Devis valable jusqu'au ${format(new Date(devis.valid_until), "dd/MM/yyyy", { locale: fr })}`, 20, yPos);

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFillColor(240, 240, 240);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text("Merci de votre confiance", pageWidth / 2, pageHeight - 8, { align: "center" });

    doc.save(`devis-${devis.quote_number}${forClient ? '-client' : ''}.pdf`);
    toast.success("Devis téléchargé");
  };

  const getStatusBadge = (status: string, validUntil: string) => {
    const isExpired = new Date(validUntil) < new Date();

    if (isExpired && status === "pending") {
      return (
        <Badge className="bg-destructive/90 text-white border-0 shadow-md">
          Expiré
        </Badge>
      );
    }

    const styles = {
      pending: "bg-gradient-trust text-white border-0 shadow-md",
      accepted: "bg-gradient-success text-white border-0 shadow-md",
      rejected: "bg-destructive/90 text-white border-0 shadow-md",
      expired: "bg-muted/90 text-white border-0 shadow-md",
    };

    const labels = {
      pending: "En attente",
      accepted: "Accepté",
      rejected: "Refusé",
      expired: "Expiré",
    };

    return (
      <Badge className={styles[status as keyof typeof styles]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Chargement des devis...</p>
      </div>
    );
  }

  const stats = {
    total: devisList.length,
    pending: devisList.filter((d) => d.status === "pending").length,
    accepted: devisList.filter((d) => d.status === "accepted").length,
    rejected: devisList.filter((d) => d.status === "rejected").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats - Horizontal on all screens */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <Card className="p-3 sm:p-4 bg-gradient-to-br from-primary/40 via-primary/25 to-primary/10 border border-primary/30 shadow-elegant hover:shadow-primary/50 transition-all">
          <div className="text-center">
            <h3 className="text-xl sm:text-3xl font-bold text-white">{stats.total}</h3>
            <p className="text-xs sm:text-sm text-white/80">Devis totaux</p>
          </div>
        </Card>
        <Card className="p-3 sm:p-4 bg-gradient-to-br from-trust/40 via-trust/25 to-trust/10 border border-trust/30 shadow-elegant hover:shadow-trust/50 transition-all">
          <div className="text-center">
            <h3 className="text-xl sm:text-3xl font-bold text-white">{stats.pending}</h3>
            <p className="text-xs sm:text-sm text-white/80">En attente</p>
          </div>
        </Card>
        <Card className="p-3 sm:p-4 bg-gradient-to-br from-success/40 via-success/25 to-success/10 border border-success/30 shadow-elegant hover:shadow-success/50 transition-all">
          <div className="text-center">
            <h3 className="text-xl sm:text-3xl font-bold text-white">{stats.accepted}</h3>
            <p className="text-xs sm:text-sm text-white/80">Acceptés</p>
          </div>
        </Card>
        <Card className="p-3 sm:p-4 bg-gradient-to-br from-independence/40 via-independence/25 to-independence/10 border border-independence/30 shadow-elegant hover:shadow-independence/50 transition-all">
          <div className="text-center">
            <h3 className="text-xl sm:text-3xl font-bold text-white">{stats.rejected}</h3>
            <p className="text-xs sm:text-sm text-white/80">Refusés</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-card/80 backdrop-blur-sm border-primary/10">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-primary" />
            <Input
              placeholder="Rechercher par numéro, client ou entreprise..."
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
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="accepted">Acceptés</SelectItem>
            <SelectItem value="rejected">Refusés</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="client">Clients</SelectItem>
            <SelectItem value="company">Entreprises</SelectItem>
          </SelectContent>
        </Select>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Client/Entreprise" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
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

      {/* Devis List */}
      {filteredDevis.length === 0 ? (
        <Card className="p-8 text-center bg-gradient-trust border-0">
          <FileText className="w-16 h-16 text-white mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2 text-white">Aucun devis</h3>
          <p className="text-white">
            {searchTerm || statusFilter !== "all" || clientFilter !== "all" || dateFilter !== "all" || typeFilter !== "all"
              ? "Aucun devis ne correspond à vos critères"
              : "Vos devis apparaîtront ici"}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDevis.map((devis, index) => {
            const gradients = ['bg-gradient-success', 'bg-gradient-premium', 'bg-gradient-trust'];
            const gradient = devis.is_company_quote ? 'bg-gradient-to-br from-amber-600/80 to-orange-700/80' : gradients[index % 3];
            return (
            <Card key={devis.id} className={`p-6 hover:shadow-elegant transition-all ${gradient} border-0`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {devis.is_company_quote ? (
                    devis.company_logo_url ? (
                      <img
                        src={devis.company_logo_url}
                        alt={devis.company_name || "Entreprise"}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white/30"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white border-2 border-white/30">
                        <Building2 className="w-6 h-6" />
                      </div>
                    )
                  ) : devis.client_photo_url ? (
                    <img
                      src={devis.client_photo_url}
                      alt={devis.client_name || "Client"}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white/30"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold border-2 border-white/30">
                      {devis.client_name?.[0] || "?"}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-white">{devis.quote_number}</h3>
                      {devis.is_company_quote && (
                        <Badge className="bg-amber-500/80 text-white border-0 text-xs">
                          <Building2 className="w-3 h-3 mr-1" />
                          Entreprise
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-white/80">
                      {devis.is_company_quote ? devis.company_name : devis.client_name}
                    </p>
                  </div>
                </div>
                {getStatusBadge(devis.status, devis.valid_until)}
              </div>

              {/* Company/Employee Info Section */}
              {devis.is_company_quote && (
                <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/10 backdrop-blur-sm rounded-lg p-4 mb-4 border border-amber-400/30">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {devis.employee_name || "Collaborateur non spécifié"}
                          {devis.is_guest_employee && (
                            <Badge variant="outline" className="ml-2 text-xs border-white/30 text-white/80">
                              Non inscrit
                            </Badge>
                          )}
                        </p>
                        {devis.employee_email && (
                          <p className="text-xs text-white/70">{devis.employee_email}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {devis.employee_phone && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-emerald-500/20 border-emerald-400/40 text-white hover:bg-emerald-500/40"
                          onClick={() => window.open(`tel:${devis.employee_phone}`, '_self')}
                        >
                          <Phone className="w-3 h-3 mr-1" />
                          Appeler
                        </Button>
                      )}
                      {devis.company_contact_phone && !devis.employee_phone && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-blue-500/20 border-blue-400/40 text-white hover:bg-blue-500/40"
                          onClick={() => window.open(`tel:${devis.company_contact_phone}`, '_self')}
                        >
                          <Phone className="w-3 h-3 mr-1" />
                          Entreprise
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {/* Course Details */}
              <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm rounded-lg p-4 mb-4 space-y-2 border border-white/20">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-cyan-300 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-white">Départ</p>
                    <p className="text-white/80">{devis.pickup_address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-pink-300 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-white">Arrivée</p>
                    <p className="text-white/80">{devis.destination_address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <Calendar className="w-4 h-4 text-purple-300" />
                  {format(new Date(devis.scheduled_date), "d MMMM yyyy 'à' HH:mm", {
                    locale: fr,
                  })}
                </div>
              </div>

              {/* Price - Version détaillée pour le chauffeur */}
              <div className="bg-gradient-to-br from-emerald-500/40 to-green-500/20 backdrop-blur-sm border-2 border-emerald-400/50 rounded-lg p-4 mb-4 shadow-lg shadow-emerald-500/20">
                <div className="space-y-2 text-sm">
                  {/* Détails de la tarification */}
                  <div className="flex justify-between text-white/80">
                    <span>Forfait de base</span>
                    <span>{devis.base_price.toFixed(2)} €</span>
                  </div>
                  {devis.distance_price > 0 && (
                    <div className="flex justify-between text-white/80">
                      <span>Distance ({devis.distance_km} km)</span>
                      <span>{devis.distance_price.toFixed(2)} €</span>
                    </div>
                  )}
                  {(devis.time_price || 0) > 0 && (
                    <div className="flex justify-between text-white/80">
                      <span>Mise à disposition ({Math.round((devis.duration_minutes || 0) / 60)}h)</span>
                      <span>{(devis.time_price || 0).toFixed(2)} €</span>
                    </div>
                  )}
                  {(devis.evening_surcharge_amount || 0) > 0 && (
                    <div className="flex justify-between text-amber-300">
                      <span>🌙 Augmentation Soir</span>
                      <span>+{(devis.evening_surcharge_amount || 0).toFixed(2)} €</span>
                    </div>
                  )}
                  {(devis.weekend_surcharge_amount || 0) > 0 && (
                    <div className="flex justify-between text-amber-300">
                      <span>📅 Augmentation Weekend</span>
                      <span>+{(devis.weekend_surcharge_amount || 0).toFixed(2)} €</span>
                    </div>
                  )}
                  {devis.promo_code && devis.discount_amount > 0 && (
                    <div className="flex justify-between text-green-300">
                      <span>🎁 Réduction ({devis.promo_code})</span>
                      <span>-{devis.discount_amount.toFixed(2)} €</span>
                    </div>
                  )}
                  {/* Total TTC */}
                  <div className="pt-2 border-t border-white/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Euro className="w-6 h-6 text-emerald-300 drop-shadow-glow" />
                      <span className="font-bold text-lg text-white drop-shadow-md">Total TTC</span>
                    </div>
                    <span className="text-3xl font-black text-emerald-300 drop-shadow-glow">
                      {devis.amount.toFixed(2)} €
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="text-xs text-white">
                  Créé le {format(new Date(devis.created_at), "d MMMM yyyy", { locale: fr })}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {/* Company quote actions */}
                  {devis.is_company_quote && devis.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleCompanyQuoteAction(devis, 'accept')}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Accepter
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCompanyQuoteAction(devis, 'refuse')}
                        className="bg-white/20 hover:bg-red-500/20 text-white border-white/30"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Refuser
                      </Button>
                    </>
                  )}
                  
                  {/* Regular devis actions */}
                  {!devis.is_company_quote && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadPDF(devis, false)}
                        className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        PDF Détaillé
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadPDF(devis, true)}
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
                              const shareMessage = `Devis ${devis.quote_number} - ${devis.amount.toFixed(2)}€ TTC - ${devis.client_name || 'Client'}`;
                              window.open(`sms:?body=${encodeURIComponent(shareMessage)}`, '_blank');
                            }}
                            className="gap-2 cursor-pointer"
                          >
                            <MessageSquare className="w-4 h-4" />
                            SMS
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              const shareMessage = `Devis ${devis.quote_number} - ${devis.amount.toFixed(2)}€ TTC - ${devis.client_name || 'Client'}`;
                              window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank');
                            }}
                            className="gap-2 cursor-pointer"
                          >
                            <Send className="w-4 h-4" />
                            WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              const shareMessage = `Devis ${devis.quote_number} - ${devis.amount.toFixed(2)}€ TTC - ${devis.client_name || 'Client'}`;
                              window.open(`mailto:?subject=Devis ${devis.quote_number}&body=${encodeURIComponent(shareMessage)}`, '_blank');
                            }}
                            className="gap-2 cursor-pointer"
                          >
                            <Mail className="w-4 h-4" />
                            Email
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              const shareMessage = `Devis ${devis.quote_number} - ${devis.amount.toFixed(2)}€ TTC - ${devis.client_name || 'Client'}`;
                              window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(shareMessage)}`, '_blank');
                            }}
                            className="gap-2 cursor-pointer"
                          >
                            <Facebook className="w-4 h-4" />
                            Facebook
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              </div>
            </Card>
          )})}
        </div>
      )}

      {/* Company Quote Action Dialog */}
      <Dialog open={!!selectedCompanyQuote && !!actionType} onOpenChange={() => { setSelectedCompanyQuote(null); setActionType(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'accept' ? 'Accepter ce devis entreprise ?' : 'Refuser ce devis entreprise ?'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'accept' 
                ? "En acceptant, cette course sera ajoutée à votre planning. L'entreprise sera notifiée."
                : "En refusant, vous ne pourrez plus accepter cette course. L'entreprise sera notifiée."
              }
            </DialogDescription>
          </DialogHeader>
          
          {selectedCompanyQuote && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-amber-500" />
                <span className="font-medium">{selectedCompanyQuote.company_name}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                <p><strong>Départ:</strong> {selectedCompanyQuote.pickup_address}</p>
                <p><strong>Arrivée:</strong> {selectedCompanyQuote.destination_address}</p>
                <p><strong>Date:</strong> {format(new Date(selectedCompanyQuote.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}</p>
                <p><strong>Montant:</strong> {selectedCompanyQuote.amount.toFixed(2)} €</p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedCompanyQuote(null); setActionType(null); }}>
              Annuler
            </Button>
            <Button 
              onClick={confirmCompanyQuoteAction}
              disabled={respondToQuoteMutation.isPending}
              variant={actionType === 'accept' ? 'default' : 'destructive'}
            >
              {respondToQuoteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {actionType === 'accept' ? 'Accepter' : 'Refuser'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverDevisList;
