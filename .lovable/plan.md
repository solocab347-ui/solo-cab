## Système de notation intelligent SoloCab

### Phase 1 — Base de données
- Table `course_ratings` : note, motif, commentaire, status (validated/pending_review/contested/ai_resolved/cancelled), décision IA, score ajusté
- Table `rating_disputes` : contestation chauffeur, réponse client, analyse IA, décision finale
- Colonnes `client_reliability_score` et `driver_reliability_score` sur les tables existantes
- RLS policies appropriées

### Phase 2 — Composant de notation (refonte CourseRating)
- Notes 4-5★ → validation automatique
- Notes 1-2-3★ → formulaire obligatoire (motif + commentaire)
- Status `pending_review` pour notes basses

### Phase 3 — Notification et contestation chauffeur
- Notification au chauffeur quand note ≤3★
- Options : accepter ou contester
- Timer 24h pour réponse client si contestation

### Phase 4 — Arbitrage IA (Edge Function)
- Analyse des données course (durée, retard, trafic, GPS)
- Analyse comportement client/chauffeur (historique, scores)
- Analyse du texte (ton, cohérence)
- Décision : maintenue / ajustée / annulée / partagée

### Phase 5 — Scores de fiabilité
- Calcul automatique `client_reliability_score`
- Calcul automatique `driver_reliability_score`
- Impact sur la pondération des notes futures

### Phase 6 — Interface Admin
- Page litiges notation IA dans AdminDashboard
- Vue détaillée : course, client, chauffeur, décision IA
- Actions admin : override, bloquer, sanctionner, supprimer

### Phase 7 — Interface chauffeur
- Affichage notes validées / en arbitrage / annulées
- Score de confiance SoloCab

### Phase 8 — Protections anti-abus
- Max 2 contestations chauffeur/jour
- Détection clients abusifs automatique
- Pondération variable des notes selon fiabilité
