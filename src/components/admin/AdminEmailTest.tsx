import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Send } from "lucide-react";
import { useState } from "react";

export const AdminEmailTest = () => {
  const [sending, setSending] = useState(false);

  const sendTestEmail = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          to: "alexandrediarra00@gmail.com",
          type: "driver_welcome",
          data: {
            driverName: "Alexandre Diarra"
          }
        }
      });

      if (error) {
        console.error("Erreur envoi email:", error);
        toast.error("Erreur lors de l'envoi de l'email de test");
      } else {
        console.log("Email envoyé avec succès:", data);
        toast.success("Email de test envoyé à Alexandre !");
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="flex items-center gap-4 mb-4">
        <Mail className="w-8 h-8 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">Test Email - Alexandre</h3>
          <p className="text-sm text-muted-foreground">
            Envoyer un email de test pour inscription en attente de validation
          </p>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm mb-2">
            <strong>Destinataire:</strong> alexandrediarra00@gmail.com
          </p>
          <p className="text-sm mb-2">
            <strong>Type:</strong> Email d'inscription chauffeur (en attente de validation)
          </p>
          <p className="text-sm">
            <strong>Contenu:</strong> Message de bienvenue avec informations sur le processus de validation
          </p>
        </div>
        
        <Button 
          onClick={sendTestEmail} 
          disabled={sending}
          className="w-full"
        >
          {sending ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Envoi en cours...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Envoyer l'email de test
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};
