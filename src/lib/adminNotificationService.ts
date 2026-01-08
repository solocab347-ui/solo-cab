import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/productionLogger';

/**
 * Service centralisé pour les notifications destinées aux administrateurs
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
   * Notifie tous les admins
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

  // ========== INSCRIPTIONS CHAUFFEURS ==========
  async notifyNewDriverRegistration(driverName: string, driverId: string) {
    return this.notifyAdmins(
      '🚗 Nouvelle inscription chauffeur',
      `${driverName} vient de s'inscrire sur la plateforme`,
      'driver',
      '/admin-dashboard?section=users&tab=drivers',
      'driver_registration'
    );
  },

  async notifyDriverDocumentsSubmitted(driverName: string, driverId: string) {
    return this.notifyAdmins(
      '📄 Documents chauffeur à valider',
      `${driverName} a soumis ses documents pour validation`,
      'info',
      '/admin-dashboard?section=users&tab=drivers',
      'driver_documents'
    );
  },

  async notifyDriverDocumentUploaded(driverName: string, documentType: string) {
    return this.notifyAdmins(
      '📎 Nouveau document téléchargé',
      `${driverName} a téléchargé: ${documentType}`,
      'info',
      '/admin-dashboard?section=users&tab=drivers',
      'driver_documents'
    );
  },

  async notifyDriverVehicleDocumentUploaded(driverName: string, vehicleName: string, documentType: string) {
    return this.notifyAdmins(
      '🚙 Document véhicule téléchargé',
      `${driverName} a ajouté ${documentType} pour ${vehicleName}`,
      'info',
      '/admin-dashboard?section=users&tab=drivers',
      'vehicle_documents'
    );
  },

  // ========== VÉHICULES ==========
  async notifyNewVehicleAdded(driverName: string, vehicleBrand: string, vehicleModel: string) {
    return this.notifyAdmins(
      '🚙 Nouveau véhicule ajouté',
      `${driverName} a ajouté un véhicule: ${vehicleBrand} ${vehicleModel}`,
      'info',
      '/admin-dashboard?section=users&tab=drivers',
      'vehicle'
    );
  },

  // ========== ERREURS ET BUGS ==========
  async notifyNewErrorReport(errorMessage: string, userEmail?: string) {
    return this.notifyAdmins(
      '🐛 Nouveau rapport d\'erreur',
      userEmail 
        ? `Erreur signalée par ${userEmail}: ${errorMessage.substring(0, 50)}...`
        : `Nouvelle erreur: ${errorMessage.substring(0, 80)}...`,
      'error',
      '/admin-dashboard?section=tech&tab=errors',
      'error'
    );
  },

  // ========== FEEDBACKS ==========
  async notifyNewFeedback(userName: string, feedbackType: string) {
    return this.notifyAdmins(
      '💡 Nouveau feedback',
      `${userName} a envoyé un feedback: ${feedbackType}`,
      'info',
      '/admin-dashboard?section=support&tab=feedbacks',
      'feedback'
    );
  },

  async notifyNewSuggestion(userName: string, suggestion: string) {
    return this.notifyAdmins(
      '✨ Nouvelle suggestion',
      `${userName}: ${suggestion.substring(0, 60)}...`,
      'info',
      '/admin-dashboard?section=support&tab=feedbacks',
      'suggestion'
    );
  },

  // ========== LITIGES ==========
  async notifyNewDispute(clientName: string, driverName: string, reason: string) {
    return this.notifyAdmins(
      '⚠️ Nouveau litige',
      `Litige entre ${clientName} et ${driverName}: ${reason.substring(0, 40)}...`,
      'warning',
      '/admin-dashboard?section=support&tab=disputes',
      'dispute'
    );
  },

  // ========== PARTENARIATS ==========
  async notifyNewPartnershipDispute(party1: string, party2: string) {
    return this.notifyAdmins(
      '🤝 Litige partenariat',
      `Litige entre ${party1} et ${party2}`,
      'warning',
      '/admin-dashboard?section=support&tab=partnerships',
      'partnership_dispute'
    );
  },

  // ========== ABONNEMENTS ==========
  async notifyNewSubscription(driverName: string, planName: string) {
    return this.notifyAdmins(
      '💳 Nouvel abonnement',
      `${driverName} s'est abonné au plan ${planName}`,
      'success',
      '/admin-dashboard?section=subscriptions',
      'subscription'
    );
  },

  async notifySubscriptionCancelled(driverName: string) {
    return this.notifyAdmins(
      '❌ Abonnement annulé',
      `${driverName} a annulé son abonnement`,
      'warning',
      '/admin-dashboard?section=subscriptions',
      'subscription'
    );
  },

  // ========== ENTREPRISES ==========
  async notifyNewCompanyRegistration(companyName: string) {
    return this.notifyAdmins(
      '🏢 Nouvelle entreprise inscrite',
      `${companyName} vient de s'inscrire`,
      'info',
      '/admin-dashboard',
      'company'
    );
  },

  // ========== GESTIONNAIRES FLOTTE ==========
  async notifyNewFleetManagerRegistration(managerName: string) {
    return this.notifyAdmins(
      '🚐 Nouveau gestionnaire de flotte',
      `${managerName} vient de s'inscrire comme gestionnaire`,
      'info',
      '/admin-dashboard?section=users&tab=fleet',
      'fleet_manager'
    );
  },

  async notifyFleetManagerDocumentsSubmitted(managerName: string) {
    return this.notifyAdmins(
      '📄 Documents gestionnaire à valider',
      `${managerName} a soumis ses documents`,
      'info',
      '/admin-dashboard?section=users&tab=fleet',
      'fleet_documents'
    );
  },

  // ========== CONGRÈS ==========
  async notifyNewCongressRegistration(attendeeName: string, congressName: string) {
    return this.notifyAdmins(
      '🎫 Nouvelle inscription congrès',
      `${attendeeName} s'est inscrit à ${congressName}`,
      'info',
      '/admin-dashboard?section=congress',
      'congress'
    );
  },

  // ========== DEMANDES ASSISTANT ==========
  async notifyNewAssistantRequest(driverName: string, question: string) {
    return this.notifyAdmins(
      '❓ Question chauffeur',
      `${driverName}: ${question.substring(0, 50)}...`,
      'info',
      '/admin-dashboard?section=support',
      'assistant'
    );
  }
};
