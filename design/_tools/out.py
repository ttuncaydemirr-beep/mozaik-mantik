import urllib.parse, json
from gen import *
def pat(i,col,op):
    def S(w=1.6): return f'stroke="{col}" stroke-opacity="{op}" fill="none" stroke-width="{w}"'
    s=S()
    f=f'fill="{col}" fill-opacity="{op}"'
    body=[
     f'<circle cx="6" cy="6" r="1.7" {f}/>',
     f'<path d="M0 6H12" {s}/>',
     f'<path d="M6 0V12" {s}/>',
     f'<path d="M-1 13L13 -1M-1 7L7 -1M5 13L13 5" {s}/>',
     f'<path d="M-1 -1L13 13M5 -1L13 7M-1 5L7 13" {s}/>',
     f'<path d="M0 6H12M6 0V12" {S(1.1)}/>',
     f'<path d="M0 6Q3 2 6 6T12 6" {s}/>',
     f'<rect x="0" y="0" width="6" height="6" {f}/><rect x="6" y="6" width="6" height="6" {f}/>',
     f'<path d="M6 2.5V9.5M2.5 6H9.5" {S(1.7)}/>',
     f'<path d="M6 .8L11.2 6L6 11.2L.8 6Z" {S(1.3)}/>']
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12">{body[i]}</svg>'
def uri(svg): return 'url("data:image/svg+xml,'+urllib.parse.quote(svg,safe="/:=\" ").replace('"',"%22").replace(' ','%20')+'")'
zig='<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"><path d="M0 9L3 3L6 9L9 3L12 9" stroke="#FFFFFF" stroke-width="1.8" fill="none"/></svg>'
STR={'light':('#1D2842',.55),'dark':('#F3EBD8',.55)}
def block(sel,d,p,th):
    L=[f'{sel}{{']
    items=[('bg','bg'),('surface','surface'),('surface-2','surface2'),('text','text'),('text-2','text2'),('accent','accent'),('accent-ink','accent_ink'),('success','success'),('danger','danger'),('grid-line','grid'),('region-border','border'),('stone','stone'),('stone-ink','stone_ink'),('mark','mark')]
    for n,k in items: L.append(f'  --{n}: {d[k]};')
    for i,c in enumerate(d['r']): L.append(f'  --r{i}: {c}; /* {NAMES[i]} · desen: {PAT[i]} */')
    col,op=STR[th]
    if p['name']=='Kobalt Sır': col,op=('#FFFFFF',.5) if th=='light' else ('#EAF1F7',.5)
    for i in range(10): L.append(f'  --p{i}: {uri(pat(i,col,op))};')
    L.append(f'  --p-conflict: {uri(zig)};')
    L.append('}')
    return '\n'.join(L)
for k,p in P.items():
    head=f'''/* Mozaik Mantık — görsel kimlik tokenları, Yön {k.upper()}: {p['name']}
   Açık tema = :root, koyu tema = [data-theme="dark"]. --p0..--p9: bölge desenleri (background-image, 12x12 döşeme, background-size:12px 12px).
   Kullanım: .cell{{background-color:var(--r3);background-image:var(--p3)}} — desen modu kapalıyken background-image:none.
   Yazı tipleri: ../design/fonts/ içindeki dosyalar @font-face ile gömülür (aşağıda). */
@font-face{{font-family:'Onest';src:url('fonts/Onest-VF.ttf') format('truetype');font-weight:100 900;font-display:swap}}
@font-face{{font-family:'El Messiri';src:url('fonts/ElMessiri-VF.ttf') format('truetype');font-weight:400 700;font-display:swap}}
@font-face{{font-family:'Noto Kufi Arabic';src:url('fonts/NotoKufiArabic-VF.ttf') format('truetype');font-weight:100 900;font-display:swap}}
'''
    # fonts stack: Arabic glyphs come from the Arabic face automatically via fallback order
    if k=='a':
        disp="'El Messiri', 'Onest', 'Noto Kufi Arabic', serif"; ui="'Onest', 'Noto Kufi Arabic', system-ui, sans-serif"
    else:
        disp="'Onest', 'Noto Kufi Arabic', system-ui, sans-serif"; ui="'Onest', 'Noto Kufi Arabic', system-ui, sans-serif"
    common=f":root{{\n  --font-ui: {ui};\n  --font-display: {disp};\n  --radius: {p['radius']};\n  --shadow: {p['shadow']};\n  --dur-place: 140ms; --dur-mark: 100ms; --dur-conflict: 260ms; --dur-win: 700ms; --dur-theme: 200ms;\n  --ease: cubic-bezier(.2,.8,.2,1);\n}}\n"
    css=head+common+block(':root',p['light'],p,'light')+'\n'+block('[data-theme="dark"]',p['dark'],p,'dark')+'\n'
    open(f'../tokens-{k}.css','w').write(css)
# patterns.svg (preview sheet, light A palette strokes dark)
cells=[]
for i in range(10):
    x=10+(i%5)*110;y=10+(i//5)*110
    d=P['a']['light']
    cells.append(f'<g transform="translate({x},{y})"><rect width="100" height="100" fill="{d["r"][i]}"/><rect width="100" height="100" fill="url(#p{i})"/><text x="50" y="94" font-size="9" text-anchor="middle" fill="#1D2842" font-family="sans-serif">r{i} {NAMES[i]} · {PAT[i]}</text></g>')
defs=''.join(f'<pattern id="p{i}" width="12" height="12" patternUnits="userSpaceOnUse">{pat(i,"#1D2842",.55).split(">",1)[1].rsplit("</svg>",1)[0]}</pattern>' for i in range(10))
open('../patterns.svg','w').write(f'<svg xmlns="http://www.w3.org/2000/svg" width="560" height="230" viewBox="0 0 560 230"><defs>{defs}</defs>{"".join(cells)}</svg>\n')
