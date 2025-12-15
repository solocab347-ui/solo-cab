/**
 * FEATURE REGISTRY
 * Registre centralisé des fonctionnalités avec dépendances
 * Permet de tracer l'impact des modifications
 */

import { logger } from './productionLogger';

export interface Feature {
  id: string;
  name: string;
  description: string;
  dependencies: string[]; // IDs des features dont celle-ci dépend
  tables: string[]; // Tables Supabase utilisées
  edgeFunctions: string[]; // Edge functions utilisées
  components: string[]; // Composants React principaux
  status: 'stable' | 'experimental' | 'deprecated';
  addedAt: string; // Date d'ajout
  lastModified: string;
}

export interface DependencyGraph {
  feature: string;
  directDependencies: string[];
  transitiveDependencies: string[];
  dependents: string[]; // Features qui dépendent de celle-ci
}

class FeatureRegistry {
  private features: Map<string, Feature> = new Map();

  constructor() {
    this.registerCoreFeatures();
  }

  /**
   * Enregistrer les fonctionnalités de base de SoloCab
   */
  private registerCoreFeatures() {
    // Authentification
    this.register({
      id: 'auth',
      name: 'Authentification',
      description: 'Système de connexion/inscription',
      dependencies: [],
      tables: ['profiles', 'user_roles'],
      edgeFunctions: ['auth-login'],
      components: ['Login', 'ProtectedRoute'],
      status: 'stable',
      addedAt: '2024-01-01',
      lastModified: '2024-12-15'
    });

    // Gestion des chauffeurs
    this.register({
      id: 'driver_management',
      name: 'Gestion Chauffeurs',
      description: 'CRUD chauffeurs et profils',
      dependencies: ['auth'],
      tables: ['drivers', 'profiles'],
      edgeFunctions: ['repair-driver-profiles'],
      components: ['DriverDashboard', 'DriverHome'],
      status: 'stable',
      addedAt: '2024-01-01',
      lastModified: '2024-12-15'
    });

    // Gestion des clients
    this.register({
      id: 'client_management',
      name: 'Gestion Clients',
      description: 'CRUD clients et associations',
      dependencies: ['auth', 'driver_management'],
      tables: ['clients', 'profiles'],
      edgeFunctions: ['register-client-qr', 'register-client-driver'],
      components: ['ClientDashboard', 'DriverClientsList'],
      status: 'stable',
      addedAt: '2024-01-01',
      lastModified: '2024-12-15'
    });

    // Création de courses
    this.register({
      id: 'course_creation',
      name: 'Création de Courses',
      description: 'Système de création de courses par chauffeurs/clients',
      dependencies: ['auth', 'driver_management', 'client_management'],
      tables: ['courses', 'clients', 'drivers'],
      edgeFunctions: ['calculate-mapbox-route'],
      components: ['CreateCourse', 'DriverCreateCourse', 'useCourseCreation'],
      status: 'stable',
      addedAt: '2024-01-01',
      lastModified: '2024-12-15'
    });

    // Génération de devis
    this.register({
      id: 'devis_generation',
      name: 'Génération de Devis',
      description: 'Création automatique de devis après création de course',
      dependencies: ['course_creation', 'driver_management'],
      tables: ['devis', 'courses', 'drivers', 'clients'],
      edgeFunctions: ['create-devis-auto'],
      components: ['DevisList', 'DriverDevisList'],
      status: 'stable',
      addedAt: '2024-01-01',
      lastModified: '2024-12-15'
    });

    // Facturation
    this.register({
      id: 'invoicing',
      name: 'Facturation',
      description: 'Génération de factures',
      dependencies: ['devis_generation'],
      tables: ['factures', 'devis', 'courses'],
      edgeFunctions: ['create-facture-auto'],
      components: ['DriverFacturesList', 'ClientFacturesList'],
      status: 'stable',
      addedAt: '2024-01-01',
      lastModified: '2024-12-15'
    });

    // Guest Booking (nouveau)
    this.register({
      id: 'guest_booking',
      name: 'Réservation Invités',
      description: 'Permet aux clients non-inscrits de réserver',
      dependencies: ['course_creation'],
      tables: ['courses'],
      edgeFunctions: [],
      components: ['GuestBooking', 'GuestBookingTracking'],
      status: 'experimental',
      addedAt: '2024-12-14',
      lastModified: '2024-12-15'
    });

    // Partenariats chauffeurs
    this.register({
      id: 'driver_partnerships',
      name: 'Partenariats Chauffeurs',
      description: 'Système de partage de courses entre chauffeurs',
      dependencies: ['driver_management', 'course_creation'],
      tables: ['driver_partnerships', 'partnership_disputes'],
      edgeFunctions: [],
      components: ['DriverCourseSharing'],
      status: 'stable',
      addedAt: '2024-11-01',
      lastModified: '2024-12-15'
    });

    // Abonnements Stripe
    this.register({
      id: 'subscriptions',
      name: 'Abonnements',
      description: 'Gestion des abonnements Stripe',
      dependencies: ['driver_management'],
      tables: ['drivers'],
      edgeFunctions: ['create-stripe-checkout', 'stripe-webhook', 'create-driver-subscription'],
      components: ['SubscriptionManager'],
      status: 'stable',
      addedAt: '2024-01-01',
      lastModified: '2024-12-15'
    });
  }

