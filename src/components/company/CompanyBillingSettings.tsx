import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, MapPin, Mail, Phone, FileText, Save } from "lucide-react";

interface CompanyBillingSettingsProps {
  companyId: string;
  initialData: {
    company_name: string;
    siret: string;
    siren?: string | null;
    tva_number?: string | null;
    address: string;
    billing_address: string | null;
    contact_name: string;
    contact_email: string;
    contact_phone: string | null;
  };
}

export const CompanyBillingSettings = ({ companyId, initialData }: CompanyBillingSettingsProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: initialData.company_name || "",
    siret: initialData.siret || "",
    siren: initialData.siren || "",
    tva_number: initialData.tva_number || "",
    address: initialData.address || "",
    billing_address: initialData.billing_address || "",
    contact_name: initialData.contact_name || "",
    contact_email: initialData.contact_email || "",
    contact_phone: initialData.contact_phone || "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("companies")
        .update({
          company_name: formData.company_name,
          siret: formData.siret,
          siren: formData.siren || null,
          tva_number: formData.tva_number || null,
          address: formData.address,
          billing_address: formData.billing_address || null,
          contact_name: formData.contact_name,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone || null,
        })
        .eq("id", companyId);

      if (error) throw error;

      toast.success("Informations mises à jour avec succès");
    } catch (error: any) {
      console.error("Error updating company:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Paramètres de facturation</h2>
        <p className="text-sm text-muted-foreground">
          Ces informations apparaîtront sur vos factures
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Informations entreprise
            </CardTitle>
            <CardDescription>
              Raison sociale et identifiants légaux
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company_name">Raison sociale *</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => handleChange("company_name", e.target.value)}
                  placeholder="Nom de l'entreprise"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siret">SIRET *</Label>
                <Input
                  id="siret"
                  value={formData.siret}
                  onChange={(e) => handleChange("siret", e.target.value)}
                  placeholder="12345678901234"
                  maxLength={17}
                  required
                />
                <p className="text-xs text-muted-foreground">14 chiffres</p>
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="siren">SIREN</Label>
                <Input
                  id="siren"
                  value={formData.siren}
                  onChange={(e) => handleChange("siren", e.target.value)}
                  placeholder="123456789"
                  maxLength={11}
                />
                <p className="text-xs text-muted-foreground">9 chiffres (optionnel)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tva_number">N° TVA intracommunautaire</Label>
                <Input
                  id="tva_number"
                  value={formData.tva_number}
                  onChange={(e) => handleChange("tva_number", e.target.value)}
                  placeholder="FR12345678901"
                />
                <p className="text-xs text-muted-foreground">Pour la facturation</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Adresses
            </CardTitle>
            <CardDescription>
              Adresse du siège et adresse de facturation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Adresse du siège *</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="123 Rue de l'exemple, 75001 Paris"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing_address">
                Adresse de facturation 
                <span className="text-muted-foreground ml-1">(si différente)</span>
              </Label>
              <Textarea
                id="billing_address"
                value={formData.billing_address}
                onChange={(e) => handleChange("billing_address", e.target.value)}
                placeholder="Laissez vide si identique à l'adresse du siège"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Contact principal
            </CardTitle>
            <CardDescription>
              Personne responsable des réservations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact_name">Nom du contact *</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => handleChange("contact_name", e.target.value)}
                placeholder="Jean Dupont"
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact_email">Email *</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => handleChange("contact_email", e.target.value)}
                  placeholder="contact@entreprise.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Téléphone</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => handleChange("contact_phone", e.target.value)}
                  placeholder="06 12 34 56 78"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current mr-2"></div>
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Enregistrer les modifications
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
