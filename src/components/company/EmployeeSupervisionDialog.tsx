import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Target,
  Ban,
  Car,
  Euro,
  AlertTriangle,
  Activity,
  Clock,
  Save,
  Loader2,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Employee {
  id: string;
  user_id: string;
  employee_code: string;
  department: string | null;
  job_title: string | null;
  can_create_courses: boolean;
  can_view_invoices: boolean;
  can_view_all_company_courses?: boolean;
  is_active: boolean;
  is_suspended?: boolean;
  suspended_reason?: string | null;
  suspended_at?: string | null;
  max_monthly_budget?: number | null;
  current_month_spent?: number;
  max_monthly_courses?: number | null;
  monthly_courses_count?: number;
  monthly_objective_amount?: number | null;
  monthly_objective_courses?: number | null;
  restrictions_notes?: string | null;
  last_activity_at?: string | null;
  joined_at: string;
  profile: {
    full_name: string;
    email: string;
    phone: string | null;
    profile_photo_url: string | null;
  };
}

interface EmployeeSupervisionDialogProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  companyId: string;
}

export function EmployeeSupervisionDialog({
  employee,
  open,
  onOpenChange,
  onUpdate,
  companyId,
}: EmployeeSupervisionDialogProps) {
  const [saving, setSaving] = useState(false);
  const [coursesStats, setCoursesStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    cancelled: 0,
    thisMonth: 0,
    totalSpent: 0,
  });
  
  const [formData, setFormData] = useState({
    can_create_courses: true,
    can_view_invoices: false,
    can_view_all_company_courses: false,
    max_monthly_budget: "",
    max_monthly_courses: "",
    monthly_objective_amount: "",
    monthly_objective_courses: "",
    restrictions_notes: "",
    is_suspended: false,
    suspended_reason: "",
  });

  useEffect(() => {
    if (employee && open) {
      setFormData({
        can_create_courses: employee.can_create_courses ?? true,
        can_view_invoices: employee.can_view_invoices ?? false,
        can_view_all_company_courses: employee.can_view_all_company_courses ?? false,
        max_monthly_budget: employee.max_monthly_budget?.toString() || "",
        max_monthly_courses: employee.max_monthly_courses?.toString() || "",
        monthly_objective_amount: employee.monthly_objective_amount?.toString() || "",
        monthly_objective_courses: employee.monthly_objective_courses?.toString() || "",
        restrictions_notes: employee.restrictions_notes || "",
        is_suspended: employee.is_suspended ?? false,
        suspended_reason: employee.suspended_reason || "",
      });
      fetchEmployeeStats();
    }
  }, [employee, open]);

  const fetchEmployeeStats = async () => {
    if (!employee) return;
    
    try {
      // Récupérer les statistiques des courses
      const { data: courses, error } = await supabase
        .from("company_courses")
        .select(`
          id,
          course:courses(id, status, created_at),
          created_by_employee
        `)
        .eq("employee_id", employee.id);

      if (error) throw error;

      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const stats = {
        total: courses?.length || 0,
        completed: 0,
        pending: 0,
        cancelled: 0,
        thisMonth: 0,
        totalSpent: 0,
      };

      courses?.forEach((cc: any) => {
        if (cc.course) {
          const courseDate = new Date(cc.course.created_at);
          if (courseDate >= thisMonth) {
            stats.thisMonth++;
          }
          
          switch (cc.course.status) {
            case "completed":
              stats.completed++;
              break;
            case "pending":
            case "accepted":
            case "in_progress":
              stats.pending++;
              break;
            case "cancelled":
              stats.cancelled++;
              break;
          }
        }
      });

      setCoursesStats(stats);
    } catch (error) {
      console.error("Erreur stats:", error);
    }
  };

  const handleSave = async () => {
    if (!employee) return;
    
    setSaving(true);
    try {
      const updateData: any = {
        can_create_courses: formData.can_create_courses,
        can_view_invoices: formData.can_view_invoices,
        can_view_all_company_courses: formData.can_view_all_company_courses,
        max_monthly_budget: formData.max_monthly_budget ? parseFloat(formData.max_monthly_budget) : null,
        max_monthly_courses: formData.max_monthly_courses ? parseInt(formData.max_monthly_courses) : null,
        monthly_objective_amount: formData.monthly_objective_amount ? parseFloat(formData.monthly_objective_amount) : null,
        monthly_objective_courses: formData.monthly_objective_courses ? parseInt(formData.monthly_objective_courses) : null,
        restrictions_notes: formData.restrictions_notes || null,
        is_suspended: formData.is_suspended,
        suspended_reason: formData.is_suspended ? formData.suspended_reason : null,
        suspended_at: formData.is_suspended && !employee.is_suspended ? new Date().toISOString() : employee.suspended_at,
      };

      const { error } = await supabase
        .from("company_employees")
        .update(updateData)
        .eq("id", employee.id);

      if (error) throw error;

      // Notifier le collaborateur si suspendu
      if (formData.is_suspended && !employee.is_suspended) {
        await supabase.from("notifications").insert({
          user_id: employee.user_id,
          title: "⚠️ Compte suspendu",
          message: `Votre compte collaborateur a été suspendu${formData.suspended_reason ? `: ${formData.suspended_reason}` : ""}`,
          type: "warning",
          link: "/company-employee-dashboard",
        });
      } else if (!formData.is_suspended && employee.is_suspended) {
        await supabase.from("notifications").insert({
          user_id: employee.user_id,
          title: "✅ Compte réactivé",
          message: "Votre compte collaborateur a été réactivé",
          type: "success",
          link: "/company-employee-dashboard",
        });
      }

      toast.success("Paramètres mis à jour");
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  if (!employee) return null;

  const budgetProgress = formData.max_monthly_budget && employee.current_month_spent
    ? (employee.current_month_spent / parseFloat(formData.max_monthly_budget)) * 100
    : 0;
  
  const coursesProgress = formData.max_monthly_courses && employee.monthly_courses_count
    ? (employee.monthly_courses_count / parseInt(formData.max_monthly_courses)) * 100
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {employee.profile?.profile_photo_url ? (
                <img
                  src={employee.profile.profile_photo_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium text-primary">
                  {employee.profile?.full_name?.charAt(0) || "?"}
                </span>
              )}
            </div>
            <div>
              <span>{employee.profile?.full_name || "Collaborateur"}</span>
              <p className="text-sm font-normal text-muted-foreground">
                {employee.department || "Pas de service"} • Code: {employee.employee_code}
              </p>
            </div>
          </DialogTitle>
          <DialogDescription>
            Superviser et configurer les paramètres de ce collaborateur
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Statistiques d'activité */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Activité du mois
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{coursesStats.thisMonth}</p>
                  <p className="text-xs text-muted-foreground">Courses ce mois</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{coursesStats.completed}</p>
                  <p className="text-xs text-muted-foreground">Terminées</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-600">{coursesStats.pending}</p>
                  <p className="text-xs text-muted-foreground">En cours</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{coursesStats.cancelled}</p>
                  <p className="text-xs text-muted-foreground">Annulées</p>
                </div>
              </div>
              {employee.last_activity_at && (
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Dernière activité: {format(new Date(employee.last_activity_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Permissions */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Target className="w-4 h-4" />
              Permissions
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label>Créer des courses</Label>
                  <p className="text-xs text-muted-foreground">Peut réserver des VTC</p>
                </div>
                <Switch
                  checked={formData.can_create_courses}
                  onCheckedChange={(checked) => setFormData({ ...formData, can_create_courses: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label>Voir ses factures</Label>
                  <p className="text-xs text-muted-foreground">Accès à ses propres factures</p>
                </div>
                <Switch
                  checked={formData.can_view_invoices}
                  onCheckedChange={(checked) => setFormData({ ...formData, can_view_invoices: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label>Voir toutes les courses entreprise</Label>
                  <p className="text-xs text-muted-foreground">Accès aux courses des autres collaborateurs</p>
                </div>
                <Switch
                  checked={formData.can_view_all_company_courses}
                  onCheckedChange={(checked) => setFormData({ ...formData, can_view_all_company_courses: checked })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Limites */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Ban className="w-4 h-4" />
              Limites mensuelles
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_budget" className="flex items-center gap-2">
                  <Euro className="w-4 h-4" />
                  Budget maximum (€)
                </Label>
                <Input
                  id="max_budget"
                  type="number"
                  placeholder="Illimité"
                  value={formData.max_monthly_budget}
                  onChange={(e) => setFormData({ ...formData, max_monthly_budget: e.target.value })}
                />
                {formData.max_monthly_budget && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Utilisé: {employee.current_month_spent?.toFixed(2) || 0}€</span>
                      <span className={budgetProgress > 80 ? "text-red-600" : ""}>
                        {budgetProgress.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${budgetProgress > 80 ? "bg-red-600" : "bg-primary"}`}
                        style={{ width: `${Math.min(budgetProgress, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="max_courses" className="flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Courses maximum
                </Label>
                <Input
                  id="max_courses"
                  type="number"
                  placeholder="Illimité"
                  value={formData.max_monthly_courses}
                  onChange={(e) => setFormData({ ...formData, max_monthly_courses: e.target.value })}
                />
                {formData.max_monthly_courses && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Utilisé: {employee.monthly_courses_count || 0}</span>
                      <span className={coursesProgress > 80 ? "text-red-600" : ""}>
                        {coursesProgress.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${coursesProgress > 80 ? "bg-red-600" : "bg-primary"}`}
                        style={{ width: `${Math.min(coursesProgress, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Objectifs */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Objectifs mensuels (optionnel)
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="objective_amount">Objectif montant (€)</Label>
                <Input
                  id="objective_amount"
                  type="number"
                  placeholder="Ex: 500"
                  value={formData.monthly_objective_amount}
                  onChange={(e) => setFormData({ ...formData, monthly_objective_amount: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="objective_courses">Objectif nombre de courses</Label>
                <Input
                  id="objective_courses"
                  type="number"
                  placeholder="Ex: 10"
                  value={formData.monthly_objective_courses}
                  onChange={(e) => setFormData({ ...formData, monthly_objective_courses: e.target.value })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Notes et restrictions */}
          <div className="space-y-4">
            <Label htmlFor="notes">Notes / Restrictions particulières</Label>
            <Textarea
              id="notes"
              placeholder="Notes internes sur ce collaborateur..."
              value={formData.restrictions_notes}
              onChange={(e) => setFormData({ ...formData, restrictions_notes: e.target.value })}
              rows={3}
            />
          </div>

          <Separator />

          {/* Suspension */}
          <Card className={formData.is_suspended ? "border-red-600/50 bg-red-50/50 dark:bg-red-950/20" : ""}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-5 h-5 mt-0.5 ${formData.is_suspended ? "text-red-600" : "text-muted-foreground"}`} />
                  <div>
                    <Label className="text-base">Suspendre le compte</Label>
                    <p className="text-sm text-muted-foreground">
                      Le collaborateur ne pourra plus créer de courses
                    </p>
                    {employee.is_suspended && employee.suspended_at && (
                      <Badge variant="destructive" className="mt-2">
                        Suspendu depuis le {format(new Date(employee.suspended_at), "dd/MM/yyyy", { locale: fr })}
                      </Badge>
                    )}
                  </div>
                </div>
                <Switch
                  checked={formData.is_suspended}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_suspended: checked })}
                />
              </div>
              
              {formData.is_suspended && (
                <div className="mt-4 space-y-2">
                  <Label htmlFor="suspended_reason">Motif de suspension</Label>
                  <Input
                    id="suspended_reason"
                    placeholder="Raison de la suspension..."
                    value={formData.suspended_reason}
                    onChange={(e) => setFormData({ ...formData, suspended_reason: e.target.value })}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Enregistrer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}