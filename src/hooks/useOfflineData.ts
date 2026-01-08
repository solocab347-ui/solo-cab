/**
 * Hook pour gérer la synchronisation et l'accès aux données offline
 * Synchronise automatiquement quand connecté, fournit le fallback quand hors ligne
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { offlineCache, OfflineClient, OfflineCourse, OfflineDriver, OfflineFleetDriver } from '@/lib/offlineCache';

interface UseOfflineDataReturn {
  isOnline: boolean;
  isOfflineMode: boolean;
  lastSync: Date | null;
  isSyncing: boolean;
  clients: OfflineClient[];
  courses: OfflineCourse[];
  driverProfile: OfflineDriver | null;
  fleetDrivers: OfflineFleetDriver[];
  syncNow: () => Promise<void>;
  stats: {
    clients: number;
    courses: number;
    lastSync: string | null;
  };
}

export const useOfflineData = (): UseOfflineDataReturn => {
  const { user, userRole } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [clients, setClients] = useState<OfflineClient[]>([]);
  const [courses, setCourses] = useState<OfflineCourse[]>([]);
  const [driverProfile, setDriverProfile] = useState<OfflineDriver | null>(null);
  const [fleetDrivers, setFleetDrivers] = useState<OfflineFleetDriver[]>([]);
  const [stats, setStats] = useState({ clients: 0, courses: 0, lastSync: null as string | null });

  // Écouter les changements de connectivité
  useEffect(() => {
    const handleOnline = () => {
      console.log('[OfflineData] Connexion rétablie');
      setIsOnline(true);
      setIsOfflineMode(false);
    };

    const handleOffline = () => {
      console.log('[OfflineData] Connexion perdue - Mode sans échec activé');
      setIsOnline(false);
      setIsOfflineMode(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Charger les données du cache au démarrage
  const loadFromCache = useCallback(async () => {
    await offlineCache.init();
    
    const [cachedClients, cachedCourses, cachedProfile, cachedFleet, cacheStats] = await Promise.all([
      offlineCache.getClients(),
      offlineCache.getCourses(),
      offlineCache.getDriverProfile(),
      offlineCache.getFleetDrivers(),
      offlineCache.getStats(),
    ]);

    setClients(cachedClients);
    setCourses(cachedCourses);
    setDriverProfile(cachedProfile);
    setFleetDrivers(cachedFleet);
    setStats(cacheStats);

    if (cacheStats.lastSync) {
      setLastSync(new Date(cacheStats.lastSync));
    }

    console.log('[OfflineData] Données chargées du cache:', cacheStats);
  }, []);

  // Synchroniser depuis Supabase
  const syncNow = useCallback(async () => {
    if (!user || !isOnline || isSyncing) return;

    setIsSyncing(true);
    console.log('[OfflineData] Début synchronisation...');

    try {
      await offlineCache.init();

      // Sync selon le rôle
      if (userRole === 'driver') {
        // Récupérer le profil driver avec le profil utilisateur
        const { data: driverData } = await supabase
          .from('drivers')
          .select('id, user_id, license_number, subscription_status')
          .eq('user_id', user.id)
          .single();

        if (driverData) {
          // Récupérer l'email et téléphone du profil
          const { data: profileData } = await supabase
            .from('profiles')
            .select('phone, full_name')
            .eq('id', user.id)
            .single();

          const driverToCache: OfflineDriver = {
            id: driverData.id,
            user_id: driverData.user_id,
            display_name: profileData?.full_name || undefined,
            phone: profileData?.phone || undefined,
            email: user.email || undefined,
            license_number: driverData.license_number || undefined,
            subscription_status: driverData.subscription_status || undefined,
            cached_at: new Date().toISOString(),
          };

          await offlineCache.saveDriverProfile(driverToCache);
          setDriverProfile(driverToCache);

          const driverId = driverData.id;

          // Récupérer les clients du chauffeur
          const { data: clientsData } = await supabase
            .from('clients')
            .select(`
              id, 
              user_id, 
              total_rides, 
              total_spent, 
              is_exclusive, 
              created_at,
              profiles!clients_user_id_fkey(full_name, phone)
            `)
            .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
            .limit(500);

          if (clientsData) {
            const clientsToCache: OfflineClient[] = clientsData.map((c: any) => ({
              id: c.id,
              user_id: c.user_id,
              full_name: c.profiles?.full_name || 'Client',
              phone: c.profiles?.phone,
              total_rides: c.total_rides,
              total_spent: c.total_spent,
              is_exclusive: c.is_exclusive,
              created_at: c.created_at,
              cached_at: new Date().toISOString(),
            }));

            await offlineCache.saveClients(clientsToCache);
            setClients(clientsToCache);
          }

          // Récupérer les courses (derniers 90 jours)
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

          const { data: coursesData } = await supabase
            .from('courses')
            .select(`
              id,
              client_id,
              pickup_address,
              destination_address,
              scheduled_date,
              status,
              price,
              course_type,
              payment_method,
              created_at,
              guest_name,
              guest_phone
            `)
            .eq('driver_id', driverId)
            .gte('created_at', ninetyDaysAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(500);

          if (coursesData) {
            const coursesToCache: OfflineCourse[] = coursesData.map((c: any) => ({
              id: c.id,
              client_id: c.client_id,
              client_name: undefined, // Will need separate query if needed
              guest_name: c.guest_name,
              guest_phone: c.guest_phone,
              pickup_address: c.pickup_address,
              destination_address: c.destination_address,
              scheduled_date: c.scheduled_date,
              status: c.status,
              price: c.price,
              course_type: c.course_type,
              payment_method: c.payment_method,
              created_at: c.created_at,
              cached_at: new Date().toISOString(),
            }));

            await offlineCache.saveCourses(coursesToCache);
            setCourses(coursesToCache);
          }
        }
      } else if (userRole === 'fleet_manager') {
        // Récupérer les données du gestionnaire de flotte
        const { data: fmData } = await supabase
          .from('fleet_managers')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (fmData) {
          // Récupérer les chauffeurs de la flotte avec leurs profils
          const { data: driversData } = await supabase
            .from('fleet_manager_drivers')
            .select(`
              id,
              driver_id,
              status
            `)
            .eq('fleet_manager_id', fmData.id)
            .eq('status', 'active');

          if (driversData && driversData.length > 0) {
            // Récupérer les infos des chauffeurs séparément
            const driverIds = driversData.map(d => d.driver_id);
            
            const { data: driverProfiles } = await supabase
              .from('drivers')
              .select('id, user_id')
              .in('id', driverIds);

            const userIds = driverProfiles?.map(d => d.user_id) || [];
            
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, full_name, phone')
              .in('id', userIds);

            const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
            const driverUserMap = new Map(driverProfiles?.map(d => [d.id, d.user_id]) || []);

            const fleetToCache: OfflineFleetDriver[] = driversData.map((d: any) => {
              const userId = driverUserMap.get(d.driver_id);
              const profile = userId ? profileMap.get(userId) : null;
              return {
                id: d.id,
                driver_id: d.driver_id,
                driver_name: profile?.full_name || undefined,
                driver_phone: profile?.phone || undefined,
                status: d.status,
                cached_at: new Date().toISOString(),
              };
            });

            await offlineCache.saveFleetDrivers(fleetToCache);
            setFleetDrivers(fleetToCache);
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

            const { data: coursesData } = await supabase
              .from('courses')
              .select(`
                id,
                driver_id,
                client_id,
                pickup_address,
                destination_address,
                scheduled_date,
                status,
                price,
                course_type,
                payment_method,
                created_at,
                guest_name,
                guest_phone
              `)
              .in('driver_id', driverIds)
              .gte('created_at', ninetyDaysAgo.toISOString())
              .order('created_at', { ascending: false })
              .limit(1000);

            if (coursesData) {
              const coursesToCache: OfflineCourse[] = coursesData.map((c: any) => ({
                id: c.id,
                client_id: c.client_id,
                guest_name: c.guest_name,
                guest_phone: c.guest_phone,
                pickup_address: c.pickup_address,
                destination_address: c.destination_address,
                scheduled_date: c.scheduled_date,
                status: c.status,
                price: c.price,
                course_type: c.course_type,
                payment_method: c.payment_method,
                created_at: c.created_at,
                cached_at: new Date().toISOString(),
              }));

              await offlineCache.saveCourses(coursesToCache);
              setCourses(coursesToCache);
            }
          }
        }
      }

      // Sauvegarder les métadonnées
      const syncTime = new Date().toISOString();
      await offlineCache.saveMetadata({
        lastSync: syncTime,
        userId: user.id,
        userRole: userRole || 'unknown',
      });

      setLastSync(new Date(syncTime));
      const newStats = await offlineCache.getStats();
      setStats(newStats);

      console.log('[OfflineData] Synchronisation terminée:', newStats);
    } catch (error) {
      console.error('[OfflineData] Erreur synchronisation:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [user, userRole, isOnline, isSyncing]);

  // Charger au démarrage
  useEffect(() => {
    loadFromCache();
  }, [loadFromCache]);

  // Synchroniser quand connecté et utilisateur authentifié
  useEffect(() => {
    if (user && isOnline && (userRole === 'driver' || userRole === 'fleet_manager')) {
      // Sync initial
      syncNow();

      // Sync périodique toutes les 5 minutes
      const interval = setInterval(syncNow, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user, userRole, isOnline]);

  return {
    isOnline,
    isOfflineMode,
    lastSync,
    isSyncing,
    clients,
    courses,
    driverProfile,
    fleetDrivers,
    syncNow,
    stats,
  };
};
