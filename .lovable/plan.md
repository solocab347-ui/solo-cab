

## Plan: Amélioration affichage ActiveCourseCard + IncomingCourseOverlay

### Problèmes identifiés
1. **ActiveCourseCard** : fond semi-transparent (`bg-card/98 backdrop-blur`) → sur la carte, le texte est illisible (screenshot)
2. **ActiveCourseCard** : trop petit, ne remplit pas l'espace entre la barre supérieure et le bas de l'écran
3. **IncomingCourseOverlay** : layout correct mais peut être amélioré visuellement

---

### Modifications prévues

#### 1. ActiveCourseCard — Fond opaque + pleine hauteur

- Remplacer `bg-card/98 backdrop-blur-2xl` par un **fond totalement opaque** (`bg-[#1a1a2e]` ou `bg-zinc-900`) avec du texte blanc
- Faire en sorte que le panneau **remplisse tout l'espace disponible** sous la barre du haut (CA + En ligne) — utiliser `calc(100vh - 80px)` ou `flex-1` depuis le parent
- Passer de `absolute bottom-0` à un positionnement qui couvre la zone carte entière
- Ajouter un design type dark card avec sections bien délimitées : client, trajet, actions
- Grossir les boutons de navigation et d'action
- Ajouter des icônes et couleurs plus contrastées pour chaque phase

#### 2. IncomingCourseOverlay — Améliorations visuelles

- Augmenter la taille du timer circulaire (de `w-28 h-28` à `w-32 h-32`)
- Rendre le prix plus gros et central avec un fond lumineux
- Améliorer l'espacement et le contraste des cartes d'info (route, détails)
- Ajouter un effet de pulsation/glow sur le bouton ACCEPTER pour attirer l'attention
- Grossir légèrement les textes d'adresse pour meilleure lisibilité

#### 3. DriverMapMode — Intégration

- Quand `hasActiveCourse` est true, masquer la carte et afficher `ActiveCourseCard` en plein écran sous la barre du haut
- Conserver la barre supérieure (CA + statut) toujours visible

---

### Fichiers modifiés
- `src/components/driver/map/ActiveCourseCard.tsx` — refonte visuelle complète
- `src/components/driver/courses/IncomingCourseOverlay.tsx` — améliorations design
- `src/components/driver/map/DriverMapMode.tsx` — layout adaptatif quand course active

