 import { useState } from "react";
import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { 
   FileText, 
  Download,
   UserPlus, 
   Target, 
   BarChart3, 
   Zap,
   CheckCircle,
   XCircle,
   AlertTriangle,
   Database,
   Code,
   Lightbulb
 } from "lucide-react";
 
const generateDocumentText = (): string => {
  return `================================================================================
RAPPORT COMPLET - PARCOURS CHAUFFEUR SOLOCAB
================================================================================
Version 2.0 - 5 Février 2026
Documentation exhaustive du parcours chauffeur pour audit et amélioration

================================================================================
1. VUE GÉNÉRALE
================================================================================

FLUX PRINCIPAL
--------------
INSCRIPTION → VALIDATION ADMIN → ONBOARDING (8 étapes) → OBJECTIFS → SUIVI QUOTIDIEN → RAPPORTS

STATUTS CHAUFFEUR
-----------------
• pending    : Inscription soumise, en attente - Aucune action
• validated  : Validé par admin - Accès tunnel onboarding
• active     : Onboarding terminé - Toutes fonctionnalités
• suspended  : Compte suspendu - Aucune action
• rejected   : Inscription refusée - Peut re-soumettre

FICHIERS CLÉS
-------------
• Auth.tsx - Inscription/connexion
• HorizontalOnboardingTunnel.tsx - Contrôleur onboarding
• OnboardingGoalsStep.tsx - Définition objectifs
• ObjectivesDashboard.tsx - Dashboard suivi
• DailyActivityInput.tsx - Saisie quotidienne
• ObjectivesEditor.tsx - Modification post-onboarding
• send-daily-report/index.ts - Edge Function rapports

================================================================================
2. TUNNEL D'ONBOARDING - 8 ÉTAPES
================================================================================

Progression sauvegardée dans: drivers.current_onboarding_step

Étape 0 - Vision SoloCab (1-2 min)
  Présentation philosophie, avantages indépendance

Étape 1 - Définition Objectifs ⭐ CRITIQUE (5-10 min)
  CA mensuel, clients cibles, planning pondéré, Coach Alex IA

Étape 2 - Configuration Tarification (3-5 min)
  Base, km, horaire, majorations (soirée, weekend, aéroport)

Étape 3 - Profil Public (5-10 min)
  Photo, bio, secteurs, véhicule, services, langues

Étape 4 - Upload Documents (10-15 min)
  9 documents requis (voir section Documents)

Étape 5 - Plaque NFC (2-3 min)
  Commander plaque NFC ou utiliser QR Code

Étape 6 - Configuration Paiement (10-20 min)
  Stripe Connect, SumUp, espèces, virement

Étape 7 - Lancement Essai (2-3 min)
  Récapitulatif, période essai 30 jours, activation

DOCUMENTS REQUIS (9)
--------------------
1. Carte VTC (recto)
2. Carte VTC (verso)
3. Pièce d'identité (recto)
4. Pièce d'identité (verso)
5. Permis de conduire
6. Carte grise
7. Attestation assurance
8. KBIS / INSEE
9. RIB

Stockage: Supabase Storage bucket driver-documents/{driver_id}/*

================================================================================
3. SYSTÈME D'OBJECTIFS
================================================================================

TABLE: driver_objectives
-------------------------
• revenue_target      - Objectif de CA
• courses_target      - Nombre de courses
• new_clients_target  - Nouveaux clients
• hours_target        - Heures de travail
• km_target           - Kilomètres parcourus
• rating_target       - Note moyenne

PÉRIODES SUPPORTÉES
-------------------
• daily (quotidien)
• weekly (hebdomadaire)
• monthly (mensuel)
• yearly (annuel)

LOGIQUE DE PONDÉRATION JOURNALIÈRE
----------------------------------
Les objectifs quotidiens sont calculés avec des coefficients par jour:

| Jour      | Coefficient | Explication      |
|-----------|-------------|------------------|
| Lundi     | 0.70        | Jour calme       |
| Mardi     | 0.85        | -                |
| Mercredi  | 0.90        | -                |
| Jeudi     | 1.00        | Référence        |
| Vendredi  | 1.15        | Jour fort        |
| Samedi    | 1.20        | Jour très fort   |
| Dimanche  | 1.20        | Jour très fort   |

Formule: dailyTarget = (weeklyGoal × dayWeight) / totalWeeklyWeight

MODIFICATION POST-ONBOARDING (ObjectivesEditor.tsx)
---------------------------------------------------
Sections modifiables indépendamment:
• CA Mensuel - Modifier l'objectif de revenus
• Clients Cibles - Nombre de clients fidèles
• Ratio Indépendance - % SoloCab vs Plateformes
• Planning - Jours travaillés et pondération
• Niveau Coaching - Intensité des notifications

================================================================================
4. SUIVI QUOTIDIEN
================================================================================

SOURCES DE DONNÉES
------------------
• Automatique (SoloCab): CA, courses, clients, km
• Manuel (Plateformes): Uber, Bolt, Heetch...
• Manuel (Travail): Heures, km parcourus

TABLE: driver_daily_entries
---------------------------
• entry_date
• platform_id
• is_solocab
• revenue
• courses_count
• new_clients_count
• hours_worked
• km_driven

RAPPORTS AUTOMATISÉS
--------------------
Edge Function: send-daily-report
Schedule: CRON 0 7 * * * (chaque matin à 7h)

Contenu:
• Résumé veille
• Objectifs du jour
• Message de coaching personnalisé
• Conseils selon météo/événements

================================================================================
5. ARCHITECTURE TECHNIQUE
================================================================================

TABLES PRINCIPALES
------------------
• drivers - Données chauffeur, statut, onboarding
• driver_objectives - Objectifs multi-période
• driver_daily_entries - Suivi quotidien multi-plateforme
• driver_coaching_profiles - Préférences coaching
• courses - Courses effectuées
• clients - Clients fidèles

COLONNES CLÉS (drivers)
-----------------------
• status: pending | validated | active | suspended | rejected
• current_onboarding_step: 0-7
• trial_ends_at: Date fin période essai
• objectives_data: JSONB config objectifs
• work_rhythm_data: JSONB planning semaine

EDGE FUNCTIONS
--------------
• send-daily-report - Rapports quotidiens
• process-coaching-notification - Notifications coaching
• calculate-driver-stats - Calcul statistiques

================================================================================
6. POINTS D'AMÉLIORATION
================================================================================

POINTS CRITIQUES (URGENT)
-------------------------
[!] Pas de rapport hebdomadaire/mensuel automatisé
[!] Pas d'export PDF des performances
[!] Historique objectifs non visualisable

AMÉLIORATIONS SUGGÉRÉES
-----------------------
[+] Ajouter rapports hebdo/mensuel
[+] Dashboard comparatif périodes
[+] Export données PDF/Excel
[+] Prédictions IA revenus
[+] Alertes objectifs manqués

FONCTIONNALITÉS FUTURES
-----------------------
[ ] Analyse prédictive IA
[ ] Comparaison anonyme confrères
[ ] Suggestions horaires optimaux
[ ] Intégration météo avancée
[ ] Gamification (badges, niveaux)

================================================================================
FIN DU RAPPORT
================================================================================
Document généré automatiquement depuis SoloCab Admin Dashboard
`;
};

