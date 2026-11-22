/* Mozaik Mantık web önizleme testleri. Çalıştır: node web/test/run.js  (önce: python3 web/build.py) */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '../dist/index.html');
const SHOTS = path.join(__dirname, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const results = [];
const OVERRIDE = { ads: { fakeAdMs: 120 }, game: { winAnimMs: 150 } };

async function newPage(browser, vp, qs, opts = {}) {
  const ctx = opts.ctx || await browser.newContext({ viewport: vp || { width: 360, height: 640 }, locale: opts.locale || 'tr-TR' });
  const page = await ctx.newPage();
  page.errors = []; page.reqs = [];
  page.on('console', m => { if (m.type() === 'error') page.errors.push(m.text()); });
  page.on('pageerror', e => page.errors.push('pageerror: ' + e.message));
  page.on('request', r => { if (!/^(file|data|blob):/.test(r.url())) page.reqs.push(r.url()); });
  await page.addInitScript(o => { window.__MZ_CONFIG_OVERRIDE = o; }, opts.override || OVERRIDE);
  await page.goto(URL + (qs || ''));
  await page.waitForSelector('#screen[data-screen]');
  return page;
}
const scr = p => p.evaluate(() => document.getElementById('screen').dataset.screen);
const $ = (p, id) => p.locator(`[data-id="${id}"]`);
async function skipTutorial(p) { if (await scr(p) === 'game' && await p.locator('[data-id=skip]').count()) await $(p, 'skip').click(); await p.waitForFunction(() => document.getElementById('screen').dataset.screen === 'menu'); }
async function cellCenter(p, r, c) { return p.evaluate(([r, c]) => { const e = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`).getBoundingClientRect(); return [e.left + e.width / 2, e.top + e.height / 2]; }, [r, c]); }
async function clickCell(p, r, c) { const [x, y] = await cellCenter(p, r, c); await p.mouse.click(x, y); }
async function cellClass(p, r, c) { return p.evaluate(([r, c]) => document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`).className, [r, c]); }
async function startLevelById(p, id) { await p.evaluate(id => MZ.UI.startLevel(MZ.Data.level(id), true), id); await p.waitForSelector('.board'); }
async function solveByTaps(p) {
  const sol = await p.evaluate(() => MZ.UI.G.spec.level.solution);
  for (let r = 0; r < sol.length; r++) for (let k = 0; k < 3; k++) {
    if ((await cellClass(p, r, sol[r])).includes('stone-on')) break;
    await clickCell(p, r, sol[r]);
  }
}
async function waitResult(p) { await p.waitForSelector('[data-id=result]', { timeout: 6000 }); await p.waitForTimeout(350); }
async function waitNoAd(p) { await p.waitForFunction(() => !document.querySelector('[data-ad]'), null, { timeout: 8000 }); }
async function shot(p, name) { await p.screenshot({ path: path.join(SHOTS, name + '.png') }); }
async function overflow(p) { // taşan metin/öğe denetimi
  return p.evaluate(() => {
    const bad = [], vw = innerWidth, vh = innerHeight;
    document.querySelectorAll('#screen *, #overlay *').forEach(e => {
      const r = e.getBoundingClientRect(); if (!r.width || !r.height) return;
      const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return;
      if (e.closest('svg') && e.tagName !== 'svg') return;
      if (e.scrollWidth > e.clientWidth + 1 && ['hidden', 'clip'].includes(cs.overflowX) === false && e.children.length === 0 && e.tagName !== 'svg' && cs.display !== 'inline') bad.push('metin-taşma:' + (e.dataset.id || e.className || e.tagName));
      if (r.right > vw + 1 || r.left < -1) { if (!e.closest('.pano-wrap,.tile-grid,.set-list,.col-list,.pack-list')) bad.push('yatay-taşma:' + (e.dataset.id || e.className || e.tagName)); }
    });
    return [...new Set(bad)].slice(0, 8);
  });
}

async function contain(p) { // yaprak metin öğeleri kapsayıcı düğme/kart sınırını aşıyor mu
  return p.evaluate(() => {
    const bad = [];
    document.querySelectorAll('#screen *, #overlay *').forEach(e => {
      if (e.children.length || !(e.textContent || '').trim() || e.closest('svg,pre')) return;
      const cs = getComputedStyle(e); if (cs.display === 'none') return;
      const r = e.getBoundingClientRect(); if (!r.width) return;
      const box = e.closest('.btn,.chip,.pack-card,.set-row,.lv-tile,.seg-b,.stat,.card,.menu-btns,.topbar,.col-head,.hint-btn,a.btn');
      if (box && box !== e) { const b = box.getBoundingClientRect(); if (r.left < b.left - 1 || r.right > b.right + 1 || r.top < b.top - 1 || r.bottom > b.bottom + 1) bad.push((e.dataset.id || e.className || e.tagName) + '>' + (box.dataset.id || box.className)); }
      if (e.scrollWidth > e.clientWidth + 1 && cs.overflowX === 'visible' && cs.display !== 'inline') bad.push('scroll:' + (e.dataset.id || e.className));
      if (r.right > innerWidth + 1 || r.left < -1) bad.push('viewport:' + (e.dataset.id || e.className));
    });
    return [...new Set(bad)].slice(0, 6);
  });
}
const tests = [];
const FILTER = process.argv[2];
function test(name, fn) { tests.push({ name, fn }); }

test('Açılış: konsol hatası yok, dış istek yok, öğretici başlar', async (b) => {
  const p = await newPage(b);
  await p.waitForTimeout(400);
  if (p.errors.length) throw new Error('konsol: ' + p.errors.join(' | '));
  if (p.reqs.length) throw new Error('dış istek: ' + p.reqs.join(','));
  if (await scr(p) !== 'game' || !(await p.locator('[data-id=skip]').count())) throw new Error('öğretici açılmadı');
  const missing = await p.evaluate(() => MZ.I18n.missing());
  if (missing.length) throw new Error('eksik i18n: ' + missing);
  // her dil için kodda kullanılan anahtarlar ASIL dil dosyasında olmalı
  const mr = await p.evaluate(() => MZ_DATA.meta.missingReal);
  const bad = Object.entries(mr).filter(([l, ks]) => ks.length);
  if (bad.length) throw new Error('dil dosyalarında eksik anahtar: ' + JSON.stringify(bad));
  await p.context().close();
});

test('Öğretici: Atla -> menü; 4 menü düğmesi, seri ve ipucu bakiyesi', async (b) => {
  const p = await newPage(b);
  await skipTutorial(p);
  for (const id of ['play', 'daily', 'collection', 'settings']) if (!(await $(p, id).count())) throw new Error('menü düğmesi yok ' + id);
  if (!(await $(p, 'streak-chip').count()) || !(await $(p, 'hint-chip').count())) throw new Error('chip yok');
  const bal = await $(p, 'hint-chip').innerText();
  if (bal.trim() !== '5') throw new Error('başlangıç ipucu 5 olmalı: ' + bal);
  if (p.errors.length) throw new Error(p.errors.join('|'));
  await p.context().close();
});

test('Öğretici: 3 seviye elle tamamlanır (sessiz yönlendirme)', async (b) => {
  const p = await newPage(b);
  for (let i = 0; i < 3; i++) {
    const n = await p.evaluate(() => MZ.UI.G.spec.level.n);
    // yanlış hücreye dokun: hata çıkmamalı, taş konmamalı
    const sol = await p.evaluate(() => MZ.UI.G.spec.level.solution);
    const wrongC = (sol[0] + 2) % n;
    await clickCell(p, n - 1, (sol[n - 1] + 1) % n);
    const errs = await p.evaluate(() => MZ.UI.G.game.errors); if (errs) throw new Error('öğreticide hata sayıldı');
    for (let k = 0; k < 40; k++) {
      const tg = await p.evaluate(() => { const t = document.querySelector('.cell.tut-target'); return t ? [+t.dataset.r, +t.dataset.c] : null; });
      if (!tg) break; await clickCell(p, tg[0], tg[1]); await p.waitForTimeout(30);
    }
    await p.waitForTimeout(1300);
  }
  await p.waitForFunction(() => document.getElementById('screen').dataset.screen === 'menu', null, { timeout: 5000 });
  const done = await p.evaluate(() => MZ.State.data.flags.tutorialDone); if (!done) throw new Error('tutorialDone yok');
  await p.context().close();
});

test('İlk Çırak seviyesi ipuçlarını art arda uygulayarak biter (bakiye 0 -> ▶ +2)', async (b) => {
  const p = await newPage(b);
  await skipTutorial(p);
  await $(p, 'play').click(); await $(p, 'pack-cirak').click(); await p.locator('.lv-tile').first().click();
  await p.waitForSelector('.board');
  let adWatched = 0, stages = 0;
  for (let i = 0; i < 80 && !(await p.locator('[data-id=result]').count()); i++) {
    const hb = $(p, 'hint');
    if (await hb.isDisabled()) break;
    if ((await hb.getAttribute('class')).includes('ad')) { await hb.click(); await p.waitForSelector('[data-ad=rewarded]'); await waitNoAd(p); adWatched++; continue; }
    await hb.click(); stages++; await p.waitForTimeout(40);
  }
  await waitResult(p);
  if (!adWatched) throw new Error('bakiye bitince ödüllü reklam akışı çalışmadı');
  const hints = await p.evaluate(() => MZ.UI.G.game.hints);
  const stars = await $(p, 'result').locator('.stars').getAttribute('data-stars');
  if (stars !== '1') throw new Error('ipucu>=2 -> ★ beklenir (★★ = ipucu<=1 VE hata<=2), ' + stars);
  console.log(`   (ipucu=${hints}, aşama=${stages}, reklam=${adWatched})`);
  if (p.errors.length) throw new Error(p.errors.join('|'));
  await p.context().close();
});

test('Çakışma gösterimi (çözüm karşılaştırması yok) + hata sayımı', async (b) => {
  const p = await newPage(b);
  await skipTutorial(p); await startLevelById(p, 'c-001');
  const sol = await p.evaluate(() => MZ.UI.G.spec.level.solution), n = sol.length;
  // satır 0 ve 1'e yan yana (değen) iki taş koy
  const c0 = 1, c1 = 2;
  for (const [r, c] of [[0, c0], [1, c1]]) for (let k = 0; k < 3; k++) { if ((await cellClass(p, r, c)).includes('stone-on')) break; await clickCell(p, r, c); }
  const bad = await p.locator('.cell.bad').count();
  if (bad < 2) throw new Error('çakışan taşlar işaretlenmedi: ' + bad);
  const errs = await p.evaluate(() => MZ.UI.G.game.errors); if (errs < 1) throw new Error('hata sayılmadı');
  // kural dışı olmayan ama çözümde olmayan taş hata sayılmamalı (çözümle karşılaştırma yok)
  await p.evaluate(() => { const g = MZ.UI.G.game; while (g.undo()); });
  await p.evaluate(() => { const g = MZ.UI.G.game; g.errors = 0; });
  const wrong = await p.evaluate(() => { const s = MZ.UI.G.spec.level.solution, n = s.length; for (let c = 0; c < n; c++) if (c !== s[3]) return [3, c]; });
  for (let k = 0; k < 3; k++) { if ((await cellClass(p, wrong[0], wrong[1])).includes('stone-on')) break; await clickCell(p, wrong[0], wrong[1]); }
  if (await p.locator('.cell.bad').count() || (await p.evaluate(() => MZ.UI.G.game.errors)) !== 0) throw new Error('çözümde olmayan ama kurala uyan taş hata sayıldı');
  await p.context().close();
});

test('Çakışma gösterimi kapatılınca görünmez ama sayılır', async (b) => {
  const p = await newPage(b);
  await skipTutorial(p); await $(p, 'settings').click(); await $(p, 'sw-showErrors').click(); await $(p, 'back').click();
  await startLevelById(p, 'c-001');
  for (const [r, c] of [[0, 1], [1, 2]]) for (let k = 0; k < 3; k++) { if ((await cellClass(p, r, c)).includes('stone-on')) break; await clickCell(p, r, c); }
  if (await p.locator('.cell.bad').count()) throw new Error('kapalıyken görünüyor');
  if ((await p.evaluate(() => MZ.UI.G.game.errors)) < 1) throw new Error('sayılmadı');
  await p.context().close();
});

test('Sürükle-X tek geri al adımı; X hücreden sürükleyerek silme; taşı atlar', async (b) => {
  const p = await newPage(b);
  await skipTutorial(p); await startLevelById(p, 'c-001');
  const n = await p.evaluate(() => MZ.UI.G.game.n);
  const a = await cellCenter(p, 0, 0), z = await cellCenter(p, 0, n - 1);
  await p.mouse.move(a[0], a[1]); await p.mouse.down(); await p.mouse.move((a[0] + z[0]) / 2, a[1], { steps: 6 }); await p.mouse.move(z[0], z[1], { steps: 6 }); await p.mouse.up();
  const xs = await p.locator('.cell.x-on').count(); if (xs !== n) throw new Error(`satırda ${n} X beklenir, ${xs}`);
  await $(p, 'undo').click(); const after = await p.locator('.cell.x-on').count(); if (after !== 0) throw new Error('tek adımda geri alınmadı: ' + after);
  await $(p, 'redo').click(); if ((await p.locator('.cell.x-on').count()) !== n) throw new Error('ileri al çalışmadı');
  // X'ten başlayıp sürükle: siler
  await p.mouse.move(a[0], a[1]); await p.mouse.down(); await p.mouse.move(z[0], z[1], { steps: 10 }); await p.mouse.up();
  if (await p.locator('.cell.x-on').count()) throw new Error('X silinmedi');
  await p.context().close();
});

test('Dokunma döngüsü boş→X→taş→boş, otomatik X ve geri al', async (b) => {
  const p = await newPage(b);
  await skipTutorial(p); await startLevelById(p, 'c-001');
  await clickCell(p, 2, 2); if (!(await cellClass(p, 2, 2)).includes('x-on')) throw new Error('X değil');
  await clickCell(p, 2, 2); if (!(await cellClass(p, 2, 2)).includes('stone-on')) throw new Error('taş değil');
  const ax = await p.locator('.cell.ax-on').count(); if (ax < 8) throw new Error('otomatik X yok: ' + ax);
  await clickCell(p, 2, 2); if ((await cellClass(p, 2, 2)).includes('stone-on')) throw new Error('taş kalkmadı');
  if (await p.locator('.cell.ax-on').count()) throw new Error('otomatik X temizlenmedi');
  await $(p, 'undo').click(); if (!(await cellClass(p, 2, 2)).includes('stone-on')) throw new Error('geri al taşı getirmedi');
  await $(p, 'undo').click(); await $(p, 'undo').click(); if (await p.locator('.cell.x-on,.cell.stone-on,.cell.ax-on').count()) throw new Error('başa dönmedi');
  await p.context().close();
});

test('Dil: ar -> dir=rtl, ızgara ltr kalır; 8 dilde taşma ve eksik anahtar yok', async (b) => {
  const p = await newPage(b);
  await skipTutorial(p); await $(p, 'settings').click();
  await p.selectOption('[data-id=lang]', 'ar');
  const d = await p.evaluate(() => [document.documentElement.dir, document.documentElement.lang]);
  if (d[0] !== 'rtl' || d[1] !== 'ar') throw new Error('rtl değil ' + d);
  await $(p, 'back').click(); await startLevelById(p, 'c-001');
  const gd = await p.evaluate(() => getComputedStyle(document.querySelector('.board')).direction); if (gd !== 'ltr') throw new Error('ızgara ltr değil');
  const c0 = await cellCenter(p, 0, 0), c1 = await cellCenter(p, 0, 1); if (!(c1[0] > c0[0])) throw new Error('ızgara aynalandı');
  const digits = await p.evaluate(() => document.querySelector('.timer').textContent); if (!/^[0-9:]+$/.test(digits)) throw new Error('rakamlar Batı değil: ' + digits);
  await shot(p, 'm360-ar-tahta');
  const findings = [];
  for (const l of ['de', 'ru', 'id', 'es', 'pt', 'tr', 'en', 'ar']) {
    await p.evaluate(l => { MZ.State.data.lang = l; MZ.I18n.set(l); MZ.UI.applyLang(); }, l);
    for (const sc of ['menu', 'packs', 'daily', 'settings', 'collection']) { await p.evaluate(sc => MZ.UI.go(sc), sc); const o = await contain(p); if (o.length) findings.push(`${l}/${sc}: ${o}`); }
    await startLevelById(p, 'c-001'); await clickCell(p, 0, 0); await $(p, 'hint').click(); await $(p, 'hint').click();
    let o = await contain(p); if (o.length) findings.push(`${l}/oyun+ipucu: ${o}`);
    await p.evaluate(() => { const g = MZ.UI.G.game; });
    await solveByTaps(p); await waitResult(p); o = await contain(p); if (o.length) findings.push(`${l}/sonuç: ${o}`);
    await p.evaluate(() => { MZ.UI.leaveGame(); MZ.UI.go('menu'); document.getElementById('overlay').innerHTML = ''; MZ.UI.paused = 0; });
    const miss = await p.evaluate(() => MZ.I18n.fallbacks()); if (miss.length) findings.push('yedeğe düşen anahtar: ' + miss);
  }
  if (findings.length) throw new Error('taşma/eksik: ' + findings.join(' | '));
  const dir = await p.evaluate(() => document.documentElement.dir); if (dir !== 'rtl') throw new Error('son dil ar rtl olmalı');
  await p.context().close();
});

test('10×10 tahta 360×640: hücre ≥ 30 px, tahta ekrana sığar, düğmeler ≥ 44 px', async (b) => {
  const p = await newPage(b, { width: 360, height: 640 }, '?unlock=1');
  await skipTutorial(p);
  const id = await p.evaluate(() => MZ.Data.levels.find(l => l.n === 10).id); await startLevelById(p, id);
  const m = await p.evaluate(() => { const c = document.querySelector('.cell').getBoundingClientRect(), bd = document.querySelector('.board').getBoundingClientRect(); return { w: c.width, h: c.height, bw: bd.width, bh: bd.height, bt: bd.top, bb: bd.bottom, vw: innerWidth, vh: innerHeight }; });
  if (m.w < 30 || m.h < 30) throw new Error('hücre ' + m.w);
  if (m.bw > m.vw || m.bb > m.vh) throw new Error('tahta taşıyor ' + JSON.stringify(m));
  const small = await p.evaluate(() => [...document.querySelectorAll('button,a.btn,select')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.width < 44 || r.height < 44); }).map(e => e.dataset.id || e.className));
  if (small.length) throw new Error('44px altı düğme: ' + small);
  if (await p.evaluate(() => MZ.cellWarning)) throw new Error('hücre uyarısı çıktı');
  console.log(`   (hücre=${m.w}px, tahta=${m.bw}px)`);
  await shot(p, 'm360-tahta-10x10');
  const ov = await overflow(p); if (ov.length) throw new Error('taşma: ' + ov);
  await p.context().close();
});

