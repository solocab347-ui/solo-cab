/**
 * Service de cache offline pour SoloCab
 * Stocke les données critiques (courses, clients) dans IndexedDB
 * pour consultation en mode sans échec
 * Supporte: clients, chauffeurs, gestionnaires de flotte, entreprises, collaborateurs
 */

const DB_NAME = 'solocab-offline';
const DB_VERSION = 2;

interface OfflineClient {
  id: string;
  user_id: string;
  full_name: string;
  phone?: string;
  email?: string;
  total_rides?: number;
  total_spent?: number;
  is_exclusive?: boolean;
  created_at: string;
  cached_at: string;
}

interface OfflineCourse {
  id: string;
  client_id?: string;
  driver_id?: string;
  client_name?: string;
  driver_name?: string;
  driver_phone?: string;
  guest_name?: string;
  guest_phone?: string;
  pickup_address: string;
  destination_address?: string;
  scheduled_date?: string;
  status: string;
  final_payment_amount?: number;
  course_type?: string;
  payment_method?: string;
  created_at: string;
  cached_at: string;
}

interface OfflineDriver {
  id: string;
  user_id: string;
  display_name?: string;
  phone?: string;
  email?: string;
  license_number?: string;
  subscription_status?: string;
  company_name?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  cached_at: string;
}

interface OfflineFleetDriver {
  id: string;
  driver_id: string;
  driver_name?: string;
  driver_phone?: string;
  status: string;
  cached_at: string;
}

interface OfflineCompanyEmployee {
  id: string;
  user_id: string;
  employee_name?: string;
  phone?: string;
  email?: string;
  department?: string;
  job_title?: string;
  cached_at: string;
}

interface CacheMetadata {
  lastSync: string;
  userId: string;
  userRole: string;
}

class OfflineCacheService {
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  async init(): Promise<boolean> {
    if (this.isInitialized && this.db) return true;

    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          console.error('[OfflineCache] Erreur ouverture IndexedDB');
          resolve(false);
        };

