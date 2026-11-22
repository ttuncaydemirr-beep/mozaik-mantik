import math, itertools, json, sys, urllib.parse
import numpy as np

def h2r(h): h=h.lstrip('#'); return [int(h[i:i+2],16)/255 for i in (0,2,4)]
def lin(c): return [x/12.92 if x<=0.04045 else ((x+0.055)/1.055)**2.4 for x in c]
def lum(h): r,g,b=lin(h2r(h)); return 0.2126*r+0.7152*g+0.0722*b
def cr(a,b):
    la,lb=lum(a),lum(b); 
    if la<lb: la,lb=lb,la
    return (la+0.05)/(lb+0.05)
def lab(rgb):
    M=np.array([[0.4124,0.3576,0.1805],[0.2126,0.7152,0.0722],[0.0193,0.1192,0.9505]])
    xyz=M@np.array(lin(rgb))/np.array([0.95047,1,1.08883])
    f=np.where(xyz>0.008856,np.cbrt(xyz),7.787*xyz+16/116)
    return np.array([116*f[1]-16,500*(f[0]-f[1]),200*(f[1]-f[2])])
def de(l1,l2):  # CIEDE2000
    L1,a1,b1=l1;L2,a2,b2=l2
    C1=math.hypot(a1,b1);C2=math.hypot(a2,b2);Cb=(C1+C2)/2
    G=0.5*(1-math.sqrt(Cb**7/(Cb**7+25**7)))
    a1p=(1+G)*a1;a2p=(1+G)*a2
    C1p=math.hypot(a1p,b1);C2p=math.hypot(a2p,b2)
    h1=math.degrees(math.atan2(b1,a1p))%360;h2=math.degrees(math.atan2(b2,a2p))%360
    dL=L2-L1;dC=C2-C1p
    dh=h2-h1
    if C1p*C2p==0: dh=0
    elif dh>180: dh-=360
    elif dh<-180: dh+=360
    dH=2*math.sqrt(C1p*C2p)*math.sin(math.radians(dh/2))
    Lb=(L1+L2)/2;Cbp=(C1p+C2p)/2
    if C1p*C2p==0: hb=h1+h2
    elif abs(h1-h2)<=180: hb=(h1+h2)/2
    elif h1+h2<360: hb=(h1+h2+360)/2
    else: hb=(h1+h2-360)/2
    T=1-0.17*math.cos(math.radians(hb-30))+0.24*math.cos(math.radians(2*hb))+0.32*math.cos(math.radians(3*hb+6))-0.20*math.cos(math.radians(4*hb-63))
    SL=1+0.015*(Lb-50)**2/math.sqrt(20+(Lb-50)**2);SC=1+0.045*Cbp;SH=1+0.015*Cbp*T
    dt=30*math.exp(-((hb-275)/25)**2);RC=2*math.sqrt(Cbp**7/(Cbp**7+25**7));RT=-RC*math.sin(math.radians(2*dt))
    return math.sqrt((dL/SL)**2+(dC/SC)**2+(dH/SH)**2+RT*dC/SC*dH/SH)
# Machado 2009 severity 1.0, linear RGB
CVD={'protanopi':np.array([[0.152286,1.052583,-0.204868],[0.114503,0.786281,0.099216],[-0.003882,-0.048116,1.051998]]),
'döteranopi':np.array([[0.367322,0.860646,-0.227968],[0.280085,0.672501,0.047413],[-0.011820,0.042940,0.968881]]),
'tritanopi':np.array([[1.255528,-0.076749,-0.178779],[-0.078411,0.930809,0.147602],[0.004733,0.691367,0.303900]])}
def sim(h,m):
    v=np.clip(m@np.array(lin(h2r(h))),0,1)
    g=np.where(v<=0.0031308,12.92*v,1.055*v**(1/2.4)-0.055)
    return lab(list(g))
def pairs_report(cols):
    out={}
    labs={'normal':[lab(h2r(c)) for c in cols]}
    for k,m in CVD.items(): labs[k]=[sim(c,m) for c in cols]
    for k,L in labs.items():
        ds=[(de(L[i],L[j]),i,j) for i,j in itertools.combinations(range(len(cols)),2)]
        ds.sort()
        out[k]=dict(min=ds[0][0],min_pair=(ds[0][1],ds[0][2]),n_lt10=sum(1 for d in ds if d[0]<10),n_lt5=sum(1 for d in ds if d[0]<5),total=len(ds))
    return out

NAMES=['Kobalt','Turkuaz','Mercan','Zümrüt','Altın','Mor/Patlıcan','Karanfil pembe','Zeytin','Gök','Toprak/Tuğla']
PAT=['nokta','yatay çizgi','dikey çizgi','çapraz /','çapraz \\','ızgara','dalga','dama','artı','baklava']