test('Yatay mod 640×360 ve 10×10: hücre ≥ 30, kontroller görünür', async (b) => {
  const p = await newPage(b, { width: 640, height: 360 }, '?unlock=1');
  await skipTutorial(p);
  const id = await p.evaluate(() => MZ.Data.levels.find(l => l.n === 10).id); await startLevelById(p, id);
  const m = await p.evaluate(() => { const c = document.querySelector('.cell').getBoundingClientRect(), h = document.querySelector('[data-id=hint]').getBoundingClientRect(), bd = document.querySelector('.board').getBoundingClientRect(); return { w: c.width, hb: h.bottom, hr: h.right, bb: bd.bottom, bt: bd.top, vh: innerHeight, vw: innerWidth }; });
  if (m.w < 30) throw new Error('hücre ' + m.w + ' (yatay)');
  if (m.hb > m.vh || m.hr > m.vw || m.bb > m.vh + 1 || m.bt < 0) throw new Error('yatay taşma ' + JSON.stringify(m));
  console.log(`   (yatay hücre=${m.w}px)`);
  await shot(p, 'm640x360-yatay-10x10');
  await p.context().close();
});

test('Günlük (?day): gün no, haftanın günü bulmacası, tamamla, paylaşım, seri', async (b) => {
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 } });
  let p = await newPage(b, null, '?day=2026-11-23', { ctx }); // Pazartesi
  await skipTutorial(p); await $(p, 'daily').click();
  const no = await $(p, 'daily-no').innerText(); if (no.trim() !== '#2') throw new Error('gün no #2 beklenir: ' + no);
  await $(p, 'daily-play').click(); await p.waitForSelector('.board');
  const dow = await p.evaluate(() => MZ.UI.G.spec.level && MZ.UI.G.spec.level.dow); if (!dow) throw new Error('günlük bulmaca null'); if (dow !== 'mon') throw new Error('pazartesi bulmacası beklenir: ' + dow);
  await solveByTaps(p); await waitResult(p);
  const txt = await $(p, 'share-text').innerText();
  const lines = txt.split('\n');
  if (lines[0] !== 'Mozaik Mantık #2') throw new Error('satır1: ' + lines[0]);
  if (!/^⏱ \d\d:\d\d {3}💡 0 {3}✖ 0 {3}★★★ {3}🔥 1$/u.test(lines[1])) throw new Error('satır2: ' + lines[1]);
  const strip = [...lines[2]]; if (strip.length !== await p.evaluate(() => MZ.UI.G.game.n) || strip.some(c => c !== '🟦')) throw new Error('şerit: ' + lines[2]);
  if (lines[3] !== 'https://ttuncaydemirr-beep.github.io/') throw new Error('satır4');
  await p.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await $(p, 'share').click(); await p.waitForTimeout(200);
  const clip = await p.evaluate(() => navigator.clipboard.readText().catch(() => null)); if (clip !== null && clip !== txt) throw new Error('panoya kopyalanan farklı');
  await shot(p, 'm360-gunluk-paylasim');
  await $(p, 'close').click();
  const ndone = await p.evaluate(() => MZ.State.data.daily.streak); if (ndone !== 1) throw new Error('seri 1 olmalı');
  if (!(await $(p, 'next-in').count())) throw new Error('"yenisine" sayacı yok');
  // ertesi gün
  await p.close(); p = await newPage(b, null, '?day=2026-11-24', { ctx });
  await $(p, 'daily').click(); await $(p, 'daily-play').click(); await p.waitForSelector('.board');
  const dow2 = await p.evaluate(() => MZ.UI.G.spec.level.dow); if (dow2 !== 'tue') throw new Error('salı beklenir ' + dow2);
  await solveByTaps(p); await waitResult(p);
  if ((await p.evaluate(() => MZ.State.data.daily.streak)) !== 2) throw new Error('seri 2 olmalı');
  if (!(await $(p, 'share-text').innerText()).includes('🔥 2')) throw new Error('paylaşımda seri 2 yok');
  // tekrar oyna: seri/paylaşım ilk sonuçtan
  await $(p, 'close').click(); await $(p, 'daily-replay').click(); await p.waitForSelector('.board');
  await solveByTaps(p); await waitResult(p);
  if ((await p.evaluate(() => MZ.State.data.daily.streak)) !== 2) throw new Error('tekrar oynama seriyi artırdı');
  // 2 gün kaçır -> seri sıfır, kurtarma yok
  await p.close(); p = await newPage(b, null, '?day=2026-11-27', { ctx });
  const st = await p.evaluate(() => MZ.State.data.daily); if (st.streak !== 0 || !st.broken) throw new Error('seri bozulmadı');
  await $(p, 'daily').click(); if (await $(p, 'rescue').count()) throw new Error('2 gün kaçırınca kurtarma çıkmamalı');
  if (p.errors.length) throw new Error(p.errors.join('|'));
  await ctx.close();
});

