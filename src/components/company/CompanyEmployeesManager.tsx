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
} from "lucide-react";

interface Employee {
  id: string;
  user_id: string;
  employee_code: string;
  department: string | null;
  job_title: string | null;
  can_create_courses: boolean;
  can_view_invoices: boolean;
  is_active: boolean;
  joined_at: string;
  current_month_spent: number;
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
  
  const [inviteForm, setInviteForm] = useState({
    email: "",
    employeeName: "",
    department: "",
    canCreateCourses: true,
    canViewInvoices: true,
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
            .single();
          return { ...emp, profile: profile || { full_name: "", email: "", phone: null, profile_photo_url: null } };
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
        })
        .select()
        .single();

      if (error) throw error;

      setInvitations([data, ...invitations]);
      setShowInviteDialog(false);
      setInviteForm({
        email: "",
        employeeName: "",
        department: "",
        canCreateCourses: true,
        canViewInvoices: true,
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

  const toggleEmployeePermission = async (employeeId: string, field: "can_create_courses" | "can_view_invoices", value: boolean) => {
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
          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="w-4 h-4 mr-2" />
                Inviter un collaborateur
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Inviter un collaborateur</DialogTitle>
                <DialogDescription>
                  Créez un lien d'invitation unique pour un nouveau collaborateur
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeName">Nom du collaborateur (optionnel)</Label>
                  <Input
                    id="employeeName"
                    placeholder="Jean Dupont"
                    value={inviteForm.employeeName}
                    onChange={(e) => setInviteForm({ ...inviteForm, employeeName: e.target.value })}
                  />
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
                <div className="space-y-2">
                  <Label htmlFor="department">Service (optionnel)</Label>
                  <Input
                    id="department"
                    placeholder="Marketing, RH, Direction..."
                    value={inviteForm.department}
                    onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                  />
                </div>
                <div className="space-y-3">
                  <Label>Permissions</Label>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-normal">Créer des courses</Label>
                      <p className="text-xs text-muted-foreground">
                        Le collaborateur peut réserver des VTC
                      </p>
                    </div>
                    <Switch
                      checked={inviteForm.canCreateCourses}
                      onCheckedChange={(checked) => setInviteForm({ ...inviteForm, canCreateCourses: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-normal">Voir les factures</Label>
                      <p className="text-xs text-muted-foreground">
                        Accès aux factures de l'entreprise
                      </p>
                    </div>
                    <Switch
                      checked={inviteForm.canViewInvoices}
                      onCheckedChange={(checked) => setInviteForm({ ...inviteForm, canViewInvoices: checked })}
                    />
                  </div>
                </div>
                <Button onClick={createInvitation} className="w-full" disabled={creatingInvitation}>
                  {creatingInvitation ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4 mr-2" />
                  )}
                  Créer le lien d'invitation
                </Button>
              </div>
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
                  <TableHead className="text-center">Courses</TableHead>
                  <TableHead className="text-center">Factures</TableHead>
                  <TableHead className="text-center">Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
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
                        </div>
                        <div>
                          <p className="font-medium">{emp.profile?.full_name || "N/A"}</p>
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
                      <Switch
                        checked={emp.can_create_courses}
                        onCheckedChange={(checked) => toggleEmployeePermission(emp.id, "can_create_courses", checked)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={emp.can_view_invoices}
                        onCheckedChange={(checked) => toggleEmployeePermission(emp.id, "can_view_invoices", checked)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={emp.is_active ? "default" : "secondary"}>
                        {emp.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => toggleEmployeeStatus(emp.id, !emp.is_active)}>
                            {emp.is_active ? "Désactiver" : "Réactiver"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
