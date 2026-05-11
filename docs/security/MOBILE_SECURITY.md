# SoloCab — Mobile Security (MASVS)

Référentiel : **OWASP MASVS L1+L2** pour app Capacitor Android (et iOS plus tard).

## 1. Storage (MSTG-STORAGE)

- ✅ Tokens auth Supabase via `localStorage` WebView (sandboxé par app, isolé par OS)
- ✅ Pas de carte bancaire stockée localement (Stripe PaymentElement)
- ✅ Pas de PII en logs natifs

## 2. Crypto (MSTG-CRYPTO)

- TLS 1.2+ obligatoire (network security config)
- Pas de crypto custom — délégué à Supabase / Stripe

## 3. Authentication (MSTG-AUTH)

- JWT court (1h) + refresh rotation
- Logout détruit session locale + serveur
- Future : biométrie (FaceID / fingerprint) pour reconnexion

## 4. Network (MSTG-NETWORK)

| Item | Release |
|---|---|
| `usesCleartextTraffic` | `false` |
| `network_security_config` | TLS only, whitelist domaines |
| SSL pinning | À activer Vague 2 (Capacitor plugin) |

## 5. Platform (MSTG-PLATFORM)

- Activités exportées : uniquement `MainActivity` (intent launcher + deep link)
- Deep links : `solocab://ride` uniquement, validation token côté app
- WebView : `setAllowFileAccess(false)`, `setJavaScriptEnabled(true)` (requis), `addJavascriptInterface` audité
- `FLAG_SECURE` sur écrans paiement (anti-screenshot) — Vague 2

## 6. Code (MSTG-CODE)

- ProGuard / R8 activé en release
- Strip de tous les `Log.*` en release
- `BuildConfig.DEBUG = false`
- Pas de symbol/sourcemap dans APK

## 7. Resilience (MSTG-RESILIENCE) — Vague 2

- Détection root (`SafetyNet` / Play Integrity)
- Détection emulator
- Détection mock location → flag chauffeur
- Détection tampering APK (signature check)
- Anti-debug en release

## 8. Permissions Android

| Permission | Justification |
|---|---|
| `ACCESS_FINE_LOCATION` | Position chauffeur / client |
| `ACCESS_BACKGROUND_LOCATION` | Tracking pendant course |
| `FOREGROUND_SERVICE_LOCATION` | Service GPS persistent |
| `POST_NOTIFICATIONS` | Push course entrante |
| `SYSTEM_ALERT_WINDOW` | Overlay course entrante (chauffeur) |
| `USE_FULL_SCREEN_INTENT` | Notification course bloquante |
| `RECORD_AUDIO` | VoIP anonyme client/chauffeur |
| `RECEIVE_BOOT_COMPLETED` | Relance service GPS au boot |

Aucune permission inutilisée. Auditer à chaque MAJ Android.

## 9. App Store compliance

- ✅ `shouldHideInAppPayments()` masque tout checkout Stripe en natif (Apple 3.1.1 / Google Play)
- ✅ Pas de paywall in-app