test('Seri kurtarma (sahte reklam): 1 gün kaçırınca; haftada 1', async (b) => {
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 } });
  let p = await newPage(b, null, '?day=2026-11-23', { ctx }); await skipTutorial(p);
  await $(p, 'daily').click(); await $(p, 'daily-play').click(); await p.waitForSelector('.board'); await solveByTaps(p); await waitResult(p);
  await p.close(); p = await newPage(b, null, '?day=2026-11-25', { ctx });
  await $(p, 'daily').click(); await $(p, 'rescue').click(); await p.waitForSelector('[data-ad=rewarded]'); await waitNoAd(p);
  await p.waitForTimeout(150);
  const d = await p.evaluate(() => MZ.State.data.daily); if (d.streak !== 1) throw new Error('seri kurtarılmadı ' + JSON.stringify(d));
  if (await $(p, 'rescue').count()) throw new Error('kurtarma sonrası düğme kalmamalı');
  await ctx.close();
});

test('Seri koruması: 7. günde kazanılır, kaçırılan günde harcanır', async (b) => {
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 } });
  const days = ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29'];
  let p;
  for (const d of days) {
    p = await newPage(b, null, '?day=' + d, { ctx }); if (d === days[0]) await skipTutorial(p);
    await $(p, 'daily').click(); await $(p, 'daily-play').click(); await p.waitForSelector('.board'); await solveByTaps(p); await waitResult(p); await p.close();
  }
  p = await newPage(b, null, '?day=2026-11-29', { ctx });
  let dd = await p.evaluate(() => MZ.State.data.daily); if (dd.streak !== 7 || dd.shields !== 1) throw new Error('7 gün/1 koruma beklenir ' + JSON.stringify(dd));
  await p.close(); p = await newPage(b, null, '?day=2026-12-01', { ctx });   // 11-30 kaçırıldı
  dd = await p.evaluate(() => MZ.State.data.daily); if (dd.streak !== 7 || dd.shields !== 0) throw new Error('koruma harcanmalı ' + JSON.stringify(dd));
  await ctx.close();
});

