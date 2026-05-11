# Realtime Channels — Audit & Règles

> Vague 2 — Détection & Monitoring. Référence obligatoire avant tout `supabase.channel(...)`.

## Principes

1. **Aucun channel public sans filtre.** Tout `postgres_changes` doit être filtré par `user_id`, `driver_id`, `client_id` ou `ride_id`.
2. **Auth requise** côté RLS : la table source du `postgres_changes` doit avoir une policy SELECT qui force l'appartenance.
3. **Pas de PII en payload** : si la RLS expose plus que nécessaire, créer une vue `security_invoker = on` filtrée et écouter la vue.
4. **Cleanup obligatoire** : tout `channel` créé doit être `removeChannel`-é à l'unmount (`useEffect` cleanup).
5. **Broadcast / presence** : ne jamais broadcaster un secret, un token ou un montant non recalculé serveur.

## Checklist par channel

- [ ] La table source a `ENABLE ROW LEVEL SECURITY`
- [ ] La policy SELECT empêche un autre user de lire
- [ ] Le filtre côté client (`filter: 'driver_id=eq.<id>'`) est présent (défense en profondeur)
- [ ] Aucune donnée bancaire / PII brute (téléphone, email) n'est exposée
- [ ] Cleanup `removeChannel` au démontage
- [ ] Logs d'erreur via `reportSecurityEvent('realtime.unauthorized_access', ...)` si `status === 'CHANNEL_ERROR'`

## Channels sensibles (revue prioritaire)

| Channel              | Table source           | Filtre obligatoire           | Risque si fuite                   |
|----------------------|------------------------|------------------------------|------------------------------------|
| `ride-chat-<rideId>` | `ride_messages`        | `ride_id=eq.<rideId>`        | Conversation client/chauffeur leak |
| `course-<id>`        | `courses`              | `id=eq.<id>`                 | Adresses, prix, identité           |
| `driver-loc-<id>`    | `driver_locations`     | `driver_id=eq.<id>`          | Tracking temps réel d'un tiers     |
| `ride_request`       | `ride_request`         | `driver_ids` array contains  | Spam multi-driver, scraping        |
| `payment-events`     | `course_payment_audit` | admin only                   | Données financières                |

## Anti-pattern (interdit)

```ts
// ❌ Aucun filtre — tout abonné reçoit tous les changements
supabase.channel('rides').on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, ...).subscribe();
```

## Bon pattern

```ts
const channel = supabase
  .channel(`course-${courseId}`)
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'courses', filter: `id=eq.${courseId}` },
    (payload) => onChange(payload),
  )
  .subscribe((status) => {
    if (status === 'CHANNEL_ERROR') {
      reportSecurityEvent('realtime.unauthorized_access', { courseId });
    }
  });

return () => { supabase.removeChannel(channel); };
```

## Action continue

- À chaque PR ajoutant un `supabase.channel(...)`, cocher la checklist ci-dessus dans la description.
- Le scan `audit_security_posture()` ne couvre pas Realtime — la revue est manuelle.
