(function () {
'use strict';
/* ===================== základ: utility, stav, vykreslování ===================== */
const D = window.MN_DATA, CAT = D.CATALOG, Lf = window.L;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = s => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const mondayOf = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); return addDays(x, -((x.getDay() + 6) % 7)); };
const fDay = new Intl.DateTimeFormat('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric' });
const fDayLong = new Intl.DateTimeFormat('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' });
const fDate = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' });
const fDM = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric' });
const fTime = new Intl.DateTimeFormat('cs-CZ', { hour: '2-digit', minute: '2-digit' });
const fMonth = new Intl.DateTimeFormat('cs-CZ', { month: 'long', year: 'numeric' });
const nf = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 1 });
const SLOTS = ['8:00–10:00', '10:00–12:00', '12:00–14:00', '14:00–16:00'];
const DAYS = ['Po', 'Út', 'St', 'Čt', 'Pá'];
const H = 3600e3;
const TODAY = new Date();
const todayISO = iso(TODAY);

const TOPIC = {}; CAT.topicGroups.forEach(g => g.items.forEach(([c, l]) => { TOPIC[c] = l; }));
const ACT = Object.fromEntries(CAT.activities.map(a => [a.code, a.label]));
const AUD = Object.fromEntries(CAT.audiences), NEED = Object.fromEntries(CAT.needs), REW = Object.fromEntries(CAT.rewards);
const TOG = Object.fromEntries(CAT.together), CHAN = Object.fromEntries(CAT.channels), TRANS = Object.fromEntries(CAT.transport);
const MOB = Object.fromEntries(CAT.mobility), ITYPE = Object.fromEntries(CAT.instTypes), DUR = Object.fromEntries(CAT.durations);

function km(a, b) {
  const R = 6371, r = x => x * Math.PI / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const kmTxt = d => d < 1 ? `${Math.round(d * 10) * 100} m` : `${nf.format(Math.round(d * 10) / 10)} km`;
const minutesByMhd = d => Math.max(10, Math.round(d * 4 + 8)); // hrubý odhad pro prototyp

/* ---------- stav ---------- */
const KEY = 'mezinami-prototyp-v3';
function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) { const x = JSON.parse(raw); if (x && x.version === 3 && x.seededAt === todayISO) return x; } } catch (e) { /* bez úložiště jedeme v paměti */ }
  return D.seed(TODAY);
}
let S = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignorovat */ } }
function resetDemo() { S = D.seed(TODAY); U.sheet = null; U.chatId = null; U.menu = false; save(); }

const pref = (k, v) => { try { if (v === undefined) return localStorage.getItem('mn-' + k); localStorage.setItem('mn-' + k, v); } catch (e) { return null; } };
const U = {
  tab: { senior: 'home', school: 'overview', staff: 'queue' }, sheet: null, weekIdx: 0, sMapMode: 'map', topicFilter: '', commMode: 'map', chatId: null,
  radius: 3, sf: { activity: '', topic: '', audience: '', aprob: false }, visitFilter: 'upcoming', mapViews: {}, menu: false, toast: null, confirmReset: false,
  scale: Number(pref('scale')) || 1, regResult: null, instResult: null, schoolMode: 'map'
};
document.documentElement.style.setProperty('--scale', U.scale);
const th = pref('theme'); if (th === 'dark' || th === 'light') document.documentElement.setAttribute('data-theme', th);

/* ---------- entity ---------- */
const sen = id => S.seniors.find(s => s.id === id);
const inst = id => S.institutions.find(i => i.id === id);
const role = () => S.session && S.session.role;
const me = () => S.session ? (S.session.role === 'senior' ? sen(S.session.uid) : S.session.role === 'school' ? inst(S.session.uid) : STAFF) : null;
const STAFF = { id: 'staff1', name: 'Petra Svobodová', title: 'koordinátorka Mezi námi', username: 'petra.svobodova' };
const fullName = s => `${s.first} ${s.last}`;
const shortName = s => `${s.first} ${s.last[0]}.`;
const initials = s => (s.first[0] + s.last[0]).toUpperCase();
const instInitials = i => i.name.replace(/^(ZŠ|MŠ|Gymnázium|Knihovna|Komunitní centrum)\s*/, '').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
function decade(s) {
  const age = TODAY.getFullYear() - s.birthYear, d = Math.floor(age / 10) * 10;
  const m = { 60: 'šedesát', 70: 'sedmdesát', 80: 'osmdesát', 90: 'devadesát' }[d] || '';
  return m ? (m + (s.gender === 'f' ? 'nice' : 'ník')) : `${age} let`;
}
const rating = s => s.ratingCount ? s.ratingSum / s.ratingCount : 0;
const stars = v => `<span class="stars" aria-label="hodnocení ${nf.format(v)} z 5">${'★'.repeat(Math.round(v))}${'☆'.repeat(5 - Math.round(v))}</span>`;
const pronoun = s => s.gender === 'f' ? 'paní' : 'pane';
const vocative = s => {
  const v = { 'Marie': 'Marie', 'Jiří': 'Jiří', 'Věra': 'Věro', 'Zdeněk': 'Zdeňku', 'Alena': 'Aleno', 'Karel': 'Karle', 'Ludmila': 'Ludmilo', 'Miroslav': 'Miroslave', 'Hana': 'Hano', 'Josef': 'Josefe', 'Eva': 'Evo', 'František': 'Františku', 'Jarmila': 'Jarmilo', 'Bohumil': 'Bohumile' };
  return v[s.first] || s.first;
};

/* ---------- týden a dostupnost ---------- */
const weekStart = idx => addDays(mondayOf(TODAY), 7 * (idx + 1));
const weekDates = idx => [0, 1, 2, 3, 4].map(i => iso(addDays(weekStart(idx), i)));
const weekConfirmed = (s, mondayISO) => s.confirmedWeeks.includes(mondayISO);
function isAvail(s, dateISO, slot) {
  const k = dateISO + '#' + slot;
  if (k in s.overrides) return s.overrides[k];
  const wd = (parseISO(dateISO).getDay() + 6) % 7;
  return wd < 5 && !!s.pattern[wd][slot];
}
function blockState(s, dateISO, slot) {
  if (s.hiddenUntil && dateISO <= s.hiddenUntil) return 'hidden';
  const bs = S.bookings.filter(b => b.seniorId === s.id && b.date === dateISO);
  if (bs.some(b => b.slot === slot && b.status === 'confirmed')) return 'confirmed';
  if (bs.some(b => b.slot === slot && b.status === 'pending')) return 'pending';
  if (s.maxOnePerDay && bs.some(b => b.status === 'confirmed')) return 'blockedDay';
  if (!isAvail(s, dateISO, slot)) return 'off';
  return weekConfirmed(s, iso(mondayOf(parseISO(dateISO)))) ? 'free' : 'unconfirmed';
}
function freeBlocks(s) {
  const out = [];
  [0, 1].forEach(w => weekDates(w).forEach(d => SLOTS.forEach((_, k) => { if (d > todayISO && blockState(s, d, k) === 'free') out.push({ date: d, slot: k }); })));
  return out;
}
const visibleToSchools = s => freeBlocks(s).length > 0;
const isNow = s => !!(s.availableNow && s.availableNow.until >= todayISO);
const activeCalls = instId => S.calls.filter(c => c.status === 'open' && c.deadline >= todayISO && (!instId || c.instId === instId));
const upcoming = b => b.date >= todayISO;
const sortB = (a, b) => a.date.localeCompare(b.date) || a.slot - b.slot;
const STATUS = { pending: 'Čeká na odpověď', confirmed: 'Potvrzeno', done: 'Proběhlo', declined: 'Odmítnuto', cancelled: 'Zrušeno' };
const pill = st => `<span class="pill ${st}">${STATUS[st] || st}</span>`;
const whenTxt = b => `${fDay.format(parseISO(b.date))} · ${SLOTS[b.slot]}`;
const ago = t => { const h = Math.round((Date.now() - t) / H); return h < 1 ? 'před chvílí' : h < 24 ? `před ${h} h` : `před ${Math.round(h / 24)} dny`; };

function log(action, detail) { S.audit.unshift({ at: Date.now(), who: S.session ? S.session.uid : '-', action, detail }); S.audit = S.audit.slice(0, 200); }
let toastTimer;
function toast(msg) { U.toast = msg; renderToast(); clearTimeout(toastTimer); toastTimer = setTimeout(() => { U.toast = null; renderToast(); }, 3400); }