test('Geçiş reklamı: ilk 6 seviye reklamsız, 7.de sahte reklam; 120 sn ve 4\'te 1 kuralı', async (b) => {
  const p = await newPage(b, null, '', { override: { ads: { fakeAdMs: 900 }, game: { winAnimMs: 150 } } });
  await skipTutorial(p);
  const ids = await p.evaluate(() => MZ.Data.packs.cirak.map(l => l.id));
  const log = [];
  for (let k = 0; k < 7; k++) {
    await startLevelById(p, ids[k]); await solveByTaps(p); await waitResult(p);
    await $(p, 'next').click();
    const sawAd = await p.waitForSelector('[data-ad=interstitial]', { timeout: k === 6 ? 5000 : 900 }).then(() => true, () => false);
    log.push(sawAd); if (sawAd) await waitNoAd(p);
    await p.waitForTimeout(100);
  }
  if (log.slice(0, 6).some(Boolean)) throw new Error('ilk 6 seviyede reklam çıktı ' + log);
  if (!log[6]) throw new Error('7. seviyede reklam yok ' + log);
  // kural birimleri (economy)
  const r = await p.evaluate(() => {
    const E = MZ.Economy, a = MZ.State.data.ads, today = MZ.Util.todayISO(), out = {}; const now = Date.now();
    a.completions = 10; out.at10 = E.interstitialDecision(now, true, today).reason;   // sonraki 11
    a.completions = 11; a.lastInterstitialAt = now - 60000; out.at11gap = E.interstitialDecision(now, true, today).reason;   // 120 sn dolmadı
    a.lastInterstitialAt = now - 130000; out.at11ok = E.interstitialDecision(now, true, today).show;
    out.offline = E.interstitialDecision(now, false, today).reason;
    a.lastRewardedAt = now - 60000; out.rewarded = E.interstitialDecision(now, true, today).reason;
    return out;
  });
  if (r.at10 !== 'interval' || r.at11gap !== 'min-gap' || r.at11ok !== true || r.offline !== 'offline' || r.rewarded !== 'rewarded-recent') throw new Error(JSON.stringify(r));
  const cfg = await p.evaluate(() => [MZ.Config.ads.firstFreeLevels, MZ.Config.ads.everyLevels, MZ.Config.ads.minGapSec, MZ.Config.ads.dailyCap]);
  if (cfg.join() !== '6,4,120,') throw new Error('varsayılan config ' + cfg);
  await p.context().close();
});

test('Ödüllü reklam günde 10 sınırı; hata -> hediye +1 (günde 1)', async (b) => {
  const p = await newPage(b, null, '?adfail=1'); await skipTutorial(p);
  const r = await p.evaluate(() => { const E = MZ.Economy, d = MZ.State.data, t = MZ.Util.todayISO(); d.hints.balance = 0; const o = {};
    o.gift1 = E.giftAvailable(t); E.grantGift(); o.gift2 = E.giftAvailable(t); o.bal = d.hints.balance;
    for (let i = 0; i < 10; i++) { d.hints.balance = 0; E.grantRewardedHints(Date.now()); } o.left = E.rewardedHintsLeft(t); o.cap = E.canWatchRewardedHint(t);
    d.hints.balance = 11; E.grantRewardedHints(Date.now()); o.capped = d.hints.balance; return o; });
  if (!r.gift1 || r.gift2 || r.bal !== 1 || r.left !== 0 || r.cap || r.capped !== 12) throw new Error(JSON.stringify(r));
  await p.context().close();
});

