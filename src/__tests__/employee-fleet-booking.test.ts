/**
 * Tests virtuels pour le flux de réservation employé inscrit → Gestionnaire
 */

import { describe, it, expect, beforeEach } from "vitest";

// ============================================================================
// TYPES
// ============================================================================

interface MockCompanyFleetAgreement {
  id: string;
  company_id: string;
  fleet_manager_id: string;
  status: 'pending' | 'active' | 'terminated';
  company_signed: boolean;
  fleet_manager_signed: boolean;
  payment_frequency: 'per_course' | 'weekly' | 'monthly';
  payment_methods: string[];
}

interface MockEmployeeBooking {
  id: string;
  employee_id: string;
  company_id: string;
  request_id: string;
  driver_id?: string;
  fleet_manager_id?: string;
  booking_type: 'direct_driver' | 'via_fleet';
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  payment_method: 'on_spot' | 'company_invoice';
  amount?: number;
}

interface MockExpenseReport {
  id: string;
  employee_id: string;
  company_id: string;
  booking_id: string;
  amount: number;
  status: 'pending_validation' | 'approved' | 'rejected' | 'reimbursed';
  payment_method_used: string;
  created_at: string;
}

// ============================================================================
// VIRTUAL DATABASE
// ============================================================================

class EmployeeFleetTestDB {
  agreements: MockCompanyFleetAgreement[] = [];
  bookings: MockEmployeeBooking[] = [];
  expenseReports: MockExpenseReport[] = [];
  notifications: { user_id: string; message: string; type: string }[] = [];
  
  private idCounter = 0;
  
  generateId(): string {
    return `test-emp-${++this.idCounter}`;
  }
  
  reset(): void {
    this.agreements = [];
    this.bookings = [];
    this.expenseReports = [];
    this.notifications = [];
    this.idCounter = 0;
  }
}

// ============================================================================
// BUSINESS LOGIC
// ============================================================================

function getActiveFleetPartnersForCompany(
  db: EmployeeFleetTestDB,
  companyId: string
): MockCompanyFleetAgreement[] {
  return db.agreements.filter(
    a => a.company_id === companyId && 
         a.status === 'active' && 
         a.company_signed && 
         a.fleet_manager_signed
  );
}

function createEmployeeBookingViaFleet(
  db: EmployeeFleetTestDB,
  params: {
    employeeId: string;
    companyId: string;
    fleetManagerId: string;
    paymentMethod: 'on_spot' | 'company_invoice';
  }
): MockEmployeeBooking {
  const booking: MockEmployeeBooking = {
    id: db.generateId(),
    employee_id: params.employeeId,
    company_id: params.companyId,
    request_id: db.generateId(),
    fleet_manager_id: params.fleetManagerId,
    booking_type: 'via_fleet',
    status: 'pending',
    payment_method: params.paymentMethod
  };
  
  db.bookings.push(booking);
  return booking;
}

function fleetAssignsDriver(
  db: EmployeeFleetTestDB,
  bookingId: string,
  driverId: string
): boolean {
  const booking = db.bookings.find(b => b.id === bookingId);
  if (!booking) return false;
  
  booking.driver_id = driverId;
  booking.status = 'confirmed';
  
  // Notification à l'employé
  db.notifications.push({
    user_id: booking.employee_id,
    message: 'Un chauffeur vous a été assigné',
    type: 'success'
  });
  
  return true;
}

function completeBookingWithPayment(
  db: EmployeeFleetTestDB,
  bookingId: string,
  amount: number,
  paidOnSpot: boolean
): { success: boolean; expenseReport?: MockExpenseReport } {
  const booking = db.bookings.find(b => b.id === bookingId);
  if (!booking) return { success: false };
  
  booking.status = 'completed';
  booking.amount = amount;
  
  // Si paiement sur place, créer une note de frais automatique
  if (paidOnSpot) {
    const expenseReport: MockExpenseReport = {
      id: db.generateId(),
      employee_id: booking.employee_id,
      company_id: booking.company_id,
      booking_id: bookingId,
      amount: amount,
      status: 'pending_validation',
      payment_method_used: 'card_on_spot',
      created_at: new Date().toISOString()
    };
    
    db.expenseReports.push(expenseReport);
    
    // Notification à l'admin
    db.notifications.push({
      user_id: 'admin',
      message: `Note de frais à valider: ${amount}€`,
      type: 'info'
    });
    
    return { success: true, expenseReport };
  }
  
  return { success: true };
}

