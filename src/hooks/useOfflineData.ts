/**
 * Hook pour gérer la synchronisation et l'accès aux données offline
 * Synchronise automatiquement quand connecté, fournit le fallback quand hors ligne
 * Supporte: clients, chauffeurs, gestionnaires de flotte, entreprises, collaborateurs
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  offlineCache, 
  OfflineClient, 
  OfflineCourse, 
  OfflineDriver, 
  OfflineFleetDriver,
  OfflineCompanyEmployee 
} from '@/lib/offlineCache';
import { connectionRecovery } from '@/lib/connectionOptimizer';
import { invalidateCriticalQueries } from '@/lib/queryClient';
import { toast } from 'sonner';

interface UseOfflineDataReturn {
  isOnline: boolean;
  isOfflineMode: boolean;
  lastSync: Date | null;
  isSyncing: boolean;
  clients: OfflineClient[];
  courses: OfflineCourse[];
  driverProfile: OfflineDriver | null;
  myDrivers: OfflineDriver[];
  fleetDrivers: OfflineFleetDriver[];
  companyEmployees: OfflineCompanyEmployee[];
  syncNow: () => Promise<void>;
  stats: {
    clients: number;
    courses: number;
    drivers: number;
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
  const [myDrivers, setMyDrivers] = useState<OfflineDriver[]>([]);
  const [fleetDrivers, setFleetDrivers] = useState<OfflineFleetDriver[]>([]);
  const [companyEmployees, setCompanyEmployees] = useState<OfflineCompanyEmployee[]>([]);
  const [stats, setStats] = useState({ clients: 0, courses: 0, drivers: 0, lastSync: null as string | null });

  const hasSyncedOnReconnect = useRef(false);

  // Écouter les changements de connectivité
  useEffect(() => {
    const handleOnline = () => {
      console.log('[OfflineData] Connexion rétablie');
      setIsOnline(true);
      setIsOfflineMode(false);
      
      // Sync automatique au retour de connexion (une seule fois)
      if (!hasSyncedOnReconnect.current) {
        hasSyncedOnReconnect.current = true;
        toast.info('Connexion rétablie - synchronisation en cours...');
        // Attendre 2s pour que la connexion se stabilise
        setTimeout(() => {
          syncNow();
          invalidateCriticalQueries();
        }, 2000);
      }
    };

    const handleOffline = () => {
      console.log('[OfflineData] Connexion perdue - Mode hors ligne activé');
      setIsOnline(false);
      setIsOfflineMode(true);
      hasSyncedOnReconnect.current = false;
      toast.warning('Mode hors ligne activé', {
        description: 'Les données en cache restent accessibles',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Écouter les récupérations de connexion
    const unsubscribe = connectionRecovery.onStateChange((state) => {
      if (state === 'recovered' && !hasSyncedOnReconnect.current) {
        hasSyncedOnReconnect.current = true;
        syncNow();
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  // Charger les données du cache au démarrage
  const loadFromCache = useCallback(async () => {
    await offlineCache.init();
    
    const [cachedClients, cachedCourses, cachedProfile, cachedMyDrivers, cachedFleet, cachedEmployees, cacheStats] = await Promise.all([
      offlineCache.getClients(),
      offlineCache.getCourses(),
      offlineCache.getDriverProfile(),
      offlineCache.getMyDrivers(),
      offlineCache.getFleetDrivers(),
      offlineCache.getCompanyEmployees(),
      offlineCache.getStats(),
    ]);

    setClients(cachedClients);
    setCourses(cachedCourses);
    setDriverProfile(cachedProfile);
    setMyDrivers(cachedMyDrivers);
    setFleetDrivers(cachedFleet);
    setCompanyEmployees(cachedEmployees);
    setStats(cacheStats);

    if (cacheStats.lastSync) {
      setLastSync(new Date(cacheStats.lastSync));
    }

    console.log('[OfflineData] Données chargées du cache:', cacheStats);
  }, []);

  // Synchroniser les données client
  const syncClientData = useCallback(async (userId: string) => {
    console.log('[OfflineData] Sync client...');
    
    // Récupérer le client record
    const { data: clientData } = await supabase
      .from('clients')
      .select('id, driver_id, driver_ids, favorite_driver_id')
      .eq('user_id', userId)
      .single();

    if (!clientData) return;

    // Récupérer les chauffeurs associés
    const driverIds: string[] = [];
    if (clientData.driver_id) driverIds.push(clientData.driver_id);
    if (clientData.driver_ids) driverIds.push(...clientData.driver_ids);
    if (clientData.favorite_driver_id && !driverIds.includes(clientData.favorite_driver_id)) {
      driverIds.push(clientData.favorite_driver_id);
    }

    if (driverIds.length > 0) {
      const { data: driversData } = await supabase
        .from('drivers')
        .select('id, user_id, company_name, vehicle_model, vehicle_color')
        .in('id', driverIds);

      if (driversData && driversData.length > 0) {
        const userIds = driversData.map(d => d.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, phone')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const driversToCache: OfflineDriver[] = driversData.map(d => {
          const profile = profileMap.get(d.user_id);
          return {
            id: d.id,
            user_id: d.user_id,
            display_name: profile?.full_name,
            phone: profile?.phone,
            company_name: d.company_name,
            vehicle_model: d.vehicle_model,
            vehicle_color: d.vehicle_color,
            cached_at: new Date().toISOString(),
          };
        });

        await offlineCache.saveMyDrivers(driversToCache);
        setMyDrivers(driversToCache);
      }
    }

    // Récupérer les courses du client (derniers 90 jours)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: coursesData } = await supabase
      .from('courses')
      .select(`
        id,
        driver_id,
        pickup_address,
        destination_address,
        scheduled_date,
        status,
        final_payment_amount,
        course_type,
        payment_method,
        created_at,
        drivers!courses_driver_id_fkey(id, user_id, company_name)
      `)
      .eq('client_id', clientData.id)
      .gte('created_at', ninetyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(200);

    if (coursesData) {
      // Récupérer les noms des chauffeurs
      const driverUserIds = coursesData
        .filter((c: any) => c.drivers?.user_id)
        .map((c: any) => c.drivers.user_id);

      const { data: driverProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', driverUserIds);

      const driverProfileMap = new Map(driverProfiles?.map(p => [p.id, p]) || []);

      const coursesToCache: OfflineCourse[] = coursesData.map((c: any) => {
        const driverProfile = c.drivers?.user_id ? driverProfileMap.get(c.drivers.user_id) : null;
        return {
          id: c.id,
          driver_id: c.driver_id,
          driver_name: driverProfile?.full_name || c.drivers?.company_name,
          driver_phone: driverProfile?.phone,
          pickup_address: c.pickup_address,
          destination_address: c.destination_address,
          scheduled_date: c.scheduled_date,
          status: c.status,
          final_payment_amount: c.final_payment_amount,
          course_type: c.course_type,
          payment_method: c.payment_method,
          created_at: c.created_at,
          cached_at: new Date().toISOString(),
        };
      });

      await offlineCache.saveCourses(coursesToCache);
      setCourses(coursesToCache);
    }
  }, []);

  // Synchroniser les données chauffeur
  const syncDriverData = useCallback(async (userId: string, userEmail?: string) => {
    console.log('[OfflineData] Sync chauffeur...');

    const { data: driverData } = await supabase
      .from('drivers')
      .select('id, user_id, license_number, subscription_status, company_name, vehicle_model, vehicle_color')
      .eq('user_id', userId)
      .single();

    if (!driverData) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('phone, full_name')
      .eq('id', userId)
      .single();

    const driverToCache: OfflineDriver = {
      id: driverData.id,
      user_id: driverData.user_id,
      display_name: profileData?.full_name,
      phone: profileData?.phone,
      email: userEmail,
      license_number: driverData.license_number,
      subscription_status: driverData.subscription_status,
      company_name: driverData.company_name,
      vehicle_model: driverData.vehicle_model,
      vehicle_color: driverData.vehicle_color,
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
        final_payment_amount,
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
        guest_name: c.guest_name,
        guest_phone: c.guest_phone,
        pickup_address: c.pickup_address,
        destination_address: c.destination_address,
        scheduled_date: c.scheduled_date,
        status: c.status,
        final_payment_amount: c.final_payment_amount,
        course_type: c.course_type,
        payment_method: c.payment_method,
        created_at: c.created_at,
        cached_at: new Date().toISOString(),
      }));

      await offlineCache.saveCourses(coursesToCache);
      setCourses(coursesToCache);
    }
  }, []);

  // Synchroniser les données gestionnaire de flotte
  const syncFleetManagerData = useCallback(async (userId: string) => {
    console.log('[OfflineData] Sync gestionnaire de flotte...');

    const { data: fmData } = await supabase
      .from('fleet_managers')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!fmData) return;

    // Récupérer les chauffeurs de la flotte
    const { data: driversData } = await supabase
      .from('fleet_manager_drivers')
      .select('id, driver_id, status')
      .eq('fleet_manager_id', fmData.id)
      .eq('status', 'active');

    if (driversData && driversData.length > 0) {
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
          driver_name: profile?.full_name,
          driver_phone: profile?.phone,
          status: d.status,
          cached_at: new Date().toISOString(),
        };
      });

      await offlineCache.saveFleetDrivers(fleetToCache);
      setFleetDrivers(fleetToCache);

      // Récupérer les courses des chauffeurs de la flotte
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
          final_payment_amount,
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
          driver_id: c.driver_id,
          client_id: c.client_id,
          guest_name: c.guest_name,
          guest_phone: c.guest_phone,
          pickup_address: c.pickup_address,
          destination_address: c.destination_address,
          scheduled_date: c.scheduled_date,
          status: c.status,
          final_payment_amount: c.final_payment_amount,
          course_type: c.course_type,
          payment_method: c.payment_method,
          created_at: c.created_at,
          cached_at: new Date().toISOString(),
        }));

        await offlineCache.saveCourses(coursesToCache);
        setCourses(coursesToCache);
      }
    }
  }, []);

  // Synchroniser les données entreprise
  const syncCompanyData = useCallback(async (userId: string) => {
    console.log('[OfflineData] Sync entreprise...');

    const { data: companyData } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!companyData) {
      // Vérifier si c'est un administrateur
      const { data: adminData } = await supabase
        .from('company_administrators')
        .select('company_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (!adminData) return;
      
      return syncCompanyByCompanyId(adminData.company_id);
    }

    return syncCompanyByCompanyId(companyData.id);
  }, []);

  const syncCompanyByCompanyId = async (companyId: string) => {
    // Récupérer les collaborateurs
    const { data: employeesData } = await supabase
      .from('company_employees')
      .select(`
        id,
        user_id,
        department,
        job_title,
        profiles!company_employees_user_id_fkey(full_name, phone)
      `)
      .eq('company_id', companyId)
      .eq('is_active', true);

    if (employeesData) {
      const employeesToCache: OfflineCompanyEmployee[] = employeesData.map((e: any) => ({
        id: e.id,
        user_id: e.user_id,
        employee_name: e.profiles?.full_name,
        phone: e.profiles?.phone,
        department: e.department,
        job_title: e.job_title,
        cached_at: new Date().toISOString(),
      }));

      await offlineCache.saveCompanyEmployees(employeesToCache);
      setCompanyEmployees(employeesToCache);
    }

    // Récupérer les courses de l'entreprise
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: companyCoursesData } = await supabase
      .from('company_courses')
      .select(`
        course_id,
        courses!company_courses_course_id_fkey(
          id,
          driver_id,
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
        )
      `)
      .eq('company_id', companyId)
      .limit(500);

    if (companyCoursesData) {
      const coursesToCache: OfflineCourse[] = companyCoursesData
        .filter((cc: any) => cc.courses)
        .map((cc: any) => ({
          id: cc.courses.id,
          driver_id: cc.courses.driver_id,
          guest_name: cc.courses.guest_name,
          guest_phone: cc.courses.guest_phone,
          pickup_address: cc.courses.pickup_address,
          destination_address: cc.courses.destination_address,
          scheduled_date: cc.courses.scheduled_date,
          status: cc.courses.status,
          price: cc.courses.guest_estimated_price,
          course_type: cc.courses.course_type,
          payment_method: cc.courses.payment_method,
          created_at: cc.courses.created_at,
          cached_at: new Date().toISOString(),
        }));

      await offlineCache.saveCourses(coursesToCache);
      setCourses(coursesToCache);
    }
  };

  // Synchroniser les données collaborateur entreprise
  const syncEmployeeData = useCallback(async (userId: string) => {
    console.log('[OfflineData] Sync collaborateur...');

    const { data: employeeData } = await supabase
      .from('company_employees')
      .select('id, company_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (!employeeData) return;

    // Récupérer les courses du collaborateur
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: companyCoursesData } = await supabase
      .from('company_courses')
      .select(`
        course_id,
        courses!company_courses_course_id_fkey(
          id,
          driver_id,
          pickup_address,
          destination_address,
          scheduled_date,
          status,
          guest_estimated_price,
          course_type,
          payment_method,
          created_at,
          guest_name,
          guest_phone,
          drivers!courses_driver_id_fkey(id, user_id, company_name)
        )
      `)
      .eq('employee_id', employeeData.id)
      .limit(200);

    if (companyCoursesData) {
      // Récupérer les infos des chauffeurs
      const driverUserIds = companyCoursesData
        .filter((cc: any) => cc.courses?.drivers?.user_id)
        .map((cc: any) => cc.courses.drivers.user_id);

      const { data: driverProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', driverUserIds);

      const driverProfileMap = new Map(driverProfiles?.map(p => [p.id, p]) || []);

      const coursesToCache: OfflineCourse[] = companyCoursesData
        .filter((cc: any) => cc.courses)
        .map((cc: any) => {
          const driverProfile = cc.courses.drivers?.user_id 
            ? driverProfileMap.get(cc.courses.drivers.user_id) 
            : null;
          return {
            id: cc.courses.id,
            driver_id: cc.courses.driver_id,
            driver_name: driverProfile?.full_name || cc.courses.drivers?.company_name,
            driver_phone: driverProfile?.phone,
            guest_name: cc.courses.guest_name,
            guest_phone: cc.courses.guest_phone,
            pickup_address: cc.courses.pickup_address,
            destination_address: cc.courses.destination_address,
            scheduled_date: cc.courses.scheduled_date,
            status: cc.courses.status,
            price: cc.courses.guest_estimated_price,
            course_type: cc.courses.course_type,
            payment_method: cc.courses.payment_method,
            created_at: cc.courses.created_at,
            cached_at: new Date().toISOString(),
          };
        });

      await offlineCache.saveCourses(coursesToCache);
      setCourses(coursesToCache);

      // Sauvegarder les chauffeurs uniques
      const uniqueDrivers = new Map<string, OfflineDriver>();
      companyCoursesData.forEach((cc: any) => {
        if (cc.courses?.drivers) {
          const d = cc.courses.drivers;
          const profile = driverProfileMap.get(d.user_id);
          if (!uniqueDrivers.has(d.id)) {
            uniqueDrivers.set(d.id, {
              id: d.id,
              user_id: d.user_id,
              display_name: profile?.full_name,
              phone: profile?.phone,
              company_name: d.company_name,
              cached_at: new Date().toISOString(),
            });
          }
        }
      });

      if (uniqueDrivers.size > 0) {
        await offlineCache.saveMyDrivers(Array.from(uniqueDrivers.values()));
        setMyDrivers(Array.from(uniqueDrivers.values()));
      }
    }
  }, []);

  // Synchroniser depuis Supabase
  const syncNow = useCallback(async () => {
    if (!user || !isOnline || isSyncing) return;

    setIsSyncing(true);
    console.log('[OfflineData] Début synchronisation pour rôle:', userRole);

    try {
      await offlineCache.init();

      // Sync selon le rôle
      if (userRole === 'client') {
        await syncClientData(user.id);
      } else if (userRole === 'driver') {
        await syncDriverData(user.id, user.email);
      } else if (userRole === 'admin') {
        // Admin: sync minimal ou rien
        console.log('[OfflineData] Admin sync skipped');
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
  }, [user, userRole, isOnline, isSyncing, syncClientData, syncDriverData, syncFleetManagerData, syncCompanyData, syncEmployeeData]);

  // Charger au démarrage
  useEffect(() => {
    loadFromCache();
  }, [loadFromCache]);

  // Synchroniser quand connecté et utilisateur authentifié
  useEffect(() => {
    if (user && isOnline) {
      // Sync initial
      syncNow();

      // Sync périodique toutes les 5 minutes
      const interval = setInterval(syncNow, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user, isOnline]);

  return {
    isOnline,
    isOfflineMode,
    lastSync,
    isSyncing,
    clients,
    courses,
    driverProfile,
    myDrivers,
    fleetDrivers,
    companyEmployees,
    syncNow,
    stats,
  };
};
