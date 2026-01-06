import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Users, 
  UserPlus, 
  Mail, 
  Copy, 
  Trash2, 
  Shield, 
  Crown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Link as LinkIcon,
  Send
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CompanyAdministratorsManagerProps {
  companyId: string;
  companyName: string;
}

interface Administrator {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  invited_at: string;
  accepted_at: string | null;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface Invitation {
  id: string;
  email: string;
  token: string;
  expires_at: string;
  is_used: boolean;
  created_at: string;
}

export function CompanyAdministratorsManager({ companyId, companyName }: CompanyAdministratorsManagerProps) {
  const { user } = useAuth();
  const [administrators, setAdministrators] = useState<Administrator[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (companyId && user) {
      fetchData();
      checkOwnership();
    }
  }, [companyId, user]);

  const checkOwnership = async () => {
    const { data } = await supabase
      .from("companies")
      .select("user_id")
      .eq("id", companyId)
      .single();
    
    setIsOwner(data?.user_id === user?.id);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Récupérer les administrateurs
      const { data: admins, error: adminsError } = await supabase
        .from("company_administrators")
        .select(`
          id,
          user_id,
          role,
          is_active,
          invited_at,
          accepted_at
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: true });

      if (adminsError) throw adminsError;

      // Récupérer les profils des admins
      if (admins && admins.length > 0) {
        const userIds = admins.map(a => a.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        const adminsWithProfiles = admins.map(admin => ({
          ...admin,
          profiles: profiles?.find(p => p.id === admin.user_id)
        }));

        setAdministrators(adminsWithProfiles);
      } else {
        setAdministrators([]);
      }

      // Récupérer les invitations en attente
      const { data: invites, error: invitesError } = await supabase
        .from("company_admin_invitations")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_used", false)
        .order("created_at", { ascending: false });

      if (invitesError) throw invitesError;
      setInvitations(invites || []);

    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors du chargement des administrateurs");
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitation = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Veuillez entrer une adresse email");
      return;
    }

    setSending(true);
    try {
      // Vérifier si une invitation existe déjà pour cet email
      const { data: existing } = await supabase
        .from("company_admin_invitations")
        .select("id")
        .eq("company_id", companyId)
        .eq("email", inviteEmail.toLowerCase())
        .eq("is_used", false)
        .maybeSingle();

      if (existing) {
        toast.error("Une invitation est déjà en attente pour cet email");
        return;
      }

      // Créer l'invitation
      const { data: invitation, error } = await supabase
        .from("company_admin_invitations")
        .insert({
          company_id: companyId,
          email: inviteEmail.toLowerCase(),
          invited_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Invitation créée avec succès");
      setInviteEmail("");
      setInviteDialogOpen(false);
      fetchData();

    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de l'envoi de l'invitation");
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = (token: string) => {
    const link = `${window.location.origin}/join-company?token=${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Lien copié dans le presse-papier");
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from("company_admin_invitations")
        .delete()
        .eq("id", invitationId);

      if (error) throw error;
      toast.success("Invitation supprimée");
      fetchData();
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleRemoveAdmin = async (adminId: string) => {
    try {
      const { error } = await supabase
        .from("company_administrators")
        .delete()
        .eq("id", adminId);

      if (error) throw error;
      toast.success("Administrateur retiré");
      fetchData();
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const isInvitationExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Administrateurs
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez les personnes ayant accès à l'espace entreprise
          </p>
        </div>
        
        {isOwner && (
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <UserPlus className="w-4 h-4 mr-2" />
                Inviter un administrateur
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Inviter un administrateur</DialogTitle>
                <DialogDescription>
                  Envoyez une invitation à un collaborateur pour qu'il puisse accéder à l'espace entreprise de {companyName}.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Adresse email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="collaborateur@entreprise.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <p className="text-sm text-amber-400 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                      L'administrateur invité aura accès à toutes les informations de l'entreprise : courses, factures, collaborateurs et partenaires.
                    </span>
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSendInvitation} disabled={sending}>
                  {sending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Envoyer l'invitation
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Propriétaire de l'entreprise */}
      <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-400" />
            Propriétaire du compte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-white">Compte principal</p>
                <p className="text-sm text-muted-foreground">Propriétaire de l'entreprise</p>
              </div>
            </div>
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              Propriétaire
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Liste des administrateurs */}
      {administrators.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Administrateurs actifs ({administrators.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {administrators.map((admin) => (
              <div 
                key={admin.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {admin.profiles?.full_name || "Administrateur"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {admin.profiles?.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Actif
                  </Badge>
                  {isOwner && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Retirer cet administrateur ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette personne n'aura plus accès à l'espace entreprise. Cette action est réversible en envoyant une nouvelle invitation.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleRemoveAdmin(admin.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Retirer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Invitations en attente */}
      {invitations.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-400" />
              Invitations en attente ({invitations.length})
            </CardTitle>
            <CardDescription>
              Partagez le lien d'invitation avec vos collaborateurs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {invitations.map((invitation) => {
              const expired = isInvitationExpired(invitation.expires_at);
              return (
                <div 
                  key={invitation.id}
                  className={`p-4 rounded-lg border ${
                    expired 
                      ? "bg-destructive/5 border-destructive/20" 
                      : "bg-blue-500/5 border-blue-500/20"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        expired ? "bg-destructive/20" : "bg-blue-500/20"
                      }`}>
                        <Mail className={`w-5 h-5 ${expired ? "text-destructive" : "text-blue-400"}`} />
                      </div>
                      <div>
                        <p className="font-medium text-white">{invitation.email}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {expired 
                            ? "Invitation expirée" 
                            : `Expire le ${new Date(invitation.expires_at).toLocaleDateString()}`
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!expired && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyLink(invitation.token)}
                          className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copier le lien
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer cette invitation ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Le lien d'invitation ne sera plus valide. Vous pourrez en créer un nouveau si nécessaire.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteInvitation(invitation.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* État vide */}
      {administrators.length === 0 && invitations.length === 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/20 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              Aucun administrateur supplémentaire
            </h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Invitez des collaborateurs pour qu'ils puissent accéder et gérer l'espace entreprise avec vous.
            </p>
            {isOwner && (
              <Button onClick={() => setInviteDialogOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Inviter un administrateur
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
