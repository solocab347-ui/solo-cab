/**
 * Tests virtuels pour le tracking de suivi des clients non-inscrits
 * et les emails de confirmation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// TYPES
// ============================================================================

interface GuestBookingInfo {
  id: string;
  course_number: string;
  guest_name: string;
  guest_phone: string;
  guest_email?: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  guest_tracking_token: string;
  driver_info?: {
    first_name: string;
    last_name: string;
    phone?: string;
    avatar_url?: string;
    vehicle_brand?: string;
    vehicle_model?: string;
    license_plate?: string;
  };
  is_shared?: boolean;
  shared_with_drivers?: Array<{
    first_name: string;
    last_name: string;
    avatar_url?: string;
  }>;
  estimated_price?: number;
  final_price?: number;
}

interface EmailPayload {
  to: string;
  subject: string;
  template: 'guest_tracking' | 'course_update' | 'course_completed';
  data: Record<string, any>;
}

// ============================================================================
// VIRTUAL EMAIL SERVICE
// ============================================================================

class VirtualEmailService {
  sentEmails: EmailPayload[] = [];
  
  async sendGuestTrackingEmail(booking: GuestBookingInfo): Promise<{ success: boolean; error?: string }> {
    if (!booking.guest_email) {
      return { success: false, error: 'No email provided' };
    }
    
    const trackingUrl = `https://app.solocab.fr/guest-booking/${booking.guest_tracking_token}`;
    
    const email: EmailPayload = {
      to: booking.guest_email,
      subject: `Votre réservation VTC - ${booking.course_number}`,
      template: 'guest_tracking',
      data: {
        guest_name: booking.guest_name,
        course_number: booking.course_number,
        pickup_address: booking.pickup_address,
        destination_address: booking.destination_address,
        scheduled_date: booking.scheduled_date,
        tracking_url: trackingUrl,
        driver_name: booking.driver_info 
          ? `${booking.driver_info.first_name} ${booking.driver_info.last_name}` 
          : undefined,
        driver_phone: booking.driver_info?.phone,
        vehicle_info: booking.driver_info 
          ? `${booking.driver_info.vehicle_brand} ${booking.driver_info.vehicle_model}` 
          : undefined,
        license_plate: booking.driver_info?.license_plate,
        is_shared: booking.is_shared,
        shared_drivers: booking.shared_with_drivers
      }
    };
    
    this.sentEmails.push(email);
    return { success: true };
  }
  
  async sendCourseUpdateEmail(booking: GuestBookingInfo, updateType: string): Promise<{ success: boolean }> {
    if (!booking.guest_email) {
      return { success: false };
    }
    
    const email: EmailPayload = {
      to: booking.guest_email,
      subject: `Mise à jour de votre course - ${booking.course_number}`,
      template: 'course_update',
      data: {
        guest_name: booking.guest_name,
        update_type: updateType,
        status: booking.status
      }
    };
    
    this.sentEmails.push(email);
    return { success: true };
  }
  
  reset(): void {
    this.sentEmails = [];
  }
}

// ============================================================================
// TRACKING URL GENERATOR
// ============================================================================

function generateTrackingToken(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateTrackingUrl(token: string): string {
  return `https://app.solocab.fr/guest-booking/${token}`;
}

function validateTrackingToken(token: string): boolean {
  // Un token valide a le format timestamp-randomstring
  const parts = token.split('-');
  if (parts.length < 2) return false;
  
  const timestamp = parseInt(parts[0], 10);
  if (isNaN(timestamp)) return false;
  
  // Token de moins de 30 jours
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  return timestamp > thirtyDaysAgo;
}

// ============================================================================
// TESTS
// ============================================================================

describe('Système de suivi pour clients non-inscrits', () => {
  let emailService: VirtualEmailService;
  
  beforeEach(() => {
    emailService = new VirtualEmailService();
    emailService.reset();
  });
  
  describe('Génération de token de suivi', () => {
    it('devrait générer un token unique', () => {
      const token1 = generateTrackingToken();
      const token2 = generateTrackingToken();
      
      expect(token1).not.toBe(token2);
      expect(token1).toMatch(/^\d+-[a-z0-9]+$/);
    });
    
    it('devrait générer une URL de suivi valide', () => {
      const token = generateTrackingToken();
      const url = generateTrackingUrl(token);
      
      expect(url).toContain('guest-booking');
      expect(url).toContain(token);
    });
    
    it('devrait valider les tokens récents', () => {
      const freshToken = generateTrackingToken();
      expect(validateTrackingToken(freshToken)).toBe(true);
      
      // Simuler un vieux token (>30 jours)
      const oldToken = `${Date.now() - 40 * 24 * 60 * 60 * 1000}-abc123`;
      expect(validateTrackingToken(oldToken)).toBe(false);
    });
  });
  
  describe('Envoi d\'email de suivi', () => {
    it('devrait envoyer un email avec les informations de la course', async () => {
      const booking: GuestBookingInfo = {
        id: 'course-123',
        course_number: 'VTC-2026-0001',
        guest_name: 'Jean Dupont',
        guest_phone: '0612345678',
        guest_email: 'jean.dupont@example.com',
        pickup_address: '123 Rue de Paris',
        destination_address: 'Aéroport CDG',
        scheduled_date: new Date().toISOString(),
        status: 'accepted',
        guest_tracking_token: generateTrackingToken(),
        driver_info: {
          first_name: 'Pierre',
          last_name: 'Martin',
          phone: '0698765432',
          vehicle_brand: 'Mercedes',
          vehicle_model: 'Classe E',
          license_plate: 'AB-123-CD'
        },
        estimated_price: 75.50
      };
      
      const result = await emailService.sendGuestTrackingEmail(booking);
      
      expect(result.success).toBe(true);
      expect(emailService.sentEmails.length).toBe(1);
      
      const sentEmail = emailService.sentEmails[0];
      expect(sentEmail.to).toBe('jean.dupont@example.com');
      expect(sentEmail.subject).toContain('VTC-2026-0001');
      expect(sentEmail.data.driver_name).toBe('Pierre Martin');
      expect(sentEmail.data.vehicle_info).toContain('Mercedes');
      expect(sentEmail.data.tracking_url).toContain(booking.guest_tracking_token);
    });
    
    it('ne devrait pas envoyer d\'email sans adresse', async () => {
      const booking: GuestBookingInfo = {
        id: 'course-456',
        course_number: 'VTC-2026-0002',
        guest_name: 'Sans Email',
        guest_phone: '0600000000',
        pickup_address: 'A',
        destination_address: 'B',
        scheduled_date: new Date().toISOString(),
        status: 'accepted',
        guest_tracking_token: generateTrackingToken()
        // Pas de guest_email
      };
      
      const result = await emailService.sendGuestTrackingEmail(booking);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No email provided');
      expect(emailService.sentEmails.length).toBe(0);
    });
  });
  
  describe('Courses partagées', () => {
    it('devrait inclure les informations des chauffeurs partagés', async () => {
      const booking: GuestBookingInfo = {
        id: 'course-shared-123',
        course_number: 'VTC-2026-SHARED',
        guest_name: 'Client Partagé',
        guest_phone: '0612345678',
        guest_email: 'client@example.com',
        pickup_address: 'Gare de Lyon',
        destination_address: 'Aéroport Orly',
        scheduled_date: new Date().toISOString(),
        status: 'accepted',
        guest_tracking_token: generateTrackingToken(),
        driver_info: {
          first_name: 'Chauffeur',
          last_name: 'Principal'
        },
        is_shared: true,
        shared_with_drivers: [
          { first_name: 'Backup', last_name: 'Driver1', avatar_url: 'https://...' },
          { first_name: 'Backup', last_name: 'Driver2' }
        ]
      };
      
      const result = await emailService.sendGuestTrackingEmail(booking);
      
      expect(result.success).toBe(true);
      const sentEmail = emailService.sentEmails[0];
      expect(sentEmail.data.is_shared).toBe(true);
      expect(sentEmail.data.shared_drivers?.length).toBe(2);
    });
  });
  
  describe('Mises à jour de statut', () => {
    it('devrait envoyer une notification à chaque changement de statut', async () => {
      const booking: GuestBookingInfo = {
        id: 'course-updates',
        course_number: 'VTC-2026-UPDATE',
        guest_name: 'Client Update',
        guest_phone: '0600000000',
        guest_email: 'updates@example.com',
        pickup_address: 'A',
        destination_address: 'B',
        scheduled_date: new Date().toISOString(),
        status: 'accepted',
        guest_tracking_token: generateTrackingToken()
      };
      
      // Changement: accepted -> in_progress
      booking.status = 'in_progress';
      await emailService.sendCourseUpdateEmail(booking, 'driver_on_way');
      
      // Changement: in_progress -> completed
      booking.status = 'completed';
      await emailService.sendCourseUpdateEmail(booking, 'course_completed');
      
      expect(emailService.sentEmails.length).toBe(2);
      expect(emailService.sentEmails[0].data.update_type).toBe('driver_on_way');
      expect(emailService.sentEmails[1].data.update_type).toBe('course_completed');
    });
  });
});

describe('Flux complet: Création → Email → Suivi → Complétion', () => {
  it('devrait simuler le parcours complet d\'un client non-inscrit', async () => {
    const emailService = new VirtualEmailService();
    
    // ÉTAPE 1: Chauffeur crée la course
    const trackingToken = generateTrackingToken();
    const booking: GuestBookingInfo = {
      id: 'full-flow-course',
      course_number: 'VTC-FLOW-001',
      guest_name: 'Client Complet',
      guest_phone: '0612345678',
      guest_email: 'flow@example.com',
      pickup_address: 'Bureau Client',
      destination_address: 'Restaurant',
      scheduled_date: new Date(Date.now() + 3600000).toISOString(), // Dans 1h
      status: 'accepted',
      guest_tracking_token: trackingToken,
      driver_info: {
        first_name: 'Thomas',
        last_name: 'Chauffeur',
        phone: '0698765432',
        vehicle_brand: 'Tesla',
        vehicle_model: 'Model S',
        license_plate: 'EV-001-FR'
      },
      estimated_price: 35
    };
    
    // ÉTAPE 2: Email automatique envoyé
    await emailService.sendGuestTrackingEmail(booking);
    expect(emailService.sentEmails.length).toBe(1);
    
    // ÉTAPE 3: Client peut accéder à la page de suivi
    const trackingUrl = generateTrackingUrl(trackingToken);
    expect(trackingUrl).toContain(trackingToken);
    expect(validateTrackingToken(trackingToken)).toBe(true);
    
    // ÉTAPE 4: Chauffeur démarre la course
    booking.status = 'in_progress';
    await emailService.sendCourseUpdateEmail(booking, 'driver_on_way');
    expect(emailService.sentEmails.length).toBe(2);
    
    // ÉTAPE 5: Course terminée
    booking.status = 'completed';
    booking.final_price = 38.50; // Prix final légèrement différent
    await emailService.sendCourseUpdateEmail(booking, 'course_completed');
    expect(emailService.sentEmails.length).toBe(3);
    
    // Vérification finale
    const lastEmail = emailService.sentEmails[2];
    expect(lastEmail.data.status).toBe('completed');
  });
});

describe('Validation des montants et commissions', () => {
  interface PaymentSummary {
    courseAmount: number;
    commissionPercentage: number;
    equipmentType: 'driver_owned' | 'fleet_provided';
  }
  
  function calculatePayments(summary: PaymentSummary): {
    driverReceives: number;
    fleetReceives: number;
    driverOwesToFleet: number;
  } {
    if (summary.equipmentType === 'fleet_provided') {
      return {
        driverReceives: 0,
        fleetReceives: summary.courseAmount,
        driverOwesToFleet: 0
      };
    }
    
    const commission = summary.courseAmount * (summary.commissionPercentage / 100);
    return {
      driverReceives: summary.courseAmount - commission,
      fleetReceives: commission,
      driverOwesToFleet: commission
    };
  }
  
  it('devrait calculer correctement pour chauffeur indépendant', () => {
    const result = calculatePayments({
      courseAmount: 100,
      commissionPercentage: 15,
      equipmentType: 'driver_owned'
    });
    
    expect(result.driverReceives).toBe(85);
    expect(result.fleetReceives).toBe(15);
    expect(result.driverOwesToFleet).toBe(15);
  });
  
  it('devrait retourner tout au gestionnaire pour chauffeur interne', () => {
    const result = calculatePayments({
      courseAmount: 100,
      commissionPercentage: 15,
      equipmentType: 'fleet_provided'
    });
    
    expect(result.driverReceives).toBe(0);
    expect(result.fleetReceives).toBe(100);
    expect(result.driverOwesToFleet).toBe(0);
  });
});
