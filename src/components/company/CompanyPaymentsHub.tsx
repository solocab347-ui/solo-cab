import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Calendar, 
  CreditCard, 
  Euro, 
  FileText, 
  Loader2, 
  Download,
  Clock,
  CheckCircle,
  AlertCircle,
  Car,
  CalendarDays,
  Send,
  Check,
  Upload,
  Paperclip,
  ChevronDown,
  ChevronUp,
  MapPin,
  History,
  Eye,
  Filter,
  Search
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import { toast } from "sonner";

interface CompanyPaymentsHubProps {
  companyId: string;
}

interface GroupedPayment {
  driverId: string;
  driverName: string;
  driverCompany: string;
  driverPhoto: string | null;
  driverPhone?: string | null;
  agreementId: string;
  paymentFrequency: string;
  paymentMethods: string[];
  paymentDay: number | null;
  totalAmount: number;
  invoiceCount: number;
  invoices: any[];
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  status: 'upcoming' | 'due' | 'overdue' | 'sent' | 'received';
  paymentId?: string;
  sentAt?: Date;
  paymentReference?: string;
  documentsCount?: number;
}

interface CourseDetails {
  id: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  distance_km: number | null;
  duration_minutes: number | null;
  amount: number;
  invoice_number: string;
  driver_id: string;
  driverName: string;
  driverPhoto: string | null;
  driverCompany: string;
}

