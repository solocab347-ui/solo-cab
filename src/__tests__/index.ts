/**
 * Tests virtuels SoloCab - Index
 * 
 * Ces tests valident la logique métier sans interagir avec la base de données.
 * Ils couvrent les flux:
 * 
 * 1. company-fleet-course-flow.test.ts
 *    - Admin crée course pour client non-inscrit → Gestionnaire → Chauffeur indépendant
 *    - Course avec chauffeur interne (pas de commission)
 *    - Collaborateur inscrit réserve via gestionnaire
 *    - Notifications bidirectionnelles
 *    - Calculs financiers et commissions
 * 
 * 2. guest-tracking-system.test.ts
 *    - Génération de tokens de suivi
 *    - Envoi d'emails de confirmation
 *    - Courses partagées
 *    - Mises à jour de statut
 * 
 * 3. employee-fleet-booking.test.ts
 *    - Visibilité des gestionnaires partenaires
 *    - Réservation via gestionnaire
 *    - Attribution chauffeur indépendant vs interne
 *    - Notes de frais automatiques
 * 
 * Pour exécuter: npm run test
 */

export {};
