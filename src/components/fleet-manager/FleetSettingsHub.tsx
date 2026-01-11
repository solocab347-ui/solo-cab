import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DRIVER_SERVICES } from "@/lib/vehicleEquipment";
import { useQueryClient } from "@tanstack/react-query";
import { PUBLIC_FLEETS_QUERY_KEY, PUBLIC_FLEET_PROFILE_KEY } from "@/hooks/usePublicFleetProfile";
import {
  Building2,
  Globe,
  Navigation,
  Save,
  Loader2,
  Eye,
  ExternalLink,
  Upload,
  Camera,
  FileText,
  Phone,
  Mail,
  MapPin,
  User,
  Users,
  Car,
  Handshake,
  Zap,
  Brain,
  Clock,
  Info,
  Plus,
  X,
  Check,
} from "lucide-react";

interface FleetSettingsHubProps {
  fleetManagerId: string;
  companyName: string;
  onUpdate: () => void;
}

interface SettingsData {
  // Entreprise
  siret: string;
  siren: string;
  tva_number: string;
  address: string;
  contact_phone: string;
  logo_url: string;
  description: string;
  
  // Visibilité (tous les toggles groupés)
  show_drivers_in_public_storefront: boolean;
  show_contact_name: boolean;
  show_address: boolean;
  show_phone: boolean;
  show_email: boolean;
  show_driver_count_public: boolean;
  show_client_count_public: boolean;
  visible_to_drivers: boolean;
  visible_to_companies: boolean;
  
  // Dispatch (fusionné)
  auto_validate_courses: boolean;
  auto_dispatch_enabled: boolean;
  dispatch_priority: "proximity" | "availability" | "rating";
  favorite_driver_priority: boolean;
  smart_buffer_enabled: boolean;
  smart_buffer_min_minutes: number;
  course_buffer_minutes: number;
  smart_buffer_fallback_action: "notify_manager" | "assign_available" | "auto_reject";
  // Nouveaux paramètres de dispatch avancé
  dispatch_driver_priority: "internal_first" | "external_first" | "balanced";
  dispatch_notification_mode: "sequential" | "broadcast";
  dispatch_timeout_minutes: number;
  
  // Services
  services_offered: string[];
  
  // Partenariat
  default_partnership_commission: number;
  partnership_terms: string;
}

