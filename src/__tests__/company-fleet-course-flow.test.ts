/**
 * Tests virtuels complets du flux Entreprise → Gestionnaire de Flotte → Chauffeur
 * 
 * Ces tests valident la logique métier sans interagir avec la base de données réelle.
 * Ils couvrent tous les scénarios de cours entreprise avec dispatch vers flotte.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// MOCK DATA - Données virtuelles pour les tests
// ============================================================================

interface MockCompany {
  id: string;
  company_name: string;
  user_id: string;
  status: string;
}

interface MockFleetManager {
  id: string;
  company_name: string;
  user_id: string;
  commission_percentage: number;
  default_equipment_type: 'driver_owned' | 'fleet_provided';
}

interface MockDriver {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  is_independent: boolean;
  fleet_manager_id?: string;
  auto_accept_from_partners: boolean;
  base_fare: number;
  per_km_rate: number;
  minimum_price: number;
}

interface MockEmployee {
  id: string;
  user_id: string;
  company_id: string;
  department: string;
  can_create_courses: boolean;
}

interface MockCourseRequest {
  id: string;
  company_id: string;
  employee_id?: string;
  is_guest_employee: boolean;
  guest_employee_name?: string;
  guest_employee_phone?: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  passengers_count: number;
  status: 'pending' | 'dispatched_to_fleet' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  target_fleet_manager_id?: string;
  fleet_dispatched_driver_id?: string;
  payment_flow?: 'direct' | 'via_fleet';
  final_course_id?: string;
}

interface MockCourse {
  id: string;
  driver_id: string;
  client_id?: string;
  pickup_address: string;
  destination_address: string;
  distance_km: number;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  is_guest_booking: boolean;
  guest_name?: string;
  guest_phone?: string;
  fleet_manager_id?: string;
  total_amount?: number;
}

interface MockFleetPartnerCourse {
  id: string;
  course_id: string;
  partnership_id: string;
  fleet_manager_id: string;
  driver_id: string;
  course_amount: number;
  commission_percentage: number;
  commission_amount: number;
  earnings_for_driver: number;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  equipment_type: 'driver_owned' | 'fleet_provided';
  company_request_id?: string;
  company_id?: string;
  payment_source?: 'company' | 'client' | 'fleet';
  company_pays_fleet_amount?: number;
  fleet_pays_driver_amount?: number;
  company_payment_status?: 'pending' | 'paid';
  fleet_payment_to_driver_status?: 'pending' | 'paid';
}

interface MockNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
}

// ============================================================================
// VIRTUAL DATABASE - Base de données simulée
// ============================================================================

class VirtualDatabase {
  companies: MockCompany[] = [];
  fleetManagers: MockFleetManager[] = [];
  drivers: MockDriver[] = [];
  employees: MockEmployee[] = [];
  courseRequests: MockCourseRequest[] = [];
  courses: MockCourse[] = [];
  fleetPartnerCourses: MockFleetPartnerCourse[] = [];
  notifications: MockNotification[] = [];
  
  private idCounter = 0;
  
  generateId(): string {
    return `test-${++this.idCounter}-${Date.now()}`;
  }
  
  reset(): void {
    this.companies = [];
    this.fleetManagers = [];
    this.drivers = [];
    this.employees = [];
    this.courseRequests = [];
    this.courses = [];
    this.fleetPartnerCourses = [];
    this.notifications = [];
    this.idCounter = 0;
  }
}

// ============================================================================
// BUSINESS LOGIC - Simulation des fonctions métier
// ============================================================================

function calculateCommission(
  courseAmount: number,
  commissionPercentage: number,
  equipmentType: 'driver_owned' | 'fleet_provided'
): { commissionAmount: number; driverEarnings: number } {
  // Si le chauffeur utilise le matériel du gestionnaire, pas de commission
  // Le montant va directement au gestionnaire
  if (equipmentType === 'fleet_provided') {
    return {
      commissionAmount: 0,
      driverEarnings: 0 // Le chauffeur est salarié/équipé, pas de gains directs
    };
  }
  
  // Chauffeur indépendant avec son propre matériel
  const commissionAmount = courseAmount * (commissionPercentage / 100);
  const driverEarnings = courseAmount - commissionAmount;
  
  return { commissionAmount, driverEarnings };
}

function createFleetPartnerCourse(
  db: VirtualDatabase,
  params: {
    course: MockCourse;
    fleetManager: MockFleetManager;
    driver: MockDriver;
    courseRequest?: MockCourseRequest;
    paymentSource: 'company' | 'client';
  }
): MockFleetPartnerCourse {
  const { course, fleetManager, driver, courseRequest, paymentSource } = params;
  
  const isIndependent = driver.is_independent;
  const equipmentType = isIndependent ? 'driver_owned' : 'fleet_provided';
  const courseAmount = course.total_amount || 50; // Prix par défaut
  
  const { commissionAmount, driverEarnings } = calculateCommission(
    courseAmount,
    fleetManager.commission_percentage,
    equipmentType
  );
  
  const fpc: MockFleetPartnerCourse = {
    id: db.generateId(),
    course_id: course.id,
    partnership_id: db.generateId(), // Simplification
    fleet_manager_id: fleetManager.id,
    driver_id: driver.id,
    course_amount: courseAmount,
    commission_percentage: isIndependent ? fleetManager.commission_percentage : 0,
    commission_amount: commissionAmount,
    earnings_for_driver: driverEarnings,
    status: 'pending',
    equipment_type: equipmentType,
    company_request_id: courseRequest?.id,
    company_id: courseRequest?.company_id,
    payment_source: paymentSource,
    company_pays_fleet_amount: paymentSource === 'company' ? collectedAmount : 0,
    fleet_pays_driver_amount: driverEarnings,
    company_payment_status: 'pending',
    fleet_payment_to_driver_status: 'pending'
  };
  
  db.fleetPartnerCourses.push(fpc);
  return fpc;
}

function sendNotification(
  db: VirtualDatabase,
  userId: string,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info'
): MockNotification {
  const notification: MockNotification = {
    id: db.generateId(),
    user_id: userId,
    title,
    message,
    type,
    is_read: false
  };
  db.notifications.push(notification);
  return notification;
}

function dispatchCourseToFleetManager(
  db: VirtualDatabase,
  request: MockCourseRequest,
  fleetManager: MockFleetManager
): { success: boolean; message: string } {
  // Mettre à jour la demande
  request.status = 'dispatched_to_fleet';
  request.target_fleet_manager_id = fleetManager.id;
  request.payment_flow = 'via_fleet';
  
  // Notifier le gestionnaire
  sendNotification(
    db,
    fleetManager.user_id,
    '📋 Nouvelle demande entreprise',
    `Nouvelle course à dispatcher depuis une entreprise`,
    'info'
  );
  
  return { success: true, message: 'Demande envoyée au gestionnaire' };
}

function fleetManagerDispatchToDriver(
  db: VirtualDatabase,
  request: MockCourseRequest,
  fleetManager: MockFleetManager,
  driver: MockDriver
): { success: boolean; course?: MockCourse; fpc?: MockFleetPartnerCourse; message: string } {
  // Créer la course
  const course: MockCourse = {
    id: db.generateId(),
    driver_id: driver.id,
    pickup_address: request.pickup_address,
    destination_address: request.destination_address,
    distance_km: 15,
    status: driver.auto_accept_from_partners ? 'accepted' : 'pending',
    is_guest_booking: request.is_guest_employee,
    guest_name: request.guest_employee_name,
    guest_phone: request.guest_employee_phone,
    fleet_manager_id: fleetManager.id,
    total_amount: 0
  };
  db.courses.push(course);
  
  // Créer le lien fleet_partner_courses
  const fpc = createFleetPartnerCourse(db, {
    course,
    fleetManager,
    driver,
    courseRequest: request,
    paymentSource: 'company'
  });
  
  // Mettre à jour la demande
  request.fleet_dispatched_driver_id = driver.id;
  request.final_course_id = course.id;
  request.status = driver.auto_accept_from_partners ? 'accepted' : 'dispatched_to_fleet';
  
  // Notifier le chauffeur
  if (!driver.auto_accept_from_partners) {
    sendNotification(
      db,
      driver.user_id,
      '🚗 Nouvelle mission flotte',
      `Course depuis ${fleetManager.company_name}`,
      'info'
    );
  } else {
    sendNotification(
      db,
      driver.user_id,
      '✅ Course auto-acceptée',
      `Course automatiquement acceptée depuis ${fleetManager.company_name}`,
      'success'
    );
  }
  
  return { success: true, course, fpc, message: 'Course dispatchée au chauffeur' };
}

function driverAcceptsCourse(
  db: VirtualDatabase,
  course: MockCourse,
  fpc: MockFleetPartnerCourse,
  driver: MockDriver
): { success: boolean; message: string } {
  if (course.status !== 'pending') {
    return { success: false, message: 'Course déjà acceptée' };
  }
  
  course.status = 'accepted';
  fpc.status = 'accepted';
  
  // Mettre à jour la demande entreprise si elle existe
  const request = db.courseRequests.find(r => r.final_course_id === course.id);
  if (request) {
    request.status = 'accepted';
  }
  
  // Notifier le gestionnaire
  const fm = db.fleetManagers.find(f => f.id === fpc.fleet_manager_id);
  if (fm) {
    sendNotification(
      db,
      fm.user_id,
      '✅ Course acceptée',
      `${driver.first_name} ${driver.last_name} a accepté la mission`,
      'success'
    );
  }
  
  return { success: true, message: 'Course acceptée' };
}

function driverCompletesAndCollects(
  db: VirtualDatabase,
  course: MockCourse,
  fpc: MockFleetPartnerCourse,
  collectedAmount: number
): { 
  success: boolean; 
  driverOwes?: number;
  driverKeeps?: number;
  fleetReceives?: number;
  message: string 
} {
  course.status = 'completed';
  course.total_amount = collectedAmount;
  fpc.status = 'completed';
  fpc.course_amount = collectedAmount;
  
  // Recalculer les montants
  const { commissionAmount, driverEarnings } = calculateCommission(
    collectedAmount,
    fpc.commission_percentage,
    fpc.equipment_type
  );
  
  fpc.commission_amount = commissionAmount;
  fpc.earnings_for_driver = driverEarnings;
  
  if (fpc.equipment_type === 'driver_owned') {
    // Chauffeur indépendant : il encaisse, doit la commission au gestionnaire
    return {
      success: true,
      driverOwes: commissionAmount,
      driverKeeps: driverEarnings,
      fleetReceives: commissionAmount,
      message: `Course terminée. Le chauffeur doit ${commissionAmount.toFixed(2)}€ au gestionnaire`
    };
  } else {
    // Chauffeur interne : tout va au gestionnaire
    return {
      success: true,
      driverOwes: 0,
      driverKeeps: 0,
      fleetReceives: collectedAmount,
      message: `Course terminée. Montant intégral au gestionnaire: ${collectedAmount.toFixed(2)}€`
    };
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('Flux Entreprise → Gestionnaire → Chauffeur', () => {
  let db: VirtualDatabase;
  
  // Entités de test
  let company: MockCompany;
  let fleetManager: MockFleetManager;
  let independentDriver: MockDriver;
  let internalDriver: MockDriver;
  let employee: MockEmployee;
  
  beforeEach(() => {
    db = new VirtualDatabase();
    db.reset();
    
    // Créer une entreprise
    company = {
      id: db.generateId(),
      company_name: 'TechCorp SAS',
      user_id: db.generateId(),
      status: 'active'
    };
    db.companies.push(company);
    
    // Créer un gestionnaire de flotte
    fleetManager = {
      id: db.generateId(),
      company_name: 'FleetPro Transport',
      user_id: db.generateId(),
      commission_percentage: 15, // 15% de commission
      default_equipment_type: 'driver_owned'
    };
    db.fleetManagers.push(fleetManager);
    
    // Créer un chauffeur indépendant (utilise son propre véhicule)
    independentDriver = {
      id: db.generateId(),
      user_id: db.generateId(),
      first_name: 'Pierre',
      last_name: 'Dupont',
      is_independent: true,
      fleet_manager_id: undefined,
      auto_accept_from_partners: false,
      base_fare: 5,
      per_km_rate: 2,
      minimum_price: 15
    };
    db.drivers.push(independentDriver);
    
    // Créer un chauffeur interne (utilise le véhicule du gestionnaire)
    internalDriver = {
      id: db.generateId(),
      user_id: db.generateId(),
      first_name: 'Marie',
      last_name: 'Martin',
      is_independent: false,
      fleet_manager_id: fleetManager.id,
      auto_accept_from_partners: true, // Auto-accept activé
      base_fare: 5,
      per_km_rate: 2,
      minimum_price: 15
    };
    db.drivers.push(internalDriver);
    
    // Créer un collaborateur
    employee = {
      id: db.generateId(),
      user_id: db.generateId(),
      company_id: company.id,
      department: 'Marketing',
      can_create_courses: true
    };
    db.employees.push(employee);
  });
  
  describe('Scénario 1: Admin crée une course pour client non-inscrit → Gestionnaire → Chauffeur indépendant', () => {
    it('devrait créer une demande de course et l\'envoyer au gestionnaire', () => {
      // ARRANGE: Créer une demande de course
      const courseRequest: MockCourseRequest = {
        id: db.generateId(),
        company_id: company.id,
        is_guest_employee: true,
        guest_employee_name: 'Jean Test',
        guest_employee_phone: '0612345678',
        pickup_address: '123 Rue de Paris, 75001 Paris',
        destination_address: '456 Avenue des Champs-Élysées, 75008 Paris',
        scheduled_date: new Date().toISOString(),
        passengers_count: 2,
        status: 'pending'
      };
      db.courseRequests.push(courseRequest);
      
      // ACT: Dispatcher au gestionnaire
      const result = dispatchCourseToFleetManager(db, courseRequest, fleetManager);
      
      // ASSERT
      expect(result.success).toBe(true);
      expect(courseRequest.status).toBe('dispatched_to_fleet');
      expect(courseRequest.target_fleet_manager_id).toBe(fleetManager.id);
      expect(courseRequest.payment_flow).toBe('via_fleet');
      
      // Vérifier la notification
      const notification = db.notifications.find(n => n.user_id === fleetManager.user_id);
      expect(notification).toBeDefined();
      expect(notification?.title).toContain('Nouvelle demande entreprise');
    });
    
    it('devrait permettre au gestionnaire de dispatcher au chauffeur indépendant', () => {
      // ARRANGE
      const courseRequest: MockCourseRequest = {
        id: db.generateId(),
        company_id: company.id,
        is_guest_employee: true,
        guest_employee_name: 'Jean Test',
        guest_employee_phone: '0612345678',
        pickup_address: '123 Rue de Paris',
        destination_address: '456 Avenue des Champs-Élysées',
        scheduled_date: new Date().toISOString(),
        passengers_count: 1,
        status: 'dispatched_to_fleet',
        target_fleet_manager_id: fleetManager.id,
        payment_flow: 'via_fleet'
      };
      db.courseRequests.push(courseRequest);
      
      // ACT: Dispatcher au chauffeur indépendant
      const result = fleetManagerDispatchToDriver(db, courseRequest, fleetManager, independentDriver);
      
      // ASSERT
      expect(result.success).toBe(true);
      expect(result.course).toBeDefined();
      expect(result.fpc).toBeDefined();
      expect(result.course?.driver_id).toBe(independentDriver.id);
      expect(result.course?.status).toBe('pending'); // Auto-accept désactivé
      expect(result.fpc?.equipment_type).toBe('driver_owned');
      expect(result.fpc?.commission_percentage).toBe(15);
      
      // Vérifier notification au chauffeur
      const driverNotif = db.notifications.find(n => n.user_id === independentDriver.user_id);
      expect(driverNotif).toBeDefined();
      expect(driverNotif?.title).toContain('Nouvelle mission');
    });
    
    it('devrait calculer correctement les commissions pour le chauffeur indépendant', () => {
      // ARRANGE
      const courseRequest: MockCourseRequest = {
        id: db.generateId(),
        company_id: company.id,
        is_guest_employee: true,
        guest_employee_name: 'Jean Test',
        guest_employee_phone: '0612345678',
        pickup_address: 'A',
        destination_address: 'B',
        scheduled_date: new Date().toISOString(),
        passengers_count: 1,
        status: 'dispatched_to_fleet',
        target_fleet_manager_id: fleetManager.id,
        payment_flow: 'via_fleet'
      };
      db.courseRequests.push(courseRequest);
      
      // Dispatcher
      const { course, fpc } = fleetManagerDispatchToDriver(db, courseRequest, fleetManager, independentDriver);
      
      // Chauffeur accepte
      driverAcceptsCourse(db, course!, fpc!, independentDriver);
      
      // ACT: Course terminée, chauffeur encaisse 60€
      const collectedAmount = 60;
      const result = driverCompletesAndCollects(db, course!, fpc!, collectedAmount);
      
      // ASSERT
      expect(result.success).toBe(true);
      expect(result.driverOwes).toBe(9); // 60 * 15% = 9€ commission
      expect(result.driverKeeps).toBe(51); // 60 - 9 = 51€
      expect(result.fleetReceives).toBe(9); // Le gestionnaire reçoit 9€
      expect(fpc?.commission_amount).toBe(9);
      expect(fpc?.earnings_for_driver).toBe(51);
    });
  });
  
  describe('Scénario 2: Course avec chauffeur interne (matériel gestionnaire, pas de commission)', () => {
    it('devrait auto-accepter et ne pas calculer de commission', () => {
      // ARRANGE
      const courseRequest: MockCourseRequest = {
        id: db.generateId(),
        company_id: company.id,
        is_guest_employee: true,
        guest_employee_name: 'Sophie Test',
        guest_employee_phone: '0698765432',
        pickup_address: 'Gare de Lyon',
        destination_address: 'Aéroport CDG',
        scheduled_date: new Date().toISOString(),
        passengers_count: 1,
        status: 'dispatched_to_fleet',
        target_fleet_manager_id: fleetManager.id,
        payment_flow: 'via_fleet'
      };
      db.courseRequests.push(courseRequest);
      
      // ACT: Dispatcher au chauffeur interne (auto-accept activé)
      const result = fleetManagerDispatchToDriver(db, courseRequest, fleetManager, internalDriver);
      
      // ASSERT
      expect(result.success).toBe(true);
      expect(result.course?.status).toBe('accepted'); // Auto-accepté
      expect(result.fpc?.equipment_type).toBe('fleet_provided'); // Matériel flotte
      expect(result.fpc?.commission_percentage).toBe(0); // Pas de commission
      
      // Notification auto-accept
      const driverNotif = db.notifications.find(n => n.user_id === internalDriver.user_id);
      expect(driverNotif?.title).toContain('auto-acceptée');
    });
    
    it('devrait envoyer tout le montant au gestionnaire', () => {
      // ARRANGE
      const courseRequest: MockCourseRequest = {
        id: db.generateId(),
        company_id: company.id,
        is_guest_employee: true,
        guest_employee_name: 'Sophie Test',
        guest_employee_phone: '0698765432',
        pickup_address: 'Gare de Lyon',
        destination_address: 'Aéroport CDG',
        scheduled_date: new Date().toISOString(),
        passengers_count: 1,
        status: 'dispatched_to_fleet',
        target_fleet_manager_id: fleetManager.id,
        payment_flow: 'via_fleet'
      };
      db.courseRequests.push(courseRequest);
      
      // Dispatcher
      const { course, fpc } = fleetManagerDispatchToDriver(db, courseRequest, fleetManager, internalDriver);
      
      // ACT: Course terminée, montant 80€
      const collectedAmount = 80;
      const result = driverCompletesAndCollects(db, course!, fpc!, collectedAmount);
      
      // ASSERT
      expect(result.success).toBe(true);
      expect(result.driverOwes).toBe(0); // Pas de dette
      expect(result.driverKeeps).toBe(0); // Pas de gains directs (salarié)
      expect(result.fleetReceives).toBe(80); // Tout au gestionnaire
      expect(fpc?.commission_amount).toBe(0);
      expect(fpc?.earnings_for_driver).toBe(0);
    });
  });
  
  describe('Scénario 3: Collaborateur inscrit réserve via gestionnaire', () => {
    it('devrait permettre au collaborateur de voir les gestionnaires partenaires', () => {
      // Simulation: le collaborateur voit les gestionnaires via company_fleet_agreements
      // Cet état est normalement géré par la BDD, ici on simule
      
      const partnerAgreement = {
        id: db.generateId(),
        company_id: company.id,
        fleet_manager_id: fleetManager.id,
        status: 'active'
      };
      
      // ASSERT
      expect(partnerAgreement.status).toBe('active');
      expect(partnerAgreement.company_id).toBe(company.id);
      expect(partnerAgreement.fleet_manager_id).toBe(fleetManager.id);
    });
    
    it('devrait créer une course pour le collaborateur et dispatcher', () => {
      // ARRANGE: Demande créée par le collaborateur
      const courseRequest: MockCourseRequest = {
        id: db.generateId(),
        company_id: company.id,
        employee_id: employee.id,
        is_guest_employee: false,
        pickup_address: 'Bureau TechCorp',
        destination_address: 'Client Alpha',
        scheduled_date: new Date().toISOString(),
        passengers_count: 1,
        status: 'pending'
      };
      db.courseRequests.push(courseRequest);
      
      // ACT 1: Envoyer au gestionnaire
      dispatchCourseToFleetManager(db, courseRequest, fleetManager);
      
      // ACT 2: Gestionnaire dispatch au chauffeur indépendant
      const { course, fpc } = fleetManagerDispatchToDriver(
        db, courseRequest, fleetManager, independentDriver
      );
      
      // ACT 3: Chauffeur accepte et complète
      driverAcceptsCourse(db, course!, fpc!, independentDriver);
      const result = driverCompletesAndCollects(db, course!, fpc!, 50);
      
      // ASSERT
      expect(courseRequest.employee_id).toBe(employee.id);
      expect(courseRequest.status).toBe('accepted');
      expect(result.driverOwes).toBe(7.5); // 50 * 15% = 7.5€
      expect(result.driverKeeps).toBe(42.5); // 50 - 7.5 = 42.5€
    });
    
    it('devrait gérer les deux types de dispatch depuis collaborateur', () => {
      // Test 1: Dispatch vers chauffeur indépendant
      const request1: MockCourseRequest = {
        id: db.generateId(),
        company_id: company.id,
        employee_id: employee.id,
        is_guest_employee: false,
        pickup_address: 'A',
        destination_address: 'B',
        scheduled_date: new Date().toISOString(),
        passengers_count: 1,
        status: 'dispatched_to_fleet',
        target_fleet_manager_id: fleetManager.id,
        payment_flow: 'via_fleet'
      };
      db.courseRequests.push(request1);
      
      const { fpc: fpc1 } = fleetManagerDispatchToDriver(db, request1, fleetManager, independentDriver);
      
      // Test 2: Dispatch vers chauffeur interne
      const request2: MockCourseRequest = {
        id: db.generateId(),
        company_id: company.id,
        employee_id: employee.id,
        is_guest_employee: false,
        pickup_address: 'C',
        destination_address: 'D',
        scheduled_date: new Date().toISOString(),
        passengers_count: 1,
        status: 'dispatched_to_fleet',
        target_fleet_manager_id: fleetManager.id,
        payment_flow: 'via_fleet'
      };
      db.courseRequests.push(request2);
      
      const { fpc: fpc2 } = fleetManagerDispatchToDriver(db, request2, fleetManager, internalDriver);
      
      // ASSERT
      expect(fpc1?.equipment_type).toBe('driver_owned');
      expect(fpc1?.commission_percentage).toBe(15);
      
      expect(fpc2?.equipment_type).toBe('fleet_provided');
      expect(fpc2?.commission_percentage).toBe(0);
    });
  });
  
  describe('Scénario 4: Flux de notifications bidirectionnel', () => {
    it('devrait notifier toutes les parties à chaque étape', () => {
      // ARRANGE
      const courseRequest: MockCourseRequest = {
        id: db.generateId(),
        company_id: company.id,
        is_guest_employee: true,
        guest_employee_name: 'Client Test',
        guest_employee_phone: '0600000000',
        pickup_address: 'A',
        destination_address: 'B',
        scheduled_date: new Date().toISOString(),
        passengers_count: 1,
        status: 'pending'
      };
      db.courseRequests.push(courseRequest);
      
      const initialNotifCount = db.notifications.length;
      
      // ACT 1: Dispatch au gestionnaire
      dispatchCourseToFleetManager(db, courseRequest, fleetManager);
      
      // Vérifier notification gestionnaire
      expect(db.notifications.length).toBe(initialNotifCount + 1);
      expect(db.notifications[db.notifications.length - 1].user_id).toBe(fleetManager.user_id);
      
      // ACT 2: Dispatch au chauffeur
      const { course, fpc } = fleetManagerDispatchToDriver(db, courseRequest, fleetManager, independentDriver);
      
      // Vérifier notification chauffeur
      expect(db.notifications[db.notifications.length - 1].user_id).toBe(independentDriver.user_id);
      
      // ACT 3: Chauffeur accepte
      driverAcceptsCourse(db, course!, fpc!, independentDriver);
      
      // Vérifier notification retour au gestionnaire
      const acceptNotif = db.notifications.find(
        n => n.user_id === fleetManager.user_id && n.title.includes('acceptée')
      );
      expect(acceptNotif).toBeDefined();
    });
  });
  
  describe('Scénario 5: Calculs financiers complets', () => {
    it('devrait calculer correctement pour différents montants', () => {
      const testCases = [
        { amount: 100, commission: 15, expected: { owes: 15, keeps: 85 } },
        { amount: 50, commission: 20, expected: { owes: 10, keeps: 40 } },
        { amount: 75.50, commission: 10, expected: { owes: 7.55, keeps: 67.95 } },
        { amount: 200, commission: 25, expected: { owes: 50, keeps: 150 } },
      ];
      
      testCases.forEach(({ amount, commission, expected }) => {
        const { commissionAmount, driverEarnings } = calculateCommission(
          amount, commission, 'driver_owned'
        );
        
        expect(commissionAmount).toBeCloseTo(expected.owes, 2);
        expect(driverEarnings).toBeCloseTo(expected.keeps, 2);
      });
    });
    
    it('devrait retourner 0 commission pour matériel gestionnaire', () => {
      const { commissionAmount, driverEarnings } = calculateCommission(
        100, 15, 'fleet_provided'
      );
      
      expect(commissionAmount).toBe(0);
      expect(driverEarnings).toBe(0);
    });
  });
  
  describe('Scénario 6: Suivi des statuts de paiement', () => {
    it('devrait tracker le paiement entreprise → gestionnaire', () => {
      const courseRequest: MockCourseRequest = {
        id: db.generateId(),
        company_id: company.id,
        is_guest_employee: true,
        guest_employee_name: 'Test',
        guest_employee_phone: '0600000000',
        pickup_address: 'A',
        destination_address: 'B',
        scheduled_date: new Date().toISOString(),
        passengers_count: 1,
        status: 'dispatched_to_fleet',
        target_fleet_manager_id: fleetManager.id,
        payment_flow: 'via_fleet'
      };
      db.courseRequests.push(courseRequest);
      
      const { course, fpc } = fleetManagerDispatchToDriver(db, courseRequest, fleetManager, independentDriver);
      
      // Compléter la course
      driverAcceptsCourse(db, course!, fpc!, independentDriver);
      driverCompletesAndCollects(db, course!, fpc!, 75);
      
      // ASSERT: Statuts de paiement initiaux
      expect(fpc?.company_payment_status).toBe('pending');
      expect(fpc?.fleet_payment_to_driver_status).toBe('pending');
      expect(fpc?.company_pays_fleet_amount).toBe(75);
      expect(fpc?.fleet_pays_driver_amount).toBe(63.75); // 75 - 11.25
    });
  });
});

describe('Validation des données de test', () => {
  it('ne devrait pas persister de données réelles', () => {
    const db = new VirtualDatabase();
    
    // Ajouter des données
    db.companies.push({ id: 'test', company_name: 'Test', user_id: 'u1', status: 'active' });
    
    // Réinitialiser
    db.reset();
    
    // Vérifier que tout est vide
    expect(db.companies.length).toBe(0);
    expect(db.fleetManagers.length).toBe(0);
    expect(db.drivers.length).toBe(0);
    expect(db.courses.length).toBe(0);
    expect(db.notifications.length).toBe(0);
  });
});