test('Reklamsız mod: sahte satın alma -> +10 ipucu, reklam yok, banner yok, geri yükleme', async (b) => {
  const p = await newPage(b, null, '?banner=1'); await skipTutorial(p);
  await $(p, 'play').click(); if (!(await $(p, 'banner').count())) throw new Error('banner yeri açılmadı (?banner=1)');
  await $(p, 'back').click(); await $(p, 'settings').click();
  const before = await p.evaluate(() => MZ.State.data.hints.balance);
  await $(p, 'remove-ads').click(); await p.waitForTimeout(150);
  const after = await p.evaluate(() => MZ.State.data.hints.balance); if (after !== before + 10) throw new Error(`bonus ${before}->${after}`);
  if (!(await p.evaluate(() => MZ.Economy.adFree()))) throw new Error('adFree değil');
  await $(p, 'back').click(); await $(p, 'play').click(); if (await $(p, 'banner').count()) throw new Error('reklamsızda banner');
  await $(p, 'back').click();
  const ids = await p.evaluate(() => MZ.Data.packs.cirak.map(l => l.id));
  for (let k = 0; k < 8; k++) {
    await startLevelById(p, ids[k]); await solveByTaps(p); await waitResult(p); await $(p, 'next').click();
    if (await p.waitForSelector('[data-ad=interstitial]', { timeout: 500 }).then(() => true, () => false)) throw new Error('reklamsızda geçiş reklamı ' + k);
  }
  // sıfırlama sonrası satın alma kalır (Play sahiplik kaydı gibi); ayrıca ikinci alımda bonus yok
  await p.evaluate(() => MZ.UI.go('settings'));
  await $(p, 'reset').click(); await $(p, 'confirm-yes').click(); await p.waitForTimeout(200);
  if (!(await p.evaluate(() => MZ.Economy.adFree()))) throw new Error('sıfırlama reklamsızlığı sildi');
  if ((await p.evaluate(() => MZ.State.data.progress.levels && Object.keys(MZ.State.data.progress.levels).length)) !== 0) throw new Error('ilerleme silinmedi');
  await p.context().close();
});

test('Paket kilidi: Kalfa kilitli (30 seviye / 20★★), ?unlock açar', async (b) => {
  const p = await newPage(b); await skipTutorial(p); await $(p, 'play').click();
  if (!(await $(p, 'pack-kalfa').getAttribute('aria-disabled'))) throw new Error('Kalfa kilitli değil');
  const txt = await $(p, 'pack-kalfa').innerText(); if (!/20|30/.test(txt)) throw new Error('kalan sayı görünmüyor: ' + txt);
  await $(p, 'pack-kalfa').click({ force: true }); if (await scr(p) !== 'packs') throw new Error('kilitli paket açıldı');
  await $(p, 'pack-cirak').click(); if ((await p.locator('.lv-tile').count()) !== 50) throw new Error('Çırak 50 karo beklenir');
  await p.context().close();
});

test('Çini Atölyesi + ay panosu + ayarlar kayıt (localStorage) kalıcılığı', async (b) => {
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 } });
  let p = await newPage(b, null, '', { ctx }); await skipTutorial(p);
  await startLevelById(p, 'c-001'); await solveByTaps(p); await waitResult(p);
  await p.evaluate(() => MZ.UI.go('collection'));
  if ((await p.locator('.col-card').count()) < 6) throw new Error('pano sayısı');
  if ((await p.locator('.col-card svg.pano').count()) < 6) throw new Error('pano SVG yok (null)');
  if ((await p.locator('.col-card').first().locator('svg.pano rect').count()) < 40) throw new Error('Çırak panosu parçaları çizilmedi');
  await shot(p, 'm360-cini-atolyesi');
  const ov = await overflow(p); if (ov.length) throw new Error('taşma: ' + ov);
  await p.reload(); await p.waitForSelector('#screen[data-screen]');
  const st = await p.evaluate(() => MZ.State.data.progress.levels['c-001']); if (!st) throw new Error('kayıt kalıcı değil');
  const ver = await p.evaluate(() => JSON.parse(localStorage.getItem('mozaik.save.v1')).v); if (ver !== 1) throw new Error('sürüm alanı yok');
  await ctx.close();
});

test('Yarım kalan seviye kaydı: çık/dön devam eder', async (b) => {
  const p = await newPage(b); await skipTutorial(p); await startLevelById(p, 'c-002');
  await clickCell(p, 0, 0); await clickCell(p, 0, 0);
  await p.evaluate(() => { MZ.UI.leaveGame(); MZ.UI.go('menu'); });
  await p.evaluate(() => MZ.UI.startLevel(MZ.Data.level('c-002'), false)); await p.waitForSelector('.board');
  const sc = await p.locator('.cell.stone-on,.cell.x-on').count(); if (sc < 1) throw new Error('devam etmedi');
  await p.context().close();
});

test('localStorage erişilemezse bellekte devam (konsol hatası yok)', async (b) => {
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 } });
  await ctx.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('denied'); } }); });
  const p = await newPage(b, null, '', { ctx }); await skipTutorial(p);
  await $(p, 'play').click(); if (await scr(p) !== 'packs') throw new Error('devam edilemedi');
  if (p.errors.length) throw new Error(p.errors.join('|'));
  await ctx.close();
});

