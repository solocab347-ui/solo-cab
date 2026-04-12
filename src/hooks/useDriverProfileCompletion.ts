import { useMemo } from "react";

export interface ProfileCompletionItem {
  id: string;
  category: "profile" | "billing" | "documents" | "visibility";
  label: string;
  description: string;
  isComplete: boolean;
  priority: "required" | "recommended" | "optional";
  navigateTo: string;
  tip: string;
}

export interface ProfileCompletionResult {
  items: ProfileCompletionItem[];
  completedCount: number;
  totalCount: number;
  percentage: number;
  requiredMissing: ProfileCompletionItem[];
  recommendedMissing: ProfileCompletionItem[];
  isProfileReady: boolean;
}

export const useDriverProfileCompletion = (driverProfile: any): ProfileCompletionResult => {
  return useMemo(() => {
    if (!driverProfile?.driver) {
      return {
        items: [],
        completedCount: 0,
        totalCount: 0,
        percentage: 0,
        requiredMissing: [],
        recommendedMissing: [],
        isProfileReady: false,
      };
    }

    const driver = driverProfile.driver;
    const profile = driverProfile;

    const items: ProfileCompletionItem[] = [
      // === PROFIL ===
      {
        id: "profile_photo",
        category: "profile",
        label: "Photo de profil",
        description: "Ajoutez une photo professionnelle pour inspirer confiance",
        isComplete: !!profile.profile_photo_url,
        priority: "required",
        navigateTo: "profile",
        tip: "Une photo professionnelle augmente vos réservations de 40%",
      },
      {
        id: "company_name",
        category: "profile",
        label: "Nom de l'entreprise",
        description: "Le nom affiché sur votre profil public",
        isComplete: !!driver.company_name && driver.company_name.trim().length > 0,
        priority: "required",
        navigateTo: "profile",
        tip: "Choisissez un nom professionnel et mémorable",
      },
      {
        id: "contact_phone",
        category: "profile",
        label: "Téléphone de contact",
        description: "Numéro pour être contacté par vos clients",
        isComplete: !!(driver.contact_phone || profile.phone),
        priority: "required",
        navigateTo: "profile",
        tip: "Assurez-vous d'être joignable sur ce numéro",
      },
      {
        id: "service_description",
        category: "profile",
        label: "Description de vos services",
        description: "Présentez-vous et décrivez votre offre",
        isComplete: !!driver.service_description && driver.service_description.length > 20,
        priority: "recommended",
        navigateTo: "profile",
        tip: "Parlez de votre expérience, vos spécialités et langues parlées",
      },
      {
        id: "working_sectors",
        category: "profile",
        label: "Secteurs d'activité",
        description: "Définissez vos zones de prise en charge",
        isComplete: driver.working_sectors && driver.working_sectors.length > 0,
        priority: "required",
        navigateTo: "profile",
        tip: "Plus vous êtes précis, mieux les clients vous trouvent",
      },

      // === VÉHICULE ===
      {
        id: "vehicle_brand",
        category: "profile",
        label: "Marque du véhicule",
        description: "Marque et modèle de votre véhicule",
        isComplete: !!driver.vehicle_brand,
        priority: "required",
        navigateTo: "profile",
        tip: "Les clients veulent savoir dans quel véhicule ils voyagent",
      },
      {
        id: "vehicle_color",
        category: "profile",
        label: "Couleur du véhicule",
        description: "Pour faciliter l'identification",
        isComplete: !!driver.vehicle_color,
        priority: "recommended",
        navigateTo: "profile",
        tip: "Aide les clients à vous repérer facilement",
      },
      {
        id: "vehicle_plate",
        category: "profile",
        label: "Plaque d'immatriculation",
        description: "Numéro de plaque pour l'identification",
        isComplete: !!driver.vehicle_plate,
        priority: "required",
        navigateTo: "profile",
        tip: "Obligatoire pour les documents officiels",
      },
      {
        id: "max_passengers",
        category: "profile",
        label: "Nombre de passagers max",
        description: "Capacité de votre véhicule",
        isComplete: !!driver.max_passengers && driver.max_passengers > 0,
        priority: "required",
        navigateTo: "profile",
        tip: "Important pour les réservations de groupe",
      },
      {
        id: "vehicle_photos",
        category: "profile",
        label: "Photos du véhicule",
        description: "Montrez votre véhicule sous son meilleur jour",
        isComplete: driver.vehicle_photos && driver.vehicle_photos.length > 0,
        priority: "recommended",
        navigateTo: "profile",
        tip: "Les photos augmentent la confiance des clients",
      },
      {
        id: "vehicle_equipment",
        category: "profile",
        label: "Équipements véhicule",
        description: "WiFi, eau, chargeurs, sièges bébé...",
        isComplete: driver.vehicle_equipment && driver.vehicle_equipment.length > 0,
        priority: "optional",
        navigateTo: "profile",
        tip: "Démarquez-vous avec vos équipements",
      },
      {
        id: "services_offered",
        category: "profile",
        label: "Services proposés",
        description: "Transferts aéroport, événements, longue distance...",
        isComplete: driver.services_offered && driver.services_offered.length > 0,
        priority: "recommended",
        navigateTo: "profile",
        tip: "Précisez vos spécialités pour attirer les bons clients",
      },

      // === TARIFICATION ===
      {
        id: "base_fare",
        category: "billing",
        label: "Tarif de base",
        description: "Prix minimum de prise en charge",
        isComplete: !!driver.base_fare && driver.base_fare > 0,
        priority: "required",
        navigateTo: "tarification",
        tip: "Généralement entre 5€ et 15€ selon votre zone",
      },
      {
        id: "per_km_rate",
        category: "billing",
        label: "Prix au kilomètre",
        description: "Tarif par km parcouru",
        isComplete: !!driver.per_km_rate && driver.per_km_rate > 0,
        priority: "required",
        navigateTo: "tarification",
        tip: "En moyenne 1.50€ à 3€ selon les zones",
      },
      {
        id: "hourly_rate",
        category: "billing",
        label: "Tarif horaire",
        description: "Pour les mises à disposition",
        isComplete: !!driver.hourly_rate && driver.hourly_rate > 0,
        priority: "recommended",
        navigateTo: "tarification",
        tip: "Pratique pour les événements et longues durées",
      },
      {
        id: "minimum_price",
        category: "billing",
        label: "Prix minimum",
        description: "Prix plancher pour toute course",
        isComplete: driver.minimum_price !== null && driver.minimum_price !== undefined,
        priority: "recommended",
        navigateTo: "tarification",
        tip: "Évite les courses trop courtes non rentables",
      },

      // === ENTREPRISE ===
      {
        id: "siret",
        category: "billing",
        label: "Numéro SIRET",
        description: "Identifiant de votre entreprise",
        isComplete: !!driver.siret && driver.siret.length === 14,
        priority: "required",
        navigateTo: "profile",
        tip: "14 chiffres, obligatoire pour facturer",
      },
      {
        id: "company_address",
        category: "billing",
        label: "Adresse de l'entreprise",
        description: "Adresse professionnelle pour les factures",
        isComplete: !!driver.company_address,
        priority: "required",
        navigateTo: "profile",
        tip: "Apparaît sur vos factures et devis",
      },

      // Profil public est automatiquement activé pour tous les chauffeurs
      // L'option de visibilité a été supprimée - visible_to_drivers reste pour les partenariats
    ];

    const completedCount = items.filter(i => i.isComplete).length;
    const totalCount = items.length;
    const percentage = Math.round((completedCount / totalCount) * 100);
    const requiredMissing = items.filter(i => !i.isComplete && i.priority === "required");
    const recommendedMissing = items.filter(i => !i.isComplete && i.priority === "recommended");
    const isProfileReady = requiredMissing.length === 0;

    return {
      items,
      completedCount,
      totalCount,
      percentage,
      requiredMissing,
      recommendedMissing,
      isProfileReady,
    };
  }, [driverProfile]);
};
