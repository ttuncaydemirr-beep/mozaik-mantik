#!/usr/bin/env python3
"""design/tokens-a.css -> lib/theme/tokens.dart (renk sabitleri, birebir).

Kullanim (depo kokunden ya da app/ icinden): python3 app/tool/gen_tokens.py
CI'da calistirilip `git diff --exit-code` ile kaymaya karsi kontrol edilir.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CSS = ROOT / "design" / "tokens-a.css"
OUT = ROOT / "app" / "lib" / "theme" / "tokens.dart"

text = CSS.read_text(encoding="utf-8")

def block(selector_re):
    """Verilen secicinin tum { } govdelerini birlestirir."""
    bodies = []
    for m in re.finditer(selector_re + r"\s*\{", text):
        i, depth = m.end(), 1
        while depth:
            c = text[i]
            depth += (c == "{") - (c == "}")
            i += 1
        bodies.append(text[m.end():i - 1])
    return "\n".join(bodies)

VAR = re.compile(r"--([a-z0-9-]+)\s*:\s*#([0-9A-Fa-f]{6})\s*;(?:\s*/\*\s*(.*?)\s*\*/)?")

def parse(body):
    out = {}
    for name, hexv, note in VAR.findall(body):
        out[name] = (hexv.upper(), note)
    return out

light = parse(block(r"(?<![\w\]])\:root"))
dark = parse(block(r"\[data-theme=\"dark\"\]"))
if not light or set(light) != set(dark):
    sys.exit("Acik/koyu token kumeleri eslesmiyor: %r" % (set(light) ^ set(dark)))

def camel(n):
    p = n.split("-")
    return p[0] + "".join(x.capitalize() for x in p[1:])

names = list(light)
radius = re.search(r"--radius\s*:\s*(\d+)px", text).group(1)

L = []
L.append("// GENERATED FILE - DO NOT EDIT.")
L.append("// Kaynak: design/tokens-a.css (Yon A: Lale Bahcesi). Uretici: app/tool/gen_tokens.py")
L.append("// ignore_for_file: public_member_api_docs")
L.append("import 'package:flutter/painting.dart';")
L.append("")
L.append("/// Tasarim yaricapi (CSS --radius).")
L.append("const double kRadius = %s;" % radius)
L.append("")
L.append("class MozaikTokens {")
L.append("  const MozaikTokens({")
for n in names:
    L.append("    required this.%s," % camel(n))
L.append("  });")
L.append("")
for n in names:
    L.append("  final Color %s;" % camel(n))
L.append("")
L.append("  /// Bolge renkleri r0..r9 (desen modu icin bolge indeksiyle kullanilir).")
rs = [camel(n) for n in names if re.fullmatch(r"r\d", n)]
L.append("  List<Color> get regions => [%s];" % ", ".join(rs))
L.append("}")
L.append("")
for title, data, const in (("Acik tema (:root)", light, "kLightTokens"), ("Koyu tema ([data-theme=dark])", dark, "kDarkTokens")):
    L.append("/// %s" % title)
    L.append("const MozaikTokens %s = MozaikTokens(" % const)
    for n in names:
        hexv, note = data[n]
        c = "  %s: Color(0xFF%s)," % (camel(n), hexv)
        if note:
            c += " // " + note
        L.append(c)
    L.append(");")
    L.append("")

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text("\n".join(L), encoding="utf-8")
print("yazildi:", OUT.relative_to(ROOT), "-", len(names), "token")
