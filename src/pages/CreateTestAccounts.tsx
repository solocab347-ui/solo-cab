import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, UserPlus, Copy, CheckCircle } from "lucide-react";

interface Credential {
  email: string;
  password: string;
  role: string;
  name: string;
}

const CreateTestAccounts = () => {
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [errors, setErrors] = useState<any[]>([]);

  const handleCreateAccounts = async () => {
    setLoading(true);
    setCredentials([]);
    setErrors([]);

    try {
      const { data, error } = await supabase.functions.invoke('create-production-test-accounts');

      if (error) {
        console.error('Error:', error);
        toast.error("Erreur lors de la création des comptes");
        return;
      }

      if (data.success) {
        setCredentials(data.credentials || []);
        setErrors(data.errors || []);
        toast.success(data.message);
      } else {
        toast.error(data.error || "Erreur inconnue");
      }
    } catch (err: any) {
      console.error('Catch error:', err);
      toast.error("Erreur lors de l'appel de la fonction");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copié dans le presse-papiers");
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-gradient-premium';
      case 'driver':
        return 'bg-gradient-trust';
      case 'client':
        return 'bg-gradient-success';
      default:
        return 'bg-gradient-independence';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrateur';
      case 'driver':
        return 'Chauffeur';
      case 'client':
        return 'Client';
      default:
        return role;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="p-6 bg-gradient-premium border-0 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                Création des Comptes de Test
              </h1>
              <p className="text-white/80">
                Génère les comptes de test pour la production (1 admin, 1 chauffeur, 6 clients)
              </p>
            </div>
            <UserPlus className="w-12 h-12 text-white/80" />
          </div>
        </Card>

        {/* Action Button */}
        <Card className="p-6 border-primary/20">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              Cette action va créer les comptes suivants dans la base de données :
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 1 Administrateur</li>
              <li>• 1 Chauffeur avec profil complet</li>
              <li>• 3 Clients exclusifs (liés au chauffeur via QR)</li>
              <li>• 3 Clients libres (via storefront)</li>
            </ul>
            <Button
              onClick={handleCreateAccounts}
              disabled={loading}
              size="lg"
              className="bg-gradient-trust hover:opacity-90 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Créer les Comptes de Test
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Credentials Display */}
        {credentials.length > 0 && (
          <Card className="p-6 border-primary/20">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <h2 className="text-xl font-bold">Identifiants Créés</h2>
            </div>
            <div className="space-y-4">
              {credentials.map((cred, index) => (
                <Card
                  key={index}
                  className={`p-4 ${getRoleBadgeColor(cred.role)} border-0 text-white`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-lg">{cred.name}</h3>
                        <p className="text-white/80 text-sm">
                          {getRoleLabel(cred.role)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-white/60">Rôle</div>
                        <div className="text-sm font-semibold uppercase">
                          {cred.role}
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-xs text-white/60 mb-1">Email</div>
                            <div className="font-mono text-sm">{cred.email}</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(cred.email)}
                            className="text-white hover:bg-white/20"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-xs text-white/60 mb-1">
                              Mot de passe
                            </div>
                            <div className="font-mono text-sm">{cred.password}</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(cred.password)}
                            className="text-white hover:bg-white/20"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                ⚠️ <strong>Important :</strong> Copiez et sauvegardez ces identifiants
                maintenant. Pour des raisons de sécurité, ils ne seront plus affichés
                après avoir quitté cette page.
              </p>
            </div>
          </Card>
        )}

        {/* Errors Display */}
        {errors.length > 0 && (
          <Card className="p-6 border-destructive/20 bg-destructive/5">
            <h2 className="text-xl font-bold mb-4 text-destructive">
              Erreurs ({errors.length})
            </h2>
            <div className="space-y-2">
              {errors.map((err, index) => (
                <div
                  key={index}
                  className="p-3 bg-destructive/10 rounded-lg text-sm"
                >
                  <div className="font-semibold">{err.email}</div>
                  <div className="text-destructive/80">{err.error}</div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CreateTestAccounts;
