/**
 * CRITICAL PATH VALIDATOR
 * Système de validation des fonctionnalités critiques
 * Empêche les modifications de casser les features existantes
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from './productionLogger';

export interface CriticalPathTest {
  name: string;
  description: string;
  category: 'auth' | 'course' | 'devis' | 'client' | 'driver' | 'payment';
  test: () => Promise<boolean>;
  priority: 'critical' | 'high' | 'medium';
}

export interface ValidationResult {
  passed: boolean;
  failedTests: string[];
  passedTests: string[];
  timestamp: Date;
  duration: number;
}

class CriticalPathValidator {
  private tests: CriticalPathTest[] = [];
  private lastValidation: ValidationResult | null = null;

  constructor() {
    this.registerCoreTests();
  }

  /**
   * Enregistrer les tests critiques de base
   */
  private registerCoreTests() {
    // Test 1: Connexion Supabase
    this.register({
      name: 'supabase_connection',
      description: 'Vérifier la connexion à Supabase',
      category: 'auth',
      priority: 'critical',
      test: async () => {
        try {
          const { error } = await supabase.from('profiles').select('count').limit(1);
          return !error;
        } catch {
          return false;
        }
      }
    });

    // Test 2: Table courses accessible
    this.register({
      name: 'courses_table_accessible',
      description: 'Vérifier l\'accès à la table courses',
      category: 'course',
      priority: 'critical',
      test: async () => {
        try {
          const { error } = await supabase.from('courses').select('id').limit(1);
          return !error;
        } catch {
          return false;
        }
      }
    });

    // Test 3: Table devis accessible
    this.register({
      name: 'devis_table_accessible',
      description: 'Vérifier l\'accès à la table devis',
      category: 'devis',
      priority: 'critical',
      test: async () => {
        try {
          const { error } = await supabase.from('devis').select('id').limit(1);
          return !error;
        } catch {
          return false;
        }
      }
    });

    // Test 4: Table clients accessible
    this.register({
      name: 'clients_table_accessible',
      description: 'Vérifier l\'accès à la table clients',
      category: 'client',
      priority: 'critical',
      test: async () => {
        try {
          const { error } = await supabase.from('clients').select('id').limit(1);
          return !error;
        } catch {
          return false;
        }
      }
    });

    // Test 5: Table drivers accessible
    this.register({
      name: 'drivers_table_accessible',
      description: 'Vérifier l\'accès à la table drivers',
      category: 'driver',
      priority: 'critical',
      test: async () => {
        try {
          const { error } = await supabase.from('drivers').select('id').limit(1);
          return !error;
        } catch {
          return false;
        }
      }
    });

    // Test 6: Edge function create-devis-auto disponible
    this.register({
      name: 'edge_function_devis_available',
      description: 'Vérifier que la fonction create-devis-auto est accessible',
      category: 'devis',
      priority: 'high',
      test: async () => {
        try {
          // On teste juste que la fonction existe (sans paramètres valides)
          const { error } = await supabase.functions.invoke('create-devis-auto', {
            body: { test: true }
          });
          // Une erreur de validation est OK, ça prouve que la fonction existe
          return error?.message?.includes('Missing') || error?.message?.includes('required') || !error;
        } catch {
          return false;
        }
      }
    });

    // Test 7: Auth session check
    this.register({
      name: 'auth_session_check',
      description: 'Vérifier le système d\'authentification',
      category: 'auth',
      priority: 'critical',
      test: async () => {
        try {
          const { error } = await supabase.auth.getSession();
          return !error;
        } catch {
          return false;
        }
      }
    });
  }

  /**
   * Enregistrer un nouveau test
   */
  register(test: CriticalPathTest) {
    // Éviter les doublons
    const existing = this.tests.findIndex(t => t.name === test.name);
    if (existing >= 0) {
      this.tests[existing] = test;
    } else {
      this.tests.push(test);
    }
  }

  /**
   * Exécuter tous les tests critiques
   */
  async validateAll(): Promise<ValidationResult> {
    const startTime = Date.now();
    const failedTests: string[] = [];
    const passedTests: string[] = [];

    logger.info('🔍 Démarrage validation chemins critiques', { 
      testCount: this.tests.length 
    });

    // Exécuter les tests par priorité
    const sortedTests = [...this.tests].sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    for (const test of sortedTests) {
      try {
        const result = await Promise.race([
          test.test(),
          new Promise<boolean>(resolve => setTimeout(() => resolve(false), 5000)) // Timeout 5s
        ]);

        if (result) {
          passedTests.push(test.name);
          logger.debug(`✅ Test passé: ${test.name}`);
        } else {
          failedTests.push(test.name);
          logger.error(`❌ Test échoué: ${test.name}`, { description: test.description });
        }
      } catch (error) {
        failedTests.push(test.name);
        logger.error(`❌ Test en erreur: ${test.name}`, { error });
      }
    }

    const result: ValidationResult = {
      passed: failedTests.length === 0,
      failedTests,
      passedTests,
      timestamp: new Date(),
      duration: Date.now() - startTime
    };

    this.lastValidation = result;

    if (!result.passed) {
      logger.critical('🚨 VALIDATION ÉCHOUÉE - Fonctionnalités critiques affectées', {
        failedTests,
        duration: result.duration
      });
    } else {
      logger.info('✅ Validation réussie - Tous les chemins critiques OK', {
        testCount: passedTests.length,
        duration: result.duration
      });
    }

    return result;
  }

  /**
   * Valider une catégorie spécifique
   */
  async validateCategory(category: CriticalPathTest['category']): Promise<ValidationResult> {
    const categoryTests = this.tests.filter(t => t.category === category);
    const startTime = Date.now();
    const failedTests: string[] = [];
    const passedTests: string[] = [];

    for (const test of categoryTests) {
      try {
        const result = await test.test();
        if (result) {
          passedTests.push(test.name);
        } else {
          failedTests.push(test.name);
        }
      } catch {
        failedTests.push(test.name);
      }
    }

    return {
      passed: failedTests.length === 0,
      failedTests,
      passedTests,
      timestamp: new Date(),
      duration: Date.now() - startTime
    };
  }

  /**
   * Obtenir le dernier résultat de validation
   */
  getLastValidation(): ValidationResult | null {
    return this.lastValidation;
  }

  /**
   * Obtenir la liste des tests enregistrés
   */
  getRegisteredTests(): CriticalPathTest[] {
    return [...this.tests];
  }
}

// Singleton
export const criticalPathValidator = new CriticalPathValidator();

// Validation au démarrage de l'application (après un délai)
if (typeof window !== 'undefined') {
  setTimeout(() => {
    criticalPathValidator.validateAll().then(result => {
      if (!result.passed) {
        console.warn('⚠️ Certaines fonctionnalités critiques ont échoué:', result.failedTests);
      }
    });
  }, 3000); // Attendre 3s après le chargement
}