export function CompanyPaymentsHub({ companyId }: CompanyPaymentsHubProps) {
  const [activeTab, setActiveTab] = useState("pending");
  const [showSendPaymentDialog, setShowSendPaymentDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<GroupedPayment | null>(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [expandedPayments, setExpandedPayments] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDriverFilter, setSelectedDriverFilter] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch agreements with payment settings
  const { data: agreements, isLoading: loadingAgreements } = useQuery({
    queryKey: ["company-agreements-for-payments", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_driver_agreements")
        .select(`
          id,
          driver_id,
          payment_frequency,
          payment_methods,
          payment_day,
          next_payment_due,
          total_billed,
          total_paid,
          outstanding_balance,
          driver:drivers(
            id,
            company_name,
            user_id,
            phone
          )
        `)
        .eq("company_id", companyId)
        .eq("status", "accepted");

      if (error) throw error;

      const userIds = data?.map((a: any) => a.driver?.user_id).filter(Boolean) || [];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, profile_photo_url")
          .in("id", userIds);

        return data?.map((agreement: any) => ({
          ...agreement,
          driverProfile: profiles?.find((p: any) => p.id === agreement.driver?.user_id),
        }));
      }

      return data;
    },
  });

  // Fetch ALL invoices for this company (paid and unpaid)
  const { data: allCompanyInvoices, isLoading: loadingInvoices } = useQuery({
    queryKey: ["company-all-invoices", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("factures")
        .select(`
          id,
          invoice_number,
          invoice_number_generated,
          amount,
          payment_status,
          created_at,
          driver_id,
          course_id,
          courses(
            id,
            pickup_address,
            destination_address,
            scheduled_date,
            distance_km,
            duration_minutes
          )
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch existing company payments
  const { data: companyPayments, isLoading: loadingPayments } = useQuery({
    queryKey: ["company-payments-tracking", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_payments")
        .select(`
          *,
          company_payment_documents(id, document_url, file_name, document_type)
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Get driver names for invoices
  const driverIds = useMemo(() => {
    const ids = new Set<string>();
    agreements?.forEach((a: any) => ids.add(a.driver_id));
    return Array.from(ids);
  }, [agreements]);

  const driverMap = useMemo(() => {
    const map: Record<string, { name: string; photo: string | null; company: string }> = {};
    agreements?.forEach((a: any) => {
      map[a.driver_id] = {
        name: a.driverProfile?.full_name || "Chauffeur",
        photo: a.driverProfile?.profile_photo_url,
        company: a.driver?.company_name || ""
      };
    });
    return map;
  }, [agreements]);

  // Build course details with driver info for history
  const courseDetails = useMemo<CourseDetails[]>(() => {
    if (!allCompanyInvoices) return [];
    
    return allCompanyInvoices.map((invoice: any) => ({
      id: invoice.id,
      pickup_address: invoice.courses?.pickup_address || "",
      destination_address: invoice.courses?.destination_address || "",
      scheduled_date: invoice.courses?.scheduled_date || invoice.created_at,
      distance_km: invoice.courses?.distance_km,
      duration_minutes: invoice.courses?.duration_minutes,
      amount: invoice.amount,
      invoice_number: invoice.invoice_number_generated || invoice.invoice_number || "N/A",
      driver_id: invoice.driver_id,
      driverName: driverMap[invoice.driver_id]?.name || "Chauffeur",
      driverPhoto: driverMap[invoice.driver_id]?.photo || null,
      driverCompany: driverMap[invoice.driver_id]?.company || ""
    }));
  }, [allCompanyInvoices, driverMap]);

  // Mark payment as sent mutation
  const markPaymentSentMutation = useMutation({
    mutationFn: async ({ payment, reference, document }: { payment: GroupedPayment; reference: string; document?: File }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      const { data, error } = await supabase
        .from("company_payments")
        .insert({
          company_id: companyId,
          driver_id: payment.driverId,
          agreement_id: payment.agreementId,
          amount: payment.totalAmount,
          payment_method: payment.paymentMethods[0] || "virement",
          status: "sent",
          sent_at: new Date().toISOString(),
          sent_by_user_id: userId,
          payment_reference: reference,
          period_start: payment.periodStart.toISOString(),
          period_end: payment.periodEnd.toISOString(),
          course_ids: payment.invoices.map((i: any) => i.course_id),
          courses_count: payment.invoiceCount
        })
        .select()
        .single();

      if (error) throw error;

      if (document && data) {
        const fileExt = document.name.split('.').pop();
        const fileName = `${data.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('payment-documents')
          .upload(fileName, document);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('payment-documents')
            .getPublicUrl(fileName);

          await supabase
            .from('company_payment_documents')
            .insert({
              payment_id: data.id,
              document_url: urlData.publicUrl,
              document_type: 'proof_of_payment',
              file_name: document.name,
              uploaded_by_user_id: userId,
            });
        }
      }

      // Create notification for driver
      const { data: driverData } = await supabase
        .from("drivers")
        .select("user_id")
        .eq("id", payment.driverId)
        .single();

      if (driverData?.user_id) {
        await supabase.from("notifications").insert({
          user_id: driverData.user_id,
          title: "💸 Paiement envoyé",
          message: `Un paiement de ${payment.totalAmount.toFixed(2)}€ a été envoyé. Référence: ${reference || "N/A"}`,
          type: "payment",
          link: "/driver-dashboard?tab=company-payments"
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-payments-tracking"] });
      queryClient.invalidateQueries({ queryKey: ["company-unpaid-invoices"] });
      toast.success("Paiement marqué comme envoyé");
      setShowSendPaymentDialog(false);
      setSelectedPayment(null);
      setPaymentReference("");
      setDocumentFile(null);
    },
    onError: (error) => {
      console.error("Error marking payment as sent:", error);
      toast.error("Erreur lors de l'envoi du paiement");
    }
  });

  // Build payment groups from company_payments + outstanding balances from agreements
  const groupedPayments = useMemo(() => {
    if (!agreements) return [];

    const today = new Date();
    const groups: GroupedPayment[] = [];

    // Create a map of existing payments by driver
    const paymentsByDriver = (companyPayments || []).reduce((acc: Record<string, any[]>, payment: any) => {
      if (!acc[payment.driver_id]) {
        acc[payment.driver_id] = [];
      }
      acc[payment.driver_id].push(payment);
      return acc;
    }, {});

    // Get invoices by driver for building payment details
    const invoicesByDriver = (allCompanyInvoices || []).reduce((acc: any, invoice: any) => {
      if (!acc[invoice.driver_id]) {
        acc[invoice.driver_id] = [];
      }
      acc[invoice.driver_id].push(invoice);
      return acc;
    }, {});

    agreements?.forEach((agreement: any) => {
      const driverPayments = paymentsByDriver[agreement.driver_id] || [];
      const driverInvoices = invoicesByDriver[agreement.driver_id] || [];
      const paymentFrequency = agreement.payment_frequency || "per_course";
      const paymentDay = agreement.payment_day || 1;

      // Add existing payments (sent or received)
      driverPayments.forEach((payment: any) => {
        const periodStart = payment.period_start ? new Date(payment.period_start) : new Date(payment.created_at);
        const periodEnd = payment.period_end ? new Date(payment.period_end) : periodStart;
        const dueDate = addDays(periodEnd, 7);
        
        // Find related invoices for this payment
        const relatedInvoices = payment.course_ids 
          ? driverInvoices.filter((inv: any) => payment.course_ids.includes(inv.course_id))
          : [];

        groups.push({
          driverId: agreement.driver_id,
          driverName: agreement.driverProfile?.full_name || "Chauffeur",
          driverCompany: agreement.driver?.company_name || "",
          driverPhoto: agreement.driverProfile?.profile_photo_url,
          driverPhone: agreement.driver?.phone,
          agreementId: agreement.id,
          paymentFrequency,
          paymentMethods: agreement.payment_methods || [],
          paymentDay,
          totalAmount: Number(payment.amount),
          invoiceCount: payment.courses_count || relatedInvoices.length || 1,
          invoices: relatedInvoices.length > 0 ? relatedInvoices : [{
            amount: payment.amount,
            created_at: payment.created_at,
            courses: { 
              scheduled_date: payment.period_start,
              pickup_address: "Course effectuée",
              destination_address: ""
            }
          }],
          periodStart,
          periodEnd,
          dueDate,
          status: payment.status === "received" ? 'received' : 'sent',
          paymentId: payment.id,
          sentAt: payment.sent_at ? new Date(payment.sent_at) : undefined,
          paymentReference: payment.payment_reference,
          documentsCount: payment.company_payment_documents?.length || 0
        });
      });

      // Add pending payments from outstanding balance (not yet tracked in company_payments)
      if (agreement.outstanding_balance > 0) {
        // Check if there's already a pending payment for this
        const hasPendingPaymentForBalance = driverPayments.some((p: any) => 
          p.status !== 'received' && Number(p.amount) === Number(agreement.outstanding_balance)
        );

        if (!hasPendingPaymentForBalance) {
          // Find unpaid invoices for this driver
          const unpaidDriverInvoices = driverInvoices.filter((inv: any) => 
            inv.payment_status !== 'paid'
          );
          
          // If no unpaid invoices found, create from outstanding balance
          const invoicesToUse = unpaidDriverInvoices.length > 0 
            ? unpaidDriverInvoices 
            : driverInvoices.slice(0, 1);

          const periodStart = invoicesToUse[0]?.courses?.scheduled_date 
            ? new Date(invoicesToUse[0].courses.scheduled_date) 
            : new Date();
          const dueDate = addDays(periodStart, 7);

          groups.push({
            driverId: agreement.driver_id,
            driverName: agreement.driverProfile?.full_name || "Chauffeur",
            driverCompany: agreement.driver?.company_name || "",
            driverPhoto: agreement.driverProfile?.profile_photo_url,
            driverPhone: agreement.driver?.phone,
            agreementId: agreement.id,
            paymentFrequency,
            paymentMethods: agreement.payment_methods || [],
            paymentDay,
            totalAmount: Number(agreement.outstanding_balance),
            invoiceCount: unpaidDriverInvoices.length || 1,
            invoices: invoicesToUse.length > 0 ? invoicesToUse : [{
              amount: agreement.outstanding_balance,
              created_at: new Date().toISOString(),
              courses: { 
                scheduled_date: new Date().toISOString(),
                pickup_address: "Course effectuée",
                destination_address: ""
              }
            }],
            periodStart,
            periodEnd: periodStart,
            dueDate,
            status: dueDate < today ? 'overdue' : dueDate <= addDays(today, 3) ? 'due' : 'upcoming',
            paymentId: undefined,
            sentAt: undefined,
            paymentReference: undefined,
            documentsCount: 0
          });
        }
      }
    });

    return groups.sort((a, b) => {
      // Sort by status priority first (overdue > due > upcoming > sent > received)
      const statusOrder = { overdue: 0, due: 1, upcoming: 2, sent: 3, received: 4 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      // Then by date
      return a.dueDate.getTime() - b.dueDate.getTime();
    });
  }, [agreements, allCompanyInvoices, companyPayments]);

  const pendingPayments = groupedPayments.filter(p => !['sent', 'received'].includes(p.status));
  const sentPayments = groupedPayments.filter(p => p.status === 'sent');
  const receivedPayments = groupedPayments.filter(p => p.status === 'received');

  // Filter course history
  const filteredCourseHistory = useMemo(() => {
    let filtered = courseDetails;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.driverName.toLowerCase().includes(query) ||
        c.pickup_address.toLowerCase().includes(query) ||
        c.destination_address.toLowerCase().includes(query) ||
        c.invoice_number.toLowerCase().includes(query)
      );
    }
    
    if (selectedDriverFilter) {
      filtered = filtered.filter(c => c.driver_id === selectedDriverFilter);
    }
    
    return filtered;
  }, [courseDetails, searchQuery, selectedDriverFilter]);

  const totalPending = pendingPayments.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalSent = sentPayments.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalReceived = receivedPayments.reduce((sum, p) => sum + p.totalAmount, 0);

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case "per_course": return "À la course";
      case "weekly": return "Hebdomadaire";
      case "monthly": return "Mensuel";
      default: return frequency;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "virement": return "Virement bancaire";
      case "especes": return "Espèces";
      case "cheque": return "Chèque";
      case "payment_link": return "Lien de paiement";
      default: return method;
    }
  };

  const getPeriodLabel = (payment: GroupedPayment) => {
    if (payment.paymentFrequency === "per_course") {
      return format(payment.periodStart, "d MMM yyyy", { locale: fr });
    } else if (payment.paymentFrequency === "weekly") {
      return `Semaine du ${format(payment.periodStart, "d", { locale: fr })} au ${format(payment.periodEnd, "d MMM", { locale: fr })}`;
    } else {
      return format(payment.periodStart, "MMMM yyyy", { locale: fr });
    }
  };

  const togglePaymentExpanded = (paymentKey: string) => {
    const newExpanded = new Set(expandedPayments);
    if (newExpanded.has(paymentKey)) {
      newExpanded.delete(paymentKey);
    } else {
      newExpanded.add(paymentKey);
    }
    setExpandedPayments(newExpanded);
  };

  const openSendPaymentDialog = (payment: GroupedPayment) => {
    setSelectedPayment(payment);
    setPaymentReference("");
    setDocumentFile(null);
    setShowSendPaymentDialog(true);
  };

  const handleSendPayment = () => {
    if (!selectedPayment) return;
    markPaymentSentMutation.mutate({ 
      payment: selectedPayment, 
      reference: paymentReference,
      document: documentFile || undefined
    });
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Fichier trop volumineux (max 10MB)");
        return;
      }
      setDocumentFile(file);
    }
  };

  const downloadRecap = (payment: GroupedPayment) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    doc.setFillColor(0, 102, 204);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text("RÉCAPITULATIF DE PAIEMENT", pageWidth / 2, 18, { align: "center" });
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(getPeriodLabel(payment), pageWidth / 2, 28, { align: "center" });
    
    doc.setTextColor(0, 0, 0);
    let yPos = 50;
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("Chauffeur", 20, yPos);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    yPos += 7;
    doc.text(payment.driverName, 20, yPos);
    if (payment.driverCompany) {
      yPos += 5;
      doc.text(payment.driverCompany, 20, yPos);
    }
    
    yPos += 15;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("Détail des courses", 20, yPos);
    yPos += 10;
    
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPos - 5, pageWidth - 30, 8, 'F');
    doc.setFontSize(9);
    doc.text("N° Facture", 20, yPos);
    doc.text("Date", 55, yPos);
    doc.text("Trajet", 85, yPos);
    doc.text("Montant", pageWidth - 25, yPos, { align: "right" });
    yPos += 8;
    
    doc.setFont(undefined, 'normal');
    payment.invoices.forEach((invoice: any) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.text(invoice.invoice_number_generated || invoice.invoice_number || "N/A", 20, yPos);
      doc.text(format(new Date(invoice.courses?.scheduled_date || invoice.created_at), "dd/MM/yy"), 55, yPos);
      const destination = invoice.courses?.destination_address?.substring(0, 30) + "..." || "";
      doc.text(destination, 85, yPos);
      doc.text(`${Number(invoice.amount).toFixed(2)} €`, pageWidth - 25, yPos, { align: "right" });
      yPos += 6;
    });
    
    yPos += 10;
    doc.setDrawColor(0, 102, 204);
    doc.setLineWidth(1);
    doc.line(pageWidth - 80, yPos - 3, pageWidth - 15, yPos - 3);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("TOTAL À PAYER:", pageWidth - 80, yPos + 5);
    doc.setFontSize(14);
    doc.text(`${payment.totalAmount.toFixed(2)} €`, pageWidth - 25, yPos + 5, { align: "right" });
    
    yPos += 20;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(`Date d'échéance: ${format(payment.dueDate, "d MMMM yyyy", { locale: fr })}`, 20, yPos);
    
    const fileName = `recap-paiement-${payment.driverName.replace(/\s+/g, '-')}-${format(payment.periodStart, "yyyy-MM-dd")}.pdf`;
    doc.save(fileName);
    toast.success("Récapitulatif téléchargé");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'overdue':
        return <Badge variant="destructive" className="animate-pulse">En retard</Badge>;
      case 'due':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">À payer</Badge>;
      case 'sent':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Envoyé</Badge>;
      case 'received':
        return <Badge className="bg-green-500 hover:bg-green-600">Confirmé</Badge>;
      default:
        return <Badge variant="outline">À venir</Badge>;
    }
  };

  if (loadingAgreements || loadingInvoices || loadingPayments) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const PaymentCard = ({ payment }: { payment: GroupedPayment }) => {
    const paymentKey = `${payment.driverId}-${payment.periodStart.getTime()}`;
    const isExpanded = expandedPayments.has(paymentKey);
    
    return (
      <Card className={`overflow-hidden ${payment.status === 'overdue' ? 'border-destructive/50 bg-destructive/5' : ''}`}>
        <CardContent className="p-0">
          <div className="p-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-14 w-14 border-2 border-border">
                <AvatarImage src={payment.driverPhoto || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {payment.driverName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="font-semibold truncate">{payment.driverName}</h4>
                  {getStatusBadge(payment.status)}
                </div>
                
                {payment.driverCompany && (
                  <p className="text-sm text-muted-foreground">{payment.driverCompany}</p>
                )}
                
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded">
                    <Calendar className="w-3 h-3" />
                    {getPeriodLabel(payment)}
                  </span>
                  <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded">
                    <Car className="w-3 h-3" />
                    {payment.invoiceCount} course(s)
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {getFrequencyLabel(payment.paymentFrequency)}
                  </Badge>
                </div>

                {payment.paymentMethods.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {payment.paymentMethods.map((method) => (
                      <Badge key={method} variant="secondary" className="text-xs">
                        <CreditCard className="w-3 h-3 mr-1" />
                        {getPaymentMethodLabel(method)}
                      </Badge>
                    ))}
                  </div>
                )}

                {payment.sentAt && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    ✓ Envoyé le {format(payment.sentAt, "d MMM yyyy 'à' HH:mm", { locale: fr })}
                    {payment.paymentReference && ` - Réf: ${payment.paymentReference}`}
                  </p>
                )}
                
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Échéance: {format(payment.dueDate, "d MMM yyyy", { locale: fr })}
                    </p>
                    <p className="text-2xl font-bold text-primary mt-1">
                      {payment.totalAmount.toFixed(2)} €
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => togglePaymentExpanded(paymentKey)}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadRecap(payment)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    
                    {!['sent', 'received'].includes(payment.status) && (
                      <Button
                        size="sm"
                        onClick={() => openSendPaymentDialog(payment)}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Notifier l'envoi
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Expanded course details */}
          {isExpanded && (
            <div className="border-t border-border bg-muted/30 p-4">
              <h5 className="text-sm font-medium mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Détail des courses
              </h5>
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-3">
                  {payment.invoices.map((invoice: any, index: number) => (
                    <div key={index} className="bg-background rounded-lg p-3 border border-border/50">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className="text-xs">
                          {invoice.invoice_number_generated || invoice.invoice_number || "N/A"}
                        </Badge>
                        <span className="font-semibold text-primary">
                          {Number(invoice.amount).toFixed(2)} €
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {format(new Date(invoice.courses?.scheduled_date || invoice.created_at), "EEEE d MMMM yyyy", { locale: fr })}
                        </div>
                        <div className="flex items-start gap-1">
                          <MapPin className="w-3 h-3 mt-0.5 text-green-500" />
                          <span className="truncate">{invoice.courses?.pickup_address || "N/A"}</span>
                        </div>
                        <div className="flex items-start gap-1">
                          <MapPin className="w-3 h-3 mt-0.5 text-red-500" />
                          <span className="truncate">{invoice.courses?.destination_address || "N/A"}</span>
                        </div>
                        {(invoice.courses?.distance_km || invoice.courses?.duration_minutes) && (
                          <div className="flex gap-3 mt-1">
                            {invoice.courses?.distance_km && (
                              <span>{invoice.courses.distance_km.toFixed(1)} km</span>
                            )}
                            {invoice.courses?.duration_minutes && (
                              <span>{invoice.courses.duration_minutes} min</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const CourseHistoryCard = ({ course }: { course: CourseDetails }) => (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={course.driverPhoto || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {course.driverName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div>
                <h4 className="font-medium text-sm truncate">{course.driverName}</h4>
                {course.driverCompany && (
                  <p className="text-xs text-muted-foreground">{course.driverCompany}</p>
                )}
              </div>
              <div className="text-right">
                <p className="font-bold text-primary">{Number(course.amount).toFixed(2)} €</p>
                <Badge variant="outline" className="text-xs">{course.invoice_number}</Badge>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground space-y-1 mt-2">
              <div className="flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                {format(new Date(course.scheduled_date), "d MMM yyyy", { locale: fr })}
              </div>
              <div className="flex items-start gap-1">
                <MapPin className="w-3 h-3 mt-0.5 text-green-500" />
                <span className="truncate">{course.pickup_address}</span>
              </div>
              <div className="flex items-start gap-1">
                <MapPin className="w-3 h-3 mt-0.5 text-red-500" />
                <span className="truncate">{course.destination_address}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Paiements aux chauffeurs</h2>
        <p className="text-sm text-muted-foreground">
          Gérez vos paiements et consultez l'historique des courses effectuées
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={pendingPayments.filter(p => p.status === 'overdue').length > 0 ? "border-destructive bg-destructive/5" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${pendingPayments.filter(p => p.status === 'overdue').length > 0 ? 'bg-destructive/20' : 'bg-yellow-500/10'}`}>
                <Clock className={`w-6 h-6 ${pendingPayments.filter(p => p.status === 'overdue').length > 0 ? 'text-destructive' : 'text-yellow-500'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vous devez aux chauffeurs</p>
                <p className="text-2xl font-bold">{totalPending.toFixed(2)} €</p>
                <p className="text-xs text-muted-foreground">{pendingPayments.length} paiement(s) en attente</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Send className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paiements envoyés</p>
                <p className="text-2xl font-bold">{totalSent.toFixed(2)} €</p>
                <p className="text-xs text-muted-foreground">{sentPayments.length} en attente de confirmation</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-500/10">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paiements confirmés</p>
                <p className="text-2xl font-bold">{totalReceived.toFixed(2)} €</p>
                <p className="text-xs text-muted-foreground">{receivedPayments.length} paiement(s) validés</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending" className="relative">
            À payer
            {pendingPayments.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-yellow-500 text-white rounded-full">
                {pendingPayments.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent">
            Envoyés
            {sentPayments.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                {sentPayments.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="received">
            Confirmés
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-1" />
            Historique
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingPayments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <p className="text-lg font-medium">Tout est à jour !</p>
                <p className="text-muted-foreground">Aucun paiement en attente</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingPayments.map((payment) => (
                <PaymentCard key={`${payment.driverId}-${payment.periodStart.getTime()}`} payment={payment} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent" className="mt-4">
          {sentPayments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Send className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Aucun paiement en attente de confirmation</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sentPayments.map((payment) => (
                <PaymentCard key={`${payment.driverId}-${payment.periodStart.getTime()}`} payment={payment} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="received" className="mt-4">
          {receivedPayments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Aucun paiement confirmé</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {receivedPayments.map((payment) => (
                <PaymentCard key={`${payment.driverId}-${payment.periodStart.getTime()}`} payment={payment} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par chauffeur, adresse, facture..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {driverIds.length > 0 && (
                  <select
                    value={selectedDriverFilter || ""}
                    onChange={(e) => setSelectedDriverFilter(e.target.value || null)}
                    className="px-3 py-2 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="">Tous les chauffeurs</option>
                    {driverIds.map((id) => (
                      <option key={id} value={id}>{driverMap[id]?.name || "Chauffeur"}</option>
                    ))}
                  </select>
                )}
              </div>
            </CardContent>
          </Card>

          {filteredCourseHistory.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <History className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Aucune course trouvée</p>
                <p className="text-muted-foreground">L'historique de vos courses apparaîtra ici</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{filteredCourseHistory.length} course(s)</p>
              {filteredCourseHistory.map((course) => (
                <CourseHistoryCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Send Payment Dialog */}
      <Dialog open={showSendPaymentDialog} onOpenChange={setShowSendPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Notifier l'envoi du paiement</DialogTitle>
            <DialogDescription>
              Confirmez l'envoi du paiement à {selectedPayment?.driverName}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedPayment.driverPhoto || undefined} />
                  <AvatarFallback>{selectedPayment.driverName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedPayment.driverName}</p>
                  <p className="text-sm text-muted-foreground">{selectedPayment.driverCompany}</p>
                </div>
              </div>
              
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Montant total</span>
                  <span className="font-bold text-xl text-primary">{selectedPayment.totalAmount.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between items-center text-sm text-muted-foreground mt-2">
                  <span>Période</span>
                  <span>{getPeriodLabel(selectedPayment)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-muted-foreground mt-1">
                  <span>Courses</span>
                  <span>{selectedPayment.invoiceCount} course(s)</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reference">Référence du paiement (optionnel)</Label>
                <Input
                  id="reference"
                  placeholder="Ex: VIR-2024-001, ID transaction..."
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="document">Justificatif de paiement (optionnel)</Label>
                <Input
                  id="document"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleDocumentChange}
                />
                {documentFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 bg-muted rounded">
                    <Paperclip className="w-4 h-4" />
                    <span className="truncate flex-1">{documentFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDocumentFile(null)}
                    >
                      ×
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSendPaymentDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSendPayment}
              disabled={markPaymentSentMutation.isPending}
            >
              {markPaymentSentMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Confirmer l'envoi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
