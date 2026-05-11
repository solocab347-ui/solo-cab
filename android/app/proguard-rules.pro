# ============================================================
# SoloCab - Règles ProGuard / R8
# ============================================================
# Même si minifyEnabled = false aujourd'hui, ces règles évitent
# tout crash ClassNotFoundException si la minification est
# activée plus tard (cause classique : MainActivity supprimée).
# ============================================================

# Conserver MainActivity et toutes les Activities de l'app
-keep class com.solocab.app.** { *; }
-keep class com.solocab.app.MainActivity { *; }
-keep class com.solocab.app.permissions.** { *; }

# Conserver Capacitor (sinon les plugins natifs crashent)
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod public *;
}

# Conserver les WebView JS interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Conserver les Activities, Services, Receivers, Providers
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Service
-keep public class * extends android.content.BroadcastReceiver
-keep public class * extends android.content.ContentProvider
-keep public class * extends androidx.appcompat.app.AppCompatActivity

# Conserver les annotations Capacitor
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
-keepattributes EnclosingMethod
-keepattributes SourceFile,LineNumberTable

# ============================================================
# Hardening release : strip de tous les Log.* (anti reverse-engineering)
# Actif uniquement quand minifyEnabled = true (release).
# ============================================================
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int i(...);
    public static int w(...);
    public static int d(...);
    public static int e(...);
}

# Obfuscation : renomme classes/méthodes/champs (defense-in-depth)
-repackageclasses ''
-allowaccessmodification

# Optimisations standards
-optimizations !code/simplification/arithmetic,!code/simplification/cast,!field/*,!class/merging/*
-optimizationpasses 5
