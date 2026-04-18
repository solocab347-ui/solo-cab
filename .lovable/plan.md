# 🚀 Refonte Performances & UX SoloCab — Plan complet

## Objectif
Réduire le **Time-To-Interactive** de ~4s à <1s sur tous les dashboards (admin, chauffeur, client, guest), éliminer les HTTP 500 actuels, et offrir des transitions fluides type "app native premium".

---

## 📦 PHASE 1 — Fondations DB & Cache (1 message)
**Impact : élimine les timeouts SQL, divise par 3 les requêtes au boot**

### 1.1 Indexes SQL critiques
- `profiles(id)` — actuellement timeout HTTP 500
- `factures(client_id, payment_status)` — timeout HTTP 500
- `courses(client_id, status, scheduled_date)`
- `notifications(user_id, created_at DESC)`
- `course_ratings(client_id, status, rating_direction)`
- `clients(user_id)`, `user_roles(user_id)`
- `push_subscriptions(user_id, is_active)`
- `client_driver_blocks(client_id, blocked_by)`
- `devis(client_id, status, valid_until)`

### 1.2 Cache React Query global
- `staleTime: 30s` sur queries quasi-statiques
- `staleTime: 5min` sur metadata
- Désactiver `refetchOnWindowFocus` partout sauf temps réel

### 1.3 Auth context unifié
- 1 seul `supabase.auth.getUser()` partagé via `useAuth()`

### 1.4 Parallélisation boot dashboard
- `Promise.all` pour requêtes indépendantes

---

## 📦 PHASE 2 — Code Splitting & Bundle (2-3 messages)

### 2.1 Lazy-load par onglet
- ClientDashboard, DriverDashboard, AdminDashboard

### 2.2 Découpage des fichiers monstres
- CoursesList (3576 l), PartnerPaymentsManager (1494 l), DriverPlanning (1412 l), DriverDevisList (1361 l), OnboardingGoalsStep (1244 l)

### 2.3 Suspense + Skeletons
- Remplacer "Chargement..." par `<Skeleton />`

### 2.4 Lazy-load Mapbox

---

## 📦 PHASE 3 — Transitions & UX premium (2 messages)

### 3.1 Page transitions Framer Motion
- Fade + translation 150-200ms entre routes
- AnimatePresence sur modals/drawers

### 3.2 Optimistic UI
- Notes, favoris, annulations, notifications lues

### 3.3 Préfetch intelligent
- React Query `prefetchQuery` au login

### 3.4 Skeletons contextuels par dashboard

---

## 📦 PHASE 4 — Realtime, GPS & Service Worker (1-2 messages)

### 4.1 Centralisation Realtime
- 1 `RealtimeProvider` global, déduplication channels

### 4.2 GPS chauffeur optimisé
- Throttle 5s min, pause si onglet caché, batch updates

### 4.3 Virtualization listes longues
- `react-window` sur listes >100 items

### 4.4 Service Worker assets
- Cache fonts/images/JS, stale-while-revalidate

---

## 📊 Résultats attendus

| Métrique | Avant | Après |
|---|---|---|
| TTI mobile 4G | ~4s | <1s |
| Bundle initial | ~1.2MB | ~700KB |
| Requêtes boot | 15+ | 4-5 |
| HTTP 500 | Présents | 0 |
| Transitions | Saccadées | Fluides 150ms |

---

## 🗓️ Ordre d'exécution

1. **Msg 1** : Phase 1 (indexes + cache + auth + parallélisation)
2. **Msg 2** : Phase 2.1 + 2.3 (lazy tabs + skeletons)
3. **Msg 3** : Phase 2.2 (découpage fichiers)
4. **Msg 4** : Phase 3.1 + 3.4 (transitions + skeletons)
5. **Msg 5** : Phase 3.2 + 3.3 (optimistic UI + préfetch)
6. **Msg 6** : Phase 4 (realtime + GPS + virtualization + SW)

Chaque phase est indépendante et réversible.
