import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  UserPlus,
  Link2,
  Copy,
  Check,
  MoreVertical,
  Mail,
  Clock,
  XCircle,
  Car,
  FileText,
  Loader2,
  RefreshCw,
  Settings2,
  AlertTriangle,
  Target,
  Euro,
  Crown,
  User,
  Briefcase,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { EmployeeSupervisionDialog } from "./EmployeeSupervisionDialog";

interface Employee {
  id: string;
  user_id: string;
  employee_code: string;
  department: string | null;
  job_title: string | null;
  can_create_courses: boolean;
  can_view_invoices: boolean;
  can_invite_drivers: boolean;
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

interface Invitation {
  id: string;
  token: string;
  email: string | null;
  employee_name: string | null;
  department: string | null;
  can_create_courses: boolean;
  can_view_invoices: boolean;
  can_invite_drivers: boolean;
  is_used: boolean;
  expires_at: string;
  created_at: string;
}

interface CompanyEmployeesManagerProps {
  companyId: string;
}

export function CompanyEmployeesManager({ companyId }: CompanyEmployeesManagerProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [creatingInvitation, setCreatingInvitation] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showSupervisionDialog, setShowSupervisionDialog] = useState(false);
  
  const [inviteStep, setInviteStep] = useState<"type" | "details">("type");
  const [employeeType, setEmployeeType] = useState<"autonomous" | "managed" | null>(null);
  
  const [inviteForm, setInviteForm] = useState({
    email: "",
    employeeName: "",
    department: "",
    canCreateCourses: true,
    canViewInvoices: true,
    canInviteDrivers: false,
    maxMonthlyBudget: "",
  });

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Récupérer les employés
      const { data: employeesData, error: empError } = await supabase
        .from("company_employees")
        .select("*")
        .eq("company_id", companyId)
        .order("joined_at", { ascending: false });

      if (empError) throw empError;

