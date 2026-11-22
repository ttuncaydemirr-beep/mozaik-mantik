#!/usr/bin/env python3
"""Mozaik Mantık web önizleme derleyicisi: src + solver + data + i18n + tokens + fonts -> web/dist/index.html (tek dosya, çevrimdışı).
Kullanım: python3 web/build.py   (eksik asıl girdiler için yer tutucu kullanır ve UYARI yazar)."""
import base64, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC, DEV, DIST = (os.path.join(HERE, x) for x in ('src', 'dev', 'dist'))
LANGS = ['tr', 'ar', 'en', 'de', 'es', 'pt', 'ru', 'id']
warns, used = [], {}

def read(p):
    with open(p, encoding='utf-8') as f: return f.read()

def pick(real, dev, label):
    if os.path.isfile(real):
        used[label] = os.path.relpath(real, ROOT); return real
    warns.append(f'{label}: asıl dosya yok ({os.path.relpath(real, ROOT)}), YER TUTUCU kullanıldı ({os.path.relpath(dev, ROOT)})')
    used[label] = os.path.relpath(dev, ROOT) + ' (yer tutucu)'; return dev

def jload(p): return json.loads(read(p))

def jscript(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')

# --- yazı tipleri -> base64
font_dir = os.path.join(ROOT, 'design', 'fonts')
MIME = {'.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2'}
def embed_fonts(css):
    def rep(m):
        name = os.path.basename(m.group(2))
        p = os.path.join(font_dir, name)
        if not os.path.isfile(p):
            warns.append(f'yazı tipi dosyası bulunamadı: {name}'); return m.group(0)
        ext = os.path.splitext(name)[1].lower()
        b = base64.b64encode(open(p, 'rb').read()).decode()
        return f'url({m.group(1)}data:{MIME.get(ext, "font/ttf")};base64,{b}{m.group(1)})'
    return re.sub(r'url\((["\']?)([^)"\']*fonts/[^)"\']+)\1\)', rep, css)

# --- tokenlar
ta_real, tb_real = (os.path.join(ROOT, 'design', f'tokens-{x}.css') for x in 'ab')
dev_tok = os.path.join(DEV, 'tokens-dev.css')
ta = pick(ta_real, dev_tok, 'tokens-a')
tok_a = read(ta)
if os.path.isfile(tb_real):
    used['tokens-b'] = os.path.relpath(tb_real, ROOT)
    tok_b = read(tb_real)
    tok_b = re.sub(r'@font-face\s*\{[^}]*\}', '', tok_b)      # yazı tipi tanımları A'da zaten var
else:
    warns.append('tokens-b: yok; B stili = A ile aynı'); used['tokens-b'] = '(yok)'; tok_b = tok_a
if not os.path.isdir(font_dir) or not any(f.lower().endswith(tuple(MIME)) for f in os.listdir(font_dir)):
    warns.append('design/fonts boş/yok: yazı tipi gömülmedi')
tok_a = embed_fonts(tok_a)
tokens_html = f'<style id="tok-a">\n{tok_a}\n</style>\n<style id="tok-b" media="not all">\n{tok_b}\n</style>'

# --- JS
solver = pick(os.path.join(ROOT, 'tools', 'solver.js'), os.path.join(DEV, 'solver-dev.js'), 'solver')
order = ['config', 'util', 'i18n', 'state', 'economy', 'daily', 'share', 'logic', 'progress', 'data', 'ui-core', 'ui-screens', 'ui-game', 'main']
js_parts = ['/* ---- solver ---- */\n' + read(solver)]
src_js = ''
for m in order:
    code = read(os.path.join(SRC, m + '.js')); src_js += code
    js_parts.append(f'/* ---- {m}.js ---- */\n' + code)
scripts = '\n'.join(js_parts).replace('</script', '<\\/script')

# --- veri
lv = pick(os.path.join(ROOT, 'data', 'levels.json'), os.path.join(DEV, 'levels-dev.json'), 'levels')
dl = pick(os.path.join(ROOT, 'data', 'daily.json'), os.path.join(DEV, 'daily-dev.json'), 'daily')
tu = pick(os.path.join(ROOT, 'data', 'tutorial.json'), os.path.join(DEV, 'tutorial-dev.json'), 'tutorial')

# --- i18n: dev tabanı (en + ek anahtarlar) < dev dil < asıl dil
i18n, real_keys = {}, set()
dev_en = jload(os.path.join(DEV, 'i18n', 'en.json'))
for l in LANGS:
    d = dict(dev_en)
    pdev = os.path.join(DEV, 'i18n', l + '.json')
    if os.path.isfile(pdev): d.update(jload(pdev))
    real = os.path.join(ROOT, 'i18n', l + '.json')
    if os.path.isfile(real):
        r = jload(real); d.update(r)
        if l == 'tr': real_keys = set(r)
    else:
        warns.append(f'i18n/{l}.json yok; yer tutucu/İngilizce kullanıldı')
    i18n[l] = d
used['i18n'] = ', '.join(l for l in LANGS if os.path.isfile(os.path.join(ROOT, 'i18n', l + '.json'))) + ' (asıl)'

# koddaki anahtarlar sözlükte var mı, asıl sözlükte olmayan (ek) anahtarlar hangileri?
PRE = ('btn_','menu_','diff_','level_','pack_','game_','stat_','win_','hint_','tech_','daily_','streak_','share_','tut_','col_','set_','a11y_','ad_','ads_','restore_','reset_','theme_','app_')
keys = {k for k in re.findall(r"['\"]([a-z0-9]+_[a-z0-9_]+)['\"]", src_js) if k.startswith(PRE)}
keys |= {f'diff_{i}' for i in range(1, 6)} | {f'tech_{i}' for i in range(1, 6)} | {f'theme_{x}' for x in ('light', 'dark', 'system')} | {'tut_1', 'tut_2', 'tut_3', 'a11y_state_empty', 'a11y_state_x', 'a11y_state_stone'}
missing_dev = sorted(k for k in keys if k not in i18n['tr'])
if missing_dev: warns.append('kodda kullanılan ama hiçbir sözlükte olmayan anahtarlar: ' + ', '.join(missing_dev))
extra = sorted(k for k in keys if real_keys and k not in real_keys and k in i18n['tr'])
if extra: warns.append('asıl i18n/tr.json\'da OLMAYAN, kodda kullanılan ek anahtarlar (çevirmenlere iletilmeli; şimdilik dev sözlüğü tr/en/ar): ' + ', '.join(extra))

# her dil için: kodda kullanılan ama ASIL dil dosyasında olmayan anahtarlar (yedek katmandan geliyor)
missing_real = {}
for l in LANGS:
    rp = os.path.join(ROOT, 'i18n', l + '.json')
    if os.path.isfile(rp):
        rk = set(jload(rp)); mk = sorted(k for k in keys if k not in rk)
        if mk: missing_real[l] = mk
if missing_real:
    warns.append('dil dosyalarında eksik (yedek katmandan dolduruldu): ' + '; '.join(f'{l}: {", ".join(v)}' for l, v in missing_real.items()))
data = {'levels': jload(lv), 'daily': jload(dl), 'tutorial': jload(tu), 'i18n': i18n, 'meta': {'sources': used, 'missingReal': missing_real}}
data_js = 'window.MZ_DATA=' + jscript(data) + ';'

html = read(os.path.join(SRC, 'index.html'))
html = html.replace('<!--@@TOKENS@@-->', tokens_html).replace('<!--@@STYLE@@-->', read(os.path.join(SRC, 'styles.css')))
html = html.replace('<!--@@DATA@@-->', data_js).replace('<!--@@SCRIPTS@@-->', scripts)
os.makedirs(DIST, exist_ok=True)
out = os.path.join(DIST, 'index.html')
open(out, 'w', encoding='utf-8').write(html)

print('Derleme tamam:', os.path.relpath(out, ROOT), f'({os.path.getsize(out)/1024:.0f} KB)')
print('Kullanılan girdiler:')
for k, v in used.items(): print(f'  {k}: {v}')
for w in warns: print('UYARI:', w)
