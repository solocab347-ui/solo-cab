## SoloCab — Security Governance Architecture

Transformer SoloCab en plateforme **secure-by-default** type Uber/Bolt/Stripe avec garde-fous automatiques, documentation contraignante et détection continue.

Vu l'ampleur (10 phases), je propose une **livraison en 3 vagues** pour garder de la qualité et éviter les régressions. Tu valides après chaque vague avant la suivante.

---

### VAGUE 1 — Foundation documentaire + Hardening immédiat (cette session)

**1. Créer les 7 documents fondateurs** (`docs/security/`)
- `SECURITY_FOUNDATION.md` — principes (Zero Trust, Least Privilege, Defense in Depth, Secure by Default) + standards (OWASP Top 10, ASVS, MASVS, PCI-DSS, RGPD, CIS)
- `SECURE_CODING_RULES.md` — règles obligatoires : Zod partout, sanitization, no secrets frontend, RLS par défaut, has_role pattern
- `PRODUCTION_HARDENING.md` — HTTPS/HSTS/CSP, headers, cookies, source maps, logs release
- `INCIDENT_RESPONSE.md` — playbooks (compromission Stripe, fuite données, brute force, spoof GPS)
- `PRIVACY_AND_GDPR.md` — droit oubli, export, minimisation, rétention, consentement
- `MOBILE_SECURITY.md` — MASVS, SSL pinning, root/emulator detect, ProGuard, FLAG_SECURE
- `PAYMENT_SECURITY.md` — PCI-DSS SAQ-A, idempotency, webhook signature, anti-replay, anti-double-paiement

**2. Hardening immédiat code** (gains rapides, pas de régression)
- **CSP renforcée** + headers sécurité dans `index.html` (`Permissions-Policy`, `Referrer-Policy`, `X-Content-Type-Options`)
- **Network Security Config Android** strict (cleartextTrafficPermitted=false en release, domain pinning whitelist)
- **AndroidManifest** : `android:debuggable="false"` + `android:allowBackup="false"` + `usesCleartextTraffic="false"` en release
- **ProGuard rules** renforcées (obfuscation + strip logs en release)
- **Désactivation `console.log`** automatique en build production (Vite)
- **Source maps désactivées** en production (`vite.config.ts`)

**3. Migration Supabase — Audit functions**
- Créer fonction `audit_security_posture()` qui scanne : tables sans RLS, policies `USING (true)`, functions sans `search_path`, vues sans `security_invoker`
- Créer table `security_audit_log` (admin-only) pour logs accès admin
- Créer trigger sur `user_roles` pour logger toute attribution/retrait de rôle

---

### VAGUE 2 — Détection & Monitoring (session suivante)

- **Dashboard Admin Sécurité** (`/admin/security`) : brute force, anomalies auth, GPS spoof, fraude paiement, scraping
- **GPS spoof detection** : vitesse incohérente (>250 km/h), saut téléportation (>5 km/<10s), `is_mock_location` Android
- **Anti-replay webhook** Stripe (déjà en place via `processed_stripe_events`, vérifier coverage)
- **Rate limiting edge functions** centralisé (`_shared/rateLimiter.ts`) — login, signup, search, booking
- **Realtime auth gate** : audit channels publics, forcer auth + filtres `user_id`
- **Sentry security events** : intégration logs critiques

---

### VAGUE 3 — Automatisation & Privacy (session suivante)

- **Git hooks** (pre-commit, pre-push) : secret scan, lint sécurité, validation Zod présente
- **CI security checks** : npm audit, dependency scan, validation policies Supabase
- **RGPD complet** :
  - Edge function `gdpr-export-data` (export complet utilisateur en JSON)
  - Edge function `gdpr-delete-account` (suppression cascade + anonymisation factures légales 10 ans)
  - Page `/privacy/my-data` côté client/chauffeur
- **Storage privacy** : audit signed URLs, expiration max 1h pour ebooks, watermark PDF si possible
- **Checklist obligatoire** intégrée à `SECURE_CODING_RULES.md` à cocher pour chaque nouvelle feature

---

### Détails techniques (Vague 1)

**Fichiers créés/modifiés :**
- `docs/security/*.md` (7 fichiers)
- `index.html` (meta CSP + Permissions-Policy)
- `android/app/src/main/AndroidManifest.xml` (flags sécurité release)
- `android/app/src/main/res/xml/network_security_config.xml` (nouveau, strict)
- `android/app/proguard-rules.pro` (obfuscation + log strip)
- `vite.config.ts` (drop console + sourcemap false en prod)
- `capacitor.config.ts` (vérifier `webContentsDebuggingEnabled: false` release)
- Migration SQL : `audit_security_posture()`, `security_audit_log`, trigger `user_roles`

**Mémoire projet** : ajout d'une règle Core "Tout nouveau code doit respecter `docs/security/SECURE_CODING_RULES.md` (Zod, no secrets frontend, RLS, has_role, idempotency Stripe)".

**Ce qui NE change PAS** (risque régression) :
- Aucune RLS existante modifiée sans audit ciblé
- Aucune edge function réécrite — uniquement nouvelles règles documentées
- Aucun changement UI client/chauffeur

---

### Question avant exécution

Tu valides cette découpe en 3 vagues ? Je commence directement la **Vague 1** (documents + hardening immédiat + migration audit) dès ton OK.