      // Récupérer les profils des employés
      const employeesWithProfiles = await Promise.all(
        (employeesData || []).map(async (emp) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email, phone, profile_photo_url")
            .eq("id", emp.user_id)
            .maybeSingle();
          return { 
            ...emp, 
            profile: profile || { full_name: "Non renseigné", email: "", phone: null, profile_photo_url: null } 
          };
        })
      );

      // Récupérer les invitations en attente
      const { data: invitationsData, error: invError } = await supabase
        .from("company_employee_invitations")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_used", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (invError) throw invError;

      setEmployees(employeesWithProfiles as Employee[]);
      setInvitations(invitationsData || []);
    } catch (error) {
      console.error("Erreur chargement:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const createInvitation = async () => {
    setCreatingInvitation(true);
    try {
      const { data, error } = await supabase
        .from("company_employee_invitations")
        .insert({
          company_id: companyId,
          email: inviteForm.email || null,
          employee_name: inviteForm.employeeName || null,
          department: inviteForm.department || null,
          can_create_courses: inviteForm.canCreateCourses,
          can_view_invoices: inviteForm.canViewInvoices,
          can_invite_drivers: inviteForm.canInviteDrivers,
          max_monthly_budget: inviteForm.maxMonthlyBudget ? parseFloat(inviteForm.maxMonthlyBudget) : null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      setInvitations([data, ...invitations]);
      setShowInviteDialog(false);
      setInviteStep("type");
      setEmployeeType(null);
      setInviteForm({
        email: "",
        employeeName: "",
        department: "",
        canCreateCourses: true,
        canViewInvoices: true,
        canInviteDrivers: false,
        maxMonthlyBudget: "",
      });
      
      toast.success("Invitation créée avec succès");
      
      // Copier le lien automatiquement
      const link = `${window.location.origin}/register-employee?token=${data.token}`;
      await navigator.clipboard.writeText(link);
      setCopiedLink(data.id);
      setTimeout(() => setCopiedLink(null), 3000);
      toast.success("Lien copié dans le presse-papier !");
    } catch (error) {
      console.error("Erreur création invitation:", error);
      toast.error("Erreur lors de la création de l'invitation");
    } finally {
      setCreatingInvitation(false);
    }
  };

  const copyInvitationLink = async (invitation: Invitation) => {
    const link = `${window.location.origin}/register-employee?token=${invitation.token}`;
    await navigator.clipboard.writeText(link);
    setCopiedLink(invitation.id);
    setTimeout(() => setCopiedLink(null), 3000);
    toast.success("Lien copié !");
  };

  const deleteInvitation = async (id: string) => {
    try {
      const { error } = await supabase
        .from("company_employee_invitations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setInvitations(invitations.filter(inv => inv.id !== id));
      toast.success("Invitation supprimée");
    } catch (error) {
      console.error("Erreur suppression:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const toggleEmployeePermission = async (employeeId: string, field: "can_create_courses" | "can_view_invoices" | "can_invite_drivers", value: boolean) => {
    try {
      const { error } = await supabase
        .from("company_employees")
        .update({ [field]: value })
        .eq("id", employeeId);

      if (error) throw error;

      setEmployees(employees.map(emp =>
        emp.id === employeeId ? { ...emp, [field]: value } : emp
      ));
      toast.success("Permission mise à jour");
    } catch (error) {
      console.error("Erreur mise à jour:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const toggleEmployeeStatus = async (employeeId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("company_employees")
        .update({ is_active: isActive })
        .eq("id", employeeId);

      if (error) throw error;

      setEmployees(employees.map(emp =>
        emp.id === employeeId ? { ...emp, is_active: isActive } : emp
      ));
      toast.success(isActive ? "Collaborateur réactivé" : "Collaborateur désactivé");
    } catch (error) {
      console.error("Erreur mise à jour:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Collaborateurs
          </h2>
          <p className="text-sm text-muted-foreground">
            {employees.filter(e => e.is_active).length} actif(s) • {invitations.length} invitation(s) en attente
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Dialog open={showInviteDialog} onOpenChange={(open) => {
            setShowInviteDialog(open);
            if (!open) {
              setInviteStep("type");
              setEmployeeType(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="w-4 h-4 mr-2" />
                Inviter un collaborateur
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {inviteStep === "type" ? "Type de collaborateur" : "Détails de l'invitation"}
                </DialogTitle>
                <DialogDescription>
                  {inviteStep === "type" 
                    ? "Choisissez le type de compte pour votre collaborateur"
                    : `Configuration pour un collaborateur ${employeeType === "autonomous" ? "autonome" : "géré"}`
                  }
                </DialogDescription>
              </DialogHeader>

              {inviteStep === "type" ? (
                <div className="space-y-4 pt-4">
                  {/* Type Autonome */}
                  <button
                    onClick={() => {
                      setEmployeeType("autonomous");
                      setInviteForm({
                        ...inviteForm,
                        canCreateCourses: true,
                        canViewInvoices: true,
                        canInviteDrivers: true,
                      });
                      setInviteStep("details");
                    }}
                    className="w-full p-4 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 hover:border-primary/60 hover:bg-primary/15 transition-all text-left group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shrink-0">
                        <Crown className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">Collaborateur Autonome</h3>
                          <Badge className="bg-primary/20 text-primary border-primary/30">Premium</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Accès complet à toutes les fonctionnalités pour gérer ses déplacements
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                            <Car className="w-3 h-3 mr-1" />
                            Créer des courses
                          </Badge>
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                            <FileText className="w-3 h-3 mr-1" />
                            Voir les factures
                          </Badge>
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                            <Users className="w-3 h-3 mr-1" />
                            Proposer chauffeurs
                          </Badge>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>

                  {/* Type Géré */}
                  <button
                    onClick={() => {
                      setEmployeeType("managed");
                      setInviteForm({
                        ...inviteForm,
                        canCreateCourses: false,
                        canViewInvoices: false,
                        canInviteDrivers: false,
                      });
                      setInviteStep("details");
                    }}
                    className="w-full p-4 rounded-xl border-2 border-border hover:border-accent/60 hover:bg-accent/5 transition-all text-left group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shrink-0">
                        <Briefcase className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">Collaborateur Géré</h3>
                          <Badge variant="secondary">Standard</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          L'administrateur gère ses courses. Il reçoit et confirme ses trajets.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-muted">
                            <Clock className="w-3 h-3 mr-1" />
                            Courses assignées
                          </Badge>
                          <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-muted">
                            <Target className="w-3 h-3 mr-1" />
                            Budget contrôlé
                          </Badge>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                </div>
              ) : (
                <div className="space-y-4 pt-4">
                  {/* Bandeau type sélectionné */}
                  <div className={`p-3 rounded-lg flex items-center gap-3 ${
                    employeeType === "autonomous" 
                      ? "bg-primary/10 border border-primary/20" 
                      : "bg-muted/50 border border-border"
                  }`}>
                    {employeeType === "autonomous" ? (
                      <Crown className="w-5 h-5 text-primary" />
                    ) : (
                      <Briefcase className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {employeeType === "autonomous" ? "Collaborateur Autonome" : "Collaborateur Géré"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {employeeType === "autonomous" 
                          ? "Toutes les permissions activées"
                          : "Permissions limitées, géré par l'admin"
                        }
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setInviteStep("type")}
                    >
                      Changer
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="employeeName">Nom du collaborateur</Label>
                      <Input
                        id="employeeName"
                        placeholder="Jean Dupont"
                        value={inviteForm.employeeName}
                        onChange={(e) => setInviteForm({ ...inviteForm, employeeName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department">Service</Label>
                      <Input
                        id="department"
                        placeholder="Marketing, RH..."
                        value={inviteForm.department}
                        onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (optionnel)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="jean.dupont@entreprise.com"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    />
                  </div>

                  {/* Budget mensuel */}
                  <div className="space-y-2">
                    <Label htmlFor="maxBudget" className="flex items-center gap-2">
                      <Euro className="w-4 h-4" />
                      Budget mensuel maximum
                    </Label>
                    <Input
                      id="maxBudget"
                      type="number"
                      placeholder="Ex: 500"
                      value={inviteForm.maxMonthlyBudget}
                      onChange={(e) => setInviteForm({ ...inviteForm, maxMonthlyBudget: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Laissez vide pour un budget illimité. Des alertes seront envoyées à 80% et 100%.
                    </p>
                  </div>

                  {/* Permissions personnalisables (seulement pour autonome) */}
                  {employeeType === "autonomous" && (
                    <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-border">
                      <Label className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4" />
                        Personnaliser les permissions
                      </Label>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-normal">Créer des courses</Label>
                        </div>
                        <Switch
                          checked={inviteForm.canCreateCourses}
                          onCheckedChange={(checked) => setInviteForm({ ...inviteForm, canCreateCourses: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-normal">Voir les factures</Label>
                        </div>
                        <Switch
                          checked={inviteForm.canViewInvoices}
                          onCheckedChange={(checked) => setInviteForm({ ...inviteForm, canViewInvoices: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-normal">Proposer des chauffeurs</Label>
                        </div>
                        <Switch
                          checked={inviteForm.canInviteDrivers}
                          onCheckedChange={(checked) => setInviteForm({ ...inviteForm, canInviteDrivers: checked })}
                        />
                      </div>
                    </div>
                  )}

                  <Button onClick={createInvitation} className="w-full" disabled={creatingInvitation}>
                    {creatingInvitation ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Créer le lien d'invitation
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Invitations en attente */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Invitations en attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {inv.employee_name || inv.email || "Invitation sans nom"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expire le {new Date(inv.expires_at).toLocaleDateString("fr-FR")}
                        {inv.department && ` • ${inv.department}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyInvitationLink(inv)}
                    >
                      {copiedLink === inv.id ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteInvitation(inv.id)}
                    >
                      <XCircle className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des employés */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Collaborateurs inscrits</CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Aucun collaborateur inscrit</p>
              <p className="text-sm text-muted-foreground mt-1">
                Invitez vos premiers collaborateurs pour commencer
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Collaborateur</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead className="text-center">Limites</TableHead>
                  <TableHead className="text-center">Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id} className={emp.is_suspended ? "opacity-60" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden relative">
                          {emp.profile?.profile_photo_url ? (
                            <img
                              src={emp.profile.profile_photo_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs font-medium text-primary">
                              {emp.profile?.full_name?.charAt(0) || "?"}
                            </span>
                          )}
                          {emp.is_suspended && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center">
                              <AlertTriangle className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            {emp.profile?.full_name || "N/A"}
                            {emp.is_suspended && (
                              <Badge variant="destructive" className="text-[10px] py-0 h-4">
                                Suspendu
                              </Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{emp.profile?.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{emp.job_title || "-"}</p>
                        {emp.department && (
                          <p className="text-xs text-muted-foreground">{emp.department}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        {emp.max_monthly_budget && (
                          <div className="flex items-center gap-1 text-xs">
                            <Euro className="w-3 h-3" />
                            <span>{emp.current_month_spent || 0}/{emp.max_monthly_budget}€</span>
                          </div>
                        )}
                        {emp.max_monthly_courses && (
                          <div className="flex items-center gap-1 text-xs">
                            <Car className="w-3 h-3" />
                            <span>{emp.monthly_courses_count || 0}/{emp.max_monthly_courses}</span>
                          </div>
                        )}
                        {!emp.max_monthly_budget && !emp.max_monthly_courses && (
                          <span className="text-xs text-muted-foreground">Illimité</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Badge variant={emp.is_active && !emp.is_suspended ? "default" : "secondary"}>
                          {emp.is_suspended ? "Suspendu" : emp.is_active ? "Actif" : "Inactif"}
                        </Badge>
                        {emp.monthly_objective_courses && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Target className="w-3 h-3" />
                            <span>Obj: {emp.monthly_objective_courses}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setShowSupervisionDialog(true);
                          }}
                        >
                          <Settings2 className="w-4 h-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedEmployee(emp);
                              setShowSupervisionDialog(true);
                            }}>
                              <Settings2 className="w-4 h-4 mr-2" />
                              Superviser
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => toggleEmployeeStatus(emp.id, !emp.is_active)}>
                              {emp.is_active ? "Désactiver" : "Réactiver"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de supervision */}
      <EmployeeSupervisionDialog
        employee={selectedEmployee}
        open={showSupervisionDialog}
        onOpenChange={setShowSupervisionDialog}
        onUpdate={fetchData}
        companyId={companyId}
      />
    </div>
  );
}
