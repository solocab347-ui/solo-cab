import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Calendar, 
  Euro, 
  FileText, 
  Loader2, 
  Download,
  Clock,
  CheckCircle,
  AlertCircle,
  Building2,
  CalendarDays,
  AlertTriangle,
  MessageSquare,
  Check,
  X
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import { toast } from "sonner";

interface DriverCompanyPaymentsProps {
  driverId: string;
}

interface GroupedPayment {
  companyId: string;
  companyName: string;
  companyInfo?: {
    siret?: string;
    siren?: string;
    tva_number?: string;
    address?: string;
    billing_address?: string;
    contact_email?: string;
    contact_phone?: string;
    logo_url?: string;
  };
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
  status: 'upcoming' | 'due' | 'overdue' | 'sent' | 'received' | 'disputed';
  paymentId?: string;
  sentAt?: Date;
  receivedAt?: Date;
  paymentReference?: string;
  consolidatedInvoiceNumber?: string;
  consolidatedInvoiceGeneratedAt?: Date;
  documents?: any[];
}

export function DriverCompanyPayments({ driverId }: DriverCompanyPaymentsProps) {
  const [activeTab, setActiveTab] = useState("pending");
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<GroupedPayment | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const queryClient = useQueryClient();

  // Fetch driver info for invoices
  const { data: driverInfo } = useQuery({
    queryKey: ["driver-info-for-company-payments", driverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select(`
          id,
          company_name,
          siret,
          siren,
          tva_number,
          company_address,
          profiles:user_id(full_name, phone, email)
        `)
        .eq("id", driverId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch agreements with companies
  const { data: agreements, isLoading: loadingAgreements } = useQuery({
    queryKey: ["driver-company-agreements", driverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_driver_agreements")
        .select(`
          id,
          company_id,
          payment_frequency,
          payment_methods,
          payment_day,
          next_payment_due,
          total_billed,
          total_paid,
          outstanding_balance,
          company:companies(
            id,
            company_name,
            contact_name,
            contact_email,
            contact_phone,
            siret,
            siren,
            tva_number,
            address,
            billing_address,
            logo_url
          )
        `)
        .eq("driver_id", driverId)
        .eq("status", "accepted");

      if (error) throw error;
      return data;
    },
  });

  // Fetch invoices for companies
  const { data: companyInvoices, isLoading: loadingInvoices } = useQuery({
    queryKey: ["driver-company-invoices", driverId],
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
          company_id,
          course_id,
          courses!inner(
            id,
            pickup_address,
            destination_address,
            scheduled_date
          )
        `)
        .eq("driver_id", driverId)
        .not("company_id", "is", null)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch company payments tracking with documents
  const { data: companyPayments, isLoading: loadingPayments } = useQuery({
    queryKey: ["driver-company-payments-tracking", driverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_payments")
        .select(`
          *,
          documents:company_payment_documents(*)
        `)
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Confirm receipt mutation - handles both existing payment records and new ones
  const confirmReceiptMutation = useMutation({
    mutationFn: async (payment: GroupedPayment) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      // Get invoice IDs directly from the payment invoices
      const invoiceIds = payment.invoices.map((inv: any) => inv.id).filter(Boolean);
      const courseIds = payment.invoices.map((inv: any) => inv.course_id).filter(Boolean);
      
      console.log("Confirming payment:", { 
        paymentId: payment.paymentId, 
        invoiceIds, 
        courseIds,
        amount: payment.totalAmount 
      });
      
      let paymentRecord;
      
      if (payment.paymentId) {
        // Update existing payment record
        const { data, error } = await supabase
          .from("company_payments")
          .update({
            status: "received",
            received_at: new Date().toISOString(),
            received_confirmed_by_user_id: userId
          })
          .eq("id", payment.paymentId)
          .select()
          .single();

        if (error) {
          console.error("Error updating payment:", error);
          throw error;
        }
        paymentRecord = data;
      } else {
        // Create new payment record and mark as received
        const { data, error } = await supabase
          .from("company_payments")
          .insert({
            agreement_id: payment.agreementId,
            company_id: payment.companyId,
            driver_id: driverId,
            amount: payment.totalAmount,
            payment_method: payment.paymentMethods[0] || "cash",
            status: "received",
            received_at: new Date().toISOString(),
            received_confirmed_by_user_id: userId,
            course_ids: courseIds,
            courses_count: payment.invoiceCount,
            period_start: payment.periodStart.toISOString().split('T')[0],
            period_end: payment.periodEnd.toISOString().split('T')[0]
          })
          .select()
          .single();

        if (error) {
          console.error("Error creating payment:", error);
          throw error;
        }
        paymentRecord = data;
      }

      // Mark related invoices as paid using invoice IDs directly
      if (invoiceIds.length > 0) {
        const { error: facturesError } = await supabase
          .from("factures")
          .update({ 
            payment_status: "paid",
            paid_at: new Date().toISOString()
          })
          .in("id", invoiceIds);
        
        if (facturesError) {
          console.error("Error updating factures:", facturesError);
        } else {
          console.log("Factures updated successfully:", invoiceIds);
        }
      }

      // Update the agreement's outstanding_balance and total_paid
      const { data: currentAgreement } = await supabase
        .from("company_driver_agreements")
        .select("outstanding_balance, total_paid")
        .eq("id", payment.agreementId)
        .single();

      if (currentAgreement) {
        const currentOutstanding = Number(currentAgreement.outstanding_balance) || 0;
        const currentTotalPaid = Number(currentAgreement.total_paid) || 0;
        const newOutstanding = Math.max(0, currentOutstanding - payment.totalAmount);
        
        await supabase
          .from("company_driver_agreements")
          .update({
            outstanding_balance: newOutstanding,
            total_paid: currentTotalPaid + payment.totalAmount,
            last_payment_date: new Date().toISOString().split('T')[0]
          })
          .eq("id", payment.agreementId);
        
        console.log("Agreement balance updated:", { newOutstanding, totalPaid: currentTotalPaid + payment.totalAmount });
      }

      // Notify company
      const { data: companyData } = await supabase
        .from("companies")
        .select("user_id")
        .eq("id", payment.companyId)
        .single();

      if (companyData?.user_id) {
        await supabase.from("notifications").insert({
          user_id: companyData.user_id,
          title: "✅ Paiement confirmé",
          message: `Le chauffeur a confirmé la réception du paiement de ${payment.totalAmount.toFixed(2)}€`,
          type: "payment",
          link: "/company-dashboard?tab=payments"
        });
      }

      return paymentRecord;
    },
    onSuccess: () => {
      // Invalidate all related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["driver-company-payments-tracking", driverId] });
      queryClient.invalidateQueries({ queryKey: ["driver-company-invoices", driverId] });
      queryClient.invalidateQueries({ queryKey: ["driver-company-agreements", driverId] });
      toast.success("Réception du paiement confirmée");
      setShowConfirmDialog(false);
      setSelectedPayment(null);
    },
    onError: (error) => {
      console.error("Error confirming receipt:", error);
      toast.error("Erreur lors de la confirmation");
    }
  });

  // Dispute payment mutation
  const disputePaymentMutation = useMutation({
    mutationFn: async ({ paymentId, reason }: { paymentId: string; reason: string }) => {
      const { data, error } = await supabase
        .from("company_payments")
        .update({
          status: "pending",
          dispute_reason: reason,
          dispute_status: "pending",
          dispute_created_at: new Date().toISOString()
        })
        .eq("id", paymentId)
        .select()
        .single();

      if (error) throw error;

      // Notify company
      const { data: companyData } = await supabase
        .from("companies")
        .select("user_id, company_name")
        .eq("id", data.company_id)
        .single();

      if (companyData?.user_id) {
        await supabase.from("notifications").insert({
          user_id: companyData.user_id,
          title: "⚠️ Paiement contesté",
          message: `Le chauffeur conteste le paiement de ${data.amount}€. Motif: ${reason}`,
          type: "payment_dispute",
          link: "/company-dashboard?tab=payments"
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-company-payments-tracking"] });
      toast.success("Contestation envoyée à l'entreprise");
      setShowDisputeDialog(false);
      setSelectedPayment(null);
      setDisputeReason("");
    },
    onError: (error) => {
      console.error("Error disputing payment:", error);
      toast.error("Erreur lors de l'envoi de la contestation");
    }
  });

  // Group invoices by company and payment period
  const groupedPayments = useMemo(() => {
    if (!agreements || !companyInvoices) return [];

    const today = new Date();
    const groups: GroupedPayment[] = [];

    // Build agreement map for quick lookup
    const agreementMap = (agreements || []).reduce((acc: any, agreement: any) => {
      acc[agreement.company_id] = agreement;
      return acc;
    }, {});

    // First, add all received payments from company_payments table
    (companyPayments || []).filter((p: any) => p.status === 'received').forEach((payment: any) => {
      const agreement = agreementMap[payment.company_id];
      if (!agreement) return;
      
      // Find matching invoices for this payment
      const relatedInvoices = companyInvoices.filter((inv: any) => 
        payment.course_ids?.includes(inv.course_id)
      );

      groups.push({
        companyId: payment.company_id,
        companyName: agreement.company?.company_name || "Entreprise",
        companyInfo: {
          siret: agreement.company?.siret,
          siren: agreement.company?.siren,
          tva_number: agreement.company?.tva_number,
          address: agreement.company?.address,
          billing_address: agreement.company?.billing_address,
          contact_email: agreement.company?.contact_email,
          contact_phone: agreement.company?.contact_phone,
          logo_url: agreement.company?.logo_url,
        },
        agreementId: agreement.id,
        paymentFrequency: agreement.payment_frequency || "per_course",
        paymentMethods: agreement.payment_methods || [],
        paymentDay: agreement.payment_day || 1,
        totalAmount: Number(payment.amount),
        invoiceCount: payment.courses_count || relatedInvoices.length,
        invoices: relatedInvoices,
        periodStart: new Date(payment.period_start),
        periodEnd: new Date(payment.period_end),
        dueDate: new Date(payment.period_end),
        status: 'received',
        paymentId: payment.id,
        sentAt: payment.sent_at ? new Date(payment.sent_at) : undefined,
        receivedAt: payment.received_at ? new Date(payment.received_at) : undefined,
        paymentReference: payment.payment_reference,
        consolidatedInvoiceNumber: payment.consolidated_invoice_number,
        consolidatedInvoiceGeneratedAt: payment.consolidated_invoice_generated_at ? new Date(payment.consolidated_invoice_generated_at) : undefined,
        documents: payment.documents || []
      });
    });

    // Track course IDs that are already in received payments
    const receivedCourseIds = new Set<string>();
    (companyPayments || []).filter((p: any) => p.status === 'received').forEach((payment: any) => {
      if (payment.course_ids) {
        payment.course_ids.forEach((cid: string) => receivedCourseIds.add(cid));
      }
    });

    // Build a map of pending/sent payments by their period AND by course_ids
    const pendingPaymentsByKey: { [key: string]: any } = {};
    const pendingPaymentsByCourseId: { [courseId: string]: any } = {};
    (companyPayments || []).filter((p: any) => p.status !== 'received').forEach((payment: any) => {
      // Map by period_start if available
      if (payment.period_start) {
        const key = `${payment.company_id}-${payment.period_start?.split('T')[0]}`;
        pendingPaymentsByKey[key] = payment;
      }
      // Also map by course_ids for payments created by trigger (without period_start)
      if (payment.course_ids) {
        payment.course_ids.forEach((courseId: string) => {
          pendingPaymentsByCourseId[courseId] = payment;
        });
      }
    });

    // Group invoices by company
    const invoicesByCompany = companyInvoices.reduce((acc: any, invoice: any) => {
      if (!acc[invoice.company_id]) {
        acc[invoice.company_id] = [];
      }
      acc[invoice.company_id].push(invoice);
      return acc;
    }, {});

    // Process each company's invoices for pending payments
    agreements?.forEach((agreement: any) => {
      const companyInvoicesForAgreement = invoicesByCompany[agreement.company_id] || [];
      if (companyInvoicesForAgreement.length === 0) return;

      const paymentFrequency = agreement.payment_frequency || "per_course";
      const paymentDay = agreement.payment_day || 1;

      // Filter: not paid AND not in a received payment
      const unpaidInvoices = companyInvoicesForAgreement.filter((i: any) => 
        i.payment_status !== "paid" && !receivedCourseIds.has(i.course_id)
      );

      if (paymentFrequency === "per_course") {
        unpaidInvoices.forEach((invoice: any) => {
          const invoiceDate = new Date(invoice.created_at);
          const dueDate = addDays(invoiceDate, 7);
          const paymentKey = `${agreement.company_id}-${format(invoiceDate, 'yyyy-MM-dd')}`;
          // Try to find existing payment by period_start OR by course_id
          const existingPayment = pendingPaymentsByKey[paymentKey] || pendingPaymentsByCourseId[invoice.course_id];
          
          groups.push({
            companyId: agreement.company_id,
            companyName: agreement.company?.company_name || "Entreprise",
            companyInfo: {
              siret: agreement.company?.siret,
              siren: agreement.company?.siren,
              tva_number: agreement.company?.tva_number,
              address: agreement.company?.address,
              billing_address: agreement.company?.billing_address,
              contact_email: agreement.company?.contact_email,
              contact_phone: agreement.company?.contact_phone,
              logo_url: agreement.company?.logo_url,
            },
            agreementId: agreement.id,
            paymentFrequency,
            paymentMethods: agreement.payment_methods || [],
            paymentDay,
            totalAmount: invoice.amount,
            invoiceCount: 1,
            invoices: [invoice],
            periodStart: invoiceDate,
            periodEnd: invoiceDate,
            dueDate,
            status: existingPayment?.dispute_status === "pending" ? 'disputed' :
                   existingPayment?.status === "sent" ? 'sent' :
                   dueDate < today ? 'overdue' : dueDate <= addDays(today, 3) ? 'due' : 'upcoming',
            paymentId: existingPayment?.id,
            sentAt: existingPayment?.sent_at ? new Date(existingPayment.sent_at) : undefined,
            paymentReference: existingPayment?.payment_reference,
            consolidatedInvoiceNumber: existingPayment?.consolidated_invoice_number,
            consolidatedInvoiceGeneratedAt: existingPayment?.consolidated_invoice_generated_at ? new Date(existingPayment.consolidated_invoice_generated_at) : undefined,
            documents: existingPayment?.documents || []
          });
        });
      } else if (paymentFrequency === "weekly") {
        const weeklyGroups: { [key: string]: any[] } = {};
        
        unpaidInvoices.forEach((invoice: any) => {
          const invoiceDate = new Date(invoice.courses?.scheduled_date || invoice.created_at);
          const weekStart = startOfWeek(invoiceDate, { weekStartsOn: 1 });
          const weekKey = format(weekStart, "yyyy-ww");
          
          if (!weeklyGroups[weekKey]) {
            weeklyGroups[weekKey] = [];
          }
          weeklyGroups[weekKey].push(invoice);
        });

        Object.entries(weeklyGroups).forEach(([weekKey, invoices]) => {
          const firstInvoice = invoices[0];
          const invoiceDate = new Date(firstInvoice.courses?.scheduled_date || firstInvoice.created_at);
          const weekStart = startOfWeek(invoiceDate, { weekStartsOn: 1 });
          const weekEnd = endOfWeek(invoiceDate, { weekStartsOn: 1 });
          const dueDate = addDays(weekEnd, paymentDay);
          const paymentKey = `${agreement.company_id}-${format(weekStart, 'yyyy-MM-dd')}`;
          // Try to find existing payment by period_start OR by any course_id in the group
          const existingPaymentByKey = pendingPaymentsByKey[paymentKey];
          const existingPaymentByCourse = invoices.find((inv: any) => pendingPaymentsByCourseId[inv.course_id])
            ? pendingPaymentsByCourseId[invoices.find((inv: any) => pendingPaymentsByCourseId[inv.course_id])?.course_id]
            : undefined;
          const existingPayment = existingPaymentByKey || existingPaymentByCourse;

          const totalAmount = invoices.reduce((sum: number, inv: any) => sum + Number(inv.amount), 0);

          groups.push({
            companyId: agreement.company_id,
            companyName: agreement.company?.company_name || "Entreprise",
            companyInfo: {
              siret: agreement.company?.siret,
              siren: agreement.company?.siren,
              tva_number: agreement.company?.tva_number,
              address: agreement.company?.address,
              billing_address: agreement.company?.billing_address,
              contact_email: agreement.company?.contact_email,
              contact_phone: agreement.company?.contact_phone,
              logo_url: agreement.company?.logo_url,
            },
            agreementId: agreement.id,
            paymentFrequency,
            paymentMethods: agreement.payment_methods || [],
            paymentDay,
            totalAmount,
            invoiceCount: invoices.length,
            invoices,
            periodStart: weekStart,
            periodEnd: weekEnd,
            dueDate,
            status: existingPayment?.dispute_status === "pending" ? 'disputed' :
                   existingPayment?.status === "sent" ? 'sent' :
                   dueDate < today ? 'overdue' : dueDate <= addDays(today, 3) ? 'due' : 'upcoming',
            paymentId: existingPayment?.id,
            sentAt: existingPayment?.sent_at ? new Date(existingPayment.sent_at) : undefined,
            paymentReference: existingPayment?.payment_reference,
            consolidatedInvoiceNumber: existingPayment?.consolidated_invoice_number,
            consolidatedInvoiceGeneratedAt: existingPayment?.consolidated_invoice_generated_at ? new Date(existingPayment.consolidated_invoice_generated_at) : undefined,
            documents: existingPayment?.documents || []
          });
        });
      } else if (paymentFrequency === "monthly") {
        const monthlyGroups: { [key: string]: any[] } = {};
        
        unpaidInvoices.forEach((invoice: any) => {
          const invoiceDate = new Date(invoice.courses?.scheduled_date || invoice.created_at);
          const monthKey = format(invoiceDate, "yyyy-MM");
          
          if (!monthlyGroups[monthKey]) {
            monthlyGroups[monthKey] = [];
          }
          monthlyGroups[monthKey].push(invoice);
        });

        Object.entries(monthlyGroups).forEach(([monthKey, invoices]) => {
          const firstInvoice = invoices[0];
          const invoiceDate = new Date(firstInvoice.courses?.scheduled_date || firstInvoice.created_at);
          const monthStart = startOfMonth(invoiceDate);
          const monthEnd = endOfMonth(invoiceDate);
          const nextMonth = addDays(monthEnd, 1);
          const dueDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), paymentDay);
          const paymentKey = `${agreement.company_id}-${format(monthStart, 'yyyy-MM-dd')}`;
          // Try to find existing payment by period_start OR by any course_id in the group
          const existingPaymentByKey = pendingPaymentsByKey[paymentKey];
          const existingPaymentByCourse = invoices.find((inv: any) => pendingPaymentsByCourseId[inv.course_id])
            ? pendingPaymentsByCourseId[invoices.find((inv: any) => pendingPaymentsByCourseId[inv.course_id])?.course_id]
            : undefined;
          const existingPayment = existingPaymentByKey || existingPaymentByCourse;

          const totalAmount = invoices.reduce((sum: number, inv: any) => sum + Number(inv.amount), 0);

          groups.push({
            companyId: agreement.company_id,
            companyName: agreement.company?.company_name || "Entreprise",
            companyInfo: {
              siret: agreement.company?.siret,
              siren: agreement.company?.siren,
              tva_number: agreement.company?.tva_number,
              address: agreement.company?.address,
              billing_address: agreement.company?.billing_address,
              contact_email: agreement.company?.contact_email,
              contact_phone: agreement.company?.contact_phone,
              logo_url: agreement.company?.logo_url,
            },
            agreementId: agreement.id,
            paymentFrequency,
            paymentMethods: agreement.payment_methods || [],
            paymentDay,
            totalAmount,
            invoiceCount: invoices.length,
            invoices,
            periodStart: monthStart,
            periodEnd: monthEnd,
            dueDate,
            status: existingPayment?.dispute_status === "pending" ? 'disputed' :
                   existingPayment?.status === "sent" ? 'sent' :
                   dueDate < today ? 'overdue' : dueDate <= addDays(today, 3) ? 'due' : 'upcoming',
            paymentId: existingPayment?.id,
            sentAt: existingPayment?.sent_at ? new Date(existingPayment.sent_at) : undefined,
            paymentReference: existingPayment?.payment_reference,
            consolidatedInvoiceNumber: existingPayment?.consolidated_invoice_number,
            consolidatedInvoiceGeneratedAt: existingPayment?.consolidated_invoice_generated_at ? new Date(existingPayment.consolidated_invoice_generated_at) : undefined,
            documents: existingPayment?.documents || []
          });
        });
      }
    });

    return groups.sort((a, b) => {
      // Sort: sent first, then by due date
      if (a.status === 'sent' && b.status !== 'sent') return -1;
      if (a.status !== 'sent' && b.status === 'sent') return 1;
      return b.periodStart.getTime() - a.periodStart.getTime(); // Most recent first
    });
  }, [agreements, companyInvoices, companyPayments]);

  const pendingPayments = groupedPayments.filter(p => !['sent', 'received'].includes(p.status));
  const sentPayments = groupedPayments.filter(p => p.status === 'sent');
  const receivedPayments = groupedPayments.filter(p => p.status === 'received');

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

  const getPeriodLabel = (payment: GroupedPayment) => {
    if (payment.paymentFrequency === "per_course") {
      return format(payment.periodStart, "d MMM yyyy", { locale: fr });
    } else if (payment.paymentFrequency === "weekly") {
      return `Semaine du ${format(payment.periodStart, "d", { locale: fr })} au ${format(payment.periodEnd, "d MMM", { locale: fr })}`;
    } else {
      return format(payment.periodStart, "MMMM yyyy", { locale: fr });
    }
  };

  const openDispute = (payment: GroupedPayment) => {
    setSelectedPayment(payment);
    setDisputeReason("");
    setShowDisputeDialog(true);
  };

  const openConfirmDialog = (payment: GroupedPayment) => {
    setSelectedPayment(payment);
    setShowConfirmDialog(true);
  };

  const handleConfirmReceipt = () => {
    if (!selectedPayment) return;
    confirmReceiptMutation.mutate(selectedPayment);
  };

  const handleDispute = () => {
    if (!selectedPayment?.paymentId || !disputeReason.trim()) {
      toast.error("Veuillez préciser le motif de la contestation");
      return;
    }
    disputePaymentMutation.mutate({ 
      paymentId: selectedPayment.paymentId, 
      reason: disputeReason 
    });
  };

  const downloadRecap = (payment: GroupedPayment) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // Colors
    const headerColor: [number, number, number] = [46, 125, 50]; // Green for invoices
    
    // Header
    doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text("FACTURE CONSOLIDÉE", pageWidth / 2, 22, { align: "center" });
    
    const invoiceNumber = payment.consolidatedInvoiceNumber || 
      `FACT-ENT-${format(payment.periodStart, "yyyyMM")}-${payment.companyId.slice(0, 4).toUpperCase()}`;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`N°: ${invoiceNumber}`, pageWidth / 2, 32, { align: "center" });
    doc.text(`Période: ${getPeriodLabel(payment)}`, pageWidth / 2, 40, { align: "center" });

    // Driver info (left side) - EMETTEUR
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("ÉMETTEUR (Chauffeur VTC)", 20, 62);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    let leftY = 69;
    const driverName = driverInfo?.profiles?.full_name || driverInfo?.company_name || "N/A";
    doc.text(driverName, 20, leftY);
    leftY += 5;
    
    if (driverInfo?.company_name && driverInfo.company_name !== driverName) {
      doc.text(driverInfo.company_name, 20, leftY);
      leftY += 5;
    }
    
    if (driverInfo?.siret) {
      doc.text(`SIRET: ${driverInfo.siret}`, 20, leftY);
      leftY += 5;
    } else if (driverInfo?.siren) {
      doc.text(`SIREN: ${driverInfo.siren}`, 20, leftY);
      leftY += 5;
    }
    
    if (driverInfo?.tva_number) {
      doc.text(`N° TVA: ${driverInfo.tva_number}`, 20, leftY);
      leftY += 5;
    }
    
    if (driverInfo?.profiles?.phone) {
      doc.text(`Tél: ${driverInfo.profiles.phone}`, 20, leftY);
      leftY += 5;
    }
    
    if (driverInfo?.company_address) {
      const addressLines = doc.splitTextToSize(driverInfo.company_address, 75);
      doc.text(addressLines, 20, leftY);
    }

    // Company info (right side) - DESTINATAIRE
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("DESTINATAIRE (Entreprise)", pageWidth - 20, 62, { align: 'right' });
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    let rightY = 69;
    doc.text(payment.companyName, pageWidth - 20, rightY, { align: 'right' });
    rightY += 5;
    
    if (payment.companyInfo?.siret) {
      doc.text(`SIRET: ${payment.companyInfo.siret}`, pageWidth - 20, rightY, { align: 'right' });
      rightY += 5;
    } else if (payment.companyInfo?.siren) {
      doc.text(`SIREN: ${payment.companyInfo.siren}`, pageWidth - 20, rightY, { align: 'right' });
      rightY += 5;
    }
    
    if (payment.companyInfo?.tva_number) {
      doc.text(`N° TVA: ${payment.companyInfo.tva_number}`, pageWidth - 20, rightY, { align: 'right' });
      rightY += 5;
    }
    
    if (payment.companyInfo?.contact_email) {
      doc.text(payment.companyInfo.contact_email, pageWidth - 20, rightY, { align: 'right' });
      rightY += 5;
    }
    
    if (payment.companyInfo?.contact_phone) {
      doc.text(`Tél: ${payment.companyInfo.contact_phone}`, pageWidth - 20, rightY, { align: 'right' });
      rightY += 5;
    }
    
    const companyAddress = payment.companyInfo?.billing_address || payment.companyInfo?.address;
    if (companyAddress) {
      const addressLines = doc.splitTextToSize(companyAddress, 75);
      addressLines.forEach((line: string) => {
        doc.text(line, pageWidth - 20, rightY, { align: 'right' });
        rightY += 4;
      });
    }

    // Invoices table
    let yPos = Math.max(leftY, rightY) + 15;
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("DÉTAIL DES PRESTATIONS", 20, yPos);
    yPos += 8;
    
    // Table header
    doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.rect(15, yPos - 4, pageWidth - 30, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text("N° Facture", 20, yPos + 1);
    doc.text("Date", 60, yPos + 1);
    doc.text("Trajet", 90, yPos + 1);
    doc.text("Montant TTC", pageWidth - 20, yPos + 1, { align: "right" });
    yPos += 10;
    
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    
    // Table rows
    let subtotal = 0;
    payment.invoices.forEach((invoice: any, index: number) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      // Alternate row background
      if (index % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(15, yPos - 4, pageWidth - 30, 7, 'F');
      }
      
      const invoiceNum = invoice.invoice_number_generated || invoice.invoice_number || "N/A";
      doc.text(invoiceNum, 20, yPos);
      doc.text(format(new Date(invoice.created_at), "dd/MM/yyyy"), 60, yPos);
      
      const destination = invoice.courses?.destination_address || "";
      const truncatedDest = destination.length > 30 ? destination.substring(0, 30) + "..." : destination;
      doc.text(truncatedDest, 90, yPos);
      
      const amount = Number(invoice.amount);
      subtotal += amount;
      doc.text(`${amount.toFixed(2)} €`, pageWidth - 20, yPos, { align: "right" });
      yPos += 7;
    });
    
    // Totals section
    yPos += 8;
    doc.setDrawColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.setLineWidth(0.5);
    doc.line(pageWidth - 90, yPos - 3, pageWidth - 15, yPos - 3);
    
    // Calculate TVA (10% for VTC services)
    const tvaRate = 10;
    const totalTTC = payment.totalAmount;
    const totalHT = totalTTC / (1 + tvaRate / 100);
    const tvaAmount = totalTTC - totalHT;
    
    doc.setFontSize(9);
    doc.text("Total HT:", pageWidth - 90, yPos + 3);
    doc.text(`${totalHT.toFixed(2)} €`, pageWidth - 20, yPos + 3, { align: "right" });
    
    yPos += 7;
    doc.text(`TVA (${tvaRate}%)`, pageWidth - 90, yPos + 3);
    doc.text(`${tvaAmount.toFixed(2)} €`, pageWidth - 20, yPos + 3, { align: "right" });
    
    yPos += 10;
    doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.rect(pageWidth - 95, yPos - 3, 80, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("TOTAL TTC:", pageWidth - 90, yPos + 4);
    doc.text(`${totalTTC.toFixed(2)} €`, pageWidth - 20, yPos + 4, { align: "right" });
    
    // Payment info
    yPos += 20;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("CONDITIONS DE PAIEMENT", 20, yPos);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    yPos += 7;
    
    const paymentMethodsText = payment.paymentMethods.length > 0 
      ? payment.paymentMethods.join(", ") 
      : "Virement bancaire";
    doc.text(`Mode de paiement: ${paymentMethodsText}`, 20, yPos);
    yPos += 5;
    doc.text(`Échéance: ${format(payment.dueDate, "d MMMM yyyy", { locale: fr })}`, 20, yPos);
    yPos += 5;
    doc.text(`Fréquence: ${getFrequencyLabel(payment.paymentFrequency)}`, 20, yPos);
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Document généré automatiquement - Facture conforme aux mentions légales", pageWidth / 2, pageHeight - 15, { align: "center" });
    doc.text(`Date d'émission: ${format(new Date(), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`, pageWidth / 2, pageHeight - 10, { align: "center" });
    
    const fileName = `facture-consolidee-${payment.companyName.replace(/\s+/g, '-')}-${format(payment.periodStart, "yyyy-MM")}.pdf`;
    doc.save(fileName);
    toast.success("Facture consolidée téléchargée");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'overdue':
        return <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white border-0 shadow-sm">En retard</Badge>;
      case 'due':
        return <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 shadow-sm">À recevoir</Badge>;
      case 'sent':
        return <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 shadow-sm">Envoyé</Badge>;
      case 'received':
        return <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-sm">Reçu</Badge>;
      case 'disputed':
        return <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white border-0 shadow-sm">Contesté</Badge>;
      default:
        return <Badge variant="outline" className="bg-muted/50">À venir</Badge>;
    }
  };

  if (loadingAgreements || loadingInvoices || loadingPayments) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!agreements || agreements.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Building2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">Aucun partenariat entreprise</h3>
          <p className="text-muted-foreground">
            Vous n'avez pas encore de contrat avec des entreprises.
          </p>
        </CardContent>
      </Card>
    );
  }

  const PaymentCard = ({ payment }: { payment: GroupedPayment }) => (
    <Card 
      key={`${payment.companyId}-${payment.periodStart.getTime()}`}
      className="overflow-hidden border-0 bg-gradient-to-br from-card/80 to-card shadow-lg hover:shadow-xl transition-all duration-300"
    >
      <div className={`h-1 ${
        payment.status === 'received' 
          ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
          : payment.status === 'sent'
          ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
          : payment.status === 'overdue'
          ? 'bg-gradient-to-r from-red-500 to-orange-500'
          : 'bg-gradient-to-r from-amber-500 to-yellow-500'
      }`} />
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Company Logo with glow effect */}
          <div className="relative group">
            <div className={`absolute -inset-1 rounded-xl blur-sm group-hover:blur-md transition-all ${
              payment.status === 'received' ? 'bg-green-500/20' : 'bg-primary/20'
            }`} />
            <Avatar className="relative w-14 h-14 rounded-xl border-2 border-border/50 shadow-md">
              {payment.companyInfo?.logo_url ? (
                <AvatarImage src={payment.companyInfo.logo_url} alt={payment.companyName} className="object-cover rounded-xl" />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary rounded-xl text-lg font-bold">
                {payment.companyName?.slice(0, 2).toUpperCase() || 'EN'}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <h4 className="font-bold text-lg truncate">{payment.companyName}</h4>
              {getStatusBadge(payment.status)}
            </div>
            
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="flex items-center gap-1 text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                <Calendar className="w-3 h-3" />
                {getPeriodLabel(payment)}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                <FileText className="w-3 h-3" />
                {payment.invoiceCount} facture(s)
              </span>
              <Badge variant="outline" className="bg-muted/50 border-border/50">
                {getFrequencyLabel(payment.paymentFrequency)}
              </Badge>
            </div>

            {/* Payment sent info */}
            {payment.sentAt && payment.status !== 'received' && (
              <div className="mt-3 p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
                <p className="text-xs text-blue-600 font-medium">
                  💸 Paiement envoyé le {format(payment.sentAt, "d MMM yyyy à HH:mm", { locale: fr })}
                  {payment.paymentReference && (
                    <span className="block text-blue-500/70 mt-0.5">Réf: {payment.paymentReference}</span>
                  )}
                </p>
                
                {/* Justificatifs */}
                {payment.documents && payment.documents.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {payment.documents.map((doc: any) => (
                      <a
                        key={doc.id}
                        href={doc.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-500/10 text-blue-600 rounded-md hover:bg-blue-500/20 transition-colors"
                      >
                        <FileText className="w-3 h-3" />
                        {doc.file_name?.substring(0, 15) || "Justificatif"}
                      </a>
                    ))}
                  </div>
                )}
                
                {/* Facture consolidée */}
                {payment.consolidatedInvoiceNumber && (
                  <Badge variant="secondary" className="mt-2 text-xs bg-blue-500/10 text-blue-600 border-0">
                    📄 {payment.consolidatedInvoiceNumber}
                  </Badge>
                )}
                
                {/* Message d'information sur les délais de réception */}
                <div className="mt-3 pt-2 border-t border-blue-500/10">
                  <p className="text-xs text-muted-foreground italic leading-relaxed">
                    💡 Pour les virements bancaires et certains moyens de paiement, un délai de 2 à 3 jours ouvrés peut être nécessaire avant réception. Veuillez patienter avant de confirmer ou contester pour éviter tout malentendu.
                  </p>
                </div>
              </div>
            )}

            {/* Received payment info */}
            {payment.status === 'received' && (
              <div className="mt-3 p-3 bg-green-500/5 rounded-lg border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <p className="text-sm font-medium text-green-600">Paiement reçu</p>
                </div>
                
                <div className="space-y-1 text-xs">
                  {payment.receivedAt && (
                    <p className="text-green-600">
                      ✅ Réception confirmée le {format(payment.receivedAt, "d MMM yyyy à HH:mm", { locale: fr })}
                    </p>
                  )}
                  
                  {payment.sentAt && (
                    <p className="text-muted-foreground">
                      💸 Envoyé le {format(payment.sentAt, "d MMM yyyy", { locale: fr })}
                      {payment.paymentReference && (
                        <span className="ml-1">(Réf: {payment.paymentReference})</span>
                      )}
                    </p>
                  )}
                </div>
                
                {/* Justificatifs attachés */}
                {payment.documents && payment.documents.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-green-500/10">
                    <p className="text-xs text-muted-foreground mb-1.5">Justificatifs:</p>
                    <div className="flex flex-wrap gap-1">
                      {payment.documents.map((doc: any) => (
                        <a
                          key={doc.id}
                          href={doc.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-500/10 text-green-600 rounded-md hover:bg-green-500/20 transition-colors"
                        >
                          <FileText className="w-3 h-3" />
                          {doc.file_name?.substring(0, 20) || "Justificatif"}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Facture consolidée */}
                {payment.consolidatedInvoiceNumber && (
                  <Badge variant="secondary" className="mt-2 text-xs bg-green-500/10 text-green-600 border-0">
                    📄 {payment.consolidatedInvoiceNumber}
                  </Badge>
                )}
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
              <div>
                <p className="text-xs text-muted-foreground">
                  Échéance: {format(payment.dueDate, "d MMM yyyy", { locale: fr })}
                </p>
                <p className={`text-xl font-bold ${
                  payment.status === 'received' 
                    ? 'text-green-500' 
                    : 'bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent'
                }`}>
                  {payment.totalAmount.toFixed(2)} €
                </p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadRecap(payment)}
                  className="bg-muted/30 hover:bg-muted/50"
                >
                  <Download className="w-4 h-4" />
                </Button>
                
                {payment.status === 'sent' && payment.paymentId && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDispute(payment)}
                      className="text-red-500 border-red-500/30 hover:bg-red-500/10"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Contester
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => openConfirmDialog(payment)}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Confirmer
                    </Button>
                  </>
                )}
                
                {/* Bouton pour confirmer réception même sans paiement envoyé (paiement direct/espèces) */}
                {['upcoming', 'due', 'overdue'].includes(payment.status) && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => openConfirmDialog(payment)}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Confirmer
                    </Button>
                    {payment.status === 'overdue' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openDispute(payment)}
                        className="bg-gradient-to-r from-red-500 to-orange-500"
                      >
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        Relancer
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards - Modern Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm">
                <Euro className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground font-medium">À confirmer</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                  {totalSent.toFixed(2)} €
                </p>
                <p className="text-xs text-muted-foreground">{sentPayments.length} paiement(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 bg-gradient-to-br from-green-500/10 to-emerald-500/5 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground font-medium">Reçus</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                  {totalReceived.toFixed(2)} €
                </p>
                <p className="text-xs text-muted-foreground">{receivedPayments.length} paiement(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment List - Modern Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            En attente ({pendingPayments.length})
          </TabsTrigger>
          <TabsTrigger value="sent" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-blue-600">
            À confirmer ({sentPayments.length})
          </TabsTrigger>
          <TabsTrigger value="received" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Historique ({receivedPayments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pendingPayments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <p className="text-muted-foreground">Aucun paiement en attente</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingPayments.map((payment) => (
                <PaymentCard key={`${payment.companyId}-${payment.periodStart.getTime()}`} payment={payment} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent">
          {sentPayments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Euro className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun paiement à confirmer</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sentPayments.map((payment) => (
                <PaymentCard key={`${payment.companyId}-${payment.periodStart.getTime()}`} payment={payment} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="received">
          {receivedPayments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun paiement reçu</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {receivedPayments.map((payment) => (
                <PaymentCard key={`${payment.companyId}-${payment.periodStart.getTime()}`} payment={payment} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirm Receipt Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la réception du paiement</DialogTitle>
            <DialogDescription>
              Confirmez-vous avoir reçu ce paiement de {selectedPayment?.companyName} ?
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span>Montant</span>
                <span className="font-bold text-lg">{selectedPayment.totalAmount.toFixed(2)} €</span>
              </div>
              {selectedPayment.paymentReference && (
                <div className="flex justify-between items-center text-sm text-muted-foreground mt-1">
                  <span>Référence</span>
                  <span>{selectedPayment.paymentReference}</span>
                </div>
              )}
              {selectedPayment.sentAt && (
                <div className="flex justify-between items-center text-sm text-muted-foreground mt-1">
                  <span>Envoyé le</span>
                  <span>{format(selectedPayment.sentAt, "d MMM yyyy", { locale: fr })}</span>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleConfirmReceipt}
              disabled={confirmReceiptMutation.isPending}
            >
              {confirmReceiptMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Confirmer la réception
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute Dialog */}
      <Dialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contester le paiement</DialogTitle>
            <DialogDescription>
              Expliquez le problème rencontré avec ce paiement
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span>Entreprise</span>
                  <span className="font-medium">{selectedPayment.companyName}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span>Montant attendu</span>
                  <span className="font-bold">{selectedPayment.totalAmount.toFixed(2)} €</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dispute-reason">Motif de la contestation *</Label>
                <Textarea
                  id="dispute-reason"
                  placeholder="Ex: Montant incorrect, paiement non reçu, référence invalide..."
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisputeDialog(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDispute}
              disabled={disputePaymentMutation.isPending || !disputeReason.trim()}
            >
              {disputePaymentMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <AlertTriangle className="w-4 h-4 mr-2" />
              )}
              Envoyer la contestation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
