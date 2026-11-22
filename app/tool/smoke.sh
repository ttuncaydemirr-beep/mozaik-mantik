#!/usr/bin/env bash
# Emülatör açılış testi (android-emulator-runner içinde çalışır).
# Kullanım: smoke.sh <apk> <paket> <çıktı-klasörü>
set -u
APK="$1"; PKG="$2"; OUT="$3"
mkdir -p "$OUT"
FAIL=0

adb install -r "$APK" || { echo "APK kurulamadı"; exit 2; }
adb logcat -c
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
sleep 20

PID="$(adb shell pidof "$PKG" | tr -d '\r')"
adb logcat -d > "$OUT/logcat.txt" 2>&1
adb exec-out screencap -p > "$OUT/ekran.png"

if [ -z "$PID" ]; then
  echo "HATA: $PKG süreci çalışmıyor (pidof boş)"; FAIL=1
fi
if grep -q "FATAL EXCEPTION" "$OUT/logcat.txt"; then
  echo "HATA: logcat'te FATAL EXCEPTION var"; FAIL=1
fi
if grep -Eq "ANR in $PKG|Process $PKG .* has died" "$OUT/logcat.txt"; then
  echo "HATA: ANR ya da süreç ölümü"; FAIL=1
fi

{
  echo "pid=${PID:-YOK}"
  echo "fatal=$(grep -c 'FATAL EXCEPTION' "$OUT/logcat.txt")"
  echo "sonuc=$([ $FAIL -eq 0 ] && echo GECTI || echo KALDI)"
} > "$OUT/smoke.txt"
cat "$OUT/smoke.txt"

if [ $FAIL -ne 0 ]; then
  echo "===== logcat (son 400 satır) ====="
  tail -n 400 "$OUT/logcat.txt"
  exit 1
fi
# Başarıda logcat'i küçült (dala konmayacak, artifact'ta kalır)
exit 0
