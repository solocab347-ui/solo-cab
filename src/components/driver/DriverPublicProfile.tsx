import React, { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Globe, MapPin, AlertCircle, Building2, User, Phone, Mail, Car, Package, Users, Star, DollarSign, Eye, Shield, Copy, Check, ExternalLink } from "lucide-react";
import { DualProfilePhotoUpload } from "./DualProfilePhotoUpload";
import { SectorSelector } from "./SectorSelector";
import { EquipmentSelector } from "./vehicles/EquipmentSelector";
import { ServicesSelector } from "./ServicesSelector";
import { toast } from "sonner";

import { VehicleCategorySelector } from "./vehicles/VehicleCategorySelector";
import { DriverVehiclesManager } from "./vehicles/DriverVehiclesManager";

interface DriverPublicProfileProps {
  driverProfile: any;
  userId: string;
  publicProfileEnabled: boolean;
  showPhone: boolean;
  showEmail: boolean;
  contactPhone?: string;
  contactEmail?: string;
  workingSectors: string[];
  serviceDescription: string;
  homeAddress: string;
  displayDriverName: boolean;
  displayCompanyName: boolean;
  companyName: string;
  profilePhotoUrl: string | null;
  cardPhotoUrl: string | null;
  vehicleEquipment: string[];
  servicesOffered: string[];
  vehicleCategories: string[];
  visibleToFleetManagers?: boolean;
  visibleToCompanies?: boolean;
  visibleToDrivers?: boolean;
  showRatingPublic?: boolean;
  showRatingPartners?: boolean;
  showPricingPartners?: boolean;
  onTogglePublicProfile: (enabled: boolean) => void;
  onPhotoUpdate: (url: string) => void;
  onCardPhotoUpdate: (url: string) => void;
  onShowPhoneChange: (checked: boolean) => void;
  onShowEmailChange: (checked: boolean) => void;
  onContactPhoneChange?: (phone: string) => void;
  onContactEmailChange?: (email: string) => void;
  onWorkingSectorsChange: (sectors: string[]) => void;
  onServiceDescriptionChange: (description: string) => void;
  onHomeAddressChange: (address: string, coords?: { latitude: number; longitude: number }) => void;
  onDisplayDriverNameChange: (checked: boolean) => void;
  onDisplayCompanyNameChange: (checked: boolean) => void;
  onVehicleEquipmentChange: (equipment: string[]) => void;
  onServicesOfferedChange: (services: string[]) => void;
  onVehicleCategoriesChange: (categories: string[]) => void;
  onVisibleToFleetManagersChange?: (visible: boolean) => void;
  onVisibleToCompaniesChange?: (visible: boolean) => void;
  onVisibleToDriversChange?: (visible: boolean) => void;
  onShowRatingPublicChange?: (visible: boolean) => void;
  onShowRatingPartnersChange?: (visible: boolean) => void;
  onShowPricingPartnersChange?: (visible: boolean) => void;
}

