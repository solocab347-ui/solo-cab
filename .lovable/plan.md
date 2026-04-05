

# Passer SoloCab en Application Native — Guide complet A à Z

## Résumé

SoloCab est déjà configuré en PWA. Pour publier sur l'App Store et Google Play, il faut encapsuler l'app avec **Capacitor** (déjà pré-configuré dans le projet). Voici tout ce qu'il faut, étape par étape.

---

## Ce qui est déjà prêt

- PWA fonctionnelle (installable depuis le navigateur)
- `capacitor.config.ts` déjà présent dans le projet
- Dépendances Capacitor déjà installées (`@capacitor/core`, `@capacitor/cli`)

---

## Ce qu'il vous faut

### Matériel & Logiciels

| Besoin | Pour iOS | Pour Android |
|--------|----------|--------------|
| Ordinateur | **Mac obligatoire** (MacBook, iMac, Mac mini) | Windows, Mac ou Linux |
| IDE | Xcode (gratuit, ~15 Go) | Android Studio (gratuit, ~10 Go) |
| Téléphone de test | iPhone (ou simulateur Xcode) | Android (ou émulateur) |

### Comptes développeur

| Compte | Coût | Récurrence |
|--------|------|------------|
| **Apple Developer Program** | **99 €/an** | Annuel |
| **Google Play Console** | **25 $** (≈23 €) | Une seule fois |

---

## Coûts totaux

### Année 1

| Poste | Montant |
|-------|---------|
| Apple Developer | 99 € |
| Google Play | 25 $ (~23 €) |
| Mac (si vous n'en avez pas) | 800-1500 € |
| **Total (avec Mac)** | **~920 - 1620 €** |
| **Total (Mac existant)** | **~122 €** |

### Années suivantes

| Poste | Montant |
|-------|---------|
| Renouvellement Apple | 99 €/an |
| Google Play | 0 € (déjà payé) |
| **Total/an** | **99 €/an** |

### Commissions sur les paiements in-app

- Apple : **15-30%** sur les achats in-app
- Google : **15-30%** sur les achats in-app
- **Avec Stripe via le web (PWA) : 0% de commission store**

> **Note** : Les paiements de courses VTC passant par Stripe Connect ne sont pas soumis aux commissions Apple/Google tant qu'ils ne passent pas par le système d'achat in-app natif.

---

## Étapes de A à Z

### 1. Préparer (10 min)
- Créer un compte Apple Developer (99 €/an) sur developer.apple.com
- Créer un compte Google Play Console (25 $) sur play.google.com/console

### 2. Exporter le code (2 min)
- Dans Lovable : cliquer **GitHub → Export to GitHub**
- Cloner le dépôt sur votre ordinateur

### 3. Configurer l'environnement (30 min)
```text
git clone https://github.com/votre-compte/solo-cab-to-lovable.git
cd solo-cab-to-lovable
npm install
npx cap add ios        (sur Mac uniquement)
npx cap add android
```

### 4. Build & Sync (5 min à chaque mise à jour)
```text
npm run build
npx cap sync
```

### 5. Tester sur appareil (15 min)
```text
npx cap run ios        (simulateur ou iPhone connecté)
npx cap run android    (émulateur ou téléphone connecté)
```

### 6. Publier sur les stores

**iOS** :
```text
npx cap open ios
→ Xcode → Product → Archive → Distribute to App Store
```

**Android** :
```text
npx cap open android
→ Android Studio → Build → Generate Signed Bundle → Upload sur Play Console
```

### 7. Review des stores
- Apple : 24-48h (première soumission : jusqu'à 7 jours)
- Google : quelques heures à 3 jours

---

## Workflow de mise à jour

```text
Modification dans Lovable
       ↓
  git pull origin main
  npm run build
  npx cap sync
       ↓
  Xcode / Android Studio
  → Incrémenter version
  → Build → Soumettre
       ↓
  Review (24h-7j)
```

---

## Fonctionnalités natives débloquées

Passer en natif permettrait d'activer :
- **Superposition sur les autres apps** (System Overlay) — la demande de course qui s'affiche par-dessus tout
- **Notifications push natives** complètes (iOS + Android)
- **GPS en arrière-plan** permanent
- **Vibrations avancées**
- **Accès au système de fichiers**

---

## Recommandation

La PWA est déjà fonctionnelle et suffisante pour le lancement. Le passage en natif est recommandé quand :
- Vous avez validé le produit avec vos premiers clients
- Vous avez besoin de la superposition (overlay) pour les chauffeurs
- Vous voulez la visibilité App Store / Play Store

**Coût minimal pour démarrer : ~122 € (si vous avez déjà un Mac)**

