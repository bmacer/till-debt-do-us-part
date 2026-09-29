/* Till Debt Do Us Part: clickable prototype. Plain JS, no build step.
   Screens and styling are ported from mockups/src (base.py, screens.py). */
'use strict';
(() => {
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const params = new URLSearchParams(location.search);
const RATE = Math.max(0.05, +params.get('rate') || 1);          // global time scale (slow-mo capture)
const now = () => performance.now() * RATE;
const later = (fn, ms) => setTimeout(fn, ms / RATE);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches || params.has('reduced');
const stage = $('#stage');

/* ================= springs ================= */
function springFn({ stiffness = 170, damping = 26, mass = 1 } = {}) {
  const w0 = Math.sqrt(stiffness / mass), z = damping / (2 * Math.sqrt(stiffness * mass));
  if (z < 1) { const wd = w0 * Math.sqrt(1 - z * z); return t => 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t)); }
  return t => 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}
function settle(f) { let last = 0; for (let t = 0; t < 6; t += 1 / 240) if (Math.abs(1 - f(t)) > 0.0015) last = t; return last + 1 / 60; }
function springCSS(o) {
  const f = springFn(o), T = settle(f), n = 56, pts = [];
  for (let i = 0; i <= n; i++) pts.push(i === n ? 1 : +f(i / n * T).toFixed(4));
  return { easing: `linear(${pts.join(',')})`, dur: Math.round(T * 1000), f, T };
}
const SP = {
  snappy: springCSS({ stiffness: 380, damping: 32 }),       // tab pill, segmented thumb
  bouncy: springCSS({ stiffness: 260, damping: 17 }),       // toast, menus, pops
  ring:   springCSS({ stiffness: 64, damping: 12.5 }),      // Activity-style ring fill (small overshoot)
  slide:  springCSS({ stiffness: 46, damping: 11 }),        // become-one rings slide together
  soft:   springCSS({ stiffness: 120, damping: 22 }),
};
const rs = document.documentElement.style;
for (const [k, v] of Object.entries(SP)) { rs.setProperty(`--sp-${k}`, v.easing); rs.setProperty(`--sp-${k}-d`, v.dur + 'ms'); }

/* rAF tween driven by the (scalable) clock */
function tween({ from = 0, to = 1, dur = 800, spring, ease, delay = 0, onUpdate, onDone }) {
  const f = spring ? spring.f : null, T = spring ? spring.T * 1000 : dur;
  const e = ease || (t => 1 - Math.pow(1 - t, 3));
  const t0 = now() + delay; let raf, dead = false;
  const step = () => {
    if (dead) return;
    const el = now() - t0;
    if (el < 0) { raf = requestAnimationFrame(step); return; }
    const p = Math.min(1, el / T);
    const k = f ? (p >= 1 ? 1 : f(p * spring.T)) : e(p);
    onUpdate(from + (to - from) * k);
    if (p < 1) raf = requestAnimationFrame(step); else onDone && onDone();
  };
  raf = requestAnimationFrame(step);
  return { stop() { dead = true; cancelAnimationFrame(raf); } };
}
const easeOutQuint = t => 1 - Math.pow(1 - t, 5);

/* ================= icons (hand-drawn SVG stand-ins for SF Symbols) ================= */
const sw = (w = 2.2) => `fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const ICONS = {
  chev_l: o => `<path d="M15.5 4.5 8 12l7.5 7.5" ${sw(o.w || 2.4)}/>`,
  chev_r: o => `<path d="M8.5 4.5 16 12l-7.5 7.5" ${sw(o.w || 2.4)}/>`,
  chev_ud: o => `<path d="M7.5 9.5 12 5l4.5 4.5M7.5 14.5 12 19l4.5-4.5" ${sw(o.w || 2.4)}/>`,
  xmark: o => `<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" ${sw(o.w || 2.5)}/>`,
  check: o => `<path d="M5 12.8l4.6 4.6L19.2 7" ${sw(o.w || 2.7)}/>`,
  plus: o => `<path d="M12 4.8v14.4M4.8 12h14.4" ${sw(o.w || 2.5)}/>`,
  creditcard_fill: () => `<path fill="currentColor" fill-rule="evenodd" d="M5 4.5h14a3 3 0 0 1 3 3v.9H2v-.9a3 3 0 0 1 3-3zM2 10.6h20v5.9a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3zm3.6 3.5a1 1 0 0 0 0 2h4a1 1 0 0 0 0-2z"/>`,
  creditcard: () => `<rect x="2.9" y="5.4" width="18.2" height="13.2" rx="2.6" ${sw(1.8)}/><path d="M3 9.6h18" ${sw(2.4)}/><path d="M6 15h3.6" ${sw(1.8)}/>`,
  gradcap_fill: () => `<path fill="currentColor" d="M12 3.6 1.6 8.7 12 13.8l10.4-5.1z"/><path fill="currentColor" d="M5.8 11.6v3.8c0 1.9 2.8 3.6 6.2 3.6s6.2-1.7 6.2-3.6v-3.8L12 14.7z"/><path d="M20.6 9.6v5.2" ${sw(1.4)}/><circle cx="20.6" cy="15.6" r="1.2" fill="currentColor"/>`,
  columns_fill: () => `<path fill="currentColor" d="M12 2.6 2.4 7.3c-.4.2-.4.8.1.9H21.5c.5-.1.5-.7.1-.9z"/><rect x="4.2" y="10" width="2.6" height="7.4" rx=".6" fill="currentColor"/><rect x="8.8" y="10" width="2.6" height="7.4" rx=".6" fill="currentColor"/><rect x="12.6" y="10" width="2.6" height="7.4" rx=".6" fill="currentColor"/><rect x="17.2" y="10" width="2.6" height="7.4" rx=".6" fill="currentColor"/><rect x="2.6" y="18.6" width="18.8" height="2.6" rx=".8" fill="currentColor"/>`,
  lock_fill: () => `<path d="M8 10.8V7.6a4 4 0 0 1 8 0v3.2" ${sw(2.3)}/><rect x="4.8" y="10.2" width="14.4" height="11" rx="2.6" fill="currentColor"/>`,
  eye_slash: () => `<path d="M2.6 12s3.4-6.3 9.4-6.3 9.4 6.3 9.4 6.3-3.4 6.3-9.4 6.3S2.6 12 2.6 12z" ${sw(1.9)}/><circle cx="12" cy="12" r="3" ${sw(1.9)}/><path d="M4 3.8 20 20.2" ${sw(2.1)}/>`,
  check_circle_fill: o => `<circle cx="12" cy="12" r="10.2" fill="currentColor"/><path d="M7.4 12.4l3.2 3.2 6-6.4" fill="none" stroke="${o.knock || '#fff'}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  cross_fill: () => `<path fill="currentColor" d="M9.6 2.8h4.8a1.2 1.2 0 0 1 1.2 1.2v4.4H20a1.2 1.2 0 0 1 1.2 1.2v4.8a1.2 1.2 0 0 1-1.2 1.2h-4.4V20a1.2 1.2 0 0 1-1.2 1.2H9.6A1.2 1.2 0 0 1 8.4 20v-4.4H4a1.2 1.2 0 0 1-1.2-1.2V9.6A1.2 1.2 0 0 1 4 8.4h4.4V4a1.2 1.2 0 0 1 1.2-1.2z"/>`,
  sparkles: () => `<path fill="currentColor" d="M10 3.2c.7 4.3 2.3 5.9 6.6 6.6-4.3.7-5.9 2.3-6.6 6.6-.7-4.3-2.3-5.9-6.6-6.6 4.3-.7 5.9-2.3 6.6-6.6z"/><path fill="currentColor" d="M18 13.2c.4 2.3 1.2 3.1 3.5 3.5-2.3.4-3.1 1.2-3.5 3.5-.4-2.3-1.2-3.1-3.5-3.5 2.3-.4 3.1-1.2 3.5-3.5z"/><path fill="currentColor" d="M18.4 2.4c.25 1.4.75 1.9 2.1 2.1-1.4.25-1.85.75-2.1 2.1-.25-1.35-.75-1.85-2.1-2.1 1.35-.25 1.85-.75 2.1-2.1z"/>`,
  flag_fill: () => `<path d="M5.2 3.2v17.6" ${sw(2.2)}/><path fill="currentColor" d="M6.2 4.2c2.8-1.5 4.9.7 7.4.7 2 0 3.3-1.1 5.4-1.1.4 0 .7.3.7.7v8.4c0 .4-.3.7-.7.7-2 0-3.4 1.1-5.4 1.1-2.5 0-4.6-2.2-7.4-.7z"/>`,
  bubbles_fill: () => `<path fill="currentColor" d="M5.2 2.8h8.6a2.8 2.8 0 0 1 2.8 2.8v5a2.8 2.8 0 0 1-2.8 2.8H8.6l-3.3 2.8c-.4.3-.9 0-.9-.4v-2.5a2.8 2.8 0 0 1-2-2.7v-5a2.8 2.8 0 0 1 2.8-2.8z"/><path fill="currentColor" d="M18.2 7.4h.8a2.8 2.8 0 0 1 2.8 2.8v4.8a2.8 2.8 0 0 1-2 2.7v2.4c0 .4-.5.7-.9.4l-3.3-2.7h-4.1a2.8 2.8 0 0 1-2.6-1.8h5a4.4 4.4 0 0 0 4.3-4.4z"/>`,
  delete_left: () => `<path d="M9.4 5.2h9.8a2.4 2.4 0 0 1 2.4 2.4v8.8a2.4 2.4 0 0 1-2.4 2.4H9.4a1.6 1.6 0 0 1-1.2-.55L2.8 12l5.4-6.25a1.6 1.6 0 0 1 1.2-.55z" ${sw(1.7)}/><path d="M11.6 9.3l5.4 5.4M17 9.3l-5.4 5.4" ${sw(1.8)}/>`,
  sliders: () => `<path d="M3 6.5h9.6M17.4 6.5H21M3 12h2.6M10.4 12H21M3 17.5h7.6M15.4 17.5H21" ${sw(1.8)}/><circle cx="15" cy="6.5" r="2.4" ${sw(1.8)}/><circle cx="8" cy="12" r="2.4" ${sw(1.8)}/><circle cx="13" cy="17.5" r="2.4" ${sw(1.8)}/>`,
  heart_fill: () => `<path fill="currentColor" d="M12 20.6s-8.4-4.9-8.4-10.9A4.6 4.6 0 0 1 12 7.2a4.6 4.6 0 0 1 8.4 2.5c0 6-8.4 10.9-8.4 10.9z"/>`,
  calendar: () => `<rect x="3.2" y="4.6" width="17.6" height="16" rx="3" ${sw(1.8)}/><path d="M3.4 9.4h17.2M8 2.8v3.4M16 2.8v3.4" ${sw(1.8)}/>`,
  arrow_ccw: () => `<path d="M4.6 12a7.4 7.4 0 1 0 2.2-5.3" ${sw(2)}/><path d="M6.2 2.8v4.4h4.4" ${sw(2)}/>`,
  info: () => `<circle cx="12" cy="12" r="9.2" ${sw(1.8)}/><path d="M12 11v5.4" ${sw(2.2)}/><circle cx="12" cy="7.8" r="1.3" fill="currentColor"/>`,
};
function I(name, size = 20, color = 'currentColor', o = {}) {
  return `<svg class="i" width="${size}" height="${size}" viewBox="0 0 24 24" style="color:${color}" aria-hidden="true">${ICONS[name](o)}</svg>`;
}
const ringsGlyph = (size = 24) => `<svg class="i" width="${size}" height="${size}" viewBox="0 0 25 25" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M12.5 2.2 A10.3 10.3 0 1 1 3.4 7.6" stroke-width="2.5"/><path d="M12.5 7.3 A5.2 5.2 0 1 1 7.4 13.4" stroke-width="2.5"/></svg>`;

