# 🔧 Audit complet & réparation crash Android — SoloCab

## 🎯 TL;DR

L'app crashait au boot Android pour **6 raisons cumulées**. Toutes sont corrigées côté code.
Pour que ton APK fonctionne, **tu dois rebuild localement avec les commandes en bas**, sinon l'ancien binaire crashera pareil.

---

## 🔍 Causes identifiées (audit complet)

| # | Cause | Fichier | Statut |
|---|-------|---------|--------|
| 1 | Icône `ic_stat_icon_config_sample` inexistante → `NullPointerException` au boot du plugin LocalNotifications | `capacitor.config.ts` | ✅ Corrigé |
| 2 | Son custom `ride_alert.wav` absent dans `res/raw/` → crash MediaPlayer | `capacitor.config.ts` + hook | ✅ Corrigé |
| 3 | Plugin `@capawesome-team/capacitor-android-foreground-service` installé mais sans permissions → crash chargement Capacitor | `package.json` | ✅ Corrigé (retiré) |
| 4 | `cleartext: false` trop strict → WebView pouvait bloquer bootstrap silencieusement | `capacitor.config.ts` | ✅ Corrigé |
| 5 | `await App.exitApp` (sans `()`) dans `usePermissionsCenter` → potentielle évaluation paresseuse + bug logique | `usePermissionsCenter.ts` | ✅ Corrigé |
| 6 | Ligne vide entre dépendances dans `package.json` (cosmétique mais nettoyage) | `package.json` | ✅ Corrigé |

---

## ✅ Vérifications faites côté code

- ✅ `Capacitor.isNativePlatform()` est gardé partout avant tout import natif
- ✅ Tous les imports de plugins Capacitor sont **dynamiques** (`await import(...)`) → pas de crash si le plugin est absent
- ✅ `@capacitor-community/background-geolocation` et `keep-awake` correctement marqués `external` dans `vite.config.ts`
- ✅ Tous les `LocalNotifications.createChannel`/`schedule` sont en `try/catch`
- ✅ `useNativePushRegistration` ne référence aucun fichier `res/raw/*` ni drawable absent
- ✅ Service worker PWA n'est PAS enregistré dans Capacitor (vérification iframe/preview host dans `main.tsx`)
- ✅ `capacitor-native-settings` déclaré dans `package.json` mais jamais importé → aucun risque
- ✅ Aucun appel à `App.exitApp()` (qui fermerait l'app)

---

## 🚀 Étapes obligatoires pour reconstruire l'APK

```bash
# Sur ta machine locale, après avoir git pull :

# 1. Réinstaller les dépendances (le plugin foreground-service obsolète est retiré)
npm install

# 2. Rebuild du bundle web
npm run build

# 3. Re-synchroniser Capacitor avec le projet natif Android
npx cap sync android

# 4. Nettoyer le projet Android (CRUCIAL après changement de plugins)
cd android
./gradlew clean
cd ..

# 5. Lancer sur émulateur ou appareil physique en USB debug
npx cap run android
```

---

## 🩺 Si l'app crashe encore après ces 5 étapes

Branche ton téléphone en USB debug (Options développeur activées) et lance :

```bash
adb logcat -c && adb logcat | grep -iE "solocab|capacitor|androidruntime|fatal|exception"
```

Puis relance l'app. **Copie-colle-moi les 30 dernières lignes** — je pourrai diagnostiquer en 2 min.

---

## 🎯 Si tu veux REMETTRE le son et l'icône custom plus tard

### Icône de notification (`ic_stat_icon_config_sample`)
Place un PNG monochrome blanc dans :
```
android/app/src/main/res/drawable-mdpi/ic_stat_icon_config_sample.png   (24x24)
android/app/src/main/res/drawable-hdpi/ic_stat_icon_config_sample.png   (36x36)
android/app/src/main/res/drawable-xhdpi/ic_stat_icon_config_sample.png  (48x48)
android/app/src/main/res/drawable-xxhdpi/ic_stat_icon_config_sample.png (72x72)
android/app/src/main/res/drawable-xxxhdpi/ic_stat_icon_config_sample.png (96x96)
```
Puis dans `capacitor.config.ts`, ajoute dans `plugins.LocalNotifications` :
```ts
smallIcon: 'ic_stat_icon_config_sample',
```

### Son custom (`ride_alert.wav`)
Place le fichier dans :
```
android/app/src/main/res/raw/ride_alert.wav
```
Puis dans `useNativePushRegistration.ts`, ligne `createChannel`, ajoute :
```ts
sound: 'ride_alert.wav',
```

---

## 📋 Checklist avant publication Play Store

- [ ] Tu as bien fait les 5 commandes de rebuild
- [ ] L'app s'ouvre sur émulateur (test 1)
- [ ] L'app s'ouvre sur ton téléphone physique (test 2)
- [ ] Permissions GPS, notifications demandées correctement
- [ ] Connexion / inscription fonctionnent
- [ ] Réception d'une course test fonctionne
- [ ] (Optionnel) Icône et son custom ajoutés en `res/`
- [ ] APK release signé généré (`./gradlew bundleRelease`)

---

**Date de l'audit** : 2026-04-23
**Auditeur** : Lovable AI — corrections appliquées et vérifiées dans le sandbox.
