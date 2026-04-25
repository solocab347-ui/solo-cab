
## Contexte vérifié dans le code

### 1. Facture guest = `.txt` basique (confirmé)
`src/pages/GuestBookingTracking.tsx` (lignes 374–407) génère un `Blob` `text/plain` avec quelques lignes au lieu d'utiliser `generateUnifiedInvoicePDF` (qui est utilisé par `DriverFacturesList`, `ClientFacturesList`, `ClientCoursesList`, `CoursesList`).

### 2. Le RPC `get_guest_booking_by_token` ne retourne PAS les métadonnées légales
Migration la plus récente (`20260415145551`) : retourne seulement `facture_id/number/amount/payment_status` mais **pas** `siret`, `siren`, `tva_number`, `billing_address`, `tva_rate`, `tva_amount`, `solocab_fee_amount`, `stripe_fee_amount`, `net_amount_to_driver`, `airport_fee`, etc. → impossible de produire la même facture que côté chauffeur sans nouveau RPC.

### 3. Client inscrit (`/suivi-course/:id` = `ClientRideTracking.tsx`)
Aucun bouton "Télécharger la facture" sur la page de tracking en temps réel. Le téléchargement existe seulement dans `ClientFacturesList` (espace facturation), donc même problème UX que guest tant que la course est encore "fraîche".

### 4. GPS arrière-plan : confirmé en base
Audit précédent : drivers `online + is_available_now=true` avec `last_location_update` vieux de plusieurs jours = invisibles dans `find_nearby_drivers` (filtre 2 min). Pas de réconciliation serveur, pas de boot receiver Android, pas de watchdog JS quand le foreground service Android cesse silencieusement d'émettre.

---

## Plan d'implémentation

### Partie A — Factures unifiées

**A1. Nouveau RPC `get_guest_invoice_data(_token text)`** (SECURITY DEFINER, GRANT anon + authenticated)
Retourne tout ce que `generateUnifiedInvoicePDF` attend en variant `client` :
- Course complète : `pickup_address`, `destination_address`, `scheduled_date`, `passengers_count`, `distance_km`, `duration_minutes`, `guest_name`, `guest_email`, `guest_phone`
- Facture complète : `id`, `invoice_number`, `invoice_number_generated`, `amount`, `payment_method`, `payment_status`, `created_at`, `tva_rate`, `tva_amount`, `airport_fee`, `distance_km`, `promo_code`, `discount_amount`, `solocab_fee_amount`, `stripe_fee_amount`, `total_fees_amount`
- Devis (si lié) : `amount`, `base_price`, `airport_fee`, `tva_rate`, `tva_amount`, `quote_number`, `distance_price`
- Driver : `company_name`, `company_address`, `siret`, `siren`, `tva_number`, `profiles.full_name` (non masqué pour la facture, légalement requis), `profiles.email`, `profiles.phone`
- Client : NULL pour guest (le `guest_name/email/phone` est dans course)

Retourne sous forme JSON pour éviter la prolifération de colonnes.

**A2. Refactor `GuestBookingTracking.tsx` `handleDownloadInvoice`**
- Appeler `supabase.rpc('get_guest_invoice_data', { _token: token })`
- Construire l'objet `UnifiedInvoiceInput` avec `variant: 'client'`
- Appeler `generateUnifiedInvoicePDF(input, { download: true })`
- Garder un fallback toast si le RPC échoue
- Supprimer toute la logique Blob `.txt`

**A3. Bouton "Télécharger la facture" sur `ClientRideTracking.tsx`** (clients inscrits, exclusifs ou non)
- Affiché uniquement quand `course.status === 'completed'` ET qu'une facture existe pour `course.id`
- Récupère la facture via `supabase.from('factures').select(...).eq('course_id', id).maybeSingle()` avec joints `courses`, `drivers`, `clients` comme `ClientFacturesList`
- Appelle `generateUnifiedInvoicePDF` avec `variant: 'client'`

**A4. Test rapide** : ajouter 1–2 cas dans `generateUnifiedInvoicePDF.test.ts` couvrant le payload guest issu du nouveau RPC (présence/absence SIRET, devis sans facture, etc.).

---

### Partie B — Fiabilité GPS arrière-plan (chauffeur trouvable même app fermée)

**B1. Réconciliation serveur (résout 80% du symptôme immédiatement)**
Migration SQL :
- Fonction `reconcile_stale_drivers()` qui passe en `offline` + `is_available_now=false` tout driver avec `last_location_update < now() - interval '15 minutes'` et `driver_status IN ('online','assigned')` mais SANS course active.
- Tâche `pg_cron` toutes les 2 minutes.
- Trigger `BEFORE UPDATE` sur `drivers` qui force `driver_status='offline'` si l'update n'inclut pas `last_location_update` ET que la dernière > 15min.