/* iOS status bar glyphs (from base.py) */
function statusbar() {
  const bars = [4.2, 6.4, 8.7, 11].map((h, i) => `<rect x="${(i * 4.6).toFixed(1)}" y="${11 - h}" width="3.2" height="${h}" rx="1" fill="currentColor"/>`).join('');
  const band = (r0, r1) => { const cx = 7.7, cy = 10.6, a0 = -135 * Math.PI / 180, a1 = -45 * Math.PI / 180, p = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)].map(v => v.toFixed(2));
    const [x1, y1] = p(r1, a0), [x2, y2] = p(r1, a1), [x3, y3] = p(r0, a1), [x4, y4] = p(r0, a0);
    return `M${x1} ${y1}A${r1} ${r1} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${r0} ${r0} 0 0 0 ${x4} ${y4}Z`; };
  const wifi = band(0, 3.6) + band(5.2, 7.4) + band(9.0, 11.1);
  return `<div class="sb"><div class="time">9:41</div><div class="island"></div><div class="right">
  <svg width="17.2" height="11" viewBox="0 0 17.2 11">${bars}</svg>
  <svg width="15.4" height="11" viewBox="0 0 15.4 11"><path d="${wifi}" fill="currentColor" stroke="currentColor" stroke-width=".6" stroke-linejoin="round"/></svg>
  <svg width="27.3" height="13" viewBox="0 0 27.3 13"><rect x=".5" y=".5" width="24" height="12" rx="3.8" fill="none" stroke="currentColor" stroke-opacity=".35"/><rect x="2.5" y="2.5" width="20" height="8" rx="2" fill="currentColor"/><path d="M25.8 4.4v4.2c.8-.3 1.4-1.1 1.4-2.1s-.6-1.8-1.4-2.1z" fill="currentColor" fill-opacity=".4"/></svg>
  </div></div>`;
}

/* ================= Activity-style ring (base.py ring_arc, made animatable) ================= */
function ringHTML(id, size, r, w, c0, c1, track, capScale = 1) {
  const D = 2 * r + w, off = size / 2 - D / 2;
  const mask = `radial-gradient(farthest-side,transparent calc(100% - ${w}px),#000 calc(100% - ${w - 0.6}px),#000 calc(100% - 0.6px),transparent 100%)`;
  const box = `left:${off}px;top:${off}px;width:${D}px;height:${D}px`;
  const dotTop = D / 2 - r - w / 2, dotLeft = D / 2 - w / 2;
  const sh = `${(2.6 * capScale).toFixed(2)}px 0 ${(2.6 * capScale).toFixed(2)}px -0.5px rgba(20,6,18,calc(var(--capsh) * .8))`;
  return `<div class="ring" id="${id}">
  <div style="${box};border-radius:50%;background:${track};-webkit-mask:${mask};mask:${mask}"></div>
  <div style="${box};border-radius:50%;background:conic-gradient(from 0deg,${c0} 0deg,${c1} var(--a),transparent var(--a));-webkit-mask:${mask};mask:${mask}"></div>
  <div class="dot" style="left:${size / 2 - w / 2}px;top:${size / 2 - r - w / 2}px;width:${w}px;height:${w}px;background:${c0}"></div>
  <div style="${box};-webkit-mask:${mask};mask:${mask}"><div class="rot" style="position:absolute;inset:0"><div class="dot" style="left:${dotLeft}px;top:${dotTop}px;width:${w}px;height:${w}px;background:${c1};box-shadow:${sh}"></div></div></div>
  <div class="rot" style="${box}"><div class="dot" style="left:${dotLeft}px;top:${dotTop}px;width:${w}px;height:${w}px;background:${c1}"></div></div>
</div>`;
}
const setRing = (el, frac) => el && el.style.setProperty('--a', (Math.max(0, frac) * 360).toFixed(2) + 'deg');

/* ================= data (all numbers reconcile with the mockups) ================= */
const DAY = 864e5, TODAY = Date.UTC(2026, 8, 28);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHLY = 72000;             // plan: $720/mo together (Sam $360 + Alex $360)
const freshDebts = () => ([
  // cents. Sam: 3,000+1,400+2,000+half of 4,000 = 8,400 -> 2,352 · Alex: 3,840+1,400+half of 4,000 = 7,240 -> 2,648
  { id: 'chase', name: 'Chase Sapphire', owner: 'mine', icon: 'creditcard_fill', orig: 300000, bal: 124000, apr: 24.99, min: 35, suggest: 32000, vis: 'full' },
  { id: 'apple', name: 'Apple Card', owner: 'mine', icon: 'creditcard', orig: 140000, bal: 52200, apr: 19.24, min: 25, suggest: 17500, vis: 'full' },
  { id: 'dental', name: 'Bright Smile Dental', owner: 'mine', icon: 'cross_fill', orig: 200000, bal: 0, paidOn: 'Aug 14', vis: 'full' },
  { id: 'loan', name: 'Student loan', owner: 'yours', icon: 'gradcap_fill', orig: 384000, bal: 161800, suggest: 18000, vis: 'balance' },
  { id: 'private', name: 'One more of Alex’s', owner: 'yours', icon: 'lock_fill', orig: 140000, bal: 44000, vis: 'exists' },
  { id: 'venue', name: 'The Glasshouse', owner: 'ours', icon: 'columns_fill', orig: 400000, bal: 118000, apr: 0, suggest: 25000, vis: 'full', sub: 'Venue · 0% APR · $250/mo' },
]);
let savedTheme = 'system'; try { savedTheme = localStorage.getItem('tddup-theme') || 'system'; } catch (e) {}
const S = {
  wedding: Date.UTC(2027, 4, 22), pendingWedding: Date.UTC(2027, 4, 22), cal: { y: 2027, m: 4 },
  theme: params.get('theme') || savedTheme, tab: 'home', filter: 'all', merged: false,
  debts: freshDebts(), shown: null, log: null,
};
const debt = id => S.debts.find(d => d.id === id);
function totals(debts = S.debts) {
  let so = 0, sb = 0, ao = 0, ab = 0;
  for (const d of debts) {
    if (d.owner === 'mine') { so += d.orig; sb += d.bal; }
    else if (d.owner === 'yours') { ao += d.orig; ab += d.bal; }
    else { so += d.orig / 2; sb += d.bal / 2; ao += d.orig / 2; ab += d.bal / 2; }
  }
  const orig = so + ao, left = sb + ab;
  return { sam: (so - sb) / so, alex: (ao - ab) / ao, left, orig, paid: orig - left, together: (orig - left) / orig };
}
const money = (c, { cents = 'auto' } = {}) => {
  const d = c / 100, showC = cents === true || (cents === 'auto' && Math.round(c) % 100 !== 0);
  return '$' + d.toLocaleString('en-US', { minimumFractionDigits: showC ? 2 : 0, maximumFractionDigits: showC ? 2 : 0 });
};
const heroMoney = c => Math.max(0, Math.ceil(c / 100 - 1e-9)).toLocaleString('en-US');
const pct = f => Math.round(f * 100);
const fmtDate = (t, o) => new Date(t).toLocaleDateString('en-US', { timeZone: 'UTC', ...o });
const daysUntil = t => Math.round((t - TODAY) / DAY);
function monthPlus(n) { const m = 8 + n; return { y: 2026 + Math.floor(m / 12), m: m % 12 }; }  // from Sep 2026
function projection(left = totals().left) {
  if (left <= 0) return { label: 'Today', done: true, y: 2026, m: 8 };
  const n = Math.ceil(left / MONTHLY - 1e-9), p = monthPlus(n);
  return { label: `${MONTHS[p.m]} ${p.y}`, ...p };
}
function freeNote() {
  const p = projection(), w = new Date(S.wedding), wi = w.getUTCFullYear() * 12 + w.getUTCMonth(), pi = p.y * 12 + p.m;
  const ok = I('check_circle_fill', 13, 'var(--success)', { knock: 'var(--bg)' });
  if (p.done) return `${ok}Debt-free, together`;
  if (pi < wi) return `${ok}Before the wedding`;
  if (pi === wi) return `${ok}The month you say “I do”`;
  const k = pi - wi; return `<span style="color:var(--ink2);display:inline-flex;gap:4px;align-items:center">${I('calendar', 13, 'var(--ink2)')}${k} month${k > 1 ? 's' : ''} after “I do”</span>`;
}
const ORDER = ['chase', 'apple', 'loan', 'private', 'venue'];
const nextUp = () => ORDER.map(debt).find(d => d.bal > 0 && d.vis !== 'exists');
const KIND = { mine: ['Mine', 'Sam'], yours: ['Yours', 'Alex'], ours: ['Ours', 'Sam & Alex'] };

/* ================= shell ================= */
stage.innerHTML = `
<div class="grain"></div>
<div id="onboarding" class="view"></div>
<div id="main" class="view pushed-in" aria-hidden="true">
  <div id="v-home" class="view tabview on"></div>
  <div id="v-debts" class="view tabview"></div>
  <div id="v-plan" class="view tabview"></div>
  <div id="v-checkin" class="view tabview"></div>
  <div class="edgefade"></div>
  <nav class="tabbar glass" role="tablist">
    <div class="tabpill" id="tabpill"></div>
    <button class="tab on" data-tab="home" role="tab"><div class="ic">${ringsGlyph(24)}</div><div>Countdown</div></button>
    <button class="tab" data-tab="debts" role="tab"><div class="ic">${I('creditcard_fill', 23)}</div><div>Debts</div></button>
    <button class="tab" data-tab="plan" role="tab"><div class="ic">${I('flag_fill', 22)}</div><div>Plan</div></button>
    <button class="tab" data-tab="checkin" role="tab"><div class="ic">${I('bubbles_fill', 22)}</div><div>Check-in</div></button>
  </nav>
</div>
<div class="dimmer" id="dimmer"></div>
<div class="sheet" id="sh-log" style="top:118px" role="dialog" aria-label="Log a payment"></div>
<div class="sheet" id="sh-settings" role="dialog" aria-label="Settings"></div>
<div class="sheet" id="sh-privacy" role="dialog" aria-label="Private debt"></div>
<div id="become" aria-hidden="true"></div>
<div class="toast glass" id="toast"></div>
${statusbar()}
<div class="hi"></div>`;