P={}
P['a']=dict(
 name='Lale Bahçesi',
 light=dict(bg='#F6EEDD',surface='#FFFAEF',surface2='#EADFC6',text='#1D2842',text2='#4F5A73',accent='#1C4A9E',accent_ink='#FFFFFF',success='#17703F',danger='#B3261E',grid='#6E7791',border='#1D2842',stone='#1D2842',stone_ink='#F6EEDD',mark='#1D2842',
  r=['#7F9FE8','#6FD0C8','#F59C84','#86CC95','#F3DA7C','#D6B2E8','#F6B3C9','#B9C45E','#C3DDF3','#E6CBAF']),
 dark=dict(bg='#121A2E',surface='#1B2540',surface2='#26335C',text='#F3EBD8',text2='#B6BED2',accent='#F0B24A',accent_ink='#1A1405',success='#63CF92',danger='#FF8F80',grid='#7C86A6',border='#F3EBD8',stone='#F5EBD3',stone_ink='#1B2340',mark='#F5EBD3',
  r=['#2B52A8','#117F82','#B4452E','#2C7A48','#9A7712','#76459A','#A63D68','#4A5A12','#3C6E9C','#8A5E40']),
 radius='14px',shadow='0 2px 0 rgba(29,40,66,.12), 0 8px 20px rgba(29,40,66,.12)',
 display="'El Messiri'",ui="'Onest'")
P['b']=dict(
 name='Kobalt Sır',
 light=dict(bg='#EEF3F7',surface='#FFFFFF',surface2='#DCE6EE',text='#0C1B36',text2='#46556E',accent='#0B6E75',accent_ink='#FFFFFF',success='#1A7A45',danger='#C0201A',grid='rgba(255,255,255,.45)',border='#F4F7FA',stone='#FFFFFF',stone_ink='#0C1B36',mark='#FFFFFF',
  r=['#2457B3','#0E7C86','#C2412D','#1F7F4C','#A87500','#6D3F98','#B03470','#556008','#2F6FA8','#8A4E2B']),
 dark=dict(bg='#0A1424',surface='#122038',surface2='#1B2E50',text='#EAF1F7',text2='#A9B8CC',accent='#4FD1C5',accent_ink='#04201D',success='#5FD18E',danger='#FF8576',grid='rgba(234,241,247,.32)',border='#EAF1F7',stone='#F4F7FA',stone_ink='#0A1424',mark='#F4F7FA',
  r=['#1C4590','#0B6670','#A33322','#176A3E','#8A6000','#573079','#8E2A5A','#3F4B00','#245A8C','#7A4A28']),
 radius='10px',shadow='0 1px 0 rgba(12,27,54,.10), 0 6px 16px rgba(12,27,54,.14)',
 display="'Onest'",ui="'Onest'")

def cell_text_ok(t): return t
if __name__=='__main__':
    res={}
    for k,p in P.items():
        for th in ('light','dark'):
            d=p[th]; R=d['r']
            rows=[]
            rows.append(('text/bg',cr(d['text'],d['bg']),4.5))
            rows.append(('text/surface',cr(d['text'],d['surface']),4.5))
            rows.append(('text/surface-2',cr(d['text'],d['surface2']),4.5))
            rows.append(('text-2/bg',cr(d['text2'],d['bg']),4.5))
            rows.append(('text-2/surface',cr(d['text2'],d['surface']),4.5))
            rows.append(('accent-ink/accent',cr(d['accent_ink'],d['accent']),4.5))
            rows.append(('accent/bg',cr(d['accent'],d['bg']),3.0))
            rows.append(('success/bg',cr(d['success'],d['bg']),3.0))
            rows.append(('danger/bg',cr(d['danger'],d['bg']),3.0))
            if not d['grid'].startswith('rgba') or th=='dark': rows.append(('region-border/bg',cr(d['border'],d['bg']),3.0))
            for i,c in enumerate(R):
                rows.append((f'taş/r{i}',cr(d['stone'],c),3.0))
                rows.append((f'X/r{i}',cr(d['mark'],c),3.0))
                rows.append((f'sınır/r{i}',cr(d['border'],c),3.0))
                rows.append((f'taş motif/taş',cr(d['stone_ink'],d['stone']),3.0)) if i==0 else None
            res[(k,th)]=[r for r in rows if r]
            bad=[r for r in rows if r and r[1]<r[2]]
            print(k,th,'min:',min(r[1] for r in rows if r),'FAIL:',bad)
            print('  CVD',json.dumps({a:{x:(round(y,1) if isinstance(y,float) else y) for x,y in v.items()} for a,v in pairs_report(R).items()},ensure_ascii=False))
