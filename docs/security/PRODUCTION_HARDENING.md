# SoloCab — Production Hardening

## 1. Headers HTTP (web)

Configurés via meta-tags `index.html` et headers Lovable :

| Header | Valeur |
|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com https://api.mapbox.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://api.mapbox.com https://*.tiles.mapbox.com; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; frame-src https://js.stripe.com https://hooks.stripe.com; font-src 'self' data:; object-src 'none'; base-uri 'self'` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` (géré Lovable) |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `geolocation=(self), camera=(self), microphone=(self), payment=(self)` |
| `X-Frame-Options` | `DENY` (sauf pages stripe iframe) |

## 2. Build production (Vite)

- `esbuild.drop = ['console', 'debugger']` ✅
- Source maps désactivées en prod (`build.sourcemap: false`)
- Chunks vendorisés pour cache long-terme
- Pas d'inclusion `.env` autre que `VITE_*`

## 3. Cookies / Sessions

- Auth Supabase : tokens en `localStorage` (SDK officiel) — jamais touché manuellement
- Refresh token rotation activée
- Session expiration : 1h access, 30j refresh

## 4. Android (release build)

| Réglage | Valeur release |
|---|---|
| `android:debuggable` | `false` |
| `android:allowBackup` | `false` |
| `android:usesCleartextTraffic` | `false` |
| `webContentsDebuggingEnabled` | `false` |
| `networkSecurityConfig` | strict (TLS only) |
| ProGuard / R8 | activé + strip logs |

## 5. Postgres / Supabase

- `search_path = public` sur toutes les fonctions SECURITY DEFINER
- `security_invoker = on` sur les vues exposant des données utilisateur
- Buckets Storage privés par défaut, signed URLs ≤ 1h
- Realtime : channels filtrés `user_id` / `ride_id`
- Triggers de validation (jamais CHECK avec `now()`)

## 6. Logs production

- Aucune PII en clair (email, téléphone, adresse, GPS précis)
- Pas de stack trace exposée au client (toujours `error: 'internal'`)
- Sentry filtre `beforeSend` strip emails/tokens

## 7. Monitoring obligatoire

- Édition `user_roles` → audit log
- Webhook Stripe rejeté (signature) → alerte
- > 5 logins échoués / 15min → alerte brute force
- GPS spoof détecté → flag chauffeur