**B2. Élargir la fenêtre dans `find_nearby_drivers`**
- Course immédiate : 3 min (au lieu de 2 min) pour absorber les jitters Android
- Réservation : 10 min
- Retourner `gps_age_seconds` pour debugging dans l'UI

**B3. Watchdog JS dans `useDriverBackgroundGPS.ts`**
- `setInterval` 30 s qui vérifie `Date.now() - lastFixRef`
- Si > 90 s ET `enabled === true` : `removeWatcher` + `addWatcher` (re-arm)
- Log dans la console + toast discret pour diagnostic

**B4. Heartbeat serveur garanti**
Le 25 s heartbeat existe déjà mais s'exécute dans le JS. Compléter par : si l'app est en background ET le watcher natif est silencieux > 90 s, écrire un fix factice via `lastFix` du `nativeGpsBus` pour maintenir `last_location_update` frais (au lieu de laisser le serveur reconciler en offline).

**B5. Boot Receiver Android (persistance après reboot/kill mémoire)**
- Java `BootReceiver` qui écoute `BOOT_COMPLETED` + `MY_PACKAGE_REPLACED`
- Démarre le foreground service `BackgroundGeolocationService` si un driverId est en cache (SharedPreferences écrites côté JS quand le tracking démarre)
- Permission `RECEIVE_BOOT_COMPLETED` déjà présente dans `AndroidManifest.xml` ✅

**B6. Edge function `ping-driver-gps` (réveil silencieux via FCM data-only)**
- Trigger côté serveur : `pg_cron` toutes les 5 min repère drivers `online` avec `last_location_update` entre 3 et 10 min
- Envoie un FCM data-only `{ "type": "gps_ping" }` qui réveille le service via le `SoloCabFirebaseMessagingService`
- Le service force un fix immédiat puis update la BDD

**B7. UI diagnostic enrichi (`GpsDiagnostic.tsx`)**
- Nouveau bouton "Tester ma visibilité" : appelle `find_nearby_drivers` autour de la position actuelle du driver et vérifie que son propre id apparaît
- Affiche `gps_age_seconds` retourné par la RPC pour transparence

---

## Ordre d'exécution suggéré

1. **A1 + A2 + A3** (factures unifiées guest + client inscrit) — résout immédiatement l'écart visible sur tes screenshots
2. **B1 + B2** (réconciliation serveur + fenêtre élargie) — résout les zombies sans rebuild APK
3. **B3 + B4** (watchdog JS + heartbeat) — code TS, push immédiat
4. **B5 + B6 + B7** (boot receiver + ping FCM + diag UI) — nécessite rebuild APK

## Notes de compatibilité

- Le générateur `generateUnifiedInvoicePDF` accepte déjà `variant: 'client'` → aucun changement côté générateur.
- Le RPC `get_guest_booking_by_token` reste inchangé (utilisé par tracking temps réel) ; on ajoute un RPC distinct `get_guest_invoice_data` pour ne pas casser les types TypeScript existants.
- `pg_cron` doit être activé sur le projet Cloud (à vérifier au moment de l'implémentation, sinon migration `CREATE EXTENSION IF NOT EXISTS pg_cron`).
- Tous les changements respectent les règles mémoire : `security_invoker`, `search_path = public`, masquage de noms côté tracking conservé MAIS pas pour la facture (mention légale obligatoire = nom complet du chauffeur/société).

## Livrables attendus

| # | Fichier | Action |
|---|---------|--------|
| A1 | `supabase/migrations/<ts>_get_guest_invoice_data.sql` | nouveau |
| A2 | `src/pages/GuestBookingTracking.tsx` | refactor handleDownloadInvoice |
| A3 | `src/pages/ClientRideTracking.tsx` | ajout bouton + handler |
| A4 | `src/lib/invoice/generateUnifiedInvoicePDF.test.ts` | tests guest |
| B1 | `supabase/migrations/<ts>_reconcile_stale_drivers.sql` | nouveau + cron |
| B2 | `supabase/migrations/<ts>_find_nearby_drivers_window.sql` | update RPC |
| B3 | `src/hooks/useDriverBackgroundGPS.ts` | watchdog |
| B4 | `src/lib/nativeGpsBus.ts` + hook | heartbeat fallback |
| B5 | `android/app/src/main/java/.../BootReceiver.java` | nouveau |
| B5 | `android/app/src/main/AndroidManifest.xml` | déclarer receiver |
| B6 | `supabase/functions/ping-driver-gps/index.ts` | nouvelle edge fn + cron |
| B7 | `src/components/diagnostic/GpsDiagnostic.tsx` | bouton "tester visibilité" |

---

**Approuve ce plan pour que je passe en mode implémentation et exécute tout d'une traite.** Si tu préfères une exécution séquentielle (factures d'abord, GPS ensuite), précise-le.