        request.onsuccess = () => {
          this.db = request.result;
          this.isInitialized = true;
          console.log('[OfflineCache] IndexedDB initialisé');
          resolve(true);
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // Supprimer les anciens stores si on upgrade
          const storeNames = ['clients', 'courses', 'driver_profile', 'fleet_drivers', 'metadata', 'my_drivers', 'company_employees'];
          storeNames.forEach(name => {
            if (db.objectStoreNames.contains(name)) {
              db.deleteObjectStore(name);
            }
          });

          // Store pour les clients
          const clientsStore = db.createObjectStore('clients', { keyPath: 'id' });
          clientsStore.createIndex('user_id', 'user_id', { unique: false });
          clientsStore.createIndex('full_name', 'full_name', { unique: false });

          // Store pour les courses
          const coursesStore = db.createObjectStore('courses', { keyPath: 'id' });
          coursesStore.createIndex('status', 'status', { unique: false });
          coursesStore.createIndex('scheduled_date', 'scheduled_date', { unique: false });
          coursesStore.createIndex('client_id', 'client_id', { unique: false });
          coursesStore.createIndex('driver_id', 'driver_id', { unique: false });

          // Store pour le profil driver
          db.createObjectStore('driver_profile', { keyPath: 'id' });

          // Store pour les chauffeurs de flotte
          const fleetStore = db.createObjectStore('fleet_drivers', { keyPath: 'id' });
          fleetStore.createIndex('status', 'status', { unique: false });

          // Store pour les chauffeurs favoris (pour clients)
          const myDriversStore = db.createObjectStore('my_drivers', { keyPath: 'id' });
          myDriversStore.createIndex('driver_id', 'driver_id', { unique: false });

          // Store pour les collaborateurs d'entreprise
          const employeesStore = db.createObjectStore('company_employees', { keyPath: 'id' });
          employeesStore.createIndex('user_id', 'user_id', { unique: false });

          // Store pour les métadonnées
          db.createObjectStore('metadata', { keyPath: 'key' });

          console.log('[OfflineCache] Stores créés (v2)');
        };
      } catch (error) {
        console.error('[OfflineCache] Erreur init:', error);
        resolve(false);
      }
    });
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore | null> {
    if (!this.db) {
      const initialized = await this.init();
      if (!initialized || !this.db) return null;
    }
    try {
      const transaction = this.db.transaction(storeName, mode);
      return transaction.objectStore(storeName);
    } catch (error) {
      console.error(`[OfflineCache] Erreur accès store ${storeName}:`, error);
      return null;
    }
  }

  // ===== CLIENTS =====
  async saveClients(clients: OfflineClient[]): Promise<boolean> {
    const store = await this.getStore('clients', 'readwrite');
    if (!store) return false;

    return new Promise((resolve) => {
      try {
        const cached_at = new Date().toISOString();
        let completed = 0;

        clients.forEach((client) => {
          const request = store.put({ ...client, cached_at });
          request.onsuccess = () => {
            completed++;
            if (completed === clients.length) {
              console.log(`[OfflineCache] ${clients.length} clients sauvegardés`);
              resolve(true);
            }
          };
          request.onerror = () => resolve(false);
        });

        if (clients.length === 0) resolve(true);
      } catch (error) {
        console.error('[OfflineCache] Erreur sauvegarde clients:', error);
        resolve(false);
      }
    });
  }

  async getClients(): Promise<OfflineClient[]> {
    const store = await this.getStore('clients');
    if (!store) return [];

    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  }

  // ===== COURSES =====
  async saveCourses(courses: OfflineCourse[]): Promise<boolean> {
    const store = await this.getStore('courses', 'readwrite');
    if (!store) return false;

    return new Promise((resolve) => {
      try {
        const cached_at = new Date().toISOString();
        let completed = 0;

        courses.forEach((course) => {
          const request = store.put({ ...course, cached_at });
          request.onsuccess = () => {
            completed++;
            if (completed === courses.length) {
              console.log(`[OfflineCache] ${courses.length} courses sauvegardées`);
              resolve(true);
            }
          };
          request.onerror = () => resolve(false);
        });

        if (courses.length === 0) resolve(true);
      } catch (error) {
        console.error('[OfflineCache] Erreur sauvegarde courses:', error);
        resolve(false);
      }
    });
  }

  async getCourses(): Promise<OfflineCourse[]> {
    const store = await this.getStore('courses');
    if (!store) return [];

    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  }

  // ===== DRIVER PROFILE =====
  async saveDriverProfile(driver: OfflineDriver): Promise<boolean> {
    const store = await this.getStore('driver_profile', 'readwrite');
    if (!store) return false;

    return new Promise((resolve) => {
      const cached_at = new Date().toISOString();
      const request = store.put({ ...driver, cached_at });
      request.onsuccess = () => {
        console.log('[OfflineCache] Profil driver sauvegardé');
        resolve(true);
      };
      request.onerror = () => resolve(false);
    });
  }

  async getDriverProfile(): Promise<OfflineDriver | null> {
    const store = await this.getStore('driver_profile');
    if (!store) return null;

    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result?.[0] || null);
      request.onerror = () => resolve(null);
    });
  }

  // ===== FLEET DRIVERS =====
  async saveFleetDrivers(drivers: OfflineFleetDriver[]): Promise<boolean> {
    const store = await this.getStore('fleet_drivers', 'readwrite');
    if (!store) return false;

    return new Promise((resolve) => {
      try {
        const cached_at = new Date().toISOString();
        let completed = 0;

        drivers.forEach((driver) => {
          const request = store.put({ ...driver, cached_at });
          request.onsuccess = () => {
            completed++;
            if (completed === drivers.length) {
              console.log(`[OfflineCache] ${drivers.length} fleet drivers sauvegardés`);
              resolve(true);
            }
          };
          request.onerror = () => resolve(false);
        });

        if (drivers.length === 0) resolve(true);
      } catch (error) {
        console.error('[OfflineCache] Erreur sauvegarde fleet drivers:', error);
        resolve(false);
      }
    });
  }

  async getFleetDrivers(): Promise<OfflineFleetDriver[]> {
    const store = await this.getStore('fleet_drivers');
    if (!store) return [];

    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  }

  // ===== MY DRIVERS (pour clients) =====
  async saveMyDrivers(drivers: OfflineDriver[]): Promise<boolean> {
    const store = await this.getStore('my_drivers', 'readwrite');
    if (!store) return false;

    return new Promise((resolve) => {
      try {
        const cached_at = new Date().toISOString();
        let completed = 0;

        if (drivers.length === 0) {
          resolve(true);
          return;
        }

        drivers.forEach((driver) => {
          const request = store.put({ ...driver, cached_at });
          request.onsuccess = () => {
            completed++;
            if (completed === drivers.length) {
              console.log(`[OfflineCache] ${drivers.length} chauffeurs sauvegardés (client)`);
              resolve(true);
            }
          };
          request.onerror = () => resolve(false);
        });
      } catch (error) {
        console.error('[OfflineCache] Erreur sauvegarde chauffeurs:', error);
        resolve(false);
      }
    });
  }

  async getMyDrivers(): Promise<OfflineDriver[]> {
    const store = await this.getStore('my_drivers');
    if (!store) return [];

    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  }

  // ===== COMPANY EMPLOYEES =====
  async saveCompanyEmployees(employees: OfflineCompanyEmployee[]): Promise<boolean> {
    const store = await this.getStore('company_employees', 'readwrite');
    if (!store) return false;

    return new Promise((resolve) => {
      try {
        const cached_at = new Date().toISOString();
        let completed = 0;

        if (employees.length === 0) {
          resolve(true);
          return;
        }

        employees.forEach((emp) => {
          const request = store.put({ ...emp, cached_at });
          request.onsuccess = () => {
            completed++;
            if (completed === employees.length) {
              console.log(`[OfflineCache] ${employees.length} collaborateurs sauvegardés`);
              resolve(true);
            }
          };
          request.onerror = () => resolve(false);
        });
      } catch (error) {
        console.error('[OfflineCache] Erreur sauvegarde collaborateurs:', error);
        resolve(false);
      }
    });
  }

  async getCompanyEmployees(): Promise<OfflineCompanyEmployee[]> {
    const store = await this.getStore('company_employees');
    if (!store) return [];

    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  }

  // ===== METADATA =====
  async saveMetadata(metadata: CacheMetadata): Promise<boolean> {
    const store = await this.getStore('metadata', 'readwrite');
    if (!store) return false;

    return new Promise((resolve) => {
      const request = store.put({ key: 'sync', ...metadata });
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  }

  async getMetadata(): Promise<CacheMetadata | null> {
    const store = await this.getStore('metadata');
    if (!store) return null;

    return new Promise((resolve) => {
      const request = store.get('sync');
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          const { key, ...metadata } = result;
          resolve(metadata as CacheMetadata);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  }

  // ===== UTILITAIRES =====
  async clearAll(): Promise<boolean> {
    if (!this.db) return false;

    const stores = ['clients', 'courses', 'driver_profile', 'fleet_drivers', 'my_drivers', 'company_employees', 'metadata'];
    
    for (const storeName of stores) {
      const store = await this.getStore(storeName, 'readwrite');
      if (store) {
        await new Promise<void>((resolve) => {
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => resolve();
        });
      }
    }

    console.log('[OfflineCache] Cache vidé');
    return true;
  }

  async getStats(): Promise<{ clients: number; courses: number; drivers: number; lastSync: string | null }> {
    const clients = await this.getClients();
    const courses = await this.getCourses();
    const myDrivers = await this.getMyDrivers();
    const fleetDrivers = await this.getFleetDrivers();
    const metadata = await this.getMetadata();

    return {
      clients: clients.length,
      courses: courses.length,
      drivers: myDrivers.length + fleetDrivers.length,
      lastSync: metadata?.lastSync || null,
    };
  }
}

export const offlineCache = new OfflineCacheService();
export type { OfflineClient, OfflineCourse, OfflineDriver, OfflineFleetDriver, OfflineCompanyEmployee, CacheMetadata };