const handleDownload = () => {
  const content = generateDocumentText();
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'SoloCab_Rapport_Parcours_Chauffeur.txt';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

 const AdminDocumentation = () => {
   return (
     <div className="space-y-6">
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <FileText className="w-5 h-5" />
             Rapport Complet - Parcours Chauffeur SoloCab
           </CardTitle>
           <CardDescription>
             Documentation exhaustive du parcours chauffeur pour audit et amélioration
           </CardDescription>
          <div className="flex flex-wrap items-center gap-2 mt-2">
             <Badge variant="outline">Version 2.0</Badge>
             <Badge variant="secondary">5 Février 2026</Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownload}
              className="ml-auto gap-2"
            >
              <Download className="w-4 h-4" />
              Télécharger (.txt)
            </Button>
           </div>
         </CardHeader>
       </Card>
 
       <Tabs defaultValue="overview" className="w-full">
         <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 w-full h-auto gap-1">
           <TabsTrigger value="overview" className="text-xs">Vue Générale</TabsTrigger>
           <TabsTrigger value="onboarding" className="text-xs">Onboarding</TabsTrigger>
           <TabsTrigger value="objectives" className="text-xs">Objectifs</TabsTrigger>
           <TabsTrigger value="tracking" className="text-xs">Suivi</TabsTrigger>
           <TabsTrigger value="tech" className="text-xs">Architecture</TabsTrigger>
           <TabsTrigger value="improvements" className="text-xs">Améliorations</TabsTrigger>
         </TabsList>
 
         <TabsContent value="overview" className="mt-4">
           <OverviewSection />
         </TabsContent>
 
         <TabsContent value="onboarding" className="mt-4">
           <OnboardingSection />
         </TabsContent>
 
         <TabsContent value="objectives" className="mt-4">
           <ObjectivesSection />
         </TabsContent>
 
         <TabsContent value="tracking" className="mt-4">
           <TrackingSection />
         </TabsContent>
 
         <TabsContent value="tech" className="mt-4">
           <TechSection />
         </TabsContent>
 
         <TabsContent value="improvements" className="mt-4">
           <ImprovementsSection />
         </TabsContent>
       </Tabs>
     </div>
   );
 };
 
 const OverviewSection = () => (
   <div className="space-y-4">
     <Card>
       <CardHeader>
         <CardTitle className="text-lg flex items-center gap-2">
           <Zap className="w-5 h-5 text-yellow-500" />
           Flux Principal
         </CardTitle>
       </CardHeader>
       <CardContent>
         <div className="flex flex-wrap items-center gap-2 text-sm">
           <Badge>INSCRIPTION</Badge>
           <span>→</span>
           <Badge variant="secondary">VALIDATION ADMIN</Badge>
           <span>→</span>
           <Badge variant="outline">ONBOARDING (8 étapes)</Badge>
           <span>→</span>
           <Badge className="bg-primary">OBJECTIFS</Badge>
           <span>→</span>
           <Badge className="bg-green-600">SUIVI QUOTIDIEN</Badge>
           <span>→</span>
           <Badge className="bg-blue-600">RAPPORTS</Badge>
         </div>
       </CardContent>
     </Card>
 
     <Card>
       <CardHeader>
         <CardTitle className="text-lg">Statuts Chauffeur</CardTitle>
       </CardHeader>
       <CardContent>
         <div className="overflow-x-auto">
           <table className="w-full text-sm">
             <thead>
               <tr className="border-b">
                 <th className="text-left py-2 px-2">Statut</th>
                 <th className="text-left py-2 px-2">Description</th>
                 <th className="text-left py-2 px-2">Actions</th>
               </tr>
             </thead>
             <tbody>
               <tr className="border-b">
                 <td className="py-2 px-2"><Badge variant="outline">pending</Badge></td>
                 <td className="py-2 px-2">Inscription soumise, en attente</td>
                 <td className="py-2 px-2 text-muted-foreground">Aucune</td>
               </tr>
               <tr className="border-b">
                 <td className="py-2 px-2"><Badge className="bg-blue-600">validated</Badge></td>
                 <td className="py-2 px-2">Validé par admin</td>
                 <td className="py-2 px-2">Accès tunnel onboarding</td>
               </tr>
               <tr className="border-b">
                 <td className="py-2 px-2"><Badge className="bg-green-600">active</Badge></td>
                 <td className="py-2 px-2">Onboarding terminé</td>
                 <td className="py-2 px-2">Toutes fonctionnalités</td>
               </tr>
               <tr className="border-b">
                 <td className="py-2 px-2"><Badge variant="destructive">suspended</Badge></td>
                 <td className="py-2 px-2">Compte suspendu</td>
                 <td className="py-2 px-2 text-muted-foreground">Aucune</td>
               </tr>
               <tr>
                 <td className="py-2 px-2"><Badge variant="destructive">rejected</Badge></td>
                 <td className="py-2 px-2">Inscription refusée</td>
                 <td className="py-2 px-2">Peut re-soumettre</td>
               </tr>
             </tbody>
           </table>
         </div>
       </CardContent>
     </Card>
 
     <Card>
       <CardHeader>
         <CardTitle className="text-lg flex items-center gap-2">
           <Code className="w-5 h-5" />
           Fichiers Clés
         </CardTitle>
       </CardHeader>
       <CardContent>
         <ScrollArea className="h-64">
           <div className="space-y-2 text-sm font-mono">
             <div className="p-2 bg-muted rounded">
               <span className="text-blue-600">Auth.tsx</span> - Inscription/connexion
             </div>
             <div className="p-2 bg-muted rounded">
               <span className="text-blue-600">HorizontalOnboardingTunnel.tsx</span> - Contrôleur onboarding
             </div>
             <div className="p-2 bg-muted rounded">
               <span className="text-blue-600">OnboardingGoalsStep.tsx</span> - Définition objectifs
             </div>
             <div className="p-2 bg-muted rounded">
               <span className="text-blue-600">ObjectivesDashboard.tsx</span> - Dashboard suivi
             </div>
             <div className="p-2 bg-muted rounded">
               <span className="text-blue-600">DailyActivityInput.tsx</span> - Saisie quotidienne
             </div>
             <div className="p-2 bg-muted rounded">
               <span className="text-blue-600">ObjectivesEditor.tsx</span> - Modification post-onboarding
             </div>
             <div className="p-2 bg-muted rounded">
               <span className="text-blue-600">send-daily-report/index.ts</span> - Edge Function rapports
             </div>
           </div>
         </ScrollArea>
       </CardContent>
     </Card>
   </div>
 );
 
 const OnboardingSection = () => (
   <div className="space-y-4">
     <Card>
       <CardHeader>
         <CardTitle className="text-lg flex items-center gap-2">
           <UserPlus className="w-5 h-5 text-green-500" />
           Tunnel d'Onboarding - 8 Étapes
         </CardTitle>
         <CardDescription>
           Progression sauvegardée dans drivers.current_onboarding_step
         </CardDescription>
       </CardHeader>
       <CardContent>
         <div className="space-y-4">
           {[
             { step: 0, name: "Vision SoloCab", duration: "1-2 min", description: "Présentation philosophie, avantages indépendance" },
             { step: 1, name: "Définition Objectifs ⭐", duration: "5-10 min", description: "CA mensuel, clients cibles, planning pondéré, Coach Alex IA", critical: true },
             { step: 2, name: "Configuration Tarification", duration: "3-5 min", description: "Base, km, horaire, majorations (soirée, weekend, aéroport)" },
             { step: 3, name: "Profil Public", duration: "5-10 min", description: "Photo, bio, secteurs, véhicule, services, langues" },
             { step: 4, name: "Upload Documents", duration: "10-15 min", description: "9 documents: VTC, ID, permis, carte grise, assurance, KBIS, RIB" },
             { step: 5, name: "Plaque NFC", duration: "2-3 min", description: "Commander plaque NFC ou utiliser QR Code" },
             { step: 6, name: "Configuration Paiement", duration: "10-20 min", description: "Stripe Connect, SumUp, espèces, virement" },
             { step: 7, name: "Lancement Essai", duration: "2-3 min", description: "Récapitulatif, période essai 30 jours, activation" },
           ].map((item) => (
             <div 
               key={item.step} 
               className={`p-3 rounded-lg border ${item.critical ? 'border-yellow-500 bg-yellow-500/10' : 'border-border'}`}
             >
               <div className="flex items-start justify-between gap-4">
                 <div className="flex items-center gap-3">
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${item.critical ? 'bg-yellow-500 text-white' : 'bg-primary text-primary-foreground'}`}>
                     {item.step}
                   </div>
                   <div>
                     <p className="font-medium">{item.name}</p>
                     <p className="text-sm text-muted-foreground">{item.description}</p>
                   </div>
                 </div>
                 <Badge variant="outline" className="shrink-0">{item.duration}</Badge>
               </div>
             </div>
           ))}
         </div>
       </CardContent>
     </Card>
 
     <Card>
       <CardHeader>
         <CardTitle className="text-lg">Documents Requis (9)</CardTitle>
       </CardHeader>
       <CardContent>
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
           {[
             "Carte VTC (recto)",
             "Carte VTC (verso)",
             "Pièce d'identité (recto)",
             "Pièce d'identité (verso)",
             "Permis de conduire",
             "Carte grise",
             "Attestation assurance",
             "KBIS / INSEE",
             "RIB"
           ].map((doc) => (
             <div key={doc} className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
               <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
               {doc}
             </div>
           ))}
         </div>
         <p className="text-xs text-muted-foreground mt-3">
           Stockage: Supabase Storage bucket <code>driver-documents/{'{driver_id}'}/*</code>
         </p>
       </CardContent>
     </Card>
   </div>
 );
 
 const ObjectivesSection = () => (
   <div className="space-y-4">
     <Card>
       <CardHeader>
         <CardTitle className="text-lg flex items-center gap-2">
           <Target className="w-5 h-5 text-purple-500" />
           Structure des Objectifs
         </CardTitle>
       </CardHeader>
       <CardContent>
         <div className="space-y-4">
           <div>
             <h4 className="font-medium mb-2">Table: driver_objectives</h4>
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
               {[
                 "revenue_target",
                 "courses_target", 
                 "new_clients_target",
                 "hours_target",
                 "km_target",
                 "rating_target"
               ].map((field) => (
                 <div key={field} className="p-2 bg-muted rounded font-mono text-xs">
                   {field}
                 </div>
               ))}
             </div>
           </div>
 
           <div>
             <h4 className="font-medium mb-2">Périodes Supportées</h4>
             <div className="flex flex-wrap gap-2">
               <Badge>daily</Badge>
               <Badge variant="secondary">weekly</Badge>
               <Badge variant="outline">monthly</Badge>
               <Badge className="bg-purple-600">yearly</Badge>
             </div>
           </div>
         </div>
       </CardContent>
     </Card>
 
     <Card>
       <CardHeader>
         <CardTitle className="text-lg">Logique de Pondération Journalière</CardTitle>
         <CardDescription>
           Les objectifs quotidiens sont calculés avec des coefficients par jour
         </CardDescription>
       </CardHeader>
       <CardContent>
         <div className="overflow-x-auto">
           <table className="w-full text-sm">
             <thead>
               <tr className="border-b">
                 <th className="text-left py-2">Jour</th>
                 <th className="text-left py-2">Coefficient</th>
                 <th className="text-left py-2">Explication</th>
               </tr>
             </thead>
             <tbody>
               <tr className="border-b"><td className="py-2">Lundi</td><td className="py-2 font-mono">0.70</td><td className="py-2 text-muted-foreground">Jour calme</td></tr>
               <tr className="border-b"><td className="py-2">Mardi</td><td className="py-2 font-mono">0.85</td><td className="py-2 text-muted-foreground">-</td></tr>
               <tr className="border-b"><td className="py-2">Mercredi</td><td className="py-2 font-mono">0.90</td><td className="py-2 text-muted-foreground">-</td></tr>
               <tr className="border-b"><td className="py-2">Jeudi</td><td className="py-2 font-mono">1.00</td><td className="py-2 text-muted-foreground">Référence</td></tr>
               <tr className="border-b"><td className="py-2">Vendredi</td><td className="py-2 font-mono text-green-600">1.15</td><td className="py-2 text-muted-foreground">Jour fort</td></tr>
               <tr className="border-b"><td className="py-2">Samedi</td><td className="py-2 font-mono text-green-600">1.20</td><td className="py-2 text-muted-foreground">Jour très fort</td></tr>
               <tr><td className="py-2">Dimanche</td><td className="py-2 font-mono text-green-600">1.20</td><td className="py-2 text-muted-foreground">Jour très fort</td></tr>
             </tbody>
           </table>
         </div>
         <div className="mt-4 p-3 bg-muted rounded text-sm font-mono">
           dailyTarget = (weeklyGoal × dayWeight) / totalWeeklyWeight
         </div>
       </CardContent>
     </Card>
 
     <Card>
       <CardHeader>
         <CardTitle className="text-lg">Modification Post-Onboarding</CardTitle>
         <CardDescription>
           ObjectivesEditor.tsx - Sections modifiables indépendamment
         </CardDescription>
       </CardHeader>
       <CardContent>
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
           {[
             { name: "CA Mensuel", desc: "Modifier l'objectif de revenus" },
             { name: "Clients Cibles", desc: "Nombre de clients fidèles" },
             { name: "Ratio Indépendance", desc: "% SoloCab vs Plateformes" },
             { name: "Planning", desc: "Jours travaillés et pondération" },
             { name: "Niveau Coaching", desc: "Intensité des notifications" },
           ].map((section) => (
             <div key={section.name} className="p-3 border rounded">
               <p className="font-medium">{section.name}</p>
               <p className="text-sm text-muted-foreground">{section.desc}</p>
             </div>
           ))}
         </div>
       </CardContent>
     </Card>
   </div>
 );
 
 const TrackingSection = () => (
   <div className="space-y-4">
     <Card>
       <CardHeader>
         <CardTitle className="text-lg flex items-center gap-2">
           <BarChart3 className="w-5 h-5 text-blue-500" />
           Suivi Quotidien
         </CardTitle>
       </CardHeader>
       <CardContent>
         <div className="space-y-4">
           <div>
             <h4 className="font-medium mb-2">Sources de Données</h4>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
               <div className="p-3 border rounded bg-green-500/10 border-green-500/30">
                 <Badge className="bg-green-600 mb-2">Automatique</Badge>
                 <p className="font-medium">SoloCab</p>
                 <p className="text-sm text-muted-foreground">CA, courses, clients, km</p>
               </div>
               <div className="p-3 border rounded">
                 <Badge variant="outline" className="mb-2">Manuel</Badge>
                 <p className="font-medium">Plateformes</p>
                 <p className="text-sm text-muted-foreground">Uber, Bolt, Heetch...</p>
               </div>
               <div className="p-3 border rounded">
                 <Badge variant="outline" className="mb-2">Manuel</Badge>
                 <p className="font-medium">Travail</p>
                 <p className="text-sm text-muted-foreground">Heures, km parcourus</p>
               </div>
             </div>
           </div>
 
           <div>
             <h4 className="font-medium mb-2">Table: driver_daily_entries</h4>
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
               {[
                 "entry_date",
                 "platform_id",
                 "is_solocab",
                 "revenue",
                 "courses_count",
                 "new_clients_count",
                 "hours_worked",
                 "km_driven"
               ].map((field) => (
                 <div key={field} className="p-2 bg-muted rounded font-mono text-xs">
                   {field}
                 </div>
               ))}
             </div>
           </div>
         </div>
       </CardContent>
     </Card>
 
     <Card>
       <CardHeader>
         <CardTitle className="text-lg">Rapports Automatisés</CardTitle>
       </CardHeader>
       <CardContent>
         <div className="space-y-3">
           <div className="flex items-center justify-between p-3 border rounded">
             <div className="flex items-center gap-3">
               <CheckCircle className="w-5 h-5 text-green-500" />
               <div>
                 <p className="font-medium">Rapport Quotidien</p>
                 <p className="text-sm text-muted-foreground">CRON 7h00 Paris - send-daily-report</p>
               </div>
             </div>
             <Badge className="bg-green-600">Actif</Badge>
           </div>
           <div className="flex items-center justify-between p-3 border rounded opacity-60">
             <div className="flex items-center gap-3">
               <XCircle className="w-5 h-5 text-red-500" />
               <div>
                 <p className="font-medium">Rapport Hebdomadaire</p>
                 <p className="text-sm text-muted-foreground">Prévu: CRON Lundi 7h</p>
               </div>
             </div>
             <Badge variant="destructive">Non implémenté</Badge>
           </div>
           <div className="flex items-center justify-between p-3 border rounded opacity-60">
             <div className="flex items-center gap-3">
               <XCircle className="w-5 h-5 text-red-500" />
               <div>
                 <p className="font-medium">Rapport Mensuel</p>
                 <p className="text-sm text-muted-foreground">Prévu: 1er du mois</p>
               </div>
             </div>
             <Badge variant="destructive">Non implémenté</Badge>
           </div>
           <div className="flex items-center justify-between p-3 border rounded opacity-60">
             <div className="flex items-center gap-3">
               <XCircle className="w-5 h-5 text-red-500" />
               <div>
                 <p className="font-medium">Rapport Annuel</p>
                 <p className="text-sm text-muted-foreground">Bilan fiscal</p>
               </div>
             </div>
             <Badge variant="destructive">Non implémenté</Badge>
           </div>
         </div>
       </CardContent>
     </Card>
 
     <Card>
       <CardHeader>
         <CardTitle className="text-lg">Logique de Coaching</CardTitle>
       </CardHeader>
       <CardContent>
         <div className="space-y-2 text-sm">
           <div className="flex items-center gap-3 p-2 bg-green-500/10 rounded">
             <span className="text-lg">🎉</span>
             <div>
               <span className="font-medium">≥ 120%</span>
               <span className="text-muted-foreground ml-2">Excellente journée !</span>
             </div>
           </div>
           <div className="flex items-center gap-3 p-2 bg-green-500/10 rounded">
             <span className="text-lg">✅</span>
             <div>
               <span className="font-medium">100-119%</span>
               <span className="text-muted-foreground ml-2">Objectif atteint !</span>
             </div>
           </div>
           <div className="flex items-center gap-3 p-2 bg-yellow-500/10 rounded">
             <span className="text-lg">📈</span>
             <div>
               <span className="font-medium">80-99%</span>
               <span className="text-muted-foreground ml-2">Presque !</span>
             </div>
           </div>
           <div className="flex items-center gap-3 p-2 bg-orange-500/10 rounded">
             <span className="text-lg">💪</span>
             <div>
               <span className="font-medium">50-79%</span>
               <span className="text-muted-foreground ml-2">Journée difficile</span>
             </div>
           </div>
           <div className="flex items-center gap-3 p-2 bg-red-500/10 rounded">
             <span className="text-lg">⚠️</span>
             <div>
               <span className="font-medium">&lt; 50%</span>
               <span className="text-muted-foreground ml-2">En dessous des attentes</span>
             </div>
           </div>
         </div>
       </CardContent>
     </Card>
   </div>
 );
 
 const TechSection = () => (
   <div className="space-y-4">
     <Card>
       <CardHeader>
         <CardTitle className="text-lg flex items-center gap-2">
           <Database className="w-5 h-5" />
           Schéma Base de Données
         </CardTitle>
       </CardHeader>
       <CardContent>
         <pre className="text-xs font-mono bg-muted p-4 rounded overflow-x-auto whitespace-pre">
 {`┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
 │   auth.users    │────▶│    profiles     │────▶│   user_roles    │
 └─────────────────┘     └─────────────────┘     └─────────────────┘
          │                       │
          ▼                       ▼
 ┌─────────────────┐     ┌─────────────────┐
 │     drivers     │◀────│     clients     │
 └─────────────────┘     └─────────────────┘
          │
          ├──────────────────────────────────────┐
          ▼                                      ▼
 ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────┐
 │driver_objectives│     │driver_work_     │     │driver_daily_entries │
 │                 │     │schedules        │     │                     │
 └─────────────────┘     └─────────────────┘     └─────────────────────┘
          │                       │                        │
          └───────────────────────┴────────────────────────┘
                                  │
                                  ▼
                     ┌─────────────────────────┐
                     │ driver_coaching_messages│
                     └─────────────────────────┘`}
         </pre>
       </CardContent>
     </Card>
 
     <Card>
       <CardHeader>
         <CardTitle className="text-lg">Colonnes Clés - Table drivers</CardTitle>
       </CardHeader>
       <CardContent>
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           <div>
             <h4 className="font-medium text-sm mb-2 text-muted-foreground">Statut & Progression</h4>
             <div className="space-y-1 font-mono text-xs">
               <div className="p-2 bg-muted rounded">status</div>
               <div className="p-2 bg-muted rounded">onboarding_completed</div>
               <div className="p-2 bg-muted rounded">current_onboarding_step</div>
               <div className="p-2 bg-muted rounded">objectives_data (JSONB)</div>
             </div>
           </div>
           <div>
             <h4 className="font-medium text-sm mb-2 text-muted-foreground">Tarification</h4>
             <div className="space-y-1 font-mono text-xs">
               <div className="p-2 bg-muted rounded">base_fare / per_km_rate / hourly_rate</div>
               <div className="p-2 bg-muted rounded">evening_surcharge</div>
               <div className="p-2 bg-muted rounded">weekend_surcharge</div>
               <div className="p-2 bg-muted rounded">airport_surcharge</div>
             </div>
           </div>
           <div>
             <h4 className="font-medium text-sm mb-2 text-muted-foreground">Paiement</h4>
             <div className="space-y-1 font-mono text-xs">
               <div className="p-2 bg-muted rounded">stripe_account_id</div>
               <div className="p-2 bg-muted rounded">stripe_onboarding_complete</div>
             </div>
           </div>
           <div>
             <h4 className="font-medium text-sm mb-2 text-muted-foreground">Compteurs</h4>
             <div className="space-y-1 font-mono text-xs">
               <div className="p-2 bg-muted rounded">total_clients / total_courses</div>
               <div className="p-2 bg-muted rounded">total_revenue / average_rating</div>
             </div>
           </div>
         </div>
       </CardContent>
     </Card>
 
     <Card>
       <CardHeader>
         <CardTitle className="text-lg">Hooks React Principaux</CardTitle>
       </CardHeader>
       <CardContent>
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
           {[
             { hook: "useDriverObjectives", desc: "CRUD objectifs" },
             { hook: "useDriverDailyEntries", desc: "Entrées quotidiennes" },
             { hook: "useDriver", desc: "Données chauffeur" },
             { hook: "useDriverStats", desc: "Statistiques" },
           ].map((item) => (
             <div key={item.hook} className="p-2 border rounded">
               <p className="font-mono text-xs text-blue-600">{item.hook}</p>
               <p className="text-muted-foreground">{item.desc}</p>
             </div>
           ))}
         </div>
       </CardContent>
     </Card>
   </div>
 );
 
 const ImprovementsSection = () => (
   <div className="space-y-4">
     <Card>
       <CardHeader>
         <CardTitle className="text-lg flex items-center gap-2">
           <AlertTriangle className="w-5 h-5 text-red-500" />
           Points Critiques (🔴)
         </CardTitle>
       </CardHeader>
       <CardContent>
         <div className="space-y-3">
           {[
             { id: "C1", problem: "Rapports hebdo/mensuel/annuel non implémentés", impact: "Suivi long terme impossible", solution: "Créer Edge Functions + CRON" },
             { id: "C2", problem: "Pas de dashboard analytics chauffeur", impact: "Pas de vision globale", solution: "Créer page dédiée avec graphiques" },
             { id: "C3", problem: "Coaching IA basique", impact: "Messages génériques", solution: "Intégrer Lovable AI pour analyse" },
           ].map((item) => (
             <div key={item.id} className="p-3 border border-red-500/30 bg-red-500/10 rounded">
               <div className="flex items-center gap-2 mb-2">
                 <Badge variant="destructive">{item.id}</Badge>
                 <span className="font-medium">{item.problem}</span>
               </div>
               <p className="text-sm"><span className="text-muted-foreground">Impact:</span> {item.impact}</p>
               <p className="text-sm"><span className="text-muted-foreground">Solution:</span> {item.solution}</p>
             </div>
           ))}
         </div>
       </CardContent>
     </Card>
 
     <Card>
       <CardHeader>
         <CardTitle className="text-lg flex items-center gap-2">
           <AlertTriangle className="w-5 h-5 text-orange-500" />
           Points Importants (🟠)
         </CardTitle>
       </CardHeader>
       <CardContent>
         <div className="space-y-3">
           {[
             { id: "I1", problem: "Saisie plateformes 100% manuelle", solution: "API Uber/Bolt si possible" },
             { id: "I2", problem: "Pas d'historique visible des rapports", solution: "Créer table driver_reports" },
             { id: "I3", problem: "Objectifs non liés aux courses réelles", solution: "Sync auto à chaque course terminée" },
             { id: "I4", problem: "Planning non utilisé pour notifications", solution: "Alertes si pas d'activité jour prévu" },
           ].map((item) => (
             <div key={item.id} className="p-3 border border-orange-500/30 bg-orange-500/10 rounded">
               <div className="flex items-center gap-2 mb-1">
                 <Badge className="bg-orange-500">{item.id}</Badge>
                 <span className="font-medium">{item.problem}</span>
               </div>
               <p className="text-sm"><span className="text-muted-foreground">Solution:</span> {item.solution}</p>
             </div>
           ))}
         </div>
       </CardContent>
     </Card>
 
     <Card>
       <CardHeader>
         <CardTitle className="text-lg flex items-center gap-2">
           <Lightbulb className="w-5 h-5 text-green-500" />
           Recommandations
         </CardTitle>
       </CardHeader>
       <CardContent>
         <Tabs defaultValue="short">
           <TabsList>
             <TabsTrigger value="short">Court terme</TabsTrigger>
             <TabsTrigger value="medium">Moyen terme</TabsTrigger>
             <TabsTrigger value="long">Long terme</TabsTrigger>
           </TabsList>
           <TabsContent value="short" className="mt-4 space-y-2">
             <div className="p-3 border rounded">
               <p className="font-medium">1. Implémenter rapport hebdomadaire</p>
               <p className="text-sm text-muted-foreground">CRON tous les lundis 7h</p>
             </div>
             <div className="p-3 border rounded">
               <p className="font-medium">2. Créer dashboard analytics chauffeur</p>
               <p className="text-sm text-muted-foreground">Graphiques progression 30/90 jours</p>
             </div>
             <div className="p-3 border rounded">
               <p className="font-medium">3. Améliorer coaching IA</p>
               <p className="text-sm text-muted-foreground">Utiliser Lovable AI (Gemini)</p>
             </div>
           </TabsContent>
           <TabsContent value="medium" className="mt-4 space-y-2">
             <div className="p-3 border rounded">
               <p className="font-medium">1. Rapport mensuel automatisé</p>
               <p className="text-sm text-muted-foreground">Export PDF pour comptabilité</p>
             </div>
             <div className="p-3 border rounded">
               <p className="font-medium">2. Notifications intelligentes</p>
               <p className="text-sm text-muted-foreground">Push mobile, rappels planning</p>
             </div>
             <div className="p-3 border rounded">
               <p className="font-medium">3. Historique des rapports</p>
               <p className="text-sm text-muted-foreground">Consultation et comparaisons</p>
             </div>
           </TabsContent>
           <TabsContent value="long" className="mt-4 space-y-2">
             <div className="p-3 border rounded">
               <p className="font-medium">1. API Plateformes externes</p>
               <p className="text-sm text-muted-foreground">Intégration Uber/Bolt API</p>
             </div>
             <div className="p-3 border rounded">
               <p className="font-medium">2. Prédictions IA</p>
               <p className="text-sm text-muted-foreground">Prévision CA, patterns clients</p>
             </div>
             <div className="p-3 border rounded">
               <p className="font-medium">3. Gamification complète</p>
               <p className="text-sm text-muted-foreground">Badges, niveaux, classements</p>
             </div>
           </TabsContent>
         </Tabs>
       </CardContent>
     </Card>
   </div>
 );
 
 export default AdminDocumentation;