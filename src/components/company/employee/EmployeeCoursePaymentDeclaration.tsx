import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Loader2, 
  CheckCircle2,
  Building2,
  User,
  Calendar,
  ArrowRight,
  Banknote,
  Receipt,
  AlertTriangle,
  Car,
  Clock,
  ShieldCheck,
  CreditCard,
  Wallet,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface CompletedCourse {
  id: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  amount: number | null;
  driver_name: string | null;
  company_course_id: string;
  driver_declared_paid: boolean;
  company_payment_status: string | null;
  employee_confirmed: boolean;
}

interface EmployeeCoursePaymentDeclarationProps {
  employeeId: string;
  companyId: string;
  onExpenseCreated?: () => void;
}

export function EmployeeCoursePaymentDeclaration({ 
  employeeId, 
  companyId,
  onExpenseCreated 
}: EmployeeCoursePaymentDeclarationProps) {
  const [courses, setCourses] = useState<CompletedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<CompletedCourse | null>(null);
  const [declaring, setDeclaring] = useState(false);

  useEffect(() => {
    fetchUnconfirmedCourses();
  }, [employeeId]);

  const fetchUnconfirmedCourses = async () => {
    try {
      const { data: companyCourses, error } = await supabase
        .from("company_courses")
        .select(`
          id,
          actual_payment_method,
          client_confirmed_payment_method,
          course:courses!inner(
            id,
            pickup_address,
            destination_address,
            scheduled_date,
            status,
            driver_id,
            company_payment_status,
            driver_declared_payment_received
          )
        `)
        .eq("employee_id", employeeId)
        .is("client_confirmed_payment_method", null);

      if (error) throw error;

      const enrichedCourses: CompletedCourse[] = [];

      for (const cc of companyCourses || []) {
        const course = cc.course as any;
        if (course.status !== "completed") continue;

        let driverName = null;
        let amount = null;

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

        const { data: devis } = await supabase
          .from("devis")
          .select("amount")
          .eq("course_id", course.id)
          .eq("status", "accepted")
          .maybeSingle();
        
        amount = devis?.amount || null;

        const driverDeclaredPaid = course.driver_declared_payment_received === true ||
          course.company_payment_status === "paid_on_spot";

        enrichedCourses.push({
          id: course.id,
          pickup_address: course.pickup_address,
          destination_address: course.destination_address,
          scheduled_date: course.scheduled_date,
          amount,
          driver_name: driverName,
          company_course_id: cc.id,
          driver_declared_paid: driverDeclaredPaid,
          company_payment_status: course.company_payment_status,
          employee_confirmed: !!cc.client_confirmed_payment_method,
        });
      }

      setCourses(enrichedCourses);
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  };

  // paymentType: "company_will_pay" | "paid_company_card" | "paid_personal"
  const handleConfirmPayment = async (paymentType: "company_will_pay" | "paid_company_card" | "paid_personal") => {
    if (!selectedCourse) return;

    setDeclaring(true);
    try {
      const isPaidOnSpot = paymentType === "paid_personal" || paymentType === "paid_company_card";
      const requiresExpenseReport = paymentType === "paid_personal";

      // Determine actual_payment_method
      const actualMethod = paymentType === "paid_personal" 
        ? "employee_personal" 
        : paymentType === "paid_company_card" 
          ? "company_card_spot" 
          : "company_account";

      // Update company_courses with employee confirmation
      const { error: updateError } = await supabase
        .from("company_courses")
        .update({
          actual_payment_method: actualMethod,
          client_confirmed_payment_method: paymentType,
          client_confirmed_at: new Date().toISOString(),
          payment_declared_at: new Date().toISOString(),
        })
        .eq("id", selectedCourse.company_course_id);

      if (updateError) throw updateError;

      // Update course with confirmation
      await supabase
        .from("courses")
        .update({
          client_payment_confirmation: paymentType,
          client_payment_confirmation_at: new Date().toISOString(),
          company_payment_status: isPaidOnSpot ? "paid_on_spot" : "company_will_pay",
        })
        .eq("id", selectedCourse.id);

      // If paid on spot (either type), mark invoice as paid
      if (isPaidOnSpot) {
        await supabase
          .from("factures")
          .update({
            payment_status: "paid",
            paid_at: new Date().toISOString()
          })
          .eq("course_id", selectedCourse.id);

        // Create expense report ONLY for personal payment
        if (requiresExpenseReport && selectedCourse.amount) {
          const { error: expenseError } = await supabase.rpc(
            "create_expense_report_for_course",
            {
              p_course_id: selectedCourse.id,
              p_employee_id: employeeId,
              p_amount: selectedCourse.amount
            }
          );

          if (expenseError) {
            console.error("Expense error:", expenseError);
          }

          toast.success("Note de frais créée !", {
            description: `${selectedCourse.amount.toFixed(2)} € transmise à l'entreprise pour remboursement`
          });
          
          onExpenseCreated?.();
        } else if (paymentType === "paid_company_card") {
          toast.success("Paiement carte entreprise confirmé ✓", {
            description: "Aucune note de frais nécessaire"
          });
        }
      } else {
        toast.success("Double vérification validée ✓", {
          description: "Facturation entreprise confirmée"
        });
      }

      setSelectedCourse(null);
      fetchUnconfirmedCourses();
    } catch (error) {
      console.error("Error declaring payment:", error);
      toast.error("Erreur lors de la confirmation");
    } finally {
      setDeclaring(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (courses.length === 0) {
    return null;
  }

  return (
    <>
      {/* Alert Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 p-1 shadow-xl">
        <div className="relative rounded-xl bg-background/95 backdrop-blur-sm p-5">
          {/* Animated pulse indicator */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Action requise
            </span>
          </div>

          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shrink-0">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                Double vérification
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Confirmez la déclaration du chauffeur pour {courses.length} course{courses.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Info message */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-4">
            <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-400">
              <strong>Note :</strong> Les factures sont déjà transmises à l'entreprise. Votre confirmation ajoute une double vérification sécurisée.
            </p>
          </div>

          {/* Course Cards */}
          <div className="space-y-3">
            {courses.map((course) => (
              <div
                key={course.id}
                className="group relative overflow-hidden rounded-xl border-2 border-border/50 bg-card hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
              >
                {/* Left colored bar based on driver declaration */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                  course.driver_declared_paid 
                    ? "bg-gradient-to-b from-emerald-400 to-emerald-600" 
                    : "bg-gradient-to-b from-blue-400 to-blue-600"
                }`} />
                
                <div className="p-4 pl-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Driver declaration badge - prominent */}
                      <div className="mb-3">
                        {course.driver_declared_paid ? (
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <Banknote className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                              Chauffeur indique : Payé sur place
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                            <Building2 className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                              Chauffeur indique : Facturer entreprise
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Route */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="font-medium text-sm">{course.pickup_address.split(",")[0]}</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="font-medium text-sm">{course.destination_address.split(",")[0]}</span>
                        </div>
                      </div>

                      {/* Meta info */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(course.scheduled_date), "dd MMM yyyy", { locale: fr })}
                        </div>
                        {course.driver_name && (
                          <div className="flex items-center gap-1">
                            <Car className="w-3.5 h-3.5" />
                            {course.driver_name}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right side - Amount + Action */}
                    <div className="flex flex-col items-end gap-2">
                      {course.amount && (
                        <div className="text-xl font-bold text-foreground">
                          {course.amount.toFixed(2)} €
                        </div>
                      )}
                      <Button 
                        size="sm"
                        onClick={() => setSelectedCourse(course)}
                        className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-md"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Confirmer
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 pb-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-primary" />
                </div>
                Confirmation de paiement
              </DialogTitle>
              <DialogDescription className="mt-2">
                Vérifiez et confirmez le mode de paiement de cette course
              </DialogDescription>
            </DialogHeader>
          </div>

          {selectedCourse && (
            <div className="p-6 pt-2 space-y-5">
              {/* Course summary card */}
              <div className="rounded-xl bg-muted/50 border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-medium">{selectedCourse.pickup_address.split(",")[0]}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="font-medium">{selectedCourse.destination_address.split(",")[0]}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(selectedCourse.scheduled_date), "EEEE dd MMMM yyyy", { locale: fr })}
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    {selectedCourse.amount?.toFixed(2)} €
                  </div>
                </div>
              </div>

              {/* Driver declaration - highlighted */}
              <div className={`p-4 rounded-xl border-2 ${
                selectedCourse.driver_declared_paid 
                  ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
                  : "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800"
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedCourse.driver_declared_paid 
                      ? "bg-emerald-500/20" 
                      : "bg-blue-500/20"
                  }`}>
                    {selectedCourse.driver_declared_paid ? (
                      <Banknote className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Building2 className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold">
                      {selectedCourse.driver_declared_paid 
                        ? "Le chauffeur indique : Payé sur place"
                        : "Le chauffeur indique : À facturer"
                      }
                    </div>
                    <div className={`text-sm ${
                      selectedCourse.driver_declared_paid 
                        ? "text-emerald-600 dark:text-emerald-400" 
                        : "text-blue-600 dark:text-blue-400"
                    }`}>
                      {selectedCourse.driver_declared_paid 
                        ? "Vous avez réglé directement le chauffeur"
                        : "L'entreprise sera facturée"
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* Confirmation question */}
              <div className="text-center py-2">
                <p className="font-semibold text-lg">Cette information est-elle correcte ?</p>
              </div>

              {/* Action buttons - 3 options */}
              <div className="grid grid-cols-1 gap-3">
                {/* Option 1: Facturer entreprise */}
                <Button
                  size="lg"
                  className="h-auto py-4 bg-blue-600 hover:bg-blue-700 shadow-lg"
                  onClick={() => handleConfirmPayment("company_will_pay")}
                  disabled={declaring}
                >
                  {declaring ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <div className="flex items-center gap-3">
                      <Building2 className="w-6 h-6" />
                      <div className="text-left">
                        <div className="font-bold">Facturer l'entreprise</div>
                        <div className="text-xs opacity-80 font-normal">Paiement différé via compte entreprise</div>
                      </div>
                    </div>
                  )}
                </Button>

                {/* Option 2: Carte entreprise */}
                <Button
                  variant="outline"
                  size="lg"
                  className="h-auto py-4 border-2 border-purple-300 hover:bg-purple-50 dark:border-purple-700 dark:hover:bg-purple-950"
                  onClick={() => handleConfirmPayment("paid_company_card")}
                  disabled={declaring}
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                    <div className="text-left">
                      <div className="font-medium">Payé avec la carte entreprise</div>
                      <div className="text-xs text-muted-foreground">Pas de remboursement nécessaire</div>
                    </div>
                  </div>
                </Button>

                {/* Option 3: Frais personnels */}
                <Button
                  variant="outline"
                  size="lg"
                  className="h-auto py-4 border-2 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-700 dark:hover:bg-emerald-950"
                  onClick={() => handleConfirmPayment("paid_personal")}
                  disabled={declaring}
                >
                  <div className="flex items-center gap-3">
                    <Wallet className="w-5 h-5 text-emerald-600" />
                    <div className="text-left">
                      <div className="font-medium">Payé à titre personnel</div>
                      <div className="text-xs text-muted-foreground">Note de frais à rembourser</div>
                    </div>
                  </div>
                </Button>
              </div>

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setSelectedCourse(null)}
                disabled={declaring}
              >
                Annuler
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
