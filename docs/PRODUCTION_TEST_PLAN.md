# Plan de tests multi-device — SoloCab production readiness

> Objectif : valider la stabilité réelle du système de courses sur les principales
> familles d'appareils Android et iOS avant ouverture aux chauffeurs réels.
> Tous les scénarios doivent être exécutés **sur un device physique**, app **installée**
> (pas dev server), avec compte chauffeur réel et compte client réel.

## Devices cibles

| # | Device                    | OS       | Particularité technique testée                          |
|---|---------------------------|----------|---------------------------------------------------------|
| 1 | **Samsung Galaxy S22+**   | Android 14 | Référence "vanilla" Samsung, OneUI moderne            |
| 2 | **Xiaomi Redmi Note 12**  | Android 13 | MIUI / HyperOS — battery saver agressif, kill apps    |
| 3 | **Oppo Reno 8**           | Android 13 | ColorOS — restrictions arrière-plan agressives        |
| 4 | **Google Pixel 7a**       | Android 14 | Android stock, Doze mode strict                        |
| 5 | **iPhone 13**             | iOS 17     | Background location iOS, APNs, NSLocationAlways       |

## Pré-requis

- Sentry DSN configuré (`VITE_SENTRY_DSN`) pour capturer les crashs natifs
- Dashboard admin `/admin/observability` ouvert sur un autre poste
- 1 testeur conducteur + 1 testeur client par scénario
- Comptes réels en mode "live" (pas guest)
- Permissions **Always Allow Location** + **Désactiver l'optimisation batterie**
  pour SoloCab sur chaque device

## Matrice de scénarios

Chaque scénario doit passer sur **les 5 devices** avant validation production.

### Bloc A — Réception courses

| ID | Scénario | Critère de succès |
|----|----------|-------------------|
| A1 | Course immédiate, app foreground | Overlay < 2 s après création (p95) |
| A2 | Course immédiate, app background 1 min | Overlay au resume < 3 s |
| A3 | Course immédiate, app background 30 min | Notification reçue + overlay au resume |
| A4 | Course immédiate, écran verrouillé | Notification full-screen visible |
| A5 | Course immédiate, app swipée (Xiaomi/Oppo) | Reçue via push (FCM) en < 10 s |
| A6 | Réservation programmée H+1 | Présente dans l'agenda du chauffeur |

### Bloc B — Acceptation & synchro

| ID | Scénario | Critère |
|----|----------|---------|
| B1 | 2 chauffeurs reçoivent même course "shared" | Le perdant voit "déjà prise" en < 2 s |
| B2 | Chauffeur accepte → client voit "confirmé" | Latence p95 < 2 s (`accept_to_status`) |
| B3 | Chauffeur refuse → fallback vers chauffeur suivant | Dispatch en < 5 s |
| B4 | Annulation client pendant approche | Chauffeur notifié + retiré de la course |

### Bloc C — GPS & background

| ID | Scénario | Critère |
|----|----------|---------|
| C1 | Chauffeur online, app foreground | `last_location_update` rafraîchi toutes les 8-20 s |
| C2 | Chauffeur online, app background 10 min | Pas de `forced_offline` dans `gps_loss_log` |
| C3 | Chauffeur online, app background 60 min (Xiaomi) | Idem (le plus discriminant) |
| C4 | Chauffeur en course, écran verrouillé 30 min | GPS continue, tracking client live OK |
| C5 | Bascule WiFi → 4G en course | Reprise tracking < 10 s |
| C6 | Mode avion 30 s en course | Reprise tracking + Realtime auto |
| C7 | Reboot device pendant que chauffeur online | `is_available_now` repasse offline (sécurité) |

### Bloc D — Realtime resilience

| ID | Scénario | Critère |
|----|----------|---------|
| D1 | App foreground 60 min sans interaction | 0 zombie socket loggé |
| D2 | App background 60 min puis resume | Reconnect auto, ≤ 1 entrée `realtime_reconnect` |
| D3 | Coupure réseau 2 min en course | Tracking se rattrape, pas d'UPDATE manqué |
| D4 | 5 courses simultanées en cours sur même device | Pas de drop d'événements |

### Bloc E — Charge & edge cases

| ID | Scénario | Critère |
|----|----------|---------|
| E1 | 10 chauffeurs online simultanément, 1 client crée course | Le plus proche reçoit en < 3 s |
| E2 | Course longue (> 1 h 30) | Aucun crash, GPS continue, finalisation OK |
| E3 | Recalcul ETA après détour | Mise à jour client en < 5 s |
| E4 | Chauffeur change d'app vers Waze pendant approche | GPS continue (foreground service) |

## Métriques cibles (`get_observability_summary`)

À mesurer pendant **48h de bêta privée** sur les 5 devices :

| Métrique                          | Seuil acceptable | Bloquant si |
|-----------------------------------|------------------|-------------|
| `insert_to_received` p95          | < 2 000 ms       | > 5 000 ms  |
| `received_to_overlay` p95         | < 500 ms         | > 1 500 ms  |
| `accept_to_status` p95            | < 2 000 ms       | > 5 000 ms  |
| `realtime.zombie_sockets` / 24h   | < 5              | > 20        |
| `gps.forced_offline` / 24h        | < 3              | > 10        |
| `gps.no_fix_timeout` / 24h        | < 5              | > 15        |
| Crashs natifs Sentry / 24h        | 0                | > 0         |

## Procédure de validation

1. Installer l'APK / TestFlight sur les 5 devices
2. Activer Sentry production
3. Exécuter **A1 → E4** sur chaque device, cocher dans une feuille
4. Laisser tourner 48h en conditions réelles (chauffeurs internes)
5. Extraire le rapport `/admin/observability` chaque jour
6. **Ne pas lancer la pub payante** tant que toutes les métriques ne sont pas
   sous les seuils acceptables sur **les 5 devices**.

## Rapport attendu

Pour chaque device :
- Tableau A/B/C/D/E avec ✅ / ❌ / N/A
- Capture du dashboard observabilité à T+24h et T+48h
- Liste des incidents Sentry (avec `device.model` tag)
- Décision finale : **GO / NO-GO** signée par le testeur lead

Cible globale : **5/5 devices GO** avant ouverture publique.
