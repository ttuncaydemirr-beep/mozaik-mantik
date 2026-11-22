import json, re, sys, os
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'i18n')
langs = ['tr','ar','en','de','es','pt','ru','id']
data = {l: json.load(open(os.path.join(D, l + '.json'), encoding='utf-8')) for l in langs}
tr = data['tr']; ph = lambda s: sorted(re.findall(r'\{[a-z]+\}', s))
ok = True
print('anahtar sayisi (tr):', len(tr))
for l in langs:
    d = data[l]; errs = []
    if set(d) != set(tr): errs.append(f'anahtar farki: eksik={set(tr)-set(d)} fazla={set(d)-set(tr)}')
    for k, v in d.items():
        if not isinstance(v, str) or not v.strip(): errs.append(f'bos: {k}')
        elif k in tr and ph(v) != ph(tr[k]): errs.append(f'yer tutucu: {k}')
        if l == 'ar' and k != 'app_name' and k != 'set_about':
            if re.search(r'[A-Za-z]', re.sub(r'\{[a-z]+\}', '', v)): errs.append(f'latin harf: {k}={v}')
    ratios = [(len(d[k]) / max(1, len(tr[k])), k) for k in tr if k in d]
    long_ = [(k, round(r, 2)) for r, k in ratios if r > 1.6 and len(d[k]) > 8]
    avg = sum(r for r, _ in ratios) / len(ratios)
    print(f'{l}: {"TAMAM" if not errs else "HATA"} ort.oran={avg:.2f} uzun(>1.6)={long_}')
    for e in errs: print('   ', e); ok = False
print('SONUC:', 'GECTI' if ok else 'BASARISIZ'); sys.exit(0 if ok else 1)
