# 🔧 Réparation crash au démarrage Android

## 🔍 Causes identifiées

L'application SoloCab se fermait immédiatement à l'ouverture sur Android pour 4 raisons :

1. **Icône de notification inexistante** — `capacitor.config.ts` référençait `ic_stat_icon_config_sample` qui n'existe pas dans les drawables Android. Au boot du plugin LocalNotifications → `NullPointerException` → crash.
2. **Son personnalisé manquant** — `ride_alert.wav` était déclaré comme son par défaut alors que le fichier n'est pas présent dans `android/app/src/main/res/raw/`. Le MediaPlayer Android crashe au démarrage du canal.
3. **Plugin foreground-service non utilisé mais installé** — `@capawesome-team/capacitor-android-foreground-service` était dans `package.json` mais sans permissions associées dans le manifeste → crash de Capacitor au chargement des plugins.
4. **`cleartext: false`** trop strict — la WebView Android pouvait bloquer certaines requêtes de bootstrap (ex : tiles Mapbox HTTP).

## ✅ Corrections appliquées (côté Lovable)

- `capacitor.config.ts` nettoyé : pas d'icône ni de son inexistants, `cleartext: true`, `allowMixedContent: true`.
- `useNativePushRegistration.ts` : suppression du son custom + try/catch défensifs.
- `package.json` : suppression du plugin foreground-service inutilisé.

## 🚀 Étapes que VOUS devez faire pour reconstruire l'APK

Sur votre machine locale (après `git pull` du projet) :

```bash
# 1. Réinstaller les dépendances (le plugin retiré)
npm install

# 2. Reconstruire le bundle web
npm run build

# 3. Re-synchroniser Capacitor avec le natif
npx cap sync android

# 4. (Optionnel mais recommandé) Nettoyer le projet Android
cd android
./gradlew clean
cd ..

# 5. Lancer sur émulateur ou appareil
npx cap run android
```

## 🎯 Si vous voulez REMETTRE le son et l'icône custom plus tard

### Pour l'icône `ic_stat_icon_config_sample`
Placez un PNG monochrome blanc (24x24, 36x36, 48x48, 72x72, 96x96 dp) dans :
```
android/app/src/main/res/drawable-mdpi/ic_stat_icon_config_sample.png
android/app/src/main/res/drawable-hdpi/ic_stat_icon_config_sample.png
... (etc.)
```
Puis ré-ajoutez `smallIcon: 'ic_stat_icon_config_sample'` dans `capacitor.config.ts`.

### Pour le son `ride_alert.wav`
Placez le fichier dans :
```
android/app/src/main/res/raw/ride_alert.wav
```
Puis ré-ajoutez `sound: 'ride_alert.wav'` dans `useNativePushRegistration.ts` (ligne createChannel).

## 🩺 Si l'app crashe encore après ces étapes

Connectez votre téléphone en USB debug et lancez :
```bash
adb logcat | grep -iE "solocab|capacitor|androidruntime|fatal"
```
Envoyez-moi les 30 dernières lignes — je pourrai diagnostiquer précisément.

---
**Date de la correction** : 2026-04-23