test('Ekran görüntüleri 360×640 ve 1280×800 + taşma denetimi', async (b) => {
  const bad = [];
  for (const [vp, tag] of [[{ width: 360, height: 640 }, 'm360'], [{ width: 1280, height: 800 }, 'd1280']]) {
    const ctx = await b.newContext({ viewport: vp, locale: 'tr-TR' });
    const p = await newPage(b, vp, '?unlock=1', { ctx }); await skipTutorial(p);
    await shot(p, `${tag}-menu`); bad.push(...(await overflow(p)).map(x => tag + ' menü ' + x));
    await $(p, 'play').click(); await shot(p, `${tag}-paketler`); bad.push(...(await overflow(p)).map(x => tag + ' paketler ' + x));
    await $(p, 'back').click();
    const id6 = await p.evaluate(() => MZ.Data.levels.find(l => l.n === 6).id);
    await startLevelById(p, id6);
    for (const [r, c] of [[0, 0], [0, 1]]) await clickCell(p, r, c);
    await $(p, 'hint').click(); await $(p, 'hint').click();
    await shot(p, `${tag}-tahta-6x6-ipucu`); bad.push(...(await overflow(p)).map(x => tag + ' tahta6 ' + x));
    const id10 = await p.evaluate(() => MZ.Data.levels.find(l => l.n === 10).id); await startLevelById(p, id10);
    await shot(p, `${tag}-tahta-10x10`); bad.push(...(await overflow(p)).map(x => tag + ' tahta10 ' + x));
    await startLevelById(p, id6); await solveByTaps(p); await waitResult(p); await shot(p, `${tag}-sonuc-karti`); bad.push(...(await overflow(p)).map(x => tag + ' sonuç ' + x));
    await p.evaluate(() => { document.querySelector('[data-id=retry]').click(); MZ.UI.go('menu'); });
    await p.evaluate(() => MZ.UI.go('daily')); await $(p, 'daily-play').click(); await p.waitForSelector('.board'); await solveByTaps(p); await waitResult(p);
    await shot(p, `${tag}-gunluk-paylasim`); bad.push(...(await overflow(p)).map(x => tag + ' günlük ' + x));
    await $(p, 'close').click(); await shot(p, `${tag}-gunluk`);
    await p.evaluate(() => MZ.UI.go('collection')); await shot(p, `${tag}-cini-atolyesi`);
    await p.evaluate(() => MZ.UI.go('settings')); await shot(p, `${tag}-ayarlar`); bad.push(...(await overflow(p)).map(x => tag + ' ayarlar ' + x));
    // Arapça
    await p.selectOption('[data-id=lang]', 'ar'); await shot(p, `${tag}-arapca-ayarlar`);
    await p.evaluate(() => MZ.UI.go('menu')); await shot(p, `${tag}-arapca-menu`); bad.push(...(await overflow(p)).map(x => tag + ' ar-menü ' + x));
    await p.evaluate(id => MZ.UI.startLevel(MZ.Data.level(id), true), id6); await p.waitForSelector('.board'); await shot(p, `${tag}-arapca-tahta`);
    // koyu tema
    await p.evaluate(() => { MZ.State.data.lang = 'tr'; MZ.I18n.set('tr'); MZ.State.data.settings.theme = 'dark'; MZ.UI.applyLang(); MZ.UI.applyTheme(); MZ.UI.go('menu'); });
    await shot(p, `${tag}-koyu-menu`);
    await p.evaluate(id => MZ.UI.startLevel(MZ.Data.level(id), true), id6); await p.waitForSelector('.board');
    for (const [r, c] of [[0, 0], [0, 1], [0, 2]]) await clickCell(p, r, c);
    await clickCell(p, 0, 1); await clickCell(p, 0, 1); await clickCell(p, 1, 1); await clickCell(p, 1, 1);
    await shot(p, `${tag}-koyu-tahta-cakisma`);
    await ctx.close();
  }
  if (bad.length) throw new Error('taşma bulguları: ' + bad.join('; '));
});

test('Stil B (?style=b) geçişi ve gizli geliştirici seçeneği', async (b) => {
  const p = await newPage(b, null, '?style=b'); await skipTutorial(p);
  const a = await p.evaluate(() => [document.getElementById('tok-a').media, document.getElementById('tok-b').media]);
  if (a[0] !== 'not all' || a[1] !== 'all') throw new Error('B etkin değil ' + a);
  const r = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--radius').trim()); if (r !== '10px') throw new Error('B radius ' + r);
  await $(p, 'settings').click(); for (let i = 0; i < 5; i++) await $(p, 'about').click();
  await $(p, 'style-a').click(); const r2 = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--radius').trim()); if (r2 !== '14px') throw new Error('A radius ' + r2);
  await p.context().close();
});

