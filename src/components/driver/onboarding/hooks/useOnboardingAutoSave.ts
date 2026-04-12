import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { geocodeAddress } from '@/lib/geocoding';

interface SettingsData {
  baseFare: string;
  perKmRate: string;
  hourlyRate: string;
  minimumPrice: string;
  maxPassengers: string;
  tvaIncluded: boolean;
  companyName: string;
  companyAddress: string;
  siret: string;
  siren: string;
  tvaNumber: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleColor: string;
  vehiclePlate: string;
}

interface ProfileData {
  profilePhotoUrl: string | null;
  cardPhotoUrl: string | null;
  serviceDescription: string;
  workingSectors: string[];
  vehicleEquipment: string[];
  servicesOffered: string[];
  vehicleCategories: string[];
  displayDriverName: boolean;
  displayCompanyName: boolean;
}

interface AutoSaveData {
  settings: SettingsData;
  profile: ProfileData;
}

export function useOnboardingAutoSave(
  driverId: string,
  userId: string,
  currentStep: number
) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>('');

  const saveSettings = useCallback(async (data: SettingsData) => {
    try {
      const { error } = await supabase
        .from('drivers')
        .update({
          base_fare: data.baseFare ? parseFloat(data.baseFare) : null,
          per_km_rate: data.perKmRate ? parseFloat(data.perKmRate) : null,
          hourly_rate: data.hourlyRate ? parseFloat(data.hourlyRate) : null,
          minimum_price: data.minimumPrice ? parseFloat(data.minimumPrice) : 0,
          max_passengers: data.maxPassengers ? parseInt(data.maxPassengers) : 4,
          tva_included: data.tvaIncluded,
          company_name: data.companyName || null,
          company_address: data.companyAddress || null,
          siret: data.siret || null,
          siren: data.siren || null,
          tva_number: data.tvaNumber || null,
          vehicle_brand: data.vehicleBrand || null,
          vehicle_model: data.vehicleModel || null,
          vehicle_year: data.vehicleYear ? parseInt(data.vehicleYear) : null,
          vehicle_color: data.vehicleColor || null,
          vehicle_plate: data.vehiclePlate || null,
        })
        .eq('id', driverId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Auto-save settings error:', error);
      return false;
    }
  }, [driverId]);

  const saveProfile = useCallback(async (data: ProfileData) => {
    try {
      const resolvedHomeAddress = '';
      const resolvedHomeCoordinates = null;

      // Update profile photo in profiles table
      if (data.profilePhotoUrl) {
        await supabase
          .from('profiles')
          .update({ profile_photo_url: data.profilePhotoUrl })
          .eq('id', userId);
      }

      // Update driver data
      const { error } = await supabase
        .from('drivers')
        .update({
          card_photo_url: data.cardPhotoUrl,
          service_description: data.serviceDescription || null,
          working_sectors: data.workingSectors,
          vehicle_equipment: data.vehicleEquipment,
          services_offered: data.servicesOffered,
          vehicle_category: data.vehicleCategories,
          display_driver_name: data.displayDriverName,
          display_company_name: data.displayCompanyName,
        })
        .eq('id', driverId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Auto-save profile error:', error);
      return false;
    }
  }, [driverId, userId]);

  // Auto-save based on step ID, not step index
  // Step mapping: 0=vision, 1=goals, 2=settings, 3=profile, 4=documents, 5=nfc, 6=billing, 7=trial_start
  const autoSave = useCallback((stepData: AutoSaveData, stepId: string) => {
    // Serialize current data for comparison
    const dataString = JSON.stringify(stepData);
    
    // Skip if data hasn't changed
    if (dataString === lastSavedDataRef.current) {
      return;
    }

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save - wait 2 seconds after last change
    saveTimeoutRef.current = setTimeout(async () => {
      let success = false;
      
      if (stepId === 'settings') {
        success = await saveSettings(stepData.settings);
      } else if (stepId === 'profile') {
        success = await saveProfile(stepData.profile);
      }

      if (success) {
        lastSavedDataRef.current = dataString;
        console.log('Auto-saved onboarding data for step:', stepId);
      }
    }, 2000);
  }, [saveSettings, saveProfile]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Save immediately on step change or page unload
  const saveImmediately = useCallback(async (stepData: AutoSaveData, stepId: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    let success = false;
    if (stepId === 'settings') {
      success = await saveSettings(stepData.settings);
    } else if (stepId === 'profile') {
      success = await saveProfile(stepData.profile);
    }

    if (success) {
      lastSavedDataRef.current = JSON.stringify(stepData);
    }
    return success;
  }, [saveSettings, saveProfile]);

  return { autoSave, saveImmediately, saveSettings, saveProfile };
}