/* ================= onboarding ================= */
function renderOnboarding() {
  const seg = [0, 1, 2, 3].map(i => `<div style="width:26px;height:4px;border-radius:2px;background:${i < 2 ? 'var(--accent)' : 'color-mix(in srgb,var(--accent) 16%,transparent)'}"></div>`).join('');
  $('#onboarding').innerHTML = `
<button class="gbtn glass press" id="ob-back" style="position:absolute;left:16px;top:58px" aria-label="Back">${I('chev_l', 20)}</button>
<div style="position:absolute;left:24px;top:120px;display:flex;gap:5px;align-items:center">${seg}<span style="font-size:12px;font-weight:600;color:var(--ink2);margin-left:6px;letter-spacing:.2px">2 of 4</span></div>
<button class="glass press" id="ob-married" style="position:absolute;right:16px;top:58px;height:44px;border-radius:22px;padding:0 16px;display:flex;align-items:center;font-size:15px;font-weight:500;letter-spacing:-.2px">Already married</button>
<div style="position:absolute;left:24px;right:24px;top:138px">
  <div class="d" style="font-size:34px;font-weight:700;letter-spacing:.2px;line-height:40px">When do you<br>say <span class="serif" style="font-size:45px;color:var(--accent);letter-spacing:-.2px;line-height:30px">I do?</span></div>
  <div style="font-size:16px;line-height:22px;color:var(--ink2);margin-top:10px;letter-spacing:-.3px">We’ll count down together and plan around it.</div>
</div>
<div class="card sq" style="position:absolute;left:16px;right:16px;top:270px;padding:12px 12px 4px;overflow:hidden">
  <div style="display:flex;align-items:center;justify-content:space-between;padding:0 6px 0 8px;height:34px">
    <div id="cal-title" style="font-size:17px;font-weight:600;letter-spacing:-.4px;display:flex;align-items:center;gap:6px"></div>
    <div style="display:flex;gap:14px;color:var(--accent);margin-right:-6px">
      <button class="press" id="cal-prev" aria-label="Previous month" style="width:32px;height:32px;display:flex;align-items:center;justify-content:center">${I('chev_l', 21, 'var(--accent)', { w: 2.1 })}</button>
      <button class="press" id="cal-next" aria-label="Next month" style="width:32px;height:32px;display:flex;align-items:center;justify-content:center">${I('chev_r', 21, 'var(--accent)', { w: 2.1 })}</button>
    </div>
  </div>
  <div class="cal-grid" style="font-size:13px;font-weight:600;color:var(--ink3);margin-top:8px;letter-spacing:-.1px">${['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => `<div style="text-align:center">${d}</div>`).join('')}</div>
  <div class="cal-grid" id="cal-grid" style="margin-top:4px"></div>
  <div style="border-top:0.5px solid var(--hair);margin:4px 6px 0;padding:11px 2px 9px;display:flex;justify-content:space-between;align-items:center">
    <div id="cal-sel" style="font-size:15px;font-weight:500;letter-spacing:-.2px"></div>
    <div id="cal-away" class="num" style="font-size:15px;color:var(--ink2);letter-spacing:-.2px"></div>
  </div>
</div>
<div class="sq" id="goal" style="position:absolute;left:16px;right:16px;top:634px;padding:14px 16px;border-radius:26px;background:var(--goal);display:flex;align-items:center;gap:13px;box-shadow:inset 0 0 0 0.5px var(--goalline)">
  <div class="sq" style="width:40px;height:40px;flex:none;border-radius:12px;background:var(--goalicon);display:flex;align-items:center;justify-content:center;box-shadow:0 1px 2px rgba(43,26,41,.06)">${I('sparkles', 21, 'var(--accent)')}</div>
  <div style="flex:1;min-width:0" id="goal-body"></div>
</div>
<button class="btn primary press" id="ob-continue" style="position:absolute;left:24px;right:24px;width:auto;bottom:44px;height:54px;border-radius:27px">Continue</button>`;
  renderCalendar();
  $('#cal-prev').onclick = () => shiftMonth(-1);
  $('#cal-next').onclick = () => shiftMonth(1);
  $('#ob-continue').onclick = () => finishOnboarding();
  $('#ob-married').onclick = () => { later(() => toast(I('heart_fill', 17, 'var(--accent)') + 'Congrats! We’ll plan from today.'), 500); finishOnboarding(); };
  $('#ob-back').onclick = e => { e.currentTarget.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(0)' }], { duration: 320, easing: 'ease-out' }); };
}
function renderCalendar(dir = 0) {
  const { y, m } = S.cal, first = new Date(Date.UTC(y, m, 1)).getUTCDay(), n = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const cells = Array(first).fill(0).concat([...Array(n)].map((_, i) => i + 1));
  while (cells.length < 42) cells.push(0);
  const sel = new Date(S.pendingWedding);
  $('#cal-grid').innerHTML = cells.map(d => {
    if (!d) return '<div class="day"></div>';
    const t = Date.UTC(y, m, d), isSel = sel.getUTCFullYear() === y && sel.getUTCMonth() === m && sel.getUTCDate() === d;
    return `<div class="day"><button data-t="${t}" class="${isSel ? 'sel' : ''}${t === TODAY ? ' today' : ''}" ${t <= TODAY ? 'disabled' : ''} aria-label="${fmtDate(t, { dateStyle: 'full' })}">${d}</button></div>`;
  }).join('');
  if (dir && !REDUCED) { const g = $('#cal-grid'); g.classList.remove('cal-anim-l', 'cal-anim-r'); void g.offsetWidth; g.classList.add(dir > 0 ? 'cal-anim-r' : 'cal-anim-l'); }
  $('#cal-title').innerHTML = `${MONTHS[m]} ${y} ${I('chev_r', 14, 'var(--accent)', { w: 3 })}`;
  $('#cal-prev').style.opacity = (y === 2026 && m <= 8) ? .3 : 1;
  $('#cal-next').style.opacity = (y === 2028 && m >= 11) ? .3 : 1;
  $$('#cal-grid button[data-t]').forEach(b => b.onclick = () => pickDate(+b.dataset.t));
  renderSelection(false);
}
function shiftMonth(k) {
  let { y, m } = S.cal; m += k; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
  if (y * 12 + m < 2026 * 12 + 8 || y * 12 + m > 2028 * 12 + 11) return;
  S.cal = { y, m }; renderCalendar(k);
}
function goalFor(t) {
  if (daysUntil(t) > 400) return { title: `Debt-free before we <span class="serif" style="font-size:20px;font-weight:400">say I do</span>`, date: t };
  const d = new Date(t);
  return { title: `Debt-free by our <span class="serif" style="font-size:20px;font-weight:400">first anniversary</span>`, date: Date.UTC(d.getUTCFullYear() + 1, d.getUTCMonth(), d.getUTCDate()) };
}
function renderSelection(animate = true) {
  const t = S.pendingWedding, days = daysUntil(t), g = goalFor(t);
  $('#cal-sel').textContent = fmtDate(t, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  $('#cal-away').textContent = `${days} day${days === 1 ? '' : 's'} away`;
  const gb = $('#goal-body');
  gb.innerHTML = `<div class="eyebrow" style="font-size:11px;color:var(--goaleyebrow)">Suggested goal</div>
    <div style="font-size:17px;font-weight:600;letter-spacing:-.4px;margin-top:1px;white-space:nowrap">${g.title}</div>
    <div class="num" style="font-size:13px;color:var(--ink2);margin-top:1px">${fmtDate(g.date, { month: 'short', day: 'numeric', year: 'numeric' })} · you can change this anytime</div>`;
  if (animate && !REDUCED) {
    gb.classList.remove('swap-in'); void gb.offsetWidth; gb.classList.add('swap-in');
    $('#goal').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.02)' }, { transform: 'scale(1)' }], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
}
function pickDate(t) {
  S.pendingWedding = t;
  $$('#cal-grid button.sel').forEach(b => b.classList.remove('sel', 'pop'));
  const b = $(`#cal-grid button[data-t="${t}"]`);
  if (b) { b.classList.add('sel'); if (!REDUCED) { void b.offsetWidth; b.classList.add('pop'); } }
  renderSelection(true);
}
function finishOnboarding() {
  S.wedding = S.pendingWedding;
  updateHome(false);
  const ob = $('#onboarding'), main = $('#main');
  main.removeAttribute('aria-hidden');
  if (S.tab !== 'home') switchTab('home');
  if (REDUCED) { ob.style.display = 'none'; main.classList.remove('pushed-in'); }
  else { requestAnimationFrame(() => { ob.classList.add('pushed-out'); main.classList.remove('pushed-in'); }); later(() => { ob.style.visibility = 'hidden'; }, 600); }
  later(() => homeIntro(), REDUCED ? 0 : 380);
}

/* ================= home ================= */
function avatar(l, bg, size = 36, fs = 15) {
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--f-round);font-weight:600;font-size:${fs}px;box-shadow:0 0 0 2px var(--bg)">${l}</div>`;
}
function scrollFade(sc, fd) { const s = $(sc), f = $(fd); s.addEventListener('scroll', () => f.classList.toggle('on', s.scrollTop > 6), { passive: true }); }
function renderHome() {
  const size = 244;
  $('#v-home').innerHTML = `
<div class="scroller" id="home-scroll"><div style="position:relative;padding-top:536px">
<div style="position:absolute;left:20px;top:62px" class="eyebrow">Monday, September 28</div>
<div class="d" style="position:absolute;left:20px;top:80px;font-size:34px;font-weight:700;letter-spacing:.3px;line-height:41px">Sam &amp; Alex</div>
<button class="press" id="avatars" aria-label="Settings" style="position:absolute;right:20px;top:84px;display:flex">
  ${avatar('S', '#8C3F7F')}<div style="margin-left:-8px">${avatar('A', '#A8661A')}</div></button>
<div id="hero" style="position:absolute;left:${(393 - size) / 2}px;top:130px;width:${size}px;height:${size}px">
  ${ringHTML('ring-sam', size, 110, 23, 'var(--sam0)', 'var(--sam1)', 'var(--samtr)')}
  ${ringHTML('ring-alex', size, 84, 23, 'var(--alex0)', 'var(--alex1)', 'var(--alextr)')}
  <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding-top:2px">
    <div class="r" style="font-weight:800;font-size:44px;letter-spacing:-.6px;line-height:1;display:flex;align-items:flex-start">
      <span style="font-size:27px;margin-top:4px;margin-right:1px;font-weight:700">$</span><span id="h-hero">5,000</span></div>
    <div class="serif" style="font-size:19px;color:var(--primary);margin-top:5px;line-height:1">till Debt Do Us Part</div>
  </div>
</div>
<div style="position:absolute;left:0;right:0;top:390px;text-align:center">
  <div style="display:inline-flex;gap:18px;font-size:15px;font-weight:600;letter-spacing:-.2px;align-items:center">
    <span style="display:inline-flex;align-items:center;gap:7px"><i style="width:9px;height:9px;border-radius:50%;background:var(--mine);display:inline-block"></i>Sam <span class="r" style="color:var(--mine)" id="h-sam">72%</span></span>
    <span style="display:inline-flex;align-items:center;gap:7px"><i style="width:9px;height:9px;border-radius:50%;background:var(--yours);display:inline-block"></i>Alex <span class="r" style="color:var(--yours)" id="h-alex">63%</span></span>
  </div>
  <div class="num" id="h-paid" style="font-size:13px;color:var(--ink2);margin-top:5px;letter-spacing:-.05px"></div>
</div>
<div style="position:absolute;left:20px;right:20px;top:446px;display:flex;border-top:0.5px solid var(--hair);border-bottom:0.5px solid var(--hair);padding:12px 0">
  <div style="flex:1">
    <div class="eyebrow" style="font-size:11px">Wedding day</div>
    <div class="d" id="h-wed" style="font-size:22px;font-weight:600;letter-spacing:-.3px;margin-top:2px"></div>
    <div class="num" id="h-wed-days" style="font-size:13px;color:var(--ink2);margin-top:1px"></div>
  </div>
  <div style="width:.5px;background:var(--hair);margin:0 16px"></div>
  <div style="flex:1">
    <div class="eyebrow" style="font-size:11px">Debt-free by</div>
    <div class="d" id="h-free" style="font-size:22px;font-weight:600;letter-spacing:-.3px;margin-top:2px"></div>
    <div id="h-free-note" style="font-size:13px;color:var(--success);margin-top:1px;font-weight:500;display:flex;align-items:center;gap:4px;white-space:nowrap"></div>
  </div>
</div>
<div style="position:relative;padding-bottom:120px">
<div style="margin:0 20px;display:flex;justify-content:space-between;align-items:baseline">
  <div class="d" style="font-size:20px;font-weight:700;letter-spacing:-.3px">Next up</div>
  <button class="press" id="h-ourplan" style="font-size:15px;color:var(--primary);font-weight:500;display:flex;align-items:center;gap:3px">Our plan ${I('chev_r', 13, 'var(--primary)', { w: 2.8 })}</button>
</div>
<div class="card sq" id="h-next" style="margin:9px 16px 0;padding:16px"></div>
<div class="d" style="margin:84px 20px 0"><span style="font-size:20px;font-weight:700;letter-spacing:-.3px">Milestones</span></div>
<button class="sq press" id="h-become" style="display:flex;width:calc(100% - 32px);margin:12px 16px 0;text-align:left;border-radius:30px;overflow:hidden;background:#5B2A57;color:#FBF5F0;padding:16px 16px 16px 14px;align-items:center;gap:14px;box-shadow:0 12px 30px -14px rgba(91,42,87,.6)"></button>
</div>
</div></div>
<div class="topfade" id="home-fade"></div>`;
  $('#avatars').onclick = () => openSheet('settings');
  $('#h-ourplan').onclick = () => switchTab('plan');
  scrollFade('#home-scroll', '#home-fade');
  updateHome(false);
}
function nextCardHTML() {
  const d = nextUp();
  if (!d) return `<div style="display:flex;align-items:center;gap:12px">${I('check_circle_fill', 28, 'var(--success)', { knock: 'var(--surface)' })}<div style="font-size:17px;font-weight:600">Everything’s paid. <span class="serif" style="font-weight:400;font-size:20px">Debt Do Us Part.</span></div></div>`;
  const sub = { chase: '24.99% APR · highest first', apple: '19.24% APR · next highest', loan: 'Balance only · Alex’s', venue: '0% APR · last in line' }[d.id];
  const step = d.suggest || 32000, pay = Math.min(d.bal, step), by = monthPlus(Math.max(1, Math.ceil(d.bal / step - 1e-9)));
  const line = d.bal <= pay ? `Pay <b class="num" style="font-weight:600">${money(pay)}</b> this month and it’s gone.` : `Pay <b class="num" style="font-weight:600">${money(pay)}</b> this month and it’s gone by ${MONTHS[by.m]}.`;
  return `
  <div style="display:flex;align-items:center;gap:12px">
    <div class="sq" style="width:40px;height:40px;flex:none;border-radius:12px;background:var(--${d.owner}t);display:flex;align-items:center;justify-content:center">${I(d.icon, 21, `var(--${d.owner})`)}</div>
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:7px"><span style="font-size:17px;font-weight:600;letter-spacing:-.4px">${d.name}</span><span class="chip" style="background:var(--${d.owner}t);color:var(--${d.owner})">${KIND[d.owner][0]}</span></div>
      <div class="num" style="font-size:13px;color:var(--ink2);margin-top:1px">${sub}</div>
    </div>
    <div class="r" id="h-next-bal" style="font-size:22px;font-weight:700;letter-spacing:-.3px">${money(d.bal)}</div>
  </div>
  <div style="height:6px;border-radius:3px;background:var(--${d.owner}t);margin-top:13px;overflow:hidden"><div id="h-next-bar" style="width:${((d.orig - d.bal) / d.orig * 100).toFixed(1)}%;height:100%;border-radius:3px;background:var(--${d.owner});transition:width 1s var(--ease-out)"></div></div>
  <div style="font-size:15px;letter-spacing:-.2px;margin-top:10px;line-height:20px">${line}</div>
  <button class="btn primary press" id="h-log" style="margin-top:13px;height:48px;border-radius:24px">${I('plus', 17, 'var(--onprimary)', { w: 2.8 })}Log a payment</button>`;
}
const fusedMini = (px, w) => `<div style="position:absolute;inset:${px}px;border-radius:50%;background:conic-gradient(from -90deg,#F3B596,#FFE7D8 22%,#FFFFFF 38%,#F9CDB4 60%,#F3B596 80%,#F3B596);-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - ${w}px),#000 calc(100% - ${w - .6}px));mask:radial-gradient(farthest-side,transparent calc(100% - ${w}px),#000 calc(100% - ${w - .6}px));box-shadow:0 0 24px rgba(243,181,150,.3)"></div>`;
const twoMini = (d, bw, gap) => `<div style="position:absolute;left:0;top:50%;margin-top:-${d / 2}px;width:${d}px;height:${d}px;border-radius:50%;border:${bw}px solid #E39BD3"></div><div style="position:absolute;left:${gap}px;top:50%;margin-top:-${d / 2}px;width:${d}px;height:${d}px;border-radius:50%;border:${bw}px solid #F1BB74;mix-blend-mode:screen"></div>`;
function becomeCardHTML() {
  const chev = I('chev_r', 14, 'rgba(251,245,240,.6)', { w: 2.8 });
  return S.merged
    ? `<div style="position:relative;width:52px;height:52px;flex:none">${fusedMini(6, 8)}</div><div style="flex:1;min-width:0"><div style="font-size:11px;font-weight:600;letter-spacing:1.6px;color:#F3B596">ONE PLAN · SINCE TODAY</div>
      <div style="font-size:17px;font-weight:600;letter-spacing:-.4px;margin-top:3px">Two plans, <span class="serif" style="font-size:21px;font-weight:400;color:#F3B596">now one.</span></div>
      <div style="font-size:13px;color:rgba(251,245,240,.75);margin-top:2px">5 debts, one payoff order. Split 50/50.</div></div>${chev}`
    : `<div style="position:relative;width:52px;height:52px;flex:none">${twoMini(34, 5, 18)}</div><div style="flex:1;min-width:0"><div style="font-size:11px;font-weight:600;letter-spacing:1.6px;color:#F3B596">MILESTONE READY</div>
      <div style="font-size:17px;font-weight:600;letter-spacing:-.4px;margin-top:3px">Become <span class="serif" style="font-size:21px;font-weight:400;color:#F3B596">one plan?</span></div>
      <div style="font-size:13px;color:rgba(251,245,240,.75);margin-top:2px">Merge 5 debts into one order. Optional.</div></div>${chev}`;
}
function updateHome(paintNow = true) {
  const T = totals(), w = S.wedding, days = daysUntil(w);
  $('#h-wed').textContent = fmtDate(w, { month: 'short', day: 'numeric' });
  $('#h-wed-days').textContent = `${days} day${days === 1 ? '' : 's'} to go`;
  $('#h-free').textContent = projection(T.left).label;
  $('#h-free-note').innerHTML = freeNote();
  $('#h-next').innerHTML = nextCardHTML();
  const lb = $('#h-log'); if (lb) lb.onclick = () => openLog(nextUp().id);
  $('#h-become').innerHTML = becomeCardHTML();
  $('#h-become').onclick = () => S.merged ? switchTab('plan') : playBecomeOne('home');
  if (!paintNow) paintHomeValues(S.shown || { sam: T.sam, alex: T.alex, left: T.left });
}
function paintHomeValues(v) {
  const T = totals();
  setRing($('#ring-sam'), v.sam); setRing($('#ring-alex'), v.alex);
  $('#h-hero').textContent = heroMoney(v.left);
  $('#h-sam').textContent = pct(Math.max(0, Math.min(1, v.sam))) + '%'; $('#h-alex').textContent = pct(Math.max(0, Math.min(1, v.alex))) + '%';
  const paid = Math.max(0, T.orig - v.left);
  $('#h-paid').textContent = `${money(Math.round(paid / 100) * 100)} of ${money(T.orig)} paid · ${pct(paid / T.orig)}% together`;
  S.shown = { sam: v.sam, alex: v.alex, left: v.left };
}
let homeAnims = [];
function animateHomeTo(target, { from, stagger = 110, heroDur = 1500 } = {}) {
  homeAnims.forEach(a => a.stop()); homeAnims = [];
  const f = from || S.shown || { sam: 0, alex: 0, left: totals().orig };
  const cur = { ...f }, paint = () => paintHomeValues(cur);
  if (REDUCED) { Object.assign(cur, target); paint(); return; }
  homeAnims.push(tween({ from: f.sam, to: target.sam, spring: SP.ring, onUpdate: v => { cur.sam = v; paint(); } }));
  homeAnims.push(tween({ from: f.alex, to: target.alex, spring: SP.ring, delay: stagger, onUpdate: v => { cur.alex = v; paint(); } }));
  homeAnims.push(tween({ from: f.left, to: target.left, dur: heroDur, ease: easeOutQuint, onUpdate: v => { cur.left = v; paint(); } }));
}
function homeIntro() {
  const T = totals(), start = { sam: 0, alex: 0, left: T.orig };
  paintHomeValues(start);
  later(() => animateHomeTo({ sam: T.sam, alex: T.alex, left: T.left }, { from: start, stagger: 140, heroDur: 1700 }), 120);
}

/* ================= tabs ================= */
const TABS = ['home', 'debts', 'plan', 'checkin'];
function switchTab(t) {
  if (S.tab === t) { const sc = $(`#v-${t} .scroller`); if (sc) sc.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  S.tab = t;
  TABS.forEach(k => { $(`#v-${k}`).classList.toggle('on', k === t); $(`.tab[data-tab="${k}"]`).classList.toggle('on', k === t); });
  $('#tabpill').style.transform = `translateX(${TABS.indexOf(t) * 100}%)`;
  if (t === 'home') { const T = totals(); if (S.shown && Math.abs(S.shown.left - T.left) > 1) later(() => animateHomeTo({ sam: T.sam, alex: T.alex, left: T.left }), 200); }
  if (t === 'debts') renderDebtList(true);
}
$$('.tab').forEach(b => b.onclick = () => switchTab(b.dataset.tab));
$('#tabpill').style.transition = `transform var(--sp-snappy-d) var(--sp-snappy)`;

/* ================= debts ================= */
function renderDebts() {
  $('#v-debts').innerHTML = `
<div class="scroller" id="debts-scroll"><div style="position:relative;min-height:852px;padding:232px 0 120px">
  <div class="d" style="position:absolute;left:20px;top:104px;font-size:34px;font-weight:700;letter-spacing:.3px;line-height:41px">Debts</div>
  <div class="num" id="d-sub" style="position:absolute;left:20px;top:147px;font-size:15px;color:var(--ink2);letter-spacing:-.2px"></div>
  <div class="seg" id="d-seg" style="position:absolute;left:16px;right:16px;top:182px;height:36px" role="tablist">
    <div class="thumb" style="width:calc((100% - 4px)/4)"></div>
    ${['All', 'Mine', 'Yours', 'Ours'].map((s, i) => `<button class="opt${i === 0 ? ' on' : ''}" data-f="${s.toLowerCase()}" role="tab">${s}</button>`).join('')}
  </div>
  <div id="d-list"></div>
</div></div>
<div class="topfade" id="debts-fade"></div>
<div class="glass" style="position:absolute;right:16px;top:58px;height:44px;border-radius:22px;display:flex;align-items:center;z-index:36">
  <button class="gbtn press" id="d-sort" aria-label="Sort">${I('sliders', 21)}</button><div style="width:.5px;height:20px;background:var(--hair)"></div><button class="gbtn press" id="d-add" aria-label="Add debt">${I('plus', 21, 'currentColor', { w: 2 })}</button>
</div>`;
  $('#d-seg .thumb').style.transition = `transform var(--sp-snappy-d) var(--sp-snappy)`;
  $$('#d-seg .opt').forEach((b, i) => b.onclick = () => setFilter(b.dataset.f, i));
  $('#d-add').onclick = () => toast(I('info', 17, 'var(--accent)') + 'Adding debts comes in the next build');
  $('#d-sort').onclick = () => toast(I('sliders', 17, 'var(--accent)') + 'Sorted by payoff order');
  scrollFade('#debts-scroll', '#debts-fade');
  renderDebtList(false);
}
function setFilter(f, i) {
  if (S.filter === f) return;
  S.filter = f;
  $$('#d-seg .opt').forEach(b => b.classList.toggle('on', b.dataset.f === f));
  $('#d-seg .thumb').style.transform = `translateX(${i * 100}%)`;
  renderDebtList(true);
}
function debtRowHTML(d, last) {
  const k = d.owner, sep = last ? '' : '<div class="sep"></div>';
  if (d.vis === 'exists') {
    return `<button class="row tap" data-id="${d.id}" style="width:100%;text-align:left;padding:12px 16px 13px 14px;align-items:center">
  <div class="sq" style="width:38px;height:38px;flex:none;border-radius:11px;background:var(--neut);display:flex;align-items:center;justify-content:center">${I('lock_fill', 18, 'var(--ink2)')}</div>
  <div style="flex:1;min-width:0">
    <div style="display:flex;justify-content:space-between;align-items:center"><div style="font-size:17px;letter-spacing:-.4px;font-weight:500">${d.name}</div>
      <div style="display:inline-flex;align-items:center;gap:4px;height:24px;padding:0 9px;border-radius:12px;background:var(--neut);font-size:13px;font-weight:600;color:var(--ink2)">${I('lock_fill', 12, 'var(--ink2)')}Private</div></div>
    <div style="font-size:13px;color:var(--ink2);margin-top:2px;letter-spacing:-.05px">Alex shared that it exists. Details stay private.</div>
  </div>${sep}</button>`;
  }
  const paid = d.bal <= 0, nx = nextUp();
  const nextchip = nx && nx.id === d.id ? '<span class="nextchip">NEXT</span>' : '';
  let sub;
  if (paid) sub = `${I('check_circle_fill', 13, 'var(--success)', { knock: 'var(--surface)' })}<span style="color:var(--success);font-weight:500">Paid off ${d.paidOn}</span>&nbsp;· ${money(d.orig)}`;
  else if (d.vis === 'balance') sub = `${I('eye_slash', 13, 'var(--ink2)')}Balance only · APR hidden by Alex`;
  else sub = d.sub || `${d.apr}% APR · $${d.min} min`;
  const trail = paid ? `<div class="r" style="font-size:17px;font-weight:600;color:var(--ink3)">$0</div>` : `<div class="r" style="font-size:17px;font-weight:600;letter-spacing:-.2px">${money(d.bal)}</div>`;
  const bar = paid ? '' : `<div class="bar" style="background:var(--${k}t)"><i style="width:${((d.orig - d.bal) / d.orig * 100).toFixed(1)}%;background:var(--${k})"></i></div>`;
  const isz = ['cross_fill', 'columns_fill', 'gradcap_fill'].includes(d.icon) ? 19 : 21;
  return `<button class="row${paid ? '' : ' tap'}" data-id="${d.id}" style="width:100%;text-align:left">
  <div class="sq" style="width:38px;height:38px;flex:none;border-radius:11px;background:var(--${k}t);display:flex;align-items:center;justify-content:center;margin-top:1px">${I(d.icon, isz, `var(--${k})`)}</div>
  <div style="flex:1;min-width:0">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
      <div style="font-size:17px;letter-spacing:-.4px;font-weight:500;white-space:nowrap;display:flex;align-items:center;gap:6px">${d.name}${nextchip}</div>${trail}
    </div>
    <div class="num" style="font-size:13px;color:var(--ink2);margin-top:2px;letter-spacing:-.05px;display:flex;align-items:center;gap:4px;white-space:nowrap">${sub}</div>
    ${bar}
  </div>${sep}</button>`;
}
function renderDebtList(animate) {
  const T = totals(), f = S.filter, open = S.debts.filter(d => d.bal > 0), paidN = S.debts.length - open.length;
  const sum = k => S.debts.filter(d => d.owner === k).reduce((a, d) => a + d.bal, 0);
  const openK = k => S.debts.filter(d => d.owner === k && d.bal > 0).length;
  const big = c => `<span class="r" style="color:var(--ink);font-weight:700">${money(c)}</span>`;
  const subs = {
    all: `${big(T.left)} left across ${open.length} debts · ${paidN} paid off`,
    mine: `${big(sum('mine'))} left across ${openK('mine')} of Sam’s debts`,
    yours: `${big(sum('yours'))} left across ${openK('yours')} of Alex’s debts`,
    ours: `${big(sum('ours'))} left, shared 50/50`,
  };
  $('#d-sub').innerHTML = subs[f];
  const kinds = f === 'all' ? ['mine', 'yours', 'ours'] : [f];
  $('#d-list').innerHTML = kinds.map((k, i) => {
    const ds = S.debts.filter(d => d.owner === k);
    return `<section class="${animate && !REDUCED ? 'sec-in' : ''}" style="animation-delay:${i * 55}ms">
<div style="display:flex;justify-content:space-between;align-items:baseline;padding:0 20px 7px 20px">
  <div style="display:flex;align-items:center;gap:8px"><span class="d" style="font-size:20px;font-weight:700;letter-spacing:-.3px">${KIND[k][0]}</span><span style="font-size:13px;color:var(--ink2);font-weight:500">${KIND[k][1]}</span></div>
  <div class="r" style="font-size:15px;font-weight:600;color:var(--ink2)">${money(sum(k))}</div>
</div>
<div class="card sq" style="margin:0 16px 16px;border-radius:30px;overflow:hidden">${ds.map((d, j) => debtRowHTML(d, j === ds.length - 1)).join('')}</div></section>`;
  }).join('');
  $$('#d-list .row').forEach(r => r.onclick = () => {
    const d = debt(r.dataset.id);
    if (d.vis === 'exists') openSheet('privacy');
    else if (d.bal > 0) openLog(d.id);
    else toast(I('check_circle_fill', 17, 'var(--success)', { knock: 'var(--surface)' }) + `${d.name} is paid off`);
  });
}

/* ================= plan + check-in (placeholders) ================= */
function renderPlan() {
  const T = totals();
  const rows = ORDER.map(debt).map((d, i, a) => {
    const paid = d.bal <= 0, priv = d.vis === 'exists';
    const badgeBg = paid ? 'var(--success)' : priv ? 'var(--neut)' : `var(--${d.owner}t)`, badgeFg = paid ? 'var(--surface)' : priv ? 'var(--ink2)' : `var(--${d.owner})`;
    return `<div class="row" style="align-items:center;padding:12px 16px 12px 14px">
      <div class="r" style="width:26px;height:26px;flex:none;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;background:${badgeBg};color:${badgeFg}">${paid ? I('check', 13, 'var(--surface)', { w: 3.4 }) : i + 1}</div>
      <div style="flex:1;min-width:0;font-size:16px;letter-spacing:-.3px;font-weight:500;display:flex;align-items:center;gap:6px;${paid ? 'color:var(--ink3)' : ''}">${priv ? 'Alex’s private debt' : d.name}${priv ? I('lock_fill', 12, 'var(--ink2)') : ''}</div>
      <div class="r" style="font-size:15px;font-weight:600;color:var(--ink2)">${priv ? 'Private' : paid ? 'Paid' : money(d.bal)}</div>
      ${i < a.length - 1 ? '<div class="sep" style="left:54px"></div>' : ''}</div>`;
  }).join('');
  const hero = S.merged
    ? `<div class="sq" style="border-radius:30px;background:#5B2A57;color:#FBF5F0;padding:18px;display:flex;gap:16px;align-items:center;position:relative;overflow:hidden">
        <div style="position:relative;width:64px;height:64px;flex:none">${fusedMini(0, 10)}</div>
        <div><div style="font-size:11px;font-weight:600;letter-spacing:1.6px;color:#F3B596">ONE PLAN · MERGED TODAY</div>
        <div class="d" style="font-size:22px;font-weight:700;margin-top:4px;letter-spacing:-.3px">Two plans, <span class="serif" style="font-weight:400;font-size:26px;color:#F3B596">now one.</span></div>
        <div style="font-size:13px;color:rgba(251,245,240,.78);margin-top:3px">Contributions stay 50/50. Change it anytime.</div></div></div>`
    : `<div class="sq" style="border-radius:30px;background:#5B2A57;color:#FBF5F0;padding:18px;position:relative;overflow:hidden">
        <div style="display:flex;gap:14px;align-items:center">
          <div style="position:relative;width:64px;height:48px;flex:none">${twoMini(44, 6, 20)}</div>
          <div><div style="font-size:11px;font-weight:600;letter-spacing:1.6px;color:#F3B596">MILESTONE · OPTIONAL</div>
          <div class="d" style="font-size:22px;font-weight:700;margin-top:4px;letter-spacing:-.3px">Ready to <span class="serif" style="font-weight:400;font-size:26px;color:#F3B596">become one?</span></div></div>
        </div>
        <div style="font-size:14px;line-height:19px;color:rgba(251,245,240,.8);margin-top:10px;letter-spacing:-.15px">Merge your 5 debts into one payoff order. You can always keep separate plans.</div>
        <button class="btn press" id="p-become" style="margin-top:14px;height:46px;border-radius:23px;background:#FBF5F0;color:#5B2A57">Become One</button></div>`;
  $('#v-plan').innerHTML = `
<div class="scroller" id="plan-scroll"><div style="position:relative;padding:104px 0 130px">
  <div class="d" style="padding:0 20px;font-size:34px;font-weight:700;letter-spacing:.3px;line-height:41px">Plan</div>
  <div class="num" style="padding:2px 20px 0;font-size:15px;color:var(--ink2);letter-spacing:-.2px">Avalanche · highest APR first</div>
  <div style="margin:18px 16px 0">${hero}</div>
  <div style="display:flex;justify-content:space-between;align-items:baseline;padding:22px 20px 7px">
    <span class="d" style="font-size:20px;font-weight:700;letter-spacing:-.3px">${S.merged ? 'Our payoff order' : 'Payoff order'}</span>
    <span class="r" style="font-size:15px;font-weight:600;color:var(--ink2)">${money(T.left)}</span></div>
  <div class="card sq" style="margin:0 16px;overflow:hidden">${rows}</div>
  <div class="card sq" style="margin:16px 16px 0;padding:14px 16px;display:flex;align-items:center;gap:12px">
    <div class="sq" style="width:38px;height:38px;flex:none;border-radius:11px;background:var(--ourst);display:flex;align-items:center;justify-content:center">${I('calendar', 19, 'var(--ours)')}</div>
    <div style="flex:1"><div style="font-size:16px;font-weight:600;letter-spacing:-.3px">$720 a month, together</div>
    <div class="num" style="font-size:13px;color:var(--ink2);margin-top:1px">Sam $360 · Alex $360 · debt-free by ${projection(T.left).label}</div></div></div>
  <div style="text-align:center;font-size:12px;color:var(--ink3);margin-top:16px">Plan editing arrives in a later prototype.</div>
</div></div><div class="topfade" id="plan-fade"></div>`;
  const pb = $('#p-become'); if (pb) pb.onclick = () => playBecomeOne('plan');
  scrollFade('#plan-scroll', '#plan-fade');
}
function renderCheckin() {
  const qs = [['What felt good about money this week?', true], ['Anything you want to talk through, no pressure?', true], ['One small win to celebrate?', false]];
  $('#v-checkin').innerHTML = `
<div class="scroller"><div style="position:relative;padding:104px 0 130px">
  <div class="d" style="padding:0 20px;font-size:34px;font-weight:700;letter-spacing:.3px;line-height:41px">Check-in</div>
  <div class="num" style="padding:2px 20px 0;font-size:15px;color:var(--ink2);letter-spacing:-.2px">Sunday, Oct 4 · 3 questions, about 5 minutes</div>
  <div class="card sq" style="margin:18px 16px 0;overflow:hidden">
  ${qs.map(([q, sam], i) => `<div class="row" style="padding:14px 16px;align-items:center;gap:12px">
      <div class="r" style="width:26px;height:26px;flex:none;border-radius:50%;background:var(--minet);color:var(--mine);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700">${i + 1}</div>
      <div style="flex:1;font-size:16px;letter-spacing:-.3px;line-height:21px">${q}</div>
      <div style="display:flex;width:26px;justify-content:flex-end">${sam ? avatar('S', '#8C3F7F', 24, 11) : ''}</div>
      ${i < 2 ? '<div class="sep" style="left:54px"></div>' : ''}</div>`).join('')}
  </div>
  <div style="margin:14px 20px 0;font-size:13px;color:var(--ink2);line-height:18px">You’ll see each other’s answers once you’ve both replied. Alex hasn’t started yet.</div>
  <div style="padding:18px 16px 0"><button class="btn primary press" id="ci-start">Continue check-in</button></div>
</div></div>`;
  $('#ci-start').onclick = () => toast(I('bubbles_fill', 17, 'var(--accent)') + 'Check-ins open Sunday (placeholder)');
}

/* ================= sheets ================= */
let openSheetId = null;
function openSheet(id) {
  if (openSheetId) closeSheet();
  if (id === 'settings') renderSettings();
  if (id === 'privacy') renderPrivacy();
  openSheetId = id;
  const sh = $(`#sh-${id}`);
  $('#dimmer').classList.add('on');
  sh.style.transform = ''; sh.classList.add('on');
}
function closeSheet() {
  if (!openSheetId) return;
  const sh = $(`#sh-${openSheetId}`); sh.style.transform = '';
  sh.classList.remove('on'); $('#dimmer').classList.remove('on'); closeMenu();
  openSheetId = null;
}
$('#dimmer').onclick = () => closeSheet();
function enableDrag(sh) {
  let y0 = null, dy = 0, t0 = 0;
  sh.addEventListener('pointerdown', e => {
    if (!e.target.closest('.drag') || e.target.closest('button')) return;
    y0 = e.clientY; dy = 0; t0 = performance.now(); sh.classList.add('dragging'); sh.setPointerCapture(e.pointerId);
  });
  sh.addEventListener('pointermove', e => { if (y0 === null) return; dy = Math.max(0, (e.clientY - y0) / stageScale()); sh.style.transform = `translateY(${dy}px)`; });
  const end = () => {
    if (y0 === null) return; sh.classList.remove('dragging');
    const v = dy / Math.max(1, performance.now() - t0); y0 = null;
    if (dy > 110 || (v > .6 && dy > 30)) closeSheet(); else sh.style.transform = '';
  };
  sh.addEventListener('pointerup', end); sh.addEventListener('pointercancel', end);
}
['log', 'settings', 'privacy'].forEach(k => enableDrag($(`#sh-${k}`)));

/* ---------- log a payment ---------- */
const payerFor = d => d.owner === 'yours' ? 'alex' : d.owner === 'ours' ? 'both' : 'sam';
function openLog(id) {
  S.log = { id, amt: '', payer: payerFor(debt(id)) };
  renderLog(); openSheet('log');
}
function renderLog() {
  const who = [['sam', 'Sam paid'], ['alex', 'Alex paid'], ['both', 'We both did']];
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];
  const wi = who.findIndex(w => w[0] === S.log.payer);
  $('#sh-log').innerHTML = `<div class="grain"></div><div class="inner">
  <div class="drag" style="touch-action:none"><div class="grabber"></div>
  <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 14px 0">
    <button class="gbtn glass press" id="lg-close" aria-label="Cancel">${I('xmark', 19, 'currentColor', { w: 2.4 })}</button>
    <div style="font-size:17px;font-weight:600;letter-spacing:-.4px">Log a payment</div>
    <button class="gbtn press" id="lg-save" aria-label="Save" style="background:var(--primary);box-shadow:inset 0 .5px 0 rgba(255,255,255,.3),0 4px 12px -4px rgba(91,42,87,.6);transition:opacity .25s,transform .35s var(--ease-out)">${I('check', 20, 'var(--onprimary)', { w: 3 })}</button>
  </div></div>
  <div style="display:flex;justify-content:center;margin-top:18px;position:relative">
    <button class="glass press" id="lg-debt" style="height:36px;border-radius:18px;padding:0 12px 0 8px;display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600;letter-spacing:-.2px"></button>
  </div>
  <div class="menu" id="lg-menu" style="top:112px"></div>
  <div style="text-align:center;margin-top:20px;height:112px">
    <div id="lg-amt" class="r" style="font-size:76px;font-weight:700;letter-spacing:-1.5px;line-height:1;display:inline-flex;align-items:flex-start;height:76px"></div>
    <div id="lg-hint" class="num" style="font-size:15px;color:var(--ink2);margin-top:10px;letter-spacing:-.2px;height:20px;display:flex;justify-content:center;align-items:center;gap:4px"></div>
  </div>
  <div class="card sq" style="margin:0 16px 0;padding:12px 14px;border-radius:24px;display:flex;align-items:center;gap:12px">
    <div style="position:relative;width:38px;height:38px;flex:none">${ringHTML('mini-sam', 38, 16, 5, 'var(--sam0)', 'var(--sam1)', 'var(--samtr)', .45)}${ringHTML('mini-alex', 38, 9.5, 5, 'var(--alex0)', 'var(--alex1)', 'var(--alextr)', .45)}</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:15px;font-weight:600;letter-spacing:-.2px;white-space:nowrap"><span class="r" id="lg-left"></span> <span class="serif" style="font-size:18px;font-weight:400;color:var(--accent)">till Debt Do Us Part</span></div>
      <div class="num" id="lg-rings" style="font-size:13px;color:var(--ink2);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div>
    </div>
  </div>
  <div class="seg" id="lg-who" style="margin:14px 16px 0;height:32px;border-radius:16px">
    <div class="thumb" style="width:calc((100% - 4px)/3);border-radius:15px;transform:translateX(${wi * 100}%)"></div>
    ${who.map(([k, l]) => `<button class="opt${k === S.log.payer ? ' on' : ''}" data-p="${k}" style="border-radius:15px">${l}</button>`).join('')}
  </div>
  <div class="kp">${keys.map(k => `<button class="key${k === '.' || k === 'del' ? ' bare' : ''}" data-k="${k}" aria-label="${k === 'del' ? 'Delete' : k}">${k === 'del' ? I('delete_left', 26, 'var(--ink)') : k}</button>`).join('')}</div>
  </div>`;
  $('#lg-who .thumb').style.transition = `transform var(--sp-snappy-d) var(--sp-snappy)`;
  $('#lg-close').onclick = () => closeSheet();
  $('#lg-save').onclick = saveLog;
  $('#lg-debt').onclick = e => { e.stopPropagation(); toggleMenu(); };
  $$('#lg-who .opt').forEach((b, i) => b.onclick = () => { S.log.payer = b.dataset.p; syncPayer(); updateLog(); });
  $$('#sh-log .key').forEach(b => b.addEventListener('click', () => keyPress(b.dataset.k)));
  miniShown = null;
  updateLog();
}
function syncPayer() {
  const wi = ['sam', 'alex', 'both'].indexOf(S.log.payer);
  $$('#lg-who .opt').forEach((o, i) => o.classList.toggle('on', i === wi));
  $('#lg-who .thumb').style.transform = `translateX(${wi * 100}%)`;
}
function amtCents() { const v = parseFloat(S.log.amt || '0'); return Math.round((isNaN(v) ? 0 : v) * 100); }
let bumpT;
function keyPress(k) {
  if (!S.log) return;
  let a = S.log.amt; const d = debt(S.log.id);
  if (k === 'del') a = a.slice(0, -1);
  else if (k === '.') { if (a.includes('.')) return bump(); a = (a || '0') + '.'; }
  else {
    if (a === '0') a = '';
    const [ip, fp] = a.split('.');
    if (fp !== undefined && fp.length >= 2) return bump();
    if (fp === undefined && ip.length >= 5) return bump();
    a += k;
  }
  if (Math.round(parseFloat(a || '0') * 100) > d.bal) return bump(`Only ${money(d.bal)} left on ${d.name}`);
  S.log.amt = a; clearTimeout(bumpT); updateLog();
}
function bump(msg) {
  const el = $('#lg-amt'); el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  if (msg) { $('#lg-hint').innerHTML = msg; clearTimeout(bumpT); bumpT = later(() => S.log && updateLog(), 1800); }
}
let miniShown = null, miniAnim = [];
function updateLog() {
  const L = S.log, d = debt(L.id), c = amtCents();
  $('#lg-debt').innerHTML = `<div class="sq" style="width:24px;height:24px;border-radius:7px;background:var(--${d.owner}t);display:flex;align-items:center;justify-content:center">${I(d.icon, 14, `var(--${d.owner})`)}</div>${d.name} ${I('chev_ud', 13, 'var(--ink2)', { w: 2.6 })}`;
  const raw = L.amt, [ip, fp] = raw.split('.');
  const txt = (ip ? (+ip).toLocaleString('en-US') : '0') + (raw.includes('.') ? '.' + (fp || '') : '');
  const empty = !raw, fs = txt.length > 7 ? 60 : txt.length > 5 ? 68 : 76;
  const amt = $('#lg-amt'); amt.style.fontSize = fs + 'px';
  amt.innerHTML = `<span style="font-size:${Math.round(fs * .53)}px;margin-top:${Math.round(fs * .1)}px;margin-right:2px;color:var(--ink2)">$</span><span style="color:${empty ? 'var(--ink3)' : 'var(--ink)'}">${txt}</span><span class="caret" style="height:${Math.round(fs * .76)}px"></span>`;
  const after = d.bal - c, sug = Math.min(d.bal, d.suggest || 32000);
  $('#lg-hint').innerHTML = empty ? `Suggested this month: <button id="lg-suggest" style="color:var(--accent);font-weight:600">${money(sug)}</button>`
    : after <= 0 ? `${I('check_circle_fill', 15, 'var(--success)', { knock: 'var(--sheet)' })}That pays off <b style="color:var(--ink);font-weight:600">${d.name}</b>`
    : `${d.name} drops to <b style="color:var(--ink);font-weight:600">${money(after)}</b>`;
  const sg = $('#lg-suggest'); if (sg) sg.onclick = () => { S.log.amt = String(sug / 100); updateLog(); };
  const before = totals(), T = totals(S.debts.map(x => x.id === d.id ? { ...x, bal: x.bal - c } : x));
  $('#lg-left').textContent = '$' + heroMoney(T.left);
  const p = v => pct(v) + '%';
  const nudge = L.payer === 'sam' ? 'Alex gets a nudge' : L.payer === 'alex' ? 'Sam gets a nudge' : 'high-fives all round';
  let rings;
  if (!c) rings = `Sam ${p(before.sam)} · Alex ${p(before.alex)} · type an amount`;
  else if (d.owner === 'mine') rings = `Sam’s ring ${p(before.sam)} → ${p(T.sam)} · ${nudge}`;
  else if (d.owner === 'yours') rings = `Alex’s ring ${p(before.alex)} → ${p(T.alex)} · ${nudge}`;
  else rings = `Sam ${p(before.sam)}→${p(T.sam)} · Alex ${p(before.alex)}→${p(T.alex)} · ${nudge}`;
  $('#lg-rings').textContent = rings;
  const save = $('#lg-save'); save.style.opacity = c > 0 ? 1 : .38; save.style.pointerEvents = c > 0 ? 'auto' : 'none';
  const tgt = { sam: T.sam, alex: T.alex };
  if (!miniShown) { miniShown = { ...tgt }; setRing($('#mini-sam'), tgt.sam); setRing($('#mini-alex'), tgt.alex); return; }
  miniAnim.forEach(a => a.stop());
  const from = { ...miniShown };
  miniAnim = ['sam', 'alex'].map(k => tween({ from: from[k], to: tgt[k], spring: SP.soft, onUpdate: v => { miniShown[k] = v; setRing($('#mini-' + k), v); } }));
}
function toggleMenu() {
  const m = $('#lg-menu');
  if (m.classList.contains('on')) return closeMenu();
  const list = ORDER.map(debt).filter(d => d.bal > 0 && d.vis !== 'exists');
  m.innerHTML = list.map(d => `<button class="mi" data-id="${d.id}" style="width:100%;text-align:left">
    <span style="width:18px;display:flex">${d.id === S.log.id ? I('check', 16, 'var(--accent)', { w: 3 }) : ''}</span>
    <span style="flex:1">${d.name}</span><span class="r" style="color:var(--ink2);font-size:15px">${money(d.bal)}</span></button>`).join('');
  $$('.mi', m).forEach(b => b.onclick = e => {
    e.stopPropagation(); const d = debt(b.dataset.id); S.log.id = d.id; S.log.payer = payerFor(d);
    if (amtCents() > d.bal) S.log.amt = String(d.bal / 100);
    syncPayer(); closeMenu(); updateLog();
  });
  m.classList.add('on');
}
function closeMenu() { const m = $('#lg-menu'); if (m) m.classList.remove('on'); }
$('#sh-log').addEventListener('click', e => { if (!e.target.closest('#lg-menu') && !e.target.closest('#lg-debt')) closeMenu(); });
function saveLog() {
  const L = S.log; if (!L) return;
  const d = debt(L.id), c = amtCents(); if (!c) return;
  const before = totals();
  d.bal = Math.max(0, d.bal - c);
  const paidOff = d.bal === 0; if (paidOff) d.paidOn = 'Sep 28';
  const T = totals();
  closeSheet(); S.log = null;
  renderDebtList(false); renderPlan(); updateHome(true);
  const nudge = L.payer === 'sam' ? 'Alex got a nudge' : L.payer === 'alex' ? 'Sam got a nudge' : 'high-fives sent';
  if (S.tab === 'home') later(() => animateHomeTo({ sam: T.sam, alex: T.alex, left: T.left }, { from: { sam: before.sam, alex: before.alex, left: before.left }, heroDur: 1400 }), 420);
  const ok = I('check_circle_fill', 18, 'var(--success)', { knock: 'var(--surface)' });
  later(() => toast(paidOff ? `${ok}${d.name} is paid off!` : `${ok}Logged ${money(c)} · ${nudge}`), 650);
}
document.addEventListener('keydown', e => {
  if (openSheetId === 'log') {
    if (/^[0-9.]$/.test(e.key)) { keyPress(e.key); flashKey(e.key); }
    else if (e.key === 'Backspace') { keyPress('del'); flashKey('del'); }
    else if (e.key === 'Enter') saveLog();
    else if (e.key === 'Escape') closeSheet();
  } else if (e.key === 'Escape') closeSheet();
});
function flashKey(k) { const b = $(`#sh-log .key[data-k="${k}"]`); if (!b) return; b.classList.add('down'); later(() => b.classList.remove('down'), 120); }

/* ---------- settings ---------- */
function miniPreview(kind) {
  const L = { bg: '#FBF5F0', ink: '#2B1A29', s: '#B45FA4', a: '#D59849', tr: 'rgba(140,63,127,.14)', card: '#fff' };
  const D = { bg: '#170F17', ink: '#F8EEF1', s: '#E39BD3', a: '#F1BB74', tr: 'rgba(222,147,207,.18)', card: '#231824' };
  const m = w => `-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - ${w}px),#000 calc(100% - ${w - .4}px));mask:radial-gradient(farthest-side,transparent calc(100% - ${w}px),#000 calc(100% - ${w - .4}px))`;
  const one = (c, clip) => `<div style="position:absolute;inset:0;background:${c.bg};${clip ? `clip-path:${clip}` : ''}">
    <div style="position:absolute;left:8px;top:12px;width:22px;height:4px;border-radius:2px;background:${c.ink};opacity:.8"></div>
    <div style="position:absolute;left:11px;top:26px;width:36px;height:36px;border-radius:50%;background:conic-gradient(${c.s} 0 72%,${c.tr} 0);${m(5)}"></div>
    <div style="position:absolute;left:17px;top:32px;width:24px;height:24px;border-radius:50%;background:conic-gradient(${c.a} 0 63%,${c.tr} 0);${m(5)}"></div>
    <div style="position:absolute;left:8px;right:8px;top:72px;height:20px;border-radius:6px;background:${c.card}"></div></div>`;
  if (kind === 'light') return one(L); if (kind === 'dark') return one(D);
  return one(L) + one(D, 'polygon(100% 0,100% 100%,0 100%)');
}
function renderSettings() {
  const opts = [['system', 'Automatic'], ['light', 'Light'], ['dark', 'Dark']];
  $('#sh-settings').innerHTML = `<div class="grain"></div><div class="inner" style="padding-bottom:26px">
  <div class="drag" style="touch-action:none"><div class="grabber"></div>
  <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 14px 4px">
    <div style="width:44px"></div><div style="font-size:17px;font-weight:600;letter-spacing:-.4px">Settings</div>
    <button class="gbtn glass press" id="st-close" aria-label="Close">${I('xmark', 19, 'currentColor', { w: 2.4 })}</button></div></div>
  <div class="eyebrow" style="padding:10px 32px 8px;font-size:11px">Appearance</div>
  <div class="card sq" style="margin:0 16px;border-radius:26px;padding:6px 0"><div class="appear">
    ${opts.map(([k, l]) => `<button class="opt press${S.theme === k ? ' on' : ''}" data-theme="${k}">
      <div class="mini">${miniPreview(k)}</div><div style="font-size:14px;font-weight:500;letter-spacing:-.2px">${l}</div>
      <div class="radio">${S.theme === k ? I('check', 13, 'var(--onprimary)', { w: 3.4 }) : ''}</div></button>`).join('')}
  </div></div>
  <div style="font-size:13px;color:var(--ink2);padding:8px 32px 0;line-height:18px">Automatic follows your iPhone’s Light or Dark setting.</div>
  <div class="eyebrow" style="padding:18px 32px 8px;font-size:11px">Sam &amp; Alex</div>
  <div class="card sq list">
    <button class="li" id="st-date" style="width:100%;text-align:left"><div class="lic" style="background:var(--minet)">${I('calendar', 17, 'var(--mine)')}</div><span style="flex:1">Wedding day</span><span style="color:var(--ink2);font-size:16px;margin-right:4px">${fmtDate(S.wedding, { month: 'short', day: 'numeric', year: 'numeric' })}</span>${I('chev_r', 12, 'var(--ink3)', { w: 3 })}</button>
    <button class="li" id="st-reset" style="width:100%;text-align:left"><div class="lic" style="background:var(--neut)">${I('arrow_ccw', 17, 'var(--ink2)')}</div><span style="flex:1">Reset prototype</span></button>
  </div>
  <div style="text-align:center;font-size:12px;color:var(--ink3);margin-top:14px">Prototype · viewing as Sam</div>
  </div>`;
  $('#st-close').onclick = () => closeSheet();
  $$('#sh-settings .appear .opt').forEach(b => b.onclick = () => { setTheme(b.dataset.theme); renderSettingsRadios(); });
  $('#st-date').onclick = () => { closeSheet(); later(replayOnboarding, 320); };
  $('#st-reset').onclick = () => { closeSheet(); later(resetAll, 320); };
}
function renderSettingsRadios() {
  $$('#sh-settings .appear .opt').forEach(b => { const on = b.dataset.theme === S.theme; b.classList.toggle('on', on); b.querySelector('.radio').innerHTML = on ? I('check', 13, 'var(--onprimary)', { w: 3.4 }) : ''; });
}
function replayOnboarding() {
  S.pendingWedding = S.wedding; const d = new Date(S.wedding); S.cal = { y: d.getUTCFullYear(), m: d.getUTCMonth() };
  renderOnboarding();
  const ob = $('#onboarding'), main = $('#main');
  ob.style.display = ''; ob.style.visibility = ''; ob.style.transition = 'none'; ob.classList.add('pushed-out'); void ob.offsetWidth; ob.style.transition = '';
  requestAnimationFrame(() => { ob.classList.remove('pushed-out'); main.classList.add('pushed-in'); });
}
function resetAll() {
  S.debts = freshDebts(); S.merged = false; S.filter = 'all'; S.wedding = S.pendingWedding = Date.UTC(2027, 4, 22); S.cal = { y: 2027, m: 4 };
  renderDebts(); renderPlan(); renderHome(); switchTab('home'); homeIntro();
  toast(I('arrow_ccw', 17, 'var(--accent)') + 'Prototype reset');
}

/* ---------- privacy explainer ---------- */
function renderPrivacy() {
  const pts = [['eye_slash', 'Name, lender, APR and balance stay with Alex'], ['heart_fill', 'Nothing to fix here. Privacy is part of the plan'], ['bubbles_fill', 'Curious? Bring it up in your weekly check-in']];
  $('#sh-privacy').innerHTML = `<div class="grain"></div><div class="inner" style="padding:0 24px 28px">
  <div class="drag" style="touch-action:none;margin:0 -24px"><div class="grabber"></div>
  <div style="display:flex;justify-content:flex-end;padding:8px 14px 0"><button class="gbtn glass press" id="pv-close" aria-label="Close">${I('xmark', 19, 'currentColor', { w: 2.4 })}</button></div></div>
  <div style="display:flex;justify-content:center;margin-top:-18px"><div class="sq" style="width:64px;height:64px;border-radius:20px;background:var(--neut);display:flex;align-items:center;justify-content:center">${I('lock_fill', 30, 'var(--ink2)')}</div></div>
  <div class="d" style="text-align:center;font-size:24px;font-weight:700;letter-spacing:-.3px;margin-top:16px;line-height:29px">Alex keeps this one <span class="serif" style="font-weight:400;font-size:29px;color:var(--accent)">private</span></div>
  <div style="text-align:center;font-size:16px;line-height:22px;color:var(--ink2);margin-top:10px;letter-spacing:-.25px">Alex chose to share that this debt exists, not the details. Its balance still counts toward your shared countdown, so your number stays honest.</div>
  <div class="sq" style="margin-top:18px;border-radius:20px;background:var(--surface);box-shadow:var(--cardshadow);padding:4px 0">
    ${pts.map(([ic, t], i) => `<div style="display:flex;gap:12px;align-items:center;padding:10px 14px;position:relative">${I(ic, 18, 'var(--accent)')}<span style="font-size:15px;letter-spacing:-.2px;line-height:20px">${t}</span>${i < 2 ? '<div style="position:absolute;left:44px;right:0;bottom:0;height:.5px;background:var(--hair)"></div>' : ''}</div>`).join('')}
  </div>
  <button class="btn primary press" id="pv-ok" style="margin-top:20px">Got it</button>
  <button class="press" id="pv-ask" style="display:block;margin:14px auto 0;font-size:16px;font-weight:600;color:var(--accent);letter-spacing:-.3px">Add to Sunday’s check-in</button>
  </div>`;
  $('#pv-close').onclick = $('#pv-ok').onclick = () => closeSheet();
  $('#pv-ask').onclick = () => { closeSheet(); later(() => toast(I('bubbles_fill', 17, 'var(--accent)') + 'Added as a gentle topic for Sunday'), 350); };
}

/* ---------- toast ---------- */
let toastT;
function toast(html) {
  const t = $('#toast'); t.innerHTML = html; t.classList.remove('on'); void t.offsetWidth; t.classList.add('on');
  clearTimeout(toastT); toastT = later(() => t.classList.remove('on'), 2600);
}
$('#toast').style.transition = `transform var(--sp-bouncy-d) var(--sp-bouncy),opacity .3s`;

/* ================= Become One ================= */
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function confettiSpecs(seed = 7, n = 70, w = 393, h = 852) {
  // same placement rules as screens.py confetti(): sparse, clear of the ring and headline
  const r = mulberry(seed), foils = [['#FCE7C8', '#D9A55A'], ['#FFFFFF', '#E9DCE3'], ['#F3B596', '#FFD9C4'], ['#B8CB4C', '#E4EFA0'], ['#F7D9A8', '#B98A47']], out = [];
  for (let i = 0; i < n; i++) {
    const y = h * Math.pow(r(), 1.9) * .62, x = r() * w;
    if (y > 250 && y < 480 && x > 70 && x < 323 && r() < .85) continue;
    if (y > 450 || y < 54) continue;
    const [a, b] = foils[[0, 0, 1, 1, 2, 2, 3, 4][Math.floor(r() * 8)]];
    const rot = -80 + r() * 160, op = .55 + r() * .45, blur = r() < .18, sliver = r() < .72;
    out.push(sliver ? { x, y, a, b, rot, op, blur, w: 1.6 + r(), h: 7 + r() * 8, ang: Math.floor(r() * 180) } : { x, y, a, b, rot, op, blur, w: 2.4 + r() * 2.2, round: true });
  }
  return out;
}
function renderBecome() {
  const size = 248, r = 104, w = 32, D = 2 * r + w, off = (size - D) / 2;
  const mask = W => `radial-gradient(farthest-side,transparent calc(100% - ${W}px),#000 calc(100% - ${W - 0.6}px),#000 calc(100% - .6px),transparent 100%)`;
  const box = `left:${off}px;top:${off}px;width:${D}px;height:${D}px;border-radius:50%`;
  // Sam = outer half of the fused band, Alex = inner half: sliding together they nest into exactly the fused ring.
  const thin = (id, c0, c1, glow, inset, bw) => `<div id="${id}" style="position:absolute;left:${off + inset}px;top:${off + inset}px;width:${D - 2 * inset}px;height:${D - 2 * inset}px;border-radius:50%;opacity:0;will-change:transform,opacity">
    <div style="position:absolute;inset:0;border-radius:50%;box-shadow:0 0 34px 0 ${glow}"></div>
    <div style="position:absolute;inset:0;border-radius:50%;background:conic-gradient(from -90deg,${c0},${c1} 45%,${c0} 70%,${c1} 92%,${c0});-webkit-mask:${mask(bw)};mask:${mask(bw)}"></div>
    <div style="position:absolute;inset:0;border-radius:50%;background:radial-gradient(farthest-side,transparent calc(100% - ${bw}px),rgba(0,0,0,.16) calc(100% - ${bw - 1.5}px),transparent calc(100% - ${bw / 2}px),rgba(255,255,255,.3) calc(100% - 1.5px),transparent 100%);-webkit-mask:${mask(bw)};mask:${mask(bw)}"></div></div>`;
  $('#become').innerHTML = `
<div style="position:absolute;inset:0;background:radial-gradient(120% 70% at 50% 34%,rgba(255,255,255,.06),rgba(0,0,0,0) 60%),radial-gradient(140% 90% at 50% 110%,rgba(30,8,28,.45),rgba(0,0,0,0) 60%)"></div>
<div class="grain lite" style="opacity:.05"></div>
<div class="confetti" id="bo-confetti" style="position:absolute;inset:0;overflow:hidden;z-index:3;pointer-events:none"></div>
<div id="bo-rings" style="position:absolute;left:${(393 - size) / 2}px;top:170px;width:${size}px;height:${size}px;z-index:2">
  ${thin('bo-sam', '#A4569A', '#E39BD3', 'rgba(227,155,211,.22)', 0, w / 2)}
  ${thin('bo-alex', '#B8792F', '#F1BB74', 'rgba(241,187,116,.18)', w / 2, w / 2)}
  <div id="bo-fused" style="position:absolute;inset:0;opacity:0;will-change:transform,opacity">
    <div id="bo-glow" style="position:absolute;${box};box-shadow:0 0 60px 6px rgba(243,181,150,.20)"></div>
    <div style="position:absolute;${box};background:conic-gradient(from -90deg,#F3B596,#FFE7D8 22%,#FFFFFF 38%,#F9CDB4 60%,#F3B596 80%,#F7C3A6 92%,#F3B596);-webkit-mask:${mask(w)};mask:${mask(w)}"></div>
    <div style="position:absolute;${box};background:radial-gradient(farthest-side,transparent calc(100% - ${w}px),rgba(91,42,87,.18) calc(100% - ${w - 2}px),transparent calc(100% - ${w / 2}px),rgba(255,255,255,.35) calc(100% - 2px),transparent 100%);-webkit-mask:${mask(w)};mask:${mask(w)}"></div>
    <div id="bo-sheen" style="position:absolute;${box};background:conic-gradient(from 0deg,transparent 0deg,rgba(255,255,255,0) 20deg,rgba(255,255,255,.6) 40deg,rgba(255,255,255,0) 60deg,transparent 360deg);-webkit-mask:${mask(w)};mask:${mask(w)};opacity:0;mix-blend-mode:soft-light"></div>
  </div>
  <div class="bo-echo" style="position:absolute;left:${off - 16}px;top:${off}px;width:${D}px;height:${D}px;border-radius:50%;border:1px solid rgba(243,181,150,.16);opacity:0"></div>
  <div class="bo-echo" style="position:absolute;left:${off + 16}px;top:${off}px;width:${D}px;height:${D}px;border-radius:50%;border:1px solid rgba(243,181,150,.16);opacity:0"></div>
  <div id="bo-label" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0">
    <div class="serif" style="font-size:70px;line-height:1;color:#FFF6EF;margin-top:-4px">One</div>
    <div class="r" style="font-size:13px;font-weight:600;letter-spacing:.3px;color:#F3B596;margin-top:4px">Sam + Alex</div>
  </div>
</div>
<div style="position:absolute;left:0;right:0;top:462px;text-align:center;z-index:2">
  <div class="bo-fade" style="font-size:12px;font-weight:600;letter-spacing:2.2px;color:#F3B596">MILESTONE · BECOME ONE</div>
  <div class="d bo-fade" style="font-size:38px;font-weight:700;letter-spacing:.2px;line-height:44px;margin-top:14px">Two plans,</div>
  <div class="serif bo-fade" style="font-size:54px;line-height:48px;color:#F3B596;margin-top:-2px">now one.</div>
  <div class="bo-fade" style="font-size:16px;line-height:23px;color:rgba(251,245,240,.80);margin:16px auto 0;width:318px;letter-spacing:-.25px">
    You merged 5 debts into one payoff order. Contributions stay 50/50, and you can change that anytime.</div>
</div>
<button class="btn press bo-fade" id="bo-plan" style="position:absolute;z-index:4;left:24px;right:24px;width:auto;bottom:98px;height:54px;border-radius:27px;background:#FBF5F0;color:#5B2A57;box-shadow:0 10px 30px -10px rgba(0,0,0,.45),inset 0 -1px 0 rgba(91,42,87,.08)">See our plan</button>
<button class="press bo-fade" id="bo-keep" style="position:absolute;z-index:4;left:60px;right:60px;bottom:44px;height:40px;text-align:center;font-size:16px;font-weight:600;color:#F3B596;letter-spacing:-.3px">Not yet? Keep separate</button>`;
  $('#bo-plan').onclick = () => closeBecome(true);
  $('#bo-keep').onclick = () => closeBecome(false);
}
let boTimers = [];
const A = (el, kf, o) => el.animate(kf, { fill: 'both', ...o });
function playBecomeOne() {
  renderBecome();
  const ov = $('#become'); ov.removeAttribute('aria-hidden');
  stage.classList.add('on-plum');
  requestAnimationFrame(() => ov.classList.add('on'));
  const sam = $('#bo-sam'), alex = $('#bo-alex'), fused = $('#bo-fused'), label = $('#bo-label');
  const fades = $$('.bo-fade', ov), echoes = $$('.bo-echo', ov);
  if (REDUCED) {   // Reduce Motion: cross-fade straight to the fused state, no confetti
    fused.style.opacity = 1; label.style.opacity = 1; echoes.forEach(e => e.style.opacity = 1);
    fades.forEach(f => { f.style.opacity = 1; f.style.transform = 'none'; }); return;
  }
  const ease = 'cubic-bezier(.2,.8,.2,1)', t0 = 250;
  // 1. two rings arrive, apart
  A(sam, [{ transform: 'translateX(-86px) scale(.94)', opacity: 0 }, { transform: 'translateX(-72px) scale(1)', opacity: 1 }], { duration: 520, delay: t0, easing: ease });
  A(alex, [{ transform: 'translateX(86px) scale(.94)', opacity: 0 }, { transform: 'translateX(72px) scale(1)', opacity: 1 }], { duration: 520, delay: t0 + 80, easing: ease });
  // 2. slide together on a soft spring and nest: Sam outside, Alex inside
  const t1 = t0 + 820;
  A(sam, [{ transform: 'translateX(-72px)', opacity: 1 }, { transform: 'translateX(0px)', opacity: 1 }], { duration: SP.slide.dur, delay: t1, easing: SP.slide.easing, fill: 'forwards' });
  A(alex, [{ transform: 'translateX(72px)', opacity: 1 }, { transform: 'translateX(0px)', opacity: 1 }], { duration: SP.slide.dur, delay: t1, easing: SP.slide.easing, fill: 'forwards' });
  // 3. fuse: the nested two-tone band warms into one apricot-to-white ring
  const t2 = t1 + 980;
  [sam, alex].forEach(el => A(el, [{ filter: 'brightness(1)' }, { filter: 'brightness(1.7)' }], { duration: 380, delay: t2, easing: 'ease-in' }));
  [sam, alex].forEach(el => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, delay: t2 + 160, easing: 'ease-out', fill: 'forwards' }));
  A(fused, [{ opacity: 0, transform: 'scale(.985)', filter: 'brightness(1.6)' }, { opacity: 1, transform: 'scale(1)', filter: 'brightness(1)' }], { duration: 620, delay: t2 + 80, easing: ease });
  // 4. "double heartbeat" pulse + glow bloom + foil sheen
  const t3 = t2 + 520;
  A($('#bo-rings'), [{ transform: 'scale(1)' }, { transform: 'scale(1.055)', offset: .16 }, { transform: 'scale(1)', offset: .36 }, { transform: 'scale(1.03)', offset: .52 }, { transform: 'scale(1)' }], { duration: 900, delay: t3, easing: 'ease-in-out' });
  A($('#bo-glow'), [{ boxShadow: '0 0 60px 6px rgba(243,181,150,.2)' }, { boxShadow: '0 0 90px 24px rgba(243,181,150,.42)', offset: .25 }, { boxShadow: '0 0 60px 6px rgba(243,181,150,.2)' }], { duration: 1500, delay: t3, easing: 'ease-out' });
  A($('#bo-sheen'), [{ opacity: 0, transform: 'rotate(-40deg)' }, { opacity: 1, offset: .3 }, { opacity: 0, transform: 'rotate(320deg)' }], { duration: 1600, delay: t3 + 100, easing: 'cubic-bezier(.4,0,.2,1)' });
  echoes.forEach((e, i) => A(e, [{ opacity: 0, transform: `translateX(${i ? -16 : 16}px)` }, { opacity: 1, transform: 'none' }], { duration: 900, delay: t3 + 200, easing: ease }));
  A(label, [{ opacity: 0, transform: 'scale(.92)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0px)' }], { duration: 700, delay: t3 + 120, easing: ease });
  // 5. sparse foil confetti, brief
  const specs = buildConfetti();
  boTimers.push(later(() => confetti(specs), t3));
  // 6. headline + actions
  fades.forEach((f, i) => A(f, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 640, delay: t3 + 380 + i * 110, easing: ease }));
}
function buildConfetti() {
  const box = $('#bo-confetti'); if (!box) return [];
  const specs = confettiSpecs(7, 70);
  box.innerHTML = specs.map(s => s.round
    ? `<i style="left:${s.x.toFixed(1)}px;top:${s.y.toFixed(1)}px;width:${s.w.toFixed(1)}px;height:${s.w.toFixed(1)}px;border-radius:50%;opacity:0;background:radial-gradient(circle at 35% 30%,#fff,${s.b});${s.blur ? 'filter:blur(.7px);' : ''}"></i>`
    : `<i style="left:${s.x.toFixed(1)}px;top:${s.y.toFixed(1)}px;width:${s.w.toFixed(1)}px;height:${s.h.toFixed(1)}px;border-radius:1px;opacity:0;background:linear-gradient(${s.ang}deg,${s.a},${s.b} 55%,${s.a});box-shadow:0 0 3px rgba(255,220,180,.25);${s.blur ? 'filter:blur(.7px);' : ''}"></i>`).join('');
  return specs;
}
function confetti(specs) {
  const box = $('#bo-confetti'); if (!box) return;
  const r = mulberry(99);
  $$('i', box).forEach((el, i) => {
    const s = specs[i], fall = s.y + 40 + r() * 160, drift = (r() - .5) * 60, spin = (r() - .5) * 540, dur = 1250 + r() * 650, d = r() * 260, fadeAt = 2500 + r() * 900;
    // foil flutter: 2D rotate plus a scaleX flip (cheap on the compositor)
    el.animate([
      { transform: `translate(${drift}px,${-fall}px) rotate(${s.rot - spin}deg) scaleX(1)`, opacity: 0 },
      { opacity: s.op, offset: .1 },
      { transform: `translate(${drift * .6}px,${-fall * .45}px) rotate(${s.rot - spin * .45}deg) scaleX(-.4)`, offset: .4 },
      { transform: `translate(${drift * .25}px,${-fall * .1}px) rotate(${s.rot - spin * .1}deg) scaleX(.5)`, opacity: s.op, offset: .72 },
      { transform: `translate(0px,0px) rotate(${s.rot}deg) scaleX(1)`, opacity: s.op }], { duration: dur, delay: d, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'forwards' });
    el.animate([{ transform: `translate(0px,0px) rotate(${s.rot}deg) scaleX(1)`, opacity: s.op }, { transform: `translate(0px,${20 + r() * 26}px) rotate(${s.rot + 30}deg) scaleX(1)`, opacity: 0 }], { duration: 1300, delay: Math.max(fadeAt, d + dur), easing: 'ease-in', fill: 'forwards' });
  });
}
function closeBecome(merge) {
  boTimers.forEach(clearTimeout); boTimers = [];
  const ov = $('#become'); ov.classList.remove('on'); ov.setAttribute('aria-hidden', 'true'); stage.classList.remove('on-plum');
  later(() => { if (!ov.classList.contains('on')) ov.innerHTML = ''; }, 520);
  if (merge) { S.merged = true; renderPlan(); updateHome(false); switchTab('plan'); later(() => toast(I('heart_fill', 17, '#B45FA4') + 'One plan. Nicely done, you two.'), 450); }
  else later(() => toast(I('heart_fill', 17, 'var(--accent)') + 'Separate plans it is. Merge anytime.'), 450);
}

