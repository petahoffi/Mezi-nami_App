/* Ladicí panel měření – načte se jen s ?analytics_debug=1 (nebo v téže relaci po prvním zapnutí).
 * Slouží k ověření, že měření funguje, a k ukázce, co všechno sledujeme.
 * Zobrazuje živě odesílané události, stav souhlasu a nasazených nástrojů a souhrn počtů.
 */
(function () {
  'use strict';
  const T = window.MN_TRACK; if (!T) return;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const css = document.createElement('style');
  css.textContent = `
  .mnd{position:fixed;right:10px;bottom:calc(10px + env(safe-area-inset-bottom,0px));z-index:1300;font:12px/1.4 ui-monospace,Menlo,Consolas,monospace;color:#e8e8e8}
  .mnd-fab{background:#16202a;color:#fff;border:1px solid #3b4a58;border-radius:999px;padding:8px 12px;cursor:pointer;font:inherit}
  .mnd-box{display:none;width:min(440px,calc(100vw - 20px));max-height:70vh;overflow:auto;background:#16202a;border:1px solid #3b4a58;border-radius:12px;padding:10px;box-shadow:0 8px 30px rgba(0,0,0,.4)}
  .mnd.open .mnd-box{display:block}.mnd.open .mnd-fab{display:none}
  .mnd h4{margin:8px 0 4px;font-size:12px;color:#9fd3ff}
  .mnd table{width:100%;border-collapse:collapse}.mnd td,.mnd th{padding:2px 4px;text-align:left;vertical-align:top;border-bottom:1px solid #26333f}
  .mnd .ok{color:#7fe0a1}.mnd .no{color:#ff9d8a}.mnd .dim{color:#8ea0b0}
  .mnd button.b{background:#26333f;color:#fff;border:1px solid #3b4a58;border-radius:8px;padding:4px 8px;margin-right:6px;cursor:pointer;font:inherit}`;
  document.head.appendChild(css);

  const root = document.createElement('div'); root.className = 'mnd';
  root.innerHTML = '<button class="mnd-fab" type="button" aria-label="Otevřít ladicí panel měření">📊 Měření</button><div class="mnd-box" role="region" aria-label="Ladicí panel měření"></div>';
  document.body.appendChild(root);
  const box = $('.mnd-box', root);
  const counts = {};
  const dl = () => (window.dataLayer || []).length;

  function stateRows() {
    const s = T.state(), yn = v => v ? '<span class="ok">ano</span>' : '<span class="no">ne</span>';
    return `<table>
      <tr><td>Souhlas</td><td>${s.consent === true ? '<span class="ok">udělen</span>' : s.consent === false ? '<span class="no">zamítnut</span>' : '<span class="dim">čeká</span>'}</td></tr>
      <tr><td>Role</td><td>${esc(s.role || 'nepřihlášen')}</td></tr>
      <tr><td>Režim</td><td>${s.mode === 'demo' ? 'demo (ID nejsou vyplněná, nic neodchází ven)' : esc(s.mode.toUpperCase())}</td></tr>
      <tr><td>GTM / GA4</td><td>${yn(s.loaded.gtm)} / ${yn(s.loaded.ga4)}</td></tr>
      <tr><td>Meta Pixel</td><td>${yn(s.loaded.px)} <span class="dim">${s.ids.pixel ? '' : '(vypnutý)'}</span></td></tr>
      <tr><td>Cloudflare WA</td><td>${yn(s.loaded.cf)}</td></tr>
      <tr><td>dataLayer</td><td>${dl()} záznamů</td></tr>
      <tr><td>Prostředí</td><td>${esc(s.env)}</td></tr></table>`;
  }
  function summary() {
    const rows = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).map(k => `<tr><td>${esc(k)}</td><td>${counts[k]}</td></tr>`).join('');
    return rows ? `<table>${rows}</table>` : '<div class="dim">Zatím žádné odeslané události. Proklikejte aplikaci.</div>';
  }
  function logRows() {
    const f = new Intl.DateTimeFormat('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return '<table>' + T.log().slice(0, 40).map(e => {
      const sent = e.status.indexOf('zahozeno') !== 0;
      const p = Object.keys(e.params).filter(k => k !== 'app_env').map(k => k + '=' + e.params[k]).join(', ');
      return `<tr><td class="dim">${f.format(new Date(e.t))}</td><td><b>${esc(e.name)}</b><div class="dim">${esc(p)}</div></td><td class="${sent ? 'ok' : 'no'}">${esc(e.status)}</td></tr>`;
    }).join('') + '</table>';
  }
  function draw() {
    box.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><b>Ladicí panel měření</b><button class="b" type="button" data-d="close">Zavřít</button></div>
      <h4>Stav</h4>${stateRows()}
      <h4>Souhrn událostí v této relaci</h4>${summary()}
      <h4>Poslední události</h4>${logRows()}
      <div style="margin-top:8px"><button class="b" type="button" data-d="copy">Kopírovat JSON</button><button class="b" type="button" data-d="dl">Zobrazit dataLayer v konzoli</button></div>`;
  }
  T.on(e => { if (e.status.indexOf('zahozeno') !== 0) counts[e.name] = (counts[e.name] || 0) + 1; if (root.classList.contains('open')) draw(); });
  root.addEventListener('click', e => {
    if (e.target.closest('.mnd-fab')) { root.classList.add('open'); draw(); return; }
    const b = e.target.closest('[data-d]'); if (!b) return;
    if (b.dataset.d === 'close') root.classList.remove('open');
    if (b.dataset.d === 'dl') { console.log('dataLayer', window.dataLayer); }
    if (b.dataset.d === 'copy') {
      const txt = JSON.stringify({ state: T.state(), counts, log: T.log() }, null, 2);
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).catch(() => console.log(txt));
    }
  });
  setInterval(() => { if (root.classList.contains('open')) draw(); }, 1500);
})();