export const DriverPublicProfile = memo(({
  driverProfile,
  userId,
  publicProfileEnabled,
  showPhone,
  showEmail,
  contactPhone = "",
  contactEmail = "",
  workingSectors,
  serviceDescription,
  homeAddress,
  displayDriverName,
  displayCompanyName,
  companyName,
  profilePhotoUrl,
  cardPhotoUrl,
  vehicleEquipment,
  servicesOffered,
  vehicleCategories,
  visibleToFleetManagers = false,
  visibleToCompanies = false,
  visibleToDrivers = false,
  showRatingPublic = false,
  showRatingPartners = false,
  showPricingPartners = false,
  onTogglePublicProfile,
  onPhotoUpdate,
  onCardPhotoUpdate,
  onShowPhoneChange,
  onShowEmailChange,
  onContactPhoneChange,
  onContactEmailChange,
  onWorkingSectorsChange,
  onServiceDescriptionChange,
  onHomeAddressChange,
  onDisplayDriverNameChange,
  onDisplayCompanyNameChange,
  onVehicleEquipmentChange,
  onServicesOfferedChange,
  onVehicleCategoriesChange,
  onVisibleToFleetManagersChange,
  onVisibleToCompaniesChange,
  onVisibleToDriversChange,
  onShowRatingPublicChange,
  onShowRatingPartnersChange,
  onShowPricingPartnersChange,
}: DriverPublicProfileProps) => {
  const [linkCopied, setLinkCopied] = useState(false);
  
  // Guard contre les données manquantes
  if (!driverProfile || !userId) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">Chargement du profil...</p>
      </Card>
    );
  }

  const driverName = driverProfile?.full_name || "Chauffeur";
  const driverId = driverProfile?.driver?.id;
  const isPioneer = driverProfile?.driver?.is_pioneer;
  
  // Générer le lien du profil public
  const publicProfileUrl = driverId ? `${window.location.origin}/chauffeur/${driverId}` : "";
  
  const handleCopyLink = () => {
    if (!publicProfileUrl) return;
    navigator.clipboard.writeText(publicProfileUrl);
    setLinkCopied(true);
    toast.success("Lien copié dans le presse-papier !");
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* En-tête et activation */}
      <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Profil Public</h2>
              <p className="text-sm text-muted-foreground">
                Gérez votre visibilité sur la vitrine publique
              </p>
            </div>
          </div>
          {driverId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/chauffeur/${driverId}`, '_blank')}
              className="gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Voir mon profil
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50">
          <div>
            <Label className="text-base font-medium">Activer le profil public</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Apparaître dans la vitrine pour les clients libres
            </p>
          </div>
          <Switch
            checked={publicProfileEnabled}
            onCheckedChange={onTogglePublicProfile}
          />
        </div>

        {/* Lien du profil public - toujours visible pour les pionniers */}
        {driverId && (publicProfileEnabled || isPioneer) && (
          <div className="mt-4 space-y-3">
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary font-medium">
                  {isPioneer ? "✓ Votre profil pionnier est accessible immédiatement" : "✓ Votre profil est visible dans la vitrine publique"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={publicProfileUrl}
                  readOnly
                  className="flex-1 text-xs bg-background/50"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyLink}
                  className="gap-1 shrink-0"
                >
                  {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {linkCopied ? "Copié" : "Copier"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Partagez ce lien avec vos clients potentiels
              </p>
            </div>
          </div>
        )}

      </Card>

      {/* Visibilité par type de partenaire */}
      <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Visibilité aux partenaires</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Choisissez qui peut vous trouver pour des partenariats
        </p>

        <div className="space-y-3">
          {/* Visible aux chauffeurs */}
          {onVisibleToDriversChange && (
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <Label className="font-medium">Visible aux chauffeurs</Label>
                  <p className="text-sm text-muted-foreground">
                    Les autres chauffeurs peuvent vous proposer des partenariats
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {visibleToDrivers && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                    Visible
                  </Badge>
                )}
                <Switch
                  checked={visibleToDrivers}
                  onCheckedChange={onVisibleToDriversChange}
                />
              </div>
            </div>
          )}

          {/* Note: Les options "Visible aux entreprises" et "Visible aux gestionnaires de flotte" 
              ont été supprimées car ces rôles n'existent plus dans l'application SoloCab */}
        </div>
      </Card>

      {/* Confidentialité des informations */}
      <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Confidentialité des informations</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Contrôlez quelles informations sont visibles par les autres
        </p>

        <div className="space-y-3">
          {/* Note toujours visible publiquement - pas de toggle */}

          {/* Note pour les partenaires */}
          {onShowRatingPartnersChange && (
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Star className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <Label className="font-medium">Note pour les partenaires</Label>
                  <p className="text-sm text-muted-foreground">
                    Afficher votre note aux chauffeurs, entreprises et gestionnaires
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {showRatingPartners && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300">
                    Visible
                  </Badge>
                )}
                <Switch
                  checked={showRatingPartners}
                  onCheckedChange={onShowRatingPartnersChange}
                />
              </div>
            </div>
          )}

          {/* Tarifs pour les partenaires */}
          {onShowPricingPartnersChange && (
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <Label className="font-medium">Tarifs pour les partenaires</Label>
                  <p className="text-sm text-muted-foreground">
                    Afficher vos tarifs aux gestionnaires et entreprises partenaires
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {showPricingPartners && (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                    Visible
                  </Badge>
                )}
                <Switch
                  checked={showPricingPartners}
                  onCheckedChange={onShowPricingPartnersChange}
                />
              </div>
            </div>
          )}
        </div>

        {/* Note de confidentialité */}
        <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border/50">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
            <div className="space-y-1 text-sm">
              <p className="font-medium text-muted-foreground">Note sur la confidentialité</p>
              <p className="text-muted-foreground">
                Ces paramètres sont synchronisés avec les paramètres de partenariat. 
                Modifier un paramètre ici le modifiera également dans l'onglet Partenariats.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Photos */}
      <DualProfilePhotoUpload
        currentProfilePhotoUrl={profilePhotoUrl}
        currentCardPhotoUrl={cardPhotoUrl}
        userId={userId}
        driverName={driverName}
        onProfilePhotoUpdate={onPhotoUpdate}
        onCardPhotoUpdate={onCardPhotoUpdate}
      />

      {/* Affichage nom/entreprise */}
      <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Affichage dans le profil</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
            <Checkbox
              id="displayName"
              checked={displayDriverName}
              onCheckedChange={(checked) => onDisplayDriverNameChange(checked as boolean)}
            />
            <div className="flex-1">
              <Label htmlFor="displayName" className="font-medium cursor-pointer flex items-center gap-2">
                <User className="w-4 h-4" />
                Afficher mon nom
              </Label>
              <p className="text-sm text-muted-foreground">
                {driverName}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
            <Checkbox
              id="displayCompany"
              checked={displayCompanyName}
              onCheckedChange={(checked) => onDisplayCompanyNameChange(checked as boolean)}
            />
            <div className="flex-1">
              <Label htmlFor="displayCompany" className="font-medium cursor-pointer flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Afficher le nom de l'entreprise
              </Label>
              <p className="text-sm text-muted-foreground">
                {companyName || "Non défini"}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Coordonnées */}
      <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <Phone className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Informations de contact</h3>
        </div>
        <div className="space-y-4">
          {/* Téléphone */}
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border/50">
            <div className="space-y-2">
              <Label htmlFor="contact-phone" className="flex items-center gap-2 font-medium">
                <Phone className="w-4 h-4" />
                Numéro de téléphone
              </Label>
              <Input
                id="contact-phone"
                type="tel"
                placeholder="06 12 34 56 78"
                value={contactPhone}
                onChange={(e) => onContactPhoneChange?.(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <div>
                <Label className="font-medium">Afficher sur le profil</Label>
                <p className="text-sm text-muted-foreground">
                  Les partenaires pourront vous appeler
                </p>
              </div>
              <Switch
                checked={showPhone}
                onCheckedChange={onShowPhoneChange}
                disabled={!contactPhone}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border/50">
            <div className="space-y-2">
              <Label htmlFor="contact-email" className="flex items-center gap-2 font-medium">
                <Mail className="w-4 h-4" />
                Adresse email
              </Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="votre@email.com"
                value={contactEmail}
                onChange={(e) => onContactEmailChange?.(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <div>
                <Label className="font-medium">Afficher sur le profil</Label>
                <p className="text-sm text-muted-foreground">
                  Les partenaires pourront vous contacter par email
                </p>
              </div>
              <Switch
                checked={showEmail}
                onCheckedChange={onShowEmailChange}
                disabled={!contactEmail}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Secteurs */}
      <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
        <SectorSelector
          selectedSectors={workingSectors || []}
          onChange={onWorkingSectorsChange}
        />
      </Card>

      {/* Description du service - DÉPLACÉ plus haut */}
      <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
        <h3 className="text-lg font-semibold mb-4">Description du service</h3>
        <Textarea
          value={serviceDescription || ""}
          onChange={(e) => onServiceDescriptionChange(e.target.value)}
          placeholder="Décrivez votre service, vos spécialités, votre expérience..."
          rows={5}
          className="resize-none"
        />
      </Card>

      {/* Adresse - DÉPLACÉ plus haut */}
      <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Adresse de localisation</h3>
        </div>
        <AddressAutocomplete
          value={homeAddress || ""}
          onChange={(address, coords) => {
            if (coords) {
              onHomeAddressChange(address, coords);
            } else {
              onHomeAddressChange(address);
            }
          }}
          placeholder="Votre adresse de départ habituelle"
        />
        <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border/50">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
            <div className="space-y-2 text-sm">
              <p className="font-medium">Pourquoi cette adresse est importante ?</p>
              <p className="text-muted-foreground">
                Cette adresse permet de vous géolocaliser quand un client cherche des chauffeurs à proximité.
                Renseignez l'adresse de départ d'où vous décollez quotidiennement.
              </p>
              <p className="text-muted-foreground">
                💡 <span className="font-medium">Important :</span> Cette adresse est uniquement pour la recherche 
                de proximité et ne sera jamais affichée publiquement.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Gestionnaire Multi-Véhicules - NOUVEAU SYSTÈME */}
      {driverId && (
        <DriverVehiclesManager driverId={driverId} />
      )}


      {/* Services */}
      <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
        <ServicesSelector
          selectedServices={servicesOffered || []}
          onChange={onServicesOfferedChange}
        />
      </Card>

      {/* Catégories de véhicule */}
      <VehicleCategorySelector
        selectedCategories={vehicleCategories || []}
        onChange={onVehicleCategoriesChange}
      />

      {/* Équipements */}
      <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
        <EquipmentSelector
          selectedEquipment={vehicleEquipment || []}
          onChange={onVehicleEquipmentChange}
        />
      </Card>
    </div>
  );
});

DriverPublicProfile.displayName = "DriverPublicProfile";
