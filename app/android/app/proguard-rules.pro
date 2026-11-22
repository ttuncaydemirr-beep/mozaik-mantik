# --- Mozaik Mantık R8 kuralları ---
# Ders (önceki proje): reklam SDK'sı WorkManager/Room çekiyor; R8 bu sınıfları
# silince release uygulama açılışta çöktü. Reklam SDK'sı eklenmeden baştan korunur.
-keep class androidx.work.** { *; }
-keep class androidx.room.** { *; }
-keep class * extends androidx.room.RoomDatabase { *; }
-keep class androidx.work.impl.WorkDatabase_Impl { *; }
-keep class * extends androidx.work.Worker
-keep class * extends androidx.work.ListenableWorker {
    public <init>(android.content.Context, androidx.work.WorkerParameters);
}
-dontwarn androidx.work.**
-dontwarn androidx.room.**

# Flutter deferred components (Play Core) kullanılmıyor; uyarıyı sustur.
-dontwarn com.google.android.play.core.**
