import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Trash2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

const AdminUserCleanup = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCleanup = async () => {
    if (!email.trim()) {
      toast.error("Veuillez entrer un email");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cleanup-deleted-users", {
        body: { email: email.trim().toLowerCase() },
      });

      if (error) throw error;

      if (data.alreadyClean) {
        toast.info(data.message);
      } else {
        toast.success(data.message);
      }
      
      setEmail("");
    } catch (error: any) {
      console.error("Cleanup error:", error);
      toast.error(error.message || "Erreur lors du nettoyage");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Nettoyage des comptes</h2>
        <p className="text-muted-foreground">
          Supprimer complètement un utilisateur pour permettre une nouvelle inscription
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Cette action supprime définitivement toutes les données de l'utilisateur et permet une nouvelle inscription avec le même email.
        </AlertDescription>
      </Alert>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email de l'utilisateur</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemple@email.com"
              disabled={loading}
            />
          </div>

          <Button
            onClick={handleCleanup}
            disabled={loading || !email.trim()}
            className="w-full"
            variant="destructive"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Nettoyage en cours...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Nettoyer complètement cet utilisateur
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AdminUserCleanup;