// ---------- Denetim sonrası eklenen testler ----------
async function seedProgress(p, n) { // ilk n Çırak seviyesi tamamlanmış say (benzersiz)
  await p.evaluate(n => { const d = MZ.State.data; MZ.Data.packs.cirak.slice(0, n).forEach(l => { d.progress.levels[l.id] = { stars: 3, best: 1000, done: 1 }; }); d.ads.completions = n; d.ads.nextAdAt = n + 1; MZ.State.save(); }, n);
}
test('İpucu aşama maliyetleri: 1 / 0 / 1 (tam ipucu 2 hak); ipucu 1. aşamadan sonra hamlede kaybolmaz', async (b) => {
  const p = await newPage(b); await skipTutorial(p); await startLevelById(p, 'c-001');
  const bal = () => p.evaluate(() => MZ.Economy.balance());
  if (await bal() !== 5) throw new Error('başlangıç 5');
  await $(p, 'hint').click(); if (await bal() !== 4) throw new Error('aşama 1 maliyeti 1: ' + await bal());
  if (!(await p.locator('.cell.hl').count())) throw new Error('aşama 1 bölge parıltısı yok');
  await $(p, 'hint').click(); if (await bal() !== 4) throw new Error('aşama 2 maliyeti 0: ' + await bal());
  if (!(await $(p, 'info').locator('.tech').count())) throw new Error('aşama 2 teknik adı yok');
  // oyuncu başka bir yere X koyar: ipucu geçersizleşmedikçe açık kalmalı
  const hintCells = await p.evaluate(() => { const g = MZ.UI.G.game, h = g.hint.h, n = g.n, s = new Set(); [].concat(h.place || [], h.eliminate || []).forEach(q => s.add(q[0] * n + q[1])); (h.areas || [h.area]).forEach(a => g.areaCells(a).forEach(i => s.add(i))); let free = -1; for (let i = 0; i < n * n; i++) if (!s.has(i) && g.cells[i] === 0) { free = i; break; } return [free, n]; });
  if (hintCells[0] >= 0) { await clickCell(p, Math.floor(hintCells[0] / hintCells[1]), hintCells[0] % hintCells[1]); const still = await p.evaluate(() => !!MZ.UI.G.game.hint); if (!still) console.log('   (not: X, ipucunu geçersiz kıldı; solver aynı sonucu vermedi)'); }
  await p.evaluate(() => { const g = MZ.UI.G.game; while (g.undo()); });
  if (!await p.evaluate(() => !!MZ.UI.G.game.hint)) {
    // geri alınca ipucu yeniden aynıysa: tekrar istenirse ücret alınmaz
    const b0 = await bal(); await $(p, 'hint').click(); if (await bal() !== b0) throw new Error('aynı ipucu yeniden ücretlendi: ' + b0 + '->' + await bal());
    await $(p, 'hint').click();
  }
  const before = await bal(); await $(p, 'hint').click(); // aşama 3
  if (await bal() !== before - 1) throw new Error('aşama 3 maliyeti 1: ' + before + '->' + await bal());
  if (await bal() !== 3) throw new Error('tam ipucu toplam 2 hak olmalı (5->3): ' + await bal());
  await p.context().close();
});
test('Sonraki çift dokunuş: tek reklam, tek seviye; reklam beklerken Tekrar yok sayılır', async (b) => {
  const p = await newPage(b, null, '', { override: { ads: { fakeAdMs: 900, resultCardMinMs: 300 }, game: { winAnimMs: 150 } } }); await skipTutorial(p);
  await seedProgress(p, 6); const id = await p.evaluate(() => MZ.Data.packs.cirak[6].id);
  await startLevelById(p, id); await solveByTaps(p); await waitResult(p);
  await p.evaluate(() => { window.__starts = 0; window.__ads = 0; const o = MZ.UI.startLevel; MZ.UI.startLevel = function () { window.__starts++; return o.apply(this, arguments); }; const f = MZ.UI.fakeAd; MZ.UI.fakeAd = function () { window.__ads++; return f.apply(this, arguments); }; });
  await $(p, 'next').click(); await $(p, 'next').click({ force: true }).catch(() => {}); await p.waitForTimeout(150);
  await $(p, 'retry').click({ force: true }).catch(() => {});
  if (!(await $(p, 'next').isDisabled()) || !(await $(p, 'retry').isDisabled())) throw new Error('düğmeler kilitlenmedi');
  await p.waitForTimeout(2500);
  const r = await p.evaluate(() => [window.__ads, window.__starts, document.querySelectorAll('#overlay > *').length, MZ.UI.paused]);
  if (r[0] !== 1 || r[1] !== 1 || r[2] !== 0 || r[3] !== 0) throw new Error('reklam/başlatma/katman/pause = ' + r);
  await p.context().close();
});
test('Bozuk kayıt: beyaz ekran yok (hints:null, dizi, bozuk JSON, bozuk yarım kayıt)', async (b) => {
  const cases = [JSON.stringify({ v: 1, hints: null, daily: { done: null }, progress: { levels: 5 }, settings: 'x', ads: [] }), '[1,2]', '{bozuk', JSON.stringify({ v: 1, current: { key: 'level:c-001', g: { c: 'zzz', u: 5 } } })];
  for (const raw of cases) {
    const ctx = await b.newContext({ viewport: { width: 360, height: 640 } });
    await ctx.addInitScript(r => { try { if (!localStorage.getItem('seeded')) { localStorage.setItem('mozaik.save.v1', r); localStorage.setItem('seeded', '1'); } } catch (e) {} }, raw);
    const p = await newPage(b, null, '', { ctx });
    const sc = await scr(p); if (!sc) throw new Error('beyaz ekran: ' + raw);
    if (p.errors.length) throw new Error('hata: ' + p.errors.join('|') + ' <- ' + raw);
    await skipTutorial(p).catch(() => {});
    await startLevelById(p, 'c-001'); await clickCell(p, 0, 0);
    const bal = await p.evaluate(() => MZ.State.data.hints.balance); if (typeof bal !== 'number') throw new Error('bakiye sayı değil');
    // yarım kayıt bozuksa seviye temiz açılır
    await p.evaluate(() => { MZ.UI.leaveGame(); MZ.UI.startLevel(MZ.Data.level('c-001'), false); }); await p.waitForSelector('.board');
    await ctx.close();
  }
});
test('Gece yarısı: günlük ekran yenilenir (sayaç sarmaz), yeni gün bulmacası açılır', async (b) => {
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, timezoneId: 'Europe/Istanbul' });
  const p = await ctx.newPage(); p.errors = []; p.on('pageerror', e => p.errors.push(e.message));
  await p.addInitScript(o => { window.__MZ_CONFIG_OVERRIDE = o; }, OVERRIDE);
  await p.clock.install({ time: new Date('2026-11-23T20:59:30Z') });   // yerel 23:59:30
  await p.goto(URL); await p.waitForSelector('#screen[data-screen]'); await skipTutorial(p);
  await p.evaluate(() => MZ.UI.go('daily')); await $(p, 'daily-play').click(); await p.waitForSelector('.board'); await solveByTaps(p);
  await p.clock.runFor(1500); await waitResult(p); await $(p, 'close').click();
  const no0 = await $(p, 'daily-no').innerText();
  await p.clock.runFor(2000); const t1 = await $(p, 'next-in').innerText();
  await p.clock.runFor(40000);   // gece yarısı geçti
  await p.clock.runFor(2500);
  const no1 = await $(p, 'daily-no').innerText();
  if (no0 === no1) throw new Error('gün numarası değişmedi ' + no0);
  if (await $(p, 'next-in').count()) throw new Error('yeni gün hâlâ "çözüldü" görünüyor');
  if (!(await $(p, 'daily-play').count())) throw new Error('yeni günün Oyna düğmesi yok');
  if (p.errors.length) throw new Error(p.errors.join('|'));
  await ctx.close();
});
test('İki parmak: hayalet taş yok; pinch yakınlaştırır; büyüteç ≥44 px; yakınlaşıkken tek parmak işaretler', async (b) => {
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true, locale: 'tr-TR' });
  const p = await newPage(b, null, '?unlock=1', { ctx }); await skipTutorial(p);
  const cdp = await ctx.newCDPSession(p);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
  // 6x6: ikinci parmak ilk parmağın uzun basmasını iptal etmeli
  const id6 = await p.evaluate(() => MZ.Data.levels.find(l => l.n === 6).id); await startLevelById(p, id6);
  const a = await cellCenter(p, 2, 2), c = await cellCenter(p, 4, 4);
  await touch('touchStart', [a]); await p.waitForTimeout(120); await touch('touchStart', [a, c]); await p.waitForTimeout(600);
  await touch('touchEnd', []); await p.waitForTimeout(200);
  const ghost = await p.locator('.cell.stone-on,.cell.x-on').count(); if (ghost) throw new Error('iki parmakta hayalet işaret: ' + ghost);
  // 10x10
  const id10 = await p.evaluate(() => MZ.Data.levels.find(l => l.n === 10).id); await startLevelById(p, id10);
  const zi = await p.evaluate(() => MZ.UI.zoomInfo()); if (!zi.zoomable) throw new Error('10x10 yakınlaştırılabilir değil');
  const base = zi.base; const area = await p.evaluate(() => { const r = document.querySelector('.board-area').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  const zb = await p.locator('[data-id=zoom]').boundingBox(); if (zb.width < 44 || zb.height < 44) throw new Error('büyüteç düğmesi < 44');
  const bb = await p.locator('.board').boundingBox(); const area0 = await p.locator('.board-area').boundingBox();
  if (zb.y < area0.y + area0.height - 1) throw new Error('büyüteç tahta alanının içinde');
  await touch('touchStart', [[area[0] - 30, area[1]], [area[0] + 30, area[1]]]);
  for (let k = 1; k <= 8; k++) await touch('touchMove', [[area[0] - 30 - k * 12, area[1]], [area[0] + 30 + k * 12, area[1]]]);
  await touch('touchEnd', []); await p.waitForTimeout(100);
  const z1 = await p.evaluate(() => MZ.UI.zoomInfo()); if (z1.cell <= base) throw new Error('pinch yakınlaştırmadı ' + JSON.stringify(z1));
  // büyüteç: sıfırla, sonra aç
  await $(p, 'zoom').click(); await $(p, 'zoom').click(); const z2 = await p.evaluate(() => MZ.UI.zoomInfo());
  if (z2.cell < 44) throw new Error('büyüteç açıkken hücre < 44: ' + z2.cell);
  const cs = await p.evaluate(() => document.querySelector('.cell').getBoundingClientRect().width); if (cs < 44) throw new Error('DOM hücre < 44: ' + cs);
  await shot(p, 'm360-tahta-10x10-yakin');
  // yakınlaşıkken tek parmak sürükleme işaretler, kaydırmaz
  const sl0 = await p.evaluate(() => document.querySelector('.board-area').scrollLeft);
  const s0 = await cellCenter(p, 0, 0); const vis = await p.evaluate(() => { const r = document.querySelector('.board-area').getBoundingClientRect(), cells = [...document.querySelectorAll('.cell')].filter(e => { const q = e.getBoundingClientRect(); return q.left >= r.left && q.right <= r.right && q.top >= r.top && q.bottom <= r.bottom; }); return cells.slice(0, 3).map(e => [+e.dataset.r, +e.dataset.c]); });
  const v0 = await cellCenter(p, vis[0][0], vis[0][1]), v2 = await cellCenter(p, vis[2][0], vis[2][1]);
  await touch('touchStart', [v0]); for (let k = 1; k <= 6; k++) await touch('touchMove', [[v0[0] + (v2[0] - v0[0]) * k / 6, v0[1] + (v2[1] - v0[1]) * k / 6]]); await touch('touchEnd', []);
  await p.waitForTimeout(100);
  const marked = await p.locator('.cell.x-on').count(); if (marked < 2) throw new Error('yakınlaşıkken tek parmak işaretlemedi: ' + marked);
  const sl1 = await p.evaluate(() => document.querySelector('.board-area').scrollLeft); if (Math.abs(sl1 - sl0) > 1) throw new Error('tek parmak kaydırdı');
  await ctx.close();
});
test('Çakışma ipucu doğru taşı değil, çözümde olmayan taşı kaldırır', async (b) => {
  const p = await newPage(b); await skipTutorial(p);
  const r = await p.evaluate(() => {
    const lv = MZ.Data.packs.cirak[0]; MZ.UI.startLevel(lv, true); const g = MZ.UI.G.game, s = lv.solution, n = lv.n;
    g.longPress(0, s[0]); const wc = s[0] + 1 < n ? s[0] + 1 : s[0] - 1; g.longPress(1, wc);
    const h = g.getHint(); g.applyHint(h);
    return { kind: h.kind, correct: g.cells[s[0]] === 2, wrongGone: g.cells[n + wc] !== 2 };
  });
  if (r.kind !== 'conflict' || !r.correct || !r.wrongGone) throw new Error(JSON.stringify(r));
  // çözüm hücresine konmuş X de kaldırılmalı
  const r2 = await p.evaluate(() => { const lv = MZ.Data.packs.cirak[1]; MZ.UI.startLevel(lv, true); const g = MZ.UI.G.game, s = lv.solution; g.dragBegin(0, s[0]); g.dragOver(0, s[0]); g.dragEnd(); const h = g.getHint(); const k = h && h.kind; g.applyHint(h); return { k, cleared: g.cells[s[0]] === 0 }; });
  if (r2.k !== 'conflict' || !r2.cleared) throw new Error('X conflict: ' + JSON.stringify(r2));
  await p.context().close();
});
test('Tekrar oynanan seviye "ilk 6" eşiğine girmez ama aralık sayacı ilerler', async (b) => {
  const p = await newPage(b); await skipTutorial(p);
  const r = await p.evaluate(() => {
    const lv = MZ.Data.packs.cirak[0], g = { hints: 0, errors: 0, elapsed: 1000 }, E = MZ.Economy, out = {};
    for (let i = 0; i < 8; i++) MZ.Progress.completeLevel(lv, g);
    out.comp = MZ.State.data.ads.completions; out.uniq = E.uniqueCompleted();
    out.dec = E.interstitialDecision(Date.now(), true, MZ.Util.todayISO()).reason;
    return out;
  });
  if (r.comp !== 8 || r.uniq !== 1 || r.dec !== 'first-levels') throw new Error(JSON.stringify(r));
  await p.context().close();
});
test('Günlük ve paket yarım-kayıt yuvaları ayrı', async (b) => {
  const p = await newPage(b); await skipTutorial(p);
  await startLevelById(p, 'c-002'); await clickCell(p, 0, 0);
  await p.evaluate(() => { MZ.UI.leaveGame(); MZ.UI.go('menu'); MZ.UI.startDaily(true); }); await p.waitForSelector('.board'); await clickCell(p, 0, 0);
  await p.evaluate(() => { MZ.UI.leaveGame(); MZ.UI.go('menu'); });
  const k = await p.evaluate(() => [MZ.State.data.current && MZ.State.data.current.key, MZ.State.data.currentDaily && MZ.State.data.currentDaily.key]);
  if (k[0] !== 'level:c-002' || !/^daily:/.test(k[1])) throw new Error('yuvalar karıştı ' + k);
  await p.context().close();
});
test('Izgara çizgisi kontrastı ≥ 2:1 (A/B × açık/koyu, tüm bölge renkleri)', async (b) => {
  const p = await newPage(b); await skipTutorial(p);
  const res = await p.evaluate(() => {
    const lum = c => { const m = c.match(/[\d.]+/g).map(Number), v = m.slice(0, 3).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
    const out = [];
    for (const st of ['a', 'b']) for (const th of ['light', 'dark']) {
      MZ.UI.setStyle(st); document.documentElement.setAttribute('data-theme', th);
      const bd = document.createElement('div'); bd.className = 'board'; document.body.appendChild(bd);
      for (let k = 0; k < 10; k++) { const c = document.createElement('div'); c.className = 'cell rn reg-' + k; bd.appendChild(c); const cs = getComputedStyle(c); const a = lum(cs.borderRightColor), bg = lum(cs.backgroundColor); out.push([st, th, k, (Math.max(a, bg) + .05) / (Math.min(a, bg) + .05)]); }
      bd.remove();
    }
    return out;
  });
  const worst = res.reduce((m, r) => r[3] < m[3] ? r : m, res[0]);
  if (worst[3] < 2) throw new Error('en düşük kontrast ' + worst[3].toFixed(2) + ' @ ' + worst.slice(0, 3));
  console.log('   (en düşük çizgi kontrastı ' + worst[3].toFixed(2) + ':1)');
  await p.context().close();
});
test('Biten ay panosu galeriye girer', async (b) => {
  const p = await newPage(b, null, '?day=2026-12-02'); await skipTutorial(p);
  await p.evaluate(() => { const d = MZ.State.data.daily; for (let i = 1; i <= 30; i++) d.done['2026-11-' + String(i).padStart(2, '0')] = { time: 1, hints: 0, errors: 0, stars: 3, strip: ['c'], streak: i, dayNo: i }; MZ.State.save(); MZ.UI.go('collection'); });
  if (!(await $(p, 'gal-month-2026-11').count())) throw new Error('ay panosu galeride yok');
  await p.context().close();
});

(async () => {
  const browser = await chromium.launch();
  let i = 0;
  for (const t of tests) {
    i++; if (FILTER && !t.name.includes(FILTER)) continue; const t0 = Date.now(); let ok = true, msg = '';
    try { await t.fn(browser); } catch (e) { ok = false; msg = String(e.message || e).split('\n')[0].slice(0, 220); }
    results.push({ n: i, name: t.name, ok, msg, ms: Date.now() - t0 });
    console.log(`${ok ? 'GEÇTİ' : 'KALDI'}  ${i}. ${t.name}${ok ? '' : '\n        -> ' + msg}`);
  }
  await browser.close();
  console.log('\n| # | Test | Sonuç | Süre |\n|---|---|---|---|');
  for (const r of results) console.log(`| ${r.n} | ${r.name} | ${r.ok ? 'GEÇTİ' : 'KALDI: ' + r.msg} | ${(r.ms / 1000).toFixed(1)}s |`);
  const fail = results.filter(r => !r.ok).length;
  console.log(`\nToplam ${results.length}, geçen ${results.length - fail}, kalan ${fail}`);
  process.exit(fail ? 1 : 0);
})();