/* ---------- ikony ---------- */
const ic = (p, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${p}</svg>`;
const ICON = {
  home: ic('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
  cal: ic('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  map: ic('<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>'),
  people: ic('<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.6a3 3 0 010 6M18 14c2 .8 3 2.8 3 6"/>'),
  user: ic('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>'),
  menu: ic('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  star: ic('<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>'),
  hand: ic('<path d="M7 11V6a1.5 1.5 0 013 0v4M10 10V4.5a1.5 1.5 0 013 0V10M13 10V5.5a1.5 1.5 0 013 0V12M16 9.5a1.5 1.5 0 013 0V14c0 4-3 7-7 7-3 0-4.6-1.4-6.3-4l-2.4-3.7a1.5 1.5 0 012.5-1.6L7 13.5"/>'),
  shield: ic('<path d="M12 3l8 3v6c0 4.6-3.4 8.2-8 9-4.6-.8-8-4.4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>'),
  phone: ic('<path d="M5 3h4l2 5-2.5 1.5a11 11 0 006 6L16 13l5 2v4a2 2 0 01-2 2A17 17 0 013 5a2 2 0 012-2z"/>'),
  nav: ic('<path d="M3 11l18-8-8 18-2-8z"/>'),
  check: ic('<path d="M5 12.5l4.5 4.5L19 7"/>'),
  x: ic('<path d="M6 6l12 12M18 6L6 18"/>'),
  clock: ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  plus: ic('<path d="M12 5v14M5 12h14"/>'),
  chat: ic('<path d="M4 5h16v11H9l-5 4z"/>'),
  back: ic('<path d="M15 5l-7 7 7 7"/>'),
  alert: ic('<path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17.5v.5"/>'),
  list: ic('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
  book: ic('<path d="M4 4h6a3 3 0 013 3v13a2 2 0 00-2-2H4zM20 4h-6a3 3 0 00-3 3v13a2 2 0 012-2h7z"/>'),
  chart: ic('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  tag: ic('<path d="M3 12V3h9l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>'),
  flag: ic('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
  inbox: ic('<path d="M3 13h5l1 3h6l1-3h5"/><path d="M5 5h14l2 8v6H3v-6z"/>'),
  card: ic('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.6-1.4 1.8-2 3-2s2.4.6 3 2M14 10h4M14 13h3"/>'),
  building: ic('<path d="M4 21V8l8-5 8 5v13"/><path d="M9 21v-5h6v5M8 11h.01M12 11h.01M16 11h.01"/>'),
  heart: ic('<path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/>'),
  lock: ic('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>'),
  out: ic('<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>'),
  copy: ic('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>'),
  edit: ic('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
  moon: ic('<path d="M20 14A8 8 0 1110 4a6.5 6.5 0 0010 10z"/>'),
  refresh: ic('<path d="M20 11a8 8 0 10-2.3 5.7M20 4v7h-7"/>'),
  swap: ic('<path d="M7 7h13l-3-3M17 17H4l3 3"/>'),
  eye: ic('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  send: ic('<path d="M4 12l16-8-6 16-2-6z"/>')
};
const LOGO = `<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><circle cx="12" cy="17" r="9" style="fill:var(--leaf)"/><circle cx="22.5" cy="13" r="6.5" style="fill:var(--sun)"/><circle cx="12" cy="17" r="9" style="fill:none;stroke:var(--surface);stroke-width:1.6"/></svg>`;

/* ---------- vykreslování ---------- */
let maps = [];
function destroyMaps() { maps.forEach(m => { try { m.remove(); } catch (e) { /* už pryč */ } }); maps = []; }
function render() {
  const keep = {}; $$('[data-keep]').forEach(el => { keep[el.id] = el.value; });
  const fid = document.activeElement && document.activeElement.id;
  destroyMaps();
  const root = $('#app');
  root.className = 'app' + (role() ? ' role-' + role() : '');
  root.innerHTML = viewRoot();
  Object.keys(keep).forEach(id => { const el = document.getElementById(id); if (el) el.value = keep[id]; });
  if (fid && keep[fid] !== undefined) { const f = document.getElementById(fid); if (f) f.focus(); }
  mountMaps();
  renderOverlay();
  renderToast();
  save();
  if (window.MN_TRACK) {
    const r = role();
    window.MN_TRACK.sync({ role: r || null, screen: r ? U.tab[r] : 'login', consent: r === 'senior' ? !!(me().consents && me().consents.analytics) : undefined });
  }
}
function renderOverlay() {
  const o = $('#overlay');
  const keep = {}; $$('input[id], textarea[id], select[id]', o).forEach(el => { if (el.type !== 'checkbox') keep[el.id] = el.value; });
  o.innerHTML = U.sheet ? `<div class="overlay" data-act="backdrop">${sheetView()}</div>` : '';
  Object.keys(keep).forEach(id => { const el = document.getElementById(id); if (el && o.contains(el)) el.value = keep[id]; });
  document.body.style.overflow = U.sheet ? 'hidden' : '';
  if (U.sheet) { const first = o.querySelector('[autofocus]') || o.querySelector('.sheet'); if (first && !o.contains(document.activeElement)) first.focus({ preventScroll: true }); }
  afterSheet();
  save();
}
function renderToast() { $('#toast').innerHTML = U.toast ? `<div class="toast" role="status">${esc(U.toast)}</div>` : ''; }
function openSheet(sheet) { U.sheet = sheet; U.menu = false; renderOverlay(); }
function closeSheet() { const s = U.sheet; U.sheet = null; stopSosTimer(); renderOverlay(); if (s && s.rerender) render(); }
function sheetWrap(title, body, opts = {}) {
  return `<div class="sheet ${opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}" tabindex="-1"><div class="sheet-grab"></div>
    <div class="sheet-head"><h2>${esc(title)}</h2>${opts.noClose ? '' : `<button class="iconbtn" data-act="closeSheet" aria-label="Zavřít">${ICON.x}</button>`}</div>${body}</div>`;
}

function viewRoot() {
  if (!S.session) return loginView();
  if (role() === 'senior') return seniorShell();
  if (role() === 'school') return schoolShell();
  return staffShell();
}
function topbar(right, below = '') {
  return `<header class="topbar"><div class="topbar-in">
    <div class="brand">${LOGO}<span class="brand-txt">Mezi námi</span></div><span class="demo-tag" title="Všechny osoby a instituce jsou smyšlené">Prototyp · ukázková data</span>
    <div class="who">${right}<div class="rel"><button class="iconbtn" data-act="menu" aria-label="Nabídka" aria-expanded="${U.menu}">${ICON.menu}</button>${U.menu ? menuPop() : ''}</div></div>
  </div>${below}</header>`;
}
function menuPop() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark' || (!document.documentElement.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  return `<div class="menu-pop" role="menu">
    <div class="small muted" style="padding:8px 12px">${esc(role() === 'senior' ? fullName(me()) : role() === 'school' ? me().contact + ', ' + me().name : STAFF.name + ', ' + STAFF.title)}</div>
    <button role="menuitem" data-act="switchRole">${ICON.swap.replace('<svg', '<svg style="width:18px;vertical-align:-4px;margin-right:8px"')}Přepnout roli (ukázka)</button>
    <button role="menuitem" data-act="theme">${ICON.moon.replace('<svg', '<svg style="width:18px;vertical-align:-4px;margin-right:8px"')}${dark ? 'Světlý vzhled' : 'Tmavý vzhled'}</button>
    <button role="menuitem" data-act="resetDemo">${ICON.refresh.replace('<svg', '<svg style="width:18px;vertical-align:-4px;margin-right:8px"')}${U.confirmReset ? 'Opravdu? Klikněte znovu' : 'Obnovit ukázková data'}</button>
    ${role() !== 'senior' ? `<button role="menuitem" data-act="analyticsPrefs">${ICON.shield.replace('<svg', '<svg style="width:18px;vertical-align:-4px;margin-right:8px"')}Nastavení měření</button>` : ''}
    <button role="menuitem" data-act="logout">${ICON.out.replace('<svg', '<svg style="width:18px;vertical-align:-4px;margin-right:8px"')}Odhlásit se</button>
  </div>`;
}
function chipsSel(name, items, selected = [], opts = {}) {
  return `<div class="chips" data-group="${name}" ${opts.max ? `data-max="${opts.max}"` : ''}>${items.map(([v, l]) => `<button type="button" class="chip" data-act="chip" data-val="${esc(v)}" aria-pressed="${selected.includes(v)}">${esc(l)}</button>`).join('')}</div>`;
}
const chipVals = (root, name) => $$(`[data-group="${name}"] .chip[aria-pressed="true"]`, root).map(c => c.dataset.val);
const tagChips = (codes, hl = []) => `<div class="chips">${codes.map(c => `<span class="chip static ${hl.includes(c) ? 'match' : ''}">${esc(TOPIC[c] || ACT[c] || c)}</span>`).join('')}</div>`;
const opt = (v, l, sel) => `<option value="${esc(v)}" ${String(sel) === String(v) ? 'selected' : ''}>${esc(l)}</option>`;
const allTopics = () => CAT.topicGroups.flatMap(g => g.items);
const empty = (icon, text) => `<div class="empty">${icon}<p>${text}</p></div>`;

/* ---------- mapa ---------- */
const MAPS = {};
const BOUNDS = [[49.90, 14.15], [50.22, 14.78]];
function baseMap(el, key, center, zoom) {
  const v = U.mapViews[key];
  const m = Lf.map(el, { minZoom: 11, maxZoom: 17, maxBounds: BOUNDS, maxBoundsViscosity: 1, zoomSnap: 0.5, scrollWheelZoom: true, tap: true });
  m.setView(v ? v.c : center, v ? v.z : zoom);
  m.attributionControl.setPrefix(false);
  m.attributionControl.addAttribution('Schematická mapa Prahy (prototyp) · ostrá verze: Mapy.com / OSM');
  Lf.polygon(D.PRAGUE, { className: 'map-prague', interactive: false }).addTo(m);
  Lf.polyline(D.VLTAVA, { className: 'map-river', interactive: false }).addTo(m);
  D.DISTRICTS.forEach(([n, la, lo]) => Lf.marker([la, lo], { interactive: false, keyboard: false, icon: Lf.divIcon({ className: 'district-label', html: n, iconSize: [70, 14], iconAnchor: [35, 7] }) }).addTo(m));
  m.on('moveend', () => { U.mapViews[key] = { c: m.getCenter(), z: m.getZoom() }; });
  maps.push(m);
  return m;
}
function mountMaps() {
  if (!Lf) { $$('[data-map]').forEach(el => { el.innerHTML = '<div class="empty">Mapu se nepodařilo načíst. Použijte zobrazení Seznam.</div>'; }); return; }
  $$('[data-map]').forEach(el => { const fn = MAPS[el.dataset.map]; if (fn) fn(el); });
}
function pinIcon(kind, badge = 0, label = '') {
  const shapes = {
    school: `<path d="M17 39C17 39 3 24 3 15a14 14 0 0128 0c0 9-14 24-14 24z" style="fill:var(--sun);stroke:#fff;stroke-width:2"/><path d="M10 21v-7l7-4 7 4v7M14.5 21v-3.5h5V21" style="fill:none;stroke:#fff;stroke-width:1.8;stroke-linejoin:round"/>`,
    knih: `<path d="M17 39C17 39 3 24 3 15a14 14 0 0128 0c0 9-14 24-14 24z" style="fill:var(--sun);stroke:#fff;stroke-width:2"/><path d="M10 11h5a2 2 0 012 2v9a1.5 1.5 0 00-1.5-1.5H10zM24 11h-5a2 2 0 00-2 2v9a1.5 1.5 0 011.5-1.5H24z" style="fill:none;stroke:#fff;stroke-width:1.6;stroke-linejoin:round"/>`,
    ds: `<path d="M17 39C17 39 3 24 3 15a14 14 0 0128 0c0 9-14 24-14 24z" style="fill:var(--sun);stroke:#fff;stroke-width:2"/><path d="M17 22s-5-3-5-6.5a2.6 2.6 0 015-1.2 2.6 2.6 0 015 1.2c0 3.5-5 6.5-5 6.5z" style="fill:#fff"/>`,
    senior: `<circle cx="17" cy="17" r="14" style="fill:var(--leaf);stroke:#fff;stroke-width:2.5"/><circle cx="17" cy="12.5" r="3.6" style="fill:#fff"/><path d="M10.5 24c.8-3.6 3.4-5.6 6.5-5.6s5.7 2 6.5 5.6" style="fill:#fff"/>`,
    seniorStar: `<circle cx="17" cy="17" r="14" style="fill:var(--leaf);stroke:var(--sun);stroke-width:4"/><circle cx="17" cy="12.5" r="3.6" style="fill:#fff"/><path d="M10.5 24c.8-3.6 3.4-5.6 6.5-5.6s5.7 2 6.5 5.6" style="fill:#fff"/>`,
    center: `<rect x="3" y="3" width="28" height="28" rx="8" style="fill:var(--ink);stroke:#fff;stroke-width:2"/><circle cx="14" cy="18" r="6" style="fill:var(--leaf)"/><circle cx="21" cy="14" r="4.4" style="fill:var(--sun)"/>`,
    me: `<circle cx="17" cy="17" r="12" style="fill:var(--sky);stroke:#fff;stroke-width:3"/><circle cx="17" cy="17" r="4" style="fill:#fff"/>`,
    friend: `<circle cx="17" cy="17" r="14" style="fill:var(--sky);stroke:#fff;stroke-width:2.5"/><path d="M9 12h11v7h-6l-3 3v-3H9z" style="fill:#fff"/><path d="M21 15h4v6h-2v2l-2-2" style="fill:#fff;opacity:.8"/>`
  };
  const tall = ['school', 'knih', 'ds'].includes(kind);
  const w = 34, h = tall ? 40 : 34;
  return Lf.divIcon({ className: '', html: `<div class="pin" style="width:${w}px;height:${h}px" ${label ? `title="${esc(label)}"` : ''}><svg viewBox="0 0 34 ${h}">${shapes[kind]}</svg>${badge ? `<span class="badge">${badge > 9 ? '9+' : badge}</span>` : ''}</div>`, iconSize: [w, h], iconAnchor: [w / 2, tall ? h - 1 : h / 2] });
}
const instPinKind = i => i.type === 'knih' ? 'knih' : i.type === 'ds' ? 'ds' : 'school';
function centerPin(m) { Lf.marker([D.CENTER.lat, D.CENTER.lng], { icon: pinIcon('center', 0, D.CENTER.name), title: D.CENTER.name, keyboard: true }).addTo(m).bindTooltip(`${D.CENTER.name}<br>${D.CENTER.address}`); }
const mapLegend = items => `<div class="map-legend">${items.map(([k, l]) => `<span><svg viewBox="0 0 34 40">${pinIcon(k).options.html.match(/<svg[^>]*>([\s\S]*?)<\/svg>/)[1]}</svg>${l}</span>`).join('')}</div>`;

/* ===================== přihlášení ===================== */
function loginView() {
  const accts = [
    ['senior', 's1', 'Senior', 'Marie Dvořáková', 'Praha 4 · bývalá učitelka dějepisu', 'avatar', 'MD'],
    ['school', 'i1', 'Škola', 'ZŠ Pod Hradbami', 'Mgr. Tomáš Beneš, Praha 4', 'avatar sun', 'ZŠ'],
    ['staff', 'staff1', 'Personál Mezi námi', 'Petra Svobodová', 'koordinátorka, administrace', 'avatar sky', 'PS']
  ];
  return `<div class="login">
    <section class="login-hero stack-lg">
      <div class="brand">${LOGO}<span>Mezi námi</span><span class="demo-tag">Prototyp · ukázková data</span></div>
      <h1>Senioři a školy <em>mezi námi</em></h1>
      <p style="max-width:52ch">Aplikace propojuje pražské seniory se školami, školkami a knihovnami. Senior si nastaví, kdy má čas a o čem rád vypráví. Škola ho najde na mapě nebo vyhlásí výzvu. Navíc je tu komunita Spolu proti osamělosti.</p>
      <div class="card flat stack">
        <div class="row">${ICON.lock.replace('<svg', '<svg style="width:22px"')}<b>Registrace jen osobně</b></div>
        <p class="small">Účet vzniká v centru Mezi námi po ověření totožnosti, zkušeností a u práce s dětmi i výpisu z rejstříku trestů. Login dostanete vytištěný na přihlašovací kartě.</p>
        <p class="small muted">${esc(D.CENTER.address)}</p>
      </div>
    </section>
    <section class="stack-lg">
      <form class="card stack" data-form="login" autocomplete="off">
        <h2>Přihlášení</h2>
        <label class="field"><span>Přihlašovací jméno</span><input class="input" id="lg-user" name="user" placeholder="např. marie.dvorakova.12" autocapitalize="none"></label>
        <label class="field"><span>Heslo</span><input class="input" id="lg-pass" name="pass" type="password" placeholder="Heslo z přihlašovací karty"></label>
        <div id="login-err" class="small" style="color:var(--sos)" role="alert"></div>
        <button class="btn primary block">Přihlásit se</button>
        <p class="small muted">Zapomenuté heslo? Pošleme vám kód SMS, nebo zavolejte koordinátorovi Mezi námi. V prototypu má každý účet heslo <b>ukazka</b>.</p>
      </form>
      <div class="stack">
        <div class="eyebrow">Ukázkové účty – vyzkoušejte všechny tři pohledy</div>
        ${accts.map(([r, id, lbl, name, sub, cls, ini]) => `<button class="acct" data-act="demoLogin" data-role="${r}" data-id="${id}"><span class="${cls}">${ini}</span><span class="grow"><span class="eyebrow">${lbl}</span><b>${esc(name)}</b><span class="small muted">${esc(sub)}</span></span>${ICON.back.replace('<svg', '<svg style="width:20px;transform:rotate(180deg)"')}</button>`).join('')}
      </div>
    </section>
  </div>`;
}

/* ===================== senior ===================== */
function sosButton() { return `<button class="sos-btn" id="sos-btn" type="button" aria-label="SOS. Podržte 2 sekundy pro nouzové volání."><span class="fill"></span><span>SOS</span></button>`; }
function seniorShell() {
  const s = me(), t = U.tab.senior;
  const tabs = [['home', 'Domů', ICON.home], ['week', 'Můj týden', ICON.cal], ['map', 'Mapa', ICON.map], ['together', 'Spolu', ICON.people], ['profile', 'Profil', ICON.user]];
  const pend = S.bookings.filter(b => b.seniorId === s.id && b.status === 'pending' && upcoming(b)).length;
  const req = S.chats.filter(c => c.b === s.id && c.status === 'requested').length;
  const views = { home: seniorHome, week: seniorWeek, map: seniorMap, together: seniorTogether, profile: seniorProfile };
  return topbar(sosButton()) + `<main class="main" id="main">${views[t](s)}</main>
    <nav class="tabbar" aria-label="Hlavní navigace"><div class="tabbar-in">${tabs.map(([k, l, i]) => {
      const n = k === 'home' ? pend : k === 'together' ? req : 0;
      return `<button class="tab" data-act="tab" data-tab="${k}" aria-current="${t === k ? 'page' : 'false'}"><span class="dot" ${n ? `data-n="${n}"` : ''}>${i}</span>${l}</button>`;
    }).join('')}</div></nav>`;
}

function guardianCheckinCard(s) {
  const c = S.chats.find(x => x.guardian && x.guardian.by === s.id && x.guardian.state === 'checkin');
  if (!c) return '';
  const o = sen(c.a === s.id ? c.b : c.a);
  return `<section class="card sky stack" aria-live="polite"><div class="row">${ICON.shield.replace('<svg', '<svg style="width:26px"')}<h3 class="grow">Je vše v pořádku po schůzce s ${esc(shortName(o))}?</h3></div>
    <p class="small">Hlídáček se ptá 15 minut po plánovaném konci. Když neodpovíte do 30 minut, zavolá vám koordinátorka.</p>
    <div class="row"><button class="btn primary grow" data-act="guardianOk" data-id="${c.id}">${ICON.check} Ano, vše dobře</button><button class="btn danger grow" data-act="guardianHelp" data-id="${c.id}">Potřebuji pomoc</button></div></section>`;
}

function seniorHome(s) {
  const next = S.bookings.filter(b => b.seniorId === s.id && b.status === 'confirmed' && upcoming(b)).sort(sortB)[0];
  const pend = S.bookings.filter(b => b.seniorId === s.id && b.status === 'pending' && upcoming(b)).sort(sortB);
  const unconf = [0, 1].find(w => !weekConfirmed(s, iso(weekStart(w))));
  const done = S.bookings.filter(b => b.seniorId === s.id && b.status === 'done').length;
  const greeting = TODAY.getHours() < 10 ? 'Dobré ráno' : 'Dobrý den';
  let html = `<div class="stack-lg">
    <div><div class="eyebrow">${esc(fDayLong.format(TODAY))}</div><h1>${greeting}, ${pronoun(s)} ${esc(vocative(s))}</h1></div>
    ${guardianCheckinCard(s)}`;
  if (unconf !== undefined) {
    html += `<section class="card warn stack"><h3>Platí váš obvyklý týden i od ${esc(fDM.format(weekStart(unconf)))}?</h3>
      <p class="small">Dokud týden nepotvrdíte, školy vaše volné bloky neuvidí.</p>
      <div class="row"><button class="btn primary grow" data-act="confirmWeek" data-w="${unconf}">${ICON.check} Ano, platí jako minule</button><button class="btn grow" data-act="goWeek" data-w="${unconf}">Upravit</button></div></section>`;
  }
  if (pend.length) {
    html += `<section class="stack"><h2>Nové poptávky <span class="muted small">(${pend.length})</span></h2>${pend.map(b => {
      const i = inst(b.instId), left = Math.max(1, 48 - Math.round((Date.now() - b.createdAt) / H));
      return `<article class="card stack"><div class="row between"><span class="pill pending">Čeká na vaši odpověď</span><span class="small muted">zbývá ${left} h</span></div>
        <div><h3>${esc(i.name)}</h3><p class="small muted">${esc(i.address)} · ${kmTxt(km(s, i))} od vás</p></div>
        <p><b>${esc(fDayLong.format(parseISO(b.date)))}, ${SLOTS[b.slot]}</b></p>
        <p>${esc(ACT[b.activity])}: ${esc(TOPIC[b.topic] || '')} · třída ${esc(b.klass)} · ${b.kids} dětí</p>
        ${b.room ? `<p class="small muted">Místnost: ${esc(b.room)}</p>` : ''}<p class="small muted">Poptává: ${esc(b.contact)}</p>
        <div class="row"><button class="btn primary grow" data-act="acceptB" data-id="${b.id}">${ICON.check} Přijmout</button><button class="btn grow" data-act="declineB" data-id="${b.id}">Odmítnout</button></div></article>`;
    }).join('')}</section>`;
  }
  if (next) {
    const i = inst(next.instId);
    html += `<section class="card accent stack"><div class="eyebrow">Nejbližší návštěva</div>
      <h2>${esc(fDayLong.format(parseISO(next.date)))}, ${SLOTS[next.slot]}</h2>
      <p><b>${esc(i.name)}</b><br><span class="muted">${esc(i.address)}</span></p>
      <p>${esc(ACT[next.activity])}${next.topic ? ': ' + esc(TOPIC[next.topic]) : ''} · třída ${esc(next.klass)} · ${next.kids} dětí</p>
      ${next.room ? `<p class="small">Místnost: ${esc(next.room)}</p>` : ''}${next.tech.length ? `<p class="small">Škola připraví: ${next.tech.map(t => esc(NEED[t])).join(', ')}</p>` : ''}
      <p class="small muted">Připomeneme se den předem a 2 hodiny před návštěvou (${esc(CHAN[s.channel])}).</p>
      <div class="row"><a class="btn primary grow" href="https://mapy.com/fnc/v1/showmap?mapset=basic&center=${i.lng},${i.lat}&zoom=17&marker=true" target="_blank" rel="noopener">${ICON.nav} Ukázat na mapě</a><button class="btn grow" data-act="showPhone" data-name="${esc(i.name)}" data-phone="${esc(i.phone)}">${ICON.phone} Zavolat škole</button></div></section>`;
  } else if (!pend.length) {
    html += `<section class="card flat">${empty(ICON.cal, 'Zatím nemáte domluvenou návštěvu. Podívejte se na mapu, kde školy hledají seniora.')}<button class="btn block" data-act="tab" data-tab="map">${ICON.map} Otevřít mapu</button></section>`;
  }
  html += superButton(s);
  html += `<section class="card flat row"><div class="avatar">${done}</div><p class="grow">Letos jste navštívil${s.gender === 'f' ? 'a' : ''} <b>${done} ${done === 1 ? 'třídu' : done < 5 ? 'třídy' : 'tříd'}</b>. Školy vás hodnotí ${stars(rating(s))} (${nf.format(rating(s))}).</p></section></div>`;
  return html;
}
function superButton(s) {
  if (isNow(s)) return `<button class="super on" data-act="superOff">${ICON.star}<span>Jste mezi „Volní hned“<small>Do ${esc(fDM.format(parseISO(s.availableNow.until)))} vás školy v okolí vidí přednostně. Klepnutím ukončíte.</small></span></button>`;
  const last = s.availableNow && s.availableNow.lastActivated;
  const wait = last ? 14 - Math.round((TODAY - parseISO(last)) / (24 * H)) : 0;
  if (wait > 0) return `<div class="card flat row">${ICON.clock.replace('<svg', '<svg style="width:28px"')}<p class="grow small">Tlačítko <b>Jsem k dispozici</b> můžete znovu použít za ${wait} ${wait === 1 ? 'den' : wait < 5 ? 'dny' : 'dní'}. Tak je to férové pro všechny.</p></div>`;
  return `<button class="super" data-act="superSheet">${ICON.hand}<span>Jsem k dispozici<small>Doporučím se školám v okolí na 7 dní</small></span></button>`;
}

function seniorWeek(s) {
  const w = U.weekIdx, dates = weekDates(w), mon = dates[0], conf = weekConfirmed(s, mon);
  const lbl = { free: 'Volno', unconfirmed: 'Volno?', pending: 'Čeká', confirmed: 'Ná\u00ADvště\u00ADva', blockedDay: 'Den obsazen', hidden: 'Skryto', off: '' };
  const hidden = s.hiddenUntil && s.hiddenUntil >= todayISO;
  return `<div class="stack-lg">
    <div class="stack"><h1>Můj týden</h1><p class="muted">Úřední hodiny: kdy můžete přijít do školy. Ťuknutím blok zapnete nebo vypnete.</p></div>
    <div class="seg" role="group" aria-label="Týden">${[0, 1].map(i => `<button data-act="weekIdx" data-w="${i}" aria-pressed="${w === i}">${i === 0 ? 'Příští týden' : 'Za dva týdny'}<span class="muted small" style="display:block">od ${fDM.format(weekStart(i))}</span></button>`).join('')}</div>
    ${conf ? `<div class="card flat row">${ICON.check.replace('<svg', '<svg style="width:24px;color:var(--leaf)"')}<p class="grow">Týden je potvrzený. Školy vidí vaše volné bloky.</p></div>`
      : `<div class="card warn stack"><p><b>Týden zatím není potvrzený.</b> Školy ho uvidí, až ho potvrdíte.</p><button class="btn primary" data-act="confirmWeek" data-w="${w}">${ICON.check} Potvrdit týden od ${esc(fDM.format(weekStart(w)))}</button></div>`}
    ${hidden ? `<div class="card warn row"><p class="grow">Jste skrytý/á do ${esc(fDate.format(parseISO(s.hiddenUntil)))}. Školy vám teď poptávky neposílají.</p><button class="btn sm" data-act="unhide">Zrušit skrytí</button></div>` : ''}
    <div class="card" style="overflow-x:auto"><div class="week" role="grid" aria-label="Bloky dostupnosti">
      <div></div>${dates.map((d, i) => `<div class="h">${DAYS[i]}<b>${fDM.format(parseISO(d))}</b></div>`).join('')}
      ${SLOTS.map((t, k) => `<div class="t">${t.replace('–', '–<br>')}</div>${dates.map(d => { const st = blockState(s, d, k); return `<button class="slot ${st}" data-act="toggleSlot" data-d="${d}" data-k="${k}" aria-label="${DAYS[(parseISO(d).getDay() + 6) % 7]} ${t}: ${lbl[st] || 'nedostupné'}">${lbl[st]}</button>`; }).join('')}`).join('')}
    </div>
    <div class="legend" style="margin-top:12px"><span><i style="background:var(--leaf-soft);border:1.5px solid var(--leaf)"></i>Volno</span><span><i style="background:var(--warn-soft);border:1.5px solid var(--warn)"></i>Čeká na odpověď</span><span><i style="background:var(--sky)"></i>Domluvená návštěva</span><span><i style="border:1.5px dashed var(--line)"></i>Nemám čas</span></div></div>
    <section class="card stack"><h3>Nastavení</h3>
      <label class="switch"><span>Nejvýš jedna akce denně<br><small class="muted">Po potvrzení návštěvy zablokujeme celý den.</small></span><input type="checkbox" data-change="maxOne" ${s.maxOnePerDay ? 'checked' : ''}></label>
      <div class="row"><button class="btn grow" data-act="patternSheet">${ICON.edit} Upravit obvyklý týden</button>${hidden ? '' : `<button class="btn grow" data-act="vacationSheet">${ICON.eye} Dovolená nebo nemoc</button>`}</div>
      <p class="small muted">Každý čtvrtek v 10:00 vám připomeneme potvrdit další týden. Bez smartphonu to můžete udělat i telefonicky u koordinátorky.</p>
    </section></div>`;
}

function seniorCallsFiltered(s) {
  return activeCalls().filter(c => U.topicFilter !== 'mine' || c.tags.some(t => s.topics.includes(t)) || s.activities.includes(c.activity));
}
function callCard(c, s, inSheet) {
  const i = inst(c.instId), mine = c.interested.includes(s.id), chosen = c.chosen.includes(s.id);
  return `<article class="card stack">
    ${inSheet ? '' : `<div class="row between"><b>${esc(i.name)}</b><span class="small muted">${kmTxt(km(s, i))}</span></div>`}
    <h3>${esc(c.title)}</h3>
    <p class="small">${esc(fDayLong.format(parseISO(c.date)))}, ${SLOTS[c.slot]} · ${DUR[c.duration] || c.duration + ' min'}${c.repeat ? ' · ' + esc(c.repeat) : ''}</p>
    <p class="small">${esc(ACT[c.activity])} · ${esc(AUD[c.audience])}${c.klass ? ', ' + esc(c.klass) : ''} · hledají ${c.needed} ${c.needed === 1 ? 'seniora' : 'seniory'} · ${esc(REW[c.reward])}</p>
    ${tagChips(c.tags, s.topics)}
    ${c.tech.length || c.barrierFree ? `<p class="small muted">Na místě: ${[...c.tech.map(t => NEED[t]), c.barrierFree ? 'bezbariérový přístup' : ''].filter(Boolean).join(', ')}</p>` : ''}
    <p class="small muted">Uzávěrka ${esc(fDate.format(parseISO(c.deadline)))}</p>
    ${chosen ? `<span class="pill confirmed">Škola vás vybrala</span>` : `<button class="btn ${mine ? '' : 'sun'} block" data-act="interest" data-id="${c.id}">${mine ? ICON.check + ' Zájem odeslán · zrušit' : ICON.hand + ' Mám zájem'}</button>`}
  </article>`;
}
function seniorMap(s) {
  const calls = seniorCallsFiltered(s);
  const instN = new Set(calls.map(c => c.instId)).size;
  const list = calls.slice().sort((a, b) => km(s, inst(a.instId)) - km(s, inst(b.instId)));
  return `<div class="stack-lg">
    <div class="stack"><h1>Kdo hledá seniora</h1><p class="muted">${instN} ${instN === 1 ? 'instituce' : instN < 5 ? 'instituce' : 'institucí'} v Praze má otevřenou výzvu (${calls.length} ${calls.length === 1 ? 'výzva' : calls.length < 5 ? 'výzvy' : 'výzev'}). Číslo u školy = počet výzev.</p></div>
    <div class="row between">
      <div class="seg" role="group" aria-label="Zobrazení">${[['map', 'Mapa'], ['list', 'Seznam']].map(([k, l]) => `<button data-act="sMapMode" data-m="${k}" aria-pressed="${U.sMapMode === k}">${l}</button>`).join('')}</div>
      <label class="row small"><span class="muted">Zobrazit</span><select class="input" style="width:auto;min-height:40px" data-change="topicFilter">${opt('', 'Všechny výzvy', U.topicFilter)}${opt('mine', 'Jen moje témata', U.topicFilter)}</select></label>
    </div>
    ${U.sMapMode === 'map' ? `<div><div class="map tall" id="map-senior" data-map="seniorCalls" role="application" aria-label="Mapa Prahy se školami, které hledají seniora"></div>${mapLegend([['school', 'Škola / MŠ'], ['knih', 'Knihovna'], ['ds', 'Domov / komunitní centrum'], ['center', 'Mezi námi'], ['me', 'Vy (přibližně)']])}</div>`
      : (list.length ? `<div class="stack">${list.map(c => callCard(c, s)).join('')}</div>` : empty(ICON.search || ICON.map, 'Teď nikdo nehledá. Zkuste zobrazit všechny výzvy.'))}
  </div>`;
}
MAPS.seniorCalls = el => {
  const s = me(), m = baseMap(el, 'seniorCalls', [s.lat, s.lng], el.clientWidth < 560 ? 11.5 : 12.5);
  centerPin(m);
  Lf.marker([s.lat, s.lng], { icon: pinIcon('me'), keyboard: false }).addTo(m).bindTooltip('Vaše oblast (přibližně)');
  const by = {}; seniorCallsFiltered(s).forEach(c => { (by[c.instId] = by[c.instId] || []).push(c); });
  Object.keys(by).forEach(id => {
    const i = inst(id);
    Lf.marker([i.lat, i.lng], { icon: pinIcon(instPinKind(i), by[id].length, i.name), title: `${i.name}: ${by[id].length} výzev`, riseOnHover: true }).addTo(m)
      .on('click', () => openSheet({ type: 'instCalls', instId: id, rerender: true }));
  });
};
function sheetInstCalls(sh) {
  const s = me(), i = inst(sh.instId), calls = activeCalls(i.id).filter(c => seniorCallsFiltered(s).includes(c));
  return sheetWrap(i.name, `<div class="stack"><p class="muted">${esc(ITYPE[i.type])} · ${esc(i.address)} · ${kmTxt(km(s, i))} od vás (MHD cca ${minutesByMhd(km(s, i))} min)</p>${calls.map(c => callCard(c, s, true)).join('')}</div>`);
}

/* ----- Spolu ----- */
const partnerOf = (c, s) => sen(c.a === s.id ? c.b : c.a);
function seniorTogether(s) {
  if (!s.community) {
    const items = [...CAT.topicGroups[2].items, ...CAT.topicGroups[0].items];
    return `<form class="stack-lg" data-form="joinTogether">
      <div class="stack"><div class="eyebrow">Spolu</div><h1>Najděte si společnost na kafe nebo procházku</h1><p class="muted">Spolu je jen pro ověřené seniory z Mezi námi. Školy ani nikdo jiný sem nevidí.</p></div>
      <div class="card sky stack"><div class="row">${ICON.lock.replace('<svg', '<svg style="width:24px"')}<h3>Vážíme si vašeho soukromí</h3></div>
        <p>Ostatní senioři uvidí jen vaše křestní jméno, zájmy a přibližnou část Prahy – nikdy adresu ani telefon. Seznamování můžete kdykoli vypnout a vše zmizí. Vaše zprávy čteme jen tehdy, když si sami zapnete Hlídáčka a stane se problém.</p></div>
      <div class="card stack"><h3>Co vás baví? <span class="muted small">(až 6)</span></h3>${chipsSel('interests', items, s.interests.length ? s.interests : ['K_LITERATURA', 'H_PRAHA'], { max: 6 })}
        <h3>Na co byste šel/šla?</h3>${chipsSel('together', CAT.together, s.together.length ? s.together : ['KAFE', 'PROCHAZKA'])}
        <label class="check"><input type="checkbox" name="consent" id="join-consent" required><span>Souhlasím, aby mě ostatní senioři ve Spolu viděli. Souhlas můžu kdykoli odvolat v Profilu.</span></label>
        <button class="btn sky block">${ICON.people} Zapnout seznamování</button></div></form>`;
  }
  if (U.chatId) { const c = S.chats.find(x => x.id === U.chatId); if (c) return chatView(s, c); U.chatId = null; }
  const mine = S.chats.filter(c => (c.a === s.id || c.b === s.id) && c.status !== 'blocked');
  const incoming = mine.filter(c => c.status === 'requested' && c.b === s.id);
  const active = mine.filter(c => c.status === 'active');
  const people = S.seniors.filter(o => o.id !== s.id && o.community).sort((a, b) => km(s, a) - km(s, b));
  return `<div class="stack-lg">
    <div class="stack"><div class="row between"><h1>Spolu</h1><span class="pill free">Seznamování zapnuto</span></div><p class="muted">${people.length} seniorů z Prahy si chce povídat. Polohy jsou jen přibližné.</p></div>
    ${incoming.map(c => { const o = sen(c.a); return `<section class="card sky stack"><div class="row"><div class="avatar sky">${initials(o)}</div><div class="grow"><b>${esc(shortName(o))} vás chce poznat</b><div class="small">${esc(decade(o))} · ${esc(o.district)} · ${o.together.map(t => TOG[t]).join(', ')}</div></div></div>
      <div class="row"><button class="btn sky grow" data-act="acceptChat" data-id="${c.id}">${ICON.check} Přijmout</button><button class="btn grow" data-act="declineChat" data-id="${c.id}">Odmítnout</button></div></section>`; }).join('')}
    ${active.length ? `<section class="card stack"><h3>Rozhovory</h3><div class="list">${active.map(c => { const o = partnerOf(c, s), last = c.messages[c.messages.length - 1];
      return `<button class="li" style="background:none;border-left:0;border-right:0;border-top:0;text-align:left;cursor:pointer;width:100%" data-act="openChat" data-id="${c.id}"><div class="avatar sky">${initials(o)}</div><div class="grow"><b>${esc(shortName(o))}</b> ${c.guardian && c.guardian.on ? `<span class="pill confirmed">Hlídáček</span>` : ''}<div class="small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${last ? esc(last.text) : 'Napište první zprávu'}</div></div>${ICON.chat.replace('<svg', '<svg style="width:22px;color:var(--sky)"')}</button>`; }).join('')}</div></section>` : ''}
    <div class="seg" role="group" aria-label="Zobrazení">${[['map', 'Mapa'], ['list', 'Lidé']].map(([k, l]) => `<button data-act="commMode" data-m="${k}" aria-pressed="${U.commMode === k}">${l}</button>`).join('')}</div>
    ${U.commMode === 'map' ? `<div><div class="map" id="map-comm" data-map="community" role="application" aria-label="Mapa seniorů ze Spolu"></div><p class="small muted" style="margin-top:6px">Kruh ukazuje oblast asi 500 m, kde se člověk pohybuje. Přesnou adresu nikdo nevidí.</p></div>`
      : `<div class="stack">${people.map(o => personCard(s, o)).join('')}</div>`}
  </div>`;
}
function chatState(s, o) { return S.chats.find(c => ((c.a === s.id && c.b === o.id) || (c.b === s.id && c.a === o.id))); }
function personCard(s, o, inSheet) {
  const c = chatState(s, o), common = o.interests.filter(t => s.interests.includes(t));
  const btn = !c ? `<button class="btn sky block" data-act="requestChat" data-id="${o.id}">${ICON.chat} Poslat žádost o kontakt</button>`
    : c.status === 'active' ? `<button class="btn sky block" data-act="openChat" data-id="${c.id}">${ICON.chat} Napsat</button>`
      : c.status === 'requested' && c.a === s.id ? `<span class="pill pending">Žádost odeslána</span>` : c.status === 'requested' ? `<span class="pill pending">Chce vás poznat</span>` : '';
  return `<article class="${inSheet ? 'stack' : 'card stack'}"><div class="row"><div class="avatar sky">${initials(o)}</div><div class="grow"><b>${esc(shortName(o))}</b><div class="small muted">${esc(decade(o))} · ${esc(o.district)} · asi ${kmTxt(km(s, o))}</div></div></div>
    ${common.length ? `<p class="small"><b>Máte společné:</b> ${common.map(t => esc(TOPIC[t])).join(', ')}</p>` : ''}
    ${tagChips(o.interests, s.interests)}<p class="small">Rád${o.gender === 'f' ? 'a' : ''} by: ${o.together.map(t => esc(TOG[t])).join(', ')}</p>${btn}</article>`;
}
MAPS.community = el => {
  const s = me(), m = baseMap(el, 'community', [s.lat, s.lng], el.clientWidth < 560 ? 11.5 : 12);
  Lf.circle([s.lat, s.lng], { radius: 500, className: 'map-area', interactive: false }).addTo(m);
  Lf.marker([s.lat, s.lng], { icon: pinIcon('me'), keyboard: false }).addTo(m).bindTooltip('Vy');
  S.seniors.filter(o => o.id !== s.id && o.community).forEach(o => {
    Lf.circle([o.lat, o.lng], { radius: 500, className: 'map-area', interactive: false }).addTo(m);
    Lf.marker([o.lat, o.lng], { icon: pinIcon('friend', 0, shortName(o)), title: shortName(o) }).addTo(m).on('click', () => openSheet({ type: 'person', id: o.id, rerender: true }));
  });
};
function chatView(s, c) {
  const o = partnerOf(c, s), g = c.guardian;
  const quick = ['Dobrý den!', 'Děkuji, to mě těší.', 'Mám čas zítra dopoledne.', 'Co třeba kafe?', 'Hezký den!'];
  return `<div class="stack">
    <div class="row" style="flex-wrap:nowrap"><button class="iconbtn" data-act="closeChat" aria-label="Zpět na Spolu">${ICON.back}</button><div class="avatar sky">${initials(o)}</div><div class="grow"><h2>${esc(shortName(o))}</h2><div class="small muted">${esc(decade(o))} · ${esc(o.district)}</div></div></div>
    <button class="btn ${g && g.on ? 'sky' : ''}" data-act="guardianSheet" data-id="${c.id}">${ICON.shield} ${g && g.on ? 'Hlídáček je zapnutý' : 'Zapnout Hlídáčka před schůzkou'}</button>
    ${g && g.on && g.state === 'active' ? `<div class="guardian-banner">${ICON.shield}<span class="grow">Hlídáček hlídá schůzku ${esc(fDay.format(parseISO(g.when)))} ${esc(g.when.slice(11))}, ${esc(g.where)}, ${g.duration} min. Po konci se vám ozveme.</span><button class="btn sm" data-act="guardianEnd" data-id="${c.id}" title="Simulace pro ukázku">Ukázka: schůzka skončila</button></div>` : ''}
    ${guardianCheckinCard(s)}
    <div class="card"><div class="chat" aria-live="polite">
      ${c.status === 'requested' ? `<div class="sys">Čekáme, až ${esc(shortName(o))} žádost přijme.</div>` : ''}
      ${c.messages.map(m => m.sys ? `<div class="sys">${esc(m.text)}</div>` : `<div class="msg ${m.from === s.id ? 'me' : 'them'}">${esc(m.text)}<time>${fTime.format(new Date(m.at))}</time></div>`).join('') || (c.status === 'active' ? '<div class="sys">Napište první zprávu. Na schůzku se vždy domlouvejte na veřejném místě.</div>' : '')}
    </div></div>
    ${c.status === 'active' ? `<div class="quick">${quick.map(q => `<button class="chip" data-act="quick" data-text="${esc(q)}">${esc(q)}</button>`).join('')}</div>
    <form class="row" data-form="sendMsg" data-id="${c.id}" style="flex-wrap:nowrap"><label class="grow"><span class="hide">Zpráva</span><input class="input" id="chat-input" data-keep name="text" placeholder="Napište zprávu…" autocomplete="off"></label><button class="btn sky" aria-label="Odeslat">${ICON.send}</button></form>` : ''}
    <div class="row"><button class="btn ghost sm" data-act="reportUser" data-id="${o.id}" data-chat="${c.id}">${ICON.flag} Nahlásit</button><button class="btn ghost sm" data-act="blockChat" data-id="${c.id}">${ICON.x} Zablokovat</button></div>
  </div>`;
}

/* ----- profil ----- */
function seniorProfile(s) {
  const sw = (k, title, sub) => `<label class="switch"><span>${title}<br><small class="muted">${sub}</small></span><input type="checkbox" data-change="consent" data-k="${k}" ${s.consents[k] ? 'checked' : ''}></label>`;
  const sec = (t, body) => `<section class="card stack"><h3>${t}</h3>${body}</section>`;
  return `<div class="stack-lg">
    <div class="row"><div class="avatar lg">${initials(s)}</div><div class="grow"><h1>${esc(fullName(s))}</h1><p class="muted small">${esc(s.username)} · ${esc(s.district)}</p></div></div>
    <div class="chips"><span class="pill free">Ověřený účet · registrace v centru</span>${s.aprobace ? '<span class="pill confirmed">Ověřená aprobace</span>' : ''}${s.rt ? '<span class="pill done">Výpis z rejstříku trestů doložen</span>' : ''}</div>
    <section class="card row between"><span><b>Velikost písma</b></span><div class="textsize" role="group" aria-label="Velikost písma">${[[1, 'A'], [1.15, 'A+'], [1.3, 'A++']].map(([v, l]) => `<button data-act="scale" data-v="${v}" aria-pressed="${U.scale === v}" style="font-size:${v}em">${l}</button>`).join('')}</div></section>
    ${sec('O mně', `<p>${esc(s.about)}</p><p class="small muted">${esc(s.profession)}${s.aprobaceText ? ' · ' + esc(s.aprobaceText) : ''}${s.languages.length ? ' · jazyky: ' + s.languages.map(esc).join(', ') : ''}</p>`)}
    ${sec('Co nabízím', `<div class="small muted">Činnosti</div>${tagChips(s.activities)}<div class="small muted">Témata</div>${tagChips(s.topics)}<div class="small muted">Pro koho</div><div class="chips">${s.audiences.map(a => `<span class="chip static">${esc(AUD[a])}</span>`).join('')}</div><p class="small">Vydržím ${esc(DUR[s.duration] || s.duration + ' min')} · ${esc(REW[s.reward])}${s.tech.length ? ' · potřebuji: ' + s.tech.map(t => esc(NEED[t])).join(', ') : ''}</p>`)}
    ${sec('Doprava', `<p>Dojedu do ${s.travel} minut · ${s.transport.map(t => esc(TRANS[t])).join(', ')}${s.parking ? ' · potřebuji parkování' : ''} · ${esc(MOB[s.mobility])}</p>`)}
    ${sec('Upozornění a nouzový kontakt', `<p>Připomínky: <b>${esc(CHAN[s.channel])}</b></p><p>Nouzový kontakt: <b>${esc(s.emergency.name)}</b> (${esc(s.emergency.rel)}), ${esc(s.emergency.phone)}</p>`)}
    <button class="btn block" data-act="profileEdit">${ICON.edit} Upravit profil</button>
    <section class="card stack"><div class="row">${ICON.lock.replace('<svg', '<svg style="width:22px"')}<h3>Moje soukromí</h3></div>
      ${sw('location', 'Ukazovat mě školám na mapě', 'Jen přibližná oblast, nikdy adresa.')}
      ${sw('community', 'Seznamování ve Spolu', 'Ostatní senioři uvidí křestní jméno a zájmy.')}
      ${sw('photo', 'Fotografie v profilu', 'Vidí ji jen ověřené školy.')}
      ${sw('analytics', 'Anonymní měření používání', 'Bez jmen a zpráv, pomáhá nám aplikaci zlepšovat. Může používat cookies (Google Analytics).')}
      <div class="row"><button class="btn grow" data-act="myData">${ICON.copy} Zobrazit moje data</button><button class="btn grow" data-act="deleteReq">Požádat o smazání účtu</button></div>
      <p class="small muted">Správcem údajů je Mezi námi, o.p.s. Data jsou uložena v EU. Zprávy pod Hlídáčkem se mažou po 30 dnech.</p></section>
    <button class="btn ghost block" data-act="logout">${ICON.out} Odhlásit se</button>
  </div>`;
}

/* ----- sheety seniora ----- */
function sheetOnboarding(sh) {
  const s = me(), st = sh.step || 1;
  const dots = `<div class="row small muted">Krok ${st} ze 3</div>`;
  if (st === 1) return sheetWrap('Vítejte v aplikaci Mezi námi', `<div class="stack">${dots}<p>Než začnete, ukážeme vám, co o vás víme a kdo co uvidí. Zabere to minutu.</p>
    <div class="card flat stack"><b>Z registrace v centru máme:</b><p class="small">jméno, rok narození, telefon, nouzový kontakt (${esc(s.emergency.name)}), oblast ${esc(s.district)}, témata a zkušenosti, které jste uvedl${s.gender === 'f' ? 'a' : ''} v dotazníku.</p></div>
    <button class="btn primary block" data-act="onb" data-step="2" autofocus>Pokračovat</button></div>`, { noClose: true });
  if (st === 2) return sheetWrap('Kdo co uvidí', `<div class="stack">${dots}<div class="table-wrap"><table class="t"><thead><tr><th>Kdo</th><th>Co uvidí</th></tr></thead><tbody>
    <tr><td><b>Ověřené školy</b></td><td>Jméno a první písmeno příjmení, témata, přibližnou oblast. Telefon až po potvrzení návštěvy.</td></tr>
    <tr><td><b>Senioři ve Spolu</b></td><td>Nic, dokud seznamování sami nezapnete.</td></tr>
    <tr><td><b>Koordinátoři Mezi námi</b></td><td>Celý profil, kvůli bezpečnosti a pomoci.</td></tr></tbody></table></div>
    <div class="row"><button class="btn grow" data-act="onb" data-step="1">Zpět</button><button class="btn primary grow" data-act="onb" data-step="3">Pokračovat</button></div></div>`, { noClose: true });
  return sheetWrap('Vaše souhlasy', `<form class="stack" data-form="onboarding">${dots}<p class="small muted">Nic není předem zaškrtnuté. Vše můžete později změnit v Profilu, v části Moje soukromí.</p>
    <label class="check"><input type="checkbox" name="terms" required><span><b>Souhlasím s podmínkami používání</b> (povinné)</span></label>
    <label class="check"><input type="checkbox" name="location"><span>Ukazovat mou přibližnou oblast školám na mapě <span class="muted">(doporučujeme, jinak vás školy nenajdou)</span></span></label>
    <label class="check"><input type="checkbox" name="photo"><span>Zobrazovat fotografii v profilu</span></label>
    <label class="check"><input type="checkbox" name="analytics"><span>Anonymní měření používání (bez jmen a zpráv, může používat cookies Google Analytics)</span></label>
    <button class="btn primary block">Začít používat</button></form>`, { noClose: true });
}
function sheetSuper() {
  const s = me();
  return sheetWrap('Jsem k dispozici', `<form class="stack" data-form="superOn"><p>Na 7 dní se objevíte v záložce <b>Volní hned</b> u škol do ${s.travel} minut od vás. Školám s podobnými tématy pošleme upozornění.</p>
    <label class="field"><span>Krátký vzkaz pro školy</span><textarea class="input" name="note" id="super-note" maxlength="140" placeholder="Např. Příští týden rád vyprávím o železniční historii Prahy." autofocus></textarea><small>Nejvýš 140 znaků.</small></label>
    <p class="small muted">Tlačítko jde použít jednou za 14 dní, aby to bylo férové pro všechny.</p><button class="btn sun block">${ICON.hand} Doporučit se školám</button></form>`);
}
function sheetPattern() {
  const s = me();
  return sheetWrap('Obvyklý týden', `<form class="stack" data-form="pattern"><p class="small muted">Zaškrtněte bloky, kdy obvykle můžete. Každý týden pak stačí jedním ťuknutím potvrdit.</p>
    <div class="week">${'<div></div>' + DAYS.map(d => `<div class="h"><b>${d}</b></div>`).join('')}${SLOTS.map((t, k) => `<div class="t">${t.replace('–', '–<br>')}</div>${DAYS.map((d, i) => `<button type="button" class="slot ${s.pattern[i][k] ? 'free' : ''}" data-act="patSlot" data-i="${i}" data-k="${k}" aria-pressed="${!!s.pattern[i][k]}">${s.pattern[i][k] ? 'Volno' : ''}</button>`).join('')}`).join('')}</div>
    <button class="btn primary block">Uložit obvyklý týden</button></form>`);
}
function sheetVacation() {
  return sheetWrap('Dovolená nebo nemoc', `<form class="stack" data-form="vacation"><p>Na zvolenou dobu vás školy neuvidí a nebudou vám posílat poptávky. Domluvené návštěvy zůstávají.</p>
    <label class="field"><span>Skrýt mě</span><select class="input" name="len">${opt(7, 'na 1 týden', 7)}${opt(14, 'na 2 týdny', 7)}${opt(30, 'na měsíc', 7)}</select></label>
    <button class="btn primary block">Skrýt</button></form>`);
}
function sheetProfileEdit() {
  const s = me();
  const acts = CAT.activities.map(a => [a.code, a.label + (a.req === 'aprobace' && !s.aprobace ? ' (vyžaduje aprobaci)' : a.req === 'rt' && !s.rt ? ' (vyžaduje výpis z RT)' : '')]);
  return sheetWrap('Upravit profil', `<form class="stack" data-form="profileEdit">
    <label class="field"><span>O mně</span><textarea class="input" name="about" id="pe-about" maxlength="500">${esc(s.about)}</textarea><small>Nejvýš 500 znaků. Vidí ho ověřené školy.</small></label>
    <div class="field"><span>Činnosti</span>${chipsSel('acts', acts, s.activities)}<small>Suplování a hlídání dětí odemkne koordinátor po ověření dokladů.</small></div>
    <div class="field"><span>Témata (až 10)</span>${CAT.topicGroups.map(g => `<div class="small muted" style="margin-top:6px">${esc(g.name)}</div>${chipsSel('topics', g.items, s.topics, { max: 10 })}`).join('')}</div>
    <div class="form-grid"><label class="field"><span>Ochota dojíždět</span><select class="input" name="travel">${[15, 30, 45, 60].map(v => opt(v, `do ${v} minut`, s.travel)).join('')}</select></label>
      <label class="field"><span>Připomínky posílat</span><select class="input" name="channel">${CAT.channels.map(([v, l]) => opt(v, l, s.channel)).join('')}</select></label>
      <label class="field"><span>Vydržím</span><select class="input" name="duration">${CAT.durations.map(([v, l]) => opt(v, l, s.duration)).join('')}</select></label></div>
    <button class="btn primary block">Uložit</button></form>`);
}
function sheetPerson(sh) { const s = me(), o = sen(sh.id); return sheetWrap(shortName(o), personCard(s, o, true)); }
function sheetGuardian(sh) {
  const s = me(), c = S.chats.find(x => x.id === sh.id), o = partnerOf(c, s), g = c.guardian;
  if (g && g.on) return sheetWrap('Hlídáček je zapnutý', `<div class="stack"><p>Schůzka s ${esc(shortName(o))}: ${esc(fDay.format(parseISO(g.when)))} v ${esc(g.when.slice(11))}, ${esc(g.where)}, ${g.duration} min.</p><p class="small muted">15 minut po konci se vás zeptáme, jestli je vše v pořádku.</p><button class="btn block" data-act="guardianCancel" data-id="${c.id}">Vypnout Hlídáčka</button></div>`);
  const t = new Date(Date.now() + 2 * H); t.setMinutes(0); const tISO = iso(t);
  return sheetWrap('Zapnout Hlídáčka', `<form class="stack" data-form="guardian" data-id="${c.id}">
    <p>Hlídáček je pojistka pro schůzku s ${esc(shortName(o))}. Mezi námi o schůzce ví a po jejím konci se vám ozve, jestli bylo vše v pořádku.</p>
    <div class="form-grid"><label class="field"><span>Den</span><input class="input" type="date" name="date" value="${tISO}" min="${todayISO}" required></label><label class="field"><span>Čas</span><input class="input" type="time" name="time" value="${pad(t.getHours())}:00" required></label></div>
    <label class="field"><span>Kde</span><input class="input" name="where" id="g-where" placeholder="Např. kavárna u stanice Pankrác" required></label>
    <label class="field"><span>Jak dlouho</span><select class="input" name="duration">${[[30, '30 minut'], [60, '1 hodina'], [120, '2 hodiny'], [180, '3 hodiny']].map(([v, l]) => opt(v, l, 60)).join('')}</select></label>
    <div class="card flat small">${esc(shortName(o))} uvidí v chatu oznámení, že je konverzace pod Hlídáčkem. Zprávy se ukládají 30 dní a personál je otevře jen při problému.<br><br>Hlídáček funguje naplno Po–Pá 8–18 h. Mimo tuto dobu upozorníme vašeho blízkého: ${esc(s.emergency.name)}.</div>
    <label class="check"><input type="checkbox" name="ok" required><span>Rozumím a chci Hlídáčka zapnout</span></label>
    <button class="btn sky block">${ICON.shield} Zapnout Hlídáčka</button></form>`);
}
function sheetRisk(sh) {
  return sheetWrap('Opatrně se zprávou', `<div class="stack"><div class="card warn"><p>Vypadá to, že posíláte telefonní číslo nebo se mluví o penězích. Podvodníci se na osamělé seniory často zaměřují.</p></div>
    <p class="small">Nikdy nikomu neposílejte peníze ani čísla karet. Telefon si vyměňte až po osobním setkání na veřejném místě.</p>
    <div class="row"><button class="btn grow" data-act="closeSheet">Upravit zprávu</button><button class="btn sky grow" data-act="sendAnyway">Přesto odeslat</button></div></div>`);
}
function sheetReport(sh) {
  const o = sen(sh.id);
  return sheetWrap(`Nahlásit ${shortName(o)}`, `<form class="stack" data-form="report" data-id="${o.id}" data-chat="${sh.chat || ''}"><p>Nahlášení uvidí jen koordinátoři Mezi námi. ${esc(shortName(o))} se o něm nedozví.</p>
    <label class="field"><span>Co se stalo?</span><textarea class="input" name="text" id="rep-text" required placeholder="Popište krátce, co vám vadí."></textarea></label><button class="btn danger block">Odeslat nahlášení</button></form>`);
}
function sheetPhone(sh) {
  return sheetWrap(sh.name, `<div class="stack"><p class="muted">Telefon</p><p style="font-family:var(--f-display);font-size:2em;font-weight:600" class="tnum">${esc(sh.phone)}</p>
    <div class="row"><a class="btn primary grow" href="tel:${esc(sh.phone.replace(/\s/g, ''))}">${ICON.phone} Volat</a><button class="btn grow" data-act="copy" data-text="${esc(sh.phone)}">${ICON.copy} Zkopírovat</button></div>
    <p class="small muted">V prototypu se hovor nemusí otevřít. V aplikaci v telefonu se po ťuknutí otevře vytáčení.</p></div>`);
}
function sheetMyData() {
  const s = me(), data = JSON.stringify({ profil: s, navstevy: S.bookings.filter(b => b.seniorId === s.id), zpravy: S.chats.filter(c => c.a === s.id || c.b === s.id) }, null, 2);
  return sheetWrap('Moje data', `<div class="stack"><p class="small">Toto je vše, co o vás aplikace uchovává. V ostré verzi si data stáhnete jako soubor.</p><pre class="code" id="mydata">${esc(data)}</pre><button class="btn block" data-act="copy" data-text-from="mydata">${ICON.copy} Zkopírovat</button></div>`, { wide: true });
}
function sheetDeleteReq() {
  return sheetWrap('Smazání účtu', `<div class="stack"><p>Požádáme koordinátorku o smazání vašeho účtu. Domluvené návštěvy zrušíme a školám dáme vědět. Smazání proběhne do 30 dnů.</p>
    <div class="row"><button class="btn grow" data-act="closeSheet">Zpět</button><button class="btn danger grow" data-act="deleteConfirm">Ano, požádat o smazání</button></div></div>`);
}

/* ----- SOS ----- */
let sosTimer = null, holdTimer = null;
function stopSosTimer() { clearInterval(sosTimer); sosTimer = null; }
function triggerSos() {
  const s = me(); if (!s) return;
  const ev = { id: 'sos' + Date.now(), seniorId: s.id, at: Date.now(), choice: null, state: 'new', note: '' };
  S.sos.unshift(ev); log('SOS', fullName(s));
  openSheet({ type: 'sos', id: ev.id, t: 10 });
  stopSosTimer();
  sosTimer = setInterval(() => {
    if (!U.sheet || U.sheet.type !== 'sos' || U.sheet.choice) { stopSosTimer(); return; }
    U.sheet.t -= 1; const el = $('#sos-count'); if (el) el.textContent = U.sheet.t;
    if (U.sheet.t <= 0) { stopSosTimer(); sosChoose('contact'); }
  }, 1000);
}
function sosChoose(choice) {
  const ev = S.sos.find(x => x.id === U.sheet.id); if (ev) ev.choice = choice;
  U.sheet.choice = choice; stopSosTimer(); renderOverlay();
}
function sheetSos(sh) {
  const s = me(), e = s.emergency;
  if (!sh.choice) return sheetWrap('Nouzové volání', `<div class="sos-screen" role="alertdialog">
    <p>Za <span class="countdown" id="sos-count">${sh.t}</span> s zavoláme: <b>${esc(e.name)}</b> (${esc(e.rel)})</p>
    <button class="sos-opt a" data-act="sosChoose" data-c="155" autofocus>${ICON.phone.replace('<svg', '<svg style="width:34px"')}<span>Záchranná služba 155<small>Zdravotní potíže, úraz</small></span></button>
    <button class="sos-opt b" data-act="sosChoose" data-c="112">${ICON.alert.replace('<svg', '<svg style="width:34px"')}<span>Tísňová linka 112<small>Jakákoli jiná nouze</small></span></button>
    <button class="sos-opt c" data-act="sosChoose" data-c="contact">${ICON.heart.replace('<svg', '<svg style="width:34px"')}<span>Zavolat: ${esc(e.name)}<small>${esc(e.rel)} · ${esc(e.phone)}</small></span></button>
    <div class="card flat small">Koordinátorka Mezi námi a ${esc(e.name)} už dostaly upozornění s vaší přibližnou polohou.</div>
    <button class="btn block" data-act="sosCancel">Nic se neděje, zrušit</button></div>`, { noClose: true });
  const map = { '155': ['Záchranná služba', '155'], '112': ['Tísňová linka', '112'], contact: [e.name, e.phone] }[sh.choice];
  return sheetWrap('Voláme pomoc', `<div class="sos-screen"><p>Vytáčíme: <b>${esc(map[0])}</b></p><p class="countdown tnum">${esc(map[1])}</p>
    <a class="btn danger block" href="tel:${esc(map[1].replace(/\s/g, ''))}">${ICON.phone} Volat ${esc(map[1])}</a>
    <p class="small muted">V ostré aplikaci se hned otevře vytáčení s tímto číslem. V prototypu se hovor nespojí. Koordinátorka Mezi námi vám v pracovní době zavolá do 15 minut.</p>
    <button class="btn block" data-act="sosEnd">Ukončit nouzový režim</button></div>`, { noClose: true });
}

/* ===================== škola / instituce ===================== */
const schoolVisible = s => !s.suspended && s.onboarded !== false && s.consents.location !== false && visibleToSchools(s);
function schoolSeniors(i) {
  const f = U.sf;
  return S.seniors.filter(s => schoolVisible(s)
    && (!f.activity || s.activities.includes(f.activity))
    && (!f.topic || s.topics.includes(f.topic))
    && (!f.audience || s.audiences.includes(f.audience))
    && (!f.aprob || s.aprobace)
    && (U.radius === 'all' || km(i, s) <= Number(U.radius)))
    .sort((a, b) => km(i, a) - km(i, b));
}
function schoolShell() {
  const i = me(), t = U.tab.school;
  const nowN = S.seniors.filter(s => isNow(s) && schoolVisible(s)).length;
  const intN = activeCalls(i.id).reduce((n, c) => n + c.interested.filter(id => !c.chosen.includes(id)).length, 0);
  const tabs = [['overview', 'Přehled', 0], ['map', 'Mapa seniorů', 0], ['now', 'Volní hned', nowN], ['calls', 'Moje výzvy', intN], ['calendar', 'Kalendář', 0]];
  const nav = `<nav class="toptabs" aria-label="Hlavní navigace">${tabs.map(([k, l, n]) => `<button class="toptab" data-act="tab" data-tab="${k}" aria-current="${t === k ? 'page' : 'false'}">${l}${n ? `<span class="cnt" style="background:var(--sun);color:var(--on-sun)">${n}</span>` : ''}</button>`).join('')}</nav>`;
  const views = { overview: schoolOverview, map: schoolMap, now: schoolNow, calls: schoolCalls, calendar: schoolCalendar };
  return topbar(`<span class="who-name">${esc(i.name)}</span>`, nav) + `<main class="main" id="main">${views[t](i)}</main>`;
}
function schoolOverview(i) {
  const my = S.bookings.filter(b => b.instId === i.id);
  const pend = my.filter(b => b.status === 'pending' && upcoming(b)).sort(sortB);
  const conf = my.filter(b => b.status === 'confirmed' && upcoming(b)).sort(sortB);
  const calls = activeCalls(i.id);
  const near = S.seniors.filter(s => schoolVisible(s) && km(i, s) <= 3).length;
  const interest = calls.flatMap(c => c.interested.filter(id => !c.chosen.includes(id)).map(id => ({ c, s: sen(id) })));
  return `<div class="stack-lg">
    <div class="row between"><div><div class="eyebrow">${esc(ITYPE[i.type])} · ${esc(i.district)}</div><h1>Dobrý den, ${esc(i.contact.replace(/^(Mgr\.|Bc\.|PhDr\.)\s*/, '').split(' ')[0])}</h1></div>
      <div class="row"><button class="btn primary" data-act="tab" data-tab="map">${ICON.map} Najít seniora</button><button class="btn sun" data-act="newCall">${ICON.plus} Vyhlásit výzvu</button></div></div>
    <div class="kpis">
      <div class="kpi"><span class="small muted">Senioři do 3 km</span><b>${near}</b></div>
      <div class="kpi"><span class="small muted">Čeká na odpověď</span><b>${pend.length}</b></div>
      <div class="kpi"><span class="small muted">Potvrzené návštěvy</span><b>${conf.length}</b></div>
      <div class="kpi"><span class="small muted">Otevřené výzvy</span><b>${calls.length}</b></div>
    </div>
    <div class="split even">
      <section class="card stack"><h3>Nejbližší návštěvy</h3>${conf.length ? `<div class="list">${conf.slice(0, 6).map(b => { const s = sen(b.seniorId); return `<div class="li"><div class="avatar">${initials(s)}</div><div class="grow"><b>${esc(shortName(s))}</b> · ${esc(ACT[b.activity])}<div class="small muted">${esc(whenTxt(b))} · ${esc(b.klass)}</div></div>${pill(b.status)}</div>`; }).join('')}</div>` : empty(ICON.cal, 'Zatím žádná potvrzená návštěva.')}</section>
      <section class="card stack"><h3>Čeká na seniora</h3>${pend.length ? `<div class="list">${pend.map(b => { const s = sen(b.seniorId); return `<div class="li"><div class="avatar">${initials(s)}</div><div class="grow"><b>${esc(shortName(s))}</b> · ${esc(ACT[b.activity])}<div class="small muted">${esc(whenTxt(b))} · odesláno ${ago(b.createdAt)}</div></div><button class="btn sm" data-act="simAnswer" data-id="${b.id}" data-a="1" title="Simulace odpovědi seniora">Ukázka: přijme</button></div>`; }).join('')}</div><p class="small muted">Senior má na odpověď 48 hodin. Pak vám nabídneme další seniory v okolí.</p>` : empty(ICON.inbox, 'Žádná poptávka nečeká.')}</section>
    </div>
    ${interest.length ? `<section class="card stack"><h3>Nový zájem o vaše výzvy</h3><div class="list">${interest.map(({ c, s }) => `<div class="li"><div class="avatar">${initials(s)}</div><div class="grow"><b>${esc(shortName(s))}</b> má zájem o „${esc(c.title)}“<div class="small muted">${stars(rating(s))} · ${kmTxt(km(i, s))}</div></div><button class="btn sm" data-act="seniorDetail" data-id="${s.id}">Profil</button><button class="btn sm sun" data-act="choose" data-call="${c.id}" data-id="${s.id}">Vybrat</button></div>`).join('')}</div></section>` : ''}
  </div>`;
}
function seniorMini(i, s) {
  const match = s.topics.filter(t => i.tags.includes(t));
  return `<article class="card stack"><div class="row"><div class="avatar">${initials(s)}</div><div class="grow"><b>${esc(shortName(s))}</b> ${isNow(s) ? '<span class="pill sun">Volný hned</span>' : ''}<div class="small muted">${esc(s.district)} · ${kmTxt(km(i, s))} · ${stars(rating(s))}</div></div></div>
    <p class="small">${esc(s.profession)}${s.aprobace ? ' · <b>ověřená aprobace</b>' : ''}</p>${tagChips(s.topics.slice(0, 5), match)}
    <div class="row between"><span class="small muted">${freeBlocks(s).length} volných bloků v příštích 2 týdnech</span><button class="btn sm primary" data-act="seniorDetail" data-id="${s.id}">Zobrazit a poptat</button></div></article>`;
}
function schoolMap(i) {
  const list = schoolSeniors(i), f = U.sf;
  const sel = (k, label, items) => `<label class="field"><span>${label}</span><select class="input" data-change="sf" data-k="${k}">${opt('', 'Vše', f[k])}${items.map(([v, l]) => opt(v, l, f[k])).join('')}</select></label>`;
  return `<div class="stack-lg">
    <div class="row between"><div><h1>Senioři v okolí</h1><p class="muted">Ukazujeme jen ověřené seniory s potvrzeným volným blokem. Poloha je přibližná.</p></div>
      <div class="seg" role="group" aria-label="Zobrazení">${[['map', 'Mapa'], ['list', 'Seznam']].map(([k, l]) => `<button data-act="schoolMode" data-m="${k}" aria-pressed="${U.schoolMode === k}">${l}</button>`).join('')}</div></div>
    <div class="card form-grid">
      <label class="field"><span>Vzdálenost od školy</span><select class="input" data-change="radius">${[['1', 'do 1 km'], ['3', 'do 3 km'], ['5', 'do 5 km'], ['all', 'celá Praha']].map(([v, l]) => opt(v, l, U.radius)).join('')}</select></label>
      ${sel('activity', 'Činnost', CAT.activities.map(a => [a.code, a.label]))}${sel('topic', 'Téma', allTopics())}${sel('audience', 'Pro koho', CAT.audiences)}
      <label class="check" style="align-self:end"><input type="checkbox" data-change="aprob" ${f.aprob ? 'checked' : ''}><span>Jen s ověřenou aprobací</span></label>
    </div>
    ${U.schoolMode === 'map' ? `<div class="split"><div><div class="map tall" id="map-school" data-map="schoolSeniors" role="application" aria-label="Mapa seniorů v okolí školy"></div>${mapLegend([['senior', 'Senior s volným blokem'], ['seniorStar', 'Volný hned'], ['school', 'Vaše škola'], ['center', 'Mezi námi']])}</div>
      <div class="stack"><h3>${list.length} ${list.length === 1 ? 'senior' : list.length > 1 && list.length < 5 ? 'senioři' : 'seniorů'}</h3>${list.slice(0, 6).map(s => seniorMini(i, s)).join('') || empty(ICON.people, 'Nikdo neodpovídá filtru. Zkuste větší vzdálenost.')}${list.length > 6 ? `<button class="btn" data-act="schoolMode" data-m="list">Zobrazit všech ${list.length}</button>` : ''}</div></div>`
      : `<div class="form-grid">${list.map(s => seniorMini(i, s)).join('') || empty(ICON.people, 'Nikdo neodpovídá filtru. Zkuste větší vzdálenost.')}</div>`}
  </div>`;
}
MAPS.schoolSeniors = el => {
  const i = me(), z = { 1: 14.5, 3: 13, 5: 12.5, all: 11.5 }[U.radius] || 13;
  const m = baseMap(el, 'school-' + U.radius, [i.lat, i.lng], z);
  centerPin(m);
  if (U.radius !== 'all') Lf.circle([i.lat, i.lng], { radius: Number(U.radius) * 1000, className: 'map-radius', interactive: false }).addTo(m);
  Lf.marker([i.lat, i.lng], { icon: pinIcon('school', 0, i.name), title: i.name, zIndexOffset: 500 }).addTo(m).bindTooltip(`${i.name} (vy)`);
  const grp = Lf.markerClusterGroup ? Lf.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 38, iconCreateFunction: c => Lf.divIcon({ html: `<div class="cluster">${c.getChildCount()}</div>`, className: '', iconSize: [44, 44] }) }) : Lf.layerGroup();
  schoolSeniors(i).forEach(s => {
    Lf.marker([s.lat, s.lng], { icon: pinIcon(isNow(s) ? 'seniorStar' : 'senior', 0, shortName(s)), title: `${shortName(s)}, ${s.profession}` }).on('click', () => openSheet({ type: 'seniorDetail', id: s.id })).addTo(grp);
  });
  grp.addTo(m);
};
function schoolNow(i) {
  const list = S.seniors.filter(s => isNow(s) && schoolVisible(s)).map(s => ({ s, m: s.topics.filter(t => i.tags.includes(t)).length, d: km(i, s) })).sort((a, b) => b.m - a.m || a.d - b.d);
  return `<div class="stack-lg"><div><h1>Volní hned</h1><p class="muted">Senioři, kteří se tento týden sami nabídli. Řazeno podle shody s tématy vaší školy, pak podle vzdálenosti.</p></div>
    ${list.length ? `<div class="form-grid">${list.map(({ s, d }) => `<article class="card stack"><div class="row"><div class="avatar sun">${initials(s)}</div><div class="grow"><b>${esc(shortName(s))}</b><div class="small muted">${esc(s.district)} · ${kmTxt(d)} · ${stars(rating(s))}</div></div></div>
      <div class="card flat small">„${esc(s.availableNow.note)}“<br><span class="muted">nabídka platí do ${esc(fDM.format(parseISO(s.availableNow.until)))}</span></div>
      ${tagChips(s.topics.slice(0, 5), i.tags)}<button class="btn sun block" data-act="seniorDetail" data-id="${s.id}">${ICON.send} Poslat poptávku</button></article>`).join('')}</div>` : empty(ICON.star, 'Teď se nikdo nenabídl. Zkuste mapu seniorů nebo vyhlaste výzvu.')}</div>`;
}
function sheetSeniorDetail(sh) {
  const i = role() === 'school' ? me() : null, s = sen(sh.id), d = i ? km(i, s) : 0;
  const far = i && minutesByMhd(d) > s.travel;
  const days = [0, 1].map(w => weekDates(w));
  const pick = sh.pick;
  const grid = days.map((dates, w) => `<div class="small muted" style="margin-top:6px">${w === 0 ? 'Příští týden' : 'Za dva týdny'}</div><div class="week" style="grid-template-columns:56px repeat(5,minmax(0,1fr))"><div></div>${dates.map((dd, k) => `<div class="h">${DAYS[k]}<b>${fDM.format(parseISO(dd))}</b></div>`).join('')}
    ${SLOTS.map((t, k) => `<div class="t">${t.replace('–', '–<br>')}</div>${dates.map(dd => { const st = blockState(s, dd, k); const sel = pick && pick.d === dd && pick.k === k; return `<button type="button" class="slot pick ${sel ? 'confirmed' : st === 'free' ? 'free' : 'off'}" ${st === 'free' && i ? `data-act="pickBlock" data-d="${dd}" data-k="${k}"` : 'disabled'} aria-pressed="${sel}">${sel ? 'Vybráno' : st === 'free' ? 'Volno' : ''}</button>`; }).join('')}`).join('')}</div>`).join('');
  const acts = s.activities.filter(a => !(a === 'SUPL' && !s.aprobace) && !(a === 'HLIDANI' && !s.rt));
  const form = pick && i ? `<form class="card stack" data-form="request" data-id="${s.id}"><h3>Poptávka na ${esc(fDayLong.format(parseISO(pick.d)))}, ${SLOTS[pick.k]}</h3>
    <div class="form-grid">
      <label class="field"><span>Účel</span><select class="input" name="activity">${acts.map(a => opt(a, ACT[a], acts[0])).join('')}</select></label>
      <label class="field"><span>Téma</span><select class="input" name="topic">${s.topics.map(t => opt(t, TOPIC[t], s.topics.find(x => i.tags.includes(x)) || s.topics[0])).join('')}</select></label>
      <label class="field"><span>Třída / skupina</span><input class="input" name="klass" id="rq-klass" required placeholder="např. 6.B"></label>
      <label class="field"><span>Počet dětí</span><input class="input" name="kids" type="number" min="1" max="60" value="25" required></label>
      <label class="field"><span>Místnost</span><input class="input" name="room" id="rq-room" placeholder="např. učebna dějepisu, 2. patro"></label>
      <label class="field"><span>Kontaktní osoba</span><select class="input" name="contact">${(i.teachers.length ? i.teachers : [i.contact]).map(t => opt(t, t, i.contact)).join('')}</select></label>
    </div>
    <div class="field"><span>Na místě připravíme</span>${chipsSel('tech', CAT.needs.filter(([v]) => !['PARK', 'BEZBAR'].includes(v)), s.tech)}</div>
    ${s.parking ? '<label class="check"><input type="checkbox" name="parking" checked><span>Zajistíme parkování (senior jezdí autem)</span></label>' : ''}
    <button class="btn primary block">${ICON.send} Odeslat poptávku</button><p class="small muted">Blok se seniorovi podrží, dokud neodpoví (max. 48 h).</p></form>` : '';
  return sheetWrap(shortName(s), `<div class="stack">
    <div class="row"><div class="avatar lg">${initials(s)}</div><div class="grow"><p><b>${esc(s.profession)}</b></p><p class="small muted">${esc(decade(s))} · ${esc(s.district)}${i ? ' · ' + kmTxt(d) + ' od školy' : ''}</p><p class="small">${stars(rating(s))} ${nf.format(rating(s))} (${s.ratingCount} hodnocení)</p></div></div>
    <div class="chips"><span class="pill free">Ověřen v centru Mezi námi</span>${s.aprobace ? `<span class="pill confirmed">Aprobace: ${esc(s.aprobaceText)}</span>` : ''}${s.rt ? '<span class="pill done">Výpis z RT doložen</span>' : ''}</div>
    ${isNow(s) ? `<div class="card flat small"><b>Volný hned:</b> „${esc(s.availableNow.note)}“</div>` : ''}
    <p>${esc(s.about)}</p>
    <div class="small muted">Činnosti</div>${tagChips(s.activities)}<div class="small muted">Témata ${i ? '(oranžově shoda s vaší školou)' : ''}</div>${tagChips(s.topics, i ? i.tags : [])}
    <p class="small">Pro: ${s.audiences.map(a => esc(AUD[a])).join(', ')} · vydrží ${esc(DUR[s.duration] || s.duration + ' min')} · ${esc(REW[s.reward])}</p>
    <p class="small">Doprava: ${s.transport.map(t => esc(TRANS[t])).join(', ')}, do ${s.travel} min · ${esc(MOB[s.mobility])}${s.parking ? ' · potřebuje parkování' : ''}${s.tech.length ? ' · potřebuje: ' + s.tech.map(t => esc(NEED[t])).join(', ') : ''}</p>
    ${far ? `<div class="card warn small">Škola je asi ${minutesByMhd(d)} min MHD. ${esc(s.first)} obvykle dojíždí do ${s.travel} min, počítejte s tím.</div>` : ''}
    ${i ? `<h3>Vyberte volný blok</h3>${grid}${form}` : ''}
  </div>`, { wide: true });
}
function schoolCalls(i) {
  const calls = S.calls.filter(c => c.instId === i.id).sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) || a.date.localeCompare(b.date));
  const st = c => c.status === 'filled' ? '<span class="pill confirmed">Obsazeno</span>' : c.status === 'closed' || c.deadline < todayISO ? '<span class="pill done">Uzavřeno</span>' : '<span class="pill sun">Otevřená</span>';
  return `<div class="stack-lg"><div class="row between"><div><h1>Moje výzvy</h1><p class="muted">Otevřené výzvy vidí senioři na mapě. Více výzev se u vaší školy zobrazí jako číslo.</p></div><button class="btn sun" data-act="newCall">${ICON.plus} Nová výzva</button></div>
    ${calls.length ? calls.map(c => `<article class="card stack"><div class="row between"><h3>${esc(c.title)}</h3>${st(c)}</div>
      <p class="small">${esc(fDayLong.format(parseISO(c.date)))}, ${SLOTS[c.slot]} · ${esc(ACT[c.activity])} · ${esc(AUD[c.audience])}${c.klass ? ', ' + esc(c.klass) : ''} · hledáte ${c.needed} · ${esc(REW[c.reward])} · uzávěrka ${esc(fDate.format(parseISO(c.deadline)))}</p>
      ${tagChips(c.tags)}
      <div><b class="small">Zájem (${c.interested.length})</b>${c.interested.length ? `<div class="list">${c.interested.map(id => { const s = sen(id); const ch = c.chosen.includes(id); return `<div class="li"><div class="avatar">${initials(s)}</div><div class="grow"><b>${esc(shortName(s))}</b> <span class="small muted">${esc(s.profession)} · ${kmTxt(km(i, s))} · ${stars(rating(s))}</span></div><button class="btn sm" data-act="seniorDetail" data-id="${s.id}">Profil</button>${ch ? '<span class="pill confirmed">Vybrán</span>' : c.status === 'open' ? `<button class="btn sm sun" data-act="choose" data-call="${c.id}" data-id="${s.id}">Vybrat</button>` : ''}</div>`; }).join('')}</div>` : '<p class="small muted">Zatím se nikdo nepřihlásil. Senioři v okolí s odpovídajícím tématem dostali upozornění.</p>'}</div>
      ${c.status === 'open' ? `<div class="row"><button class="btn sm ghost" data-act="closeCall" data-id="${c.id}">Uzavřít výzvu</button></div>` : ''}</article>`).join('') : empty(ICON.flag, 'Zatím nemáte žádnou výzvu.')}
  </div>`;
}
function sheetNewCall() {
  const tomorrow = iso(addDays(TODAY, 1));
  return sheetWrap('Nová výzva (open call)', `<form class="stack" data-form="newCall">
    <label class="field"><span>Název</span><input class="input" name="title" id="nc-title" required maxlength="80" placeholder="např. Beseda o Praze za první republiky" autofocus></label>
    <div class="form-grid">
      <label class="field"><span>Typ činnosti</span><select class="input" name="activity">${CAT.activities.map(a => opt(a.code, a.label, 'BESEDA')).join('')}</select></label>
      <label class="field"><span>Pro koho</span><select class="input" name="audience">${CAT.audiences.map(([v, l]) => opt(v, l, 'ZS2')).join('')}</select></label>
      <label class="field"><span>Třída / skupina</span><input class="input" name="klass" id="nc-klass" placeholder="např. 8.B"></label>
      <label class="field"><span>Datum</span><input class="input" type="date" name="date" min="${tomorrow}" value="${iso(addDays(weekStart(0), 2))}" required></label>
      <label class="field"><span>Čas</span><select class="input" name="slot">${SLOTS.map((t, k) => opt(k, t, 1)).join('')}</select></label>
      <label class="field"><span>Délka</span><select class="input" name="duration">${CAT.durations.map(([v, l]) => opt(v, l, 45)).join('')}</select></label>
      <label class="field"><span>Počet seniorů</span><input class="input" type="number" name="needed" min="1" max="5" value="1"></label>
      <label class="field"><span>Opakování</span><select class="input" name="repeat">${opt('', 'Jednorázově', '')}${opt('každý týden', 'Každý týden', '')}${opt('každý měsíc', 'Každý měsíc', '')}</select></label>
      <label class="field"><span>Odměna</span><select class="input" name="reward">${CAT.rewards.map(([v, l]) => opt(v, l, 'FREE')).join('')}</select></label>
      <label class="field"><span>Uzávěrka</span><input class="input" type="date" name="deadline" min="${tomorrow}" value="${iso(addDays(TODAY, 7))}" required></label>
    </div>
    <div class="field"><span>Témata (1–5 z číselníku)</span>${CAT.topicGroups.map(g => `<div class="small muted" style="margin-top:6px">${esc(g.name)}</div>${chipsSel('nctags', g.items, [], { max: 5 })}`).join('')}<small>Vlastní hashtagy nejdou, aby filtry vždy fungovaly. Chybí vám téma? Navrhněte ho koordinátorce:</small><div class="row" style="flex-wrap:nowrap"><label class="grow"><span class="hide">Návrh tématu</span><input class="input" id="nc-sug" placeholder="např. Programování"></label><button type="button" class="btn sm" data-act="suggestTag">Navrhnout</button></div></div>
    <div class="field"><span>Na místě</span>${chipsSel('nctech', CAT.needs.filter(([v]) => !['PARK', 'BEZBAR'].includes(v)), [])}</div>
    <label class="check"><input type="checkbox" name="parking"><span>Zajistíme parkování</span></label>
    <label class="check"><input type="checkbox" name="barrierFree"><span>Bezbariérový přístup</span></label>
    <div id="nc-err" class="small" style="color:var(--sos)" role="alert"></div>
    <button class="btn sun block">${ICON.flag} Zveřejnit výzvu</button></form>`, { wide: true });
}
function schoolCalendar(i) {
  const f = U.visitFilter;
  const my = S.bookings.filter(b => b.instId === i.id && (f === 'all' || (f === 'upcoming' ? upcoming(b) && ['pending', 'confirmed'].includes(b.status) : !upcoming(b) || b.status === 'done'))).sort(sortB);
  if (f === 'past') my.reverse();
  return `<div class="stack-lg"><h1>Kalendář návštěv</h1>
    <div class="seg" role="group" aria-label="Filtr">${[['upcoming', 'Nadcházející'], ['past', 'Proběhlé'], ['all', 'Vše']].map(([k, l]) => `<button data-act="visitFilter" data-f="${k}" aria-pressed="${f === k}">${l}</button>`).join('')}</div>
    ${my.length ? `<div class="table-wrap"><table class="t"><thead><tr><th>Datum</th><th>Senior</th><th>Činnost</th><th>Třída</th><th>Stav</th><th></th></tr></thead><tbody>${my.map(b => { const s = sen(b.seniorId);
      let act = '';
      if (b.status === 'pending') act = `<button class="btn sm" data-act="simAnswer" data-id="${b.id}" data-a="1">Ukázka: přijme</button> <button class="btn sm ghost" data-act="simAnswer" data-id="${b.id}" data-a="0">odmítne</button>`;
      else if (b.status === 'confirmed') act = `<button class="btn sm ghost" data-act="cancelB" data-id="${b.id}">Zrušit</button>`;
      else if (b.status === 'done' && !b.rating) act = `<span class="row" style="gap:2px">${[1, 2, 3, 4, 5].map(v => `<button class="btn sm ghost" style="padding:4px 6px;min-height:32px" data-act="rate" data-id="${b.id}" data-v="${v}" aria-label="${v} z 5">★</button>`).join('')}</span>`;
      else if (b.rating) act = stars(b.rating);
      return `<tr><td class="tnum">${esc(fDay.format(parseISO(b.date)))}<br><span class="small muted">${SLOTS[b.slot]}</span></td><td>${esc(shortName(s))}</td><td>${esc(ACT[b.activity])}<br><span class="small muted">${esc(TOPIC[b.topic] || '')}</span></td><td>${esc(b.klass || '–')}</td><td>${pill(b.status)}</td><td>${act}</td></tr>`; }).join('')}</tbody></table></div>` : empty(ICON.cal, 'Tady zatím nic není.')}</div>`;
}

/* ===================== personál Mezi námi ===================== */
function staffTasks() {
  const t = [], soon = iso(addDays(TODAY, 2));
  S.bookings.filter(b => b.status === 'pending' && upcoming(b) && Date.now() - b.createdAt > 24 * H).forEach(b => {
    const s = sen(b.seniorId), i = inst(b.instId);
    t.push({ id: 'pend-' + b.id, sev: 'warn', icon: ICON.clock, title: `${shortName(s)} neodpověděl${s.gender === 'f' ? 'a' : ''} na poptávku už ${Math.round((Date.now() - b.createdAt) / H)} h`, sub: `${i.name} · ${whenTxt(b)} · připomenutí: ${CHAN[s.channel]}`, act: ['Zavolat', 'staffPhone', s.id] });
  });
  S.bookings.filter(b => b.status === 'confirmed' && b.date >= todayISO && b.date <= soon && sen(b.seniorId).channel === 'phone').forEach(b => {
    const s = sen(b.seniorId), i = inst(b.instId);
    t.push({ id: 'remind-' + b.id, sev: 'info', icon: ICON.phone, title: `Zavolat připomínku: ${fullName(s)}`, sub: `${i.name} · ${whenTxt(b)} · preferuje telefonát`, act: ['Telefon', 'staffPhone', s.id] });
  });
  S.seniors.filter(s => !s.suspended && [0, 1].some(w => !weekConfirmed(s, iso(weekStart(w))))).forEach(s => {
    const w = [0, 1].find(x => !weekConfirmed(s, iso(weekStart(x))));
    t.push({ id: `week-${s.id}-${iso(weekStart(w))}`, sev: 'info', icon: ICON.cal, title: `Nepotvrzený týden od ${fDM.format(weekStart(w))}: ${fullName(s)}`, sub: `Připomínky: ${CHAN[s.channel]}. Můžete potvrdit za seniora po telefonu.`, act: ['Potvrdit za seniora', 'staffConfirmWeek', s.id + '|' + w] });
  });
  S.chats.filter(c => c.guardian && ['help', 'escalated'].includes(c.guardian.state)).forEach(c => {
    const s = sen(c.guardian.by);
    t.push({ id: 'g-' + c.id + c.guardian.state, sev: 'crit', icon: ICON.shield, title: c.guardian.state === 'help' ? `Hlídáček: ${fullName(s)} potřebuje pomoc` : `Hlídáček: ${fullName(s)} neodpovídá`, sub: `${c.guardian.where} · nouzový kontakt ${s.emergency.name}, ${s.emergency.phone}`, act: ['Otevřít', 'tab', 'guard'] });
  });
  S.sos.filter(x => ['new', 'progress'].includes(x.state)).forEach(x => {
    const s = sen(x.seniorId);
    t.push({ id: 'sos-' + x.id, sev: 'crit', icon: ICON.alert, title: `SOS: ${fullName(s)}`, sub: `${fTime.format(new Date(x.at))} · ${x.choice ? 'volá ' + (x.choice === 'contact' ? s.emergency.name : x.choice) : 'bez volby'} · ${s.phone}`, act: ['Otevřít', 'tab', 'guard'] });
  });
  S.reports.filter(r => r.state === 'new').forEach(r => t.push({ id: 'rep-' + r.id, sev: 'warn', icon: ICON.flag, title: `Nahlášení: ${shortName(sen(r.by))} → ${shortName(sen(r.about))}`, sub: r.text, act: ['Moderace', 'tab', 'moderation'] }));
  S.tagSuggestions.filter(x => x.state === 'new').forEach(x => t.push({ id: 'tag-' + x.id, sev: 'info', icon: ICON.tag, title: `Návrh nového tématu: ${x.label}`, sub: `od ${sen(x.by) ? shortName(sen(x.by)) : inst(x.by).name}`, act: ['Číselník', 'tab', 'catalog'] }));
  S.deletionRequests.forEach(d => t.push({ id: 'del-' + d.id, sev: 'warn', icon: ICON.x, title: `Žádost o smazání účtu: ${fullName(sen(d.seniorId))}`, sub: `Podáno ${fDate.format(new Date(d.at))}. Lhůta 30 dní.`, act: null }));
  const order = { crit: 0, warn: 1, info: 2 };
  return t.filter(x => !S.doneTasks.includes(x.id)).sort((a, b) => order[a.sev] - order[b.sev]);
}
function staffShell() {
  const t = U.tab.staff, tasks = staffTasks();
  const alerts = S.sos.filter(x => ['new', 'progress'].includes(x.state)).length + S.chats.filter(c => c.guardian && ['help', 'escalated'].includes(c.guardian.state)).length;
  const items = [['queue', 'Fronta úkolů', tasks.length, ICON.inbox], ['guard', 'Hlídáček a SOS', alerts, ICON.shield], ['register', 'Registrace', 0, ICON.card], ['seniors', 'Senioři', 0, ICON.people], ['insts', 'Instituce', 0, ICON.building], ['visits', 'Návštěvy', 0, ICON.cal], ['catalog', 'Číselník', S.tagSuggestions.filter(x => x.state === 'new').length, ICON.tag], ['moderation', 'Moderace', S.reports.filter(r => r.state === 'new').length, ICON.flag], ['reports', 'Reporty', 0, ICON.chart]];
  const btn = ([k, l, n, i]) => `<button class="toptab" data-act="tab" data-tab="${k}" aria-current="${t === k ? 'page' : 'false'}">${i.replace('<svg', '<svg style="width:18px;vertical-align:-4px;margin-right:8px"')}${l}${n ? `<span class="cnt">${n}</span>` : ''}</button>`;
  const views = { queue: staffQueue, guard: staffGuard, register: staffRegister, seniors: staffSeniors, insts: staffInsts, visits: staffVisits, catalog: staffCatalog, moderation: staffModeration, reports: staffReports };
  return topbar(`<span class="who-name">${esc(STAFF.name)} · koordinátorka</span>`, `<nav class="toptabs mobile-only" aria-label="Sekce">${items.map(btn).join('')}</nav>`) +
    `<main class="main" id="main"><div class="staff-layout"><nav class="staff-nav" aria-label="Sekce">${items.map(btn).join('')}</nav><div class="stack-lg" style="min-width:0">${views[t](tasks)}</div></div></main>`;
}
function staffQueue(tasks) {
  const crit = tasks.filter(t => t.sev === 'crit').length;
  return `<div class="stack"><h1>Fronta úkolů</h1><p class="muted">Aplikace dělá rutinu sama. Sem padá jen to, kde je potřeba člověk. ${crit ? `<b style="color:var(--sos)">${crit} naléhavé.</b>` : ''}</p></div>
    ${tasks.length ? `<div class="card"><div class="list">${tasks.map(x => `<div class="li"><div class="avatar ${x.sev === 'crit' ? '' : x.sev === 'warn' ? 'sun' : 'sky'}" style="${x.sev === 'crit' ? 'background:var(--sos-soft);color:var(--sos)' : ''}">${x.icon.replace('<svg', '<svg style="width:22px"')}</div><div class="grow"><b>${esc(x.title)}</b><div class="small muted">${esc(x.sub)}</div></div>
      <div class="row" style="gap:6px">${x.act ? `<button class="btn sm" data-act="${x.act[1]}" ${x.act[1] === 'tab' ? `data-tab="${x.act[2]}"` : `data-id="${esc(x.act[2])}"`}>${esc(x.act[0])}</button>` : ''}<button class="btn sm ghost" data-act="taskDone" data-id="${esc(x.id)}">${ICON.check} Hotovo</button></div></div>`).join('')}</div></div>` : `<div class="card">${empty(ICON.check, 'Vše vyřízeno. Aplikace zatím zvládá zbytek sama.')}</div>`}
    <div class="card flat small">Automaticky běží: připomínky 24 h a 2 h před návštěvou, čtvrteční výzva k potvrzení týdne, uvolnění bloku po 48 h bez odpovědi, dotaz Hlídáčka 15 min po schůzce.</div>`;
}
function staffGuard() {
  const gs = S.chats.filter(c => c.guardian && (c.guardian.on || ['help', 'escalated'].includes(c.guardian.state)));
  const gst = { active: ['Hlídá', 'confirmed'], checkin: ['Ptáme se', 'pending'], help: ['Potřebuje pomoc', 'help'], escalated: ['Neodpovídá', 'help'], ok: ['V pořádku', 'done'] };
  const sst = { new: ['Nové', 'help'], progress: ['Řeší se', 'pending'], resolved: ['Vyřešeno', 'done'], cancelled: ['Zrušeno seniorem', 'done'] };
  return `<div class="stack"><h1>Hlídáček a SOS</h1><p class="muted">Pracovní doba dohledu Po–Pá 8–18 h. Mimo ni jde upozornění rovnou nouzovému kontaktu.</p></div>
    <section class="stack"><h2>SOS</h2>${S.sos.length ? `<div class="table-wrap"><table class="t"><thead><tr><th>Kdy</th><th>Senior</th><th>Volba</th><th>Stav</th><th></th></tr></thead><tbody>${S.sos.map(x => { const s = sen(x.seniorId);
      return `<tr><td class="tnum">${esc(fDate.format(new Date(x.at)))} ${esc(fTime.format(new Date(x.at)))}</td><td><b>${esc(fullName(s))}</b><br><span class="small muted">${esc(s.phone)} · nouzový: ${esc(s.emergency.name)} ${esc(s.emergency.phone)}</span></td><td>${x.choice ? (x.choice === 'contact' ? 'blízký' : x.choice) : '–'}</td><td><span class="pill ${sst[x.state][1]}">${sst[x.state][0]}</span>${x.note ? `<br><span class="small muted">${esc(x.note)}</span>` : ''}</td>
      <td>${x.state === 'new' ? `<button class="btn sm danger" data-act="sosState" data-id="${x.id}" data-s="progress">Převzít</button>` : x.state === 'progress' ? `<button class="btn sm" data-act="sosState" data-id="${x.id}" data-s="resolved">Vyřešeno</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>` : `<div class="card">${empty(ICON.check, 'Žádné SOS.')}</div>`}</section>
    <section class="stack"><h2>Aktivní Hlídáčci</h2>${gs.length ? `<div class="table-wrap"><table class="t"><thead><tr><th>Senior</th><th>Schůzka</th><th>Konec</th><th>Stav</th><th></th></tr></thead><tbody>${gs.map(c => { const g = c.guardian, s = sen(g.by), o = sen(c.a === g.by ? c.b : c.a);
      const end = new Date(new Date(g.when).getTime() + g.duration * 60e3);
      return `<tr><td><b>${esc(fullName(s))}</b><br><span class="small muted">s ${esc(shortName(o))}</span></td><td>${esc(g.where)}<br><span class="small muted">${esc(fDay.format(parseISO(g.when)))} ${esc(g.when.slice(11))}, ${g.duration} min</span></td><td class="tnum">${esc(fTime.format(end))}<br><span class="small muted">dotaz v ${esc(fTime.format(new Date(end.getTime() + 15 * 60e3)))}</span></td><td><span class="pill ${gst[g.state][1]}">${gst[g.state][0]}</span></td>
      <td class="row" style="gap:6px">${['active', 'checkin'].includes(g.state) ? `<button class="btn sm ghost" data-act="guardianEscalate" data-id="${c.id}" title="Simulace">Ukázka: neodpověděl/a</button>` : ''}<button class="btn sm" data-act="staffPhone" data-id="${s.id}">Zavolat</button><button class="btn sm ghost" data-act="guardianMsgs" data-id="${c.id}">Zprávy</button><button class="btn sm ghost" data-act="guardianClose" data-id="${c.id}">Uzavřít</button></td></tr>`; }).join('')}</tbody></table></div>` : `<div class="card">${empty(ICON.shield, 'Nikdo teď Hlídáčka nemá zapnutého.')}</div>`}
    <p class="small muted">Otevření zpráv se zapisuje do auditního logu. Zprávy se automaticky mažou po 30 dnech.</p></section>`;
}
function slug(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function staffRegister() {
  if (U.regResult) {
    const r = U.regResult, s = sen(r.id);
    return `<div class="stack"><h1>Senior zaregistrován</h1><p class="muted">Vytiskněte kartu a předejte ji seniorovi. Heslo si změní při prvním přihlášení.</p></div>
      <div class="login-card" style="max-width:460px"><div class="brand">${LOGO}<span>Mezi námi</span></div><p class="small muted" style="margin-top:6px">Přihlašovací karta</p>
        <dl><dt>Jméno</dt><dd style="font-family:var(--f-body)">${esc(fullName(s))}</dd><dt>Přihlašovací jméno</dt><dd>${esc(s.username)}</dd><dt>Dočasné heslo</dt><dd>${esc(r.pass)}</dd><dt>Adresa</dt><dd style="font-family:var(--f-body);font-weight:400">aplikace.mezi-nami.cz</dd></dl>
        <p class="small" style="margin-top:12px">Pomoc: ${esc(D.CENTER.address)}</p></div>
      <div class="row"><button class="btn primary" data-act="regAgain">${ICON.plus} Registrovat dalšího</button><button class="btn" data-act="seniorDetail" data-id="${s.id}">Zobrazit profil</button></div>
      <div class="card flat small">Další krok na místě: nainstalovat aplikaci do telefonu seniora a projít první přihlášení (asi 15 minut).</div>`;
  }
  const sect = (t, b) => `<section class="card stack"><h3>${t}</h3>${b}</section>`;
  return `<div class="stack"><h1>Registrace seniora</h1><p class="muted">Vyplňte spolu se seniorem v centru. Totožnost ověřte podle občanského průkazu.</p></div>
  <form class="stack-lg" data-form="register">
    ${sect('Osobní údaje', `<div class="form-grid"><label class="field"><span>Jméno</span><input class="input" name="first" id="r-first" required></label><label class="field"><span>Příjmení</span><input class="input" name="last" id="r-last" required></label>
      <label class="field"><span>Oslovení</span><select class="input" name="gender">${opt('f', 'paní', 'f')}${opt('m', 'pan', 'f')}</select></label><label class="field"><span>Rok narození</span><input class="input" type="number" name="birthYear" min="1920" max="${TODAY.getFullYear() - 55}" required></label>
      <label class="field"><span>Telefon</span><input class="input" name="phone" type="tel" required placeholder="+420 …"></label><label class="field"><span>E-mail (nepovinné)</span><input class="input" name="email" type="email"></label></div>
      <label class="field"><span>O mně (veřejné, max. 500 znaků)</span><textarea class="input" name="about" maxlength="500" required></textarea></label>`)}
    ${sect('Kontakt a nouzový kontakt', `<div class="form-grid"><label class="field"><span>Nouzový kontakt – jméno</span><input class="input" name="eName" required></label><label class="field"><span>Vztah</span><input class="input" name="eRel" required placeholder="dcera, syn, soused…"></label><label class="field"><span>Telefon</span><input class="input" name="ePhone" type="tel" required></label>
      <label class="field"><span>Připomínky posílat</span><select class="input" name="channel">${CAT.channels.map(([v, l]) => opt(v, l, 'push')).join('')}</select></label></div>`)}
    ${sect('Lokalita a doprava', `<div class="form-grid"><label class="field"><span>Kde se nejčastěji pohybuje</span><select class="input" name="district">${D.DISTRICTS.map(([n]) => opt(n, n, 'Praha 4')).join('')}</select><small>Adresu bydliště uložíme jen pro personál.</small></label>
      <label class="field"><span>Ochota dojíždět</span><select class="input" name="travel">${[15, 30, 45, 60].map(v => opt(v, `do ${v} minut`, 30)).join('')}</select></label>
      <label class="field"><span>Chůze a schody</span><select class="input" name="mobility">${CAT.mobility.map(([v, l]) => opt(v, l, 'free')).join('')}</select></label></div>
      <div class="field"><span>Doprava</span>${chipsSel('transport', CAT.transport, ['mhd'])}</div><label class="check"><input type="checkbox" name="parking"><span>Potřebuje parkování</span></label>`)}
    ${sect('Co nabízí', `<div class="field"><span>Činnosti</span>${chipsSel('acts', CAT.activities.map(a => [a.code, a.label + (a.req === 'aprobace' ? ' (aprobace)' : a.req === 'rt' ? ' (výpis z RT)' : '')]), ['BESEDA'])}</div>
      <div class="field"><span>Témata (až 10)</span>${CAT.topicGroups.map(g => `<div class="small muted" style="margin-top:6px">${esc(g.name)}</div>${chipsSel('topics', g.items, [], { max: 10 })}`).join('')}</div>
      <div class="field"><span>Pro koho</span>${chipsSel('aud', CAT.audiences, ['ZS1'])}</div>
      <div class="form-grid"><label class="field"><span>Vydrží</span><select class="input" name="duration">${CAT.durations.map(([v, l]) => opt(v, l, 45)).join('')}</select></label><label class="field"><span>Odměna</span><select class="input" name="reward">${CAT.rewards.map(([v, l]) => opt(v, l, 'FREE')).join('')}</select></label></div>`)}
    ${sect('Zkušenosti a ověření', `<div class="form-grid"><label class="field"><span>Profese / obor</span><input class="input" name="profession" required></label><label class="field"><span>Jazyky</span><input class="input" name="languages" placeholder="např. Němčina, Angličtina"></label></div>
      <label class="check"><input type="checkbox" name="aprobace"><span>Aprobaci jsem ověřil/a podle dokladu (diplom, osvědčení)</span></label><label class="field"><span>Aprobace (text)</span><input class="input" name="aprobaceText" placeholder="např. Mgr., ČJ – D"></label>
      <label class="check"><input type="checkbox" name="rt"><span>Výpis z rejstříku trestů doložen, ne starší 3 měsíců (kopii neukládáme)</span></label>
      <div class="field"><span>Na výuku potřebuje</span>${chipsSel('tech', CAT.needs.filter(([v]) => !['PARK', 'BEZBAR'].includes(v)), [])}</div>`)}
    ${sect('Podepsané souhlasy', `<label class="check"><input type="checkbox" name="terms" required><span>Podmínky, GDPR a etický kodex podepsány na papíře</span></label><label class="check"><input type="checkbox" name="photo"><span>Souhlas s fotografií v profilu</span></label>`)}
    <div id="reg-err" class="small" style="color:var(--sos)" role="alert"></div>
    <button class="btn primary">${ICON.card} Vytvořit účet a login</button>
  </form>`;
}
function staffSeniors() {
  return `<div class="stack"><h1>Senioři</h1><p class="muted">${S.seniors.length} ověřených seniorů v Praze.</p></div>
  <div class="table-wrap"><table class="t"><thead><tr><th>Jméno</th><th>Oblast</th><th>Příští týden</th><th>Připomínky</th><th>Ověření</th><th>Hodnocení</th><th></th></tr></thead><tbody>${S.seniors.map(s => `<tr>
    <td><b>${esc(fullName(s))}</b>${s.suspended ? ' <span class="pill help">Pozastaven</span>' : ''}<br><span class="small muted">${esc(s.username)}</span></td><td>${esc(s.district)}</td>
    <td>${weekConfirmed(s, iso(weekStart(0))) ? '<span class="pill free">Potvrzen</span>' : '<span class="pill pending">Nepotvrzen</span>'}</td><td>${esc(CHAN[s.channel])}</td>
    <td class="small">${s.aprobace ? 'aprobace ✓<br>' : ''}${s.rt ? 'výpis RT ✓' : ''}</td><td class="num">${s.ratingCount ? nf.format(rating(s)) : '–'}</td><td><button class="btn sm" data-act="seniorDetail" data-id="${s.id}">Profil</button></td></tr>`).join('')}</tbody></table></div>`;
}
function staffInsts() {
  const r = U.instResult;
  return `<div class="stack"><h1>Instituce</h1><p class="muted">Školy, školky, knihovny a domovy. Registruje statutární zástupce nebo pověřená osoba s plnou mocí.</p></div>
  ${r ? `<div class="card accent stack"><b>${esc(r.name)} je zaregistrovaná.</b><p class="small">Login: <code>${esc(r.username)}</code> · dočasné heslo <code>${esc(r.pass)}</code>. Vyučující si instituce přidá sama pozvánkou.</p></div>` : ''}
  <div class="table-wrap"><table class="t"><thead><tr><th>Název</th><th>Typ</th><th>Oblast</th><th>Kontakt</th><th class="num">Výzvy</th><th class="num">Návštěvy</th></tr></thead><tbody>${S.institutions.map(i => `<tr><td><b>${esc(i.name)}</b><br><span class="small muted">IČO ${esc(i.ico)}</span></td><td>${esc(ITYPE[i.type])}</td><td>${esc(i.district)}</td><td>${esc(i.contact)}<br><span class="small muted">${esc(i.phone)}</span></td><td class="num">${activeCalls(i.id).length}</td><td class="num">${S.bookings.filter(b => b.instId === i.id && b.status === 'done').length}</td></tr>`).join('')}</tbody></table></div>
  <form class="card stack" data-form="newInst"><h3>Přidat instituci</h3><div class="form-grid">
    <label class="field"><span>Název</span><input class="input" name="name" id="ni-name" required></label><label class="field"><span>Typ</span><select class="input" name="type">${CAT.instTypes.map(([v, l]) => opt(v, l, 'zs')).join('')}</select></label>
    <label class="field"><span>IČO</span><input class="input" name="ico" required pattern="[0-9]{8}" placeholder="8 číslic"></label><label class="field"><span>Oblast</span><select class="input" name="district">${D.DISTRICTS.map(([n]) => opt(n, n, 'Praha 4')).join('')}</select></label>
    <label class="field"><span>Adresa</span><input class="input" name="address" required></label><label class="field"><span>Kontaktní osoba</span><input class="input" name="contact" required></label><label class="field"><span>Telefon</span><input class="input" name="phone" type="tel" required></label></div>
    <label class="check"><input type="checkbox" name="verified" required><span>Ověřeno v rejstříku škol / podle IČO, rámcová smlouva podepsána</span></label><button class="btn primary">${ICON.plus} Zaregistrovat instituci</button></form>`;
}
function staffVisits() {
  const f = U.visitFilter === 'past' ? 'done' : U.visitFilter === 'upcoming' ? 'confirmed' : U.visitFilter;
  const list = S.bookings.filter(b => f === 'all' || b.status === f).sort(sortB);
  const shown = (f === 'done' || f === 'all') ? list.slice(-40).reverse() : list;
  return `<div class="stack"><h1>Návštěvy</h1><div class="seg" role="group" aria-label="Filtr">${[['pending', 'Čeká'], ['upcoming', 'Potvrzené'], ['past', 'Proběhlé'], ['all', 'Vše']].map(([k, l]) => `<button data-act="visitFilter" data-f="${k}" aria-pressed="${U.visitFilter === k}">${l}</button>`).join('')}</div></div>
  <div class="table-wrap"><table class="t"><thead><tr><th>Datum</th><th>Senior</th><th>Instituce</th><th>Činnost</th><th>Stav</th><th></th></tr></thead><tbody>${shown.map(b => { const s = sen(b.seniorId), i = inst(b.instId);
    return `<tr><td class="tnum">${esc(fDay.format(parseISO(b.date)))}<br><span class="small muted">${SLOTS[b.slot]}</span></td><td>${esc(fullName(s))}</td><td>${esc(i.name)}</td><td>${esc(ACT[b.activity])}</td><td>${pill(b.status)}${b.rating ? '<br>' + stars(b.rating) : ''}</td>
    <td>${b.status === 'pending' ? `<button class="btn sm" data-act="staffPhone" data-id="${s.id}">Zavolat</button>` : b.status === 'confirmed' ? `<button class="btn sm" data-act="markDone" data-id="${b.id}">Proběhlo</button> <button class="btn sm ghost" data-act="cancelB" data-id="${b.id}">Zrušit</button>` : ''}</td></tr>`; }).join('') || '<tr><td colspan="6" class="muted">Nic tu není.</td></tr>'}</tbody></table></div>
  ${(f === 'done' || f === 'all') && list.length > 40 ? `<p class="small muted">Zobrazeno posledních 40 z ${list.length}. Celek je v Reportech.</p>` : ''}`;
}
function staffCatalog() {
  const sug = S.tagSuggestions.filter(x => x.state === 'new');
  return `<div class="stack"><h1>Číselník témat</h1><p class="muted">Pevný seznam pro profily, filtry i výzvy. Kód se nikdy nemění, název ano.</p></div>
  ${sug.length ? `<section class="card stack"><h3>Návrhy ke schválení</h3><div class="list">${sug.map(x => `<div class="li"><div class="grow"><b>${esc(x.label)}</b><div class="small muted">navrhl${sen(x.by) && sen(x.by).gender === 'f' ? 'a' : ''} ${esc(sen(x.by) ? shortName(sen(x.by)) : inst(x.by).name)} · ${ago(x.at)}</div></div><button class="btn sm primary" data-act="tagApprove" data-id="${x.id}">Schválit</button><button class="btn sm ghost" data-act="tagReject" data-id="${x.id}">Zamítnout</button></div>`).join('')}</div></section>` : ''}
  <div class="form-grid">${CAT.topicGroups.map(g => `<section class="card stack"><h3>${esc(g.name)}</h3><div class="list">${g.items.map(([c, l]) => `<div class="li" style="padding:6px 0"><span class="grow">${esc(l)}</span><code class="small muted">${esc(c)}</code></div>`).join('')}</div></section>`).join('')}
  <section class="card stack"><h3>Typy činností</h3><div class="list">${CAT.activities.map(a => `<div class="li" style="padding:6px 0"><span class="grow">${esc(a.label)}${a.req ? ` <span class="pill pending">${a.req === 'rt' ? 'výpis RT' : 'aprobace'}</span>` : ''}</span><code class="small muted">${a.code}</code></div>`).join('')}</div></section></div>
  <form class="card stack" data-form="addTag"><h3>Přidat téma</h3><div class="form-grid"><label class="field"><span>Skupina</span><select class="input" name="group">${CAT.topicGroups.map((g, k) => opt(k, g.name, 2)).join('')}</select></label><label class="field"><span>Název</span><input class="input" name="label" id="tag-label" required></label></div><button class="btn primary">${ICON.plus} Přidat</button></form>`;
}
function staffModeration() {
  return `<div class="stack"><h1>Moderace</h1><p class="muted">Nahlášení z komunity Spolu. Nahlášený se o nahlášení nedozví.</p></div>
  ${S.reports.length ? `<div class="table-wrap"><table class="t"><thead><tr><th>Kdy</th><th>Nahlásil/a</th><th>Na koho</th><th>Popis</th><th>Stav</th><th></th></tr></thead><tbody>${S.reports.map(r => { const a = sen(r.about);
    return `<tr><td class="tnum">${esc(fDate.format(new Date(r.at)))}</td><td>${esc(fullName(sen(r.by)))}</td><td>${esc(fullName(a))}${a.suspended ? '<br><span class="pill help">Pozastaven</span>' : ''}</td><td>${esc(r.text)}</td><td>${r.state === 'new' ? '<span class="pill pending">Nové</span>' : '<span class="pill done">Vyřešeno</span>'}</td>
    <td class="row" style="gap:6px">${r.state === 'new' ? `<button class="btn sm" data-act="staffPhone" data-id="${a.id}">Zavolat</button>${a.suspended ? '' : `<button class="btn sm danger" data-act="suspend" data-id="${a.id}">Pozastavit účet</button>`}<button class="btn sm ghost" data-act="reportDone" data-id="${r.id}">Vyřešeno</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>` : `<div class="card">${empty(ICON.check, 'Žádná nahlášení.')}</div>`}`;
}
function staffReports() {
  const done = S.bookings.filter(b => b.status === 'done');
  const byDist = {}; done.forEach(b => { const d = inst(b.instId).district; byDist[d] = (byDist[d] || 0) + 1; });
  const dist = Object.entries(byDist).sort((a, b) => b[1] - a[1]), maxD = Math.max(1, ...dist.map(x => x[1]));
  const byMonth = {}; done.forEach(b => { const k = b.date.slice(0, 7); byMonth[k] = (byMonth[k] || 0) + 1; });
  const months = Object.entries(byMonth).sort(), maxM = Math.max(1, ...months.map(x => x[1]));
  const rated = done.filter(b => b.rating), avg = rated.length ? rated.reduce((a, b) => a + b.rating, 0) / rated.length : 0;
  const activeInst = new Set(S.bookings.filter(b => b.date >= iso(addDays(TODAY, -90))).map(b => b.instId)).size;
  const confShare = S.seniors.filter(s => weekConfirmed(s, iso(weekStart(0)))).length / S.seniors.length;
  const kids = done.reduce((a, b) => a + (b.kids || 0), 0);
  const csv = ['datum;cas;senior;instituce;mestska_cast;cinnost;deti;stav;hodnoceni', ...S.bookings.slice().sort(sortB).map(b => [b.date, SLOTS[b.slot], fullName(sen(b.seniorId)), inst(b.instId).name, inst(b.instId).district, ACT[b.activity], b.kids, STATUS[b.status], b.rating || ''].join(';'))].join('\n');
  return `<div class="stack"><h1>Reporty pro dotátory</h1><p class="muted">Od 1. 9. ${TODAY.getFullYear()} do dneška. Ukázková data.</p></div>
  <div class="kpis"><div class="kpi"><span class="small muted">Proběhlé návštěvy</span><b>${done.length}</b></div><div class="kpi"><span class="small muted">Dětí na besedách</span><b>${kids.toLocaleString('cs-CZ')}</b></div><div class="kpi"><span class="small muted">Aktivní instituce (90 dní)</span><b>${activeInst}</b></div><div class="kpi"><span class="small muted">Průměrné hodnocení</span><b>${nf.format(avg)}</b></div><div class="kpi"><span class="small muted">Potvrzené týdny</span><b>${Math.round(confShare * 100)} %</b></div></div>
  <div class="split even"><section class="card stack"><h3>Návštěvy podle městské části</h3>${dist.map(([d, n]) => `<div class="bar-row"><span>${esc(d)}</span><div class="bar" style="width:${n / maxD * 100}%"></div><span class="tnum">${n}</span></div>`).join('')}</section>
  <section class="card stack"><h3>Návštěvy podle měsíce</h3>${months.map(([m, n]) => `<div class="bar-row"><span>${esc(fMonth.format(parseISO(m + '-01')))}</span><div class="bar" style="width:${n / maxM * 100}%;background:var(--sun)"></div><span class="tnum">${n}</span></div>`).join('')}<p class="small muted">Aktuální měsíc je neúplný.</p></section></div>
  <section class="card stack"><div class="row between"><h3>Export pro závěrečnou zprávu (CSV)</h3><button class="btn sm" data-act="copy" data-text-from="csv">${ICON.copy} Zkopírovat</button></div><textarea class="input" id="csv" readonly style="min-height:160px;font-family:ui-monospace,monospace;font-size:.8em">${esc(csv)}</textarea><p class="small muted">Oddělovač středník, vhodné pro český Excel. V ostré verzi tlačítko stáhne soubor.</p></section>
  <section class="card stack"><h3>Auditní log</h3>${S.audit.length ? `<div class="list">${S.audit.slice(0, 15).map(a => `<div class="li small"><span class="tnum muted">${esc(fTime.format(new Date(a.at)))}</span><span class="grow"><b>${esc(a.action)}</b> · ${esc(a.detail)}</span></div>`).join('')}</div>` : '<p class="small muted">Zatím prázdný. Akce v aplikaci se sem zapisují.</p>'}</section>`;
}
function sheetGuardianMsgs(sh) {
  const c = S.chats.find(x => x.id === sh.id);
  return sheetWrap('Zprávy pod Hlídáčkem', `<div class="stack"><div class="card warn small">Nahlédnutí bylo zapsáno do auditního logu (${esc(STAFF.name)}, ${esc(fTime.format(new Date()))}).</div><div class="chat">${c.messages.map(m => m.sys ? `<div class="sys">${esc(m.text)}</div>` : `<div class="msg ${m.from === c.guardian.by ? 'me' : 'them'}"><b class="small">${esc(shortName(sen(m.from)))}</b><br>${esc(m.text)}<time>${esc(fTime.format(new Date(m.at)))}</time></div>`).join('')}</div></div>`);
}
function sheetStaffPhone(sh) {
  const s = sen(sh.id);
  return sheetWrap(fullName(s), `<div class="stack"><p class="muted">Telefon seniora</p><p style="font-family:var(--f-display);font-size:1.8em;font-weight:600" class="tnum">${esc(s.phone)}</p><p>Nouzový kontakt: <b>${esc(s.emergency.name)}</b> (${esc(s.emergency.rel)}) <span class="tnum">${esc(s.emergency.phone)}</span></p><button class="btn" data-act="copy" data-text="${esc(s.phone)}">${ICON.copy} Zkopírovat číslo</button></div>`);
}

/* ===================== sheety, akce, formuláře ===================== */
function sheetView() {
  const sh = U.sheet;
  const map = {
    onboarding: sheetOnboarding, instCalls: sheetInstCalls, super: sheetSuper, pattern: sheetPattern, vacation: sheetVacation, profileEdit: sheetProfileEdit,
    person: sheetPerson, guardian: sheetGuardian, risk: sheetRisk, report: sheetReport, phone: sheetPhone, myData: sheetMyData, deleteReq: sheetDeleteReq,
    sos: sheetSos, seniorDetail: sheetSeniorDetail, newCall: sheetNewCall, guardianMsgs: sheetGuardianMsgs, staffPhone: sheetStaffPhone
  };
  return map[sh.type] ? map[sh.type](sh) : '';
}
function afterSheet() { /* místo pro budoucí hooky */ }
function applyExtraTags() {
  S.extraTags = S.extraTags || [];
  S.extraTags.forEach(t => { if (!TOPIC[t.code]) { CAT.topicGroups[t.group].items.push([t.code, t.label]); TOPIC[t.code] = t.label; } });
}
function addTag(group, label) {
  const code = ['H', 'P', 'K', 'S'][group] + '_' + slug(label).toUpperCase().replace(/-/g, '_').slice(0, 18);
  if (TOPIC[code]) return null;
  S.extraTags.push({ group, code, label }); applyExtraTags(); log('Číselník', `přidáno téma ${label} (${code})`);
  return code;
}
function afterLogin() {
  U.menu = false; U.sheet = null; U.chatId = null; U.regResult = null; U.instResult = null; U.mapViews = {};
  render(); window.scrollTo(0, 0);
  if (role() === 'senior' && !me().onboarded) openSheet({ type: 'onboarding', step: 1 });
}
const RISKY = /(\d{3}\s?\d{3}\s?\d{3})|peníz|penez|půjč|pujc|účet|ucet|převod|prevod|karta|kartu|bitcoin/i;
const REPLIES = {
  s3: ['Dobrý den, ráda vás poznám! Taky ráda čtu.', 'Já chodím dopoledne na procházku kolem Hájů, pak už odpočívám.', 'Co třeba kafe ve čtvrtek? Hlídáčka si klidně zapněte, já to tak dělám taky.', 'Těším se!'],
  s2: ['Dobrý den! Šachy hraju moc rád.', 'Mám čas v úterý a ve čtvrtek dopoledne.', 'Na Chodově je pěkná kavárna u fontány.'],
  default: ['Dobrý den, děkuji za zprávu!', 'To zní moc hezky.', 'Domluvíme se na příští týden?', 'Těším se!']
};
function botReply(chatId) {
  setTimeout(() => {
    const c = S.chats.find(x => x.id === chatId); if (!c || c.status !== 'active') return;
    const s = sen(S.session && S.session.role === 'senior' ? S.session.uid : c.a), p = partnerOf(c, s);
    const pool = REPLIES[p.id] || REPLIES.default, n = c.messages.filter(m => m.from === p.id).length;
    c.messages.push({ from: p.id, text: pool[n % pool.length], at: Date.now() });
    if (role() === 'senior' && U.chatId === chatId && !U.sheet) render(); else save();
  }, 2200);
}
function sendMessage(chatId, text) {
  const c = S.chats.find(x => x.id === chatId), s = me();
  c.messages.push({ from: s.id, text, at: Date.now() });
  const inp = $('#chat-input'); if (inp) inp.value = '';
  render(); botReply(chatId);
}

const A = {
  backdrop: (d, el, e) => { if (e.target === el && !['sos', 'onboarding'].includes(U.sheet && U.sheet.type)) closeSheet(); },
  closeSheet: () => closeSheet(),
  menu: () => { U.menu = !U.menu; U.confirmReset = false; render(); },
  switchRole: () => { S.session = null; afterLogin(); },
  logout: () => { S.session = null; afterLogin(); },
  analyticsPrefs: () => { U.menu = false; render(); if (window.MN_TRACK) window.MN_TRACK.consent.reopen(); },
  theme: () => {
    const r = document.documentElement, cur = r.getAttribute('data-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const nx = cur === 'dark' ? 'light' : 'dark'; r.setAttribute('data-theme', nx); pref('theme', nx); U.menu = false; render();
  },
  resetDemo: () => { if (!U.confirmReset) { U.confirmReset = true; render(); return; } resetDemo(); applyExtraTags(); U.confirmReset = false; render(); toast('Ukázková data jsou obnovená.'); },
  demoLogin: d => { S.session = { role: d.role, uid: d.id }; log('Přihlášení', d.role); afterLogin(); },
  tab: d => { U.tab[role()] = d.tab; if (d.tab !== 'together') U.chatId = null; if (U.sheet) U.sheet = null; render(); window.scrollTo(0, 0); },
  chip: (d, el) => {
    const g = el.closest('[data-group]'), on = el.getAttribute('aria-pressed') === 'true';
    if (!on && g && g.dataset.max) {
      const form = el.closest('form') || document, n = chipVals(form, g.dataset.group).length;
      if (n >= Number(g.dataset.max)) { toast(`Vyberte nejvýš ${g.dataset.max}.`); return; }
    }
    el.setAttribute('aria-pressed', String(!on));
  },
  patSlot: (d, el) => { const on = el.getAttribute('aria-pressed') !== 'true'; el.setAttribute('aria-pressed', String(on)); el.classList.toggle('free', on); el.textContent = on ? 'Volno' : ''; },
  scale: d => { U.scale = Number(d.v); pref('scale', U.scale); document.documentElement.style.setProperty('--scale', U.scale); render(); },

  /* senior */
  confirmWeek: d => { const s = me(), m = iso(weekStart(Number(d.w))); if (!s.confirmedWeeks.includes(m)) s.confirmedWeeks.push(m); log('Potvrzení týdne', `${fullName(s)} od ${m}`); render(); toast('Týden je potvrzený. Školy vidí vaše volné bloky.'); },
  goWeek: d => { U.tab.senior = 'week'; U.weekIdx = Number(d.w); render(); window.scrollTo(0, 0); },
  weekIdx: d => { U.weekIdx = Number(d.w); render(); },
  toggleSlot: d => {
    const s = me(), k = Number(d.k), st = blockState(s, d.d, k);
    const msg = { confirmed: 'Na tento blok máte domluvenou návštěvu. Zrušit ji pomůže koordinátorka.', pending: 'Na tento blok čeká poptávka. Odpovězte na ni na stránce Domů.', hidden: 'Teď jste skrytý/á. Skrytí zrušíte níže v Nastavení.', blockedDay: 'Tento den už máte návštěvu a nastavenou nejvýš jednu akci denně.' }[st];
    if (msg) { toast(msg); return; }
    s.overrides[d.d + '#' + k] = !isAvail(s, d.d, k); render();
  },
  acceptB: d => { const b = S.bookings.find(x => x.id === d.id); b.status = 'confirmed'; log('Poptávka přijata', `${fullName(sen(b.seniorId))} → ${inst(b.instId).name}`); render(); toast('Potvrzeno. Škola dostala zprávu a my se připomeneme den předem.'); },
  declineB: d => { const b = S.bookings.find(x => x.id === d.id); b.status = 'declined'; log('Poptávka odmítnuta', `${fullName(sen(b.seniorId))} → ${inst(b.instId).name}`); render(); toast('Odmítnuto. Škole nabídneme jiné seniory v okolí.'); },
  showPhone: d => openSheet({ type: 'phone', name: d.name, phone: d.phone }),
  superSheet: () => openSheet({ type: 'super' }),
  superOff: () => { const s = me(); s.availableNow.until = iso(addDays(TODAY, -1)); render(); toast('Nabídka ukončena.'); },
  patternSheet: () => openSheet({ type: 'pattern' }),
  vacationSheet: () => openSheet({ type: 'vacation' }),
  unhide: () => { me().hiddenUntil = null; render(); toast('Školy vás zase vidí.'); },
  sMapMode: d => { U.sMapMode = d.m; render(); },
  interest: d => {
    const s = me(), c = S.calls.find(x => x.id === d.id), on = c.interested.includes(s.id);
    c.interested = on ? c.interested.filter(x => x !== s.id) : [...c.interested, s.id];
    log(on ? 'Zájem zrušen' : 'Zájem o výzvu', `${fullName(s)} → ${c.title}`);
    if (U.sheet) renderOverlay(); else render();
    toast(on ? 'Zájem zrušen.' : 'Zájem odeslán. Škola vybere a dáme vám vědět.');
  },
  commMode: d => { U.commMode = d.m; render(); },
  openChat: d => { U.chatId = d.id; U.tab.senior = 'together'; U.sheet = null; render(); window.scrollTo(0, 0); },
  closeChat: () => { U.chatId = null; render(); },
  acceptChat: d => { const c = S.chats.find(x => x.id === d.id); c.status = 'active'; c.messages.push({ sys: true, text: 'Kontakt přijat. Teď si můžete psát.', at: Date.now() }); U.chatId = c.id; render(); botReply(c.id); },
  declineChat: d => { const c = S.chats.find(x => x.id === d.id); c.status = 'declined'; render(); toast('Žádost odmítnuta. Druhá strana se to nedozví.'); },
  requestChat: d => {
    const s = me(), o = sen(d.id), c = { id: `ch-${s.id}-${o.id}-${Date.now()}`, a: s.id, b: o.id, status: 'requested', messages: [] };
    S.chats.push(c); U.sheet = null; render(); toast(`Žádost odeslána. ${shortName(o)} ji uvidí ve Spolu.`);
    setTimeout(() => { // MOCK: druhá strana přijme
      if (c.status !== 'requested') return; c.status = 'active';
      c.messages.push({ from: o.id, text: `Dobrý den, ${s.first === 'Marie' ? 'paní Marie' : s.first}! Rád${o.gender === 'f' ? 'a' : ''} se poznám.`, at: Date.now() });
      if (role() === 'senior') { render(); toast(`${shortName(o)} přijal${o.gender === 'f' ? 'a' : ''} vaši žádost.`); } else save();
    }, 2600);
  },
  quick: d => { const i = $('#chat-input'); if (i) { i.value = d.text; i.focus(); } },
  guardianSheet: d => openSheet({ type: 'guardian', id: d.id }),
  guardianEnd: d => { const c = S.chats.find(x => x.id === d.id); c.guardian.state = 'checkin'; render(); },
  guardianOk: d => { const c = S.chats.find(x => x.id === d.id); c.guardian.state = 'ok'; c.guardian.on = false; c.messages.push({ sys: true, text: 'Hlídáček ukončen, vše v pořádku.', at: Date.now() }); log('Hlídáček OK', fullName(sen(c.guardian.by))); render(); toast('Děkujeme. Hlídáček je vypnutý.'); },
  guardianHelp: d => { const c = S.chats.find(x => x.id === d.id); c.guardian.state = 'help'; log('Hlídáček – pomoc', fullName(sen(c.guardian.by))); render(); openSheet({ type: 'phone', name: 'Mezi námi – koordinátorka', phone: '+420 604 356 300' }); toast('Koordinátorka vám zavolá do 15 minut.'); },
  guardianCancel: d => { const c = S.chats.find(x => x.id === d.id); c.guardian.on = false; c.guardian.state = 'ok'; c.messages.push({ sys: true, text: 'Hlídáček byl vypnut.', at: Date.now() }); U.sheet = null; render(); },
  reportUser: d => openSheet({ type: 'report', id: d.id, chat: d.chat }),
  blockChat: d => { const c = S.chats.find(x => x.id === d.id); c.status = 'blocked'; U.chatId = null; render(); toast('Zablokováno. Tento člověk vám už nenapíše.'); },
  sendAnyway: () => { const sh = U.sheet; U.sheet = null; renderOverlay(); sendMessage(sh.chatId, sh.text); },
  myData: () => openSheet({ type: 'myData' }),
  deleteReq: () => openSheet({ type: 'deleteReq' }),
  deleteConfirm: () => { const s = me(); if (!S.deletionRequests.some(x => x.seniorId === s.id)) S.deletionRequests.push({ id: 'del' + Date.now(), seniorId: s.id, at: Date.now() }); log('Žádost o smazání', fullName(s)); closeSheet(); toast('Žádost odeslána koordinátorce.'); },
  profileEdit: () => openSheet({ type: 'profileEdit' }),
  copy: d => {
    const src = d.textFrom ? document.getElementById(d.textFrom) : null, text = d.text || (src ? (src.value || src.textContent) : '');
    const fallback = () => { if (src && src.select) { src.select(); } toast('Text je označený, zkopírujte ho Ctrl+C.'); };
    try { navigator.clipboard.writeText(text).then(() => toast('Zkopírováno.'), fallback); } catch (e) { fallback(); }
  },
  onb: d => { U.sheet.step = Number(d.step); renderOverlay(); },
  sosChoose: d => sosChoose(d.c),
  sosCancel: () => { const ev = S.sos.find(x => x.id === U.sheet.id); if (ev) ev.state = 'cancelled'; closeSheet(); render(); toast('Zrušeno. Koordinátorce jsme dali vědět, že je vše v pořádku.'); },
  sosEnd: () => { closeSheet(); render(); },

  /* škola */
  seniorDetail: d => openSheet({ type: 'seniorDetail', id: d.id }),
  pickBlock: d => { U.sheet.pick = { d: d.d, k: Number(d.k) }; renderOverlay(); const f = $('#overlay form[data-form="request"]'); if (f) f.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
  schoolMode: d => { U.schoolMode = d.m; render(); },
  newCall: () => openSheet({ type: 'newCall', rerender: true }),
  suggestTag: () => {
    const i = $('#nc-sug'), v = i && i.value.trim();
    if (!v) { toast('Napište název tématu.'); return; }
    S.tagSuggestions.push({ id: 'ts' + Date.now(), label: v, by: S.session.uid, at: Date.now(), state: 'new' }); i.value = ''; save(); toast('Návrh odeslán koordinátorce ke schválení.');
  },
  choose: d => {
    const c = S.calls.find(x => x.id === d.call), s = sen(d.id);
    if (c.chosen.includes(s.id)) return;
    c.chosen.push(s.id);
    S.bookings.push({ id: 'b' + Date.now(), seniorId: s.id, instId: c.instId, date: c.date, slot: c.slot, activity: c.activity, topic: c.tags[0], klass: c.klass, kids: 25, room: '', tech: c.tech, status: 'confirmed', source: 'call', callId: c.id, createdAt: Date.now(), rating: null, contact: inst(c.instId).contact });
    if (c.chosen.length >= c.needed) c.status = 'filled';
    log('Výběr z výzvy', `${inst(c.instId).name} vybrala ${fullName(s)}`);
    if (U.sheet) { U.sheet.rerender = true; renderOverlay(); } else render();
    toast(`${shortName(s)} dostane potvrzení a připomínku den předem.`);
  },
  closeCall: d => { S.calls.find(x => x.id === d.id).status = 'closed'; render(); toast('Výzva uzavřena a zmizela z mapy.'); },
  simAnswer: d => { const b = S.bookings.find(x => x.id === d.id); b.status = d.a === '1' ? 'confirmed' : 'declined'; render(); toast(d.a === '1' ? `${shortName(sen(b.seniorId))} přijal${sen(b.seniorId).gender === 'f' ? 'a' : ''}. Návštěva je potvrzená.` : 'Senior odmítl. Nabízíme další seniory v okolí na mapě.'); },
  cancelB: d => { const b = S.bookings.find(x => x.id === d.id); b.status = 'cancelled'; log('Zrušení návštěvy', `${fullName(sen(b.seniorId))} ${b.date}`); render(); toast('Návštěva zrušena. Senior dostal zprávu.'); },
  rate: d => { const b = S.bookings.find(x => x.id === d.id), s = sen(b.seniorId); b.rating = Number(d.v); s.ratingSum += b.rating; s.ratingCount += 1; render(); toast('Děkujeme za hodnocení.'); },
  visitFilter: d => { U.visitFilter = d.f; render(); },

  /* personál */
  taskDone: d => { S.doneTasks.push(d.id); render(); },
  staffPhone: d => openSheet({ type: 'staffPhone', id: d.id }),
  staffConfirmWeek: d => { const [id, w] = d.id.split('|'), s = sen(id), m = iso(weekStart(Number(w))); if (!s.confirmedWeeks.includes(m)) s.confirmedWeeks.push(m); log('Týden potvrzen za seniora', `${fullName(s)} od ${m} (telefonicky)`); render(); toast(`Týden potvrzen za ${shortName(s)}.`); },
  sosState: d => { const x = S.sos.find(e => e.id === d.id); x.state = d.s; if (d.s === 'resolved' && !x.note) x.note = `Vyřešila ${STAFF.name}.`; log('SOS', `${fullName(sen(x.seniorId))}: ${d.s}`); render(); },
  guardianEscalate: d => { const c = S.chats.find(x => x.id === d.id); c.guardian.state = 'escalated'; log('Hlídáček – eskalace', fullName(sen(c.guardian.by))); render(); toast('Senior neodpověděl. Úkol: zavolat jemu, pak nouzovému kontaktu.'); },
  guardianClose: d => { const c = S.chats.find(x => x.id === d.id); c.guardian.on = false; c.guardian.state = 'ok'; log('Hlídáček uzavřen', fullName(sen(c.guardian.by))); render(); },
  guardianMsgs: d => { const c = S.chats.find(x => x.id === d.id); log('Nahlédnutí do zpráv', `${STAFF.name} → Hlídáček ${fullName(sen(c.guardian.by))}`); openSheet({ type: 'guardianMsgs', id: d.id, rerender: true }); },
  regAgain: () => { U.regResult = null; render(); window.scrollTo(0, 0); },
  tagApprove: d => { const x = S.tagSuggestions.find(t => t.id === d.id); const code = addTag(2, x.label); x.state = 'approved'; render(); toast(code ? `Téma přidáno s kódem ${code}.` : 'Takové téma už existuje.'); },
  tagReject: d => { S.tagSuggestions.find(t => t.id === d.id).state = 'rejected'; render(); },
  suspend: d => { const s = sen(d.id); s.suspended = true; s.community = false; log('Pozastavení účtu', fullName(s)); render(); toast(`Účet ${fullName(s)} je pozastavený.`); },
  reportDone: d => { S.reports.find(r => r.id === d.id).state = 'done'; render(); },
  markDone: d => { S.bookings.find(b => b.id === d.id).status = 'done'; render(); }
};

const F = {
  login: (f, fd) => {
    const u = String(fd.get('user') || '').trim().toLowerCase(), p = String(fd.get('pass') || '');
    let sess = null;
    const s = S.seniors.find(x => x.username === u), i = S.institutions.find(x => x.username === u);
    if (s) sess = { role: 'senior', uid: s.id }; else if (i) sess = { role: 'school', uid: i.id }; else if (u === STAFF.username) sess = { role: 'staff', uid: STAFF.id };
    if (!sess || p !== 'ukazka') { $('#login-err').textContent = 'Neznámé jméno nebo heslo. Zkontrolujte přihlašovací kartu, nebo zavolejte koordinátorce Mezi námi.'; return; }
    if (s && s.suspended) { $('#login-err').textContent = 'Účet je pozastavený. Ozvěte se prosím koordinátorce Mezi námi.'; return; }
    S.session = sess; afterLogin();
  },
  onboarding: (f, fd) => {
    const s = me();
    s.consents = Object.assign(s.consents, { terms: true, location: !!fd.get('location'), photo: !!fd.get('photo'), analytics: !!fd.get('analytics') });
    s.onboarded = true; log('Souhlasy', `${fullName(s)}: poloha ${s.consents.location ? 'ano' : 'ne'}`);
    U.sheet = null; render(); toast(s.consents.location ? 'Hotovo. Školy v okolí vás teď najdou.' : 'Hotovo. Bez souhlasu s polohou vás školy na mapě neuvidí.');
  },
  joinTogether: (f) => {
    const s = me(); s.interests = chipVals(f, 'interests'); s.together = chipVals(f, 'together'); s.community = true; s.consents.community = true;
    if (!S.chats.some(c => (c.a === 's3' && c.b === s.id) || (c.b === 's3' && c.a === s.id))) S.chats.push({ id: `ch-s3-${s.id}`, a: 's3', b: s.id, status: 'requested', messages: [] }); // MOCK příchozí žádost
    log('Spolu zapnuto', fullName(s)); render(); toast('Seznamování je zapnuté. Někdo vás už chce poznat.');
  },
  sendMsg: (f, fd) => {
    const text = String(fd.get('text') || '').trim(); if (!text) return;
    if (RISKY.test(text)) { openSheet({ type: 'risk', chatId: f.dataset.id, text }); return; }
    sendMessage(f.dataset.id, text);
  },
  guardian: (f, fd) => {
    const c = S.chats.find(x => x.id === f.dataset.id), s = me();
    c.guardian = { on: true, by: s.id, when: `${fd.get('date')}T${fd.get('time')}`, where: String(fd.get('where')), duration: Number(fd.get('duration')), startedAt: Date.now(), state: 'active' };
    c.messages.push({ sys: true, text: 'Tato konverzace je pod Hlídáčkem. Zprávy se ukládají a v případě potřeby je uvidí personál Mezi námi.', at: Date.now() });
    log('Hlídáček zapnut', `${fullName(s)}, ${c.guardian.where}`); U.sheet = null; render(); toast('Hlídáček je zapnutý. Mezi námi o schůzce ví.');
  },
  report: (f, fd) => { S.reports.unshift({ id: 'r' + Date.now(), by: me().id, about: f.dataset.id, chatId: f.dataset.chat || null, text: String(fd.get('text')), at: Date.now(), state: 'new' }); log('Nahlášení', fullName(sen(f.dataset.id))); closeSheet(); toast('Děkujeme. Koordinátorka se na to podívá.'); },
  superOn: (f, fd) => { const s = me(); s.availableNow = { until: iso(addDays(TODAY, 7)), note: String(fd.get('note') || '').trim() || 'Rád/a přijdu na besedu.', lastActivated: todayISO }; log('Jsem k dispozici', fullName(s)); U.sheet = null; render(); toast('Hotovo. Školy v okolí vás teď vidí v záložce Volní hned.'); },
  pattern: (f) => { const s = me(); $$('.slot[data-act="patSlot"]', f).forEach(b => { s.pattern[Number(b.dataset.i)][Number(b.dataset.k)] = b.getAttribute('aria-pressed') === 'true'; }); s.overrides = {}; U.sheet = null; render(); toast('Obvyklý týden je uložený.'); },
  vacation: (f, fd) => { me().hiddenUntil = iso(addDays(TODAY, Number(fd.get('len')))); U.sheet = null; render(); toast('Jste skrytý/á. Školy vám teď poptávky neposílají.'); },
  profileEdit: (f, fd) => {
    const s = me();
    s.about = String(fd.get('about')); s.travel = Number(fd.get('travel')); s.channel = String(fd.get('channel')); s.duration = Number(fd.get('duration'));
    const acts = chipVals(f, 'acts').filter(a => !(a === 'SUPL' && !s.aprobace) && !(a === 'HLIDANI' && !s.rt));
    if (acts.length) s.activities = acts;
    const tp = chipVals(f, 'topics'); if (tp.length) s.topics = tp;
    U.sheet = null; render(); toast('Profil je uložený.');
  },
  request: (f, fd) => {
    const i = me(), s = sen(f.dataset.id), p = U.sheet.pick;
    if (blockState(s, p.d, p.k) !== 'free') { toast('Tento blok mezitím obsadil někdo jiný. Vyberte jiný.'); renderOverlay(); return; }
    S.bookings.push({ id: 'b' + Date.now(), seniorId: s.id, instId: i.id, date: p.d, slot: p.k, activity: String(fd.get('activity')), topic: String(fd.get('topic')), klass: String(fd.get('klass')), kids: Number(fd.get('kids')), room: String(fd.get('room') || ''), tech: chipVals(f, 'tech'), status: 'pending', source: 'direct', createdAt: Date.now(), rating: null, contact: String(fd.get('contact')) });
    log('Poptávka', `${i.name} → ${fullName(s)} ${p.d}`); U.sheet = null; render(); toast(`Poptávka odeslána. ${shortName(s)} má 48 hodin na odpověď.`);
  },
  newCall: (f, fd) => {
    const tags = chipVals(f, 'nctags');
    if (!tags.length) { $('#nc-err').textContent = 'Vyberte aspoň jedno téma, aby vás senioři našli.'; return; }
    if (String(fd.get('deadline')) > String(fd.get('date'))) { $('#nc-err').textContent = 'Uzávěrka musí být nejpozději v den akce.'; return; }
    const i = me();
    S.calls.push({ id: 'c' + Date.now(), instId: i.id, title: String(fd.get('title')), activity: String(fd.get('activity')), tags, audience: String(fd.get('audience')), klass: String(fd.get('klass') || ''), date: String(fd.get('date')), slot: Number(fd.get('slot')), duration: Number(fd.get('duration')), needed: Number(fd.get('needed')) || 1, repeat: String(fd.get('repeat') || ''), tech: chipVals(f, 'nctech'), parking: !!fd.get('parking'), barrierFree: !!fd.get('barrierFree'), reward: String(fd.get('reward')), deadline: String(fd.get('deadline')), interested: [], chosen: [], status: 'open', createdAt: Date.now() });
    log('Nová výzva', `${i.name}: ${fd.get('title')}`); U.sheet = null; U.tab.school = 'calls'; render();
    const n = S.seniors.filter(s => schoolVisible(s) && s.topics.some(t => tags.includes(t))).length;
    toast(n ? `Výzva je zveřejněná. Upozornili jsme ${n} ${n === 1 ? 'seniora' : n < 5 ? 'seniory' : 'seniorů'} s tímto tématem.` : 'Výzva je zveřejněná a senioři ji uvidí na mapě.');
  },
  register: (f, fd) => {
    const acts = chipVals(f, 'acts'), err = $('#reg-err');
    if (acts.includes('SUPL') && !fd.get('aprobace')) { err.textContent = 'Suplování vyžaduje ověřenou aprobaci.'; return; }
    if (acts.includes('HLIDANI') && !fd.get('rt')) { err.textContent = 'Hlídání dětí vyžaduje doložený výpis z rejstříku trestů.'; return; }
    const topics = chipVals(f, 'topics'); if (!topics.length) { err.textContent = 'Vyberte aspoň jedno téma.'; return; }
    const first = String(fd.get('first')).trim(), last = String(fd.get('last')).trim();
    const dist = D.DISTRICTS.find(x => x[0] === fd.get('district'));
    const id = 's' + (S.seniors.length + 1) + '-' + Date.now().toString(36);
    const username = `${slug(first)}.${slug(last)}.${pad(Math.floor(Math.random() * 90) + 10)}`.replace(/-/g, '');
    const words = ['lipa', 'dub', 'buk', 'jasan', 'javor', 'olse', 'tis'];
    const pass = `${words[Math.floor(Math.random() * words.length)]}-${Math.floor(1000 + Math.random() * 9000)}`;
    S.seniors.push({
      id, first, last, gender: String(fd.get('gender')), birthYear: Number(fd.get('birthYear')), username, district: dist[0],
      lat: Math.round((dist[1] + (Math.random() - .5) * .01) * 250) / 250, lng: Math.round((dist[2] + (Math.random() - .5) * .014) * 160) / 160,
      about: String(fd.get('about')), phone: String(fd.get('phone')), emergency: { name: String(fd.get('eName')), rel: String(fd.get('eRel')), phone: String(fd.get('ePhone')) },
      channel: String(fd.get('channel')), travel: Number(fd.get('travel')), transport: chipVals(f, 'transport'), parking: !!fd.get('parking'), mobility: String(fd.get('mobility')),
      activities: acts.length ? acts : ['BESEDA'], topics, audiences: chipVals(f, 'aud'), duration: Number(fd.get('duration')), groupSize: 'class', reward: String(fd.get('reward')),
      profession: String(fd.get('profession')), aprobace: !!fd.get('aprobace'), aprobaceText: String(fd.get('aprobaceText') || ''), rt: !!fd.get('rt'),
      languages: String(fd.get('languages') || '').split(',').map(x => x.trim()).filter(Boolean), tech: chipVals(f, 'tech'),
      pattern: [[true, true, false, false], [true, true, false, false], [true, true, false, false], [true, true, false, false], [false, false, false, false]], overrides: {}, confirmedWeeks: [],
      maxOnePerDay: false, hiddenUntil: null, availableNow: null, community: false, interests: [], together: [], ratingSum: 0, ratingCount: 0, notes: '',
      consents: { terms: true, location: false, community: false, guardian: false, health: false, analytics: false, photo: !!fd.get('photo') }, onboarded: false, createdAt: todayISO
    });
    log('Registrace seniora', `${first} ${last} (${username})`);
    U.regResult = { id, pass }; render(); window.scrollTo(0, 0);
  },
  newInst: (f, fd) => {
    const name = String(fd.get('name')).trim(), dist = D.DISTRICTS.find(x => x[0] === fd.get('district'));
    const username = slug(name).slice(0, 24), pass = `skola-${Math.floor(1000 + Math.random() * 9000)}`;
    S.institutions.push({ id: 'i' + Date.now(), name, type: String(fd.get('type')), district: dist[0], address: String(fd.get('address')), lat: dist[1] + (Math.random() - .5) * .008, lng: dist[2] + (Math.random() - .5) * .012, ico: String(fd.get('ico')), contact: String(fd.get('contact')), phone: String(fd.get('phone')), username, tags: [], teachers: [String(fd.get('contact'))] });
    log('Registrace instituce', name); U.instResult = { name, username, pass }; render(); window.scrollTo(0, 0);
  },
  addTag: (f, fd) => { const code = addTag(Number(fd.get('group')), String(fd.get('label')).trim()); render(); toast(code ? `Téma přidáno s kódem ${code}.` : 'Takové téma už existuje.'); }
};

const C = {
  maxOne: el => { me().maxOnePerDay = el.checked; render(); },
  topicFilter: el => { U.topicFilter = el.value; render(); },
  consent: el => {
    const s = me(), k = el.dataset.k; s.consents[k] = el.checked;
    if (k === 'community') s.community = el.checked;
    log('Změna souhlasu', `${fullName(s)}: ${k} = ${el.checked ? 'ano' : 'ne'}`); render();
    toast(k === 'location' && !el.checked ? 'Uloženo. Školy vás na mapě neuvidí.' : 'Uloženo.');
  },
  sf: el => { U.sf[el.dataset.k] = el.value; render(); },
  radius: el => { U.radius = el.value; render(); },
  aprob: el => { U.sf.aprob = el.checked; render(); }
};

/* ---------- posluchače ---------- */
let sosJustFired = false;
document.addEventListener('click', e => {
  if (U.menu && !e.target.closest('.menu-pop') && !e.target.closest('[data-act="menu"]')) { U.menu = false; U.confirmReset = false; render(); return; }
  const sos = e.target.closest('#sos-btn');
  if (sos) { if (!sosJustFired) toast('Pro nouzové volání tlačítko SOS podržte 2 sekundy.'); sosJustFired = false; return; }
  const el = e.target.closest('[data-act]'); if (!el) return;
  if (el.dataset.act === 'backdrop' && e.target !== el) return;
  const fn = A[el.dataset.act]; if (!fn) return;
  if (el.tagName === 'A') return;
  e.preventDefault(); fn(el.dataset, el, e);
});
document.addEventListener('submit', e => { const f = e.target.closest('form[data-form]'); if (!f) return; e.preventDefault(); const fn = F[f.dataset.form]; if (fn) fn(f, new FormData(f)); });
document.addEventListener('change', e => { const el = e.target.closest('[data-change]'); if (el && C[el.dataset.change]) C[el.dataset.change](el); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (U.sheet && !['sos', 'onboarding'].includes(U.sheet.type)) closeSheet(); else if (U.menu) { U.menu = false; render(); } }
  if (e.target.id === 'sos-btn' && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); if (!e.repeat) startHold(e.target); }
});
document.addEventListener('keyup', e => { if (e.target.id === 'sos-btn' && (e.key === ' ' || e.key === 'Enter')) cancelHold(e.target); });
function startHold(b) {
  cancelHold(b); b.classList.add('holding');
  holdTimer = setTimeout(() => { b.classList.remove('holding'); sosJustFired = true; holdTimer = null; triggerSos(); }, 2000);
}
function cancelHold(b) { if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; } if (b) b.classList.remove('holding'); }
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('#sos-btn'); if (!b) return;
  e.preventDefault(); startHold(b);
  const end = () => { cancelHold(b); b.removeEventListener('pointerup', end); b.removeEventListener('pointerleave', end); b.removeEventListener('pointercancel', end); };
  b.addEventListener('pointerup', end); b.addEventListener('pointerleave', end); b.addEventListener('pointercancel', end);
});
document.addEventListener('contextmenu', e => { if (e.target.closest('#sos-btn')) e.preventDefault(); });

/* ---------- start ---------- */
applyExtraTags();
render();
if (role() === 'senior' && !me().onboarded) openSheet({ type: 'onboarding', step: 1 });

})();
