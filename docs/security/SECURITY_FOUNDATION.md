# SoloCab — Security Foundation

> **Document fondateur opposable.** Tout nouveau code doit y être conforme.
> Source d'autorité pour les revues, audits et incidents.

## 1. Mission sécurité

SoloCab traite : identité (clients/chauffeurs), géolocalisation temps réel, paiements (Stripe Connect), documents (KBIS, cartes pro, ebooks). Notre standard cible est **Uber / Bolt / Stripe** : aucune donnée client ne fuit, aucun paiement ne double, aucune course n'est volée.

## 2. Standards adoptés

| Standard | Périmètre |
|---|---|
| **OWASP Top 10 (2021)** | Web (frontend + edge functions) |
| **OWASP ASVS L2** | Authentification, sessions, validation, crypto, logs |
| **OWASP MASVS L1+L2** | App Android/iOS (Capacitor) |
| **PCI-DSS SAQ-A** | Aucune carte ne touche nos serveurs (Stripe PaymentElement uniquement) |
| **RGPD** | Minimisation, droit d'accès, droit oubli, registre des traitements |
| **CIS Benchmarks** | Hardening Postgres / headers HTTP |
| **Zero Trust** | Aucune confiance implicite — auth + autorisation à chaque appel |

## 3. Principes architecturaux

1. **Secure by Default** — toute nouvelle table est créée avec RLS active et zéro policy. On ouvre explicitement.
2. **Least Privilege** — `service_role` uniquement dans edge functions, jamais frontend. `anon` ne lit que ce qui est public.
3. **Defense in Depth** — chaque couche (client, edge, RLS, contraintes DB, Stripe idempotency) est une barrière indépendante.
4. **Fail Closed** — en cas d'erreur, refuser. Jamais de fallback permissif.
5. **No Secrets in Frontend** — seules les clés publishable Stripe / Supabase anon sont exposées. Tout le reste via `Deno.env`.
6. **Server is the source of truth** — prix, fees, rôles, statuts : recalcul serveur systématique.
7. **Audit Everything Sensible** — toute action admin et tout accès à des données sensibles est loggué.

## 4. Modèle de menaces

| Menace | Vecteur | Contrôle |
|---|---|---|
| Vol de course | Race condition partage | `FOR UPDATE NOWAIT` |
| Double paiement | Retry edge function | `idempotencyKey` Stripe + index unique DB |
| Élévation privilèges | Modif table `profiles.role` | Roles dans table dédiée + `has_role()` SECURITY DEFINER |
| Fuite données client | RLS manquante / `USING (true)` | `audit_security_posture()` + revue obligatoire |
| GPS spoof | Mock location Android | Détection `is_mock_location` + check vitesse |
| Brute force login | Tentatives massives | Rate limit + HIBP + lockout |
| Replay webhook Stripe | Re-injection event | Vérif signature + table `processed_stripe_events` |
| Scraping ebooks | Téléchargement massif signed URL | TTL court + watermark + rate limit |
| Reverse engineering APK | Decompilation | ProGuard + obfuscation + strip logs release |

## 5. Documents associés (obligatoires)

- `SECURE_CODING_RULES.md` — règles dev quotidiennes
- `PRODUCTION_HARDENING.md` — config infra
- `INCIDENT_RESPONSE.md` — playbooks
- `PRIVACY_AND_GDPR.md` — droits utilisateurs
- `MOBILE_SECURITY.md` — Android/iOS
- `PAYMENT_SECURITY.md` — Stripe
