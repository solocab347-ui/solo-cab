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
  | 'error'
  | 'admin'
  | 'company';

export type NotificationCategory = 
  | 'course_request'
  | 'course_accepted'
  | 'course_completed'
  | 'course_cancelled'
  | 'devis'
  | 'facture'
  | 'partnership'
  | 'company_partnership'
  | 'fleet_course'
  | 'payment'
  | 'registration'
  | 'documents'
  | 'subscription';

interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  category?: NotificationCategory;
  sendPush?: boolean; // Envoyer aussi en push (app fermée)
}

/**
 * Service centralisé pour créer des notifications
 * Les notifications sont automatiquement poussées via realtime aux utilisateurs connectés
 * ET via push notifications si sendPush=true (ou par défaut pour les types importants)
 */
export const notificationService = {
  /**
   * Crée une notification pour un utilisateur
   * Envoie automatiquement une push notification pour les types importants
   */
  async create(payload: NotificationPayload): Promise<boolean> {
    try {
      // Types qui déclenchent automatiquement une push notification
      const pushTypes: NotificationType[] = [
        'course', 'devis', 'facture', 'payment', 'partnership', 'fleet', 'warning', 'error',
        'admin', 'company', 'client', 'driver', 'message'
      ];
      
      const shouldSendPush = payload.sendPush ?? pushTypes.includes(payload.type);
      
      // Insérer la notification en base (le trigger enverra le push automatiquement)
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: payload.userId,
          title: payload.title,
          message: payload.message,
          type: payload.type,
          link: payload.link || '/notifications',
          category: payload.category,
          is_read: false
        });

      if (error) {
        logger.error('Erreur création notification:', error);
        return false;
      }

      // Si push supplémentaire requis, appeler l'edge function
      if (shouldSendPush) {
        try {
          await supabase.functions.invoke('send-push-notification', {
            body: {
              user_id: payload.userId,
              title: payload.title,
              message: payload.message,
              link: payload.link || '/notifications',
              tag: payload.type
            }
          });
        } catch (pushError) {
          // Ne pas bloquer si le push échoue
          logger.warn('Push notification failed (non-blocking):', pushError);
        }
      }

      logger.info('Notification créée:', { userId: payload.userId, title: payload.title, push: shouldSendPush });
      return true;
    } catch (error) {
      logger.error('Erreur service notification:', error);
      return false;
    }
  },

  /**
   * Crée plusieurs notifications en batch
   */
  async createBatch(userIds: string[], title: string, message: string, type: NotificationType, link?: string, category?: NotificationCategory): Promise<boolean> {
    try {
      const notifications = userIds.map(userId => ({
        user_id: userId,
        title,
        message,
        type,
        link: link || '/notifications',
        category,
        is_read: false
      }));

      const { error } = await supabase.from('notifications').insert(notifications);
      
      if (error) {
        logger.error('Erreur création batch notifications:', error);
        return false;
      }

      logger.info('Batch notifications créées:', { count: userIds.length, title });
      return true;
    } catch (error) {
      logger.error('Erreur batch notification:', error);
      return false;
    }
  },

  /**
   * Notifications pour les COURSES - AVEC IDs GRANULAIRES
   */
  async notifyNewCourseRequest(driverId: string, driverUserId: string, clientName: string, courseDate: string, courseId?: string) {
    return this.create({
      userId: driverUserId,
      title: '🚗 Nouvelle demande de course',
      message: `${clientName} a demandé une course pour le ${courseDate}`,
      type: 'course',
      link: courseId ? `/driver-dashboard?tab=courses&courseId=${courseId}` : '/driver-dashboard?tab=courses',
      category: 'course_request'
    });
  },

  async notifyCourseAccepted(clientUserId: string, driverName: string, courseId?: string) {
    return this.create({
      userId: clientUserId,
      title: '✅ Course acceptée',
      message: `${driverName} a accepté votre demande de course`,
      type: 'success',
      link: courseId ? `/client-dashboard?tab=courses&courseId=${courseId}` : '/client-dashboard?tab=courses',
      category: 'course_accepted'
    });
  },

  async notifyCourseRejected(clientUserId: string, driverName: string, courseId?: string) {
    return this.create({
      userId: clientUserId,
      title: '❌ Course refusée',
      message: `${driverName} n'est pas disponible pour votre course`,
      type: 'warning',
      link: courseId ? `/client-dashboard?tab=courses&courseId=${courseId}` : '/client-dashboard?tab=courses',
      category: 'course_cancelled'
    });
  },

  async notifyCourseCancelled(userId: string, cancelledBy: string, courseId?: string, isDriver: boolean = false) {
    return this.create({
      userId,
      title: '🚫 Course annulée',
      message: `La course a été annulée par ${cancelledBy}`,
      type: 'warning',
      link: isDriver 
        ? (courseId ? `/driver-dashboard?tab=courses&courseId=${courseId}` : '/driver-dashboard?tab=courses')
        : (courseId ? `/client-dashboard?tab=courses&courseId=${courseId}` : '/client-dashboard?tab=courses'),
      category: 'course_cancelled'
    });
  },

  async notifyCourseCompleted(clientUserId: string, courseId?: string) {
    return this.create({
      userId: clientUserId,
      title: '🏁 Course terminée',
      message: 'Votre course a été effectuée avec succès. Merci !',
      type: 'success',
      link: courseId ? `/client-dashboard?tab=courses&courseId=${courseId}` : '/client-dashboard?tab=courses',
      category: 'course_completed'
    });
  },

  async notifyCourseStarted(clientUserId: string, driverName: string, courseId?: string) {
    return this.create({
      userId: clientUserId,
      title: '🚕 Course en cours',
      message: `${driverName} est en route pour votre course`,
      type: 'info',
      link: courseId ? `/client-dashboard?tab=courses&courseId=${courseId}` : '/client-dashboard?tab=courses'
    });
  },

  /**
   * Notifications pour les DEVIS
   */
  async notifyNewDevis(clientUserId: string, driverName: string, amount: number, devisId?: string, courseId?: string) {
    return this.create({
      userId: clientUserId,
      title: '💶 Nouveau devis reçu',
      message: `${driverName} vous a envoyé un devis de ${amount.toFixed(2)}€`,
      type: 'devis',
      link: devisId ? `/client-dashboard?tab=devis&devisId=${devisId}` : '/client-dashboard?tab=devis',
      category: 'devis'
    });
  },

  async notifyDevisAccepted(driverUserId: string, clientName: string, amount: number, courseId?: string) {
    return this.create({
      userId: driverUserId,
      title: '✅ Devis accepté',
      message: `${clientName} a accepté votre devis de ${amount.toFixed(2)}€`,
      type: 'success',
      link: courseId ? `/driver-dashboard?tab=courses&courseId=${courseId}` : '/driver-dashboard?tab=courses',
      category: 'devis'
    });
  },

  async notifyDevisRejected(driverUserId: string, clientName: string, courseId?: string) {
    return this.create({
      userId: driverUserId,
      title: '❌ Devis refusé',
      message: `${clientName} a refusé votre devis`,
      type: 'warning',
      link: courseId ? `/driver-dashboard?tab=courses&courseId=${courseId}` : '/driver-dashboard?tab=courses',
      category: 'devis'
    });
  },

  /**
   * Notifications pour les FACTURES
   */
  async notifyNewFacture(clientUserId: string, driverName: string, amount: number, invoiceNumber: string, invoiceId?: string) {
    return this.create({
      userId: clientUserId,
      title: '📄 Nouvelle facture',
      message: `Facture ${invoiceNumber} de ${amount.toFixed(2)}€ de ${driverName}`,
      type: 'facture',
      link: invoiceId ? `/client-dashboard?tab=invoices&invoiceId=${invoiceId}` : '/client-dashboard?tab=invoices',
      category: 'facture'
    });
  },

  async notifyFacturePaid(driverUserId: string, clientName: string, amount: number, invoiceId?: string) {
    return this.create({
      userId: driverUserId,
      title: '💰 Paiement reçu',
      message: `${clientName} a payé ${amount.toFixed(2)}€`,
      type: 'payment',
      link: invoiceId ? `/driver-dashboard?tab=invoices&invoiceId=${invoiceId}` : '/driver-dashboard?tab=invoices',
      category: 'payment'
    });
  },

  /**
   * Notifications pour les CLIENTS - AVEC ID
   */
  async notifyNewClient(driverUserId: string, clientName: string, clientId?: string) {
    return this.create({
      userId: driverUserId,
      title: '👤 Nouveau client',
      message: `${clientName} s'est inscrit via votre profil`,
      type: 'client',
      link: clientId ? `/driver-dashboard?tab=clients&clientId=${clientId}` : '/driver-dashboard?tab=clients'
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
  },

  /**
   * Notifications PARTENARIAT DRIVER-DRIVER COMPLÈTES
   */
  async notifyDriverPartnershipRequest(receiverUserId: string, senderName: string, commission: number) {
    return this.create({
      userId: receiverUserId,
      title: '🤝 Nouvelle demande de partenariat',
      message: `${senderName} souhaite devenir votre partenaire (${commission}% de rétribution)`,
      type: 'partnership',
      link: '/driver-dashboard?tab=partnerships'
    });
  },

  async notifyDriverPartnershipAccepted(senderUserId: string, partnerName: string) {
    return this.create({
      userId: senderUserId,
      title: '✅ Partenariat accepté !',
      message: `${partnerName} a accepté votre demande de partenariat`,
      type: 'success',
      link: '/driver-dashboard?tab=partnerships'
    });
  },

  async notifyDriverPartnershipRejected(senderUserId: string, partnerName: string) {
    return this.create({
      userId: senderUserId,
      title: '❌ Partenariat refusé',
      message: `${partnerName} a décliné votre demande de partenariat`,
      type: 'warning',
      link: '/driver-dashboard?tab=partnerships'
    });
  },

  async notifyDriverPartnershipTerminated(partnerUserId: string, partnerName: string, reason?: string) {
    return this.create({
      userId: partnerUserId,
      title: '🚫 Partenariat terminé',
      message: reason 
        ? `${partnerName} a mis fin au partenariat: ${reason}` 
        : `${partnerName} a mis fin au partenariat`,
      type: 'warning',
      link: '/driver-dashboard?tab=partnerships'
    });
  },

  /**
   * Notifications COURSES PARTAGÉES entre partenaires
   */
  async notifyPartnerCourseReceived(receiverUserId: string, senderName: string, courseDate: string, commission: number) {
    return this.create({
      userId: receiverUserId,
      title: '📤 Course proposée par un partenaire',
      message: `${senderName} vous propose une course le ${courseDate} (${commission}€ de rétribution)`,
      type: 'course',
      link: '/driver-dashboard?tab=partnerships'
    });
  },

  async notifyPartnerCourseAccepted(senderUserId: string, partnerName: string, courseDate: string) {
    return this.create({
      userId: senderUserId,
      title: '✅ Course acceptée par votre partenaire',
      message: `${partnerName} a accepté votre course du ${courseDate}`,
      type: 'success',
      link: '/driver-dashboard?tab=partnerships'
    });
  },

  async notifyPartnerCourseDeclined(senderUserId: string, partnerName: string, courseDate: string) {
    return this.create({
      userId: senderUserId,
      title: '❌ Course refusée par votre partenaire',
      message: `${partnerName} a refusé votre course du ${courseDate}`,
      type: 'warning',
      link: '/driver-dashboard?tab=partnerships'
    });
  },

  async notifyPartnerCourseCompleted(senderUserId: string, partnerName: string, amount: number, commission: number) {
    return this.create({
      userId: senderUserId,
      title: '🏁 Course partenaire terminée',
      message: `${partnerName} a effectué votre course (${amount}€, rétribution: ${commission}€)`,
      type: 'success',
      link: '/driver-dashboard?tab=partnerships'
    });
  },

  /**
   * Notifications PAIEMENT PARTENAIRES
   */
  async notifyPartnerPaymentDue(driverUserId: string, partnerName: string, amount: number, dueDate: string) {
    return this.create({
      userId: driverUserId,
      title: '⏰ Paiement partenaire à venir',
      message: `${amount.toFixed(2)}€ à régler à ${partnerName} avant le ${dueDate}`,
      type: 'warning',
      link: '/driver-dashboard?tab=partnerships'
    });
  },

  async notifyPartnerPaymentOverdue(driverUserId: string, partnerName: string, amount: number) {
    return this.create({
      userId: driverUserId,
      title: '🚨 Paiement partenaire en retard',
      message: `${amount.toFixed(2)}€ en retard de paiement à ${partnerName}`,
      type: 'error',
      link: '/driver-dashboard?tab=partnerships'
    });
  },

  async notifyPartnerPaymentReceived(receiverUserId: string, senderName: string, amount: number) {
    return this.create({
      userId: receiverUserId,
      title: '💰 Paiement partenaire reçu',
      message: `${senderName} a confirmé un paiement de ${amount.toFixed(2)}€`,
      type: 'success',
      link: '/driver-dashboard?tab=partnerships'
    });
  },

  async notifyPartnerPaymentSent(receiverUserId: string, senderName: string, amount: number) {
    return this.create({
      userId: receiverUserId,
      title: '💸 Paiement partenaire envoyé',
      message: `${senderName} vous a envoyé ${amount.toFixed(2)}€`,
      type: 'info',
      link: '/driver-dashboard?tab=partnerships'
    });
  },

  /**
   * Notifications FLEET-DRIVER PARTNERSHIP
   */
  async notifyFleetPartnershipRequest(driverUserId: string, fleetName: string, commission: string) {
    return this.create({
      userId: driverUserId,
      title: '🚐 Proposition de partenariat flotte',
      message: `${fleetName} vous propose un partenariat (${commission})`,
      type: 'partnership',
      link: '/driver-dashboard?tab=partnerships'
    });
  },

  async notifyFleetPartnershipAccepted(fleetManagerUserId: string, driverName: string) {
    return this.create({
      userId: fleetManagerUserId,
      title: '✅ Partenariat chauffeur accepté',
      message: `${driverName} a accepté votre proposition de partenariat`,
      type: 'success',
      link: '/fleet-dashboard?tab=partnerships'
    });
  },

  async notifyFleetPartnershipRejected(fleetManagerUserId: string, driverName: string) {
    return this.create({
      userId: fleetManagerUserId,
      title: '❌ Partenariat chauffeur refusé',
      message: `${driverName} a décliné votre proposition`,
      type: 'warning',
      link: '/fleet-dashboard?tab=partnerships'
    });
  },

  async notifyFleetPartnerCourseCompleted(fleetManagerUserId: string, driverName: string, amount: number, commission: number) {
    return this.create({
      userId: fleetManagerUserId,
      title: '🏁 Course partenaire terminée',
      message: `${driverName} a terminé une course (${amount}€, rétribution: ${commission}€)`,
      type: 'success',
      link: '/fleet-dashboard?tab=partnerships'
    });
  },

  async notifyDriverFleetCommissionDue(driverUserId: string, fleetName: string, amount: number, dueDate: string) {
    return this.create({
      userId: driverUserId,
      title: '⏰ Rétribution flotte à régler',
      message: `${amount.toFixed(2)}€ de rétribution à régler à ${fleetName} avant le ${dueDate}`,
      type: 'warning',
      link: '/driver-dashboard?tab=partnerships'
    });
  },

  /**
   * Notifications CONTRE-PROPOSITION
   */
  async notifyPartnershipCounterProposal(receiverUserId: string, senderName: string, newCommission: string) {
    return this.create({
      userId: receiverUserId,
      title: '🔄 Contre-proposition reçue',
      message: `${senderName} propose ${newFrais de transaction} de rétribution`,
      type: 'partnership',
      link: '/driver-dashboard?tab=partnerships'
    });
  },

  async notifyFleetPartnershipCounterProposal(fleetManagerUserId: string, driverName: string, newCommission: string) {
    return this.create({
      userId: fleetManagerUserId,
      title: '🔄 Contre-proposition du chauffeur',
      message: `${driverName} propose ${newFrais de transaction} de rétribution`,
      type: 'partnership',
      link: '/fleet-dashboard?tab=partnerships'
    });
  },

  // ========================================
  // NOTIFICATIONS GESTIONNAIRES DE FLOTTE
  // ========================================

  async notifyFleetNewCourseRequest(fleetManagerUserId: string, companyName: string, courseDate: string) {
    return this.create({
      userId: fleetManagerUserId,
      title: '🏢 Nouvelle demande entreprise',
      message: `${companyName} demande une course le ${courseDate}`,
      type: 'course',
      link: '/fleet-dashboard?tab=requests',
      category: 'fleet_course'
    });
  },

  async notifyFleetCourseAcceptedByDriver(fleetManagerUserId: string, driverName: string, courseDate: string) {
    return this.create({
      userId: fleetManagerUserId,
      title: '✅ Course acceptée',
      message: `${driverName} a accepté la course du ${courseDate}`,
      type: 'success',
      link: '/fleet-dashboard?tab=courses',
      category: 'fleet_course'
    });
  },

  async notifyFleetCourseDeclinedByDriver(fleetManagerUserId: string, driverName: string, courseDate: string) {
    return this.create({
      userId: fleetManagerUserId,
      title: '❌ Course refusée',
      message: `${driverName} a refusé la course du ${courseDate}`,
      type: 'warning',
      link: '/fleet-dashboard?tab=courses',
      category: 'fleet_course'
    });
  },

  async notifyFleetCourseCompleted(fleetManagerUserId: string, driverName: string, clientName: string, amount: number) {
    return this.create({
      userId: fleetManagerUserId,
      title: '🏁 Course terminée',
      message: `${driverName} a terminé la course de ${clientName} (${amount.toFixed(2)}€)`,
      type: 'success',
      link: '/fleet-dashboard?tab=courses',
      category: 'fleet_course'
    });
  },

  async notifyFleetDriverDocumentUploaded(fleetManagerUserId: string, driverName: string, documentType: string) {
    return this.create({
      userId: fleetManagerUserId,
      title: '📄 Document chauffeur uploadé',
      message: `${driverName} a téléchargé: ${documentType}`,
      type: 'info',
      link: '/fleet-dashboard?tab=drivers',
      category: 'documents'
    });
  },

  async notifyFleetNewDriverJoined(fleetManagerUserId: string, driverName: string) {
    return this.create({
      userId: fleetManagerUserId,
      title: '🚗 Nouveau chauffeur',
      message: `${driverName} a rejoint votre flotte`,
      type: 'success',
      link: '/fleet-dashboard?tab=drivers',
      category: 'registration'
    });
  },

  async notifyFleetDriverLeft(fleetManagerUserId: string, driverName: string, reason?: string) {
    return this.create({
      userId: fleetManagerUserId,
      title: '🚪 Chauffeur a quitté la flotte',
      message: reason ? `${driverName} a quitté: ${reason}` : `${driverName} a quitté la flotte`,
      type: 'warning',
      link: '/fleet-dashboard?tab=drivers'
    });
  },

  // ========================================
  // NOTIFICATIONS ADMIN
  // ========================================

  async notifyAdminNewDriver(adminUserId: string, driverName: string) {
    return this.create({
      userId: adminUserId,
      title: '🚗 Nouvelle inscription chauffeur',
      message: `${driverName} vient de s'inscrire`,
      type: 'admin',
      link: '/admin-dashboard?section=users&tab=drivers',
      category: 'registration'
    });
  },

  async notifyAdminNewFleetManager(adminUserId: string, managerName: string) {
    return this.create({
      userId: adminUserId,
      title: '🚐 Nouveau gestionnaire de flotte',
      message: `${managerName} vient de s'inscrire`,
      type: 'admin',
      link: '/admin-dashboard?section=users&tab=fleet',
      category: 'registration'
    });
  },

  async notifyAdminNewCompany(adminUserId: string, companyName: string) {
    return this.create({
      userId: adminUserId,
      title: '🏢 Nouvelle entreprise',
      message: `${companyName} vient de s'inscrire`,
      type: 'admin',
      link: '/admin-dashboard?section=users&tab=companies',
      category: 'registration'
    });
  },

  async notifyAdminDocumentsSubmitted(adminUserId: string, driverName: string, userType: 'driver' | 'fleet') {
    return this.create({
      userId: adminUserId,
      title: '📄 Documents à valider',
      message: `${driverName} a soumis ses documents`,
      type: 'admin',
      link: userType === 'driver' 
        ? '/admin-dashboard?section=users&tab=drivers' 
        : '/admin-dashboard?section=users&tab=fleet',
      category: 'documents'
    });
  },

  async notifyAdminSubscriptionCancelled(adminUserId: string, userName: string, userType: string) {
    return this.create({
      userId: adminUserId,
      title: '❌ Abonnement annulé',
      message: `${userName} (${userType}) a annulé son abonnement`,
      type: 'warning',
      link: '/admin-dashboard?section=subscriptions',
      category: 'subscription'
    });
  },

  async notifyAdminAssistantRequest(adminUserId: string, driverName: string, question: string) {
    return this.create({
      userId: adminUserId,
      title: '❓ Question chauffeur',
      message: `${driverName}: ${question.substring(0, 50)}...`,
      type: 'admin',
      link: '/admin-dashboard?section=support'
    });
  },

  // ========================================
  // NOTIFICATIONS CLIENTS
  // ========================================

  async notifyClientCourseConfirmed(clientUserId: string, driverName: string, courseDate: string) {
    return this.create({
      userId: clientUserId,
      title: '✅ Réservation confirmée',
      message: `${driverName} a confirmé votre course du ${courseDate}`,
      type: 'success',
      link: '/client-dashboard',
      category: 'course_accepted'
    });
  },

  async notifyClientDriverEnRoute(clientUserId: string, driverName: string, eta?: string) {
    return this.create({
      userId: clientUserId,
      title: '🚗 Chauffeur en route',
      message: eta ? `${driverName} arrive dans ${eta}` : `${driverName} est en route vers vous`,
      type: 'info',
      link: '/client-dashboard'
    });
  },

  async notifyClientDriverArrived(clientUserId: string, driverName: string) {
    return this.create({
      userId: clientUserId,
      title: '📍 Chauffeur arrivé',
      message: `${driverName} est arrivé à votre point de départ`,
      type: 'info',
      link: '/client-dashboard'
    });
  },

  async notifyClientRideStarted(clientUserId: string) {
    return this.create({
      userId: clientUserId,
      title: '🚕 Course démarrée',
      message: 'Votre course a commencé. Bon voyage !',
      type: 'info',
      link: '/client-dashboard'
    });
  },

  async notifyClientRideCompleted(clientUserId: string, amount: number) {
    return this.create({
      userId: clientUserId,
      title: '🏁 Course terminée',
      message: `Votre course est terminée. Montant: ${amount.toFixed(2)}€`,
      type: 'success',
      link: '/client-dashboard',
      category: 'course_completed'
    });
  },

  async notifyClientPaymentReminder(clientUserId: string, driverName: string, amount: number, invoiceNumber: string) {
    return this.create({
      userId: clientUserId,
      title: '⏰ Rappel de paiement',
      message: `Facture ${invoiceNumber} de ${amount.toFixed(2)}€ en attente`,
      type: 'warning',
      link: '/client-dashboard',
      category: 'payment'
    });
  },

  // ========================================
  // NOTIFICATIONS GÉNÉRALES
  // ========================================

  async notifyDocumentValidated(userId: string, documentType: string) {
    return this.create({
      userId,
      title: '✅ Document validé',
      message: `Votre ${documentType} a été validé`,
      type: 'success',
      category: 'documents'
    });
  },

  async notifyDocumentRejected(userId: string, documentType: string, reason?: string) {
    return this.create({
      userId,
      title: '❌ Document rejeté',
      message: reason ? `${documentType} rejeté: ${reason}` : `Votre ${documentType} a été rejeté`,
      type: 'warning',
      category: 'documents'
    });
  },

  async notifySubscriptionExpiring(userId: string, daysLeft: number) {
    return this.create({
      userId,
      title: '⏰ Abonnement bientôt expiré',
      message: `Votre abonnement expire dans ${daysLeft} jours`,
      type: 'warning',
      category: 'subscription'
    });
  },

  async notifySubscriptionRenewed(userId: string) {
    return this.create({
      userId,
      title: '✅ Abonnement renouvelé',
      message: 'Votre abonnement a été renouvelé avec succès',
      type: 'success',
      category: 'subscription'
    });
  },

  async notifyFreeAccessGranted(userId: string, type: 'unlimited' | 'limited', endDate?: string) {
    return this.create({
      userId,
      title: '🎁 Accès gratuit accordé',
      message: type === 'unlimited' 
        ? '\'Vous bénéficiez dun accès gratuit illimité'
        : `Accès gratuit jusqu'au ${endDate}`,
      type: 'success',
      category: 'subscription'
    });
  },

  async notifyFreeAccessExpiring(userId: string, daysLeft: number) {
    return this.create({
      userId,
      title: '⏰ Accès gratuit bientôt expiré',
      message: `Votre accès gratuit expire dans ${daysLeft} jours`,
      type: 'warning',
      category: 'subscription'
    });
  }
};

export default notificationService;
