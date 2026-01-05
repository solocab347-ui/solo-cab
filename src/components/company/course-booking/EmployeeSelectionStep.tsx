import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Search, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { CourseFormData } from "./CompanyCourseBookingWizard";

interface EmployeeSelectionStepProps {
  companyId: string;
  formData: CourseFormData;
  setFormData: React.Dispatch<React.SetStateAction<CourseFormData>>;
}

export function EmployeeSelectionStep({ companyId, formData, setFormData }: EmployeeSelectionStepProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [mode, setMode] = useState<"registered" | "guest">(formData.isGuestEmployee ? "guest" : "registered");

  const { data: employees, isLoading } = useQuery({
    queryKey: ["company-employees-list", companyId],
    queryFn: async () => {
      const { data: employeesData, error } = await supabase
        .from("company_employees")
        .select("id, user_id, department, job_title, is_active")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("joined_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles
      const userIds = employeesData?.map(e => e.user_id) || [];
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, profile_photo_url")
        .in("id", userIds);

      return employeesData?.map(emp => ({
        ...emp,
        profile: profiles?.find(p => p.id === emp.user_id),
      })) || [];
    },
  });

  const filteredEmployees = employees?.filter(emp => {
    if (!searchTerm) return true;
    const name = emp.profile?.full_name?.toLowerCase() || "";
    const email = emp.profile?.email?.toLowerCase() || "";
    return name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
  });

  const selectEmployee = (employeeId: string) => {
    setFormData(prev => ({
      ...prev,
      employeeId,
      isGuestEmployee: false,
      guestEmployeeName: "",
      guestEmployeePhone: "",
      guestEmployeeEmail: "",
    }));
  };

  const handleModeChange = (newMode: "registered" | "guest") => {
    setMode(newMode);
    if (newMode === "guest") {
      setFormData(prev => ({
        ...prev,
        employeeId: null,
        isGuestEmployee: true,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        isGuestEmployee: false,
        guestEmployeeName: "",
        guestEmployeePhone: "",
        guestEmployeeEmail: "",
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Pour qui est cette course ?
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Sélectionnez un collaborateur inscrit ou créez une course pour un collaborateur non-inscrit
        </p>
      </div>

      <RadioGroup value={mode} onValueChange={(v) => handleModeChange(v as "registered" | "guest")}>
        <div className="grid sm:grid-cols-2 gap-4">
          <label 
            htmlFor="mode-registered"
            className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              mode === "registered" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
          >
            <RadioGroupItem value="registered" id="mode-registered" />
            <div className="flex-1">
              <div className="font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Collaborateur inscrit
              </div>
              <p className="text-sm text-muted-foreground">
                Sélectionnez dans la liste
              </p>
            </div>
          </label>

          <label 
            htmlFor="mode-guest"
            className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              mode === "guest" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
          >
            <RadioGroupItem value="guest" id="mode-guest" />
            <div className="flex-1">
              <div className="font-medium flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Collaborateur non-inscrit
              </div>
              <p className="text-sm text-muted-foreground">
                Entrez les informations manuellement
              </p>
            </div>
          </label>
        </div>
      </RadioGroup>

      {mode === "registered" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un collaborateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredEmployees && filteredEmployees.length > 0 ? (
            <div className="grid gap-2 max-h-64 overflow-y-auto">
              {filteredEmployees.map((emp) => (
                <Card 
                  key={emp.id}
                  className={`cursor-pointer transition-all ${
                    formData.employeeId === emp.id 
                      ? "border-primary bg-primary/5" 
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => selectEmployee(emp.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={emp.profile?.profile_photo_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {emp.profile?.full_name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{emp.profile?.full_name || "Collaborateur"}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {emp.department || emp.job_title || emp.profile?.email}
                        </p>
                      </div>
                      {formData.employeeId === emp.id && (
                        <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Aucun collaborateur inscrit</p>
              <Button 
                variant="link" 
                onClick={() => handleModeChange("guest")}
                className="mt-2"
              >
                Créer pour un collaborateur non-inscrit
              </Button>
            </div>
          )}
        </div>
      )}

      {mode === "guest" && (
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <Label htmlFor="guestName">Nom complet *</Label>
            <Input
              id="guestName"
              placeholder="Jean Dupont"
              value={formData.guestEmployeeName}
              onChange={(e) => setFormData(prev => ({ ...prev, guestEmployeeName: e.target.value }))}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="guestPhone">Téléphone *</Label>
              <Input
                id="guestPhone"
                type="tel"
                placeholder="06 12 34 56 78"
                value={formData.guestEmployeePhone}
                onChange={(e) => setFormData(prev => ({ ...prev, guestEmployeePhone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guestEmail">Email (optionnel)</Label>
              <Input
                id="guestEmail"
                type="email"
                placeholder="jean.dupont@entreprise.com"
                value={formData.guestEmployeeEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, guestEmployeeEmail: e.target.value }))}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Un lien d'inscription sera envoyé au collaborateur après la course pour qu'il puisse créer son espace.
          </p>
        </div>
      )}
    </div>
  );
}