/* ================= theme ================= */
const mq = matchMedia('(prefers-color-scheme: dark)');
const resolvedTheme = () => S.theme === 'system' ? (mq.matches ? 'dark' : 'light') : S.theme;
function applyTheme(animate) {
  const t = resolvedTheme();
  const go = () => {
    for (const el of [stage, document.body]) { el.classList.toggle('dark', t === 'dark'); el.classList.toggle('light', t === 'light'); }
    $$('meta[name="theme-color"]').forEach(m => m.setAttribute('content', t === 'dark' ? '#170F17' : '#FBF5F0'));
  };
  if (animate && document.startViewTransition && !REDUCED) document.startViewTransition(go); else go();
}
function setTheme(t) { S.theme = t; try { localStorage.setItem('tddup-theme', t); } catch (e) {} applyTheme(true); }
mq.addEventListener('change', () => { if (S.theme === 'system') applyTheme(true); });

/* ================= stage fit / device chrome ================= */
const isIOS = /iPhone|iPod/.test(navigator.userAgent);
if ((isIOS && params.get('chrome') !== '1') || params.get('chrome') === '0') document.body.classList.add('native');
let _scale = 1; const stageScale = () => _scale;
function fit() {
  const w = innerWidth, h = innerHeight, framed = w >= 560 && h >= 500 && !params.has('bare');
  document.body.classList.toggle('framed', framed);
  _scale = framed ? Math.min((h - 64) / 852, (w - 64) / 393, 1.2) : Math.min(w / 393, h / 852);
  stage.style.transform = Math.abs(_scale - 1) < 0.001 ? 'none' : `scale(${_scale})`;
}
addEventListener('resize', fit); fit();

/* ================= boot ================= */
applyTheme(false);
renderOnboarding(); renderHome(); renderDebts(); renderPlan(); renderCheckin();
if (params.get('start') === 'home') {
  $('#onboarding').style.display = 'none'; const m = $('#main'); m.style.transition = 'none'; m.classList.remove('pushed-in'); m.removeAttribute('aria-hidden');
  void m.offsetWidth; m.style.transition = ''; later(homeIntro, 200);
}
window.__proto = { S, totals, switchTab, openLog, playBecomeOne, setTheme, openSheet, closeSheet };
})();
