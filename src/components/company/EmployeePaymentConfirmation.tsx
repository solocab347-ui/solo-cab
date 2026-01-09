import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Building2, 
  Banknote, 
  CheckCircle, 
  Loader2,
  ShieldCheck,
  Info,
  MapPin,
  Calendar,
  CreditCard,
  Wallet
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface EmployeePaymentConfirmationProps {
  employeeId: string;
}

interface PendingCourse {
  id: string;
  course_id: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  company_payment_status: string;
  driver_declared_payment_received: boolean;
  client_payment_confirmation: string | null;
  amount: number;
  driver_name: string | null;
}

export function EmployeePaymentConfirmation({ employeeId }: EmployeePaymentConfirmationProps) {
  const queryClient = useQueryClient();
  const [selectedChoice, setSelectedChoice] = useState<Record<string, string>>({});

  // Récupérer les courses terminées qui nécessitent une confirmation
  const { data: pendingCourses, isLoading } = useQuery({
    queryKey: ["employee-payment-confirmation", employeeId],
    queryFn: async () => {
      // Récupérer les courses de cet employé qui sont terminées et en attente de confirmation
      const { data: companyCourses, error } = await supabase
        .from("company_courses")
        .select(`
          id,
          course_id,
          course:courses!inner(
            id,
            pickup_address,
            destination_address,
            scheduled_date,
            status,
            company_payment_status,
            driver_declared_payment_received,
            client_payment_confirmation,
            driver_id
          )
        `)
        .eq("employee_id", employeeId);

      if (error) throw error;

      // Filtrer les courses terminées qui nécessitent confirmation
      const needsConfirmation = companyCourses?.filter((cc: any) => {
        const course = cc.course;
        return (
          course.status === "completed" &&
          course.company_payment_status === "company_will_pay" &&
          !course.client_payment_confirmation
        );
      }) || [];

      // Récupérer les informations des chauffeurs et les montants
      const enriched: PendingCourse[] = [];
      
      for (const cc of needsConfirmation) {
        const course = cc.course as any;
        
        // Récupérer le devis accepté pour le montant
        const { data: devis } = await supabase
          .from("devis")
          .select("amount")
          .eq("course_id", course.id)
          .eq("status", "accepted")
          .maybeSingle();
        
        // Récupérer le nom du chauffeur
        let driverName = null;
        if (course.driver_id) {
          const { data: driver } = await supabase
            .from("drivers")
            .select("user_id")
            .eq("id", course.driver_id)
            .maybeSingle();
          
          if (driver?.user_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", driver.user_id)
              .maybeSingle();
            driverName = profile?.full_name || null;
          }
        }

        enriched.push({
          id: cc.id,
          course_id: course.id,
          pickup_address: course.pickup_address,
          destination_address: course.destination_address,
          scheduled_date: course.scheduled_date,
          company_payment_status: course.company_payment_status,
          driver_declared_payment_received: course.driver_declared_payment_received,
          client_payment_confirmation: course.client_payment_confirmation,
          amount: devis?.amount || 0,
          driver_name: driverName
        });
      }

      return enriched;
    }
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async ({ courseId, type, employeeId: empId, amount }: { 
      courseId: string; 
      type: string; 
      employeeId: string;
      amount: number;
    }) => {
      const isPaidOnSpot = type === "paid_personal" || type === "paid_company_card";
      const requiresExpenseReport = type === "paid_personal";

      const updateData: any = {
        client_payment_confirmation: type,
        client_payment_confirmation_at: new Date().toISOString()
      };

      if (isPaidOnSpot) {
        updateData.company_payment_status = "paid_on_spot";
        updateData.employee_declared_paid_at = new Date().toISOString();
      }

      const { error: courseError } = await supabase
        .from("courses")
        .update(updateData)
        .eq("id", courseId);

      if (courseError) throw courseError;

      // Mettre à jour company_courses
      const actualMethod = type === "paid_personal" 
        ? "employee_personal" 
        : type === "paid_company_card" 
          ? "company_card_spot" 
          : "company_deferred";

      const { error: ccError } = await supabase
        .from("company_courses")
        .update({
          client_confirmed_payment_method: type,
          client_confirmed_at: new Date().toISOString(),
          actual_payment_method: actualMethod,
          payment_declared_at: new Date().toISOString(),
          payment_declared_by: "employee"
        })
        .eq("course_id", courseId);

      if (ccError) throw ccError;

      // Si payé sur place, mettre à jour la facture
      if (isPaidOnSpot) {
        await supabase
          .from("factures")
          .update({ 
            payment_status: "paid",
            paid_at: new Date().toISOString()
          })
          .eq("course_id", courseId);

        // Créer la note de frais UNIQUEMENT si frais personnels
        if (requiresExpenseReport && amount > 0) {
          await supabase.rpc("create_expense_report_for_course", {
            p_course_id: courseId,
            p_employee_id: empId,
            p_amount: amount
          });
        }
      }

      return { type, requiresExpenseReport };
    },
    onSuccess: ({ type, requiresExpenseReport }) => {
      queryClient.invalidateQueries({ queryKey: ["employee-payment-confirmation"] });
      
      if (type === "paid_personal") {
        toast.success("Note de frais créée", {
          description: "Votre remboursement sera traité par l'entreprise"
        });
      } else if (type === "paid_company_card") {
        toast.success("Paiement carte entreprise confirmé", {
          description: "Aucune note de frais nécessaire"
        });
      } else {
        toast.success("Confirmation enregistrée", {
          description: "L'entreprise sera facturée"
        });
      }
    },
    onError: () => {
      toast.error("Erreur lors de la confirmation");
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pendingCourses || pendingCourses.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-600" />
          Confirmations de paiement requises
        </CardTitle>
        <CardDescription>
          Le chauffeur a indiqué que ces courses n'ont pas été payées sur place. 
          Veuillez confirmer pour chaque course.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingCourses.map((course) => (
          <div key={course.id} className="p-4 border rounded-lg bg-background space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {format(new Date(course.scheduled_date), "EEEE d MMMM à HH:mm", { locale: fr })}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="truncate">{course.pickup_address.split(",")[0]}</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span className="truncate">{course.destination_address.split(",")[0]}</span>
                </div>
                {course.driver_name && (
                  <p className="text-xs text-muted-foreground">Chauffeur: {course.driver_name}</p>
                )}
              </div>
              <Badge variant="outline" className="text-lg font-semibold">
                {course.amount.toFixed(2)}€
              </Badge>
            </div>

            <Alert className="border-blue-500/50 bg-blue-500/10">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-700">
                Le chauffeur a déclaré ne pas avoir reçu de paiement. Confirmez cette information.
              </AlertDescription>
            </Alert>

            <RadioGroup 
              value={selectedChoice[course.course_id] || ""} 
              onValueChange={(val) => setSelectedChoice(prev => ({ ...prev, [course.course_id]: val }))}
              className="space-y-2"
            >
              {/* Option 1: Non payé - Facturer entreprise */}
              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="company_will_pay" id={`confirm_${course.course_id}`} className="mt-0.5" />
                <Label htmlFor={`confirm_${course.course_id}`} className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">Je confirme ne pas avoir payé</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    L'entreprise réglera directement le chauffeur
                  </p>
                </Label>
              </div>
              
              {/* Option 2: Payé avec carte entreprise */}
              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors border-purple-200 dark:border-purple-800">
                <RadioGroupItem value="paid_company_card" id={`paid_company_${course.course_id}`} className="mt-0.5" />
                <Label htmlFor={`paid_company_${course.course_id}`} className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-purple-600" />
                    <span className="font-medium">Payé avec la carte entreprise</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    J'ai utilisé ma carte professionnelle • Pas de remboursement
                  </p>
                </Label>
              </div>

              {/* Option 3: Payé frais personnels */}
              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors border-emerald-200 dark:border-emerald-800">
                <RadioGroupItem value="paid_personal" id={`paid_personal_${course.course_id}`} className="mt-0.5" />
                <Label htmlFor={`paid_personal_${course.course_id}`} className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-600" />
                    <span className="font-medium">Payé à titre personnel</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    J'ai avancé les frais • Note de frais à rembourser
                  </p>
                </Label>
              </div>
            </RadioGroup>

            <Button
              className="w-full"
              onClick={() => confirmPaymentMutation.mutate({ 
                courseId: course.course_id, 
                type: selectedChoice[course.course_id],
                employeeId,
                amount: course.amount
              })}
              disabled={!selectedChoice[course.course_id] || confirmPaymentMutation.isPending}
            >
              {confirmPaymentMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Confirmer
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
