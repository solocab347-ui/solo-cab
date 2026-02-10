# Objectifs, Planning et Coaching IA

## Système d'objectifs multi-KPI

Les chauffeurs définissent des objectifs sur 4 périodes :

| Période | KPIs suivis |
|---------|------------|
| Quotidien | CA, courses, nouveaux clients, heures, KM |
| Hebdomadaire | Idem, agrégé |
| Mensuel | Idem + objectif rating |
| Annuel | Idem, cibles stratégiques |

### Calcul des cibles
- Objectifs financiers arrondis au multiple de **5€** ou **500€**
- Suggestion dynamique de croissance : **+25%** (minimum +500€) basée sur le CA actuel

---

## Planning hebdomadaire

### Configuration par jour
- Jour travaillé / jour de repos
- Heures de début et fin
- Pause (début/fin)
- Cibles spécifiques par jour (heures, CA, courses, clients)
- Notes personnelles

### Templates
Des modèles préconfigurés permettent de démarrer rapidement.

### Copie hebdomadaire
Outil `WeekCopier` pour répliquer les schémas d'une semaine à l'autre.

---

## Plateformes externes

Les chauffeurs peuvent tracker leur activité sur plusieurs plateformes :

| Plateforme | Icône |
|------------|-------|
| Uber | car |
| Bolt | zap |
| Heetch | music |
| Marcel | briefcase |
| FreeNow | navigation |
| LeCab | crown |
| Kapten | star |
| Clients directs | users |

### Entrées journalières (`DriverDailyEntry`)
Pour chaque jour et plateforme :
- Revenus, nombre de courses, nouveaux clients
- Heures travaillées, KM parcourus
- Notes

---

## Coaching IA (Alex)

### Philosophie
Le coach est **proactif mais non redondant**. Les rappels de définition d'objectifs sont désactivés sur le dashboard (données obligatoires dès l'onboarding). Le coach se concentre sur :
- Suivi quotidien
- Comparaison performances réelles (SoloCab + externe) vs cibles
- Encouragement à l'indépendance

### Types de messages
| Type | Description |
|------|-------------|
| `suggestion` | Conseil actionnable |
| `alert` | Alerte sur un KPI en retard |
| `motivation` | Encouragement |
| `tip` | Astuce opérationnelle |
| `milestone` | Célébration d'un palier atteint |

### Composants
- **IntelligentCoach** : Analyse contextuelle des performances
- **MilestoneTracker** : Suivi des paliers et célébrations
- **DailyMotivation** : Message quotidien personnalisé
- **ProactiveCoachPopup** : Messages contextuels non intrusifs
- **PartnershipPromotion** : Promotion de l'indépendance vs plateformes
- **TodayStatusBanner** : Résumé temps réel de la journée en cours
