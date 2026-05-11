# SoloCab — Secure Coding Rules

> **Règles obligatoires.** Une PR qui viole une règle ROUGE est rejetée.

## 🔴 Règles bloquantes

### R1 — Aucun secret côté frontend
- ❌ `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `MAPBOX_SECRET_TOKEN` dans `src/`
- ✅ Uniquement : `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY` (clés publiques)
- ✅ Tout le reste via `Deno.env.get()` dans `supabase/functions/*`

### R2 — RLS activée sur toute nouvelle table
```sql
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;
-- puis policies explicites, jamais USING (true) sur données utilisateur
```

### R3 — Roles via `has_role()` uniquement
- ❌ `profiles.role`, `users.is_admin`, vérif côté client uniquement
- ✅ Table `user_roles` + fonction `has_role(_user_id, _role)` SECURITY DEFINER
- ✅ Vérif serveur (edge function ou RLS)

### R4 — Validation Zod sur toute edge function
```typescript
const Body = z.object({ courseId: z.string().uuid(), amount: z.number().positive().max(10000) });
const parsed = Body.safeParse(await req.json());
if (!parsed.success) return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400, headers: corsHeaders });
```

### R5 — Idempotency Stripe sur tout PaymentIntent
```typescript
await stripe.paymentIntents.create({...}, { idempotencyKey: `${context}:${id}:v1` });
```

### R6 — Search path verrouillé sur toute fonction PL/pgSQL
```sql
CREATE FUNCTION ... SECURITY DEFINER SET search_path = public AS $$ ... $$;
```

### R7 — Aucun raw SQL utilisateur
- ❌ `supabase.rpc('execute_sql', { sql: userInput })`
- ✅ RPC typées, paramètres validés

### R8 — Aucun `dangerouslySetInnerHTML` sur input utilisateur
- Si HTML strict requis : DOMPurify.

### R9 — Webhooks signés + dédupliqués
- `stripe.webhooks.constructEventAsync` obligatoire
- Insert dans `processed_stripe_events` AVANT traitement

### R10 — `service_role` uniquement en edge functions
- Jamais dans `src/`, jamais dans tests checked-in.

### R11 — PII jamais loggée en clair
- ❌ `console.log(user.email, user.phone)`
- ✅ Hash/masque (`u***@gmail.com`, `+33•••••12`)

## 🟠 Règles fortes (justifier toute exception)

- F1 — Sanitization input texte libre via `inputSanitizer.ts`
- F2 — Rate limit côté edge function pour endpoints publics (login, signup, search, booking, contact)
- F3 — Realtime channels filtrés par `user_id` ou `ride_id`
- F4 — Signed URLs Storage : TTL ≤ 1h pour documents privés
- F5 — `FOR UPDATE NOWAIT` pour toute mutation concurrente (course sharing, accept devis)
- F6 — Recalcul prix/fees serveur (jamais faire confiance au client)

## 🟡 Checklist obligatoire pour CHAQUE feature

- [ ] Auth vérifiée côté serveur (edge ou RLS)
- [ ] Rôles via `has_role()`
- [ ] Inputs validés (Zod)
- [ ] RLS écrite + testée avec un autre utilisateur
- [ ] Pas de secret en clair
- [ ] Logs sans PII
- [ ] Idempotency si paiement
- [ ] Rate limit si endpoint public
- [ ] Rollback possible (migration réversible si raisonnable)
- [ ] Mémoire projet mise à jour si la règle est nouvelle

## Patterns standards

### Edge function squelette sécurisé
```typescript
import { corsHeaders } from '@supabase/supabase-js/cors';
import { z } from 'https://esm.sh/zod';

const Body = z.object({ /* ... */ });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    // 1. Auth
    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'unauthorized' }, 401);
    // 2. Validation
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    // 3. Authorization (rôle / ownership)
    // 4. Action (idempotente)
    // 5. Audit log si action sensible
    return json({ ok: true });
  } catch (e) {
    console.error('[fn-name] error', e);
    return json({ error: 'internal' }, 500); // ❌ ne jamais leak e.message
  }
});

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
```
