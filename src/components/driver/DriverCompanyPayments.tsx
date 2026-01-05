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
            billing_address
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

  // Confirm receipt mutation
  const confirmReceiptMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      const { data, error } = await supabase
        .from("company_payments")
        .update({
          status: "received",
          received_at: new Date().toISOString(),
          received_confirmed_by_user_id: userId
        })
        .eq("id", paymentId)
        .select()
        .single();

      if (error) throw error;

      // Mark related invoices as paid
      if (data.course_ids && data.course_ids.length > 0) {
        await supabase
          .from("factures")
          .update({ 
            payment_status: "paid",
            paid_at: new Date().toISOString()
          })
          .in("course_id", data.course_ids);
      }

      // Notify company
      const { data: companyData } = await supabase
        .from("companies")
        .select("user_id")
        .eq("id", data.company_id)
        .single();

      if (companyData?.user_id) {
        await supabase.from("notifications").insert({
          user_id: companyData.user_id,
          title: "✅ Paiement confirmé",
          message: `Le chauffeur a confirmé la réception du paiement de ${data.amount}€`,
          type: "payment",
          link: "/company-dashboard?tab=payments"
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-company-payments-tracking"] });
      queryClient.invalidateQueries({ queryKey: ["driver-company-invoices"] });
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

    // Check for existing payments
    const paymentsByKey = (companyPayments || []).reduce((acc: any, payment: any) => {
      const key = `${payment.company_id}-${payment.period_start}`;
      acc[key] = payment;
      return acc;
    }, {});

    // Group invoices by company
    const invoicesByCompany = companyInvoices.reduce((acc: any, invoice: any) => {
      if (!acc[invoice.company_id]) {
        acc[invoice.company_id] = [];
      }
      acc[invoice.company_id].push(invoice);
      return acc;
    }, {});

    // Process each company's invoices
    agreements?.forEach((agreement: any) => {
      const companyInvoicesForAgreement = invoicesByCompany[agreement.company_id] || [];
      if (companyInvoicesForAgreement.length === 0) return;

      const paymentFrequency = agreement.payment_frequency || "per_course";
      const paymentDay = agreement.payment_day || 1;

      // Separate paid and unpaid
      const unpaidInvoices = companyInvoicesForAgreement.filter((i: any) => i.payment_status !== "paid");

      if (paymentFrequency === "per_course") {
        unpaidInvoices.forEach((invoice: any) => {
          const invoiceDate = new Date(invoice.created_at);
          const dueDate = addDays(invoiceDate, 7);
          const paymentKey = `${agreement.company_id}-${invoiceDate.toISOString()}`;
          const existingPayment = paymentsByKey[paymentKey];
          
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
            status: existingPayment?.status === "received" ? 'received' :
                   existingPayment?.dispute_status === "pending" ? 'disputed' :
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
          const paymentKey = `${agreement.company_id}-${weekStart.toISOString()}`;
          const existingPayment = paymentsByKey[paymentKey];

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
            status: existingPayment?.status === "received" ? 'received' :
                   existingPayment?.dispute_status === "pending" ? 'disputed' :
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
          const paymentKey = `${agreement.company_id}-${monthStart.toISOString()}`;
          const existingPayment = paymentsByKey[paymentKey];

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
            status: existingPayment?.status === "received" ? 'received' :
                   existingPayment?.dispute_status === "pending" ? 'disputed' :
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
      return a.dueDate.getTime() - b.dueDate.getTime();
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
    if (!selectedPayment?.paymentId) return;
    confirmReceiptMutation.mutate(selectedPayment.paymentId);
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
        return <Badge variant="destructive">En retard</Badge>;
      case 'due':
        return <Badge className="bg-yellow-500">À recevoir</Badge>;
      case 'sent':
        return <Badge className="bg-blue-500">Paiement envoyé</Badge>;
      case 'received':
        return <Badge className="bg-green-500">Reçu</Badge>;
      case 'disputed':
        return <Badge variant="destructive">Contesté</Badge>;
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
    <Card key={`${payment.companyId}-${payment.periodStart.getTime()}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-primary/10">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className="font-medium truncate">{payment.companyName}</h4>
              {getStatusBadge(payment.status)}
            </div>
            
            <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {getPeriodLabel(payment)}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {payment.invoiceCount} facture(s)
              </span>
              <Badge variant="outline" className="text-xs">
                {getFrequencyLabel(payment.paymentFrequency)}
              </Badge>
            </div>

            {payment.sentAt && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-blue-600">
                  💸 Paiement envoyé le {format(payment.sentAt, "d MMM yyyy à HH:mm", { locale: fr })}
                  {payment.paymentReference && (
                    <span className="block text-muted-foreground">Réf: {payment.paymentReference}</span>
                  )}
                </p>
                
                {/* Justificatifs */}
                {payment.documents && payment.documents.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {payment.documents.map((doc: any) => (
                      <a
                        key={doc.id}
                        href={doc.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-muted rounded hover:bg-muted/80"
                      >
                        <FileText className="w-3 h-3" />
                        {doc.file_name?.substring(0, 15) || "Justificatif"}...
                      </a>
                    ))}
                  </div>
                )}
                
                {/* Facture consolidée */}
                {payment.consolidatedInvoiceNumber && (
                  <Badge variant="secondary" className="text-xs">
                    📄 {payment.consolidatedInvoiceNumber}
                  </Badge>
                )}
              </div>
            )}
            
            <div className="flex items-center justify-between mt-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  Échéance: {format(payment.dueDate, "d MMM yyyy", { locale: fr })}
                </p>
                <p className="text-lg font-bold text-primary">
                  {payment.totalAmount.toFixed(2)} €
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadRecap(payment)}
                >
                  <Download className="w-4 h-4" />
                </Button>
                
                {payment.status === 'sent' && payment.paymentId && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDispute(payment)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Contester
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => openConfirmDialog(payment)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Confirmer
                    </Button>
                  </>
                )}
                
                {payment.status === 'overdue' && !payment.paymentId && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => openDispute(payment)}
                  >
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    Relancer
                  </Button>
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
      <div>
        <h2 className="text-xl font-semibold">Paiements entreprises</h2>
        <p className="text-sm text-muted-foreground">
          Suivi des montants à percevoir de vos entreprises partenaires
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={pendingPayments.filter(p => p.status === 'overdue').length > 0 ? "border-destructive" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-500/10">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-xl font-bold">{totalPending.toFixed(2)} €</p>
                <p className="text-xs text-muted-foreground">{pendingPayments.length} paiement(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/10">
                <Euro className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">À confirmer</p>
                <p className="text-xl font-bold">{totalSent.toFixed(2)} €</p>
                <p className="text-xs text-muted-foreground">{sentPayments.length} paiement(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reçus</p>
                <p className="text-xl font-bold">{totalReceived.toFixed(2)} €</p>
                <p className="text-xs text-muted-foreground">{receivedPayments.length} paiement(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            En attente ({pendingPayments.length})
          </TabsTrigger>
          <TabsTrigger value="sent" className={sentPayments.length > 0 ? "text-blue-600" : ""}>
            À confirmer ({sentPayments.length})
          </TabsTrigger>
          <TabsTrigger value="received">
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
