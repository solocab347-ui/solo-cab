# SoloCab — Privacy & RGPD

## 1. Responsable de traitement

SoloCab est responsable du traitement des données personnelles des clients et chauffeurs.

## 2. Catégories de données traitées

| Catégorie | Exemple | Base légale | Rétention |
|---|---|---|---|
| Identité | nom, prénom, email, téléphone | Contrat | Vie compte + 3 ans |
| Géolocalisation | GPS chauffeur live, trajets | Contrat | 13 mois (trajets), pas d'historique GPS brut |
| Paiement | last4 carte, Stripe customer id | Contrat / obligation légale | 13 mois (carte) / 10 ans (factures) |
| Documents pro | KBIS, carte pro VTC | Obligation légale | Durée activité + 3 ans |
| Communications | chat course, appels VoIP métadonnées | Intérêt légitime | 90 jours |
| Logs sécurité | IP, user agent | Intérêt légitime | 12 mois |

## 3. Droits utilisateurs

| Droit | Implémentation |
|---|---|
| Accès | Edge function `gdpr-export-data` → JSON complet (Vague 3) |
| Rectification | Pages profil client/chauffeur |
| Effacement | Edge function `gdpr-delete-account` (anonymise factures, supprime PII) |
| Portabilité | Export JSON inclus dans accès |
| Opposition | Désabonnement marketing (toggle profil) |
| Limitation | Désactivation compte (soft delete) avant suppression |

## 4. Minimisation

- Géoloc chauffeur stockée **dernière position seulement** (pas d'historique brut)
- Numéros de téléphone masqués entre client/chauffeur (VoIP anonymisée)
- Adresses précises masquées dans listes publiques (`addressPrivacy.ts`)
- Carte client : seulement `last4`, `brand`, `exp` (jamais le PAN)

## 5. Transferts hors UE

- Stripe : USA — clauses contractuelles types
- Supabase : UE (région `eu-west`)
- Mapbox : USA — pas de PII transmise (uniquement coordonnées)
- Sentry : UE
- Resend : USA — clauses contractuelles types

## 6. Consentement

- Inscription : checkbox CGU + politique de confidentialité (obligatoire)
- Cookies : bandeau pour analytics non essentiels
- Marketing : opt-in séparé

## 7. Sous-traitants (registre Art. 30)

| Sous-traitant | Service | Données |
|---|---|---|
| Supabase | Hosting + DB + Auth | Toutes |
| Stripe | Paiements | Identité + paiement |
| Mapbox | Cartographie | Coordonnées |
| Resend | Email | Email + contenu |
| Twilio | SMS (si activé) | Téléphone |
| Sentry | Monitoring | Logs filtrés |

## 8. Notification violation

Procédure : voir `INCIDENT_RESPONSE.md`. CNIL notifiée < 72h si risque pour les droits.

## 9. DPO

À désigner si > 250 utilisateurs traités ou traitement à grande échelle.
