#!/usr/bin/env python3
"""i18n/*.json (kok, tek gercek kaynak) -> app/assets/i18n/ gercek kopya.

Neden kopya: Flutter asset'leri paket kokunun disina isaret edemez. Kopya
commit'lenir; CI bu betigi calistirip `git diff --exit-code` ile kaymayi yakalar.
"""
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC, DST = ROOT / "i18n", ROOT / "app" / "assets" / "i18n"
DST.mkdir(parents=True, exist_ok=True)
for old in DST.glob("*.json"):
    old.unlink()
for f in sorted(SRC.glob("*.json")):
    shutil.copyfile(f, DST / f.name)
print("kopyalandi:", ", ".join(p.stem for p in sorted(DST.glob("*.json"))))
