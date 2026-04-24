
## Objectif

Corriger le blocage visible sur ta capture et renforcer le pipeline Android pour que :

1. `npm install` en CI ne soit plus cassé par les peer-deps Stripe.
2. les versions Stripe soient verrouillées et compatibles.
3. `npm run android:verify && vite build` ne plante plus sur le script `verify-android-package.sh`.
4. le workflow GitHub Actions relance bien `npm install`, build le bundle web, fait `cap sync android`, puis upload APK + logs.

## Problème identifié sur la capture

Le terminal montre deux erreurs liées en cascade :

```text
scripts/verify-android-package.sh: line 70: unexpected EOF while looking for matching `}'
[error] Could not find the web assets directory: ./dist
```

La première erreur vient du script `scripts/verify-android-package.sh`, probablement à cause de blocs heredoc Bash/Python trop fragiles sur l’environnement local.

Comme `npm run build` exécute d’abord :

```bash
npm run android:verify && vite build
```

le `vite build` ne se lance pas, donc le dossier `dist/` n’est jamais généré. Ensuite `npx cap sync android` échoue logiquement avec :

```text
Could not find the web assets directory: ./dist
```

## Plan d’implémentation

### 1. Durcir `scripts/verify-android-package.sh`

Modifier le script pour supprimer les heredocs fragiles ou les rendre totalement sûrs :

- utiliser des heredocs quotés (`<<'PY'`, `<<'NODE'`) quand aucune interpolation Bash n’est nécessaire ;
- passer `ANDROID_DIR` via variable d’environnement au script Python au lieu de l’injecter directement dans le heredoc ;
- éviter les syntaxes qui peuvent être interprétées par Bash avant d’arriver à Node/Python ;
- conserver les mêmes contrôles :
  - versions majeures Capacitor cohérentes ;
  - `appId` dans `capacitor.config.ts` ;
  - package de `MainActivity` ;
  - `applicationId` Gradle ;
  - `namespace` Gradle.

Résultat attendu :

```bash
npm run android:verify
```

doit passer sans erreur Bash.

### 2. Verrouiller la stratégie peer-deps Stripe

Compléter la stratégie déjà commencée :

- conserver `.npmrc` :

```text
legacy-peer-deps=true
fund=false
audit=false
```

- ajouter dans `package.json` un bloc `overrides` npm pour forcer les versions Stripe compatibles :

```json
"overrides": {
  "@stripe/react-stripe-js": "6.1.0",
  "@stripe/stripe-js": "9.3.1"
}
```

- conserver les dépendances directes :

```json
"@stripe/react-stripe-js": "6.1.0",
"@stripe/stripe-js": "9.3.1"
```

But : si une dépendance transitive tente de résoudre une autre version Stripe, npm restera aligné sur les versions validées.

### 3. Renforcer le workflow GitHub Actions

Mettre à jour `.github/workflows/android-build.yml` pour rendre l’installation plus explicite et traçable :

- ajouter une variable d’environnement globale :

```yaml
env:
  NPM_CONFIG_LEGACY_PEER_DEPS: "true"
```

- conserver :

```bash
npm install --legacy-peer-deps
```

- ajouter une étape de diagnostic après installation :

```bash
npm ls @stripe/react-stripe-js @stripe/stripe-js || true
npm ls @capacitor/core @capacitor/android @capacitor/cli || true
```

et sauvegarder ce résultat dans les logs uploadés.

### 4. Sécuriser l’ordre de build Android

Garder l’ordre CI suivant :

```text
npm install --legacy-peer-deps
npm run build
npx cap add android si android/ absent
bash scripts/patch-native.sh
npx cap sync android
npm run android:verify
./gradlew assembleDebug
upload APK + logs
```

Une fois le script `android:verify` corrigé, `npm run build` générera bien `dist/`, donc `cap sync android` ne devrait plus échouer sur l’absence du dossier web.

### 5. Vérifications à lancer après modification

Après approbation, je lancerai les vérifications disponibles ici :

```bash
npm install --legacy-peer-deps
npm run android:verify
npm run build
npx cap sync android
```

Puis je confirmerai :

- que les dépendances Stripe sont alignées ;
- que les dépendances Capacitor restent alignées ;
- que le script Android verify ne casse plus ;
- que `dist/` est généré avant `cap sync android`.

## Résultat attendu côté GitHub Actions

Au prochain push, le workflow devra produire :

- un artefact APK debug ;
- un artefact logs avec :
  - `npm-install.log`
  - `stripe-deps.log`
  - `capacitor-deps.log`
  - `web-build.log`
  - `cap-sync-android.log`
  - `android-verify.log`
  - `gradle-assemble-debug.log`

Si le build échoue encore, les logs uploadés permettront d’identifier précisément l’étape fautive au lieu d’avoir seulement une erreur terminal partielle.
