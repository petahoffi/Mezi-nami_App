/* Měření používání aplikace Mezi námi.
 *
 * Principy:
 *  1. Dokud uživatel nedá souhlas, nenačte se žádný skript třetí strany a nic se neposílá.
 *  2. Neposíláme osobní údaje: žádná jména, ID uživatelů, texty zpráv, adresy ani telefony.
 *     Události nesou jen název, roli (senior/škola/koordinátorka) a pár povolených hodnot.
 *  3. SOS a Hlídáček se záměrně neměří (citlivé). Počítá je jen interní log aplikace.
 *  4. Veřejné API: window.MN_TRACK (track, sync, on, state, consent).
 */
(function () {
  'use strict';

  const DEFAULTS = { GTM_ID: '', GA4_ID: '', META_PIXEL_ID: '', META_PIXEL_IN_APP: false, CF_BEACON_TOKEN: '', APP_ENV: 'prototype' };
  const CFG = Object.assign({}, DEFAULTS, window.MN_ANALYTICS_CONFIG || {});
  const RX = { gtm: /^GTM-[A-Z0-9]{4,10}$/, ga4: /^G-[A-Z0-9]{6,14}$/, px: /^\d{8,20}$/, cf: /^[a-f0-9]{32}$/i };
  const ID = {
    gtm: RX.gtm.test(CFG.GTM_ID) ? CFG.GTM_ID : '',
    ga4: RX.ga4.test(CFG.GA4_ID) ? CFG.GA4_ID : '',
    px: RX.px.test(CFG.META_PIXEL_ID) ? CFG.META_PIXEL_ID : '',
    cf: RX.cf.test(CFG.CF_BEACON_TOKEN) ? CFG.CF_BEACON_TOKEN : ''
  };
  ['GTM_ID', 'GA4_ID', 'META_PIXEL_ID', 'CF_BEACON_TOKEN'].forEach(k => {
    if (CFG[k] && !ID[{ GTM_ID: 'gtm', GA4_ID: 'ga4', META_PIXEL_ID: 'px', CF_BEACON_TOKEN: 'cf' }[k]]) console.warn('[analytics] Neplatné ' + k + ' – ignoruji.');
  });

  const CONSENT_KEY = 'mn-analytics-consent';   // 'granted' | 'denied' (jen pro školy a koordinátorky)
  const DEBUG_KEY = 'mn-analytics-debug';
  const LOG_MAX = 200;

  const st = {
    role: null, screen: null, lastScreen: null, consent: null, paused: true, init: false,
    loaded: { gtm: false, ga4: false, px: false, cf: false },
    log: [], listeners: []
  };

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  /* ---------- úložiště (bezpečně) ---------- */
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignorovat */ } },
    del: k => { try { localStorage.removeItem(k); } catch (e) { /* ignorovat */ } }
  };
  const debugOn = () => /[?&]analytics_debug=1\b/.test(location.search) || (function () { try { return sessionStorage.getItem(DEBUG_KEY) === '1'; } catch (e) { return false; } })();
  if (/[?&]analytics_debug=1\b/.test(location.search)) { try { sessionStorage.setItem(DEBUG_KEY, '1'); } catch (e) { /* ignorovat */ } }

  /* ---------- sanitizace parametrů ---------- */
  const NAME_RX = /^[a-z][a-z0-9_]{0,39}$/;
  const PII_RX = /(@|\+?\d[\d\s-]{7,}\d)/;   // e-mail nebo telefon
  function clean(params) {
    const out = {};
    Object.keys(params || {}).slice(0, 10).forEach(k => {
      if (!/^[a-z][a-z0-9_]{0,39}$/.test(k)) return;
      let v = params[k];
      if (typeof v === 'boolean') v = v ? 'true' : 'false';
      if (typeof v === 'number') { if (!isFinite(v)) return; out[k] = v; return; }
      if (typeof v !== 'string') return;
      v = v.slice(0, 100);
      if (PII_RX.test(v)) return;
      out[k] = v;
    });
    return out;
  }

  /* ---------- logování pro ladicí panel ---------- */
  function pushLog(entry) {
    entry.t = Date.now();
    st.log.unshift(entry); if (st.log.length > LOG_MAX) st.log.pop();
    st.listeners.forEach(fn => { try { fn(entry); } catch (e) { /* ignorovat */ } });
  }

  /* ---------- načítání nástrojů ---------- */
  function addScript(src, attrs) {
    const s = document.createElement('script'); s.async = true; s.src = src;
    Object.keys(attrs || {}).forEach(k => s.setAttribute(k, attrs[k]));
    document.head.appendChild(s); return s;
  }
  function mode() { return ID.gtm ? 'gtm' : ID.ga4 ? 'ga4' : 'demo'; }
  const pixelAllowed = () => !!(ID.px && CFG.META_PIXEL_IN_APP);

  function loadTools() {
    // Consent Mode v2: výchozí stav "zamítnuto", hned po souhlasu jen analytické úložiště povolíme.
    gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied', wait_for_update: 500 });
    gtag('consent', 'update', { analytics_storage: 'granted' });

    if (ID.gtm && !st.loaded.gtm) {
      window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
      addScript('https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(ID.gtm));
      st.loaded.gtm = true;
    } else if (ID.ga4 && !st.loaded.ga4) {
      gtag('js', new Date());
      gtag('config', ID.ga4, {
        send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
        cookie_flags: 'SameSite=Lax;Secure', page_location: location.origin + location.pathname
      });
      addScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ID.ga4));
      st.loaded.ga4 = true;
    }
    // Pixel se načítá přímo jen bez GTM. S GTM se nastavuje uvnitř kontejneru.
    if (!ID.gtm && pixelAllowed() && !st.loaded.px) {
      /* eslint-disable */
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      /* eslint-enable */
      window.fbq('set', 'autoConfig', false, ID.px);   // vypne automatické sbírání kliknutí a polí formulářů
      window.fbq('init', ID.px);
      st.loaded.px = true;
    }
    if (ID.cf && !st.loaded.cf) {
      addScript('https://static.cloudflareinsights.com/beacon.min.js', { 'data-cf-beacon': JSON.stringify({ token: ID.cf, spa: true }) });
      st.loaded.cf = true;
    }
  }

  function revokeTools() {
    if (ID.ga4) window['ga-disable-' + ID.ga4] = true;
    gtag('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    if (window.fbq && st.loaded.px) window.fbq('consent', 'revoke');
    // Smažeme cookies, které GA nastavilo (best effort; plně zmizí po obnovení stránky).
    document.cookie.split(';').forEach(c => {
      const n = c.split('=')[0].trim();
      if (/^(_ga|_gid|_gat|_fbp|_fbc)/.test(n)) document.cookie = n + '=; Max-Age=0; path=/; SameSite=Lax';
    });
  }

  /* ---------- odesílání ---------- */
  const PIXEL_STD = { registration_completed: 'CompleteRegistration', request_sent: 'Lead', open_call_created: 'Lead' };

  function track(name, params) {
    if (!NAME_RX.test(name || '')) return;
    const p = clean(params);
    p.user_role = st.role || 'public';
    p.app_env = CFG.APP_ENV;
    if (st.consent !== true || st.paused) { pushLog({ name, params: p, status: st.paused ? 'zahozeno (nepřihlášen)' : 'zahozeno (bez souhlasu)' }); return; }

    const m = mode();
    if (m === 'gtm') window.dataLayer.push(Object.assign({ event: name }, p));
    else if (m === 'ga4') { if (!window['ga-disable-' + ID.ga4]) gtag('event', name, p); }
    else window.dataLayer.push(Object.assign({ event: name }, p));   // demo: jen lokální dataLayer

    if (!ID.gtm && st.loaded.px && window.fbq) {
      if (name === 'screen_view') window.fbq('track', 'PageView');
      else if (PIXEL_STD[name]) window.fbq('track', PIXEL_STD[name], {});
      else window.fbq('trackCustom', name, {});
    }
    pushLog({ name, params: p, status: m === 'demo' ? 'dataLayer (demo, nic neodesláno)' : 'odesláno (' + m + ')' });
  }

  /* ---------- souhlas ---------- */
  function setConsent(c) {
    if (c === st.consent) return;
    const prev = st.consent;
    if (c === true) {
      st.consent = true; st.lastScreen = null;        // aby se hned zaznamenala aktuální obrazovka
      loadTools();
      track('consent_update', { analytics: 'granted' });
    } else {
      if (prev === true) track('consent_update', { analytics: 'revoked' });
      st.consent = c;
      if (prev === true) revokeTools();
    }
  }
  function storedConsent() { const v = store.get(CONSENT_KEY); return v === 'granted' ? true : v === 'denied' ? false : null; }

  /* ---------- lišta se souhlasem (školy a koordinátorky; senioři mají souhlas v aplikaci) ---------- */
  let bannerEl = null;
  function removeBanner() { if (bannerEl) { bannerEl.remove(); bannerEl = null; } }
  function showBanner() {
    if (bannerEl) return;
    const css = document.createElement('style');
    css.textContent = '.mn-cc{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:1200;max-width:640px;margin:0 auto;background:var(--surface,#fff);color:var(--ink,#1c1c1c);border:1px solid var(--line,#ccc);border-radius:16px;padding:16px;box-shadow:0 8px 30px rgba(0,0,0,.2);font:inherit}.mn-cc p{margin:0 0 12px;font-size:.95em;line-height:1.45}.mn-cc .row{display:flex;gap:8px;flex-wrap:wrap}.mn-cc button{min-height:44px;padding:0 16px;border-radius:12px;border:1px solid var(--line,#999);background:var(--surface,#fff);color:inherit;font:inherit;cursor:pointer}.mn-cc button.yes{background:var(--leaf,#2f7d5b);border-color:transparent;color:#fff}';
    bannerEl = document.createElement('div');
    bannerEl.className = 'mn-cc'; bannerEl.setAttribute('role', 'dialog'); bannerEl.setAttribute('aria-label', 'Měření používání aplikace');
    bannerEl.innerHTML = '<p><b>Anonymní měření používání.</b> Pomáhá nám zlepšovat aplikaci. Neposíláme jména, zprávy ani adresy. Souhlas můžete kdykoli změnit v nabídce.</p><div class="row"><button class="yes" type="button" data-cc="granted">Souhlasím</button><button type="button" data-cc="denied">Nesouhlasím</button></div>';
    bannerEl.prepend(css);
    bannerEl.addEventListener('click', e => {
      const b = e.target.closest('[data-cc]'); if (!b) return;
      store.set(CONSENT_KEY, b.dataset.cc); removeBanner(); setConsent(b.dataset.cc === 'granted');
      if (st.consent === true) emitScreen();
    });
    document.body.appendChild(bannerEl);
    const first = bannerEl.querySelector('button'); if (first) first.focus({ preventScroll: true });
  }

  /* ---------- synchronizace se stavem aplikace ---------- */
  function emitScreen() {
    const key = (st.role || 'public') + ':' + st.screen;
    if (!st.role || key === st.lastScreen) return;
    st.lastScreen = key;
    track('screen_view', { screen_name: st.screen });
  }

  /* app.js volá po každém vykreslení: { role, screen, consent } – consent jen u seniora (true/false) */
  function sync(s) {
    const prevRole = st.role, role = s.role || null;
    if (st.init && prevRole && !role) { track('logout'); st.lastScreen = null; }      // ještě se starým souhlasem
    st.role = role; st.screen = s.screen || null;

    // Bez přihlášení se nic neměří, ale rozhodnutí o souhlasu se tím nemění (odhlášení není odvolání souhlasu).
    st.paused = !role;
    let c = st.consent;
    if (role) {
      c = role === 'senior' ? !!s.consent : storedConsent();
      setConsent(c);
    }

    if (role && role !== 'senior' && c === null) showBanner(); else removeBanner();

    if (st.init && !prevRole && role) track('login', { method: 'password' });
    emitScreen();
    st.init = true;
  }

  /* ---------- automatické sledování akcí (bez zásahu do app.js) ---------- */
  const ONE = (v, allowed) => (allowed.indexOf(v) >= 0 ? v : undefined);
  const CLICKS = {
    toggleSlot: () => ['availability_toggle'],
    confirmWeek: () => ['week_confirm'],
    acceptB: () => ['booking_response', { response: 'accept' }],
    declineB: () => ['booking_response', { response: 'decline' }],
    cancelB: () => ['booking_cancel'],
    pickBlock: () => ['block_select'],
    requestChat: () => ['chat_request'],
    acceptChat: () => ['chat_response', { response: 'accept' }],
    declineChat: () => ['chat_response', { response: 'decline' }],
    sMapMode: d => ['map_view_toggle', { mode: ONE(d.m, ['map', 'list']), where: 'senior' }],
    commMode: d => ['map_view_toggle', { mode: ONE(d.m, ['map', 'list']), where: 'community' }],
    schoolMode: d => ['map_view_toggle', { mode: ONE(d.m, ['map', 'list']), where: 'school' }],
    seniorDetail: () => ['senior_profile_open'],
    superSheet: () => ['super_button_open'],
    newCall: () => ['open_call_form_open'],
    suggestTag: () => ['tag_suggestion_open'],
    rate: d => ['visit_rating', { score: ONE(Number(d.v), [1, 2, 3, 4, 5]) }],
    scale: d => ['font_scale_change', { scale: ONE(Number(d.v), [1, 1.15, 1.3]) }],
    theme: () => ['theme_toggle'],
    showPhone: () => ['contact_reveal'],
    myData: () => ['privacy_data_open'],
    deleteReq: () => ['privacy_delete_request']
  };
  const FORMS = {
    request: () => ['request_sent'],
    newCall: () => ['open_call_created'],
    superOn: () => ['super_button_activated'],
    sendMsg: () => ['chat_message_sent'],
    joinTogether: () => ['community_join'],
    onboarding: () => ['onboarding_completed'],
    pattern: () => ['weekly_pattern_saved'],
    vacation: () => ['vacation_set'],
    report: () => ['report_submitted'],
    register: () => ['registration_completed', { registrant_type: 'senior' }],
    newInst: () => ['registration_completed', { registrant_type: 'institution' }]
    // záměrně NEMĚŘENO: SOS (sosChoose, sosCancel, ...) a Hlídáček (guardian*)
  };
  document.addEventListener('click', e => {
    const el = e.target.closest && e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const f = CLICKS[el.dataset.act]; if (!f) return;
    const r = f(el.dataset); track(r[0], r[1]);
  }, true);
  document.addEventListener('submit', e => {
    const fm = e.target.closest && e.target.closest('form[data-form]');
    if (!fm) return;
    const f = FORMS[fm.dataset.form]; if (!f) return;
    const r = f(); track(r[0], r[1]);
  }, true);

  /* ---------- veřejné API ---------- */
  window.MN_TRACK = {
    track, sync,
    on: fn => { st.listeners.push(fn); },
    state: () => ({ consent: st.consent, role: st.role, mode: mode(), loaded: Object.assign({}, st.loaded), ids: { gtm: !!ID.gtm, ga4: !!ID.ga4, pixel: pixelAllowed(), cf: !!ID.cf }, env: CFG.APP_ENV }),
    log: () => st.log.slice(),
    consent: {
      reopen: () => { store.del(CONSENT_KEY); if (st.role && st.role !== 'senior') { setConsent(null); showBanner(); } },
      revoke: () => { store.set(CONSENT_KEY, 'denied'); if (st.role && st.role !== 'senior') setConsent(false); }
    }
  };

  if (debugOn()) addScript('analytics-debug.js');
})();