  /**
   * Enregistrer une fonctionnalité
   */
  register(feature: Feature) {
    this.features.set(feature.id, feature);
    logger.debug(`Feature registered: ${feature.id}`);
  }

  /**
   * Obtenir une fonctionnalité
   */
  get(id: string): Feature | undefined {
    return this.features.get(id);
  }

  /**
   * Obtenir toutes les fonctionnalités
   */
  getAll(): Feature[] {
    return Array.from(this.features.values());
  }

  /**
   * Analyser l'impact d'une modification sur une table
   */
  getImpactedFeaturesByTable(tableName: string): Feature[] {
    return this.getAll().filter(f => f.tables.includes(tableName));
  }

  /**
   * Analyser l'impact d'une modification sur une edge function
   */
  getImpactedFeaturesByEdgeFunction(functionName: string): Feature[] {
    return this.getAll().filter(f => f.edgeFunctions.includes(functionName));
  }

  /**
   * Obtenir le graphe de dépendances d'une feature
   */
  getDependencyGraph(featureId: string): DependencyGraph | null {
    const feature = this.features.get(featureId);
    if (!feature) return null;

    const transitive = new Set<string>();
    const visited = new Set<string>();

    const collectTransitive = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      const f = this.features.get(id);
      if (f) {
        f.dependencies.forEach(dep => {
          transitive.add(dep);
          collectTransitive(dep);
        });
      }
    };

    feature.dependencies.forEach(dep => collectTransitive(dep));

    // Trouver les dependents (features qui dépendent de celle-ci)
    const dependents = this.getAll()
      .filter(f => f.dependencies.includes(featureId))
      .map(f => f.id);

    return {
      feature: featureId,
      directDependencies: feature.dependencies,
      transitiveDependencies: Array.from(transitive),
      dependents
    };
  }

  /**
   * Vérifier si une modification est risquée
   */
  assessModificationRisk(affectedTables: string[], affectedFunctions: string[]): {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    impactedFeatures: string[];
    recommendations: string[];
  } {
    const impactedFeatures = new Set<string>();
    
    affectedTables.forEach(table => {
      this.getImpactedFeaturesByTable(table).forEach(f => impactedFeatures.add(f.id));
    });

    affectedFunctions.forEach(fn => {
      this.getImpactedFeaturesByEdgeFunction(fn).forEach(f => impactedFeatures.add(f.id));
    });

    const features = Array.from(impactedFeatures);
    const criticalFeatures = features.filter(id => {
      const f = this.features.get(id);
      return f && ['course_creation', 'devis_generation', 'auth', 'client_management'].includes(id);
    });

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const recommendations: string[] = [];

    if (criticalFeatures.length > 0) {
      riskLevel = 'critical';
      recommendations.push('⚠️ Fonctionnalités critiques impactées - tester exhaustivement');
      recommendations.push('Exécuter criticalPathValidator.validateAll() après modification');
    } else if (features.length > 3) {
      riskLevel = 'high';
      recommendations.push('Plusieurs fonctionnalités impactées - prévoir tests de régression');
    } else if (features.length > 1) {
      riskLevel = 'medium';
      recommendations.push('Tester les fonctionnalités impactées');
    }

    return {
      riskLevel,
      impactedFeatures: features,
      recommendations
    };
  }
}

// Singleton
export const featureRegistry = new FeatureRegistry();
