import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/productionLogger';

export type NotificationType = 
  | 'course' 
  | 'devis' 
  | 'facture' 
  | 'payment' 
  | 'partnership' 
  | 'client' 
  | 'driver' 
  | 'fleet'
  | 'message'
  | 'info'
  | 'success'
  | 'warning'
  | 'error';

interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
}

/**
 * Service centralisé pour créer des notifications
 * Les notifications sont automatiquement poussées via realtime aux utilisateurs connectés
 */
export const notificationService = {
  /**
   * Crée une notification pour un utilisateur
   */
  async create(payload: NotificationPayload): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: payload.userId,
          title: payload.title,
          message: payload.message,
          type: payload.type,
          link: payload.link || '/notifications',
          is_read: false
        });

      if (error) {
        logger.error('Erreur création notification:', error);
        return false;
      }

      logger.info('Notification créée:', { userId: payload.userId, title: payload.title });
      return true;
    } catch (error) {
      logger.error('Erreur service notification:', error);
      return false;
    }
  },

  /**
   * Notifications pour les COURSES
   */
  async notifyNewCourseRequest(driverId: string, driverUserId: string, clientName: string, courseDate: string) {
    return this.create({
      userId: driverUserId,
      title: '🚗 Nouvelle demande de course',
      message: `${clientName} a demandé une course pour le ${courseDate}`,
      type: 'course',
      link: '/driver-dashboard'
    });
  },

  async notifyCourseAccepted(clientUserId: string, driverName: string) {
    return this.create({
      userId: clientUserId,
      title: '✅ Course acceptée',
      message: `${driverName} a accepté votre demande de course`,
      type: 'success',
      link: '/client-dashboard'
    });
  },

  async notifyCourseRejected(clientUserId: string, driverName: string) {
    return this.create({
      userId: clientUserId,
      title: '❌ Course refusée',
      message: `${driverName} n'est pas disponible pour votre course`,
      type: 'warning',
      link: '/client-dashboard'
    });
  },

  async notifyCourseCancelled(userId: string, cancelledBy: string) {
    return this.create({
      userId,
      title: '🚫 Course annulée',
      message: `La course a été annulée par ${cancelledBy}`,
      type: 'warning',
      link: userId.includes('driver') ? '/driver-dashboard' : '/client-dashboard'
    });
  },

  async notifyCourseCompleted(clientUserId: string) {
    return this.create({
      userId: clientUserId,
      title: '🏁 Course terminée',
      message: 'Votre course a été effectuée avec succès. Merci !',
      type: 'success',
      link: '/client-dashboard'
    });
  },

  async notifyCourseStarted(clientUserId: string, driverName: string) {
    return this.create({
      userId: clientUserId,
      title: '🚕 Course en cours',
      message: `${driverName} est en route pour votre course`,
      type: 'info',
      link: '/client-dashboard'
    });
  },

  /**
   * Notifications pour les DEVIS
   */
  async notifyNewDevis(clientUserId: string, driverName: string, amount: number) {
    return this.create({
      userId: clientUserId,
      title: '💶 Nouveau devis reçu',
      message: `${driverName} vous a envoyé un devis de ${amount.toFixed(2)}€`,
      type: 'devis',
      link: '/client-dashboard'
    });
  },

  async notifyDevisAccepted(driverUserId: string, clientName: string, amount: number) {
    return this.create({
      userId: driverUserId,
      title: '✅ Devis accepté',
      message: `${clientName} a accepté votre devis de ${amount.toFixed(2)}€`,
      type: 'success',
      link: '/driver-dashboard'
    });
  },

  async notifyDevisRejected(driverUserId: string, clientName: string) {
    return this.create({
      userId: driverUserId,
      title: '❌ Devis refusé',
      message: `${clientName} a refusé votre devis`,
      type: 'warning',
      link: '/driver-dashboard'
    });
  },

  /**
   * Notifications pour les FACTURES
   */
  async notifyNewFacture(clientUserId: string, driverName: string, amount: number, invoiceNumber: string) {
    return this.create({
      userId: clientUserId,
      title: '📄 Nouvelle facture',
      message: `Facture ${invoiceNumber} de ${amount.toFixed(2)}€ de ${driverName}`,
      type: 'facture',
      link: '/client-dashboard'
    });
  },

  async notifyFacturePaid(driverUserId: string, clientName: string, amount: number) {
    return this.create({
      userId: driverUserId,
      title: '💰 Paiement reçu',
      message: `${clientName} a payé ${amount.toFixed(2)}€`,
      type: 'payment',
      link: '/driver-dashboard'
    });
  },

  /**
   * Notifications pour les CLIENTS
   */
  async notifyNewClient(driverUserId: string, clientName: string) {
    return this.create({
      userId: driverUserId,
      title: '👤 Nouveau client',
      message: `${clientName} s'est inscrit via votre profil`,
      type: 'client',
      link: '/driver-dashboard'
    });
  },

  /**
   * Notifications pour les PARTENARIATS
   */
  async notifyPartnershipRequest(driverUserId: string, partnerName: string) {
    return this.create({
      userId: driverUserId,
      title: '🤝 Demande de partenariat',
      message: `${partnerName} souhaite devenir votre partenaire`,
      type: 'partnership',
      link: '/driver-dashboard'
    });
  },

  async notifyPartnershipAccepted(driverUserId: string, partnerName: string) {
    return this.create({
      userId: driverUserId,
      title: '✅ Partenariat accepté',
      message: `${partnerName} a accepté votre demande de partenariat`,
      type: 'success',
      link: '/driver-dashboard'
    });
  },

  async notifyPartnershipRejected(driverUserId: string, partnerName: string) {
    return this.create({
      userId: driverUserId,
      title: '❌ Partenariat refusé',
      message: `${partnerName} a décliné votre demande`,
      type: 'warning',
      link: '/driver-dashboard'
    });
  },

  async notifyCourseShared(driverUserId: string, partnerName: string, courseInfo: string) {
    return this.create({
      userId: driverUserId,
      title: '📤 Course partagée',
      message: `${partnerName} vous propose une course: ${courseInfo}`,
      type: 'course',
      link: '/driver-dashboard'
    });
  },

  /**
   * Notifications pour les FLOTTES
   */
  async notifyFleetDriverAdded(driverUserId: string, fleetName: string) {
    return this.create({
      userId: driverUserId,
      title: '🚐 Ajouté à une flotte',
      message: `Vous avez été ajouté à la flotte ${fleetName}`,
      type: 'fleet',
      link: '/fleet-driver-dashboard'
    });
  },

  async notifyFleetDriverRemoved(driverUserId: string, fleetName: string, reason?: string) {
    return this.create({
      userId: driverUserId,
      title: '🚐 Retiré de la flotte',
      message: reason ? `Vous avez été retiré de ${fleetName}: ${reason}` : `Vous n'êtes plus dans la flotte ${fleetName}`,
      type: 'warning',
      link: '/driver-dashboard'
    });
  },

  async notifyFleetNewDriver(fleetManagerUserId: string, driverName: string) {
    return this.create({
      userId: fleetManagerUserId,
      title: '🚐 Nouveau chauffeur',
      message: `${driverName} a rejoint votre flotte`,
      type: 'fleet',
      link: '/fleet-dashboard'
    });
  },

  async notifyFleetCourseAssigned(driverUserId: string, clientName: string, courseDate: string) {
    return this.create({
      userId: driverUserId,
      title: '📍 Course assignée',
      message: `Une course pour ${clientName} le ${courseDate} vous a été assignée`,
      type: 'course',
      link: '/fleet-driver-dashboard'
    });
  },

  /**
   * Notifications pour les ENTREPRISES
   */
  async notifyCompanyAgreementRequest(companyUserId: string, driverName: string) {
    return this.create({
      userId: companyUserId,
      title: '📋 Demande de partenariat',
      message: `${driverName} propose un partenariat commercial`,
      type: 'partnership',
      link: '/company-dashboard?tab=partnerships'
    });
  },

  async notifyCompanyAgreementAccepted(driverUserId: string, companyName: string) {
    return this.create({
      userId: driverUserId,
      title: '✅ Partenariat entreprise accepté',
      message: `${companyName} a accepté votre proposition`,
      type: 'success',
      link: '/driver-dashboard'
    });
  },

  // Notifications courses entreprise
  async notifyCompanyNewCourse(companyUserId: string, employeeName: string, courseDate: string) {
    return this.create({
      userId: companyUserId,
      title: '🚗 Nouvelle réservation',
      message: `${employeeName} a créé une réservation pour le ${courseDate}`,
      type: 'course',
      link: '/company-dashboard?tab=courses'
    });
  },

  async notifyCompanyCourseAccepted(companyUserId: string, driverName: string, courseDate: string) {
    return this.create({
      userId: companyUserId,
      title: '✅ Réservation confirmée',
      message: `${driverName} a accepté la course du ${courseDate}`,
      type: 'success',
      link: '/company-dashboard?tab=courses'
    });
  },

  async notifyCompanyCourseCompleted(companyUserId: string, employeeName: string, amount: number) {
    return this.create({
      userId: companyUserId,
      title: '🏁 Course terminée',
      message: `Course de ${employeeName} effectuée (${amount.toFixed(2)}€)`,
      type: 'success',
      link: '/company-dashboard?tab=courses'
    });
  },

  async notifyCompanyCourseCancelled(companyUserId: string, employeeName: string, courseDate: string) {
    return this.create({
      userId: companyUserId,
      title: '🚫 Réservation annulée',
      message: `La course de ${employeeName} du ${courseDate} a été annulée`,
      type: 'warning',
      link: '/company-dashboard?tab=courses'
    });
  },

  async notifyCompanyNewEmployee(companyUserId: string, employeeName: string) {
    return this.create({
      userId: companyUserId,
      title: '👤 Nouveau collaborateur',
      message: `${employeeName} a rejoint votre entreprise`,
      type: 'info',
      link: '/company-dashboard?tab=employees'
    });
  },

  async notifyCompanyNewInvoice(companyUserId: string, driverName: string, amount: number, invoiceNumber: string) {
    return this.create({
      userId: companyUserId,
      title: '📄 Nouvelle facture',
      message: `Facture ${invoiceNumber} de ${amount.toFixed(2)}€ de ${driverName}`,
      type: 'facture',
      link: '/company-dashboard?tab=invoices'
    });
  },

  async notifyCompanyFleetPartnershipRequest(companyUserId: string, fleetName: string) {
    return this.create({
      userId: companyUserId,
      title: '🚐 Demande de partenariat flotte',
      message: `${fleetName} propose un partenariat`,
      type: 'partnership',
      link: '/company-dashboard?tab=partnerships'
    });
  },

  async notifyCompanyFleetPartnershipAccepted(companyUserId: string, fleetName: string) {
    return this.create({
      userId: companyUserId,
      title: '✅ Partenariat flotte accepté',
      message: `${fleetName} a accepté votre demande de partenariat`,
      type: 'success',
      link: '/company-dashboard?tab=partnerships'
    });
  },

  /**
   * Notifications pour la SUPERVISION DES COLLABORATEURS
   */
  async notifyCompanyEmployeeCourseCreated(companyUserId: string, employeeName: string, courseInfo: string) {
    return this.create({
      userId: companyUserId,
      title: '🚗 Course créée par collaborateur',
      message: `${employeeName} a créé une course: ${courseInfo}`,
      type: 'course',
      link: '/company-dashboard?tab=courses'
    });
  },

  async notifyCompanyEmployeeCourseCompleted(companyUserId: string, employeeName: string, amount: number) {
    return this.create({
      userId: companyUserId,
      title: '✅ Course collaborateur terminée',
      message: `${employeeName} a terminé une course (${amount.toFixed(2)}€)`,
      type: 'success',
      link: '/company-dashboard?tab=courses'
    });
  },

  async notifyCompanyEmployeeCourseCancelled(companyUserId: string, employeeName: string) {
    return this.create({
      userId: companyUserId,
      title: '🚫 Course collaborateur annulée',
      message: `${employeeName} a annulé une course`,
      type: 'warning',
      link: '/company-dashboard?tab=courses'
    });
  },

  async notifyCompanyEmployeeBudgetAlert(companyUserId: string, employeeName: string, percentage: number) {
    return this.create({
      userId: companyUserId,
      title: '⚠️ Alerte budget collaborateur',
      message: `${employeeName} a atteint ${percentage}% de son budget mensuel`,
      type: 'warning',
      link: '/company-dashboard?tab=employees'
    });
  },

  async notifyCompanyEmployeeLimitReached(companyUserId: string, employeeName: string, limitType: 'budget' | 'courses') {
    return this.create({
      userId: companyUserId,
      title: '🛑 Limite atteinte',
      message: `${employeeName} a atteint sa limite de ${limitType === 'budget' ? 'budget' : 'courses'} mensuelle`,
      type: 'error',
      link: '/company-dashboard?tab=employees'
    });
  },

  async notifyEmployeeSuspended(employeeUserId: string, reason?: string) {
    return this.create({
      userId: employeeUserId,
      title: '⚠️ Compte suspendu',
      message: reason ? `Votre compte a été suspendu: ${reason}` : 'Votre compte collaborateur a été suspendu',
      type: 'warning',
      link: '/company-employee-dashboard'
    });
  },

  async notifyEmployeeReactivated(employeeUserId: string) {
    return this.create({
      userId: employeeUserId,
      title: '✅ Compte réactivé',
      message: 'Votre compte collaborateur a été réactivé',
      type: 'success',
      link: '/company-employee-dashboard'
    });
  },

  /**
   * Notifications pour les MESSAGES
   */
  async notifyNewMessage(userId: string, senderName: string) {
    return this.create({
      userId,
      title: '💬 Nouveau message',
      message: `${senderName} vous a envoyé un message`,
      type: 'message',
      link: '/notifications'
    });
  },

  /**
   * Notifications génériques
   */
  async notifyInfo(userId: string, title: string, message: string, link?: string) {
    return this.create({
      userId,
      title,
      message,
      type: 'info',
      link
    });
  },

  async notifySuccess(userId: string, title: string, message: string, link?: string) {
    return this.create({
      userId,
      title,
      message,
      type: 'success',
      link
    });
  },

  async notifyWarning(userId: string, title: string, message: string, link?: string) {
    return this.create({
      userId,
      title,
      message,
      type: 'warning',
      link
    });
  },

  async notifyError(userId: string, title: string, message: string, link?: string) {
    return this.create({
      userId,
      title,
      message,
      type: 'error',
      link
    });
  }
};

export default notificationService;
