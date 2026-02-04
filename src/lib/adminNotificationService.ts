import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/productionLogger';

/**
 * Service centralisé pour les notifications destinées aux administrateurs
 * ✅ AMÉLIORÉ: Liens granulaires avec IDs pour navigation directe
 */
export const adminNotificationService = {
  /**
   * Récupère tous les user_ids des admins
   */
  async getAdminUserIds(): Promise<string[]> {
    const { data } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');
    return data?.map(r => r.user_id) || [];
  },

  /**
   * Notifie tous les admins avec lien granulaire
   */
  async notifyAdmins(
    title: string, 
    message: string, 
    type: string = 'info',
    link: string = '/admin-dashboard',
    category?: string
  ): Promise<boolean> {
    try {
      const adminIds = await this.getAdminUserIds();
      if (adminIds.length === 0) return false;

      const notifications = adminIds.map(userId => ({
        user_id: userId,
        title,
        message,
        type,
        link,
        category,
        is_read: false
      }));

      const { error } = await supabase.from('notifications').insert(notifications);
      if (error) throw error;
      
      logger.info('Admin notifications sent:', { title, count: adminIds.length });
      return true;
    } catch (error) {
      logger.error('Error sending admin notifications:', error);
      return false;
    }
  },

  // ========== INSCRIPTIONS CHAUFFEURS - AVEC ID ==========
  async notifyNewDriverRegistration(driverName: string, driverId: string) {
    return this.notifyAdmins(
      '🚗 Nouvelle inscription chauffeur',
      `${driverName} vient de s'inscrire sur la plateforme`,
      'driver',
      `/admin-dashboard?section=users&tab=drivers&driverId=${driverId}`,
      'driver_registration'
    );
  },

  async notifyDriverDocumentsSubmitted(driverName: string, driverId: string) {
    return this.notifyAdmins(
      '📄 Documents chauffeur à valider',
      `${driverName} a soumis ses documents pour validation`,
      'info',
      `/admin-dashboard?section=users&tab=drivers&driverId=${driverId}&view=documents`,
      'driver_documents'
    );
  },

  async notifyDriverDocumentUploaded(driverName: string, documentType: string, driverId?: string) {
    return this.notifyAdmins(
      '📎 Nouveau document téléchargé',
      `${driverName} a téléchargé: ${documentType}`,
      'info',
      driverId 
        ? `/admin-dashboard?section=users&tab=drivers&driverId=${driverId}&view=documents`
        : '/admin-dashboard?section=users&tab=drivers',
      'driver_documents'
    );
  },

  async notifyDriverVehicleDocumentUploaded(driverName: string, vehicleName: string, documentType: string, driverId?: string, vehicleId?: string) {
    return this.notifyAdmins(
      '🚙 Document véhicule téléchargé',
      `${driverName} a ajouté ${documentType} pour ${vehicleName}`,
      'info',
      driverId 
        ? `/admin-dashboard?section=users&tab=drivers&driverId=${driverId}&view=vehicles${vehicleId ? `&vehicleId=${vehicleId}` : ''}`
        : '/admin-dashboard?section=users&tab=drivers',
      'vehicle_documents'
    );
  },

  // ========== VÉHICULES - AVEC ID ==========
  async notifyNewVehicleAdded(driverName: string, vehicleBrand: string, vehicleModel: string, driverId?: string, vehicleId?: string) {
    return this.notifyAdmins(
      '🚙 Nouveau véhicule ajouté',
      `${driverName} a ajouté un véhicule: ${vehicleBrand} ${vehicleModel}`,
      'info',
      driverId
        ? `/admin-dashboard?section=users&tab=drivers&driverId=${driverId}&view=vehicles`
        : '/admin-dashboard?section=users&tab=drivers',
      'vehicle'
    );
  },

  // ========== ERREURS ET BUGS - AVEC ID ==========
  async notifyNewErrorReport(errorMessage: string, userEmail?: string, errorId?: string) {
    return this.notifyAdmins(
      '🐛 Nouveau rapport d\'erreur',
      userEmail 
        ? `Erreur signalée par ${userEmail}: ${errorMessage.substring(0, 50)}...`
        : `Nouvelle erreur: ${errorMessage.substring(0, 80)}...`,
      'error',
      errorId 
        ? `/admin-dashboard?section=tech&tab=errors&errorId=${errorId}`
        : '/admin-dashboard?section=tech&tab=errors',
      'error'
    );
  },

  // ========== FEEDBACKS - AVEC ID ==========
  async notifyNewFeedback(userName: string, feedbackType: string, feedbackId?: string) {
    return this.notifyAdmins(
      '💡 Nouveau feedback',
      `${userName} a envoyé un feedback: ${feedbackType}`,
      'info',
      feedbackId
        ? `/admin-dashboard?section=support&tab=feedbacks&feedbackId=${feedbackId}`
        : '/admin-dashboard?section=support&tab=feedbacks',
      'feedback'
    );
  },

  async notifyNewSuggestion(userName: string, suggestion: string, suggestionId?: string) {
    return this.notifyAdmins(
      '✨ Nouvelle suggestion',
      `${userName}: ${suggestion.substring(0, 60)}...`,
      'info',
      suggestionId
        ? `/admin-dashboard?section=support&tab=feedbacks&suggestionId=${suggestionId}`
        : '/admin-dashboard?section=support&tab=feedbacks',
      'suggestion'
    );
  },

  // ========== LITIGES - AVEC ID ==========
  async notifyNewDispute(clientName: string, driverName: string, reason: string, disputeId?: string) {
    return this.notifyAdmins(
      '⚠️ Nouveau litige',
      `Litige entre ${clientName} et ${driverName}: ${reason.substring(0, 40)}...`,
      'warning',
      disputeId
        ? `/admin-dashboard?section=support&tab=disputes&disputeId=${disputeId}`
        : '/admin-dashboard?section=support&tab=disputes',
      'dispute'
    );
  },

  // ========== PARTENARIATS - AVEC ID ==========
  async notifyNewPartnershipDispute(party1: string, party2: string, disputeId?: string) {
    return this.notifyAdmins(
      '🤝 Litige partenariat',
      `Litige entre ${party1} et ${party2}`,
      'warning',
      disputeId
        ? `/admin-dashboard?section=support&tab=partnerships&disputeId=${disputeId}`
        : '/admin-dashboard?section=support&tab=partnerships',
      'partnership_dispute'
    );
  },

  // ========== ABONNEMENTS - AVEC ID ==========
  async notifyNewSubscription(driverName: string, planName: string, driverId?: string, subscriptionId?: string) {
    return this.notifyAdmins(
      '💳 Nouvel abonnement',
      `${driverName} s'est abonné au plan ${planName}`,
      'success',
      driverId
        ? `/admin-dashboard?section=subscriptions&driverId=${driverId}`
        : '/admin-dashboard?section=subscriptions',
      'subscription'
    );
  },

  async notifySubscriptionCancelled(driverName: string, driverId?: string) {
    return this.notifyAdmins(
      '❌ Abonnement annulé',
      `${driverName} a annulé son abonnement`,
      'warning',
      driverId
        ? `/admin-dashboard?section=subscriptions&driverId=${driverId}`
        : '/admin-dashboard?section=subscriptions',
      'subscription'
    );
  },

  // ========== ENTREPRISES - AVEC ID ==========
  async notifyNewCompanyRegistration(companyName: string, companyId?: string) {
    return this.notifyAdmins(
      '🏢 Nouvelle entreprise inscrite',
      `${companyName} vient de s'inscrire`,
      'info',
      companyId
        ? `/admin-dashboard?section=companies&companyId=${companyId}`
        : '/admin-dashboard?section=companies',
      'company'
    );
  },

  // ========== GESTIONNAIRES FLOTTE - AVEC ID ==========
  async notifyNewFleetManagerRegistration(managerName: string, fleetManagerId?: string) {
    return this.notifyAdmins(
      '🚐 Nouveau gestionnaire de flotte',
      `${managerName} vient de s'inscrire comme gestionnaire`,
      'info',
      fleetManagerId
        ? `/admin-dashboard?section=users&tab=fleet&fleetManagerId=${fleetManagerId}`
        : '/admin-dashboard?section=users&tab=fleet',
      'fleet_manager'
    );
  },

  async notifyFleetManagerDocumentsSubmitted(managerName: string, fleetManagerId?: string) {
    return this.notifyAdmins(
      '📄 Documents gestionnaire à valider',
      `${managerName} a soumis ses documents`,
      'info',
      fleetManagerId
        ? `/admin-dashboard?section=users&tab=fleet&fleetManagerId=${fleetManagerId}&view=documents`
        : '/admin-dashboard?section=users&tab=fleet',
      'fleet_documents'
    );
  },

  // ========== CONGRÈS - AVEC ID ==========
  async notifyNewCongressRegistration(attendeeName: string, congressName: string, congressId?: string, registrationId?: string) {
    return this.notifyAdmins(
      '🎫 Nouvelle inscription congrès',
      `${attendeeName} s'est inscrit à ${congressName}`,
      'info',
      congressId
        ? `/admin-dashboard?section=congress&congressId=${congressId}${registrationId ? `&registrationId=${registrationId}` : ''}`
        : '/admin-dashboard?section=congress',
      'congress'
    );
  },

  // ========== DEMANDES ASSISTANT - AVEC ID ==========
  async notifyNewAssistantRequest(driverName: string, question: string, requestId?: string) {
    return this.notifyAdmins(
      '❓ Question chauffeur',
      `${driverName}: ${question.substring(0, 50)}...`,
      'info',
      requestId
        ? `/admin-dashboard?section=support&requestId=${requestId}`
        : '/admin-dashboard?section=support',
      'assistant'
    );
  },

  // ========== CLIENTS - AVEC ID ==========
  async notifyNewClientRegistration(clientName: string, clientId?: string, driverName?: string) {
    return this.notifyAdmins(
      '👤 Nouveau client inscrit',
      driverName 
        ? `${clientName} s'est inscrit via ${driverName}`
        : `${clientName} vient de s'inscrire`,
      'info',
      clientId
        ? `/admin-dashboard?section=users&tab=clients&clientId=${clientId}`
        : '/admin-dashboard?section=users&tab=clients',
      'client_registration'
    );
  },

  // ========== COURSES ADMIN - AVEC ID ==========
  async notifyNewCourseCreated(clientName: string, driverName: string, courseId?: string) {
    return this.notifyAdmins(
      '🚗 Nouvelle course créée',
      `${clientName} a réservé une course avec ${driverName}`,
      'info',
      courseId
        ? `/admin-dashboard?section=courses&courseId=${courseId}`
        : '/admin-dashboard?section=courses',
      'course'
    );
  },

  async notifyCourseDispute(clientName: string, driverName: string, reason: string, courseId?: string) {
    return this.notifyAdmins(
      '⚠️ Litige course',
      `Litige sur course entre ${clientName} et ${driverName}: ${reason.substring(0, 30)}...`,
      'warning',
      courseId
        ? `/admin-dashboard?section=courses&courseId=${courseId}&tab=disputes`
        : '/admin-dashboard?section=support&tab=disputes',
      'dispute'
    );
  }
};
