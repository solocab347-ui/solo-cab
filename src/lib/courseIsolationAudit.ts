/**
 * =====================================================
 * AUDIT DE SÉCURITÉ - ISOLATION DES COURSES
 * =====================================================
 * 
 * Ce document documente les mesures de sécurité mises en place
 * pour garantir l'isolation stricte des courses entre les différents
 * acteurs du système.
 * 
 * Date de l'audit: 2026-01-09
 * Version: 2.0 (Renforcée)
 */

export interface IsolationRule {
  actor: string;
  canSee: string[];
  cannotSee: string[];
  mechanism: string;
}

export const ISOLATION_RULES: IsolationRule[] = [
  {
    actor: "Chauffeur indépendant",
    canSee: [
      "Ses propres courses (driver_id = son ID)",
      "Courses partagées PAR d'autres chauffeurs via shared_courses (receiver_driver_id = son ID)",
      "Courses assignées par gestionnaire via fleet_partner_courses (driver_id = son ID)"
    ],
    cannotSee: [
      "Courses des autres chauffeurs",
      "Courses créées par le gestionnaire (sauf si explicitement assignées)",
      "Courses des clients d'autres chauffeurs"
    ],
    mechanism: "RLS sur courses + shared_courses + fleet_partner_courses"
  },
  {
    actor: "Gestionnaire de flotte",
    canSee: [
      "Courses qu'il a créées (fleet_manager_id = son ID)",
      "Courses partagées AVEC lui via fleet_partner_courses",
      "Statistiques basées UNIQUEMENT sur ses courses créées"
    ],
    cannotSee: [
      "Courses personnelles des chauffeurs partenaires",
      "Courses entre chauffeurs (shared_courses)",
      "Courses des chauffeurs qui ne sont pas dans fleet_partner_courses"
    ],
    mechanism: "RLS stricte + filtrage fleet_manager_id dans le code"
  },
  {
    actor: "Client",
    canSee: [
      "Uniquement SES propres courses (client_id = son ID)"
    ],
    cannotSee: [
      "Courses d'autres clients",
      "Courses des chauffeurs",
      "Courses gestionnaire non liées à lui"
    ],
    mechanism: "RLS sur courses avec get_client_id()"
  }
];

/**
 * Politiques RLS en place sur la table 'courses'
 */
export const COURSES_RLS_POLICIES = [
  {
    name: "Fleet managers can only view their own or shared courses",
    type: "SELECT",
    condition: "fleet_manager_id match OR course in fleet_partner_courses",
    description: "Le gestionnaire ne voit QUE ses courses OU celles partagées avec lui"
  },
  {
    name: "Drivers can view their assigned courses",
    type: "SELECT",
    condition: "driver_id = get_driver_id(auth.uid()) OR driver_id in driver_ids",
    description: "Le chauffeur voit SES courses assignées"
  },
  {
    name: "Drivers can view fleet shared courses",
    type: "SELECT",
    condition: "EXISTS fleet_partner_courses where driver_id = current driver",
    description: "Le chauffeur voit les courses qui lui sont assignées par un gestionnaire"
  },
  {
    name: "Receivers can view shared courses",
    type: "SELECT",
    condition: "EXISTS shared_courses where receiver_driver_id = current driver",
    description: "Le chauffeur voit les courses partagées par d'autres chauffeurs"
  }
];

/**
 * Politiques RLS sur 'fleet_partner_courses'
 */
export const FLEET_PARTNER_COURSES_RLS = [
  {
    name: "Fleet manager strict view policy",
    description: "Le gestionnaire ne voit que les partages qu'il a créés"
  },
  {
    name: "Partner driver strict view policy",
    description: "Le chauffeur ne voit que les courses qui lui sont assignées"
  }
];

/**
 * Vérifications côté code (defense in depth)
 */
export const CODE_SECURITY_CHECKS = {
  FleetCoursesManager: {
    file: "src/components/fleet-manager/FleetCoursesManager.tsx",
    check: "Filtre par fleet_manager_id + fleet_partner_courses",
    status: "✅ SÉCURISÉ"
  },
  FleetStatisticsDashboard: {
    file: "src/components/fleet-manager/FleetStatisticsDashboard.tsx",
    check: "Utilise fleet_manager_id au lieu de driver_id",
    status: "✅ CORRIGÉ"
  },
  DriverPlanning: {
    file: "src/components/driver/DriverPlanning.tsx",
    check: "Filtre par driver_id + shared_courses + fleet_partner_courses",
    status: "✅ SÉCURISÉ"
  },
  CoursesList: {
    file: "src/components/CoursesList.tsx",
    check: "Filtre par driver_id pour courses personnelles",
    status: "✅ SÉCURISÉ"
  }
};

/**
 * Points de partage légitimes
 */
export const LEGITIMATE_SHARING_POINTS = {
  shared_courses: {
    description: "Partage direct chauffeur → chauffeur",
    fields: ["sender_driver_id", "receiver_driver_id", "course_id"],
    visibility: "Sender et Receiver uniquement"
  },
  fleet_partner_courses: {
    description: "Partage gestionnaire → chauffeur partenaire",
    fields: ["fleet_manager_id", "driver_id", "course_id"],
    visibility: "Gestionnaire créateur et Chauffeur assigné uniquement"
  },
  partner_course_pool: {
    description: "Pool de courses disponibles pour partenaires",
    fields: ["course_id", "partnership_ids"],
    visibility: "Uniquement chauffeurs dans les partenariats listés"
  }
};

/**
 * Résumé de l'audit
 */
export const AUDIT_SUMMARY = {
  date: "2026-01-09",
  status: "RENFORCÉ",
  criticalIssuesFixed: [
    "FleetStatisticsDashboard utilisait driver_id au lieu de fleet_manager_id",
    "Politiques RLS sur courses renforcées pour gestionnaires"
  ],
  securityLevel: "ÉLEVÉ",
  recommendations: [
    "Continuer à utiliser fleet_manager_id pour toutes les requêtes gestionnaire",
    "Toujours vérifier le RLS avant d'ajouter de nouvelles fonctionnalités",
    "Ne jamais utiliser .in('driver_id', driverIds) pour les stats gestionnaire"
  ]
};