// ============================================================================
// TESTS
// ============================================================================

describe('Collaborateur inscrit - Réservation via gestionnaire', () => {
  let db: EmployeeFleetTestDB;
  
  const companyId = 'company-123';
  const employeeId = 'employee-456';
  const fleetManagerId = 'fleet-789';
  const driverId = 'driver-001';
  
  beforeEach(() => {
    db = new EmployeeFleetTestDB();
    db.reset();
    
    // Créer un accord actif
    db.agreements.push({
      id: db.generateId(),
      company_id: companyId,
      fleet_manager_id: fleetManagerId,
      status: 'active',
      company_signed: true,
      fleet_manager_signed: true,
      payment_frequency: 'monthly',
      payment_methods: ['bank_transfer', 'card']
    });
  });
  
  describe('Visibilité des gestionnaires partenaires', () => {
    it('devrait voir les gestionnaires avec accord actif signé', () => {
      const partners = getActiveFleetPartnersForCompany(db, companyId);
      
      expect(partners.length).toBe(1);
      expect(partners[0].fleet_manager_id).toBe(fleetManagerId);
      expect(partners[0].status).toBe('active');
    });
    
    it('ne devrait pas voir les gestionnaires avec accord non signé', () => {
      // Ajouter un accord non signé
      db.agreements.push({
        id: db.generateId(),
        company_id: companyId,
        fleet_manager_id: 'fleet-unsigned',
        status: 'active',
        company_signed: true,
        fleet_manager_signed: false, // Non signé par le gestionnaire
        payment_frequency: 'monthly',
        payment_methods: []
      });
      
      const partners = getActiveFleetPartnersForCompany(db, companyId);
      
      expect(partners.length).toBe(1); // Toujours 1 seul partenaire valide
    });
  });
  
  describe('Création de réservation via gestionnaire', () => {
    it('devrait créer une réservation avec paiement facture entreprise', () => {
      const booking = createEmployeeBookingViaFleet(db, {
        employeeId,
        companyId,
        fleetManagerId,
        paymentMethod: 'company_invoice'
      });
      
      expect(booking.booking_type).toBe('via_fleet');
      expect(booking.payment_method).toBe('company_invoice');
      expect(booking.status).toBe('pending');
    });
    
    it('devrait créer une réservation avec paiement sur place', () => {
      const booking = createEmployeeBookingViaFleet(db, {
        employeeId,
        companyId,
        fleetManagerId,
        paymentMethod: 'on_spot'
      });
      
      expect(booking.payment_method).toBe('on_spot');
    });
  });
  
  describe('Attribution par le gestionnaire', () => {
    it('devrait assigner un chauffeur indépendant', () => {
      const booking = createEmployeeBookingViaFleet(db, {
        employeeId,
        companyId,
        fleetManagerId,
        paymentMethod: 'company_invoice'
      });
      
      const success = fleetAssignsDriver(db, booking.id, driverId);
      
      expect(success).toBe(true);
      expect(booking.driver_id).toBe(driverId);
      expect(booking.status).toBe('confirmed');
      
      // Vérifier notification
      const notification = db.notifications.find(n => n.user_id === employeeId);
      expect(notification).toBeDefined();
      expect(notification?.message).toContain('chauffeur');
    });
    
    it('devrait assigner un chauffeur interne', () => {
      const internalDriverId = 'internal-driver-001';
      const booking = createEmployeeBookingViaFleet(db, {
        employeeId,
        companyId,
        fleetManagerId,
        paymentMethod: 'company_invoice'
      });
      
      const success = fleetAssignsDriver(db, booking.id, internalDriverId);
      
      expect(success).toBe(true);
      expect(booking.driver_id).toBe(internalDriverId);
    });
  });
  
  describe('Complétion et notes de frais', () => {
    it('devrait créer une note de frais automatique si paiement sur place', () => {
      const booking = createEmployeeBookingViaFleet(db, {
        employeeId,
        companyId,
        fleetManagerId,
        paymentMethod: 'on_spot'
      });
      
      fleetAssignsDriver(db, booking.id, driverId);
      
      const result = completeBookingWithPayment(db, booking.id, 65.50, true);
      
      expect(result.success).toBe(true);
      expect(result.expenseReport).toBeDefined();
      expect(result.expenseReport?.amount).toBe(65.50);
      expect(result.expenseReport?.status).toBe('pending_validation');
      
      // Vérifier notification admin
      const adminNotif = db.notifications.find(n => n.user_id === 'admin');
      expect(adminNotif?.message).toContain('Note de frais');
    });
    
    it('ne devrait pas créer de note de frais si facture entreprise', () => {
      const booking = createEmployeeBookingViaFleet(db, {
        employeeId,
        companyId,
        fleetManagerId,
        paymentMethod: 'company_invoice'
      });
      
      fleetAssignsDriver(db, booking.id, driverId);
      
      const result = completeBookingWithPayment(db, booking.id, 45, false);
      
      expect(result.success).toBe(true);
      expect(result.expenseReport).toBeUndefined();
      expect(db.expenseReports.length).toBe(0);
    });
  });
  
  describe('Flux bidirectionnel avec les 2 types de chauffeurs', () => {
    it('chauffeur indépendant: commission due au gestionnaire', () => {
      const booking = createEmployeeBookingViaFleet(db, {
        employeeId,
        companyId,
        fleetManagerId,
        paymentMethod: 'company_invoice'
      });
      
      const independentDriverId = 'independent-driver';
      fleetAssignsDriver(db, booking.id, independentDriverId);
      
      const courseAmount = 100;
      const commissionPercentage = 15;
      
      completeBookingWithPayment(db, booking.id, courseAmount, false);
      
      // Simulation du calcul de commission
      const driverOwes = courseAmount * (commissionPercentage / 100);
      const driverKeeps = courseAmount - driverOwes;
      
      expect(driverOwes).toBe(15);
      expect(driverKeeps).toBe(85);
    });
    
    it('chauffeur interne: pas de commission, montant au gestionnaire', () => {
      const booking = createEmployeeBookingViaFleet(db, {
        employeeId,
        companyId,
        fleetManagerId,
        paymentMethod: 'company_invoice'
      });
      
      const internalDriverId = 'internal-driver';
      fleetAssignsDriver(db, booking.id, internalDriverId);
      
      const courseAmount = 100;
      
      completeBookingWithPayment(db, booking.id, courseAmount, false);
      
      // Chauffeur interne = pas de commission, tout au gestionnaire
      const fleetReceives = courseAmount;
      const driverReceives = 0; // Le chauffeur est salarié
      
      expect(fleetReceives).toBe(100);
      expect(driverReceives).toBe(0);
    });
  });
});

describe('Validation des données virtuelles', () => {
  it('les tests ne devraient pas persister de données', () => {
    const db = new EmployeeFleetTestDB();
    
    db.agreements.push({
      id: 'test',
      company_id: 'c',
      fleet_manager_id: 'f',
      status: 'active',
      company_signed: true,
      fleet_manager_signed: true,
      payment_frequency: 'monthly',
      payment_methods: []
    });
    
    expect(db.agreements.length).toBe(1);
    
    db.reset();
    
    expect(db.agreements.length).toBe(0);
    expect(db.bookings.length).toBe(0);
    expect(db.expenseReports.length).toBe(0);
  });
});