export const FleetSettingsHub = ({ fleetManagerId, companyName, onUpdate }: FleetSettingsHubProps) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [customService, setCustomService] = useState("");
  const [customServices, setCustomServices] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  
  const [settings, setSettings] = useState<SettingsData>({
    siret: "",
    siren: "",
    tva_number: "",
    address: "",
    contact_phone: "",
    logo_url: "",
    description: "",
    show_drivers_in_public_storefront: false,
    show_contact_name: true,
    show_address: true,
    show_phone: true,
    show_email: true,
    show_driver_count_public: false,
    show_client_count_public: false,
    visible_to_drivers: false,
    visible_to_companies: false,
    auto_validate_courses: true,
    auto_dispatch_enabled: false,
    dispatch_priority: "proximity",
    favorite_driver_priority: true,
    smart_buffer_enabled: false,
    smart_buffer_min_minutes: 15,
    course_buffer_minutes: 60,
    smart_buffer_fallback_action: "notify_manager",
    dispatch_driver_priority: "internal_first",
    dispatch_notification_mode: "sequential",
    dispatch_timeout_minutes: 5,
    services_offered: [],
    default_partnership_commission: 10,
    partnership_terms: "",
  });

  useEffect(() => {
    fetchSettings();
  }, [fleetManagerId]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("fleet_managers")
        .select("*")
        .eq("id", fleetManagerId)
        .single();

      if (error) throw error;
      if (data) {
        const d = data as any;
        
        // Séparer services prédéfinis et personnalisés
        const predefinedIds = DRIVER_SERVICES.map(s => s.id);
        const servicesFromDb = d.services_offered || [];
        const uniqueServices = [...new Set(servicesFromDb)] as string[];
        const predefined = uniqueServices.filter(s => predefinedIds.includes(s));
        const custom = uniqueServices.filter(s => !predefinedIds.includes(s));
        setSelectedServices(predefined);
        setCustomServices(custom);
        
        setSettings({
          siret: d.siret || "",
          siren: d.siren || "",
          tva_number: d.tva_number || "",
          address: d.address || "",
          contact_phone: d.contact_phone || "",
          logo_url: d.logo_url || "",
          description: d.description || "",
          show_drivers_in_public_storefront: d.show_drivers_in_public_storefront ?? false,
          show_contact_name: d.show_contact_name ?? true,
          show_address: d.show_address ?? true,
          show_phone: d.show_phone ?? true,
          show_email: d.show_email ?? true,
          show_driver_count_public: d.show_driver_count_public ?? false,
          show_client_count_public: d.show_client_count_public ?? false,
          visible_to_drivers: d.visible_to_drivers ?? false,
          visible_to_companies: d.visible_to_companies ?? false,
          auto_validate_courses: d.auto_validate_courses !== false,
          auto_dispatch_enabled: d.auto_dispatch_enabled ?? false,
          dispatch_priority: d.dispatch_priority || "proximity",
          favorite_driver_priority: d.favorite_driver_priority !== false,
          smart_buffer_enabled: d.smart_buffer_enabled ?? false,
          smart_buffer_min_minutes: d.smart_buffer_min_minutes || 15,
          course_buffer_minutes: d.course_buffer_minutes || 60,
          smart_buffer_fallback_action: d.smart_buffer_fallback_action || "notify_manager",
          dispatch_driver_priority: d.dispatch_driver_priority || "internal_first",
          dispatch_notification_mode: d.dispatch_notification_mode || "sequential",
          dispatch_timeout_minutes: d.dispatch_timeout_minutes || 5,
          services_offered: d.services_offered || [],
          default_partnership_commission: d.default_partnership_commission || 10,
          partnership_terms: d.partnership_terms || "",
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      toast.error("Image invalide (max 2MB, formats JPG/PNG)");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${fleetManagerId}-logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("fleet-documents")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("fleet-documents")
        .getPublicUrl(filePath);

      setSettings({ ...settings, logo_url: publicUrl });
      toast.success("Logo téléchargé");
    } catch (error) {
      console.error("Error uploading:", error);
      toast.error("Erreur upload");
    } finally {
      setUploading(false);
    }
  };

  const handleServiceToggle = (serviceId: string) => {
    if (selectedServices.includes(serviceId)) {
      setSelectedServices(selectedServices.filter(s => s !== serviceId));
    } else {
      setSelectedServices([...selectedServices, serviceId]);
    }
  };

  const addCustomService = () => {
    const trimmed = customService.trim();
    if (trimmed && !customServices.includes(trimmed) && !selectedServices.includes(trimmed)) {
      setCustomServices([...customServices, trimmed]);
      setCustomService("");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const allServices = [...new Set([...selectedServices, ...customServices])];
      
      const { error } = await supabase
        .from("fleet_managers")
        .update({
          siret: settings.siret || null,
          siren: settings.siren || null,
          tva_number: settings.tva_number || null,
          address: settings.address || null,
          contact_phone: settings.contact_phone || null,
          logo_url: settings.logo_url || null,
          description: settings.description || null,
          show_drivers_in_public_storefront: settings.show_drivers_in_public_storefront,
          show_contact_name: settings.show_contact_name,
          show_address: settings.show_address,
          show_phone: settings.show_phone,
          show_email: settings.show_email,
          show_driver_count_public: settings.show_driver_count_public,
          show_client_count_public: settings.show_client_count_public,
          visible_to_drivers: settings.visible_to_drivers,
          visible_to_companies: settings.visible_to_companies,
          auto_validate_courses: settings.auto_validate_courses,
          auto_dispatch_enabled: settings.auto_dispatch_enabled,
          dispatch_priority: settings.dispatch_priority,
          favorite_driver_priority: settings.favorite_driver_priority,
          assignment_mode: settings.auto_dispatch_enabled ? "automatic" : "manual",
          smart_buffer_enabled: settings.smart_buffer_enabled,
          smart_buffer_min_minutes: settings.smart_buffer_min_minutes,
          course_buffer_minutes: settings.course_buffer_minutes,
          smart_buffer_fallback_action: settings.smart_buffer_fallback_action,
          dispatch_driver_priority: settings.dispatch_driver_priority,
          dispatch_notification_mode: settings.dispatch_notification_mode,
          dispatch_timeout_minutes: settings.dispatch_timeout_minutes,
          services_offered: allServices.length > 0 ? allServices : null,
          default_partnership_commission: settings.default_partnership_commission,
          partnership_terms: settings.partnership_terms || null,
          driver_profile_description: settings.description || null,
        } as any)
        .eq("id", fleetManagerId);

      if (error) throw error;

      toast.success("Paramètres enregistrés");
      queryClient.invalidateQueries({ queryKey: PUBLIC_FLEETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUBLIC_FLEET_PROFILE_KEY });
      onUpdate();
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
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
      <Tabs defaultValue="entreprise" className="space-y-6">
        <div className="glass-strong p-3 rounded-2xl">
          <TabsList className="grid w-full grid-cols-3 gap-2 h-auto bg-transparent p-0">
            <TabsTrigger value="entreprise" className="py-3 px-2 rounded-xl text-xs sm:text-sm data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white">
              <Building2 className="w-4 h-4 mr-2 hidden sm:inline" />
              Entreprise
            </TabsTrigger>
            <TabsTrigger value="visibilite" className="py-3 px-2 rounded-xl text-xs sm:text-sm data-[state=active]:bg-gradient-to-br data-[state=active]:from-success data-[state=active]:to-emerald-600 data-[state=active]:text-white">
              <Globe className="w-4 h-4 mr-2 hidden sm:inline" />
              Visibilité
            </TabsTrigger>
            <TabsTrigger value="dispatch" className="py-3 px-2 rounded-xl text-xs sm:text-sm data-[state=active]:bg-gradient-to-br data-[state=active]:from-info data-[state=active]:to-cyan-600 data-[state=active]:text-white">
              <Navigation className="w-4 h-4 mr-2 hidden sm:inline" />
              Dispatch
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ONGLET ENTREPRISE */}
        <TabsContent value="entreprise" className="space-y-6">
          {/* Logo & Présentation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Logo & Présentation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="w-24 h-24 border-4 border-border">
                    <AvatarImage src={settings.logo_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-2xl">
                      {companyName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <label 
                    htmlFor="logo-upload"
                    className="absolute -bottom-2 -right-2 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  </label>
                  <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </div>
                <div className="flex-1">
                  <Label>Logo de l'entreprise</Label>
                  <p className="text-sm text-muted-foreground">JPG, PNG, max 2MB</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Décrivez vos services..."
                  value={settings.description}
                  onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Infos légales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Informations légales
              </CardTitle>
              <CardDescription>Apparaîtront sur vos devis et factures</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SIRET</Label>
                  <Input value={settings.siret} onChange={(e) => setSettings({ ...settings, siret: e.target.value })} placeholder="14 chiffres" maxLength={14} />
                </div>
                <div className="space-y-2">
                  <Label>SIREN</Label>
                  <Input value={settings.siren} onChange={(e) => setSettings({ ...settings, siren: e.target.value })} placeholder="9 chiffres" maxLength={9} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>N° TVA Intracommunautaire</Label>
                <Input value={settings.tva_number} onChange={(e) => setSettings({ ...settings, tva_number: e.target.value })} placeholder="FR12345678901" />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Adresse</Label>
                  <Input value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} placeholder="Adresse complète" />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input value={settings.contact_phone} onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })} placeholder="06 12 34 56 78" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5" />
                Services proposés
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {DRIVER_SERVICES.map((service) => (
                  <Badge
                    key={service.id}
                    variant={selectedServices.includes(service.id) ? "default" : "outline"}
                    className="cursor-pointer py-2 px-3"
                    onClick={() => handleServiceToggle(service.id)}
                  >
                    {selectedServices.includes(service.id) && <Check className="w-3 h-3 mr-1" />}
                    {service.label}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Service personnalisé..."
                  value={customService}
                  onChange={(e) => setCustomService(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomService())}
                />
                <Button type="button" variant="outline" onClick={addCustomService}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {customServices.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {customServices.map((service) => (
                    <Badge key={service} variant="secondary" className="gap-1">
                      {service}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setCustomServices(customServices.filter(s => s !== service))} />
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ONGLET VISIBILITÉ */}
        <TabsContent value="visibilite" className="space-y-6">
          <Card className="bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/20 rounded-xl">
                    <Globe className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Contrôle de visibilité</h2>
                    <p className="text-sm text-muted-foreground">Gérez ce qui est visible publiquement</p>
                  </div>
                </div>
                <Button variant="outline" className="gap-2" onClick={() => window.open(`/flotte/${fleetManagerId}`, '_blank')}>
                  <Eye className="w-4 h-4" />
                  Aperçu
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Profil public */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Profil public
              </CardTitle>
              <CardDescription>Ce qui apparaît sur votre profil partageable</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <VisibilityToggle
                icon={<Car className="w-5 h-5 text-primary" />}
                label="Afficher mes chauffeurs"
                description="Les clients peuvent voir votre équipe"
                checked={settings.show_drivers_in_public_storefront}
                onCheckedChange={(v) => setSettings({ ...settings, show_drivers_in_public_storefront: v })}
              />
              <VisibilityToggle
                icon={<User className="w-5 h-5 text-primary" />}
                label="Nom du contact"
                checked={settings.show_contact_name}
                onCheckedChange={(v) => setSettings({ ...settings, show_contact_name: v })}
              />
              <VisibilityToggle
                icon={<MapPin className="w-5 h-5 text-primary" />}
                label="Adresse"
                checked={settings.show_address}
                onCheckedChange={(v) => setSettings({ ...settings, show_address: v })}
              />
              <VisibilityToggle
                icon={<Phone className="w-5 h-5 text-primary" />}
                label="Téléphone"
                checked={settings.show_phone}
                onCheckedChange={(v) => setSettings({ ...settings, show_phone: v })}
              />
              <VisibilityToggle
                icon={<Mail className="w-5 h-5 text-primary" />}
                label="Email"
                checked={settings.show_email}
                onCheckedChange={(v) => setSettings({ ...settings, show_email: v })}
              />
              <VisibilityToggle
                icon={<Users className="w-5 h-5 text-primary" />}
                label="Nombre de chauffeurs"
                checked={settings.show_driver_count_public}
                onCheckedChange={(v) => setSettings({ ...settings, show_driver_count_public: v })}
              />
              <VisibilityToggle
                icon={<Users className="w-5 h-5 text-primary" />}
                label="Nombre de clients"
                checked={settings.show_client_count_public}
                onCheckedChange={(v) => setSettings({ ...settings, show_client_count_public: v })}
              />
            </CardContent>
          </Card>

          {/* Découverte B2B */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Handshake className="w-5 h-5" />
                Découverte partenaires
              </CardTitle>
              <CardDescription>Visibilité pour les partenaires potentiels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <VisibilityToggle
                icon={<Car className="w-5 h-5 text-info" />}
                label="Visible aux chauffeurs"
                description="Les chauffeurs indépendants peuvent vous trouver"
                checked={settings.visible_to_drivers}
                onCheckedChange={(v) => setSettings({ ...settings, visible_to_drivers: v })}
              />
              <VisibilityToggle
                icon={<Building2 className="w-5 h-5 text-info" />}
                label="Visible aux entreprises"
                description="Les entreprises peuvent vous contacter"
                checked={settings.visible_to_companies}
                onCheckedChange={(v) => setSettings({ ...settings, visible_to_companies: v })}
              />
              
              <Separator />
              
              <div className="space-y-2">
                <Label>Commission partenariat par défaut (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="30"
                  value={settings.default_partnership_commission}
                  onChange={(e) => setSettings({ ...settings, default_partnership_commission: parseFloat(e.target.value) || 0 })}
                  className="max-w-[120px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Conditions de partenariat</Label>
                <Textarea
                  placeholder="Décrivez vos conditions..."
                  value={settings.partnership_terms}
                  onChange={(e) => setSettings({ ...settings, partnership_terms: e.target.value })}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ONGLET DISPATCH */}
        <TabsContent value="dispatch" className="space-y-6">
          {/* Validation des courses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-warning" />
                Validation des courses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <Label className="text-base font-medium">Validation automatique</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {settings.auto_validate_courses 
                        ? "Les courses sont confirmées automatiquement"
                        : "Vous devez valider chaque course manuellement"
                      }
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.auto_validate_courses}
                  onCheckedChange={(v) => setSettings({ ...settings, auto_validate_courses: v })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Mode d'assignation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-primary" />
                Assignation des courses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={settings.auto_dispatch_enabled ? "automatic" : "manual"}
                onValueChange={(v) => setSettings({ ...settings, auto_dispatch_enabled: v === "automatic" })}
                className="space-y-3"
              >
                <RadioOption value="manual" label="Manuel" description="Vous assignez chaque course" checked={!settings.auto_dispatch_enabled} />
                <RadioOption value="automatic" label="Automatique" description="Attribution intelligente" checked={settings.auto_dispatch_enabled} />
              </RadioGroup>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <Label className="text-base font-medium">Priorité chauffeur favori</Label>
                  <p className="text-sm text-muted-foreground">Privilégier le chauffeur favori du client</p>
                </div>
                <Switch
                  checked={settings.favorite_driver_priority}
                  onCheckedChange={(v) => setSettings({ ...settings, favorite_driver_priority: v })}
                />
              </div>

              {settings.auto_dispatch_enabled && (
                <>
                  <Separator />
                  <Label className="text-base font-medium">Critère de priorité</Label>
                  <RadioGroup
                    value={settings.dispatch_priority}
                    onValueChange={(v) => setSettings({ ...settings, dispatch_priority: v as any })}
                    className="grid gap-3"
                  >
                    <RadioOption value="proximity" label="Proximité" description="Chauffeur le plus proche" checked={settings.dispatch_priority === "proximity"} />
                    <RadioOption value="availability" label="Disponibilité" description="Chauffeur le moins chargé" checked={settings.dispatch_priority === "availability"} />
                    <RadioOption value="rating" label="Note" description="Chauffeur le mieux noté" checked={settings.dispatch_priority === "rating"} />
                  </RadioGroup>

                  <Separator />
                  <Label className="text-base font-medium">Priorité des chauffeurs</Label>
                  <RadioGroup
                    value={settings.dispatch_driver_priority}
                    onValueChange={(v) => setSettings({ ...settings, dispatch_driver_priority: v as any })}
                    className="grid gap-3"
                  >
                    <RadioOption value="internal_first" label="Internes d'abord" description="Priorité aux chauffeurs de votre flotte" checked={settings.dispatch_driver_priority === "internal_first"} />
                    <RadioOption value="external_first" label="Partenaires d'abord" description="Priorité aux chauffeurs partenaires" checked={settings.dispatch_driver_priority === "external_first"} />
                    <RadioOption value="balanced" label="Équilibré" description="Sélection basée sur la note et disponibilité" checked={settings.dispatch_driver_priority === "balanced"} />
                  </RadioGroup>

                  <Separator />
                  <Label className="text-base font-medium">Mode de notification</Label>
                  <RadioGroup
                    value={settings.dispatch_notification_mode}
                    onValueChange={(v) => setSettings({ ...settings, dispatch_notification_mode: v as any })}
                    className="grid gap-3"
                  >
                    <RadioOption value="sequential" label="Séquentiel" description="Un chauffeur à la fois, puis le suivant si refus" checked={settings.dispatch_notification_mode === "sequential"} />
                    <RadioOption value="broadcast" label="Diffusion" description="Tous les chauffeurs reçoivent la demande simultanément" checked={settings.dispatch_notification_mode === "broadcast"} />
                  </RadioGroup>

                  <div className="space-y-2 pt-4">
                    <Label>Délai de réponse (minutes)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={settings.dispatch_timeout_minutes}
                      onChange={(e) => setSettings({ ...settings, dispatch_timeout_minutes: parseInt(e.target.value) || 5 })}
                      className="max-w-[120px]"
                    />
                    <p className="text-sm text-muted-foreground">
                      Temps accordé à chaque chauffeur pour accepter ou refuser
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Buffer intelligent */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Temps entre les courses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Brain className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <Label className="text-base font-medium">Buffer intelligent</Label>
                    <p className="text-sm text-muted-foreground">Calcul automatique selon les trajets</p>
                  </div>
                </div>
                <Switch
                  checked={settings.smart_buffer_enabled}
                  onCheckedChange={(v) => setSettings({ ...settings, smart_buffer_enabled: v })}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{settings.smart_buffer_enabled ? "Buffer minimum (min)" : "Buffer fixe (min)"}</Label>
                  <Input
                    type="number"
                    min="5"
                    max="120"
                    value={settings.smart_buffer_enabled ? settings.smart_buffer_min_minutes : settings.course_buffer_minutes}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 15;
                      if (settings.smart_buffer_enabled) {
                        setSettings({ ...settings, smart_buffer_min_minutes: val });
                      } else {
                        setSettings({ ...settings, course_buffer_minutes: val });
                      }
                    }}
                    className="max-w-[120px]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bouton sauvegarder global */}
      <div className="flex justify-end sticky bottom-4">
        <Button onClick={handleSave} disabled={saving} className="gap-2 shadow-lg">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Enregistrer tous les paramètres
        </Button>
      </div>
    </div>
  );
};

// Composants helpers
const VisibilityToggle = ({ icon, label, description, checked, onCheckedChange }: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) => (
  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <Label className="text-base font-medium">{label}</Label>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} />
  </div>
);

const RadioOption = ({ value, label, description, checked }: {
  value: string;
  label: string;
  description: string;
  checked: boolean;
}) => (
  <div className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${checked ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
    <div className="flex items-start gap-3">
      <RadioGroupItem value={value} id={value} />
      <div className="flex-1">
        <Label htmlFor={value} className="cursor-pointer font-medium text-base">{label}</Label>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  </div>
);

export default FleetSettingsHub;
