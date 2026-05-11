# SoloCab — Incident Response Playbooks

> Time-to-react cible : **< 15 min** détection, **< 1h** confinement.

## Sévérités

| Niveau | Exemple | Action |
|---|---|---|
| **P0 critique** | Fuite données massives, compromission Stripe, RLS désactivée prod | Confinement immédiat, comm 24h |
| **P1 haute** | Brute force réussi, double paiement isolé, secret leaké | Rotation < 4h |
| **P2 moyenne** | Spoof GPS, scraping ebooks | Investigation < 24h |
| **P3 faible** | Tentative XSS bloquée, scan automatisé | Log + suivi tendance |

## Playbook 1 — Compromission clé Stripe (P0)

1. `stripe--update_stripe_secret_key` → générer nouvelle restricted key
2. Révoquer ancienne clé dans Stripe Dashboard
3. Lister `payment_intents` créés depuis suspicion + comparer avec table `payments`
4. Auditer `processed_stripe_events` 7 derniers jours
5. Notifier utilisateurs si paiement frauduleux confirmé (RGPD art. 34 si > 72h)

## Playbook 2 — RLS désactivée / policy permissive en prod (P0)

1. Exécuter `SELECT * FROM audit_security_posture()` → identifier table fautive
2. `ALTER TABLE x ENABLE ROW LEVEL SECURITY;` immédiat
3. Estimer fenêtre d'exposition via logs Supabase
4. Si données sensibles : notification CNIL < 72h

## Playbook 3 — Brute force / credential stuffing (P1)

1. Identifier IPs sources via logs auth
2. Bloquer via `is_ip_blocked` table
3. Forcer reset password sur comptes ciblés ayant réussi
4. Activer HIBP si pas déjà fait

## Playbook 4 — Double paiement (P1)

1. Identifier course via `payments` (deux rows même `course_id`)
2. Vérifier `idempotencyKey` dans logs Stripe
3. Refund manuel le second via `stripe--create_refund`
4. Patcher la fonction si idempotency manquait

## Playbook 5 — Spoof GPS chauffeur (P2)

1. Flag `drivers.gps_spoof_suspected = true`
2. Suspendre visibilité (`is_available_now = false` forcé en mode admin)
3. Revue manuelle des courses des dernières 24h
4. Décision admin : avertissement / suspension

## Playbook 6 — Fuite secret en commit (P1)

1. Rotation immédiate via `secrets--update_secret`
2. Réécriture historique git si exposé publiquement
3. Audit logs accès durant fenêtre

## Communication

- Interne : canal `#security-incidents`
- Utilisateurs : email transactionnel via `send-email` edge function
- Régulateur : RGPD < 72h si données personnelles compromises
